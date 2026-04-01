# Module 5: Core Services (Cart & Image Storage)

> **For agentic workers:** REQUIRED: Implement this plan task-by-task.
> Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create the Redis-backed cart service and Supabase image storage service.

**Architecture:** CartService uses Redis hashes namespaced per user. ImageService
wraps Supabase S3-compatible storage for product image uploads.

**Tech Stack:** Redis, Supabase Storage (S3), Laravel

---

## 🔒 Security Context

- **IDOR on Cart:** Cart keys are namespaced by `cart:{userId}`. The controller
  always uses `$request->user()->id` — a user can NEVER access another user's cart.
- **Input Validation:** Cart mutations use Form Request classes (from Module 4).
- **Image Uploads:** Validated by MIME type and max file size to prevent malicious uploads.

---

## Files

- Modify: `backend/config/database.php` (Redis config)
- Create: `backend/app/Services/CartService.php`
- Create: `backend/app/Http/Controllers/CartController.php`
- Modify: `backend/config/filesystems.php` (Supabase S3 disk)
- Create: `backend/app/Services/ImageService.php`

---

### Task 5.1: Redis Cart Service

- [x] **Step 1: Configure Redis databases**

File: `backend/config/database.php` — update the redis section:

```php
'redis' => [
    'client' => env('REDIS_CLIENT', 'predis'),

    'default' => [
        'host' => env('REDIS_HOST', '127.0.0.1'),
        'password' => env('REDIS_PASSWORD', null),
        'port' => env('REDIS_PORT', 6379),
        'database' => env('REDIS_DB', 0),
    ],

    'cache' => [
        'host' => env('REDIS_HOST', '127.0.0.1'),
        'password' => env('REDIS_PASSWORD', null),
        'port' => env('REDIS_PORT', 6379),
        'database' => env('REDIS_CACHE_DB', 1),
    ],

    'session' => [
        'host' => env('REDIS_HOST', '127.0.0.1'),
        'password' => env('REDIS_PASSWORD', null),
        'port' => env('REDIS_PORT', 6379),
        'database' => env('REDIS_SESSION_DB', 2),
    ],
],
```

- [x] **Step 2: Create CartService**

Create file: `backend/app/Services/CartService.php`

> **🔒 IDOR Prevention:** The cart key is always derived from the authenticated
> user's ID — `cart:{userId}`. There is no way for a user to pass a different
> user ID to access someone else's cart.

```php
<?php

namespace App\Services;

use App\Models\Product;
use Illuminate\Support\Facades\Redis;

class CartService
{
    private const CART_PREFIX = 'cart:';
    private const CART_TTL = 60 * 60 * 24 * 7; // 7 days

    private function cartKey(int $userId): string
    {
        return self::CART_PREFIX . $userId;
    }

    public function getCart(int $userId): array
    {
        $cartData = Redis::hgetall($this->cartKey($userId));
        if (empty($cartData)) {
            return [];
        }

        $items = [];
        foreach ($cartData as $productId => $data) {
            $decoded = json_decode($data, true);
            $product = Product::with('primaryImage')->find($productId);
            if ($product) {
                $items[] = [
                    'product_id' => (int) $productId,
                    'quantity' => $decoded['quantity'],
                    'variant_id' => $decoded['variant_id'] ?? null,
                    'product' => [
                        'id' => $product->id,
                        'name' => $product->name,
                        'slug' => $product->slug,
                        'base_price' => $product->base_price,
                        'image_url' => $product->primaryImage?->url,
                        'stock_quantity' => $product->stock_quantity,
                    ],
                ];
            }
        }

        return $items;
    }

    public function addItem(int $userId, int $productId, int $quantity = 1, ?int $variantId = null): array
    {
        // 🔒 Validate stock before adding
        $product = Product::findOrFail($productId);
        if ($product->stock_quantity < $quantity) {
            throw new \InvalidArgumentException('Insufficient stock.');
        }

        $key = $this->cartKey($userId);
        $existing = Redis::hget($key, $productId);

        if ($existing) {
            $decoded = json_decode($existing, true);
            $newQty = $decoded['quantity'] + $quantity;

            // 🔒 Validate total quantity doesn't exceed stock
            if ($product->stock_quantity < $newQty) {
                throw new \InvalidArgumentException('Insufficient stock for requested quantity.');
            }

            $decoded['quantity'] = $newQty;
            Redis::hset($key, $productId, json_encode($decoded));
        } else {
            Redis::hset($key, $productId, json_encode([
                'quantity' => $quantity,
                'variant_id' => $variantId,
            ]));
        }

        Redis::expire($key, self::CART_TTL);

        return $this->getCart($userId);
    }

    public function updateQuantity(int $userId, int $productId, int $quantity): array
    {
        $key = $this->cartKey($userId);

        if ($quantity <= 0) {
            Redis::hdel($key, $productId);
        } else {
            // 🔒 Validate stock
            $product = Product::findOrFail($productId);
            if ($product->stock_quantity < $quantity) {
                throw new \InvalidArgumentException('Insufficient stock.');
            }

            $existing = Redis::hget($key, $productId);
            if ($existing) {
                $decoded = json_decode($existing, true);
                $decoded['quantity'] = $quantity;
                Redis::hset($key, $productId, json_encode($decoded));
            }
        }

        Redis::expire($key, self::CART_TTL);

        return $this->getCart($userId);
    }

    public function removeItem(int $userId, int $productId): array
    {
        Redis::hdel($this->cartKey($userId), $productId);
        return $this->getCart($userId);
    }

    public function clearCart(int $userId): void
    {
        Redis::del($this->cartKey($userId));
    }

    public function getCartTotal(int $userId): float
    {
        $cart = $this->getCart($userId);
        return collect($cart)->sum(function ($item) {
            return $item['product']['base_price'] * $item['quantity'];
        });
    }
}
```

- [x] **Step 3: Create CartController**

Create file: `backend/app/Http/Controllers/CartController.php`

> **🔒 SECURITY:** Uses Form Request classes from Module 4 for input validation.
> Always uses `$request->user()->id` — never accepts a user_id from the request.

```php
<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreCartItemRequest;
use App\Http\Requests\UpdateCartItemRequest;
use App\Services\CartService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CartController extends Controller
{
    public function __construct(private CartService $cartService) {}

    public function index(Request $request): JsonResponse
    {
        // 🔒 Always scoped to authenticated user
        $cart = $this->cartService->getCart($request->user()->id);
        $total = $this->cartService->getCartTotal($request->user()->id);

        return response()->json([
            'items' => $cart,
            'total' => $total,
            'item_count' => count($cart),
        ]);
    }

    public function store(StoreCartItemRequest $request): JsonResponse
    {
        // 🔒 Input validated by StoreCartItemRequest
        $validated = $request->validated();

        try {
            $cart = $this->cartService->addItem(
                $request->user()->id,
                $validated['product_id'],
                $validated['quantity'],
                $validated['variant_id'] ?? null,
            );

            return response()->json(['items' => $cart], 201);
        } catch (\InvalidArgumentException $e) {
            return response()->json(['error' => $e->getMessage()], 422);
        }
    }

    public function update(UpdateCartItemRequest $request, int $productId): JsonResponse
    {
        $validated = $request->validated();

        try {
            $cart = $this->cartService->updateQuantity(
                $request->user()->id,
                $productId,
                $validated['quantity'],
            );

            return response()->json(['items' => $cart]);
        } catch (\InvalidArgumentException $e) {
            return response()->json(['error' => $e->getMessage()], 422);
        }
    }

    public function destroy(Request $request, int $productId): JsonResponse
    {
        $cart = $this->cartService->removeItem($request->user()->id, $productId);
        return response()->json(['items' => $cart]);
    }

    public function clear(Request $request): JsonResponse
    {
        $this->cartService->clearCart($request->user()->id);
        return response()->json(['message' => 'Cart cleared']);
    }
}
```

- [x] **Step 4: Commit**

```bash
git add .
git commit -m "feat: add Redis-backed CartService and CartController with validation"
```

---

### Task 5.2: Supabase Image Storage Service

- [x] **Step 1: Configure Supabase S3 disk**

File: `backend/config/filesystems.php` — add to 'disks' array:

```php
'supabase' => [
    'driver' => 's3',
    'key' => env('SUPABASE_ACCESS_KEY'),
    'secret' => env('SUPABASE_SECRET_KEY'),
    'region' => env('SUPABASE_REGION', 'ap-southeast-1'),
    'bucket' => env('SUPABASE_BUCKET_NAME', 'product-images'),
    'endpoint' => env('SUPABASE_ENDPOINT'),
    'use_path_style_endpoint' => true,
],
```

> **🔒 SECURITY:** `SUPABASE_ACCESS_KEY` and `SUPABASE_SECRET_KEY` are
> backend-only. They are NEVER exposed to the frontend.

- [x] **Step 2: Create ImageService**

Create file: `backend/app/Services/ImageService.php`

```php
<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class ImageService
{
    private string $disk = 'supabase';

    /**
     * Upload an image file to Supabase Storage.
     *
     * 🔒 SECURITY: File validation (MIME type, max size) is handled by
     * the Form Request class BEFORE this method is called. This method
     * generates a UUID filename to prevent path traversal attacks.
     */
    public function upload(UploadedFile $file, string $directory = 'products'): string
    {
        // 🔒 UUID filename prevents path traversal and filename collisions
        $filename = $directory . '/' . Str::uuid() . '.' . $file->getClientOriginalExtension();
        Storage::disk($this->disk)->put($filename, file_get_contents($file));

        return Storage::disk($this->disk)->url($filename);
    }

    public function delete(string $path): bool
    {
        return Storage::disk($this->disk)->delete($path);
    }

    public function getPublicUrl(string $path): string
    {
        return Storage::disk($this->disk)->url($path);
    }
}
```

- [x] **Step 3: Commit**

```bash
git add .
git commit -m "feat: add Supabase Storage ImageService"
```
