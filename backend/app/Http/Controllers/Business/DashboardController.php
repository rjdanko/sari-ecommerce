<?php

namespace App\Http\Controllers\Business;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $store = $user->store;

        if (!$store) {
            return response()->json([
                'has_store' => false,
                'message' => 'Create a store to see your dashboard.',
            ]);
        }

        $productIds = Product::where('store_id', $store->id)->pluck('id');

        $totalProducts = $productIds->count();
        $activeProducts = Product::where('store_id', $store->id)->where('status', 'active')->count();

        $orders = Order::whereHas('items', function ($q) use ($productIds) {
            $q->whereIn('product_id', $productIds);
        });

        $totalOrders = $orders->count();
        $revenue = (clone $orders)->where('payment_status', 'paid')->sum('total');
        $pendingOrders = (clone $orders)->where('status', 'pending')->count();

        $lowStockProducts = Product::where('store_id', $store->id)
            ->where('status', 'active')
            ->whereColumn('stock_quantity', '<=', 'low_stock_threshold')
            ->count();

        return response()->json([
            'has_store' => true,
            'store' => $store,
            'total_products' => $totalProducts,
            'active_products' => $activeProducts,
            'total_orders' => $totalOrders,
            'revenue' => $revenue,
            'pending_orders' => $pendingOrders,
            'low_stock_products' => $lowStockProducts,
        ]);
    }
}
