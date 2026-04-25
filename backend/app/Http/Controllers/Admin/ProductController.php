<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\ProductResource;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProductController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Product::with(['category', 'primaryImage', 'business', 'store'])
            ->when($request->search, fn ($q, $search) =>
                $q->where('name', 'ilike', "%{$search}%")
                  ->orWhere('sku', 'ilike', "%{$search}%")
            )
            ->when($request->status, fn ($q, $status) =>
                $q->where('status', $status)
            )
            ->when($request->category_id, fn ($q, $catId) =>
                $q->where('category_id', $catId)
            )
            ->when($request->gender, fn ($q, $gender) =>
                $q->where('gender', $gender)
            )
            ->when($request->boolean('low_stock'), fn ($q) =>
                $q->whereColumn('stock_quantity', '<=', 'low_stock_threshold')
            )
            ->latest();

        return response()->json(
            ProductResource::collection($query->paginate($request->per_page ?? 20))
        );
    }

    public function show(Product $product): JsonResponse
    {
        return response()->json(new ProductResource($product->load(['category', 'primaryImage', 'store', 'business'])));
    }

    public function update(Request $request, Product $product): JsonResponse
    {
        $validated = $request->validate([
            'status' => 'sometimes|in:draft,active,archived',
            'is_featured' => 'sometimes|boolean',
        ]);

        $product->update($validated);

        return response()->json([
            'message' => 'Product updated.',
            'product' => new ProductResource($product->load(['category', 'primaryImage'])),
        ]);
    }

    public function destroy(Product $product): JsonResponse
    {
        $product->delete();

        return response()->json(['message' => 'Product deleted.']);
    }
}
