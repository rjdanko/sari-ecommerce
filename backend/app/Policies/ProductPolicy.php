<?php

namespace App\Policies;

use App\Models\Product;
use App\Models\User;

class ProductPolicy
{
    /**
     * Anyone can view active products.
     */
    public function view(?User $user, Product $product): bool
    {
        return $product->status === 'active' || $this->isOwnerOrAdmin($user, $product);
    }

    /**
     * Only business users and admins can create products.
     */
    public function create(User $user): bool
    {
        return $user->hasRole(['business', 'admin']);
    }

    /**
     * IDOR CHECK: Only the product's business owner or an admin can update.
     * This prevents User A from editing User B's products.
     */
    public function update(User $user, Product $product): bool
    {
        return $this->isOwnerOrAdmin($user, $product);
    }

    /**
     * IDOR CHECK: Only the product's business owner or an admin can delete.
     */
    public function delete(User $user, Product $product): bool
    {
        return $this->isOwnerOrAdmin($user, $product);
    }

    /**
     * Check if the user is the product's business owner or an admin.
     */
    private function isOwnerOrAdmin(?User $user, Product $product): bool
    {
        if (! $user) {
            return false;
        }

        return $user->id === $product->business_id || $user->hasRole('admin');
    }
}
