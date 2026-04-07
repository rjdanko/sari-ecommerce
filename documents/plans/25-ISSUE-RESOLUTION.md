# Bug Fixes Plan — Sari E-Commerce

**Date:** 2026-04-07  
**Status:** Planned  
**Scope:** 6 bugs across frontend (Next.js) and backend (Laravel)

---

## Overview

This plan addresses 6 reported issues in the sari-ecommerce platform. Each issue is documented with root cause analysis, affected files, and step-by-step fix instructions. Issues are ordered by dependency (backend fixes first, then frontend).

> **Important:** Use the `superpowers` plugin skills throughout implementation:
> - Use `superpowers:systematic-debugging` before fixing each bug
> - Use `superpowers:test-driven-development` when writing tests for fixes
> - Use `superpowers:verification-before-completion` before marking any issue as done
> - Use `superpowers:requesting-code-review` after completing all fixes
> - Use `frontend-design:frontend-design` for Issue #6 (Shop by Category redesign)

---

## Issue #1: Typesense API Key Error on Product Creation

**Symptom:** When adding a product in the business dashboard, error shows: `Forbidden - a valid x-typesense-api-key header must be sent`. Product still gets created.

**Root Cause:** The `Product` model uses Laravel Scout's `Searchable` trait, which auto-indexes on creation. If the Typesense API key is missing/invalid in `.env`, Scout throws an error after the DB insert succeeds.

**Affected Files:**
- `backend/app/Models/Product.php` — has `Searchable` trait (line 12)
- `backend/config/scout.php` — Typesense config (lines 70-87), reads `TYPESENSE_API_KEY` env var with empty default
- `backend/app/Http/Controllers/ProductController.php` — `store()` method (lines 72-112)

**Fix Steps:**
1. **Check `.env`** — Verify `TYPESENSE_API_KEY` is set and valid. If Typesense is not being used in production yet, proceed to step 2.
2. **Option A (if Typesense is needed):** Ensure a valid Typesense API key is configured in `.env` and the Typesense server is running. Wrap the Scout indexing in a try-catch in `ProductController::store()` so the error doesn't bubble up to the user.
3. **Option B (if Typesense is NOT needed yet):** Either:
   - Set `SCOUT_DRIVER=null` in `.env` to disable search indexing entirely, OR
   - Remove the `Searchable` trait from the `Product` model temporarily, OR
   - Add `shouldBeSearchable()` method to `Product` model returning `false` until ready
4. **Verify:** Create a product in the business dashboard — no Typesense error should appear.

**Recommended approach:** Option B — set `SCOUT_DRIVER=null` in `.env` until Typesense is properly set up. This is the least invasive change.

---

## Issue #2: Product Images Not Reflecting on Product Card

**Symptom:** Product images don't display on the product card after adding them.

**Root Cause (likely):** `ProductResource.php` (lines 28-55) transforms image URLs — if the URL doesn't start with `http`, it prefixes with `asset('storage/' . $url)`. If images are stored as Supabase URLs (already absolute) or the path mapping is incorrect, the constructed URL will be broken.

**Affected Files:**
- `backend/app/Http/Resources/ProductResource.php` — URL transformation logic
- `backend/app/Http/Controllers/ProductController.php` — image upload via `ImageService`
- `backend/app/Services/ImageService.php` (if exists) — how images are stored/returned
- `frontend/src/components/ProductCard.tsx` — displays `product.primary_image?.url`, falls back to placeholder

**Fix Steps:**
1. **Inspect the API response:** Call the products API and examine what `primary_image.url` actually returns. Check if it's a valid, accessible URL.
2. **Inspect `ImageService`:** See how images are stored (local disk? Supabase storage? S3?). Determine what format the URL is saved in.
3. **Fix `ProductResource.php`:** Ensure the URL transformation logic correctly handles the storage method being used:
   - If images are stored as absolute URLs (e.g., Supabase), don't prefix with `asset('storage/')`.
   - If images are stored as relative paths, ensure the `storage/` prefix and `asset()` helper produce a valid public URL.
4. **Check CORS / Next.js `next.config.js`:** Ensure image domains are whitelisted in `next.config.js` under `images.remotePatterns` or `images.domains` if using `<Image>` component.
5. **Check `ProductCard.tsx`:** Verify that `product.primary_image?.url` accesses the right field from the API response.
6. **Verify:** Add a product with an image and confirm it renders on the product card.

---

## Issue #3: Automatic Generation of Unwanted Product Options

**Symptom:** Adding a product with options `Size: S, M, L` results in `Size: S, M, L, XL, XXL` plus an unwanted `Color` option being generated.

**Root Cause (likely):** The frontend form at `frontend/src/app/business/products/new/page.tsx` may have default/preset option categories that get merged with user input, OR the backend `generateCombinations()` method in `ProductController.php` is receiving more data than expected.

**Affected Files:**
- `frontend/src/app/business/products/new/page.tsx` — product creation form (lines 25-203), option categories UI
- `backend/app/Http/Controllers/ProductController.php` — `generateCombinations()` (lines 141-155), variant creation (lines 96-110)

**Fix Steps:**
1. **Inspect the frontend form:** Check if the new product form has hardcoded default option categories (e.g., preset sizes or colors) that get sent even when the user doesn't add them.
2. **Log/inspect the request payload:** Add temporary logging in `ProductController::store()` to dump `$request->option_categories` and see exactly what arrives from the frontend.
3. **Fix the frontend form:** Remove any default/preset option values. The form should start with empty option categories and only send what the user explicitly adds.
4. **Fix the backend (if needed):** Ensure `generateCombinations()` only processes the categories and values that were actually submitted, without adding defaults.
5. **Verify:** Create a product with only `Size: S, M, L` and confirm no extra sizes or color options are generated.

---

## Issue #4: "Buy Now" Goes to Cart Instead of Checkout

**Symptom:** Clicking "Buy Now" navigates to the cart page instead of directly to the checkout page.

**Root Cause analysis:** The `handleBuyNow` function in `frontend/src/app/products/[slug]/page.tsx` (lines 120-128) correctly uses `window.location.href = /checkout?direct=1&...`. The issue might be:
- A route guard or middleware redirecting `/checkout` to `/cart` for unauthenticated users
- The checkout page itself redirecting to cart when it can't find cart items (since this is a direct buy, not cart-based)
- A different "Buy Now" button elsewhere that has incorrect navigation

**Affected Files:**
- `frontend/src/app/products/[slug]/page.tsx` — `handleBuyNow` (lines 120-128)
- `frontend/src/app/checkout/page.tsx` — checkout page, handles `direct` query param (lines 143-148)
- `frontend/src/app/cart/page.tsx` — cart page (check for redirects)
- Any middleware or auth guards on the `/checkout` route

**Fix Steps:**
1. **Test in browser with DevTools open (Network tab):** Click "Buy Now" and watch the navigation — is it going to `/checkout?direct=1&...` first and then redirecting to `/cart`, or going to `/cart` directly?
2. **Check checkout page logic:** In `checkout/page.tsx`, see if there's logic that redirects to `/cart` when cart is empty (which it would be for a direct buy). The `isDirect` check (line 143) must short-circuit this redirect.
3. **Check for route middleware:** Look for any Next.js middleware or auth wrappers that intercept the `/checkout` route.
4. **Fix:** Ensure the checkout page recognizes `direct=1` query param BEFORE checking for cart items. If the page redirects to cart when cart is empty, add an early return when `direct=1` is present.
5. **Verify:** Click "Buy Now" on a product — should navigate directly to checkout with the product pre-filled.

---

## Issue #5: Order Status Check Constraint Violation

**Symptom:** Checkout fails with `orders_status_check` constraint violation for QR PH and Cash on Delivery payment methods.

**Root Cause:** `CheckoutController.php` line 65 sets `status => 'pending_confirmation'`, but the orders table enum only allows: `pending`, `processing`, `paid`, `shipped`, `delivered`, `cancelled`, `refunded`. The value `pending_confirmation` is not in the allowed list.

**Affected Files:**
- `backend/app/Http/Controllers/CheckoutController.php` — line 65, sets invalid status
- `backend/database/migrations/0006_create_orders_table.php` — enum constraint (lines 14-17)
- `backend/app/Models/Order.php` — model fillable fields

**Fix Steps:**
1. **Decide on the correct status:** Either:
   - **Option A:** Change the code to use an existing status: replace `'pending_confirmation'` with `'pending'` in `CheckoutController.php` line 65. This is the simplest fix.
   - **Option B:** Add `'pending_confirmation'` to the migration enum and create a new migration to alter the column. This is more involved but preserves the intended status meaning.
2. **Recommended: Option A** — Use `'pending'` as the initial order status. If a distinct "pending confirmation" state is needed later, add it via a proper migration.
3. **Check for other invalid statuses:** Search the entire codebase for any other status values being set on orders that aren't in the enum list.
4. **Check `payment_status` field:** The error also shows `payment_status => 'unpaid'`. Verify this value is allowed by its constraint too.
5. **Verify:** Complete a checkout using QR PH payment and Cash on Delivery — both should succeed without constraint errors.

---

## Issue #6: Shop by Category Section Has Black Background

**Symptom:** The "Shop by Category" section on the homepage has a black/dark background instead of matching the white background of the recommendations section.

**Root Cause:** In `frontend/src/app/page.tsx` line 83, each category card has a dark gradient overlay: `bg-gradient-to-t from-gray-900/70 via-gray-900/20 to-transparent`. The `gray-900/70` (70% opaque near-black) overpowers the light accent colors, making the entire section appear dark/black.

**Affected Files:**
- `frontend/src/app/page.tsx` — Shop by Category section (lines 56-97), specifically the gradient overlay on line 83

**Fix Steps:**

> **Use `frontend-design:frontend-design` skill for this issue** to ensure the redesigned section has high design quality and matches the overall aesthetic.

1. **Remove or lighten the dark gradient overlay:** Replace `from-gray-900/70 via-gray-900/20 to-transparent` with a much lighter gradient or remove it entirely.
2. **Match the recommendations section:** Ensure the section's outer container uses a white/light background (`bg-white` or the same bg class as the recommendations section).
3. **Preserve readability:** If category names are displayed over the cards, ensure text remains readable against the lighter background (use subtle shadows or semi-transparent overlays instead of dark ones).
4. **Design options to consider:**
   - Light cards with colored accents (using the existing `cat.accent` values which are already light)
   - White cards with colored borders or icons
   - Light gradient overlays instead of dark ones
5. **Verify:** Check the homepage — Shop by Category should have a clean, light appearance consistent with the rest of the page.

---

## Execution Order

Recommended order of implementation (based on dependencies and severity):

| Priority | Issue | Severity | Effort |
|----------|-------|----------|--------|
| 1 | #5 — Order status constraint | **Critical** (blocks checkout) | Low |
| 2 | #3 — Auto-generated options | **High** (data integrity) | Medium |
| 3 | #2 — Product images | **High** (user-facing) | Medium |
| 4 | #4 — Buy Now navigation | **High** (UX) | Low-Medium |
| 5 | #1 — Typesense error | **Medium** (non-blocking) | Low |
| 6 | #6 — Category background | **Low** (cosmetic) | Low |

---

## Verification Checklist

After all fixes are applied, verify the following end-to-end flows:

- [ ] Create a product with specific options (e.g., Size: S, M, L only) — no extra options generated
- [ ] Product images display correctly on the product card after upload
- [ ] No Typesense error appears when creating products
- [ ] "Buy Now" button navigates directly to checkout (not cart)
- [ ] Checkout completes successfully with QR PH payment
- [ ] Checkout completes successfully with Cash on Delivery
- [ ] Homepage "Shop by Category" section has a white/light background
- [ ] All existing functionality still works (regression check)

---

## Plugin Usage Reference

| Skill | When to Use |
|-------|-------------|
| `superpowers:systematic-debugging` | Before investigating each bug — follow structured debugging process |
| `superpowers:test-driven-development` | When writing tests for the fixes |
| `superpowers:verification-before-completion` | Before claiming any issue is fixed — run verification commands |
| `superpowers:requesting-code-review` | After all 6 issues are fixed, before committing |
| `superpowers:finishing-a-development-branch` | When all fixes are verified and ready to merge |
| `frontend-design:frontend-design` | For Issue #6 (Shop by Category section redesign) |
