# Sari E-Commerce — How Features Work (In-Depth)

> A technical deep-dive into the internal mechanics of every feature in the Sari platform.
> Last updated: April 17, 2026

---

## Table of Contents

1. [Authentication & User Management](#1-authentication--user-management)
2. [Product Browsing & Discovery](#2-product-browsing--discovery)
3. [AI Product Comparison](#3-ai-product-comparison)
4. [Shopping Cart](#4-shopping-cart)
5. [Checkout & Payment](#5-checkout--payment)
6. [Voucher System](#6-voucher-system)
7. [Order Management](#7-order-management)
8. [Product Reviews & Ratings](#8-product-reviews--ratings)
9. [Wishlist](#9-wishlist)
10. [User Profile](#10-user-profile)
11. [AI Recommendations](#11-ai-recommendations)
12. [Business Dashboard](#12-business-dashboard)
13. [Admin Panel](#13-admin-panel)
14. [UI/UX & Design System](#14-uiux--design-system)
15. [Security & Performance](#15-security--performance)

---

## 1. Authentication & User Management

### Overview

Authentication is handled by **Laravel Sanctum** (session-based SPA auth) with **Spatie Laravel Permission** managing three roles: `customer`, `business`, and `admin`. Google OAuth is an alternative login path.

### How Email/Password Registration Works

1. The frontend calls `GET /sanctum/csrf-cookie` first (via `getCsrfCookie()` in `frontend/src/lib/api.ts`) to receive a CSRF token and set it as a cookie.
2. A `POST /register` request is sent with `first_name`, `last_name`, `email`, `password`, and `password_confirmation`.
3. The backend `RegisterController` validates the input via a `FormRequest` class. It checks that the email is unique and the password meets length requirements.
4. A `User` record is created with `password` hashed using **bcrypt with 12 rounds**.
5. The user is automatically assigned the `customer` role via Spatie's `assignRole()`.
6. Sanctum creates a session cookie, and the user is logged in immediately.

### How Email/Password Login Works

1. `getCsrfCookie()` is called first to refresh the CSRF token.
2. `POST /login` sends credentials to `LoginController`, which calls `Auth::attempt(['email', 'password'])`.
3. On success, Sanctum issues a session-based cookie (`laravel_session`) that the browser stores and sends with every subsequent request.
4. The frontend `useAuth` hook stores the returned `user` object in React state. This state persists until the user explicitly logs out or the session expires.

### How Google OAuth Works

1. The frontend redirects to `GET /auth/google/redirect`, which returns a Google OAuth URL from the `GoogleAuthController`.
2. After the user approves in Google, Google redirects to `GET /auth/google/callback` with a `code` parameter.
3. The backend exchanges the `code` for a token and retrieves the user's Google profile.
4. If a user with that Google ID already exists, they are logged in. If a user with that email exists but no Google ID, the `google_id` is linked. If neither exists, a new account is created.
5. The new/existing user is logged in via Sanctum and redirected to the frontend.

### How Session Persistence Works

Sanctum uses **cookie-based sessions**, not bearer tokens. The `laravel_session` cookie has a `HttpOnly` flag (not accessible via JavaScript) and is sent automatically by the browser on every request. On page load, the frontend calls `GET /user` (via `useAuth`) to re-hydrate the user state from the active session.

### How Role-Based Navigation Works

After login, the `useAuth` hook provides a `hasRole(roleName)` helper. The navbar checks `hasRole('business')` or `hasRole('admin')` to conditionally show the "Business Dashboard" or "Admin" links. This is a UI-only check — the backend enforces actual access via `role:business|admin` middleware on protected routes.

### How Forgot Password / Reset Password Works

1. `POST /forgot-password` triggers `Password::sendResetLink()`. Laravel generates a signed token, stores a hash in the `password_reset_tokens` table, and emails the user a link.
2. The link contains the token and email. The user visits the reset page, enters a new password, and submits `POST /reset-password`.
3. Laravel verifies the token hasn't expired (default 60 minutes), updates the password, and deletes the token.

### Rate Limiting on Auth

The `auth` throttle group applies a **5 requests per minute per IP** limit on login and registration endpoints, preventing brute-force attacks.

---

## 2. Product Browsing & Discovery

### Overview

Products are stored in PostgreSQL, indexed in **Typesense** for full-text search, and cached in **Redis** for fast listing performance. Filtering and sorting happen in the backend; the frontend manages URL query params to reflect the current state.

### How the Product Listing Works

1. `GET /products` with optional query params: `?category=`, `?q=`, `?sort=`, `?price_min=`, `?price_max=`, `?page=`.
2. `ProductController@index` builds an Eloquent query:
   - Filters by `category_id` if category is provided.
   - Applies price range filtering with `whereBetween('base_price', ...)`.
   - Applies sorting via `orderBy()`.
3. Results are **cached in Redis** with a 5-minute TTL. The cache key includes all query parameters so each unique filter combination is cached independently. When a product is updated, the cache is invalidated by bumping a version key.
4. Products are paginated (15 per page), and the response includes `meta.last_page` so the frontend knows when to hide the "Load More" button.

### How Typesense Search Works

1. When a search query `?q=` is present, the backend calls **Typesense** (a fast open-source search engine running in Docker) instead of the standard Eloquent query.
2. Typesense indexes each product's `name`, `description`, `category.name`, and `brand` fields.
3. The response includes relevance-ranked results. If Typesense is unavailable (e.g., not configured), the code falls back to a PostgreSQL `ILIKE '%query%'` query.
4. If the user is logged in, the search query is saved to the `search_histories` table for analytics.

### How Product Variants Work

Products can have option categories (e.g., `Size: S, M, L` and `Color: Red, Blue`). Each unique combination of options is a `ProductVariant` record. The `options` field is stored as **JSONB** (e.g., `{"Size": "M", "Color": "Red"}`). Each variant has its own `price`, `stock_quantity`, and `sku`.

On the product detail page, the frontend reads the `variants` array and renders dropdowns for each dimension (Size, Color). When the user selects a combination, it finds the matching `ProductVariant` by comparing the selected options against each variant's JSONB `options`.

### How View Count Tracking Works

Every call to `GET /products/{slug}` (the product detail endpoint) increments `view_count` on the `Product` model using `$product->increment('view_count')`. This is a single atomic SQL update. The view count is used for the "Popular" sort option and Recombee recommendations.

### How the Store Page Works

Each `Product` has a `store_id` foreign key pointing to a `Store` record. The store page (`/store/{slug}`) calls `GET /stores/{slug}`, which returns the store's profile info (name, logo, banner, description, address) along with its active products. The store's products use the same `ProductController@index` route with a `?store=` filter.

---

## 3. AI Product Comparison

### Overview

This is a fully client-side feature — no backend AI is called. The "AI Score" is computed in JavaScript using a weighted formula.

### How Product Selection Works

The `ProductCard` component renders a checkbox. Checking it adds the product's data to a `comparedProducts` array in React state (managed in the products page). A sticky compare bar appears at the bottom of the screen when at least one product is selected, showing the count and a "Compare Now" button.

### How the AI Score is Calculated

The `ProductComparisonModal` component receives the array of selected products and runs a scoring function for each one. The score (0–100) is computed by:

1. **Price Score** (lower relative price = higher score): `(1 - price/maxPrice) * 25`
2. **Rating Score**: `(rating / 5) * 25`
3. **Stock Score** (availability): `min(stockQuantity / 10, 1) * 20`
4. **Discount Score**: If the product has a `compare_at_price`, the discount percentage contributes up to `15` points.
5. **Featured Score**: If `is_featured === true`, `+15` points.

The product with the highest total score receives the "Best Choice" badge. Strengths are auto-detected: "Best Price" (lowest price), "Highest Rated" (highest rating), "High Availability" (highest stock), "Great Discount" (largest discount %), "Staff Pick" (`is_featured`).

### How Auto-Compare via URL Works

If the URL contains `?ai=compare`, the products page effect hook auto-selects the first 2 products from the loaded list and immediately opens the comparison modal.

---

## 4. Shopping Cart

### Overview

The cart is stored **server-side in Redis**, not in a database table or browser localStorage. This means the cart follows the user across devices and browsers as long as they're logged in.

### How Cart Storage Works (Redis)

The `CartService` (`backend/app/Services/CartService.php`) uses the Redis key `cart:{userId}`. The value is a Redis **hash** where each field is a `product_id` (or `product_id:variant_id` for variants) and the value is a JSON string containing `quantity` and `variant_id`. The key has a **7-day TTL**, reset on every cart interaction.

When retrieving the cart, `CartService::getCart()` reads all fields from the Redis hash, then batch-loads the corresponding `Product` and `ProductVariant` records in **2 queries** (one for products, one for variants) to avoid N+1 database queries.

### How Adding to Cart Works

1. Frontend sends `POST /cart` with `product_id`, `quantity`, and optionally `variant_id`.
2. `CartController@add` validates that the product exists and is active.
3. `CartService::addItem()` checks current stock vs. the requested quantity. If adding would exceed stock, it returns an error.
4. The Redis hash is updated atomically. If the item already exists, the quantity is incremented.
5. The cart response is returned and the `CartContext` in the frontend updates its state, causing the navbar badge to re-render.

### How Variant Change in Cart Works

Users can change, e.g., "Size M → Size L" directly in the cart without removing and re-adding. The frontend sends `PUT /cart/{productId}` with the new `variant_id`. `CartService::updateVariant()` removes the old Redis entry and creates a new one with the new variant key, preserving the quantity.

### How the Cart Badge Works

The `CartContext` (in `frontend/src/contexts/CartContext.tsx`) exposes `cart.item_count`. The navbar imports this context and renders the count as a badge. On login, `CartContext` calls `fetchCart()` automatically to hydrate the count from the server.

---

## 5. Checkout & Payment

### Overview

Checkout is a multi-step form (Shipping → Payment → Voucher → Summary). For COD orders, the backend creates the order immediately. For online payments (Card, QR PH), it creates an order then generates a **PayMongo** checkout session and redirects the user.

### How the Checkout Form Works

The checkout page collects:
- **Shipping info**: full name, phone (stripped of non-numeric chars via `inputMode="numeric"` and an `onChange` handler), street address, city, province, zip.
- **Payment method**: COD, QR PH, or Card.
- **Voucher code**: optional, applied before placing the order.

Client-side validation runs on submit. If any field is invalid, inline error messages appear and the page auto-scrolls to the first invalid field. No request is made until all fields pass.

### How Delivery Fee Estimation Works

The frontend calls `POST /delivery-fee/estimate` with the buyer's address and the store's slug. The `DeliveryFeeService` in the backend:
1. Geocodes the buyer's address using the **Google Maps Geocoding API** → returns lat/lng.
2. Uses the store's `latitude` and `longitude` (set when the store was created) as the origin.
3. Calls the **Google Maps Distance Matrix API** to get the driving distance in kilometers.
4. Applies a per-km rate to compute the fee.
5. If any step fails (geocoding error, API down), it returns a flat **₱100 default fee**.

### How COD Orders Work

1. `POST /orders` with `payment_method: 'cod'` and all shipping/cart data.
2. `CheckoutController@store` wraps everything in a **database transaction**:
   - Creates the `Order` record.
   - Creates `OrderItem` records for each cart item (product name, price, variant info snapshotted at time of purchase — not a live reference, so price changes don't affect past orders).
   - Decrements `stock_quantity` on `Product` and `ProductVariant`.
   - Clears the Redis cart via `CartService::clearCart()`.
3. Order status starts as `pending_confirmation` (waiting for the seller to confirm).
4. The frontend redirects to `/checkout/success?order_id=...`.

### How Online Payments Work (PayMongo)

1. `POST /orders` with `payment_method: 'card'` or `'qr_ph'`.
2. `CheckoutController@store` creates the `Order` record (status: `pending_confirmation`, stock NOT yet decremented).
3. `PaymentService::createCheckoutSession()` is called with the line items and amounts (always sourced from the database — the frontend cannot inflate prices). This calls the PayMongo API and returns a checkout URL.
4. The frontend redirects the user to the PayMongo-hosted payment page.
5. After payment, PayMongo redirects to `/checkout/success?session_id=...` (success) or `/checkout/cancel?order_id=...` (cancelled).
6. **Simultaneously**, PayMongo sends a webhook to `POST /webhooks/paymongo`.

### How the PayMongo Webhook Works

1. The request arrives at `WebhookController@handlePaymongo`.
2. The signature in the `Paymongo-Signature` header is verified using **HMAC-SHA256** with the webhook secret key. If verification fails, a `403` is returned immediately.
3. The event is dispatched to a **queue job** (`ProcessPaymentWebhook`) to handle asynchronously.
4. The job checks idempotency (has this event been processed before?) using the payment ID.
5. On success:
   - The order's `payment_status` is set to `paid` and `paid_at` is timestamped.
   - Stock is decremented.
   - The Redis cart is cleared.

### How "Buy Now" (Direct Buy) Works

On the product detail page, "Buy Now" skips the cart entirely. It navigates to `/checkout?direct=1&product_id=X&variant_id=Y&quantity=1`. The checkout page reads these URL params and renders a single-item order summary, treating it as if that one item were in the cart. The backend creates the order from the URL params, not from the Redis cart.

---

## 6. Voucher System

### Overview

Vouchers follow a **two-step model**: first a user *claims* a voucher to their wallet, then *applies* it at checkout. This prevents claiming a voucher for later use after an order is already placed.

### How Vouchers Are Created / Generated

There are two voucher types:
- **Daily vouchers**: Auto-generated by the `GenerateDailyVouchers` Artisan command, scheduled to run daily at **16:01 UTC (midnight Philippines time)**. Each day a new batch of vouchers is created with a 24-hour expiry.
- **Special vouchers**: Created manually (by admin, or seeded).

Each voucher has:
- `code` — unique, human-readable string.
- `discount_type` — `percentage`, `fixed`, or `free_shipping`.
- `discount_value` — the amount or percentage.
- `max_discount` — cap for percentage discounts (e.g., max ₱200 off even if 20% of subtotal is higher).
- `min_spend` — minimum cart subtotal to be eligible.
- `total_quantity` — max number of times this voucher can be claimed across all users.
- `claimed_count` — current claim count (incremented on each claim).
- `expires_at` — expiry timestamp.

### How Claiming a Voucher Works

1. `POST /vouchers/claim` with `{ voucher_code }`.
2. `VoucherController@claim` checks:
   - The voucher is active and not expired.
   - `claimed_count < total_quantity` (global limit not reached).
   - No existing `VoucherClaim` for this user + voucher combination with status `claimed` or `used`.
3. A `VoucherClaim` record is created with `status: 'claimed'`.
4. `claimed_count` on the `Voucher` is incremented.

### How Applying a Voucher at Checkout Works

1. `POST /vouchers/apply` with `{ code, subtotal }`.
2. `VoucherController@apply` checks:
   - The voucher exists and is active/unexpired.
   - The user has a `VoucherClaim` with `status: 'claimed'` for this voucher (must have claimed it first).
   - `subtotal >= voucher.min_spend`.
3. The discount is calculated:
   - **Fixed**: `discount = voucher.discount_value` (capped at subtotal if greater).
   - **Percentage**: `discount = subtotal * (voucher.discount_value / 100)`, capped at `max_discount`.
   - **Free Shipping**: `discount = 0` on subtotal, but `grants_free_shipping: true` is returned.
4. The response includes `{ discount, free_shipping, new_subtotal }`. The checkout page applies this to the displayed totals.

### How Voucher Usage is Tracked

When an order is successfully placed with a voucher:
- The `VoucherClaim` record's `status` is updated to `'used'` and `order_id` is set.
- The `Order` record stores `voucher_id` and the `discount` amount.

---

## 7. Order Management

### Overview

Orders flow through a defined status lifecycle. Customers can cancel before seller confirmation. Sellers update statuses as they fulfill the order. Timestamps are recorded at each key state transition.

### How the Order Lifecycle Works

```
pending_confirmation
       ↓ (seller confirms)
   confirmed
       ↓ (seller starts packing)
  processing
       ↓ (payment confirmed via webhook, for online orders)
     paid
       ↓ (seller dispatches)
   shipped
       ↓ (delivered to buyer)
  delivered
```

Alternative terminal states:
- `cancelled` — customer cancels before confirmation, or seller cancels.
- `payment_failed` — online payment was not completed.

The `Order` model tracks individual timestamps (`confirmed_at`, `paid_at`, `shipped_at`, `delivered_at`, `cancelled_at`) alongside the current `status` field.

### How Order Numbers Are Generated

The `Order::generateOrderNumber()` method uses PHP's `uniqid()` with the prefix `SARI-`, resulting in a unique string like `SARI-6614a3f2a1b2c`. This is stored in the `order_number` column (unique index).

### How Order Cancellation Works

1. Customer sends `POST /orders/{order}/cancel` with `{ reason, notes }`.
2. `OrderController@cancel` checks via `OrderPolicy` that the order belongs to the authenticated user.
3. It verifies the order is still in `pending_confirmation` status (can't cancel a confirmed/shipped order).
4. `reason` must be one of the enum values: `changed_mind`, `found_better_deal`, `ordered_by_mistake`, `delivery_too_long`, `want_to_change_order`, `other`.
5. If `reason === 'other'`, the `notes` field is required.
6. The order `status` is updated to `cancelled` and `cancelled_at` is timestamped.
7. **Stock is restored**: For each `OrderItem`, the corresponding `product.stock_quantity` and `product_variant.stock_quantity` are incremented back.

### How Business Order Management Works

Business users see only orders that contain their products. The query filters `OrderItem` records by `product.store_id === authenticated user's store.id`. Sellers can:
- **Confirm**: Sets status to `confirmed`, records `confirmed_at`.
- **Update to Processing/Shipped/Delivered**: Each transition records the appropriate timestamp column.

---

## 8. Product Reviews & Ratings

### Overview

Reviews are **verified-purchase only**. The system checks the database before allowing a review submission. Rating aggregates are stored directly on the `Product` model for fast reads.

### How Purchase Verification Works

Before showing the review form, the frontend calls the product detail endpoint, which returns `can_review: bool` and `user_review: Review|null` in the response. The backend computes `can_review` by checking:
```sql
SELECT 1 FROM order_items oi
JOIN orders o ON o.id = oi.order_id
WHERE o.user_id = :userId
  AND oi.product_id = :productId
  AND o.status = 'delivered'
LIMIT 1
```
Only if a delivered order containing this product exists for the logged-in user is `can_review` set to `true`.

### How Submitting a Review Works

1. `POST /products/{product}/reviews` with `{ rating, comment }`.
2. `ReviewController@store` re-runs the purchase verification check server-side (not trusting the frontend).
3. It checks for a duplicate: `Review::where('user_id', userId)->where('product_id', productId)->exists()`. If found, returns `409 Conflict`.
4. The `Review` is created.
5. The `Product` model's `average_rating` and `review_count` are recalculated:
   - `review_count` is incremented by 1.
   - `average_rating` is recalculated using an SQL expression to avoid loading all reviews.

### How Rating Aggregation Works

Rather than computing the average rating at query time (expensive for products with many reviews), the `products` table has `average_rating` (decimal) and `review_count` (integer) columns that are updated whenever a review is created or deleted. This is an **optimistic aggregation** pattern: reads are O(1), writes do slightly more work.

### How Privacy Is Protected

Review author names are never stored in the `reviews` table. The `user_name` is derived at query time by joining with the `users` table and formatting as `first_name + last_name[0] + '.'` (e.g., "Maria S."). This is done in the API response transform, not stored.

---

## 9. Wishlist

### Overview

The wishlist is a simple `wishlists` pivot table linking `user_id` to `product_id`. The toggle pattern means a single endpoint handles both add and remove.

### How Toggling the Wishlist Works

1. `POST /wishlist/{product}` is called (same endpoint for add and remove).
2. `WishlistController@toggle` calls `$user->wishlist()->toggle($product->id)` using Eloquent's `toggle()` helper.
3. `toggle()` checks if the record exists: if it does, it's deleted; if not, it's created.
4. The response includes `{ wishlisted: true|false }` so the frontend can update the heart icon state without re-fetching.

### How the Wishlist Page Works

`GET /wishlist` returns all products in the user's wishlist with their full product data (image, name, price, slug) joined via the pivot table. The frontend renders these as product cards with a "Remove" button that calls the toggle endpoint.

---

## 10. User Profile

### Overview

The profile page manages two sections: personal information (name, phone) and saved address. The address is stored as a **JSONB field** on the `users` table rather than a separate `addresses` table, since each user has at most one default address.

### How Editing Personal Info Works

1. The frontend renders fields in display mode by default.
2. Clicking "Edit" switches them to `<input>` fields pre-filled with current values.
3. On save, `PUT /profile` is sent with `{ first_name, last_name, phone }`.
4. `ProfileController@update` validates and updates the `User` model.
5. The `useAuth` hook re-fetches the user object to update the navbar and any other consumers.

### How the Saved Address Works

The `default_address` column in `users` is a JSONB object:
```json
{
  "label": "Home",
  "line1": "123 Rizal St.",
  "line2": "",
  "city": "Cebu City",
  "province": "Cebu",
  "zip": "6000"
}
```
On the checkout page, if a saved address exists, the shipping form is pre-filled with its values. The user can still edit the fields before placing the order — the checkout form stores its own local copy of the address; changes at checkout do NOT overwrite the saved profile address.

---

## 11. AI Recommendations

### Overview

Recommendations use **Recombee** (a managed collaborative filtering service) as the primary engine, with a fallback to local database queries if Recombee is unavailable or not configured.

### How the Home Page "Recommended For You" Works

- **Logged-in users**: `GET /recommendations/for-you` calls `RecommendationService::recommendForUser($userId)`, which calls the Recombee API's `RecommendItemsToUser` endpoint. Recombee uses the user's interaction history (views, cart adds, purchases) to rank products.
- **Anonymous users**: The endpoint falls back to popular products (highest `view_count`).
- **Fallback**: If the Recombee API is unavailable, the service catches the exception and queries the local DB for `is_featured` products or top-viewed products.

### How Interaction Tracking Works

Every time a logged-in user views a product detail page:
1. `ProductController@show` dispatches a `SyncInteractionToRecombee` job to the **RabbitMQ queue**.
2. The job (processed asynchronously by a queue worker) calls `RecommendationService::addDetailView($userId, $productId)`, which sends a `DetailView` event to the Recombee API.

Similarly, adding to cart dispatches an `AddCartAddition` event, and placing an order dispatches `AddPurchase` events. This builds the user's preference model in Recombee over time.

### How Similar Products Work

On each product detail page, `GET /recommendations/similar/{product}` calls `RecommendationService::recommendSimilar($productId)`. Recombee returns items with similar attributes/interaction patterns. The fallback queries the same `category_id` and excludes the current product.

---

## 12. Business Dashboard

### Overview

Business users manage their store, products, and orders through a dedicated dashboard at `/business/*`. All business routes require the `role:business|admin` middleware. Every data-access query is scoped to the authenticated user's `store_id`, preventing one seller from accessing another's data.

### How the Dashboard Stats Work

`GET /business/dashboard` aggregates:
- `total_products`: `Product::where('store_id', $store->id)->count()`
- `active_products`: adds `->where('status', 'active')`
- `total_orders`: counts distinct `Order` IDs in `OrderItems` for this store's products
- `revenue`: sums `OrderItem.total_price` for delivered orders
- `pending_orders`: orders with `status = 'pending_confirmation'`
- `low_stock`: products where `stock_quantity < 10` (configurable threshold)

### How Product Creation Works

1. Business user submits the product form with name, description, category, price, SKU, stock, images, and option categories.
2. `POST /business/products` hits `Business/ProductController@store`.
3. A URL-safe `slug` is auto-generated from the product name.
4. Images are uploaded to **Supabase Storage** (S3-compatible) via `ImageService`. The returned storage URL is stored in `product_images.url`.
5. If option categories are provided (e.g., `Size: [S, M, L]` and `Color: [Red, Blue]`), the backend generates all combinations:
   ```php
   // Cartesian product of all option arrays
   $variants = array_combinations($optionCategories);
   // Creates: [S/Red, S/Blue, M/Red, M/Blue, L/Red, L/Blue]
   ProductVariant::insert($variants);
   ```
6. Each variant inherits the base price unless overridden.

### How Image Upload and Proxying Works

Supabase Storage can have CORS restrictions that prevent the browser from loading images directly. To work around this, an **image proxy** is used:
- Images are served via `GET /images/{imageId}` through `ImageProxyController`.
- The controller fetches the image from the Supabase URL on the server side and streams it back to the client, bypassing CORS.
- The frontend uses `/images/{id}` URLs rather than direct Supabase URLs.

### How Business-Level IDOR Prevention Works

When a business user tries to edit or delete a product, the `ProductPolicy@update` (and `@delete`) methods are invoked:
```php
public function update(User $user, Product $product): bool
{
    return $user->store?->id === $product->store_id || $user->hasRole('admin');
}
```
This means a business user can only modify products that belong to their own store. Attempting to modify another store's product via the API returns `403 Forbidden`.

---

## 13. Admin Panel

### Overview

Admin routes are protected by `role:admin` middleware. Admins have no resource-level restrictions — they can read and modify any data on the platform.

### How Admin Dashboard Stats Work

`GET /admin/dashboard` runs platform-wide aggregates:
- Total users (by role), total products, total orders, total revenue, recent orders list.

These queries run directly on the full tables without `store_id` scoping.

### How User Management Works

`GET /admin/users` returns all users with their roles. Admins can:
- **Update roles**: `PUT /admin/users/{user}` with `{ role }` calls Spatie's `syncRoles([$role])`.
- **Delete users**: `DELETE /admin/users/{user}` soft-deletes (sets `deleted_at`).

The `deleted_at` soft-delete means the user's data is preserved in the database for audit purposes. Soft-deleted users cannot log in.

### How Inventory Management Works

`GET /admin/inventory` returns all products with their stock levels. `PUT /admin/inventory/{product}` with `{ stock_quantity }` directly updates the product's `stock_quantity` column. This is a direct override, not an increment/decrement.

---

## 14. UI/UX & Design System

### Overview

The entire frontend is built with **Next.js (App Router)** and **TailwindCSS**. A custom color palette (`sari-*`) and the **Montserrat** font are applied globally.

### How Skeleton Loading States Work

Every data-fetching page initializes a `loading` state as `true`. While `loading === true`, the page renders `<SkeletonCard />` components — grey animated placeholders with the same layout as actual content. When the API response arrives, `loading` is set to `false` and the real content replaces the skeletons. The animation is a CSS `@keyframes` pulse applied via the Tailwind `animate-pulse` class.

### How Toast Notifications Work

A global `ToastContext` (`frontend/src/contexts/`) maintains an array of active toasts. Any component can call `addToast('success', 'Title', 'Message')`. The `Toast` component renders all active toasts in a fixed position (bottom-right). Each toast has a `setTimeout` for **4 seconds**, after which `removeToast(id)` is called, causing the toast to fade out via a CSS transition.

### How the Sticky Navbar with Glassmorphism Works

The Navbar component uses Tailwind class `sticky top-0 z-50` to stay on screen while scrolling. The glass effect is `backdrop-blur-md bg-white/70` — a semi-transparent white background with a backdrop blur filter applied.

### How the Mobile Navigation Works

The Navbar tracks `isMenuOpen: boolean` state. On small screens (`md:hidden`), the hamburger button toggles this state. When `isMenuOpen === true`, a full-height menu panel slides in from the side using a CSS transform transition (`translate-x-0` vs `-translate-x-full`).

### How Empty States Work

When a page renders with no data (empty cart, no orders, no wishlist items), the component renders a dedicated empty state component instead of the normal list. The empty state typically includes an SVG illustration, a heading, a subtitle, and a CTA button (e.g., "Continue Shopping"). This prevents the page from looking broken.

### How Image Fallback Works

Every `<img>` tag on the platform has an `onError` handler:
```jsx
onError={(e) => { e.currentTarget.src = '/placeholder.svg'; }}
```
If the image URL fails to load (broken link, network error), the browser fires `onError`, and the handler replaces the `src` with a local placeholder SVG.

---

## 15. Security & Performance

### Overview

Security is layered: CSRF at the transport level, rate limiting at the API level, input validation at the controller level, authorization policies at the resource level, and soft deletes at the data level.

### How CSRF Protection Works

Every mutating request (POST, PUT, DELETE) requires a valid CSRF token. Laravel Sanctum issues this token via `GET /sanctum/csrf-cookie`, which sets an `XSRF-TOKEN` cookie. The Axios instance in `frontend/src/lib/api.ts` automatically reads this cookie and attaches it as the `X-XSRF-TOKEN` header on every request. If the token is missing or invalid, Laravel returns `419 Page Expired`.

### How Rate Limiting Works

Four throttle groups are defined in the backend:
- **`auth`** — 5 requests/minute per IP (on `/login`, `/register`, password reset)
- **`search`** — 30 requests/minute per IP (on `/search`)
- **`public-api`** — Relaxed limits for browsing endpoints
- **`authenticated`** — Standard limits for logged-in user operations

When a limit is exceeded, the server responds with `429 Too Many Requests` and a `Retry-After` header.

### How Server-Side Pricing Prevents Manipulation

The frontend sends `product_id`, `quantity`, and `variant_id` to the checkout endpoint — never the price. The backend always fetches the price from the database:
```php
$unitPrice = $variant ? $variant->price : $product->base_price;
$totalPrice = $unitPrice * $quantity;
```
This means even if a user intercepts and modifies the network request to send `price: 1`, the server ignores that value and uses the correct database price.

### How IDOR Prevention Works

Laravel Authorization Policies are registered for every protected resource:
- `OrderPolicy`: `view()`, `cancel()` — checks `$order->user_id === $user->id`.
- `ProductPolicy`: `update()`, `delete()` — checks `$product->store_id === $user->store->id`.

These policies are enforced via `$this->authorize(...)` calls in controllers. No route-level parameter filtering is needed because authorization happens inside the action.

### How Soft Deletes Work

`Product` and `Order` models use Laravel's `SoftDeletes` trait. Instead of `DELETE FROM products WHERE id = ?`, a soft delete executes `UPDATE products SET deleted_at = NOW() WHERE id = ?`. Eloquent's default scopes automatically filter out soft-deleted records from queries (they add `WHERE deleted_at IS NULL`). Soft-deleted records can be restored with `restore()` or permanently deleted with `forceDelete()`.

### How Product Listing Cache Works

When `ProductController@index` is called:
1. A cache key is constructed: `products_v{version}_{md5(queryParams)}`.
2. Laravel checks Redis for this key.
3. **Cache hit**: Returns the cached JSON response immediately (no DB query).
4. **Cache miss**: Runs the Eloquent query, stores the result in Redis with a 5-minute TTL, returns the result.
5. **Invalidation**: When any product is created, updated, or deleted, the `version` key in Redis is incremented. All old cache keys (which reference the old version number) naturally become unused.

### How Database Performance Indexes Work

The migration `add_performance_indexes_to_products_table` creates composite indexes on frequently queried column combinations:
- `(category_id, status)` — for filtered product listings
- `(business_id, status)` — for business dashboard queries
- `(status, created_at)` — for order history queries
- `(user_id, created_at)` — for user-scoped order listing

These indexes turn table scans (O(n)) into index seeks (O(log n)), which is critical for product and order listing performance.

### How Password Security Works

Registration uses `bcrypt` with a **cost factor of 12** (set in `config/hashing.php`). A cost factor of 12 means each hash computation takes ~250ms on modern hardware, making brute-force attacks computationally expensive. The `password` column stores only the hashed string — plaintext is never persisted anywhere.
