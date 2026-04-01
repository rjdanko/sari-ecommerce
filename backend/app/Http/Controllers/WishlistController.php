<?php

namespace App\Http\Controllers;

use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WishlistController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        return response()->json($request->user()->wishlist);
    }

    public function toggle(Request $request, Product $product): JsonResponse
    {
        $existing = $request->user()->wishlist()->where('product_id', $product->id)->first();

        if ($existing) {
            $existing->delete();
            return response()->json(['message' => 'Removed from wishlist']);
        }

        $request->user()->wishlist()->create(['product_id' => $product->id]);

        return response()->json(['message' => 'Added to wishlist'], 201);
    }
}
