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
        return ProductResource::collection($query->paginate($perPage))->response();
    }

    /**
     * Public product detail — only active products.
     */
    public function show(string $slug, Request $request): JsonResponse
    {
        $product = Product::where('slug', $slug)
            ->with('primaryImage', 'images', 'category', 'variants', 'business', 'store')
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

        // Disable Scout sync during creation to prevent Typesense errors
        // from surfacing to the user when the key is missing/invalid.
        $product = Product::withoutSyncingToSearch(function () use ($validated, $request) {
            $product = Product::create([
                ...$validated,
                'business_id' => $request->user()->id,
                'store_id' => $request->user()->store?->id,
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

            // Auto-generate variants from option categories
            if ($request->has('option_categories') && !empty($request->option_categories)) {
                $combinations = $this->generateCombinations($request->option_categories);
                foreach ($combinations as $combo) {
                    $name = implode(' / ', array_values($combo));
                    $product->variants()->create([
                        'name' => $name,
                        'sku' => $product->sku . '-' . Str::upper(Str::random(4)),
                        'price' => $product->base_price,
                        'stock_quantity' => $product->stock_quantity,
                        'options' => $combo,
                        'is_active' => true,
                    ]);
                }
            }

            return $product;
        });

        return response()->json(new ProductResource($product->load('primaryImage', 'images', 'category', 'variants')), 201);
    }

    /**
     * Business: Update a product.
     * Authorization handled by UpdateProductRequest::authorize() → ProductPolicy
     */
    public function update(UpdateProductRequest $request, Product $product): JsonResponse
    {
        Product::withoutSyncingToSearch(function () use ($request, $product) {
            $product->update($request->validated());

            // Handle new image uploads
            if ($request->hasFile('images')) {
                foreach ($request->file('images') as $file) {
                    $url = $this->imageService->upload($file);
                    $product->images()->create([
                        'url' => $url,
                        'is_primary' => $product->images()->count() === 0,
                        'sort_order' => $product->images()->count(),
                    ]);
                }
            }

            // Handle image deletions
            if ($request->has('delete_images')) {
                $product->images()->whereIn('id', $request->delete_images)->delete();
                // Ensure there's still a primary image
                if ($product->images()->where('is_primary', true)->count() === 0) {
                    $product->images()->first()?->update(['is_primary' => true]);
                }
            }

            // Handle option categories update
            if ($request->has('option_categories')) {
                $product->variants()->delete();
                $categories = $request->option_categories;
                if (!empty($categories)) {
                    $combinations = $this->generateCombinations($categories);
                    foreach ($combinations as $combo) {
                        $name = implode(' / ', array_values($combo));
                        $product->variants()->create([
                            'name' => $name,
                            'sku' => $product->sku . '-' . Str::upper(Str::random(4)),
                            'price' => $product->base_price,
                            'stock_quantity' => $product->stock_quantity,
                            'options' => $combo,
                            'is_active' => true,
                        ]);
                    }
                }
            }
        });

        return response()->json(new ProductResource($product->fresh()->load('primaryImage', 'images', 'category', 'variants')));
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
     * Generate all combinations from option categories.
     * e.g. [['name'=>'Size','values'=>['S','M']], ['name'=>'Color','values'=>['Red','Blue']]]
     * => [['size'=>'S','color'=>'Red'], ['size'=>'S','color'=>'Blue'], ...]
     */
    private function generateCombinations(array $categories): array
    {
        $result = [[]];
        foreach ($categories as $category) {
            $key = Str::lower($category['name']);
            $newResult = [];
            foreach ($result as $combo) {
                foreach ($category['values'] as $value) {
                    $newResult[] = array_merge($combo, [$key => $value]);
                }
            }
            $result = $newResult;
        }
        return $result;
    }

    /**
     * Business: Get a single product for editing.
     * IDOR Prevention: Policy checks product belongs to user
     */
    public function showForBusiness(Request $request, Product $product): JsonResponse
    {
        $this->authorize('update', $product);
        return response()->json(new ProductResource($product->load('primaryImage', 'images', 'category', 'variants')));
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

        return ProductResource::collection($products)->response();
    }
}
