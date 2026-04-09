# Module 29: Image Fix, Montserrat Font, Dynamic Delivery Fee & Star Reviews

**Date:** 2026-04-08
**Status:** Planned

---

## Overview

This module addresses four tasks:

1. **Fix product images not showing** in the main menu / product listings
2. **Switch all fonts to Montserrat** across the entire frontend
3. **Implement a dynamic delivery fee system** based on distance (km) between store and buyer
4. **Implement a star review system** with optional comments, limited to verified buyers

---

## Plugin Usage

- Use the **`superpowers`** plugin throughout implementation for brainstorming, TDD, debugging, verification, and code review.
- Use the **`frontend-design`** plugin for all frontend UI components — especially the review form, star rating display, delivery fee breakdown in checkout, and any new design-heavy components.

---

## Task 1: Fix Product Images Not Showing

### Problem

Product images uploaded during product creation are not displaying on the main menu / product listing pages. Images are uploaded to Supabase Storage via `ImageService` which returns full URLs.

### Root Cause Investigation

Debug in this order:

1. **Check API response** — Hit `GET /api/products` and inspect the `primary_image` field. Verify the URL is present and is a valid, accessible Supabase URL.
2. **Check `is_primary` flag** — In `ProductController::store()`, the first uploaded image is marked `is_primary => true`. Verify existing products in the database actually have an image with `is_primary = 1`.
3. **Check `ProductResource`** — The `primary_image` key uses `whenLoaded('primaryImage')`. The `index()` method loads `primaryImage` via `->with('primaryImage', 'category')`. Confirm the relationship name matches.
4. **Check URL construction** — `ProductResource` prepends `asset('storage/')` for non-http URLs. Since `ImageService::upload()` returns full Supabase URLs (starting with `https://`), this prefix should NOT apply. Verify no double-prefixing is happening.
5. **Check frontend** — `ProductCard.tsx` reads `product.primary_image?.url`. Confirm the API JSON key matches (`primary_image` not `primaryImage`).

### Fix Steps

1. Identify the broken link in the chain from the investigation above.
2. Fix the root cause (likely one of: missing `is_primary` flag on existing images, URL construction issue, or relationship loading issue).
3. If existing products have images but none marked `is_primary`, write a one-time migration or artisan command to set the first image of each product as primary.
4. Verify images display on: homepage recommendations, product listing page (`/products`), product detail page, business dashboard product list.

### Files Likely Affected

- `backend/app/Http/Resources/ProductResource.php`
- `backend/app/Http/Controllers/ProductController.php`
- `backend/app/Models/Product.php` (relationship definition)
- `frontend/src/components/ProductCard.tsx`
- Possibly a new migration if `is_primary` data needs fixing

---

## Task 2: Switch All Fonts to Montserrat

### Current State

- **Body font**: `Inter` (applied via `inter.className` on `<html>`)
- **Display font**: `DM_Serif_Display` (applied via CSS variable `--font-display`)
- Both imported from `next/font/google` in `frontend/src/app/layout.tsx`

### Implementation Steps

1. **Update `layout.tsx`**:
   - Remove `Inter` and `DM_Serif_Display` imports
   - Import `Montserrat` from `next/font/google` with appropriate weights (400, 500, 600, 700, 800)
   - Apply `montserrat.className` to `<html>` for the body font
   - Set `--font-display` CSS variable to Montserrat as well (or remove the display font variable entirely and use Montserrat everywhere)

2. **Update Tailwind config** (`tailwind.config.ts` or `tailwind.config.js`):
   - Update the `fontFamily.display` value to reference Montserrat if the `--font-display` variable approach changes
   - Ensure `font-display` utility class maps to Montserrat

3. **Verify** all pages render with Montserrat — check headings (`font-display` class), body text, buttons, form inputs, navbar, footer.

### Files Affected

- `frontend/src/app/layout.tsx`
- `frontend/tailwind.config.ts` (or `.js`)
- `frontend/src/app/globals.css` (if font variables are defined there)

---

## Task 3: Dynamic Delivery Fee (Distance-Based)

### Design

Calculate delivery fee based on straight-line distance (Haversine formula) between the store's location and the buyer's shipping address, with a 1.3x road-distance multiplier.

**Rate structure:**
- Base rate: **₱30** for the first **5 km**
- Per-km rate: **₱2** for each additional km beyond 5 km (rounded up to nearest km)
- Example: 12 km distance = ₱30 + (7 x ₱2) = **₱44**

**Why Haversine instead of Google Maps API:**
- Free, no API key, no billing
- For fee estimation, straight-line distance x 1.3 multiplier is sufficient
- No external service dependency

### Backend Implementation

#### Step 1: Add coordinates to stores

Create migration `0019_add_coordinates_to_stores.php`:

```
stores table:
  + latitude DECIMAL(10, 8) NULLABLE
  + longitude DECIMAL(11, 8) NULLABLE
```

Update `Store` model `$fillable` to include `latitude`, `longitude`.

#### Step 2: Create DeliveryFeeService

Create `backend/app/Services/DeliveryFeeService.php`:

- `calculateFee(float $storeLat, float $storeLng, float $buyerLat, float $buyerLng): float`
  - Uses Haversine formula to compute straight-line distance in km
  - Multiplies by 1.3 road-distance factor
  - Applies rate: ₱30 base for first 5km, ₱2 per additional km (ceil)
  - Returns fee in PHP pesos as float
- `geocodeAddress(array $address): ?array`
  - Calls OpenStreetMap Nominatim API (free, no key required)
  - Sends: `line1, city, state, postal_code, country`
  - Returns `['lat' => float, 'lng' => float]` or `null` on failure
  - Rate-limit: Nominatim requires max 1 request/second and a User-Agent header

#### Step 3: Create delivery fee estimation endpoint

`POST /api/delivery-fee/estimate`

Request body:
```json
{
  "product_id": 123,
  "shipping_address": {
    "line1": "...",
    "city": "...",
    "state": "...",
    "postal_code": "...",
    "country": "PH"
  }
}
```

Response:
```json
{
  "distance_km": 12.4,
  "delivery_fee": 44.00,
  "breakdown": {
    "base_fee": 30.00,
    "base_km": 5,
    "additional_km": 8,
    "per_km_rate": 2.00,
    "additional_fee": 14.00
  }
}
```

The product_id is needed to look up the store's coordinates. For cart checkout (multiple stores), calculate per-store and sum or use the highest fee.

#### Step 4: Integrate into CheckoutController

- In `CheckoutController`, before creating the order, call `DeliveryFeeService::calculateFee()` to compute the shipping fee
- Replace the hardcoded `'shipping_fee' => 0` with the calculated value
- Add the fee to the order total: `total = subtotal + shipping_fee + tax`
- If geocoding fails, fall back to a default flat rate (e.g., ₱100)

#### Step 5: Update store setup to capture coordinates

- Add latitude/longitude fields to the store creation/update forms
- Optionally: auto-geocode the store's text address when saved

### Frontend Implementation

> **Use the `frontend-design` plugin for all checkout UI changes.**

#### Step 1: Store setup — coordinates input

In the business store setup page (`frontend/src/app/business/store/page.tsx`):
- Add latitude and longitude input fields (numeric)
- Optionally add a "Get from address" button that geocodes the store's text address
- Save coordinates when store is created/updated

#### Step 2: Checkout — delivery fee display

In `frontend/src/app/checkout/page.tsx`:
- After the user fills in their shipping address, call `POST /api/delivery-fee/estimate` to get the fee
- Display the delivery fee as a line item in the Order Summary section (between Subtotal and Total)
- Show a breakdown tooltip/expandable: "Base fee ₱30 (first 5km) + ₱X (Ykm x ₱2/km)"
- Update the total to include the delivery fee
- If estimation fails, show "Delivery fee: ₱100 (estimated)" as fallback

### Files Affected

- `backend/database/migrations/0019_add_coordinates_to_stores.php` (new)
- `backend/app/Models/Store.php`
- `backend/app/Services/DeliveryFeeService.php` (new)
- `backend/app/Http/Controllers/CheckoutController.php`
- `backend/app/Http/Controllers/DeliveryFeeController.php` (new)
- `backend/routes/api.php`
- `frontend/src/app/business/store/page.tsx`
- `frontend/src/app/checkout/page.tsx`

---

## Task 4: Star Review System

### Design

- Users can rate a product 1-5 stars with an optional text comment
- One review per user per product (enforced by unique DB constraint + server validation)
- Only users who have a **delivered** order containing that product can leave a review
- Products display average rating and review count (cached on the products table for performance)

### Backend Implementation

#### Step 1: Create reviews migration

`0020_create_reviews_table.php`:

```
reviews table:
  id BIGINT PK
  user_id BIGINT FK -> users
  product_id BIGINT FK -> products
  rating TINYINT UNSIGNED (1-5)
  comment TEXT NULLABLE
  created_at TIMESTAMP
  updated_at TIMESTAMP

  UNIQUE INDEX (user_id, product_id)
```

#### Step 2: Add cached rating columns to products

`0021_add_rating_columns_to_products.php`:

```
products table:
  + average_rating DECIMAL(3, 2) DEFAULT 0
  + review_count INT UNSIGNED DEFAULT 0
```

#### Step 3: Create Review model

`backend/app/Models/Review.php`:

- `$fillable`: `user_id`, `product_id`, `rating`, `comment`
- Relationships: `belongsTo(User)`, `belongsTo(Product)`

Update `Product` model:
- Add `hasMany(Review::class)` relationship
- Add `average_rating` and `review_count` to casts

Update `User` model:
- Add `hasMany(Review::class)` relationship

#### Step 4: Create ReviewController

`backend/app/Http/Controllers/ReviewController.php`:

**`POST /api/products/{product}/reviews`** — Create a review
- Validate: `rating` required integer 1-5, `comment` optional string max 1000 chars
- Check user hasn't already reviewed this product (409 Conflict if so)
- Check user has a delivered order with this product:
  ```php
  Order::where('user_id', auth()->id())
      ->where('status', 'delivered')
      ->whereHas('items', fn($q) => $q->where('product_id', $product->id))
      ->exists()
  ```
- Create the review
- Update cached `average_rating` and `review_count` on the product
- Return the review

**`GET /api/products/{product}/reviews`** — List reviews for a product
- Paginated, ordered by newest first
- Include user name (first name + last initial for privacy)
- Include whether the current auth user has already reviewed

**`DELETE /api/products/{product}/reviews`** — Delete own review
- User can only delete their own review
- Recalculate cached rating on product

#### Step 5: Update ProductResource

- Add `average_rating` and `review_count` fields to the resource output
- Add `user_review` field (current user's review if authenticated, null otherwise)

#### Step 6: Add routes

```php
Route::get('/products/{product}/reviews', [ReviewController::class, 'index']);
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/products/{product}/reviews', [ReviewController::class, 'store']);
    Route::delete('/products/{product}/reviews', [ReviewController::class, 'destroy']);
});
```

### Frontend Implementation

> **Use the `frontend-design` plugin for all review UI components.**

#### Step 1: Update Product type

In `frontend/src/types/product.ts`:
- Add `average_rating: number` and `review_count: number` to the `Product` interface
- Create a new `Review` interface: `id`, `user_name`, `rating`, `comment`, `created_at`

#### Step 2: Update ProductCard — real ratings

In `frontend/src/components/ProductCard.tsx`:
- Remove the fake deterministic rating calculation (lines 31-32)
- Use `product.average_rating` and `product.review_count` from API data
- Show "No reviews yet" if `review_count === 0`

#### Step 3: Product detail page — review section

In `frontend/src/app/products/[slug]/page.tsx`:
- Add a "Customer Reviews" section below the product details
- Show average rating with star display and review count
- List individual reviews with: star rating, user name, comment (if any), date
- Paginate reviews (load more button)

#### Step 4: Review form component

Create `frontend/src/components/reviews/ReviewForm.tsx`:
- Interactive star picker (click to set 1-5 stars)
- Optional comment textarea
- Submit button
- Only shown if:
  - User is logged in
  - User has not already reviewed this product
  - User has a delivered order with this product (check via API response flag)
- Show appropriate messages:
  - Not logged in: "Sign in to leave a review"
  - No purchase: "Purchase this product to leave a review"
  - Already reviewed: Show their existing review with option to delete

#### Step 5: Star rating display component

Create `frontend/src/components/reviews/StarRating.tsx`:
- Reusable component for displaying star ratings
- Supports: full stars, empty stars, half stars (based on decimal average)
- Two modes: display-only (product card) and interactive (review form)

### Files Affected

- `backend/database/migrations/0020_create_reviews_table.php` (new)
- `backend/database/migrations/0021_add_rating_columns_to_products.php` (new)
- `backend/app/Models/Review.php` (new)
- `backend/app/Models/Product.php`
- `backend/app/Models/User.php`
- `backend/app/Http/Controllers/ReviewController.php` (new)
- `backend/app/Http/Resources/ProductResource.php`
- `backend/routes/api.php`
- `frontend/src/types/product.ts`
- `frontend/src/components/ProductCard.tsx`
- `frontend/src/components/reviews/ReviewForm.tsx` (new)
- `frontend/src/components/reviews/StarRating.tsx` (new)
- `frontend/src/app/products/[slug]/page.tsx`

---

## Implementation Order

Execute tasks in this order to minimize conflicts:

1. **Task 1 — Fix product images** (standalone bug fix, quick win)
2. **Task 2 — Montserrat font** (standalone, affects all pages visually)
3. **Task 3 — Dynamic delivery fee** (backend-heavy, touches checkout)
4. **Task 4 — Star review system** (largest feature, new models/controllers/components)

---

## Testing Checklist

### Task 1
- [ ] Product images display on homepage recommendations
- [ ] Product images display on `/products` listing
- [ ] Product images display on product detail page
- [ ] Product images display in business dashboard product list
- [ ] Newly created products show images immediately

### Task 2
- [ ] All text across the app renders in Montserrat
- [ ] Headings (font-display) use Montserrat
- [ ] Body text uses Montserrat
- [ ] Font weights display correctly (regular, medium, semibold, bold)

### Task 3
- [ ] Store can save latitude/longitude coordinates
- [ ] Delivery fee estimate endpoint returns correct calculation
- [ ] 5km distance = ₱30 fee
- [ ] 12km distance = ₱30 + (8 x ₱2) = ₱46 fee (rounded up km)
- [ ] Checkout page shows delivery fee after address entry
- [ ] Order total includes delivery fee
- [ ] Fallback fee works when geocoding fails
- [ ] Fee displays in order summary on orders page

### Task 4
- [ ] User with delivered order can submit a review (1-5 stars + optional comment)
- [ ] User without a purchase cannot submit a review (shows message)
- [ ] User cannot submit more than one review per product (409 error)
- [ ] Average rating and review count display on ProductCard
- [ ] Reviews list displays on product detail page
- [ ] User can delete their own review
- [ ] Product average_rating updates after review create/delete
- [ ] Unauthenticated users see reviews but cannot submit
