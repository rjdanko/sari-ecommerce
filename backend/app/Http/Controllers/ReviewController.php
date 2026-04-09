<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\Product;
use App\Models\Review;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReviewController extends Controller
{
    public function index(Product $product, Request $request): JsonResponse
    {
        $reviews = $product->reviews()
            ->with('user:id,first_name,last_name')
            ->orderByDesc('created_at')
            ->paginate(10);

        $reviews->getCollection()->transform(function ($review) {
            $firstName = $review->user->first_name ?? '';
            $lastInitial = $review->user->last_name ? mb_substr($review->user->last_name, 0, 1) . '.' : '';
            return [
                'id' => $review->id,
                'user_name' => trim("$firstName $lastInitial"),
                'rating' => $review->rating,
                'comment' => $review->comment,
                'created_at' => $review->created_at,
            ];
        });

        $data = [
            'reviews' => $reviews,
            'can_review' => false,
            'user_review' => null,
        ];

        if ($request->user()) {
            $userReview = Review::where('user_id', $request->user()->id)
                ->where('product_id', $product->id)
                ->first();

            $data['user_review'] = $userReview ? [
                'id' => $userReview->id,
                'rating' => $userReview->rating,
                'comment' => $userReview->comment,
                'created_at' => $userReview->created_at,
            ] : null;

            // Can review if: no existing review AND has a delivered order with this product
            $data['can_review'] = !$userReview && Order::where('user_id', $request->user()->id)
                ->where('status', 'delivered')
                ->whereHas('items', fn ($q) => $q->where('product_id', $product->id))
                ->exists();
        }

        return response()->json($data);
    }

    public function store(Product $product, Request $request): JsonResponse
    {
        $request->validate([
            'rating' => ['required', 'integer', 'min:1', 'max:5'],
            'comment' => ['nullable', 'string', 'max:1000'],
        ]);

        $user = $request->user();

        // Check if already reviewed
        if (Review::where('user_id', $user->id)->where('product_id', $product->id)->exists()) {
            return response()->json(['message' => 'You have already reviewed this product.'], 409);
        }

        // Check if user has a delivered order with this product
        $hasPurchased = Order::where('user_id', $user->id)
            ->where('status', 'delivered')
            ->whereHas('items', fn ($q) => $q->where('product_id', $product->id))
            ->exists();

        if (!$hasPurchased) {
            return response()->json(['message' => 'You must purchase and receive this product before reviewing.'], 403);
        }

        $review = Review::create([
            'user_id' => $user->id,
            'product_id' => $product->id,
            'rating' => $request->rating,
            'comment' => $request->comment,
        ]);

        $this->updateProductRating($product);

        return response()->json([
            'id' => $review->id,
            'rating' => $review->rating,
            'comment' => $review->comment,
            'created_at' => $review->created_at,
        ], 201);
    }

    public function destroy(Product $product, Request $request): JsonResponse
    {
        $review = Review::where('user_id', $request->user()->id)
            ->where('product_id', $product->id)
            ->first();

        if (!$review) {
            return response()->json(['message' => 'Review not found.'], 404);
        }

        $review->delete();
        $this->updateProductRating($product);

        return response()->json(['message' => 'Review deleted.']);
    }

    private function updateProductRating(Product $product): void
    {
        $product->update([
            'average_rating' => $product->reviews()->avg('rating') ?? 0,
            'review_count' => $product->reviews()->count(),
        ]);
    }
}
