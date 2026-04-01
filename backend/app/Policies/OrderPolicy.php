<?php

namespace App\Policies;

use App\Models\Order;
use App\Models\User;

class OrderPolicy
{
    /**
     * IDOR CHECK: Users can only view their own orders.
     * Business users can view orders that contain their products.
     * Admins can view all orders.
     */
    public function view(User $user, Order $order): bool
    {
        // Admin can see everything
        if ($user->hasRole('admin')) {
            return true;
        }

        // User can see their own orders
        if ($order->user_id === $user->id) {
            return true;
        }

        // Business user can see orders containing their products
        if ($user->hasRole('business')) {
            return $order->items()
                ->whereHas('product', fn ($q) => $q->where('business_id', $user->id))
                ->exists();
        }

        return false;
    }

    /**
     * Only the order owner can cancel (if status allows).
     */
    public function cancel(User $user, Order $order): bool
    {
        return $order->user_id === $user->id && $order->status === 'pending';
    }

    /**
     * Only business users (whose products are in the order) or admins
     * can update order status (e.g., mark as shipped).
     */
    public function updateStatus(User $user, Order $order): bool
    {
        if ($user->hasRole('admin')) {
            return true;
        }

        if ($user->hasRole('business')) {
            return $order->items()
                ->whereHas('product', fn ($q) => $q->where('business_id', $user->id))
                ->exists();
        }

        return false;
    }
}
