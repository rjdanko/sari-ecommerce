<?php

namespace App\Http\Controllers;

use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RecommendationController extends Controller
{
    public function popular(): JsonResponse
    {
        return response()->json(Product::where('status', 'active')->orderByDesc('view_count')->limit(10)->get());
    }

    public function forUser(Request $request): JsonResponse
    {
        return response()->json([]);
    }

    public function similarTo(Product $product): JsonResponse
    {
        return response()->json([]);
    }
}
