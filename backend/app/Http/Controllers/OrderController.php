<?php

namespace App\Http\Controllers;

use App\Models\Order;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class OrderController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $orders = $request->user()->orders()->latest()->paginate(15);

        return response()->json($orders);
    }

    public function show(Request $request, Order $order): JsonResponse
    {
        if ($request->user()->cannot('view', $order)) {
            abort(403);
        }

        return response()->json($order->load('items'));
    }

    public function businessOrders(Request $request): JsonResponse
    {
        $orders = Order::whereHas('items.product', fn ($q) => $q->where('business_id', $request->user()->id))
            ->latest()
            ->paginate(15);

        return response()->json($orders);
    }

    public function updateStatus(Request $request, Order $order): JsonResponse
    {
        if ($request->user()->cannot('updateStatus', $order)) {
            abort(403);
        }

        $request->validate(['status' => ['required', 'string', 'in:processing,shipped,delivered,cancelled']]);

        $order->update(['status' => $request->status]);

        return response()->json($order);
    }
}
