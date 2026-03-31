# Module 4: Security Middleware & Authorization Policies

> **For agentic workers:** REQUIRED: Implement this plan task-by-task.
> Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create Laravel Policies and Form Request classes that enforce
authorization (IDOR prevention) and input validation across all resources.
This module is the backbone of the security layer.

**Architecture:** Laravel Policies for resource-level authorization,
Form Request classes for input validation on every mutation endpoint.

**Tech Stack:** Laravel 12

---

## 🔒 This Module Addresses These Vulnerabilities

### IDOR (Insecure Direct Object Reference)
- **Problem:** Endpoints like `/api/orders/5` let any logged-in user access any order by changing the ID.
- **Solution:** Laravel Policies verify the logged-in user **owns** the resource before allowing access.
- **Rule:** NEVER use `Model::findOrFail($id)` alone — always scope to the user or use a Policy.

### Missing Authorization on Protected Routes
- **Problem:** Relying on frontend to hide admin buttons is NOT security — anyone can call the API directly.
- **Solution:** Backend Policies enforce permissions. Middleware enforces role requirements.

### Input Validation
- **Problem:** Unvalidated inputs can cause data corruption, injection, or application errors.
- **Solution:** Form Request classes validate every input field with type, length, and format rules.

---

## Files

- Create: `backend/app/Policies/ProductPolicy.php`
- Create: `backend/app/Policies/OrderPolicy.php`
- Create: `backend/app/Http/Requests/StoreProductRequest.php`
- Create: `backend/app/Http/Requests/UpdateProductRequest.php`
- Create: `backend/app/Http/Requests/StoreCartItemRequest.php`
- Create: `backend/app/Http/Requests/UpdateCartItemRequest.php`
- Create: `backend/app/Http/Requests/CheckoutRequest.php`
- Create: `backend/app/Http/Requests/SearchRequest.php`
- Create: `backend/tests/Feature/Security/IDORTest.php`
- Create: `backend/tests/Feature/Security/AuthorizationTest.php`
- Create: `backend/tests/Feature/Security/RateLimitTest.php`

---

### Task 4.1: Authorization Policies (IDOR Prevention)

- [ ] **Step 1: Create ProductPolicy**

Create file: `backend/app/Policies/ProductPolicy.php`

> **🔒 IDOR Prevention:** Every product mutation checks that the logged-in user
> is the business owner of that product, OR is an admin.
> Without this, any authenticated user could edit/delete any product by guessing IDs.

```php
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
     * 🔒 IDOR CHECK: Only the product's business owner or an admin can update.
     * This prevents User A from editing User B's products.
     */
    public function update(User $user, Product $product): bool
    {
        return $this->isOwnerOrAdmin($user, $product);
    }

    /**
     * 🔒 IDOR CHECK: Only the product's business owner or an admin can delete.
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
```

- [ ] **Step 2: Create OrderPolicy**

Create file: `backend/app/Policies/OrderPolicy.php`

> **🔒 IDOR Prevention:** Users can only view their OWN orders.
> Business users can view orders containing their products.
> Admins can view all orders.

```php
<?php

namespace App\Policies;

use App\Models\Order;
use App\Models\User;

class OrderPolicy
{
    /**
     * 🔒 IDOR CHECK: Users can only view their own orders.
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
     * 🔒 Only the order owner can cancel (if status allows).
     */
    public function cancel(User $user, Order $order): bool
    {
        return $order->user_id === $user->id && $order->status === 'pending';
    }

    /**
     * 🔒 Only business users (whose products are in the order) or admins
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
```

- [ ] **Step 3: Register policies in AuthServiceProvider or auto-discovery**

Laravel 12 uses auto-discovery by convention (Policy class name matches
Model name + "Policy"). Verify auto-discovery works by checking that
`App\Policies\ProductPolicy` maps to `App\Models\Product`.

If auto-discovery doesn't work, register manually in `AppServiceProvider`:

```php
use Illuminate\Support\Facades\Gate;

public function boot(): void
{
    Gate::policy(\App\Models\Product::class, \App\Policies\ProductPolicy::class);
    Gate::policy(\App\Models\Order::class, \App\Policies\OrderPolicy::class);
}
```

- [ ] **Step 4: Commit**

```bash
git add .
git commit -m "feat: add ProductPolicy and OrderPolicy for IDOR prevention"
```

---

### Task 4.2: Form Request Validation Classes

- [ ] **Step 1: Create StoreProductRequest**

Create file: `backend/app/Http/Requests/StoreProductRequest.php`

> **🔒 Input Validation:** Validates every field type, length, format, and relationship.
> File uploads are restricted by MIME type and max size.

```php
<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreProductRequest extends FormRequest
{
    public function authorize(): bool
    {
        // 🔒 Only business and admin users can create products
        return $this->user()->hasRole(['business', 'admin']);
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:10000'],
            'short_description' => ['nullable', 'string', 'max:500'],
            'category_id' => ['required', 'integer', 'exists:categories,id'],
            'base_price' => ['required', 'numeric', 'min:0', 'max:99999999.99'],
            'compare_at_price' => ['nullable', 'numeric', 'min:0', 'max:99999999.99'],
            'sku' => ['required', 'string', 'max:100', 'unique:products,sku'],
            'stock_quantity' => ['required', 'integer', 'min:0', 'max:999999'],
            'low_stock_threshold' => ['nullable', 'integer', 'min:0', 'max:999999'],
            'brand' => ['nullable', 'string', 'max:255'],
            'weight' => ['nullable', 'numeric', 'min:0', 'max:99999.99'],
            'attributes' => ['nullable', 'array'],
            'attributes.*' => ['string', 'max:255'],
            'images' => ['nullable', 'array', 'max:10'],
            'images.*' => ['image', 'mimes:jpg,jpeg,png,webp', 'max:5120'], // 5MB max per image
        ];
    }
}
```

- [ ] **Step 2: Create UpdateProductRequest**

Create file: `backend/app/Http/Requests/UpdateProductRequest.php`

```php
<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateProductRequest extends FormRequest
{
    public function authorize(): bool
    {
        // 🔒 IDOR: Uses the ProductPolicy to verify ownership
        return $this->user()->can('update', $this->route('product'));
    }

    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:10000'],
            'short_description' => ['nullable', 'string', 'max:500'],
            'category_id' => ['sometimes', 'integer', 'exists:categories,id'],
            'base_price' => ['sometimes', 'numeric', 'min:0', 'max:99999999.99'],
            'compare_at_price' => ['nullable', 'numeric', 'min:0', 'max:99999999.99'],
            'stock_quantity' => ['sometimes', 'integer', 'min:0', 'max:999999'],
            'status' => ['sometimes', 'string', 'in:draft,active,archived'],
            'brand' => ['nullable', 'string', 'max:255'],
            'weight' => ['nullable', 'numeric', 'min:0', 'max:99999.99'],
        ];
    }
}
```

- [ ] **Step 3: Create StoreCartItemRequest**

Create file: `backend/app/Http/Requests/StoreCartItemRequest.php`

```php
<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreCartItemRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // Authenticated users only (enforced by route middleware)
    }

    public function rules(): array
    {
        return [
            'product_id' => ['required', 'integer', 'exists:products,id'],
            'quantity' => ['required', 'integer', 'min:1', 'max:100'],
            'variant_id' => ['nullable', 'integer', 'exists:product_variants,id'],
        ];
    }
}
```

- [ ] **Step 4: Create UpdateCartItemRequest**

Create file: `backend/app/Http/Requests/UpdateCartItemRequest.php`

```php
<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateCartItemRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'quantity' => ['required', 'integer', 'min:0', 'max:100'],
        ];
    }
}
```

- [ ] **Step 5: Create CheckoutRequest**

Create file: `backend/app/Http/Requests/CheckoutRequest.php`

```php
<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class CheckoutRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'shipping_address' => ['required', 'array'],
            'shipping_address.line1' => ['required', 'string', 'max:255'],
            'shipping_address.line2' => ['nullable', 'string', 'max:255'],
            'shipping_address.city' => ['required', 'string', 'max:100'],
            'shipping_address.state' => ['required', 'string', 'max:100'],
            'shipping_address.postal_code' => ['required', 'string', 'max:20'],
            'shipping_address.country' => ['required', 'string', 'max:100'],
            'billing_address' => ['nullable', 'array'],
            'billing_address.line1' => ['required_with:billing_address', 'string', 'max:255'],
            'billing_address.city' => ['required_with:billing_address', 'string', 'max:100'],
            'billing_address.state' => ['required_with:billing_address', 'string', 'max:100'],
            'billing_address.postal_code' => ['required_with:billing_address', 'string', 'max:20'],
            'billing_address.country' => ['required_with:billing_address', 'string', 'max:100'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ];
    }
}
```

- [ ] **Step 6: Create SearchRequest**

Create file: `backend/app/Http/Requests/SearchRequest.php`

```php
<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class SearchRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // Public endpoint
    }

    public function rules(): array
    {
        return [
            'q' => ['required', 'string', 'min:1', 'max:255'],
            'category' => ['nullable', 'string', 'max:100'],
            'min_price' => ['nullable', 'numeric', 'min:0'],
            'max_price' => ['nullable', 'numeric', 'min:0'],
            'sort' => ['nullable', 'string', 'in:relevance,price_asc,price_desc,newest'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ];
    }
}
```

- [ ] **Step 7: Commit**

```bash
git add .
git commit -m "feat: add Form Request validation for all mutation endpoints"
```

---

### Task 4.3: Security Tests

- [ ] **Step 1: Create IDOR prevention test**

Create file: `backend/tests/Feature/Security/IDORTest.php`

> **🔒 These tests verify that users CANNOT access resources they don't own.**

```php
<?php

namespace Tests\Feature\Security;

use App\Enums\RoleEnum;
use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class IDORTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(\Database\Seeders\RoleSeeder::class);
    }

    /** @test */
    public function user_cannot_view_another_users_order(): void
    {
        $userA = User::factory()->create();
        $userA->assignRole(RoleEnum::USER->value);

        $userB = User::factory()->create();
        $userB->assignRole(RoleEnum::USER->value);

        $order = Order::factory()->create(['user_id' => $userB->id]);

        // 🔒 User A tries to access User B's order — must be denied
        $response = $this->actingAs($userA)->getJson("/api/orders/{$order->id}");
        $response->assertForbidden();
    }

    /** @test */
    public function business_user_cannot_edit_another_business_product(): void
    {
        $businessA = User::factory()->create();
        $businessA->assignRole(RoleEnum::BUSINESS->value);

        $businessB = User::factory()->create();
        $businessB->assignRole(RoleEnum::BUSINESS->value);

        $product = Product::factory()->create(['business_id' => $businessB->id]);

        // 🔒 Business A tries to edit Business B's product — must be denied
        $response = $this->actingAs($businessA)
            ->putJson("/api/business/products/{$product->id}", ['name' => 'Hacked']);
        $response->assertForbidden();
    }

    /** @test */
    public function admin_can_view_any_order(): void
    {
        $admin = User::factory()->create();
        $admin->assignRole(RoleEnum::ADMIN->value);

        $user = User::factory()->create();
        $order = Order::factory()->create(['user_id' => $user->id]);

        // Admin can access any order
        $response = $this->actingAs($admin)->getJson("/api/orders/{$order->id}");
        $response->assertOk();
    }
}
```

- [ ] **Step 2: Create authorization test**

Create file: `backend/tests/Feature/Security/AuthorizationTest.php`

```php
<?php

namespace Tests\Feature\Security;

use App\Enums\RoleEnum;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthorizationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(\Database\Seeders\RoleSeeder::class);
    }

    /** @test */
    public function regular_user_cannot_access_admin_routes(): void
    {
        $user = User::factory()->create();
        $user->assignRole(RoleEnum::USER->value);

        // 🔒 Regular user tries to access admin dashboard — must be denied
        $response = $this->actingAs($user)->getJson('/api/admin/dashboard');
        $response->assertForbidden();
    }

    /** @test */
    public function regular_user_cannot_access_business_routes(): void
    {
        $user = User::factory()->create();
        $user->assignRole(RoleEnum::USER->value);

        // 🔒 Regular user tries to create a product — must be denied
        $response = $this->actingAs($user)->postJson('/api/business/products', [
            'name' => 'Test Product',
        ]);
        $response->assertForbidden();
    }

    /** @test */
    public function unauthenticated_user_cannot_access_protected_routes(): void
    {
        // 🔒 No auth token — must be denied
        $response = $this->getJson('/api/user');
        $response->assertUnauthorized();

        $response = $this->getJson('/api/cart');
        $response->assertUnauthorized();

        $response = $this->getJson('/api/orders');
        $response->assertUnauthorized();
    }

    /** @test */
    public function user_cannot_self_assign_admin_role(): void
    {
        // 🔒 Attempt to register with admin role — should be rejected
        $response = $this->postJson('/api/register', [
            'first_name' => 'Evil',
            'last_name' => 'Hacker',
            'email' => 'hacker@evil.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'role' => 'admin',
        ]);

        $response->assertUnprocessable(); // Validation error: role not in [user, business]
    }
}
```

- [ ] **Step 3: Create rate limit test**

Create file: `backend/tests/Feature/Security/RateLimitTest.php`

```php
<?php

namespace Tests\Feature\Security;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RateLimitTest extends TestCase
{
    use RefreshDatabase;

    /** @test */
    public function login_endpoint_is_rate_limited(): void
    {
        // 🔒 Send 6 login attempts (limit is 5/min) — 6th should be throttled
        for ($i = 0; $i < 5; $i++) {
            $this->postJson('/api/login', [
                'email' => 'test@test.com',
                'password' => 'wrong',
            ]);
        }

        $response = $this->postJson('/api/login', [
            'email' => 'test@test.com',
            'password' => 'wrong',
        ]);

        $response->assertStatus(429); // Too Many Requests
    }
}
```

- [ ] **Step 4: Run all security tests**

```bash
cd backend
php artisan test --filter=Security
```
Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "feat: add security tests for IDOR, authorization, and rate limiting"
```
