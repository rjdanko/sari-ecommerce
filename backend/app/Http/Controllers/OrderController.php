<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Services\PaymentService;
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

        if ($order->status !== 'pending_confirmation') {
            return response()->json(['error' => 'Order cannot be confirmed in its current state.'], 422);
        }

        $order->update([
            'status' => 'confirmed',
            'confirmed_at' => now(),
        ]);

        return response()->json($order->fresh()->load('items'));
    }

    /**
     * Customer: Cancel an order (only before store confirmation).
     */
    public function cancelOrder(Request $request, Order $order): JsonResponse
    {
        $this->authorize('view', $order);

        if ($order->status !== 'pending_confirmation') {
            return response()->json(['error' => 'Order can only be cancelled before store confirmation.'], 422);
        }

        $validated = $request->validate([
            'reason' => ['required', 'string', 'in:changed_mind,found_better_deal,ordered_by_mistake,delivery_too_long,want_to_change_order,other'],
            'notes' => ['nullable', 'string', 'max:500', 'required_if:reason,other'],
        ]);

        $order->update([
            'status' => 'cancelled',
            'cancelled_at' => now(),
            'cancellation_reason' => $validated['reason'],
            'cancellation_notes' => $validated['notes'] ?? null,
        ]);

        return response()->json($order->fresh()->load('items'));
    }

    /**
     * Mark an order as payment_failed after user returns from PayMongo without paying.
     */
    public function markPaymentFailed(Request $request, Order $order, PaymentService $paymentService): JsonResponse
    {
        $this->authorize('view', $order);

        if ($order->status !== 'pending_confirmation' || !$order->paymongo_checkout_id) {
            return response()->json(['error' => 'Order cannot be marked as payment failed.'], 422);
        }

        $session = $paymentService->getCheckoutSession($order->paymongo_checkout_id);
        $paymentStatus = $session['attributes']['payment_intent']['attributes']['status'] ?? null;

        if ($paymentStatus === 'succeeded') {
            return response()->json(['error' => 'Payment was completed. Order will be updated shortly.'], 422);
        }

        $order->update([
            'status' => 'payment_failed',
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
            'status' => ['required', 'string', 'in:pending_confirmation,confirmed,processing,paid,shipped,delivered,cancelled,refunded,payment_failed'],
        ]);

        $order->update([
            'status' => $request->input('status'),
            'shipped_at' => $request->input('status') === 'shipped' ? now() : $order->shipped_at,
            'delivered_at' => $request->input('status') === 'delivered' ? now() : $order->delivered_at,
        ]);

        return response()->json($order->fresh());
    }
}
