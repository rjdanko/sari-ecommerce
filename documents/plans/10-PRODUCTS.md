# Module 10: Product CRUD & Business Logic

> **For agentic workers:** REQUIRED: Implement this plan task-by-task.
> Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Create the ProductController, OrderController, WishlistController, and
CategoryController with full authorization enforcement, IDOR prevention, and
input validation.

**Architecture:** Controllers use Form Request classes for validation, Policies
for authorization, and API Resources for consistent response formatting.

**Tech Stack:** Laravel 12

---

## 🔒 Security Requirements Recap for this Module

Every controller in this module MUST:
1. Use **Form Request classes** for input validation (never `$request->all()`)
2. Use **Policies** for authorization checks (IDOR prevention)
3. Scope user data queries to the authenticated user (never trust user-supplied IDs)
4. Use **Eloquent ORM** for all queries (never raw SQL with user input)

---

## Files

- Create: `backend/app/Http/Controllers/ProductController.php`
- Create: `backend/app/Http/Controllers/OrderController.php`
- Create: `backend/app/Http/Controllers/WishlistController.php`
- Create: `backend/app/Http/Controllers/CategoryController.php`
- Create: `backend/app/Http/Controllers/Admin/DashboardController.php`
- Create: `backend/app/Http/Controllers/Admin/UserController.php`
- Create: `backend/app/Http/Controllers/Admin/InventoryController.php`
- Create: `backend/app/Http/Resources/ProductResource.php`
- Create: `backend/app/Http/Resources/OrderResource.php`
- Create: `backend/app/Http/Resources/CategoryResource.php`
- Create: `backend/app/Http/Resources/UserResource.php`

---

### Task 10.1: ProductController (CRUD + Listing)

- [x] **Step 1: Create ProductController**

Create file: `backend/app/Http/Controllers/ProductController.php`

> **🔒 SECURITY:**
> - `store()` uses `StoreProductRequest` — validates all inputs, authorizes business role
> - `update()` uses `UpdateProductRequest` — authorizes via ProductPolicy (IDOR check)
> - `destroy()` uses `$this->authorize()` — verifies product ownership via Policy
> - `myProducts()` scopes to `$request->user()->id` — business can only see own products
> - Public listing only shows `status = 'active'` — no drafts/archived leak

```php
<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreProductRequest;
use App\Http\Requests\UpdateProductRequest;
use App\Http\Resources\ProductResource;
use App\Jobs\SyncInteractionToRecombee;
use App\Models\Product;
use App\Services\ImageService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class ProductController extends Controller
{
    public function __construct(private ImageService $imageService) {}

    /**
     * Public listing — only active products.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Product::where('status', 'active')
            ->with('primaryImage', 'category');

        if ($request->has('category')) {
            // 🔒 Using Eloquent whereHas — parameterized, no SQL injection risk
            $query->whereHas('category', fn ($q) => $q->where('slug', $request->input('category')));
        }

        if ($request->boolean('featured')) {
            $query->where('is_featured', true);
        }

        // 🔒 Sort is validated to a whitelist of allowed values
        $sort = $request->input('sort', 'newest');
        match ($sort) {
            'price_asc' => $query->orderBy('base_price', 'asc'),
            'price_desc' => $query->orderBy('base_price', 'desc'),
            'popular' => $query->orderByDesc('view_count'),
            default => $query->orderByDesc('created_at'),
        };

        $perPage = min((int) $request->input('per_page', 20), 100);
        return response()->json($query->paginate($perPage));
    }

    /**
     * Public product detail — only active products.
     */
    public function show(string $slug, Request $request): JsonResponse
    {
        $product = Product::where('slug', $slug)
            ->with('images', 'category', 'variants', 'business')
            ->where('status', 'active')
            ->firstOrFail();

        $product->increment('view_count');

        // Track view for recommendations (async via queue)
        if ($request->user()) {
            SyncInteractionToRecombee::dispatch('view', $request->user()->id, $product->id);
        }

        return response()->json(new ProductResource($product));
    }

    /**
     * Business: Create a new product.
     * 🔒 Authorization handled by StoreProductRequest::authorize()
     */
    public function store(StoreProductRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $product = Product::create([
            ...$validated,
            'business_id' => $request->user()->id,
            'slug' => Str::slug($validated['name']) . '-' . Str::random(5),
            'status' => 'active',
        ]);

        // Upload images
        if ($request->hasFile('images')) {
            foreach ($request->file('images') as $i => $file) {
                $url = $this->imageService->upload($file);
                $product->images()->create([
                    'url' => $url,
                    'is_primary' => $i === 0,
                    'sort_order' => $i,
                ]);
            }
        }

        return response()->json(new ProductResource($product->load('images', 'category')), 201);
    }

    /**
     * Business: Update a product.
     * 🔒 Authorization handled by UpdateProductRequest::authorize() → ProductPolicy
     */
    public function update(UpdateProductRequest $request, Product $product): JsonResponse
    {
        $product->update($request->validated());
        return response()->json(new ProductResource($product->fresh()));
    }

    /**
     * Business: Delete (soft-delete) a product.
     * 🔒 IDOR Prevention: Policy checks product belongs to user
     */
    public function destroy(Request $request, Product $product): JsonResponse
    {
        $this->authorize('delete', $product);
        $product->delete();
        return response()->json(['message' => 'Product deleted']);
    }

    /**
     * Business: List own products.
     * 🔒 IDOR Prevention: Always scoped to authenticated user's ID
     */
    public function myProducts(Request $request): JsonResponse
    {
        $products = Product::where('business_id', $request->user()->id)
            ->with('primaryImage', 'category')
            ->orderByDesc('created_at')
            ->paginate(20);

        return response()->json($products);
    }
}
```

- [x] **Step 2: Create ProductResource**

Create file: `backend/app/Http/Resources/ProductResource.php`

```php
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
            'images' => $this->whenLoaded('images'),
            'primary_image' => $this->whenLoaded('primaryImage'),
            'variants' => $this->whenLoaded('variants'),
            'business' => $this->whenLoaded('business', fn () => [
                'id' => $this->business->id,
                'name' => $this->business->full_name,
            ]),
            'created_at' => $this->created_at,
        ];
    }
}
```

- [x] **Step 3: Commit**

```bash
git add .
git commit -m "feat: add ProductController CRUD with authorization and ProductResource"
```

---

### Task 10.2: OrderController with IDOR Prevention

- [x] **Step 1: Create OrderController**

Create file: `backend/app/Http/Controllers/OrderController.php`

> **🔒 IDOR Prevention:**
> - `index()` scopes to `$request->user()->orders()` — users only see their own
> - `show()` uses `$this->authorize('view', $order)` → OrderPolicy
> - `businessOrders()` scopes to orders containing the business user's products
> - `updateStatus()` uses `$this->authorize('updateStatus', $order)` → OrderPolicy

```php
<?php

namespace App\Http\Controllers;

use App\Models\Order;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class OrderController extends Controller
{
    /**
     * User: List own orders only.
     * 🔒 IDOR: Scoped to authenticated user — cannot see other users' orders
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
     * 🔒 IDOR: OrderPolicy verifies the user owns this order (or is admin/business)
     */
    public function show(Request $request, Order $order): JsonResponse
    {
        $this->authorize('view', $order);

        return response()->json($order->load('items'));
    }

    /**
     * Business: List orders containing this business's products.
     * 🔒 IDOR: Only shows orders with items from this business user's products
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
     * Business/Admin: Update order status (e.g., mark as shipped).
     * 🔒 IDOR: OrderPolicy verifies the user has permission for this order
     */
    public function updateStatus(Request $request, Order $order): JsonResponse
    {
        $this->authorize('updateStatus', $order);

        $request->validate([
            'status' => ['required', 'string', 'in:processing,shipped,delivered,cancelled'],
        ]);

        $order->update([
            'status' => $request->input('status'),
            'shipped_at' => $request->input('status') === 'shipped' ? now() : $order->shipped_at,
            'delivered_at' => $request->input('status') === 'delivered' ? now() : $order->delivered_at,
        ]);

        return response()->json($order->fresh());
    }
}
```

- [x] **Step 2: Commit**

```bash
git add .
git commit -m "feat: add OrderController with IDOR prevention via Policy"
```

---

### Task 10.3: WishlistController & CategoryController

- [x] **Step 1: Create WishlistController**

Create file: `backend/app/Http/Controllers/WishlistController.php`

> **🔒 IDOR: All queries scoped to `$request->user()->id`**

```php
<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Models\Wishlist;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WishlistController extends Controller
{
    /**
     * List user's wishlist.
     * 🔒 Scoped to authenticated user
     */
    public function index(Request $request): JsonResponse
    {
        $wishlist = Wishlist::where('user_id', $request->user()->id)
            ->with('product.primaryImage', 'product.category')
            ->orderByDesc('created_at')
            ->paginate(20);

        return response()->json($wishlist);
    }

    /**
     * Toggle wishlist item (add/remove).
     * 🔒 Scoped to authenticated user — cannot modify other users' wishlists
     */
    public function toggle(Request $request, Product $product): JsonResponse
    {
        $existing = Wishlist::where('user_id', $request->user()->id)
            ->where('product_id', $product->id)
            ->first();

        if ($existing) {
            $existing->delete();
            return response()->json(['message' => 'Removed from wishlist', 'wishlisted' => false]);
        }

        Wishlist::create([
            'user_id' => $request->user()->id,
            'product_id' => $product->id,
        ]);

        return response()->json(['message' => 'Added to wishlist', 'wishlisted' => true], 201);
    }
}
```

- [x] **Step 2: Create CategoryController**

Create file: `backend/app/Http/Controllers/CategoryController.php`

```php
<?php

namespace App\Http\Controllers;

use App\Models\Category;
use Illuminate\Http\JsonResponse;

class CategoryController extends Controller
{
    public function index(): JsonResponse
    {
        $categories = Category::where('is_active', true)
            ->with('children')
            ->whereNull('parent_id')
            ->orderBy('sort_order')
            ->get();

        return response()->json(['data' => $categories]);
    }

    public function show(string $slug): JsonResponse
    {
        $category = Category::where('slug', $slug)
            ->where('is_active', true)
            ->with('children', 'products.primaryImage')
            ->firstOrFail();

        return response()->json($category);
    }
}
```

- [x] **Step 3: Commit**

```bash
git add .
git commit -m "feat: add WishlistController and CategoryController"
```

---

### Task 10.4: Admin Controllers

- [x] **Step 1: Create Admin DashboardController**

Create file: `backend/app/Http/Controllers/Admin/DashboardController.php`

> **🔒 Authorization:** Access restricted by `role:admin` route middleware (Module 3).

```php
<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use Illuminate\Http\JsonResponse;

class DashboardController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json([
            'total_users' => User::count(),
            'total_products' => Product::where('status', 'active')->count(),
            'total_orders' => Order::count(),
            'revenue' => Order::where('payment_status', 'paid')->sum('total'),
            'pending_orders' => Order::where('status', 'pending')->count(),
            'low_stock_products' => Product::whereColumn('stock_quantity', '<=', 'low_stock_threshold')
                ->where('status', 'active')
                ->count(),
        ]);
    }
}
```

- [x] **Step 2: Create Admin UserController**

Create file: `backend/app/Http/Controllers/Admin/UserController.php`

> **🔒 Authorization:** Admin-only. Uses Eloquent — no SQL injection risk.

```php
<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class UserController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = User::with('roles');

        if ($request->has('role')) {
            $query->whereHas('roles', fn ($q) => $q->where('name', $request->input('role')));
        }

        if ($request->has('search')) {
            $search = $request->input('search');
            // 🔒 Using Eloquent where with parameter binding — safe from SQL injection
            $query->where(function ($q) use ($search) {
                $q->where('first_name', 'ILIKE', "%{$search}%")
                  ->orWhere('last_name', 'ILIKE', "%{$search}%")
                  ->orWhere('email', 'ILIKE', "%{$search}%");
            });
        }

        return response()->json($query->orderByDesc('created_at')->paginate(20));
    }

    public function show(User $user): JsonResponse
    {
        return response()->json($user->load('roles', 'orders'));
    }

    public function update(Request $request, User $user): JsonResponse
    {
        $request->validate([
            'first_name' => ['sometimes', 'string', 'max:255'],
            'last_name' => ['sometimes', 'string', 'max:255'],
            'role' => ['sometimes', 'string', 'in:user,business,admin'],
        ]);

        if ($request->has('role')) {
            $user->syncRoles([$request->input('role')]);
        }

        $user->update($request->except('role'));
        return response()->json($user->fresh()->load('roles'));
    }

    public function destroy(User $user): JsonResponse
    {
        // 🔒 Prevent admin from deleting themselves
        if ($user->id === auth()->id()) {
            return response()->json(['error' => 'Cannot delete your own account'], 422);
        }

        $user->delete(); // soft delete
        return response()->json(['message' => 'User deleted']);
    }
}
```

- [x] **Step 3: Create Admin InventoryController**

Create file: `backend/app/Http/Controllers/Admin/InventoryController.php`

```php
<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class InventoryController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Product::with('category', 'business');

        if ($request->boolean('low_stock')) {
            $query->whereColumn('stock_quantity', '<=', 'low_stock_threshold');
        }

        return response()->json(
            $query->orderBy('stock_quantity', 'asc')->paginate(20)
        );
    }

    public function update(Request $request, Product $product): JsonResponse
    {
        $request->validate([
            'stock_quantity' => ['required', 'integer', 'min:0', 'max:999999'],
            'low_stock_threshold' => ['sometimes', 'integer', 'min:0', 'max:999999'],
        ]);

        $product->update($request->validated());

        return response()->json($product->fresh());
    }
}
```

- [x] **Step 4: Create remaining API Resources**

Create file: `backend/app/Http/Resources/UserResource.php`

```php
<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'first_name' => $this->first_name,
            'last_name' => $this->last_name,
            'full_name' => $this->full_name,
            'email' => $this->email,
            'phone' => $this->phone,
            'avatar_url' => $this->avatar_url,
            'roles' => $this->whenLoaded('roles'),
            'created_at' => $this->created_at,
        ];
    }
}
```

Create file: `backend/app/Http/Resources/OrderResource.php`

```php
<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class OrderResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'order_number' => $this->order_number,
            'status' => $this->status,
            'subtotal' => (float) $this->subtotal,
            'shipping_fee' => (float) $this->shipping_fee,
            'tax' => (float) $this->tax,
            'total' => (float) $this->total,
            'payment_method' => $this->payment_method,
            'payment_status' => $this->payment_status,
            'shipping_address' => $this->shipping_address,
            'items' => $this->whenLoaded('items'),
            'user' => $this->whenLoaded('user'),
            'created_at' => $this->created_at,
            'paid_at' => $this->paid_at,
            'shipped_at' => $this->shipped_at,
            'delivered_at' => $this->delivered_at,
        ];
    }
}
```

Create file: `backend/app/Http/Resources/CategoryResource.php`

```php
<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CategoryResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'slug' => $this->slug,
            'description' => $this->description,
            'image_url' => $this->image_url,
            'children' => $this->whenLoaded('children'),
            'products_count' => $this->whenCounted('products'),
        ];
    }
}
```

- [x] **Step 5: Commit**

```bash
git add .
git commit -m "feat: add admin controllers, API resources, and remaining controllers"
```
