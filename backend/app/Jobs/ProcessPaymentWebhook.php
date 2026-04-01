<?php

namespace App\Jobs;

use App\Models\Order;
use App\Models\Product;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class ProcessPaymentWebhook implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(private array $eventData) {}

    public function handle(): void
    {
        $attributes = $this->eventData['attributes'] ?? [];
        $paymentData = $attributes['data'] ?? [];
        $metadata = $paymentData['attributes']['metadata'] ?? [];

        $orderId = $metadata['order_id'] ?? null;

        if (! $orderId) {
            Log::warning('PayMongo webhook: no order_id in metadata', $this->eventData);
            return;
        }

        $order = Order::with('items')->find($orderId);

        if (! $order) {
            Log::warning("PayMongo webhook: order {$orderId} not found");
            return;
        }

        // Idempotency check — prevents double-processing
        if ($order->payment_status === 'paid') {
            Log::info("PayMongo webhook: order {$orderId} already paid, skipping");
            return;
        }

        DB::transaction(function () use ($order, $paymentData) {
            $order->update([
                'status' => 'paid',
                'payment_status' => 'paid',
                'payment_method' => $paymentData['attributes']['payment_method_used'] ?? 'unknown',
                'paymongo_payment_id' => $paymentData['id'] ?? null,
                'paid_at' => now(),
            ]);

            // Deduct inventory atomically
            foreach ($order->items as $item) {
                Product::where('id', $item->product_id)
                    ->decrement('stock_quantity', $item->quantity);
            }
        });

        Log::info("PayMongo webhook: order {$orderId} marked as paid");
    }
}
