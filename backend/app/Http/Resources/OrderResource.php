<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class OrderResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'                  => $this->id,
            'order_number'        => $this->order_number,
            'status'              => $this->status,
            'subtotal'            => (float) $this->subtotal,
            'shipping_fee'        => (float) $this->shipping_fee,
            'tax'                 => (float) $this->tax,
            'discount'            => (float) ($this->discount ?? 0),
            'total'               => (float) $this->total,
            'payment_method'      => $this->payment_method,
            'payment_status'      => $this->payment_status,
            'shipping_address'    => $this->shipping_address,
            'notes'               => $this->notes,
            'cancellation_reason' => $this->cancellation_reason,
            'cancellation_notes'  => $this->cancellation_notes,
            'confirmed_at'        => $this->confirmed_at,
            'paid_at'             => $this->paid_at,
            'shipped_at'          => $this->shipped_at,
            'delivered_at'        => $this->delivered_at,
            'created_at'          => $this->created_at,
            'items'               => $this->whenLoaded('items', fn () =>
                $this->items->map(fn ($item) => [
                    'id'              => $item->id,
                    'product_id'      => $item->product_id,
                    'product_name'    => $item->product_name,
                    'product_slug'    => optional($item->product)->slug,
                    'product_image_url' => optional(optional($item->product)->primaryImage)->url,
                    'variant_id'      => $item->product_variant_id,
                    'variant_options' => optional($item->variant)->options,
                    'variant_name'    => optional($item->variant)->name,
                    'quantity'        => $item->quantity,
                    'unit_price'      => (float) $item->unit_price,
                    'total_price'     => (float) $item->total_price,
                ])
            ),
            'user'                => $this->whenLoaded('user'),
        ];
    }
}
