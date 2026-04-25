<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Review;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReviewController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Review::with(['user', 'product'])->orderByDesc('created_at');

        if ($request->filled('rating')) {
            $query->where('rating', (int) $request->input('rating'));
        }

        if ($request->filled('product_id')) {
            $query->where('product_id', $request->input('product_id'));
        }

        if ($request->filled('store_id')) {
            $query->whereHas('product', fn ($q) => $q->where('store_id', $request->input('store_id')));
        }

        return response()->json($query->paginate(20));
    }

    public function destroy(Review $review): JsonResponse
    {
        $review->delete();

        // Recompute aggregates for the product
        $product = $review->product;
        $avg = $product->reviews()->avg('rating') ?? 0;
        $count = $product->reviews()->count();
        $product->update(['average_rating' => round($avg, 2), 'review_count' => $count]);

        return response()->json(['message' => 'Review deleted']);
    }
}
