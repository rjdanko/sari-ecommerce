<?php

namespace App\Http\Controllers;

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
        $wishlist = Wishlist::where('user_id', $request->user()->id)
            ->with('product.primaryImage', 'product.category')
            ->orderByDesc('created_at')
            ->paginate(20);

        return response()->json($wishlist);
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
