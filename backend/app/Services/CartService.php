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
                        'image_url' => $product->primaryImage?->url
                            ? (str_starts_with($product->primaryImage->url, 'http')
                                ? $product->primaryImage->url
                                : asset('storage/' . $product->primaryImage->url))
                            : null,
                        'stock_quantity' => $product->stock_quantity,
                    ],
                ];
            }
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
