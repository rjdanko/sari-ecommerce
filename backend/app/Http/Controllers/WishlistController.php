<?php

namespace App\Http\Controllers;

use App\Http\Resources\ProductResource;
use App\Models\Product;
use App\Models\Wishlist;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WishlistController extends Controller
{
    /**
     * List user's wishlist.
     * Scoped to authenticated user
     */
    public function index(Request $request): JsonResponse
    {
        // Clean up wishlist entries whose product was deleted (no FK cascade on soft-deleted products)
        Wishlist::where('user_id', $request->user()->id)
            ->whereDoesntHave('product')
            ->delete();

        $wishlist = Wishlist::where('user_id', $request->user()->id)
            ->with('product.primaryImage', 'product.category')
            ->orderByDesc('created_at')
            ->paginate(20);

        $data = $wishlist->getCollection()->map(fn ($item) => [
            'id' => $item->id,
            'product' => new ProductResource($item->product),
            'created_at' => $item->created_at,
        ]);

        return response()->json([
            'data' => $data,
            'meta' => [
                'current_page' => $wishlist->currentPage(),
                'last_page' => $wishlist->lastPage(),
                'per_page' => $wishlist->perPage(),
                'total' => $wishlist->total(),
            ],
        ]);
    }

    /**
     * Toggle wishlist item (add/remove).
     * Scoped to authenticated user — cannot modify other users' wishlists
     */
    public function toggle(Request $request, Product $product): JsonResponse
    {
        $existing = Wishlist::where('user_id', $request->user()->id)
            ->where('product_id', $product->id)
            ->first();

        if ($existing) {
            $existing->delete();
            return response()->json(['message' => 'Removed from wishlist', 'wishlisted' => false]);
        }

        Wishlist::create([
            'user_id' => $request->user()->id,
            'product_id' => $product->id,
        ]);

        return response()->json(['message' => 'Added to wishlist', 'wishlisted' => true], 201);
    }
}
