# Module 2: Database Schema & Models

> **For agentic workers:** REQUIRED: Implement this plan task-by-task.
> Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create all database migrations and Eloquent models with proper
relationships, casts, and searchable arrays.

**Architecture:** PostgreSQL via Supabase. Laravel Eloquent ORM with
parameterized queries throughout.

**Tech Stack:** Laravel 12, PostgreSQL, Spatie Permission, Laravel Scout

**Security Context:**
- 🔒 **SQL Injection:** All database queries use Eloquent ORM which is parameterized by default.
  NEVER use `DB::raw()` with user input. If raw queries are needed, ALWAYS use
  parameter bindings: `DB::select('SELECT * FROM users WHERE id = ?', [$id])`.
- 🔒 **Soft Deletes:** Used on `users`, `products`, and `orders` to prevent accidental
  permanent data loss.

---

## Files

- Modify: `backend/database/migrations/0001_01_01_000000_create_users_table.php`
- Create: `backend/database/migrations/0002_create_categories_table.php`
- Create: `backend/database/migrations/0003_create_products_table.php`
- Create: `backend/database/migrations/0004_create_product_variants_table.php`
- Create: `backend/database/migrations/0005_create_product_images_table.php`
- Create: `backend/database/migrations/0006_create_orders_table.php`
- Create: `backend/database/migrations/0007_create_order_items_table.php`
- Create: `backend/database/migrations/0008_create_wishlists_table.php`
- Create: `backend/database/migrations/0009_create_search_histories_table.php`
- Create: `backend/app/Enums/RoleEnum.php`
- Modify: `backend/app/Models/User.php`
- Create: `backend/app/Models/Product.php`
- Create: `backend/app/Models/Category.php`
- Create: `backend/app/Models/Order.php`
- Create: `backend/app/Models/OrderItem.php`
- Create: `backend/app/Models/ProductVariant.php`
- Create: `backend/app/Models/ProductImage.php`
- Create: `backend/app/Models/Wishlist.php`
- Create: `backend/app/Models/SearchHistory.php`

---

### Task 2.1: Database Migrations

- [ ] **Step 1: Modify the default users migration**

File: `backend/database/migrations/0001_01_01_000000_create_users_table.php`

The default Breeze migration creates a users table. Modify it to add:
```php
Schema::create('users', function (Blueprint $table) {
    $table->id();
    $table->string('first_name');
    $table->string('last_name');
    $table->string('email')->unique();
    $table->timestamp('email_verified_at')->nullable();
    $table->string('password');
    $table->string('phone')->nullable();
    $table->string('avatar_url')->nullable();
    $table->jsonb('default_address')->nullable();
    $table->rememberToken();
    $table->timestamps();
    $table->softDeletes();
});
```

- [ ] **Step 2: Create categories migration**

```bash
php artisan make:migration create_categories_table
```

```php
Schema::create('categories', function (Blueprint $table) {
    $table->id();
    $table->string('name');
    $table->string('slug')->unique();
    $table->text('description')->nullable();
    $table->string('image_url')->nullable();
    $table->foreignId('parent_id')->nullable()->constrained('categories')->onDelete('set null');
    $table->integer('sort_order')->default(0);
    $table->boolean('is_active')->default(true);
    $table->timestamps();
});
```

- [ ] **Step 3: Create products migration**

```bash
php artisan make:migration create_products_table
```

```php
Schema::create('products', function (Blueprint $table) {
    $table->id();
    $table->foreignId('category_id')->constrained()->onDelete('cascade');
    $table->foreignId('business_id')->constrained('users')->onDelete('cascade');
    $table->string('name');
    $table->string('slug')->unique();
    $table->text('description')->nullable();
    $table->text('short_description')->nullable();
    $table->decimal('base_price', 12, 2);
    $table->decimal('compare_at_price', 12, 2)->nullable();
    $table->string('sku')->unique();
    $table->integer('stock_quantity')->default(0);
    $table->integer('low_stock_threshold')->default(5);
    $table->enum('status', ['draft', 'active', 'archived'])->default('draft');
    $table->string('brand')->nullable();
    $table->jsonb('attributes')->nullable();
    $table->decimal('weight', 8, 2)->nullable();
    $table->boolean('is_featured')->default(false);
    $table->integer('view_count')->default(0);
    $table->timestamps();
    $table->softDeletes();

    $table->index(['category_id', 'status']);
    $table->index('business_id');
});
```

- [ ] **Step 4: Create product_variants migration**

```bash
php artisan make:migration create_product_variants_table
```

```php
Schema::create('product_variants', function (Blueprint $table) {
    $table->id();
    $table->foreignId('product_id')->constrained()->onDelete('cascade');
    $table->string('name');
    $table->string('sku')->unique();
    $table->decimal('price', 12, 2);
    $table->integer('stock_quantity')->default(0);
    $table->jsonb('options')->nullable();
    $table->boolean('is_active')->default(true);
    $table->timestamps();
});
```

- [ ] **Step 5: Create product_images migration**

```bash
php artisan make:migration create_product_images_table
```

```php
Schema::create('product_images', function (Blueprint $table) {
    $table->id();
    $table->foreignId('product_id')->constrained()->onDelete('cascade');
    $table->string('url');
    $table->string('alt_text')->nullable();
    $table->integer('sort_order')->default(0);
    $table->boolean('is_primary')->default(false);
    $table->timestamps();
});
```

- [ ] **Step 6: Create orders migration**

```bash
php artisan make:migration create_orders_table
```

```php
Schema::create('orders', function (Blueprint $table) {
    $table->id();
    $table->string('order_number')->unique();
    $table->foreignId('user_id')->constrained()->onDelete('cascade');
    $table->enum('status', [
        'pending', 'processing', 'paid', 'shipped',
        'delivered', 'cancelled', 'refunded'
    ])->default('pending');
    $table->decimal('subtotal', 12, 2);
    $table->decimal('shipping_fee', 12, 2)->default(0);
    $table->decimal('tax', 12, 2)->default(0);
    $table->decimal('total', 12, 2);
    $table->string('payment_method')->nullable();
    $table->string('payment_status')->default('unpaid');
    $table->string('paymongo_checkout_id')->nullable();
    $table->string('paymongo_payment_id')->nullable();
    $table->jsonb('shipping_address');
    $table->jsonb('billing_address')->nullable();
    $table->text('notes')->nullable();
    $table->timestamp('paid_at')->nullable();
    $table->timestamp('shipped_at')->nullable();
    $table->timestamp('delivered_at')->nullable();
    $table->timestamps();
    $table->softDeletes();

    $table->index(['user_id', 'status']);
});
```

- [ ] **Step 7: Create order_items migration**

```bash
php artisan make:migration create_order_items_table
```

```php
Schema::create('order_items', function (Blueprint $table) {
    $table->id();
    $table->foreignId('order_id')->constrained()->onDelete('cascade');
    $table->foreignId('product_id')->constrained();
    $table->foreignId('product_variant_id')->nullable()->constrained();
    $table->string('product_name');
    $table->integer('quantity');
    $table->decimal('unit_price', 12, 2);
    $table->decimal('total_price', 12, 2);
    $table->timestamps();
});
```

- [ ] **Step 8: Create wishlists migration**

```bash
php artisan make:migration create_wishlists_table
```

```php
Schema::create('wishlists', function (Blueprint $table) {
    $table->id();
    $table->foreignId('user_id')->constrained()->onDelete('cascade');
    $table->foreignId('product_id')->constrained()->onDelete('cascade');
    $table->timestamps();

    $table->unique(['user_id', 'product_id']);
});
```

- [ ] **Step 9: Create search_histories migration**

```bash
php artisan make:migration create_search_histories_table
```

```php
Schema::create('search_histories', function (Blueprint $table) {
    $table->id();
    $table->foreignId('user_id')->constrained()->onDelete('cascade');
    $table->string('query');
    $table->integer('results_count')->default(0);
    $table->timestamps();

    $table->index('user_id');
});
```

- [ ] **Step 10: Run all migrations**

```bash
php artisan migrate
```
Expected: All tables created successfully in Supabase PostgreSQL.

- [ ] **Step 11: Commit**

```bash
git add .
git commit -m "feat: add all database migrations for e-commerce schema"
```

---

### Task 2.2: Eloquent Models

- [ ] **Step 1: Create RoleEnum**

Create file: `backend/app/Enums/RoleEnum.php`

```php
<?php

namespace App\Enums;

enum RoleEnum: string
{
    case USER = 'user';
    case BUSINESS = 'business';
    case ADMIN = 'admin';
}
```

- [ ] **Step 2: Update User model**

File: `backend/app/Models/User.php`

> **🔒 SECURITY:** The `$fillable` array explicitly lists allowed fields.
> The `password` is cast as `hashed` — Laravel auto-hashes on set.
> `$hidden` ensures password and remember_token are never serialized to JSON.

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Spatie\Permission\Traits\HasRoles;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable, HasRoles, SoftDeletes;

    protected $fillable = [
        'first_name', 'last_name', 'email', 'password',
        'phone', 'avatar_url', 'default_address',
    ];

    protected $hidden = ['password', 'remember_token'];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'default_address' => 'array',
        ];
    }

    public function orders()
    {
        return $this->hasMany(Order::class);
    }

    public function wishlist()
    {
        return $this->hasMany(Wishlist::class);
    }

    public function products()
    {
        return $this->hasMany(Product::class, 'business_id');
    }

    public function searchHistories()
    {
        return $this->hasMany(SearchHistory::class);
    }

    public function getFullNameAttribute(): string
    {
        return "{$this->first_name} {$this->last_name}";
    }
}
```

- [ ] **Step 3: Create Product model**

Create file: `backend/app/Models/Product.php`

```php
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
        'category_id', 'business_id', 'name', 'slug', 'description',
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
```

- [ ] **Step 4: Create Category model**

Create file: `backend/app/Models/Category.php`

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Category extends Model
{
    use HasFactory;

    protected $fillable = [
        'name', 'slug', 'description', 'image_url',
        'parent_id', 'sort_order', 'is_active',
    ];

    protected function casts(): array
    {
        return ['is_active' => 'boolean'];
    }

    public function parent()
    {
        return $this->belongsTo(Category::class, 'parent_id');
    }

    public function children()
    {
        return $this->hasMany(Category::class, 'parent_id');
    }

    public function products()
    {
        return $this->hasMany(Product::class);
    }
}
```

- [ ] **Step 5: Create remaining models**

Create all six files in `backend/app/Models/`:

**Order.php:**
```php
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
        'tax', 'total', 'payment_method', 'payment_status',
        'paymongo_checkout_id', 'paymongo_payment_id',
        'shipping_address', 'billing_address', 'notes',
        'paid_at', 'shipped_at', 'delivered_at',
    ];

    protected function casts(): array
    {
        return [
            'shipping_address' => 'array',
            'billing_address' => 'array',
            'paid_at' => 'datetime',
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

    public static function generateOrderNumber(): string
    {
        return 'SARI-' . strtoupper(uniqid());
    }
}
```

**OrderItem.php:**
```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class OrderItem extends Model
{
    protected $fillable = [
        'order_id', 'product_id', 'product_variant_id',
        'product_name', 'quantity', 'unit_price', 'total_price',
    ];

    public function order()
    {
        return $this->belongsTo(Order::class);
    }

    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    public function variant()
    {
        return $this->belongsTo(ProductVariant::class, 'product_variant_id');
    }
}
```

**ProductVariant.php:**
```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ProductVariant extends Model
{
    protected $fillable = [
        'product_id', 'name', 'sku', 'price',
        'stock_quantity', 'options', 'is_active',
    ];

    protected function casts(): array
    {
        return [
            'options' => 'array',
            'is_active' => 'boolean',
        ];
    }

    public function product()
    {
        return $this->belongsTo(Product::class);
    }
}
```

**ProductImage.php:**
```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ProductImage extends Model
{
    protected $fillable = [
        'product_id', 'url', 'alt_text', 'sort_order', 'is_primary',
    ];

    protected function casts(): array
    {
        return ['is_primary' => 'boolean'];
    }

    public function product()
    {
        return $this->belongsTo(Product::class);
    }
}
```

**Wishlist.php:**
```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Wishlist extends Model
{
    protected $fillable = ['user_id', 'product_id'];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function product()
    {
        return $this->belongsTo(Product::class);
    }
}
```

**SearchHistory.php:**
```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SearchHistory extends Model
{
    protected $fillable = ['user_id', 'query', 'results_count'];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
```

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "feat: add all Eloquent models with relationships"
```
