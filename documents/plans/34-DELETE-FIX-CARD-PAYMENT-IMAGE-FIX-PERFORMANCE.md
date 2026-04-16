# Module 34 — Product Delete Fix, Card Payment, Image Fix & Performance Optimization

> **For agentic workers:** This is a self-contained implementation plan.
> Use checkbox (`- [ ]`) syntax for tracking progress.
> **IMPORTANT:** Use the `superpowers` plugin skills throughout execution (brainstorming, test-driven-development, systematic-debugging, verification-before-completion).
> Use the `frontend-design` plugin skill for all frontend/UI component work (payment option UI, image fallback UI).

**Estimated Time:** 6–10 hours

---

## Overview

This module addresses four issues discovered in the current SARI e-commerce platform:

| # | Issue | Severity | Category |
|---|-------|----------|----------|
| 1 | Product delete throws Typesense API key error (but still deletes) | Medium | Bug Fix |
| 2 | No card payment option at checkout | High | New Feature |
| 3 | Uploaded product images show as white/broken in the store | High | Bug Fix |
| 4 | System responding slowly — performance optimization needed | Medium | Optimization |

---

## Task 1: Fix Product Delete Typesense Error

### Problem
When deleting a product, the user sees: `"Failed to delete product Forbidden - a valid x-typesense-api-key header must be sent."` The product still deletes from the database (soft delete via Eloquent) because the Typesense error is non-fatal — but the error message surfaces to the frontend, confusing the user.

### Root Cause
The `Product` model uses Laravel Scout's `Searchable` trait. The `shouldBeSearchable()` method only guards **indexing** (creating/updating documents in Typesense). When a product is **deleted**, Scout still attempts to call `unsearchable()` to remove the document from Typesense, regardless of `shouldBeSearchable()`. If the Typesense API key is missing or invalid, this throws an HTTP 403 error.

### Relevant Files
- `backend/app/Models/Product.php` — Searchable trait, `shouldBeSearchable()`
- `backend/app/Http/Controllers/ProductController.php` — `destroy()` method (line 188–193)
- Frontend product management page (wherever delete is triggered)

### Implementation Steps

> **Skill:** Use `superpowers:systematic-debugging` to verify root cause before fixing.

- [ ] **1.1** Confirm the error by tracing the delete flow: `ProductController::destroy()` → `$product->delete()` → Scout `Searchable` trait fires `unsearchable()` → Typesense 403.
- [ ] **1.2** Wrap the delete in `Product::withoutSyncingToSearch()` in `ProductController::destroy()`, matching the pattern already used in `store()` and `update()`:
  ```php
  public function destroy(Request $request, Product $product): JsonResponse
  {
      $this->authorize('delete', $product);
      Product::withoutSyncingToSearch(function () use ($product) {
          $product->delete();
      });
      return response()->json(['message' => 'Product deleted']);
  }
  ```
- [ ] **1.3** Verify the frontend error handling — ensure the delete request's `.catch()` block correctly distinguishes between a true failure and this spurious Typesense error. After the fix, the response should be a clean 200 with no error.
- [ ] **1.4** Test: delete a product and confirm no error toast appears, product is removed from the listing.

### Acceptance Criteria
- Deleting a product returns a clean 200 JSON response with no Typesense errors.
- The product is soft-deleted from the database.
- No error toast/message is shown to the user.

---

## Task 2: Add Card Payment Option via PayMongo

### Problem
The checkout page currently only offers two payment methods: **Cash on Delivery (COD)** and **QR PH**. There is no option for card payments (Visa/Mastercard), even though the PayMongo integration already supports it on the backend.

### Current State
- **Backend (`PaymentService`):** Already supports `['card', 'gcash']` as payment method types. The `createCheckoutSession()` method accepts a `$paymentMethods` array parameter.
- **Backend (`CheckoutController`):** The `match` statement on `$paymentMethod` routes `'qrph'` to `['qrph']` and `default` to `['card', 'gcash']`. There is no explicit `'card'` case.
- **Frontend (`checkout/page.tsx`):** The `PaymentMethod` type is `'cod' | 'qrph'`. Only two buttons are rendered. No card option exists.

### Relevant Files
- `backend/app/Http/Controllers/CheckoutController.php` — `createSession()`, payment method matching (line 161–163)
- `backend/app/Http/Requests/CheckoutRequest.php` — validation rules for `payment_method`
- `frontend/src/app/checkout/page.tsx` — `PaymentMethod` type, payment method buttons (lines 29, 472–536)
- `backend/app/Services/PaymentService.php` — `createCheckoutSession()`
- `backend/app/Http/Controllers/WebhookController.php` — webhook handling for payment confirmation

### Implementation Steps

> **Skill:** Use `superpowers:test-driven-development` for backend changes.
> **Skill:** Use `frontend-design:frontend-design` for the card payment button UI to match the existing design system.

#### Backend

- [ ] **2.1** Update `CheckoutRequest.php` — add `'card'` to the `payment_method` validation rule:
  ```php
  'payment_method' => 'required|in:cod,qrph,card',
  ```
- [ ] **2.2** Update `CheckoutController::createSession()` — add explicit `'card'` case in the payment method match:
  ```php
  $paymentMethods = match ($paymentMethod) {
      'qrph' => ['qrph'],
      'card' => ['card'],
      default => ['card', 'gcash'],
  };
  ```
- [ ] **2.3** Verify that `WebhookController` handles card payment confirmations the same way it handles QR PH — the PayMongo webhook payload structure should be identical for both. Confirm the `checkout_session.payment.paid` event is handled regardless of method.
- [ ] **2.4** Test the backend endpoint by sending a checkout request with `payment_method: 'card'` and verifying a PayMongo checkout URL is returned with only card as the available method.

#### Frontend

- [ ] **2.5** Update the `PaymentMethod` type in `checkout/page.tsx`:
  ```typescript
  type PaymentMethod = 'cod' | 'qrph' | 'card';
  ```
- [ ] **2.6** Add a third payment method button for "Card Payment" in the payment method section. Use the `CreditCard` icon from lucide-react. The grid should accommodate 3 options — change to `grid-cols-1 sm:grid-cols-3` or keep 2-column with wrapping.
  - Label: **"Card Payment"**
  - Subtitle: **"Visa / Mastercard"**
  - Icon: `CreditCard` (already imported)
  - Style: Match existing button pattern exactly (border-2, rounded-xl, sari gradient for selected state).
- [ ] **2.7** Ensure the checkout summary/place-order button text updates appropriately for card (e.g., "Pay with Card" instead of "Place Order" which is for COD).
- [ ] **2.8** After PayMongo returns a `checkout_url`, verify the redirect works and the user lands on the PayMongo-hosted card entry form.

#### End-to-End Testing

- [ ] **2.9** Test the full card payment flow:
  1. Add items to cart → go to checkout
  2. Fill in shipping address
  3. Select "Card Payment"
  4. Click "Pay with Card" → verify redirect to PayMongo
  5. Use PayMongo test card numbers (e.g., `4343434343434345` for Visa success, `4444444444444455` for declined) to verify both success and failure paths
  6. On success → verify webhook fires, order status updates to `paid`, stock is decremented, cart is cleared
  7. On failure/cancel → verify order stays `pending_confirmation`, user can retry, stock is NOT decremented
- [ ] **2.10** Test with direct buy flow (bypass cart) to ensure card payments work there too.
- [ ] **2.11** Verify the cancel URL works: when a user clicks "Back" on PayMongo's page, they return to `/checkout/cancel?order_id=X` and can see their order is still pending.

### Acceptance Criteria
- Checkout page shows 3 payment options: COD, QR PH, Card Payment.
- Selecting "Card Payment" and placing the order redirects to PayMongo's card entry form.
- Successful card payment triggers the webhook, updates order to `paid`, decrements stock, clears cart.
- Failed/cancelled card payment leaves the order in `pending_confirmation` and does not affect stock.
- PayMongo test cards work correctly in test mode.
- Direct buy + card payment works end-to-end.

---

## Task 3: Fix Product Images — Upload Not Reaching Supabase

### Problem
Product images uploaded through the business product creation flow **never reach Supabase Storage**. The bucket is confirmed empty. Despite this, a `product_images` record is created in the database with a URL — making it appear the upload succeeded. The image renders as a white box in the storefront because the URL points to a file that does not exist.

### Confirmed Root Cause
`ImageService::upload()` calls `Storage::disk('supabase')->put()` but **never checks the return value**. Laravel's S3 driver returns `false` on failure — it does not throw an exception by default (there is no `'throw' => true` on the supabase disk config). The code unconditionally constructs and returns a URL regardless of whether the upload succeeded, so the database gets a URL pointing to nothing.

The secondary question is **why** `put()` is returning `false` — this is most likely one of:
- Incorrect or missing `SUPABASE_ENDPOINT` env var (wrong S3-compatible endpoint format for Supabase)
- Wrong `SUPABASE_ACCESS_KEY` / `SUPABASE_SECRET_KEY` (Supabase uses the service role key as the S3 secret)
- Wrong `SUPABASE_BUCKET_NAME` or the bucket does not exist yet

### Relevant Files
- `backend/app/Services/ImageService.php` — upload logic, silent failure (line 24)
- `backend/config/filesystems.php` — Supabase S3 disk config (lines 63–73)
- `backend/.env` — `SUPABASE_ENDPOINT`, `SUPABASE_ACCESS_KEY`, `SUPABASE_SECRET_KEY`, `SUPABASE_PUBLIC_URL`, `SUPABASE_BUCKET_NAME`
- `backend/app/Http/Controllers/ProductController.php` — calls `ImageService::upload()`, lines 98–103
- `frontend/src/components/ProductCard.tsx` — image fallback chain (lines 28–49)

### Implementation Steps

> **Skill:** Use `superpowers:systematic-debugging` to confirm each sub-cause before fixing.

#### Step 1 — Diagnose the S3 connection failure

- [ ] **3.1** Enable `'throw' => true` temporarily on the supabase disk config in `filesystems.php` and attempt an upload. Read the actual exception message — it will identify exactly what is wrong (invalid credentials, wrong endpoint, unreachable host, etc.).

- [ ] **3.2** Verify the Supabase S3 credentials in `.env`. Supabase Storage uses S3-compatible access with these specific values:
  - `SUPABASE_ENDPOINT` must be: `https://<project-ref>.supabase.co/storage/v1/s3`
  - `SUPABASE_ACCESS_KEY` must be your Supabase project's **Access Key ID** (found in Supabase dashboard → Storage → S3 Access)
  - `SUPABASE_SECRET_KEY` must be the corresponding **Secret Access Key**
  - `SUPABASE_REGION` should be `ap-southeast-1` (or whichever region your project is in)
  - `SUPABASE_BUCKET_NAME` must exactly match the bucket name in your Supabase dashboard
  - `SUPABASE_PUBLIC_URL` must be: `https://<project-ref>.supabase.co/storage/v1/object/public/<bucket-name>`

- [ ] **3.3** Verify the bucket exists in the Supabase dashboard and is set to **Public**. If the bucket is private, uploads may succeed but URLs will require a signed token to access.

#### Step 2 — Fix the silent failure in ImageService

- [ ] **3.4** Fix `ImageService::upload()` to check the return value of `put()` and throw if it fails. Also switch from `file_get_contents()` to `putFileAs()` which handles file streams more reliably with S3:

  ```php
  public function upload(UploadedFile $file, string $directory = 'products'): string
  {
      $filename = $directory . '/' . Str::uuid() . '.' . $file->getClientOriginalExtension();

      $result = Storage::disk($this->disk)->putFileAs(
          $directory,
          $file,
          basename($filename),
          ['visibility' => 'public']
      );

      if ($result === false) {
          throw new \RuntimeException('Failed to upload image to storage. Check Supabase S3 credentials and bucket configuration.');
      }

      $publicUrl = rtrim(config('filesystems.disks.supabase.url'), '/');
      return $publicUrl . '/' . $filename;
  }
  ```

- [ ] **3.5** Update `ProductController::store()` and `update()` to handle the `RuntimeException` from `ImageService::upload()` — return a 500 error with a clear message rather than creating a product with a broken image URL.

- [ ] **3.6** Set `'throw' => true` permanently on the supabase disk in `filesystems.php` so S3 errors are never silently swallowed again:
  ```php
  'supabase' => [
      // ... existing config ...
      'throw' => true,
  ],
  ```

#### Step 3 — Fix the database URL construction

- [ ] **3.7** Verify the constructed URL format is correct after a successful upload. The `ImageService` currently does:
  ```
  SUPABASE_PUBLIC_URL + '/' + 'products/<uuid>.ext'
  ```
  If `SUPABASE_PUBLIC_URL` is `https://<project>.supabase.co/storage/v1/object/public/product-images`, the final URL should be:
  `https://<project>.supabase.co/storage/v1/object/public/product-images/products/<uuid>.ext`
  Confirm this URL opens correctly in a browser after an upload.

#### Step 4 — Fix the frontend fallback chain

- [ ] **3.8** The `ProductCard` fallback chain currently goes: direct URL → image proxy → placeholder SVG. The proxy at `/api/images/{id}` fetches the stored URL — if the stored URL is broken, the proxy will also fail. After the upload fix, the proxy becomes a useful redundancy. Verify the proxy is registered in `routes/api.php` and reachable.

- [ ] **3.9** Add `naturalWidth` validation in `ProductCard` to catch cases where an image URL returns HTTP 200 with non-image content (e.g., an HTML error page from Supabase), which won't trigger `onError`:
  ```tsx
  onLoad={(e) => {
    const img = e.currentTarget;
    if (img.naturalWidth === 0) {
      handleImageError();
    } else {
      setImageLoaded(true);
    }
  }}
  ```

#### Step 5 — Clean up existing broken records

- [ ] **3.10** Write an Artisan command to identify all `product_images` records whose URLs return non-200 responses (or whose filenames don't exist in Supabase). This gives a count of affected records.

- [ ] **3.11** For each broken image record, either:
  - Delete the `product_images` record (product will show placeholder), **or**
  - If the original file is somehow recoverable, re-upload it
  - At minimum, ensure broken URLs don't cause frontend errors.

#### Step 6 — End-to-end verification

- [ ] **3.12** Upload a new product with an image. Verify:
  1. The file appears in the Supabase bucket immediately after upload
  2. The stored URL in `product_images.url` is correct and opens in a browser
  3. The image renders correctly in the product listing (`ProductCard`)
  4. The image renders correctly on the product detail page
  5. The image proxy fallback at `/api/images/{id}` also returns the correct image

### Acceptance Criteria
- Files are confirmed to land in the Supabase bucket after upload.
- `ImageService::upload()` throws on failure instead of returning a broken URL.
- Newly uploaded product images display correctly in the storefront immediately.
- The `ProductCard` fallback chain correctly shows the placeholder only when no valid image exists.
- Existing broken `product_images` records are cleaned up or removed.

---

## Task 4: Performance Optimization

### Problem
The system feels slow and unresponsive. This task identifies and fixes the main performance bottlenecks across both backend and frontend.

### Relevant Files
- `backend/app/Http/Controllers/ProductController.php` — `index()`, N+1 queries
- `backend/app/Http/Controllers/CheckoutController.php` — `createSession()`, multiple DB queries inside transaction
- `backend/app/Services/CartService.php` — Redis cart operations
- `backend/routes/api.php` — middleware stack, rate limiters
- `frontend/src/app/page.tsx` — homepage
- `frontend/src/app/products/page.tsx` — product listing
- `frontend/src/components/ProductCard.tsx` — image loading behavior
- `frontend/src/contexts/CartContext.tsx` — cart state management

### Investigation & Implementation Steps

> **Skill:** Use `superpowers:systematic-debugging` to profile before optimizing — measure, don't guess.

#### Backend Optimization

- [ ] **4.1** **Audit N+1 queries** — Review all controllers that load products with relationships. Ensure `with()` eager loading covers all accessed relationships. Key areas:
  - `ProductController::index()` — currently loads `primaryImage`, `category`. Check if `variants` or `store` are accessed in the `ProductResource` without being eager-loaded.
  - `ProductController::show()` — loads many relations, verify they're all needed.
  - `CartService::getCart()` — when hydrating cart items, ensure products are loaded in a single query, not one per item.

- [ ] **4.2** **Add database indexes** — Ensure these indexes exist on frequently queried columns:
  ```sql
  -- Products
  CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
  CREATE INDEX IF NOT EXISTS idx_products_category_status ON products(category_id, status);
  CREATE INDEX IF NOT EXISTS idx_products_business_id ON products(business_id);
  CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);
  CREATE INDEX IF NOT EXISTS idx_products_is_featured ON products(is_featured) WHERE is_featured = true;

  -- Product images
  CREATE INDEX IF NOT EXISTS idx_product_images_product_primary ON product_images(product_id, is_primary);

  -- Orders
  CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
  CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
  ```

- [ ] **4.3** **Optimize the checkout flow** — The `CheckoutController::createSession()` runs inside a DB transaction with multiple queries. Optimize:
  - Batch-load all products at once instead of loading per cart item.
  - Cache the delivery fee calculation (geocoding is an external API call — cache results by address).

- [ ] **4.4** **Add response caching** — For public endpoints that don't change frequently:
  - Cache product listing responses (5–10 minutes) keyed by query params.
  - Cache category listings.
  - Cache featured products on the homepage.
  - Use `Cache::remember()` with appropriate TTLs.

- [ ] **4.5** **Optimize the image proxy** — The `ImageProxyController` caches image bytes in Redis for 1 hour. Consider:
  - Increasing the TTL to 24 hours for immutable product images.
  - Adding `ETag` and `Last-Modified` headers for browser caching.
  - Returning a `304 Not Modified` when the browser has a cached version.

#### Frontend Optimization

> **Skill:** Use `frontend-design:frontend-design` for any UI component changes related to perceived performance (loading skeletons, image lazy loading).

- [ ] **4.6** **Add loading skeletons** — Replace spinner-only loading states with skeleton screens that match the page layout. This significantly improves perceived performance. Key pages:
  - Product listing page (grid of skeleton cards)
  - Product detail page
  - Cart page
  - Checkout page

- [ ] **4.7** **Optimize image loading in ProductCard** — The current image loading strategy loads all images eagerly. Add:
  - `loading="lazy"` attribute to `<img>` tags for products below the fold.
  - Proper `width` and `height` attributes to prevent layout shifts.
  - Consider using Next.js `<Image>` component for automatic optimization (WebP conversion, responsive sizing).

- [ ] **4.8** **Reduce unnecessary re-renders** — Audit `CartContext` and other context providers:
  - `CartContext` may cause full-tree re-renders on cart changes. Split into separate contexts for cart data vs. cart actions.
  - Use `React.memo()` on `ProductCard` to prevent re-renders when parent state changes.
  - Memoize expensive computations (price calculations, filtering) with `useMemo`.

- [ ] **4.9** **Optimize API calls** — Check for duplicate or unnecessary API calls:
  - Deduplicate requests (e.g., cart fetch on every page navigation).
  - Add `stale-while-revalidate` patterns for data that doesn't change often.
  - Consider adding SWR or React Query for smart caching and deduplication.

- [ ] **4.10** **Test perceived performance:**
  - Page load time should feel snappy (< 1s for skeleton to appear).
  - Product listing should render progressively.
  - Cart operations (add/remove) should feel instant with optimistic updates.
  - Checkout flow should not stall between steps.

### Acceptance Criteria
- Product listing page loads noticeably faster.
- No N+1 query issues in any controller.
- Image loading doesn't block page rendering.
- Skeleton loading states replace blank/spinner screens.
- Cart operations feel instant.
- Backend API response times improve measurably (profile before/after).

---

## Execution Order

Execute tasks in this order for maximum impact and minimal risk:

1. **Task 1 (Delete fix)** — Quick win, 15–30 minutes. Unblocks business users.
2. **Task 3 (Image fix)** — High impact, debugging-heavy. Do this before performance work since broken images affect perception of speed.
3. **Task 2 (Card payment)** — New feature, requires thorough testing.
4. **Task 4 (Performance)** — Best done last, after other fixes are in place, so profiling reflects the final state.

---

## Plugin Usage Instructions

### Superpowers Plugin

Use these skills at the appropriate stages:

| Skill | When to Use |
|-------|-------------|
| `superpowers:systematic-debugging` | **Task 1** (delete error), **Task 3** (image investigation), **Task 4** (profiling) — before proposing any fix |
| `superpowers:test-driven-development` | **Task 2** (card payment backend) — write tests before implementation |
| `superpowers:brainstorming` | If any task reveals unexpected complexity requiring a design decision |
| `superpowers:verification-before-completion` | After each task — run verification commands before claiming done |
| `superpowers:requesting-code-review` | After all 4 tasks are complete — final review of all changes |
| `superpowers:finishing-a-development-branch` | When all tasks pass and are ready to be committed/merged |

### Frontend Design Plugin

| Skill | When to Use |
|-------|-------------|
| `frontend-design:frontend-design` | **Task 2** step 2.6 (card payment button UI), **Task 4** step 4.6 (loading skeleton components) |

---

## Risk Assessment

| Risk | Mitigation |
|------|-----------|
| Card payment takes real money in production | Use PayMongo test mode (`pk_test_*`, `sk_test_*`) throughout development. Only switch to live keys after full QA. |
| Image fix breaks existing working images | Test with both new and existing images. Don't modify URLs that already work. |
| Performance optimizations introduce caching bugs | Use short TTLs initially (1–5 min). Add cache invalidation on product create/update/delete. |
| Typesense fix masks a deeper configuration issue | Log a warning when `TYPESENSE_API_KEY` is empty so the team knows search indexing is disabled. |
