<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Store;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class StoreController extends Controller
{
    public function index(): JsonResponse
    {
        $stores = Store::with('owner')
            ->withCount('products')
            ->orderByDesc('created_at')
            ->paginate(20);

        return response()->json($stores);
    }

    public function show(Store $store): JsonResponse
    {
        return response()->json($store->load('owner'));
    }

    public function suspend(Store $store): JsonResponse
    {
        $store->update(['is_active' => false]);
        return response()->json(['message' => 'Store suspended']);
    }

    public function unsuspend(Store $store): JsonResponse
    {
        $store->update(['is_active' => true]);
        return response()->json(['message' => 'Store unsuspended']);
    }
}
