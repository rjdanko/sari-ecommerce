<?php

namespace App\Http\Controllers;

use App\Models\Order;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class OrderController extends Controller
{
    /**
     * User: List own orders only.
     * IDOR: Scoped to authenticated user — cannot see other users' orders
     */
    public function index(Request $request): JsonResponse
    {
        $orders = $request->user()->orders()
            ->with('items')
            ->orderByDesc('created_at')
            ->paginate(20);

        return response()->json($orders);
    }

    /**
     * User: View a specific order.
     * IDOR: OrderPolicy verifies the user owns this order (or is admin/business)
     */
    public function show(Request $request, Order $order): JsonResponse
    {
        $this->authorize('view', $order);

        return response()->json($order->load('items'));
    }

    /**
     * Business: List orders containing this business's products.
     * IDOR: Only shows orders with items from this business user's products
     */
    public function businessOrders(Request $request): JsonResponse
    {
        $orders = Order::whereHas('items.product', function ($q) use ($request) {
            $q->where('business_id', $request->user()->id);
        })
            ->with('items', 'user')
            ->orderByDesc('created_at')
            ->paginate(20);

        return response()->json($orders);
    }

    /**
     * Business: Confirm an order.
     */
    public function confirmOrder(Request $request, Order $order): JsonResponse
    {
        $this->authorize('updateStatus', $order);

        if ($order->status !== 'pending') {
            return response()->json(['error' => 'Order cannot be confirmed in its current state.'], 422);
        }

        $order->update([
            'status' => 'processing',
        ]);

        return response()->json($order->fresh()->load('items'));
    }

    /**
     * Customer: Cancel an order (only before store confirmation).
     */
    public function cancelOrder(Request $request, Order $order): JsonResponse
    {
        $this->authorize('view', $order);

        if ($order->status !== 'pending') {
            return response()->json(['error' => 'Order can only be cancelled before store confirmation.'], 422);
        }

        $order->update([
            'status' => 'cancelled',
            'cancelled_at' => now(),
        ]);

        return response()->json($order->fresh()->load('items'));
    }

    /**
     * Business/Admin: Update order status (e.g., mark as shipped).
     * IDOR: OrderPolicy verifies the user has permission for this order
     */
    public function updateStatus(Request $request, Order $order): JsonResponse
    {
        $this->authorize('updateStatus', $order);

        $request->validate([
            'status' => ['required', 'string', 'in:pending,processing,paid,shipped,delivered,cancelled,refunded'],
        ]);

        $order->update([
            'status' => $request->input('status'),
            'shipped_at' => $request->input('status') === 'shipped' ? now() : $order->shipped_at,
            'delivered_at' => $request->input('status') === 'delivered' ? now() : $order->delivered_at,
        ]);

        return response()->json($order->fresh());
    }
}
