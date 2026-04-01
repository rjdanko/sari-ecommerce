<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CartController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        return response()->json(['items' => []]);
    }

    public function store(Request $request): JsonResponse
    {
        return response()->json(['message' => 'Item added to cart'], 201);
    }

    public function update(Request $request, int $productId): JsonResponse
    {
        return response()->json(['message' => 'Cart updated']);
    }

    public function destroy(int $productId): JsonResponse
    {
        return response()->json(null, 204);
    }

    public function clear(): JsonResponse
    {
        return response()->json(null, 204);
    }
}
