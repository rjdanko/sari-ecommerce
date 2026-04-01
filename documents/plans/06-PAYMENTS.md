# Module 6: Payment Integration (PayMongo)

> **For agentic workers:** REQUIRED: Implement this plan task-by-task.
> Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate PayMongo Checkout API for GCash and card payments.
Create checkout flow, webhook handler, and payment processing job.

**Architecture:** Server-side checkout session creation → redirect to PayMongo →
webhook callback → queue job processes payment → inventory deducted.

**Tech Stack:** PayMongo API, Laravel HTTP client, RabbitMQ jobs

---

## 🔒 Security Context

- **API Key Security:** PayMongo secret key (`sk_*`) stays backend-only. Public key (`pk_*`) is safe for frontend.
- **Webhook Verification:** Every webhook is verified against PayMongo's HMAC signature before processing.
- **Idempotency:** Payment webhooks are idempotent — duplicate webhooks don't double-charge or double-deduct inventory.
- **IDOR on Checkout:** Cart contents are read from the authenticated user's Redis cart — users cannot manipulate prices.
- **Input Validation:** Checkout request uses the `CheckoutRequest` Form Request from Module 4.

---

## Files

- Modify: `backend/config/services.php`
- Create: `backend/app/Services/PaymentService.php`
- Create: `backend/app/Http/Controllers/CheckoutController.php`
- Create: `backend/app/Jobs/ProcessPaymentWebhook.php`
- Create: `backend/app/Http/Controllers/WebhookController.php`

---

### Task 6.1: PayMongo Payment Service

- [x] **Step 1: Add PayMongo config to services.php**

File: `backend/config/services.php` — add:

```php
'paymongo' => [
    'public_key' => env('PAYMONGO_PUBLIC_KEY'),
    'secret_key' => env('PAYMONGO_SECRET_KEY'),
    'webhook_secret' => env('PAYMONGO_WEBHOOK_SECRET'),
    'base_url' => 'https://api.paymongo.com/v1',
],
```

> **🔒 SECURITY:** `PAYMONGO_SECRET_KEY` and `PAYMONGO_WEBHOOK_SECRET` are
> backend-only. Never in `NEXT_PUBLIC_*` env vars.

- [x] **Step 2: Create PaymentService**

Create file: `backend/app/Services/PaymentService.php`

```php
<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class PaymentService
{
    private string $baseUrl;
    private string $secretKey;

    public function __construct()
    {
        $this->baseUrl = config('services.paymongo.base_url');
        $this->secretKey = config('services.paymongo.secret_key');
    }

    /**
     * Create a PayMongo Checkout Session.
     * Supports: card (Visa/Mastercard), gcash
     *
     * 🔒 SECURITY: Line items are built from server-side cart data (Redis),
     * NOT from user-submitted prices. This prevents price manipulation.
     */
    public function createCheckoutSession(array $lineItems, array $metadata = []): array
    {
        $response = Http::withBasicAuth($this->secretKey, '')
            ->post("{$this->baseUrl}/checkout_sessions", [
                'data' => [
                    'attributes' => [
                        'line_items' => $lineItems,
                        'payment_method_types' => ['card', 'gcash'],
                        'send_email_receipt' => true,
                        'show_description' => true,
                        'show_line_items' => true,
                        'description' => 'SARI E-Commerce Order',
                        'success_url' => config('app.frontend_url') . '/checkout/success?session_id={id}',
                        'cancel_url' => config('app.frontend_url') . '/checkout/cancel',
                        'metadata' => $metadata,
                    ],
                ],
            ]);

        if ($response->failed()) {
            Log::error('PayMongo checkout creation failed', [
                'status' => $response->status(),
                'body' => $response->json(),
            ]);
            throw new \RuntimeException('Failed to create checkout session');
        }

        return $response->json('data');
    }

    /**
     * Retrieve a checkout session by ID.
     */
    public function getCheckoutSession(string $sessionId): array
    {
        $response = Http::withBasicAuth($this->secretKey, '')
            ->get("{$this->baseUrl}/checkout_sessions/{$sessionId}");

        return $response->json('data');
    }

    /**
     * Verify the PayMongo webhook signature.
     *
     * 🔒 SECURITY: This MUST be called before processing any webhook event.
     * Without this, an attacker could send fake webhook requests to mark
     * orders as paid without actually paying.
     */
    public function verifyWebhookSignature(string $payload, string $signature): bool
    {
        $webhookSecret = config('services.paymongo.webhook_secret');

        if (empty($webhookSecret)) {
            Log::error('PayMongo webhook secret is not configured');
            return false;
        }

        $parts = explode(',', $signature);
        $timestamp = null;
        $testSignature = null;
        $liveSignature = null;

        foreach ($parts as $part) {
            [$key, $value] = explode('=', $part, 2);
            match (trim($key)) {
                't' => $timestamp = $value,
                'te' => $testSignature = $value,
                'li' => $liveSignature = $value,
                default => null,
            };
        }

        $activeSignature = $liveSignature ?? $testSignature;

        if (! $activeSignature || ! $timestamp) {
            return false;
        }

        $computedSignature = hash_hmac(
            'sha256',
            "{$timestamp}.{$payload}",
            $webhookSecret
        );

        return hash_equals($computedSignature, $activeSignature);
    }
}
```

- [x] **Step 3: Create CheckoutController**

Create file: `backend/app/Http/Controllers/CheckoutController.php`

> **🔒 SECURITY:**
> - Uses `CheckoutRequest` Form Request for input validation
> - Cart prices are read from the DATABASE (server-side), not from user input
> - Order is created in a DB transaction for atomicity
> - User can only checkout their OWN cart

```php
<?php

namespace App\Http\Controllers;

use App\Http\Requests\CheckoutRequest;
use App\Models\Order;
use App\Services\CartService;
use App\Services\PaymentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class CheckoutController extends Controller
{
    public function __construct(
        private CartService $cartService,
        private PaymentService $paymentService,
    ) {}

    public function createSession(CheckoutRequest $request): JsonResponse
    {
        $validated = $request->validated();
        $user = $request->user();

        // 🔒 Cart is always scoped to authenticated user
        $cartItems = $this->cartService->getCart($user->id);

        if (empty($cartItems)) {
            return response()->json(['error' => 'Cart is empty'], 422);
        }

        return DB::transaction(function () use ($user, $cartItems, $validated) {
            // 🔒 Prices come from the database, NOT from user input
            $lineItems = [];
            $subtotal = 0;

            foreach ($cartItems as $item) {
                $amount = (int) ($item['product']['base_price'] * 100); // centavos
                $lineItems[] = [
                    'name' => $item['product']['name'],
                    'quantity' => $item['quantity'],
                    'amount' => $amount,
                    'currency' => 'PHP',
                    'description' => "SKU: {$item['product_id']}",
                ];
                $subtotal += $item['product']['base_price'] * $item['quantity'];
            }

            $order = Order::create([
                'order_number' => Order::generateOrderNumber(),
                'user_id' => $user->id,
                'status' => 'pending',
                'subtotal' => $subtotal,
                'shipping_fee' => 0,
                'tax' => 0,
                'total' => $subtotal,
                'shipping_address' => $validated['shipping_address'],
                'billing_address' => $validated['billing_address'] ?? $validated['shipping_address'],
            ]);

            foreach ($cartItems as $item) {
                $order->items()->create([
                    'product_id' => $item['product_id'],
                    'product_variant_id' => $item['variant_id'] ?? null,
                    'product_name' => $item['product']['name'],
                    'quantity' => $item['quantity'],
                    'unit_price' => $item['product']['base_price'],
                    'total_price' => $item['product']['base_price'] * $item['quantity'],
                ]);
            }

            $session = $this->paymentService->createCheckoutSession(
                $lineItems,
                ['order_id' => $order->id, 'order_number' => $order->order_number]
            );

            $order->update([
                'paymongo_checkout_id' => $session['id'],
            ]);

            return response()->json([
                'checkout_url' => $session['attributes']['checkout_url'],
                'order' => $order->load('items'),
            ]);
        });
    }
}
```

- [x] **Step 4: Create ProcessPaymentWebhook job**

Create file: `backend/app/Jobs/ProcessPaymentWebhook.php`

```php
<?php

namespace App\Jobs;

use App\Models\Order;
use App\Models\Product;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class ProcessPaymentWebhook implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(private array $eventData) {}

    public function handle(): void
    {
        $attributes = $this->eventData['attributes'] ?? [];
        $paymentData = $attributes['data'] ?? [];
        $metadata = $paymentData['attributes']['metadata'] ?? [];

        $orderId = $metadata['order_id'] ?? null;

        if (! $orderId) {
            Log::warning('PayMongo webhook: no order_id in metadata', $this->eventData);
            return;
        }

        $order = Order::with('items')->find($orderId);

        if (! $order) {
            Log::warning("PayMongo webhook: order {$orderId} not found");
            return;
        }

        // 🔒 Idempotency check — prevents double-processing
        if ($order->payment_status === 'paid') {
            Log::info("PayMongo webhook: order {$orderId} already paid, skipping");
            return;
        }

        DB::transaction(function () use ($order, $paymentData) {
            $order->update([
                'status' => 'paid',
                'payment_status' => 'paid',
                'payment_method' => $paymentData['attributes']['payment_method_used'] ?? 'unknown',
                'paymongo_payment_id' => $paymentData['id'] ?? null,
                'paid_at' => now(),
            ]);

            // Deduct inventory atomically
            foreach ($order->items as $item) {
                Product::where('id', $item->product_id)
                    ->decrement('stock_quantity', $item->quantity);
            }
        });

        Log::info("PayMongo webhook: order {$orderId} marked as paid");
    }
}
```

- [x] **Step 5: Create WebhookController**

Create file: `backend/app/Http/Controllers/WebhookController.php`

> **🔒 SECURITY:** The webhook MUST verify PayMongo's signature before processing.
> Without this, anyone could send fake webhook requests to mark orders as paid.

```php
<?php

namespace App\Http\Controllers;

use App\Jobs\ProcessPaymentWebhook;
use App\Services\PaymentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class WebhookController extends Controller
{
    public function handlePaymongo(Request $request, PaymentService $paymentService): JsonResponse
    {
        $payload = $request->getContent();
        $signature = $request->header('Paymongo-Signature', '');

        // 🔒 CRITICAL: Verify webhook signature before processing
        if (! $paymentService->verifyWebhookSignature($payload, $signature)) {
            Log::warning('PayMongo webhook: invalid signature');
            return response()->json(['error' => 'Invalid signature'], 403);
        }

        $event = $request->input('data');
        $eventType = $event['attributes']['type'] ?? '';

        if ($eventType === 'checkout_session.payment.paid') {
            ProcessPaymentWebhook::dispatch($event);
        }

        return response()->json(['message' => 'Webhook received'], 200);
    }
}
```

- [x] **Step 6: Commit**

```bash
git add .
git commit -m "feat: add PayMongo checkout + webhook + payment processing"
```
