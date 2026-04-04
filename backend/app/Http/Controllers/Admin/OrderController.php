<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\OrderResource;
use App\Models\Order;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class OrderController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Order::with(['user', 'items'])
            ->when($request->search, fn ($q, $search) =>
                $q->where('order_number', 'ilike', "%{$search}%")
                  ->orWhereHas('user', fn ($uq) =>
                      $uq->where('first_name', 'ilike', "%{$search}%")
                         ->orWhere('last_name', 'ilike', "%{$search}%")
                         ->orWhere('email', 'ilike', "%{$search}%")
                  )
            )
            ->when($request->status, fn ($q, $status) =>
                $q->where('status', $status)
            )
            ->latest();

        return response()->json(
            OrderResource::collection($query->paginate($request->per_page ?? 20))
        );
    }

    public function show(Order $order): JsonResponse
    {
        return response()->json(
            new OrderResource($order->load(['user', 'items']))
        );
    }

    public function updateStatus(Request $request, Order $order): JsonResponse
    {
        $validated = $request->validate([
            'status' => 'required|in:pending,processing,paid,shipped,delivered,cancelled,refunded',
        ]);

        $order->update(['status' => $validated['status']]);

        if ($validated['status'] === 'shipped') {
            $order->update(['shipped_at' => now()]);
        } elseif ($validated['status'] === 'delivered') {
            $order->update(['delivered_at' => now()]);
        }

        return response()->json([
            'message' => 'Order status updated.',
            'order' => new OrderResource($order->load(['user', 'items'])),
        ]);
    }
}
