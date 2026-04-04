# Missing Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **CRITICAL INSTRUCTION:** Every design-related component in this plan MUST be built using the `frontend-design` plugin for high design quality matching the existing SARI warm orange/amber theme. Reference the screenshots provided in the original task context.

**Goal:** Complete all missing frontend pages (5 admin sub-pages + 2 customer pages) with real API integration, plus add the 2 missing backend endpoints needed to support them.

**Architecture:** Two groups delivered full-stack. Group 1 adds admin products/orders backend endpoints, then builds all 5 admin pages wired to real APIs. Group 2 adds a profile update endpoint, then builds customer profile and orders pages. All pages use existing layout components (admin sidebar, Navbar) and existing API utilities (`api.ts`, `useAuth`).

**Tech Stack:** Laravel 12 (PHP), Next.js 15 (TypeScript), Tailwind CSS v4, Axios, Lucide React icons

---

## File Structure

### Backend (new files)

| File | Responsibility |
|------|---------------|
| `backend/app/Http/Controllers/Admin/ProductController.php` | Admin CRUD for all products (list, show, update status, feature/unfeature, delete) |
| `backend/app/Http/Controllers/Admin/OrderController.php` | Admin order management (list all, show detail, update status) |
| `backend/app/Http/Controllers/ProfileController.php` | Authenticated user profile update (name, phone, default_address) |
| `backend/app/Http/Requests/UpdateProfileRequest.php` | Validation for profile update |

### Frontend (new files)

| File | Responsibility |
|------|---------------|
| `frontend/src/app/admin/products/page.tsx` | Admin products management table |
| `frontend/src/app/admin/inventory/page.tsx` | Admin inventory management with stock levels |
| `frontend/src/app/admin/orders/page.tsx` | Admin orders management table |
| `frontend/src/app/admin/users/page.tsx` | Admin users management table |
| `frontend/src/app/admin/analytics/page.tsx` | Admin analytics dashboard |
| `frontend/src/app/profile/page.tsx` | Customer profile page |
| `frontend/src/app/orders/page.tsx` | Customer order history |

### Frontend (modified files)

| File | Change |
|------|--------|
| `frontend/src/app/admin/page.tsx` | Replace mock data with real API calls to `GET /api/admin/dashboard` |
| `frontend/src/hooks/useAuth.ts` | Add `updateProfile()` method |

---

## GROUP 1: Admin Pages

---

### Task 1: Admin Products API Endpoint

**Files:**
- Create: `backend/app/Http/Controllers/Admin/ProductController.php`
- Modify: `backend/routes/api.php`

- [ ] **Step 1: Create the Admin ProductController**

Create `backend/app/Http/Controllers/Admin/ProductController.php`:

```php
<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\ProductResource;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProductController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Product::with(['category', 'primaryImage', 'business'])
            ->when($request->search, fn ($q, $search) =>
                $q->where('name', 'ilike', "%{$search}%")
                  ->orWhere('sku', 'ilike', "%{$search}%")
            )
            ->when($request->status, fn ($q, $status) =>
                $q->where('status', $status)
            )
            ->when($request->category_id, fn ($q, $catId) =>
                $q->where('category_id', $catId)
            )
            ->latest();

        return response()->json(
            ProductResource::collection($query->paginate($request->per_page ?? 20))
        );
    }

    public function update(Request $request, Product $product): JsonResponse
    {
        $validated = $request->validate([
            'status' => 'sometimes|in:draft,active,archived',
            'is_featured' => 'sometimes|boolean',
        ]);

        $product->update($validated);

        return response()->json([
            'message' => 'Product updated.',
            'product' => new ProductResource($product->load(['category', 'primaryImage'])),
        ]);
    }

    public function destroy(Product $product): JsonResponse
    {
        $product->delete();

        return response()->json(['message' => 'Product deleted.']);
    }
}
```

- [ ] **Step 2: Register routes in api.php**

Add inside the existing `Route::middleware('role:admin')->prefix('admin')` group in `backend/routes/api.php`:

```php
Route::get('/products', [App\Http\Controllers\Admin\ProductController::class, 'index']);
Route::put('/products/{product}', [App\Http\Controllers\Admin\ProductController::class, 'update']);
Route::delete('/products/{product}', [App\Http\Controllers\Admin\ProductController::class, 'destroy']);
```

- [ ] **Step 3: Verify endpoint works**

Run:
```bash
cd backend && php artisan route:list --path=api/admin
```
Expected: The new product routes appear alongside existing admin routes.

- [ ] **Step 4: Commit**

```bash
git add backend/app/Http/Controllers/Admin/ProductController.php backend/routes/api.php
git commit -m "feat(api): add admin products management endpoints"
```

---

### Task 2: Admin Orders API Endpoint

**Files:**
- Create: `backend/app/Http/Controllers/Admin/OrderController.php`
- Modify: `backend/routes/api.php`

- [ ] **Step 1: Create the Admin OrderController**

Create `backend/app/Http/Controllers/Admin/OrderController.php`:

```php
<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\OrderResource;
use App\Models\Order;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class OrderController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Order::with(['user', 'items'])
            ->when($request->search, fn ($q, $search) =>
                $q->where('order_number', 'ilike', "%{$search}%")
                  ->orWhereHas('user', fn ($uq) =>
                      $uq->where('first_name', 'ilike', "%{$search}%")
                         ->orWhere('last_name', 'ilike', "%{$search}%")
                         ->orWhere('email', 'ilike', "%{$search}%")
                  )
            )
            ->when($request->status, fn ($q, $status) =>
                $q->where('status', $status)
            )
            ->latest();

        return response()->json(
            OrderResource::collection($query->paginate($request->per_page ?? 20))
        );
    }

    public function show(Order $order): JsonResponse
    {
        return response()->json(
            new OrderResource($order->load(['user', 'items']))
        );
    }

    public function updateStatus(Request $request, Order $order): JsonResponse
    {
        $validated = $request->validate([
            'status' => 'required|in:pending,processing,paid,shipped,delivered,cancelled,refunded',
        ]);

        $order->update(['status' => $validated['status']]);

        if ($validated['status'] === 'shipped') {
            $order->update(['shipped_at' => now()]);
        } elseif ($validated['status'] === 'delivered') {
            $order->update(['delivered_at' => now()]);
        }

        return response()->json([
            'message' => 'Order status updated.',
            'order' => new OrderResource($order->load(['user', 'items'])),
        ]);
    }
}
```

- [ ] **Step 2: Register routes in api.php**

Add inside the existing `Route::middleware('role:admin')->prefix('admin')` group in `backend/routes/api.php`:

```php
Route::get('/orders', [App\Http\Controllers\Admin\OrderController::class, 'index']);
Route::get('/orders/{order}', [App\Http\Controllers\Admin\OrderController::class, 'show']);
Route::put('/orders/{order}/status', [App\Http\Controllers\Admin\OrderController::class, 'updateStatus']);
```

- [ ] **Step 3: Verify endpoint works**

Run:
```bash
cd backend && php artisan route:list --path=api/admin/orders
```
Expected: The 3 new order routes appear.

- [ ] **Step 4: Commit**

```bash
git add backend/app/Http/Controllers/Admin/OrderController.php backend/routes/api.php
git commit -m "feat(api): add admin orders management endpoints"
```

---

### Task 3: Admin Dashboard — Wire to Real API

**Files:**
- Modify: `frontend/src/app/admin/page.tsx`

- [ ] **Step 1: Replace mock data with API calls**

Rewrite `frontend/src/app/admin/page.tsx` to fetch data from `GET /api/admin/dashboard` on mount using the existing `api` axios instance from `@/lib/api`. The dashboard endpoint returns:

```json
{
  "total_users": number,
  "total_products": number,
  "total_orders": number,
  "revenue": number,
  "pending_orders": number,
  "low_stock_products": number
}
```

Also fetch `GET /api/admin/inventory?low_stock=true` for the low stock products list and `GET /api/orders` (or the new admin orders endpoint) for recent orders.

Keep the same visual design — the 4 metrics cards, low stock alert banner, recent orders table, and low stock products table. Replace hardcoded mock arrays with state populated from API responses. Add a loading skeleton while data loads. Remove the trend percentage displays (the API doesn't provide historical comparison data — show just the values).

Use `useAuth` to get the current user's name for the welcome message.

- [ ] **Step 2: Verify the page loads with real data**

Start the frontend dev server and navigate to `/admin`. Confirm the dashboard renders real data from the API.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/admin/page.tsx
git commit -m "feat(admin): wire dashboard to real API data"
```

---

### Task 4: Admin Products Page

**Files:**
- Create: `frontend/src/app/admin/products/page.tsx`

- [ ] **Step 1: Build the products management page using `frontend-design` plugin**

Use the `frontend-design` plugin to create `frontend/src/app/admin/products/page.tsx`. Reference the provided screenshot for exact layout.

**Page structure:**
- Header row: "Products Management" title (left) + orange "+ Add Product" button (right)
- Search bar below header with magnifying glass icon
- Data table with columns: PRODUCT (image thumbnail + name + subcategory), CATEGORY, PRICE, STOCK, RATING, ACTIONS (edit pencil icon + delete trash icon)
- Stock numbers should be color-coded: red/orange for low stock (<15), green for healthy stock

**API integration:**
- Fetch from `GET /api/admin/products` on mount using `api` from `@/lib/api`
- Search: debounced input sends `?search=` query param
- Delete: calls `DELETE /api/admin/products/{id}` with confirmation dialog
- Product images: use `product.primary_image?.url` with a fallback placeholder
- Price: use `formatPrice()` from `@/lib/utils`
- Rating: display as "X.X (N)" format using product data if available, otherwise show "N/A"

**Types used:** `Product` from `@/types/product`

- [ ] **Step 2: Verify the page renders**

Navigate to `/admin/products` and confirm the table shows real product data from the API.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/admin/products/page.tsx
git commit -m "feat(admin): add products management page with API integration"
```

---

### Task 5: Admin Inventory Page

**Files:**
- Create: `frontend/src/app/admin/inventory/page.tsx`

- [ ] **Step 1: Build the inventory management page using `frontend-design` plugin**

Use the `frontend-design` plugin to create `frontend/src/app/admin/inventory/page.tsx`. Reference the provided screenshot for exact layout.

**Page structure:**
- 3 summary cards at top: "Out of Stock" (red accent, count of products with stock=0), "Low Stock" (amber accent, count from low_stock filter), "In Stock" (green accent, remaining count)
- "Low Stock Alert" section with orange/amber heading icon, showing a table: PRODUCT (image + name), CATEGORY, CURRENT STOCK (as colored badge), ACTIONS (green "Restock" button)
- "In Stock" section below with green heading icon, same table columns
- Restock button opens a simple prompt/modal to enter new stock quantity, calls `PUT /api/admin/inventory/{productId}` with `{ stock_quantity: newValue }`

**API integration:**
- Fetch all inventory: `GET /api/admin/inventory` — returns all products with stock info
- Fetch low stock: `GET /api/admin/inventory?low_stock=true` — returns only low stock items
- Update stock: `PUT /api/admin/inventory/{product}` with `{ stock_quantity, low_stock_threshold }`
- Compute summary card counts client-side from the full inventory list (out_of_stock = stock === 0, low_stock = stock > 0 && stock <= low_stock_threshold, in_stock = rest)

**Types used:** `Product` from `@/types/product`

- [ ] **Step 2: Verify the page renders**

Navigate to `/admin/inventory` and confirm both sections display with real stock data.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/admin/inventory/page.tsx
git commit -m "feat(admin): add inventory management page with API integration"
```

---

### Task 6: Admin Orders Page

**Files:**
- Create: `frontend/src/app/admin/orders/page.tsx`

- [ ] **Step 1: Build the orders management page using `frontend-design` plugin**

Use the `frontend-design` plugin to create `frontend/src/app/admin/orders/page.tsx`. Reference the provided screenshot for exact layout.

**Page structure:**
- Header: "Orders Management" title
- Search bar (full width) + status filter dropdown (right side) with options: All, Pending, Processing, Paid, Shipped, Delivered, Cancelled
- Data table with columns: ORDER ID (monospace font), DATE (formatted), CUSTOMER (user full name), ITEMS (count), TOTAL (formatted price), STATUS (colored badge), ACTIONS (view button)
- Status badges use these colors: pending=gray, processing=blue, paid=emerald, shipped=sari/orange, delivered=green, cancelled=red
- Empty state: "No orders found" centered in the table body

**API integration:**
- Fetch from `GET /api/admin/orders` on mount using `api` from `@/lib/api`
- Search: debounced input sends `?search=` query param
- Status filter: sends `?status=` query param
- Date formatting: use `Intl.DateTimeFormat` with 'en-PH' locale
- Price: use `formatPrice()` from `@/lib/utils`
- Items count: `order.items?.length` or sum of item quantities

**Types used:** `Order` from `@/types/order`

- [ ] **Step 2: Verify the page renders**

Navigate to `/admin/orders` and confirm the table shows orders from the API.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/admin/orders/page.tsx
git commit -m "feat(admin): add orders management page with API integration"
```

---

### Task 7: Admin Users Page

**Files:**
- Create: `frontend/src/app/admin/users/page.tsx`

- [ ] **Step 1: Build the users management page using `frontend-design` plugin**

Use the `frontend-design` plugin to create `frontend/src/app/admin/users/page.tsx`. Reference the provided screenshot for exact layout.

**Page structure:**
- Header: "Users Management" title
- Search bar with magnifying glass icon
- Data table with columns: USER (avatar circle with initials + full name), EMAIL, ROLE (colored badge — Buyer=amber, Admin=orange, Business=blue), PHONE, JOINED (formatted date), ACTIONS (orange "View" text link)
- Avatar circle: use user initials (first letter of first_name + first letter of last_name), light yellow/sari background
- Role badges: map `user` role to "Buyer" display label, `business` to "Business", `admin` to "Admin"

**API integration:**
- Fetch from `GET /api/admin/users` on mount using `api` from `@/lib/api`
- Search: debounced input sends `?search=` query param
- Role data: `user.roles[0]?.name` to get the primary role
- Date formatting: use `Intl.DateTimeFormat` for joined date
- Phone: display `user.phone` directly, show "—" if null

**Types used:** `User` from `@/types/user`

- [ ] **Step 2: Verify the page renders**

Navigate to `/admin/users` and confirm the table shows real users.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/admin/users/page.tsx
git commit -m "feat(admin): add users management page with API integration"
```

---

### Task 8: Admin Analytics Page

**Files:**
- Create: `frontend/src/app/admin/analytics/page.tsx`

- [ ] **Step 1: Build the analytics page using `frontend-design` plugin**

Use the `frontend-design` plugin to create `frontend/src/app/admin/analytics/page.tsx`. Reference the provided screenshot for exact layout.

**Page structure:**
- Header: "Analytics & Reports" title
- 4 stat cards in a row: "Total Revenue" (dollar icon, green accent), "Avg Order Value" (trend icon, blue accent), "Total Orders" (cart icon, purple accent), "Total Customers" (users icon, orange accent)
  - Revenue: `formatPrice(dashboard.revenue)`
  - Avg Order Value: `formatPrice(dashboard.revenue / dashboard.total_orders)` (handle division by zero — show 0)
  - Total Orders: `dashboard.total_orders`
  - Total Customers: `dashboard.total_users`
- "Order Status" section: 4 colored sub-cards in a row — Completed (green bg), Pending (amber bg, use `dashboard.pending_orders`), Total (blue bg, use `dashboard.total_orders`), Cancelled (red bg, compute as `total_orders - pending_orders - paid_orders` or show 0 since no dedicated field)
  - Since the dashboard endpoint doesn't provide per-status breakdowns, use: Pending = `dashboard.pending_orders`, Total = `dashboard.total_orders`, Completed and Cancelled = show 0 with the label (data not yet available)
- "Top Selling Products" section: empty card with title (placeholder for future)
- "Revenue by Category" section: empty card with title (placeholder for future)

**API integration:**
- Fetch from `GET /api/admin/dashboard` on mount using `api` from `@/lib/api`
- All data comes from the single dashboard endpoint
- Add loading skeleton while fetching

- [ ] **Step 2: Verify the page renders**

Navigate to `/admin/analytics` and confirm the stats display real data.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/admin/analytics/page.tsx
git commit -m "feat(admin): add analytics page with dashboard API data"
```

---

## GROUP 2: Customer Pages

---

### Task 9: Profile Update API Endpoint

**Files:**
- Create: `backend/app/Http/Controllers/ProfileController.php`
- Create: `backend/app/Http/Requests/UpdateProfileRequest.php`
- Modify: `backend/routes/api.php`

- [ ] **Step 1: Create the UpdateProfileRequest**

Create `backend/app/Http/Requests/UpdateProfileRequest.php`:

```php
<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateProfileRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'first_name' => 'sometimes|string|max:255',
            'last_name' => 'sometimes|string|max:255',
            'phone' => 'sometimes|nullable|string|max:20',
            'default_address' => 'sometimes|nullable|array',
            'default_address.label' => 'sometimes|string|max:50',
            'default_address.line1' => 'required_with:default_address|string|max:255',
            'default_address.line2' => 'sometimes|nullable|string|max:255',
            'default_address.city' => 'required_with:default_address|string|max:100',
            'default_address.state' => 'required_with:default_address|string|max:100',
            'default_address.postal_code' => 'required_with:default_address|string|max:20',
            'default_address.country' => 'sometimes|string|max:100',
        ];
    }
}
```

- [ ] **Step 2: Create the ProfileController**

Create `backend/app/Http/Controllers/ProfileController.php`:

```php
<?php

namespace App\Http\Controllers;

use App\Http\Requests\UpdateProfileRequest;
use App\Http\Resources\UserResource;
use Illuminate\Http\JsonResponse;

class ProfileController extends Controller
{
    public function update(UpdateProfileRequest $request): JsonResponse
    {
        $user = $request->user();
        $user->update($request->validated());

        return response()->json([
            'message' => 'Profile updated.',
            'user' => new UserResource($user->load('roles')),
        ]);
    }
}
```

- [ ] **Step 3: Register route in api.php**

Add inside the existing `Route::middleware(['auth:sanctum', 'throttle:authenticated'])` group in `backend/routes/api.php`, after the `GET /user` line:

```php
Route::put('/user/profile', [App\Http\Controllers\ProfileController::class, 'update']);
```

- [ ] **Step 4: Verify endpoint works**

Run:
```bash
cd backend && php artisan route:list --path=api/user
```
Expected: Both `GET /api/user` and `PUT /api/user/profile` appear.

- [ ] **Step 5: Commit**

```bash
git add backend/app/Http/Controllers/ProfileController.php backend/app/Http/Requests/UpdateProfileRequest.php backend/routes/api.php
git commit -m "feat(api): add profile update endpoint"
```

---

### Task 10: Customer Profile Page

**Files:**
- Create: `frontend/src/app/profile/page.tsx`
- Modify: `frontend/src/hooks/useAuth.ts` (add `updateProfile` method)

- [ ] **Step 1: Add updateProfile to useAuth hook**

Add a new `updateProfile` function to `frontend/src/hooks/useAuth.ts`:

```typescript
const updateProfile = async (data: {
  first_name?: string;
  last_name?: string;
  phone?: string;
  default_address?: {
    label?: string;
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postal_code: string;
    country?: string;
  } | null;
}) => {
  const response = await api.put('/api/user/profile', data);
  setUser(response.data.user);
  return response.data;
};
```

Include `updateProfile` in the returned object.

- [ ] **Step 2: Build the profile page using `frontend-design` plugin**

Use the `frontend-design` plugin to create `frontend/src/app/profile/page.tsx`. Reference the provided screenshot for exact layout. This page uses the main Navbar layout (not admin sidebar).

**Page structure:**
- Add `'use client'` directive at top
- Header: "My Profile" bold title
- Two-column layout (left narrower, right wider) on desktop, stacked on mobile
- **Left column — Profile card:** centered user avatar (large circle with person icon, light yellow bg), user full name bold, email below, role badge (e.g., "Customer" in amber pill)
- **Right column — two stacked cards:**
  - **Personal Information card:** header with title + orange "Edit" text button. Shows email (with mail icon) and phone (with phone icon). When "Edit" is clicked, fields become editable inputs for first_name, last_name, phone with Save/Cancel buttons.
  - **Saved Addresses card:** shows the user's `default_address` if it exists. Display: address label (e.g., "Home") with "Default" badge, then full address formatted on two lines (line1 + line2, city + state + postal_code). If no address saved, show "No address saved" with an "Add Address" button. Clicking edit opens inline form with fields matching the `Address` type.

**API integration:**
- Get user data from `useAuth()` hook — `user` object has all needed fields
- Edit personal info: call `updateProfile({ first_name, last_name, phone })`
- Edit address: call `updateProfile({ default_address: { label, line1, line2, city, state, postal_code } })`
- Redirect to `/login` if not authenticated (check `!user && !loading`)

**Types used:** `User`, `Address` from `@/types/user`

- [ ] **Step 3: Verify the page renders**

Navigate to `/profile` while logged in. Confirm user data displays and edit flow works.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/app/profile/page.tsx frontend/src/hooks/useAuth.ts
git commit -m "feat: add customer profile page with edit functionality"
```

---

### Task 11: Customer Orders Page

**Files:**
- Create: `frontend/src/app/orders/page.tsx`

- [ ] **Step 1: Build the orders page using `frontend-design` plugin**

Use the `frontend-design` plugin to create `frontend/src/app/orders/page.tsx`. This page uses the main Navbar layout (not admin sidebar).

**Page structure:**
- Add `'use client'` directive at top
- Header: "My Orders" bold title
- List/table of orders, each row showing: order number (monospace), date, items count, total price, status badge
- Status badges with same color scheme as admin: pending=gray, processing=blue, paid=emerald, shipped=sari/orange, delivered=green, cancelled=red
- Each order row is clickable/expandable to show order items (product_name, quantity, unit_price, total_price)
- Empty state: "No orders yet" with a "Start Shopping" button linking to `/products`

**API integration:**
- Fetch from `GET /api/orders` on mount using `api` from `@/lib/api`
- This endpoint is already scoped to the authenticated user's orders
- Order detail: `GET /api/orders/{id}` for expanded view (items loaded)
- Price: use `formatPrice()` from `@/lib/utils`
- Date: use `Intl.DateTimeFormat` with 'en-PH' locale
- Redirect to `/login` if not authenticated

**Types used:** `Order`, `OrderItem` from `@/types/order`

- [ ] **Step 2: Verify the page renders**

Navigate to `/orders` while logged in. Confirm the page loads (may show empty state if no orders exist).

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/orders/page.tsx
git commit -m "feat: add customer orders page with API integration"
```

---

## Final Verification

### Task 12: End-to-End Verification

- [ ] **Step 1: Verify all admin pages are accessible**

Navigate through each admin sidebar link and confirm:
- `/admin` — Dashboard loads with real API data
- `/admin/products` — Products table with real data
- `/admin/inventory` — Inventory with stock levels
- `/admin/orders` — Orders table (may be empty)
- `/admin/users` — Users table with real users
- `/admin/analytics` — Stats from dashboard API

- [ ] **Step 2: Verify customer pages are accessible**

Log in as a regular user and confirm:
- `/profile` — Shows user info, edit works
- `/orders` — Shows order history or empty state

- [ ] **Step 3: Verify Navbar links work**

Confirm the user dropdown menu in the Navbar correctly links to `/profile` and `/orders`.

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat: complete all missing admin and customer pages with API integration"
```
