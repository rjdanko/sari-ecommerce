<?php

namespace App\Services;

use App\Models\Product;
use App\Models\ProductVariant;
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

        // Decode all cart data first
        $decoded = [];
        $productIds = [];
        $variantIds = [];
        foreach ($cartData as $productId => $data) {
            $decoded[$productId] = json_decode($data, true);
            $productIds[] = (int) $productId;
            if (!empty($decoded[$productId]['variant_id'])) {
                $variantIds[] = (int) $decoded[$productId]['variant_id'];
            }
        }

        // Batch-load all products and variants in 2 queries instead of N+N
        $products = Product::with('primaryImage')
            ->whereIn('id', $productIds)
            ->get()
            ->keyBy('id');

        $variants = !empty($variantIds)
            ? ProductVariant::whereIn('id', $variantIds)->get()->keyBy('id')
            : collect();

        $items = [];
        foreach ($decoded as $productId => $data) {
            $product = $products->get((int) $productId);
            if (!$product) {
                continue;
            }

            $variantId = $data['variant_id'] ?? null;
            $variantData = null;

            if ($variantId && $variants->has($variantId)) {
                $variant = $variants->get($variantId);
                $variantData = [
                    'id' => $variant->id,
                    'options' => $variant->options ?? [],
                    'price_modifier' => $variant->price ? (float) $variant->price - (float) $product->base_price : null,
                ];
            }

            $items[] = [
                'product_id' => (int) $productId,
                'quantity' => $data['quantity'],
                'variant_id' => $variantId,
                'variant' => $variantData,
                'product' => [
                    'id' => $product->id,
                    'name' => $product->name,
                    'slug' => $product->slug,
                    'base_price' => $product->base_price,
                    'image_url' => $product->primaryImage?->url
                        ? (str_starts_with($product->primaryImage->url, 'http')
                            ? $product->primaryImage->url
                            : asset('storage/' . $product->primaryImage->url))
                        : null,
                    'stock_quantity' => $product->stock_quantity,
                ],
            ];
        }

        return $items;
    }

    public function addItem(int $userId, int $productId, int $quantity = 1, ?int $variantId = null): array
    {
        // Validate stock before adding
        $product = Product::findOrFail($productId);
        if ($product->stock_quantity < $quantity) {
            throw new \InvalidArgumentException('Insufficient stock.');
        }

        $key = $this->cartKey($userId);
        $existing = Redis::hget($key, $productId);

        if ($existing) {
            $decoded = json_decode($existing, true);
            $newQty = $decoded['quantity'] + $quantity;

            // Validate total quantity doesn't exceed stock
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
            // Validate stock
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

    public function updateVariant(int $userId, int $productId, int $variantId): array
    {
        $key = $this->cartKey($userId);
        $existing = Redis::hget($key, $productId);

        if (!$existing) {
            throw new \InvalidArgumentException('Product not found in cart.');
        }

        $variant = ProductVariant::where('id', $variantId)
            ->where('product_id', $productId)
            ->where('is_active', true)
            ->first();

        if (!$variant) {
            throw new \InvalidArgumentException('Invalid variant for this product.');
        }

        $decoded = json_decode($existing, true);
        $decoded['variant_id'] = $variantId;
        Redis::hset($key, $productId, json_encode($decoded));
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
