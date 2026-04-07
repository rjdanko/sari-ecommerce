# Plan 20: Platform Completion

> Fix Google OAuth, build the Business Dashboard with product management (including option categories), create Store model & public storefront, replace filler products with real API data, and scrap the admin panel.

---

## Decisions Log

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Admin panel | Scrap entirely | Business dashboard replaces it for store management; admin features deferred |
| Store model | New `Store` model | Business users create a store with name, logo, description; products belong to a store |
| Product options | Option categories on variants | e.g., Size: S/M/L, Color: Red/Blue — stored in `ProductVariant.options` JSON column (already exists) |
| Google OAuth | Config fix + callback redirect | `.env` credentials added; code needs redirect URI fix + browser redirect flow |

---

## Step 1: Fix Google OAuth Flow

**Problem:** The Google OAuth redirect returns JSON (`{"url": "https://accounts.google.com/..."}`) instead of actually redirecting the browser. The callback also returns JSON instead of redirecting back to the frontend with a session.

**Backend changes:**

- **File:** `backend/app/Http/Controllers/Auth/GoogleAuthController.php`
  - `redirect()` method: Change from `return response()->json(...)` to `return redirect()->to(...)` — the browser must be redirected to Google, not given a JSON URL
  - `callback()` method: After successful `Auth::login()`, redirect to `FRONTEND_URL` (e.g., `http://localhost:3000`) instead of returning JSON. Pass auth state via a short-lived token or rely on the session cookie

- **File:** `backend/config/services.php` (line 35)
  - Verify `redirect` uses the backend URL, not the frontend URL. Current default is `FRONTEND_URL/api/auth/google/callback` which is wrong — should be `APP_URL/api/auth/google/callback`
  - Since the user has set `GOOGLE_REDIRECT_URI` explicitly in `.env`, this is already correct

- **File:** `backend/routes/api.php`
  - Move the Google OAuth routes outside the `guest` middleware group if needed, since the redirect route is hit by browser navigation (not an API call)

**Frontend changes:**

- **File:** `frontend/src/app/(auth)/login/page.tsx` (line 117)
  - Change the Google button from `<a href="...">` to navigate to the backend redirect URL directly. The current approach works *if* the backend actually redirects
  - Verify `NEXT_PUBLIC_API_URL` is correctly set in `frontend/.env`

- **File:** `frontend/src/app/(auth)/register/page.tsx`
  - Same change as login page

**Verification:** Click "Continue with Google" on login page -> browser redirects to Google -> authenticate -> redirected back to frontend, logged in.

> **Skill:** Use `superpowers:systematic-debugging` if the OAuth flow doesn't work after these changes.

---

## Step 2: Create Store Model & Backend

> **Skill:** Use `superpowers:brainstorming` before implementation to finalize the Store schema if any ambiguity arises.

**New files:**

- `backend/app/Models/Store.php`
  ```
  Fields: id, user_id (owner), name, slug, description, logo_url, banner_url,
          address, phone, is_active, created_at, updated_at
  Relationships: belongsTo(User), hasMany(Product)
  ```

- `backend/database/migrations/XXXX_create_stores_table.php`

- `backend/database/migrations/XXXX_add_store_id_to_products_table.php`
  - Add `store_id` foreign key to `products` table
  - Migrate `business_id` to `store_id` — products belong to a store, not directly to a user. Drop `business_id` column after migration. Update `Product` model relationships accordingly.

- `backend/app/Http/Controllers/StoreController.php`
  - `store()` — business user creates their store
  - `show(slug)` — public storefront view
  - `update()` — owner updates store info

- `backend/app/Http/Controllers/Business/DashboardController.php`
  - Dashboard metrics scoped to the business user's store

**Route additions** (`backend/routes/api.php`):
```
// Public
Route::get('/stores/{slug}', [StoreController::class, 'show']);

// Business (authenticated)
Route::middleware('role:business|admin')->prefix('business')->group(function () {
    Route::post('/store', [StoreController::class, 'store']);
    Route::put('/store', [StoreController::class, 'update']);
    Route::get('/dashboard', [DashboardController::class, 'index']);
});
```

**Verification:** Business user can create a store, update it, and see dashboard metrics for their store.

---

## Step 3: Build Business Dashboard Frontend

> **Skill:** Use `frontend-design:frontend-design` skill for all UI components in this step. The dashboard should feel professional and polished — not generic.
> **Skill:** Before writing any Next.js code, read the relevant guide in `node_modules/next/dist/docs/` per `AGENTS.md`.

**New files to create:**

- `frontend/src/app/business/layout.tsx` — sidebar layout (similar structure to current admin layout but branded as "My Store")
- `frontend/src/app/business/dashboard/page.tsx` — overview metrics (revenue, orders, products, low stock)
- `frontend/src/app/business/products/page.tsx` — product listing table for the business owner
- `frontend/src/app/business/products/new/page.tsx` — add product form (see Step 4)
- `frontend/src/app/business/orders/page.tsx` — orders for the business
- `frontend/src/app/business/store/page.tsx` — store settings (name, logo, description, etc.)

**Sidebar navigation items:**
- Dashboard (`/business/dashboard`)
- Products (`/business/products`)
- Orders (`/business/orders`)
- Store Settings (`/business/store`)

**Reuse from existing admin pages:**
- The current `admin/page.tsx` dashboard component has good metric cards, order rows, and stock alerts — adapt this code for the business dashboard, scoping data to the business user's store
- The current `admin/products/page.tsx` has a solid product table — adapt for business products page

**Verification:** Business user clicks "Business Dashboard" in Navbar -> sees dashboard with their store's metrics, can navigate to products/orders/store settings.

---

## Step 4: Add Product Form with Option Categories

> **Skill:** Use `frontend-design:frontend-design` skill for the product creation form. It should be a polished, multi-section form — not a generic Bootstrap layout.
> **Skill:** Use `superpowers:brainstorming` to finalize the option category UX before building.

**File:** `frontend/src/app/business/products/new/page.tsx`

**Form sections:**

1. **Basic Info**
   - Product Name (text input)
   - Description (textarea / rich text)
   - Short Description (text input)
   - Category (dropdown, fetched from `GET /api/categories`)
   - Brand (text input)

2. **Pricing & Stock**
   - Base Price (number input, PHP currency)
   - Compare-at Price (optional, for showing discounts)
   - SKU (auto-generated or manual)
   - Stock Quantity (number input)

3. **Product Images**
   - Drag-and-drop or click-to-upload image area
   - Multiple images supported
   - First image is primary (drag to reorder)
   - Upload via the existing `ImageService` (Supabase storage)
   - Preview thumbnails before submission

4. **Option Categories** (dynamic, optional section)
   - "Add Option Category" button
   - Each option category has:
     - Category Name (e.g., "Size", "Color")
     - Values (tag-style input, e.g., type "Small" + Enter, "Medium" + Enter, "Large" + Enter)
   - Multiple categories allowed (e.g., Size + Color)
   - Auto-generates variant combinations on the backend (or frontend preview)
   - Example:
     ```
     Option Category: Size    -> Values: [S, M, L]
     Option Category: Color   -> Values: [Red, Blue, Black]
     ```
   - This generates 9 variants (S/Red, S/Blue, S/Black, M/Red, ...)

**Backend changes needed:**

- **File:** `backend/app/Http/Controllers/ProductController.php` — `store()` method
  - Accept `option_categories` array in the request
  - Auto-generate `ProductVariant` records from the category combinations
  - Each variant stores its options as JSON: `{"size": "S", "color": "Red"}`
  - Each variant can optionally override price and stock

- **File:** `backend/app/Http/Requests/StoreProductRequest.php`
  - Add validation for `option_categories` array
  - Validate `images` array (file types, max size)

**Verification:** Business user fills out the form -> uploads images -> adds Size and Color options -> submits -> product appears in their product list and on the public products page.

---

## Step 5: Replace Filler/Mock Products with Real API Data

**Problem:** `frontend/src/app/products/page.tsx` has a hardcoded `mockProducts` array (~15 mock products) instead of fetching from the API.

**File:** `frontend/src/app/products/page.tsx`

**Changes:**
- Remove the entire `mockProducts` array (lines 14-onwards)
- Fetch products from `GET /api/products` with query params for category, sort, featured, and pagination
- Wire up the `SidebarFilter` component to update query params
- Handle loading state (skeleton cards)
- Handle empty state ("No products found")
- Handle pagination (load more or page numbers)

**Also check and fix if using mock data:**
- `frontend/src/app/page.tsx` (homepage) — featured products section
- `frontend/src/app/checkout/page.tsx` — cart items (should use `GET /api/cart`)
- Any other page referencing hardcoded product arrays

**Verification:** Products page shows real products from the database. Filtering by category works. Sorting works. Empty state shows when no products exist.

---

## Step 6: Scrap Admin Panel

**Files to delete:**
- `frontend/src/app/admin/layout.tsx`
- `frontend/src/app/admin/page.tsx`
- `frontend/src/app/admin/products/page.tsx`
- `frontend/src/app/admin/inventory/page.tsx`
- `frontend/src/app/admin/orders/page.tsx`
- `frontend/src/app/admin/users/page.tsx`
- `frontend/src/app/admin/analytics/page.tsx`

**Files to modify:**
- `frontend/src/components/layout/Navbar.tsx`
  - Remove "Admin Panel" link from the dropdown
  - Keep "Business Dashboard" link (for business role users)
  - Update the link path if needed

**Backend:** Keep the admin API routes in `api.php` for now — they're useful for future admin features and don't hurt anything. Just remove frontend references.

**Verification:** No `/admin` routes accessible. Navbar only shows "Business Dashboard" for business users.

---

## Step 7: Create Public Store Page

> **Skill:** Use `frontend-design:frontend-design` skill for the storefront page design.

**File:** `frontend/src/app/store/[slug]/page.tsx`

**Requirements:**
- Store banner image (or gradient fallback)
- Store logo, name, description
- Product grid showing all products from that store
- Fetch from `GET /api/stores/{slug}` (returns store info + products)

**Also update:**
- Product cards and product detail page — show "Sold by [Store Name]" with link to `/store/[slug]`
- Products listing page — optionally filter by store

**Verification:** Navigate to `/store/my-store` -> see store page with banner, info, and product grid.

---

## Execution Order

```
Step 1 (Google OAuth fix) ────────── Quick fix, unblocks login
    |
Step 2 (Store model + backend) ──── Foundation for Steps 3, 4, 7
    |
Step 3 (Business Dashboard) ─────── Core business experience
    |
Step 4 (Add Product form) ───────── Business can add real products
    |
Step 5 (Replace filler products) ── Buyer pages show real data
    |
Step 6 (Scrap admin panel) ──────── Cleanup
    |
Step 7 (Public store page) ──────── Complete the multi-store experience
```

Steps 1 and 2 are sequential prerequisites. Steps 3-4 depend on Step 2. Steps 5-7 can be parallelized after Step 4 if desired.

---

## Skill Usage Instructions

For each step:

1. **Before implementation:** Invoke `superpowers:brainstorming` skill if the step has open design questions
2. **For UI work:** Invoke `frontend-design:frontend-design` skill to generate production-grade, polished components that match the SARI brand (orange/amber palette, rounded-2xl cards, gradient buttons)
3. **Before writing Next.js code:** Read the relevant guide in `node_modules/next/dist/docs/` per `AGENTS.md`
4. **For bugs:** Invoke `superpowers:systematic-debugging` skill when something doesn't work as expected
5. **After each step:** Invoke `superpowers:verification-before-completion` skill to verify everything works end-to-end before moving on
6. **For parallel tasks (Steps 5-7):** Invoke `superpowers:dispatching-parallel-agents` skill to run independent work simultaneously

---

## Technical Notes

- All new pages must include `'use client'` directive (Next.js App Router client components)
- Reuse existing components: `Navbar`, `Footer`, `ProductCard`
- Reuse existing utilities: `formatPrice` from `@/lib/utils`, `api` from `@/lib/api`
- Follow existing type definitions in `frontend/src/types/`
- Backend API base: `http://localhost:8000`, frontend: `http://localhost:3000`
- Image uploads go to Supabase Storage via the existing `ImageService`
- Product variants use the existing `ProductVariant` model with JSON `options` column
- Session auth via Sanctum with `SANCTUM_STATEFUL_DOMAINS=localhost:3000`
