<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreProductRequest;
use App\Http\Requests\UpdateProductRequest;
use App\Http\Resources\ProductResource;
use App\Jobs\SyncInteractionToRecombee;
use App\Models\Product;
use App\Services\ImageService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class ProductController extends Controller
{
    public function __construct(private ImageService $imageService) {}

    /**
     * Public listing — only active products.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Product::where('status', 'active')
            ->with('primaryImage', 'category');

        if ($request->has('category')) {
            $query->whereHas('category', fn ($q) => $q->where('slug', $request->input('category')));
        }

        if ($request->boolean('featured')) {
            $query->where('is_featured', true);
        }

        // Sort is validated to a whitelist of allowed values
        $sort = $request->input('sort', 'newest');
        match ($sort) {
            'price_asc' => $query->orderBy('base_price', 'asc'),
            'price_desc' => $query->orderBy('base_price', 'desc'),
            'popular' => $query->orderByDesc('view_count'),
            default => $query->orderByDesc('created_at'),
        };

        $perPage = min((int) $request->input('per_page', 20), 100);
        return response()->json($query->paginate($perPage));
    }

    /**
     * Public product detail — only active products.
     */
    public function show(string $slug, Request $request): JsonResponse
    {
        $product = Product::where('slug', $slug)
            ->with('images', 'category', 'variants', 'business')
            ->where('status', 'active')
            ->firstOrFail();

        $product->increment('view_count');

        // Track view for recommendations (async via queue)
        if ($request->user()) {
            SyncInteractionToRecombee::dispatch('view', $request->user()->id, $product->id);
        }

        return response()->json(new ProductResource($product));
    }

    /**
     * Business: Create a new product.
     * Authorization handled by StoreProductRequest::authorize()
     */
    public function store(StoreProductRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $product = Product::create([
            ...$validated,
            'business_id' => $request->user()->id,
            'slug' => Str::slug($validated['name']) . '-' . Str::random(5),
            'status' => 'active',
        ]);

        // Upload images
        if ($request->hasFile('images')) {
            foreach ($request->file('images') as $i => $file) {
                $url = $this->imageService->upload($file);
                $product->images()->create([
                    'url' => $url,
                    'is_primary' => $i === 0,
                    'sort_order' => $i,
                ]);
            }
        }

        return response()->json(new ProductResource($product->load('images', 'category')), 201);
    }

    /**
     * Business: Update a product.
     * Authorization handled by UpdateProductRequest::authorize() → ProductPolicy
     */
    public function update(UpdateProductRequest $request, Product $product): JsonResponse
    {
        $product->update($request->validated());
        return response()->json(new ProductResource($product->fresh()));
    }

    /**
     * Business: Delete (soft-delete) a product.
     * IDOR Prevention: Policy checks product belongs to user
     */
    public function destroy(Request $request, Product $product): JsonResponse
    {
        $this->authorize('delete', $product);
        $product->delete();
        return response()->json(['message' => 'Product deleted']);
    }

    /**
     * Business: List own products.
     * IDOR Prevention: Always scoped to authenticated user's ID
     */
    public function myProducts(Request $request): JsonResponse
    {
        $products = Product::where('business_id', $request->user()->id)
            ->with('primaryImage', 'category')
            ->orderByDesc('created_at')
            ->paginate(20);

        return response()->json($products);
    }
}
