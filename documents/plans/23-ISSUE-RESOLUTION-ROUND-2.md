# Plan 23 — Issue Resolution Round 2

> 10 bugs and feature requests identified from manual testing.
> Use **superpowers** skills (brainstorming, systematic-debugging, test-driven-development, verification-before-completion) throughout.
> Use **frontend-design** skill for any UI component work (cart badge, toast notifications, checkout quantity editor).

---

## Issue Index

| # | Issue | Type | Layer |
|---|-------|------|-------|
| 1 | Google OAuth login fails (`google_auth_failed`) | Bug | Backend |
| 2 | Homepage "Sign in to get started" shows for logged-in users | Bug | Frontend |
| 3 | Add-to-cart button not functional + no confirmation toast | Bug + Feature | Frontend |
| 4 | Cart icon needs floating item-count badge | Feature | Frontend |
| 5 | Wishlist products show "Uncategorized" | Bug | Backend |
| 6 | Adding a product: "Undefined array key client-settings" | Bug | Backend |
| 7 | Product images not showing on store page | Bug | Frontend/Backend |
| 8 | Remove delivery method from checkout page | Cleanup | Frontend |
| 9 | Checkout: edit quantity / remove items | Feature | Frontend |
| 10 | Checkout: shipping_address.state validation error | Bug | Backend + Frontend |

---

## Step 1 — Google OAuth Login Failure

**Skill:** `superpowers:systematic-debugging`

### Root Cause Analysis

The `GoogleAuthController::callback()` uses `Auth::login()` + `request()->session()->regenerate()`, but the API is **stateless** (Sanctum token-based, not session-based). The Google OAuth redirect goes through the backend API routes which are under `throttle:auth` but do **not** have `web` middleware (no session). This means:

1. `Auth::login()` tries to write to a session that doesn't exist in the API context.
2. `request()->session()->regenerate()` will throw or silently fail.
3. The catch block redirects to `/login?error=google_auth_failed`.

Additionally, `config/services.php` sets the Google redirect URI to `FRONTEND_URL/api/auth/google/callback` — this points to the **frontend** Next.js app, not the backend. The callback route is actually at the **backend** `/api/auth/google/callback`.

### Fix

1. **Fix the redirect URI** in `config/services.php` — should point to the **backend** URL:
   ```
   'redirect' => env('GOOGLE_REDIRECT_URI', env('APP_URL') . '/api/auth/google/callback'),
   ```
2. **Rewrite the callback** to issue a Sanctum token (or a short-lived signed URL with token) instead of session-based login:
   - After `updateOrCreate`, generate a Sanctum personal access token.
   - Redirect to frontend with the token as a query param: `FRONTEND_URL/login?token=xxx`.
   - Frontend reads the token, stores it, and calls `/api/user` to verify.
3. **Frontend login page** — detect `?token=` query param, store it via the existing auth mechanism, and redirect to home.
4. Verify `.env` has correct `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `GOOGLE_REDIRECT_URI`.

### Files to Modify

- [GoogleAuthController.php](backend/app/Http/Controllers/Auth/GoogleAuthController.php)
- [config/services.php](backend/config/services.php) (redirect URI)
- [login/page.tsx](frontend/src/app/(auth)/login/page.tsx) (handle `?token=` param)
- [useAuth hook](frontend/src/hooks/useAuth.ts) (if token storage logic lives here)

---

## Step 2 — Homepage "Sign in to get started" Shows for Logged-in Users

**Skill:** `superpowers:systematic-debugging`

### Root Cause

The "Recommended For You" section in [page.tsx](frontend/src/app/page.tsx) (lines 98-115) is **hardcoded static content** — it always shows "Sign in to see personalized recommendations" regardless of auth state. The homepage is a Server Component with no auth check.

### Fix

1. Convert the "Recommended For You" section into a **client component** (or extract it as one).
2. Use the `useAuth` hook to check if the user is logged in.
3. **If logged in:** fetch `/api/recommendations/for-you` and show actual recommendations, or show a different message (e.g., "Explore picks for you").
4. **If not logged in:** keep the current "Sign in to get started" CTA.

### Files to Modify

- [page.tsx](frontend/src/app/page.tsx) — extract recommendation section as client component
- New component: `frontend/src/components/HomeRecommendations.tsx`

---

## Step 3 — Add-to-Cart Not Working + Confirmation Toast

**Skills:** `superpowers:systematic-debugging`, `frontend-design:frontend-design`

### Root Cause

The `ProductCard` component's cart button ([ProductCard.tsx:168-173](frontend/src/components/ProductCard.tsx#L168-L173)) has no `onClick` handler — it's purely visual. It doesn't call `useCart().addItem()`.

### Fix

1. **Wire up the cart button** — accept an `onAddToCart` callback prop in `ProductCard`, or use the `useCart` hook directly inside the component.
2. **Add a toast/notification system** — use the `frontend-design` skill to create a polished confirmation toast component.
   - Show a success toast: "Added to cart" with product name and a "View Cart" link.
   - Show error toast if add fails (e.g., out of stock).
3. **Create a `ToastProvider`** context that wraps the app so toasts can be triggered from any component.

### Files to Modify

- [ProductCard.tsx](frontend/src/components/ProductCard.tsx) — add `onClick` to cart button
- New: `frontend/src/components/Toast.tsx` — toast notification component (use `frontend-design` skill)
- New: `frontend/src/contexts/ToastContext.tsx` — toast state management
- [layout.tsx](frontend/src/app/layout.tsx) — wrap with ToastProvider
- [products/[slug]/page.tsx](frontend/src/app/products/[slug]/page.tsx) — also wire up add-to-cart on detail page

---

## Step 4 — Cart Icon Floating Badge

**Skill:** `frontend-design:frontend-design`

### Current State

The cart icon in [Navbar.tsx:78-84](frontend/src/components/layout/Navbar.tsx#L78-L84) is a plain `ShoppingCart` icon with no count indicator.

### Fix

1. **Add a CartProvider/context** (or use a lightweight global state) that tracks item count across the app.
2. **Add a floating badge** on the cart icon showing `item_count` from the cart API.
   - Small circle, positioned top-right of the icon.
   - Use `frontend-design` skill for the badge styling (color, animation on count change).
   - Hide the badge when count is 0.
3. **Refresh count** after add-to-cart actions.

### Files to Modify

- New: `frontend/src/contexts/CartContext.tsx` — global cart state (item count)
- [Navbar.tsx](frontend/src/components/layout/Navbar.tsx) — add badge to cart icon
- [layout.tsx](frontend/src/app/layout.tsx) — wrap with CartProvider

---

## Step 5 — Wishlist "Uncategorized" Bug

**Skill:** `superpowers:systematic-debugging`

### Root Cause

The `WishlistController::index()` eager-loads `product.category` ([WishlistController.php:19](backend/app/Http/Controllers/WishlistController.php#L19)), but the response returns **paginated Wishlist models**, not Product models. The frontend [WishlistPage](frontend/src/app/wishlist/page.tsx) expects `Product[]` but receives `Wishlist[]` (which have a nested `product` with `category`).

The `ProductCard` component reads `product.category?.name` ([ProductCard.tsx:127](frontend/src/components/ProductCard.tsx#L127)) — if the category relation is missing or not loaded on the product level, it falls back to "Uncategorized".

Two possible causes:
- The API returns `{ data: [{ id, user_id, product_id, product: { ... } }] }` — the frontend needs to map `item.product` not the raw item.
- Some products genuinely have no `category_id` set.

### Fix

1. **Frontend:** In `WishlistPage`, map the response to extract the nested `product` from each wishlist item:
   ```ts
   setItems(data.data.map((item: any) => item.product));
   ```
2. **Backend:** Ensure the product index endpoint also eager-loads `category` (it already does at [ProductController.php:25](backend/app/Http/Controllers/ProductController.php#L25)).
3. **Verify** that products in the DB actually have `category_id` set. If some don't, ensure the "Add Product" form requires it (it already does — `category_id` is `required` in `StoreProductRequest`).

### Files to Modify

- [wishlist/page.tsx](frontend/src/app/wishlist/page.tsx) — fix data mapping
- Possibly [WishlistController.php](backend/app/Http/Controllers/WishlistController.php) — ensure response shape

---

## Step 6 — "Undefined array key client-settings" When Adding Product

**Skill:** `superpowers:systematic-debugging`

### Root Cause

This error likely comes from the `ImageService` or a middleware reading a config key that doesn't exist. The error message "Undefined array key client-settings" suggests a cloud storage driver (e.g., Cloudinary, S3) configuration issue where a settings array is being accessed with a key `client-settings` that doesn't exist in the config.

### Investigation Steps

1. Search the entire backend for `client-settings` or `client_settings` references.
2. Check `ImageService.php` for config access patterns.
3. Check `config/filesystems.php` or any cloud storage config.
4. Check if this happens with or without image upload.
5. The error may come from a third-party package (e.g., Cloudinary SDK) that expects a config key.

### Fix

1. Identify the exact source of the error (stack trace needed).
2. Add the missing config key or fix the config structure.
3. If it's from an image upload service, ensure the `.env` has all required credentials.

### Files to Investigate

- [backend/app/Services/ImageService.php](backend/app/Services/ImageService.php)
- `backend/config/filesystems.php`
- Any Cloudinary/S3 config files
- `backend/.env` (credentials)

---

## Step 7 — Product Images Not Showing on Store Page

**Skill:** `superpowers:systematic-debugging`

### Root Cause

The product list API at [ProductController::index()](backend/app/Http/Controllers/ProductController.php#L22-L46) eager-loads `primaryImage` (line 25), but the **paginated response returns raw Eloquent models** — not `ProductResource`. This means the response structure may differ from what `ProductResource` outputs.

The `ProductCard` reads `product.primary_image?.url` ([ProductCard.tsx:23](frontend/src/components/ProductCard.tsx#L23)), but the paginated JSON may serialize the relation as `primary_image` (snake_case of `primaryImage` relation).

Possible issues:
1. The relation name is `primaryImage` (camelCase) — Laravel serializes it as `primary_image` in JSON by default. Need to verify the actual JSON key.
2. The image URLs might be relative paths that need a base URL prefix.
3. The `primaryImage` relation might not be defined correctly or returns null.

### Fix

1. **Verify** the actual API response shape by checking the `Product` model's `primaryImage` relation.
2. **Ensure consistency** — either use `ProductResource` for the list endpoint too, or verify the JSON key matches what the frontend expects (`primary_image`).
3. **Check image URLs** — if they're stored as relative paths, prepend the backend URL.
4. If using cloud storage (Cloudinary/S3), ensure the `url` field has the full URL.

### Files to Modify

- [ProductController.php](backend/app/Http/Controllers/ProductController.php) — possibly wrap with `ProductResource::collection()`
- [Product.php](backend/app/Models/Product.php) — verify `primaryImage` relationship
- [ProductCard.tsx](frontend/src/components/ProductCard.tsx) — possibly fix image URL construction

---

## Step 8 — Remove Delivery Method from Checkout

**Skill:** None (straightforward removal)

### Current State

The checkout page ([checkout/page.tsx:155-233](frontend/src/app/checkout/page.tsx#L155-L233)) has a "Delivery Method" section with "Delivery" and "Store Pickup" options.

### Fix

1. **Remove** the entire delivery method section (step 1 in the UI).
2. **Remove** the `deliveryMethod` state and `DeliveryMethod` type.
3. **Remove** the delivery fee calculation (set to 0 or remove entirely).
4. **Remove** the delivery fee line from the order summary.
5. **Renumber** the remaining sections (Shipping Info becomes step 1, Payment becomes step 2).
6. **Update** the `handlePlaceOrder` to not send `delivery_method`.

### Files to Modify

- [checkout/page.tsx](frontend/src/app/checkout/page.tsx)

---

## Step 9 — Checkout: Edit Quantity / Remove Items

**Skill:** `frontend-design:frontend-design`

### Current State

The order summary in checkout ([checkout/page.tsx:440-468](frontend/src/app/checkout/page.tsx#L440-L468)) shows items as read-only with just "Qty: X".

### Fix

1. **Add quantity controls** — use `frontend-design` skill to design inline +/- buttons next to each item in the order summary.
2. **Add a remove button** — small X or trash icon per item.
3. **Wire up** to `useCart().updateQuantity()` and `useCart().removeItem()`.
4. **Update totals** reactively when quantities change.
5. **Handle edge case:** if all items are removed, redirect to cart or show empty state.

### Files to Modify

- [checkout/page.tsx](frontend/src/app/checkout/page.tsx) — add quantity editor and remove button in order summary

---

## Step 10 — Checkout Validation Error: shipping_address.state Required

**Skill:** `superpowers:systematic-debugging`

### Root Cause

The `CheckoutRequest` validation ([CheckoutRequest.php:17-21](backend/app/Http/Requests/CheckoutRequest.php#L17-L21)) requires:
- `shipping_address.state` — **required**
- `shipping_address.postal_code` — **required**
- `shipping_address.country` — **required**

But the frontend sends:
- `province` (not `state`)
- `zip` (not `postal_code`)
- **Does not send `country` at all**

The field name mismatch causes validation to fail even when all visible fields are filled.

### Fix — Option A (Recommended): Align frontend to backend

Update the frontend `handlePlaceOrder` to map fields correctly:

```ts
shipping_address: {
  full_name: form.fullName,
  phone: form.phone,
  line1: form.address1,
  line2: form.address2,
  city: form.city,
  state: form.province,       // map province -> state
  postal_code: form.zip,       // map zip -> postal_code
  country: 'PH',               // default to Philippines
},
```

Also add `full_name` and `phone` to the `CheckoutRequest` validation if they should be persisted.

### Fix — Option B: Align backend to frontend

Update `CheckoutRequest` rules to match the frontend field names. Less ideal since backend naming should be canonical.

### Files to Modify

- [checkout/page.tsx](frontend/src/app/checkout/page.tsx) — fix field mapping in `handlePlaceOrder`
- [CheckoutRequest.php](backend/app/Http/Requests/CheckoutRequest.php) — optionally add `full_name`, `phone` validation

---

## Execution Order

Execute in dependency order — foundational fixes first, then features:

| Phase | Steps | Rationale |
|-------|-------|-----------|
| **Phase 1: Auth & Data** | 1, 6 | Unblock login and product creation |
| **Phase 2: Data Display** | 5, 7 | Fix what users see (wishlist, images) |
| **Phase 3: Cart System** | 3, 4 | Core cart functionality + UI badge |
| **Phase 4: Checkout** | 8, 10, 9 | Remove clutter, fix validation, then add features |
| **Phase 5: Homepage** | 2 | Polish — auth-aware recommendations |

### Per-Step Process

For each step:
1. Invoke the relevant **superpowers skill** (systematic-debugging for bugs, brainstorming for features).
2. For any UI work, invoke `frontend-design:frontend-design` to ensure polished design.
3. Implement the fix.
4. Use `superpowers:verification-before-completion` — run the app and verify the fix works before moving on.
5. Commit after each step with a descriptive message.

---

## Notes

- **AGENTS.md Warning:** The frontend uses a newer Next.js version. Before writing any Next.js code, read `node_modules/next/dist/docs/` for API changes.
- All cart state management changes (Steps 3, 4, 9) should be coordinated — implement the `CartContext` once and use it everywhere.
- The Google OAuth fix (Step 1) requires `.env` verification — cannot be fully tested without valid Google credentials.
