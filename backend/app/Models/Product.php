<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Laravel\Scout\Searchable;

class Product extends Model
{
    use HasFactory, SoftDeletes, Searchable;

    protected $fillable = [
        'category_id', 'business_id', 'store_id', 'name', 'slug', 'description',
        'short_description', 'base_price', 'compare_at_price', 'sku',
        'stock_quantity', 'low_stock_threshold', 'status', 'brand',
        'attributes', 'weight', 'is_featured', 'view_count',
    ];

    protected function casts(): array
    {
        return [
            'base_price' => 'decimal:2',
            'compare_at_price' => 'decimal:2',
            'attributes' => 'array',
            'is_featured' => 'boolean',
        ];
    }

    /**
     * Disable auto-indexing until Typesense is properly configured.
     * Remove this method (or return true) once a valid TYPESENSE_API_KEY is set.
     */
    public function shouldBeSearchable(): bool
    {
        return !empty(config('scout.typesense.client-settings.api_key'));
    }

    public function toSearchableArray(): array
    {
        return [
            'id' => (string) $this->id,
            'name' => $this->name,
            'description' => $this->description ?? '',
            'category' => $this->category?->name ?? '',
            'brand' => $this->brand ?? '',
            'base_price' => (float) $this->base_price,
            'is_featured' => $this->is_featured,
            'stock_quantity' => $this->stock_quantity,
            'created_at' => $this->created_at->timestamp,
        ];
    }

    public function getCollectionSchema(): array
    {
        return [
            'name' => $this->searchableAs(),
            'fields' => [
                ['name' => 'id', 'type' => 'string'],
                ['name' => 'name', 'type' => 'string'],
                ['name' => 'description', 'type' => 'string'],
                ['name' => 'category', 'type' => 'string', 'facet' => true],
                ['name' => 'brand', 'type' => 'string', 'facet' => true],
                ['name' => 'base_price', 'type' => 'float'],
                ['name' => 'is_featured', 'type' => 'bool'],
                ['name' => 'stock_quantity', 'type' => 'int32'],
                ['name' => 'created_at', 'type' => 'int64'],
            ],
            'default_sorting_field' => 'created_at',
        ];
    }

    public function typesenseQueryBy(): array
    {
        return ['name', 'description', 'category', 'brand'];
    }

    public function category()
    {
        return $this->belongsTo(Category::class);
    }

    public function business()
    {
        return $this->belongsTo(User::class, 'business_id');
    }

    public function store()
    {
        return $this->belongsTo(Store::class);
    }

    public function variants()
    {
        return $this->hasMany(ProductVariant::class);
    }

    public function images()
    {
        return $this->hasMany(ProductImage::class)->orderBy('sort_order');
    }

    public function primaryImage()
    {
        return $this->hasOne(ProductImage::class)->where('is_primary', true);
    }

    public function orderItems()
    {
        return $this->hasMany(OrderItem::class);
    }
}
