<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProductResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'slug' => $this->slug,
            'description' => $this->description,
            'short_description' => $this->short_description,
            'base_price' => (float) $this->base_price,
            'compare_at_price' => $this->compare_at_price ? (float) $this->compare_at_price : null,
            'sku' => $this->sku,
            'stock_quantity' => $this->stock_quantity,
            'low_stock_threshold' => $this->low_stock_threshold,
            'status' => $this->status,
            'brand' => $this->brand,
            'is_featured' => $this->is_featured,
            'view_count' => $this->view_count,
            'category' => $this->whenLoaded('category'),
            'images' => $this->whenLoaded('images', function () {
                return $this->images->map(function ($image) {
                    $url = $image->url;
                    if ($url && !str_starts_with($url, 'http')) {
                        $url = asset('storage/' . $url);
                    }
                    return [
                        'id' => $image->id,
                        'url' => $url,
                        'alt_text' => $image->alt_text,
                        'is_primary' => $image->is_primary,
                        'sort_order' => $image->sort_order,
                    ];
                });
            }),
            'primary_image' => $this->whenLoaded('primaryImage', function () {
                $image = $this->primaryImage;
                if (!$image) return null;
                $url = $image->url;
                if ($url && !str_starts_with($url, 'http')) {
                    $url = asset('storage/' . $url);
                }
                return [
                    'id' => $image->id,
                    'url' => $url,
                    'alt_text' => $image->alt_text,
                ];
            }),
            'variants' => $this->whenLoaded('variants'),
            'business' => $this->whenLoaded('business', fn () => [
                'id' => $this->business->id,
                'name' => $this->business->full_name,
            ]),
            'store' => $this->whenLoaded('store', fn () => $this->store ? [
                'id' => $this->store->id,
                'name' => $this->store->name,
                'slug' => $this->store->slug,
                'logo_url' => $this->store->logo_url,
            ] : null),
            'created_at' => $this->created_at,
        ];
    }
}
