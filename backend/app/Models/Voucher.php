<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Voucher extends Model
{
    protected $fillable = [
        'code', 'name', 'description', 'type', 'discount_type',
        'discount_value', 'min_spend', 'max_discount',
        'total_quantity', 'claimed_count', 'max_claims_per_user',
        'starts_at', 'expires_at', 'is_active',
    ];

    protected function casts(): array
    {
        return [
            'discount_value' => 'decimal:2',
            'min_spend' => 'decimal:2',
            'max_discount' => 'decimal:2',
            'is_active' => 'boolean',
            'starts_at' => 'datetime',
            'expires_at' => 'datetime',
        ];
    }

    public function claims()
    {
        return $this->hasMany(VoucherClaim::class);
    }

    public function isValid(): bool
    {
        return $this->is_active
            && now()->between($this->starts_at, $this->expires_at)
            && ($this->total_quantity === null || $this->claimed_count < $this->total_quantity);
    }

    public function calculateDiscount(float $subtotal): float
    {
        if ($subtotal < $this->min_spend) {
            return 0;
        }

        if ($this->discount_type === 'free_shipping') {
            return 0;
        }

        if ($this->discount_type === 'fixed') {
            return min($this->discount_value, $subtotal);
        }

        // percentage
        $discount = $subtotal * ($this->discount_value / 100);
        if ($this->max_discount !== null) {
            $discount = min($discount, $this->max_discount);
        }
        return round($discount, 2);
    }

    public function grantsFreeShipping(): bool
    {
        return $this->discount_type === 'free_shipping';
    }
}
