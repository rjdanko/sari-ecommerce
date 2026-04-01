<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreProductRequest;
use App\Http\Requests\UpdateProductRequest;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class ProductController extends Controller
{
    public function index(): JsonResponse
    {
        $products = Product::where('status', 'active')->latest()->paginate(15);

        return response()->json($products);
    }

    public function show(string $slug): JsonResponse
    {
        $product = Product::where('slug', $slug)->firstOrFail();

        return response()->json($product->load(['category', 'images', 'variants']));
    }

    public function myProducts(Request $request): JsonResponse
    {
        $products = $request->user()->products()->latest()->paginate(15);

        return response()->json($products);
    }

    public function store(StoreProductRequest $request): JsonResponse
    {
        $product = Product::create([
            ...$request->validated(),
            'business_id' => $request->user()->id,
            'slug' => Str::slug($request->name) . '-' . uniqid(),
        ]);

        return response()->json($product, 201);
    }

    public function update(UpdateProductRequest $request, Product $product): JsonResponse
    {
        $product->update($request->validated());

        return response()->json($product);
    }

    public function destroy(Request $request, Product $product): JsonResponse
    {
        if ($request->user()->cannot('delete', $product)) {
            abort(403);
        }

        $product->delete();

        return response()->json(null, 204);
    }
}
