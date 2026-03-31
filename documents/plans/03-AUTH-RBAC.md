# Module 3: Authentication & RBAC (Security-Hardened)

> **For agentic workers:** REQUIRED: Implement this plan task-by-task.
> Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Set up Laravel Sanctum SPA authentication with Spatie RBAC,
including rate limiting, input validation, and secure role assignment.

**Architecture:** Cookie-based SPA auth via Sanctum. Spatie laravel-permission
for role/permission management. Three roles: user, business, admin.

**Tech Stack:** Laravel Sanctum, Spatie laravel-permission

---

## 🔒 Security Requirements for This Module

1. **Rate Limiting:** Login and register endpoints must be rate-limited to prevent brute force
2. **Input Validation:** All auth inputs validated via Form Request classes
3. **Role Assignment Security:** Users can only self-assign 'user' or 'business' — NEVER 'admin'
4. **Password Policy:** Enforce Laravel's default password rules (min 8 chars, etc.)

---

## Files

- Create: `backend/database/seeders/RoleSeeder.php`
- Create: `backend/database/seeders/AdminSeeder.php`
- Create: `backend/database/seeders/CategorySeeder.php`
- Modify: `backend/database/seeders/DatabaseSeeder.php`
- Modify: `backend/bootstrap/app.php`
- Modify: `backend/config/cors.php`
- Modify: `backend/config/sanctum.php`
- Create: `backend/app/Http/Requests/LoginRequest.php`
- Create: `backend/app/Http/Requests/RegisterRequest.php`
- Create: `backend/app/Http/Controllers/Auth/RegisterController.php`
- Create: `backend/app/Http/Controllers/Auth/LoginController.php`
- Create: `backend/app/Http/Controllers/Auth/LogoutController.php`
- Create: `backend/routes/api.php`

---

### Task 3.1: RBAC Setup — Roles, Permissions, Seeders

- [ ] **Step 1: Create RoleSeeder**

Create file: `backend/database/seeders/RoleSeeder.php`

```php
<?php

namespace Database\Seeders;

use App\Enums\RoleEnum;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class RoleSeeder extends Seeder
{
    public function run(): void
    {
        // Reset cached roles and permissions
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        // Create permissions
        $permissions = [
            // Product permissions
            'view products', 'create products', 'edit products', 'delete products',
            // Order permissions
            'view orders', 'manage orders', 'view own orders',
            // User permissions
            'view users', 'manage users',
            // Inventory permissions
            'manage inventory',
            // Dashboard permissions
            'view admin dashboard', 'view business dashboard',
        ];

        foreach ($permissions as $permission) {
            Permission::create(['name' => $permission]);
        }

        // Create roles and assign permissions
        $userRole = Role::create(['name' => RoleEnum::USER->value]);
        $userRole->givePermissionTo([
            'view products', 'view own orders',
        ]);

        $businessRole = Role::create(['name' => RoleEnum::BUSINESS->value]);
        $businessRole->givePermissionTo([
            'view products', 'create products', 'edit products', 'delete products',
            'view orders', 'manage orders', 'manage inventory',
            'view business dashboard',
        ]);

        $adminRole = Role::create(['name' => RoleEnum::ADMIN->value]);
        $adminRole->givePermissionTo(Permission::all());
    }
}
```

- [ ] **Step 2: Create AdminSeeder**

Create file: `backend/database/seeders/AdminSeeder.php`

> **🔒 SECURITY:** Change the default admin password before deploying to production.
> Consider using `env('ADMIN_DEFAULT_PASSWORD', 'change-me-immediately')`.

```php
<?php

namespace Database\Seeders;

use App\Enums\RoleEnum;
use App\Models\User;
use Illuminate\Database\Seeder;

class AdminSeeder extends Seeder
{
    public function run(): void
    {
        $admin = User::create([
            'first_name' => 'Sari',
            'last_name' => 'Admin',
            'email' => 'admin@sari.ph',
            'password' => bcrypt(env('ADMIN_DEFAULT_PASSWORD', 'password')),
            'email_verified_at' => now(),
        ]);

        $admin->assignRole(RoleEnum::ADMIN->value);
    }
}
```

- [ ] **Step 3: Create CategorySeeder**

Create file: `backend/database/seeders/CategorySeeder.php`

```php
<?php

namespace Database\Seeders;

use App\Models\Category;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class CategorySeeder extends Seeder
{
    public function run(): void
    {
        $categories = [
            ['name' => 'T-Shirts', 'slug' => 't-shirts', 'description' => 'Casual and graphic tees'],
            ['name' => 'Jeans', 'slug' => 'jeans', 'description' => 'Denim jeans and pants'],
            ['name' => 'Dresses', 'slug' => 'dresses', 'description' => 'Casual and formal dresses'],
            ['name' => 'Jackets', 'slug' => 'jackets', 'description' => 'Outerwear and jackets'],
            ['name' => 'Men', 'slug' => 'men', 'description' => 'Men\'s fashion'],
            ['name' => 'Women', 'slug' => 'women', 'description' => 'Women\'s fashion'],
        ];

        foreach ($categories as $category) {
            Category::create($category);
        }
    }
}
```

- [ ] **Step 4: Update DatabaseSeeder**

File: `backend/database/seeders/DatabaseSeeder.php`

```php
<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            RoleSeeder::class,
            AdminSeeder::class,
            CategorySeeder::class,
        ]);
    }
}
```

- [ ] **Step 5: Run seeders**

```bash
php artisan db:seed
```
Expected: Roles (user, business, admin), permissions, admin user, and categories created.

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "feat: add RBAC with Spatie — roles, permissions, seeders"
```

---

### Task 3.2: Middleware, CORS, and Rate Limiting Configuration

- [ ] **Step 1: Register Spatie middleware aliases and rate limiters**

File: `backend/bootstrap/app.php` — update the `withMiddleware` callback:

> **🔒 SECURITY — Rate Limiting:** This is the critical step that prevents
> brute-force login attempts and API abuse. Every public endpoint gets a rate limit.

```php
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;

->withMiddleware(function (Middleware $middleware) {
    $middleware->alias([
        'role' => \Spatie\Permission\Middleware\RoleMiddleware::class,
        'permission' => \Spatie\Permission\Middleware\PermissionMiddleware::class,
        'role_or_permission' => \Spatie\Permission\Middleware\RoleOrPermissionMiddleware::class,
    ]);

    $middleware->statefulApi();

    // Exclude webhook routes from CSRF verification
    $middleware->validateCsrfTokens(except: [
        'api/webhooks/*',
    ]);
})

->withProviders()

->booted(function () {
    // 🔒 Rate limit: Auth endpoints (login/register) — 5 per minute per IP
    RateLimiter::for('auth', function (Request $request) {
        return Limit::perMinute(5)->by($request->ip());
    });

    // 🔒 Rate limit: Public API — 60 per minute per IP
    RateLimiter::for('public-api', function (Request $request) {
        return Limit::perMinute(60)->by($request->ip());
    });

    // 🔒 Rate limit: Search — 30 per minute per IP
    RateLimiter::for('search', function (Request $request) {
        return Limit::perMinute(30)->by($request->ip());
    });

    // 🔒 Rate limit: Authenticated API — 120 per minute per user
    RateLimiter::for('authenticated', function (Request $request) {
        return Limit::perMinute(120)->by($request->user()?->id ?: $request->ip());
    });
})
```

- [ ] **Step 2: Update config/cors.php**

```php
return [
    'paths' => ['api/*', 'sanctum/csrf-cookie'],
    'allowed_methods' => ['*'],
    'allowed_origins' => [env('FRONTEND_URL', 'http://localhost:3000')],
    'allowed_origins_patterns' => [],
    'allowed_headers' => ['*'],
    'exposed_headers' => [],
    'max_age' => 0,
    'supports_credentials' => true,
];
```

> **🔒 SECURITY:** `allowed_origins` is restricted to the frontend URL only.
> Do NOT use `['*']` in production — this would allow any origin to make
> authenticated requests.

- [ ] **Step 3: Update config/sanctum.php stateful domains**

```php
'stateful' => explode(',', env(
    'SANCTUM_STATEFUL_DOMAINS',
    'localhost:3000,127.0.0.1:3000'
)),
```

- [ ] **Step 4: Commit**

```bash
git add .
git commit -m "feat: add middleware aliases, CORS, and rate limiters"
```

---

### Task 3.3: Auth Controllers with Input Validation

- [ ] **Step 1: Create LoginRequest Form Request**

Create file: `backend/app/Http/Requests/LoginRequest.php`

> **🔒 SECURITY — Input Validation:** Form Request classes validate ALL inputs
> before they reach the controller. This prevents malformed data from ever
> touching business logic.

```php
<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class LoginRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // Public endpoint — anyone can attempt login
    }

    public function rules(): array
    {
        return [
            'email' => ['required', 'string', 'email', 'max:255'],
            'password' => ['required', 'string', 'min:1'],
        ];
    }
}
```

- [ ] **Step 2: Create RegisterRequest Form Request**

Create file: `backend/app/Http/Requests/RegisterRequest.php`

> **🔒 SECURITY — Role Assignment:** The `role` field is validated with `in:user,business`.
> Users can NEVER self-assign the `admin` role through registration.
> Admin accounts are created only via seeders or by existing admins.

```php
<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules;

class RegisterRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'first_name' => ['required', 'string', 'max:255'],
            'last_name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users'],
            'password' => ['required', 'confirmed', Rules\Password::defaults()],
            // 🔒 SECURITY: Only 'user' and 'business' are allowed.
            // 'admin' role can NEVER be self-assigned.
            'role' => ['sometimes', 'string', 'in:user,business'],
        ];
    }
}
```

- [ ] **Step 3: Create RegisterController**

File: `backend/app/Http/Controllers/Auth/RegisterController.php`

```php
<?php

namespace App\Http\Controllers\Auth;

use App\Enums\RoleEnum;
use App\Http\Controllers\Controller;
use App\Http\Requests\RegisterRequest;
use App\Models\User;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Hash;

class RegisterController extends Controller
{
    public function __invoke(RegisterRequest $request): JsonResponse
    {
        // 🔒 SECURITY: Uses $request->validated() — only validated fields are used.
        // This prevents mass-assignment of unexpected fields.
        $validated = $request->validated();

        $user = User::create([
            'first_name' => $validated['first_name'],
            'last_name' => $validated['last_name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
        ]);

        // 🔒 SECURITY: Role is validated above to only allow 'user' or 'business'.
        // Default to 'user' if not provided.
        $role = $validated['role'] ?? RoleEnum::USER->value;
        $user->assignRole($role);

        event(new Registered($user));

        return response()->json([
            'message' => 'Registration successful.',
            'user' => $user->load('roles'),
        ], 201);
    }
}
```

- [ ] **Step 4: Create LoginController**

File: `backend/app/Http/Controllers/Auth/LoginController.php`

```php
<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\LoginRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;

class LoginController extends Controller
{
    public function __invoke(LoginRequest $request): JsonResponse
    {
        // 🔒 Uses validated input only
        $credentials = $request->validated();

        if (! Auth::attempt($credentials)) {
            // 🔒 SECURITY: Generic error message prevents user enumeration.
            // Do NOT say "user not found" vs "wrong password" separately.
            return response()->json([
                'message' => 'The provided credentials are incorrect.',
            ], 401);
        }

        $request->session()->regenerate();

        return response()->json([
            'message' => 'Login successful.',
            'user' => Auth::user()->load('roles'),
        ]);
    }
}
```

- [ ] **Step 5: Create LogoutController**

File: `backend/app/Http/Controllers/Auth/LogoutController.php`

```php
<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class LogoutController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        Auth::guard('web')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->json(['message' => 'Logged out successfully.']);
    }
}
```

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "feat: add auth controllers with Form Request validation"
```

---

### Task 3.4: API Routes with Rate Limiting and Authorization

- [ ] **Step 1: Create the complete API route file**

File: `backend/routes/api.php`

> **🔒 SECURITY — This is the route map with security enforced at every level:**
> - Public routes: `throttle:public-api` rate limit
> - Auth routes: `throttle:auth` rate limit (strictest)
> - Search: `throttle:search` rate limit
> - Authenticated routes: `auth:sanctum` + `throttle:authenticated`
> - Business routes: `role:business|admin` middleware
> - Admin routes: `role:admin` middleware
> - Webhook: no auth, but verified by PayMongo signature in controller

```php
<?php

use App\Http\Controllers\Auth\LoginController;
use App\Http\Controllers\Auth\LogoutController;
use App\Http\Controllers\Auth\RegisterController;
use App\Http\Controllers\CartController;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\CheckoutController;
use App\Http\Controllers\OrderController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\RecommendationController;
use App\Http\Controllers\SearchController;
use App\Http\Controllers\WebhookController;
use App\Http\Controllers\WishlistController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

// ========================================================================
// 🔒 PUBLIC ROUTES — Rate limited, no auth required
// ========================================================================
Route::middleware('throttle:public-api')->group(function () {
    Route::get('/products', [ProductController::class, 'index']);
    Route::get('/products/{slug}', [ProductController::class, 'show']);
    Route::get('/categories', [CategoryController::class, 'index']);
    Route::get('/categories/{slug}', [CategoryController::class, 'show']);
    Route::get('/recommendations/popular', [RecommendationController::class, 'popular']);
});

// 🔒 AUTH ROUTES — Strictest rate limit (5/min per IP)
Route::middleware('throttle:auth')->group(function () {
    Route::post('/register', RegisterController::class);
    Route::post('/login', LoginController::class);
});

// 🔒 SEARCH — Separate rate limit (30/min per IP)
Route::middleware('throttle:search')->group(function () {
    Route::get('/search', [SearchController::class, 'search']);
});

// PayMongo webhook — no auth, verified by signature in controller
Route::post('/webhooks/paymongo', [WebhookController::class, 'handlePaymongo']);

// ========================================================================
// 🔒 AUTHENTICATED ROUTES — Requires valid session + rate limited
// ========================================================================
Route::middleware(['auth:sanctum', 'throttle:authenticated'])->group(function () {
    Route::post('/logout', LogoutController::class);
    Route::get('/user', fn (Request $request) => $request->user()->load('roles'));

    // Cart (Redis-backed)
    Route::get('/cart', [CartController::class, 'index']);
    Route::post('/cart', [CartController::class, 'store']);
    Route::put('/cart/{productId}', [CartController::class, 'update']);
    Route::delete('/cart/{productId}', [CartController::class, 'destroy']);
    Route::delete('/cart', [CartController::class, 'clear']);

    // Wishlist
    Route::get('/wishlist', [WishlistController::class, 'index']);
    Route::post('/wishlist/{product}', [WishlistController::class, 'toggle']);

    // Checkout & Orders
    Route::post('/checkout', [CheckoutController::class, 'createSession']);
    Route::get('/orders', [OrderController::class, 'index']);
    Route::get('/orders/{order}', [OrderController::class, 'show']);

    // Personalized recommendations
    Route::get('/recommendations/for-you', [RecommendationController::class, 'forUser']);
    Route::get('/recommendations/similar/{product}', [RecommendationController::class, 'similarTo']);

    // ====================================================================
    // 🔒 BUSINESS ROUTES — Requires 'business' or 'admin' role
    // Backend middleware enforces this — hiding buttons in frontend is NOT security.
    // ====================================================================
    Route::middleware('role:business|admin')->prefix('business')->group(function () {
        Route::get('/products', [ProductController::class, 'myProducts']);
        Route::post('/products', [ProductController::class, 'store']);
        Route::put('/products/{product}', [ProductController::class, 'update']);
        Route::delete('/products/{product}', [ProductController::class, 'destroy']);
        Route::get('/orders', [OrderController::class, 'businessOrders']);
        Route::put('/orders/{order}/status', [OrderController::class, 'updateStatus']);
    });

    // ====================================================================
    // 🔒 ADMIN ROUTES — Requires 'admin' role only
    // Backend middleware enforces this — hiding buttons in frontend is NOT security.
    // ====================================================================
    Route::middleware('role:admin')->prefix('admin')->group(function () {
        Route::get('/dashboard', [App\Http\Controllers\Admin\DashboardController::class, 'index']);
        Route::apiResource('/users', App\Http\Controllers\Admin\UserController::class);
        Route::get('/inventory', [App\Http\Controllers\Admin\InventoryController::class, 'index']);
        Route::put('/inventory/{product}', [App\Http\Controllers\Admin\InventoryController::class, 'update']);
    });
});
```

- [ ] **Step 2: Commit**

```bash
git add .
git commit -m "feat: add complete API route map with rate limiting and role guards"
```
