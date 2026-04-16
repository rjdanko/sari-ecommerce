<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Order extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'order_number', 'user_id', 'status', 'subtotal', 'shipping_fee',
        'tax', 'discount', 'total', 'voucher_id', 'payment_method', 'payment_status',
        'paymongo_checkout_id', 'paymongo_payment_id',
        'shipping_address', 'billing_address', 'notes',
        'cancellation_reason', 'cancellation_notes',
        'paid_at', 'confirmed_at', 'cancelled_at', 'shipped_at', 'delivered_at',
    ];

    protected function casts(): array
    {
        return [
            'shipping_address' => 'array',
            'billing_address' => 'array',
            'paid_at' => 'datetime',
            'confirmed_at' => 'datetime',
            'cancelled_at' => 'datetime',
            'shipped_at' => 'datetime',
            'delivered_at' => 'datetime',
        ];
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function items()
    {
        return $this->hasMany(OrderItem::class);
    }

    public function payments()
    {
        return $this->hasMany(Payment::class);
    }

    public static function generateOrderNumber(): string
    {
        return 'SARI-' . strtoupper(uniqid());
    }
}
