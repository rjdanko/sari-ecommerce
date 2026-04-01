<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Services\RecommendationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RecommendationController extends Controller
{
    public function __construct(private RecommendationService $recombee) {}

    /**
     * Public — returns popular/featured products (no auth required).
     */
    public function popular(): JsonResponse
    {
        $products = Product::where('status', 'active')
            ->where('is_featured', true)
            ->orderByDesc('view_count')
            ->limit(12)
            ->with('primaryImage', 'category')
            ->get();

        return response()->json(['data' => $products]);
    }

    /**
     * Authenticated — returns personalized recommendations.
     * Falls back to popular items if Recombee returns nothing.
     */
    public function forUser(Request $request): JsonResponse
    {
        $recommendations = $this->recombee->recommendForUser(
            $request->user()->id,
            12
        );

        if (empty($recommendations)) {
            return $this->popular();
        }

        $productIds = collect($recommendations)->pluck('id')->toArray();
        $products = Product::whereIn('id', $productIds)
            ->with('primaryImage', 'category')
            ->get();

        return response()->json(['data' => $products]);
    }

    /**
     * Public — returns products similar to the given product.
     * Falls back to same-category products if Recombee returns nothing.
     */
    public function similarTo(Product $product): JsonResponse
    {
        $recommendations = $this->recombee->recommendSimilar(
            $product->id,
            8
        );

        if (empty($recommendations)) {
            $products = Product::where('category_id', $product->category_id)
                ->where('id', '!=', $product->id)
                ->where('status', 'active')
                ->limit(8)
                ->with('primaryImage')
                ->get();

            return response()->json(['data' => $products]);
        }

        $productIds = collect($recommendations)->pluck('id')->toArray();
        $products = Product::whereIn('id', $productIds)
            ->with('primaryImage')
            ->get();

        return response()->json(['data' => $products]);
    }
}
