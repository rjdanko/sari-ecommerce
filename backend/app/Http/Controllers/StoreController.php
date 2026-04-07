<?php

namespace App\Http\Controllers;

use App\Models\Store;
use App\Services\ImageService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class StoreController extends Controller
{
    public function __construct(private ImageService $imageService) {}

    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:2000'],
            'logo' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:2048'],
            'banner' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
            'address' => ['nullable', 'string', 'max:500'],
            'phone' => ['nullable', 'string', 'max:20'],
        ]);

        if ($request->user()->store) {
            return response()->json(['message' => 'You already have a store.'], 422);
        }

        $data = [
            'user_id' => $request->user()->id,
            'name' => $request->name,
            'slug' => Str::slug($request->name) . '-' . Str::random(5),
            'description' => $request->description,
            'address' => $request->address,
            'phone' => $request->phone,
        ];

        if ($request->hasFile('logo')) {
            $data['logo_url'] = $this->imageService->upload($request->file('logo'));
        }

        if ($request->hasFile('banner')) {
            $data['banner_url'] = $this->imageService->upload($request->file('banner'));
        }

        $store = Store::create($data);

        return response()->json($store, 201);
    }

    public function show(string $slug): JsonResponse
    {
        $store = Store::where('slug', $slug)
            ->where('is_active', true)
            ->firstOrFail();

        $products = $store->products()
            ->where('status', 'active')
            ->with('primaryImage', 'category')
            ->orderByDesc('created_at')
            ->paginate(20);

        return response()->json([
            'store' => $store,
            'products' => $products,
        ]);
    }

    public function update(Request $request): JsonResponse
    {
        $store = $request->user()->store;

        if (!$store) {
            return response()->json(['message' => 'You do not have a store.'], 404);
        }

        $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:2000'],
            'logo' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:2048'],
            'banner' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
            'address' => ['nullable', 'string', 'max:500'],
            'phone' => ['nullable', 'string', 'max:20'],
        ]);

        $data = $request->only(['name', 'description', 'address', 'phone']);

        if ($request->has('name') && $request->name !== $store->name) {
            $data['slug'] = Str::slug($request->name) . '-' . Str::random(5);
        }

        if ($request->hasFile('logo')) {
            $data['logo_url'] = $this->imageService->upload($request->file('logo'));
        }

        if ($request->hasFile('banner')) {
            $data['banner_url'] = $this->imageService->upload($request->file('banner'));
        }

        $store->update($data);

        return response()->json($store->fresh());
    }

    public function myStore(Request $request): JsonResponse
    {
        $store = $request->user()->store;

        if (!$store) {
            return response()->json(['message' => 'You do not have a store.'], 404);
        }

        return response()->json($store);
    }
}
