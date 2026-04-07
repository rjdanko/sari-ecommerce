<?php

namespace App\Http\Controllers;

use App\Http\Requests\CheckoutRequest;
use App\Models\Order;
use App\Models\Product;
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

        // Support direct buy (bypass cart)
        if ($request->has('direct_buy')) {
            $directBuy = $validated['direct_buy'];
            $product = Product::findOrFail($directBuy['product_id']);

            $cartItems = [[
                'product_id' => $product->id,
                'quantity' => $directBuy['quantity'],
                'variant_id' => null,
                'product' => $product->toArray(),
            ]];
        } else {
            // Cart is always scoped to authenticated user
            $cartItems = $this->cartService->getCart($user->id);

            if (empty($cartItems)) {
                return response()->json(['error' => 'Cart is empty'], 422);
            }
        }

        return DB::transaction(function () use ($user, $cartItems, $validated, $request) {
            // Prices come from the database, NOT from user input
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
                'status' => 'pending_confirmation',
                'subtotal' => $subtotal,
                'shipping_fee' => 0,
                'tax' => 0,
                'total' => $subtotal,
                'payment_method' => $validated['payment_method'] ?? 'cod',
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

            $paymentMethod = $validated['payment_method'] ?? 'cod';

            // COD: decrement stock immediately, clear cart, return order
            if ($paymentMethod === 'cod') {
                foreach ($cartItems as $item) {
                    Product::where('id', $item['product_id'])
                        ->decrement('stock_quantity', $item['quantity']);
                }

                // Only clear cart if not a direct buy
                if (!$request->has('direct_buy')) {
                    $this->cartService->clearCart($user->id);
                }

                return response()->json([
                    'order' => $order->load('items'),
                    'redirect_url' => config('app.frontend_url') . '/checkout/success',
                ]);
            }

            // Online payment (QR PH, card, gcash) — create PayMongo session
            $paymentMethods = match ($paymentMethod) {
                'qrph' => ['qrph'],
                default => ['card', 'gcash'],
            };

            $session = $this->paymentService->createCheckoutSession(
                $lineItems,
                ['order_id' => $order->id, 'order_number' => $order->order_number],
                $paymentMethods
            );

            $order->update([
                'paymongo_checkout_id' => $session['id'],
            ]);

            // Clear cart for online payments too (stock decremented in webhook)
            if (!$request->has('direct_buy')) {
                $this->cartService->clearCart($user->id);
            }

            return response()->json([
                'checkout_url' => $session['attributes']['checkout_url'],
                'order' => $order->load('items'),
            ]);
        });
    }
}
