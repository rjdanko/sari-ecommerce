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
        // Always scoped to authenticated user
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
        // Input validated by StoreCartItemRequest
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
