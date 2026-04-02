<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class InventoryController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Product::with('category', 'business');

        if ($request->boolean('low_stock')) {
            $query->whereColumn('stock_quantity', '<=', 'low_stock_threshold');
        }

        return response()->json(
            $query->orderBy('stock_quantity', 'asc')->paginate(20)
        );
    }

    public function update(Request $request, Product $product): JsonResponse
    {
        $request->validate([
            'stock_quantity' => ['required', 'integer', 'min:0', 'max:999999'],
            'low_stock_threshold' => ['sometimes', 'integer', 'min:0', 'max:999999'],
        ]);

        $product->update($request->validated());

        return response()->json($product->fresh());
    }
}
