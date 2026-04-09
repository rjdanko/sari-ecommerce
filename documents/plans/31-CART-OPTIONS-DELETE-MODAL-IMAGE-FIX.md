# Module 31: Cart Product Options, Delete Modal Fix & Product Image Fix

**Date:** 2026-04-09
**Status:** Planned

---

## Overview

This module addresses three issues:

1. **Product options not included in cart/checkout** -- variant selections (size, color, etc.) on the product detail page are never passed to the cart or checkout flow
2. **Product delete modal not closing** -- after clicking "Delete" on the business products page, the confirmation modal does not close/respond despite the product being successfully deleted
3. **Product images turning blank** -- uploaded product images and product card images display as blank/broken

---

## Plugin Usage

- Use the **`superpowers`** plugin throughout implementation for brainstorming, TDD, systematic debugging, verification, and code review.
- Use the **`frontend-design`** plugin for all frontend UI components -- especially the cart option selectors, option display badges, and any redesigned modals or image components.

---

## Task 1: Include Product Options in Cart and Checkout

### Problem

The product detail page ([products/[slug]/page.tsx](frontend/src/app/products/[slug]/page.tsx)) renders variant option selectors (Size, Color, etc.) and tracks selections in a `selectedOptions` local state. However:

- `handleAddToCart` calls `addItem(product.id, quantity)` -- **the selected variant ID is never resolved or passed**.
- `handleBuyNow` redirects to `/checkout?direct=1&product_id=...&quantity=...` -- **also drops variant info**.
- The `CartItem` type ([cart.ts](frontend/src/types/cart.ts)) has a `variant_id` field but no option labels (e.g. "Size: L, Color: Blue").
- The cart page and checkout page never display which variant options were selected for each item.

### Implementation Steps

#### Step 1: Resolve variant ID from selected options

**File:** [frontend/src/app/products/[slug]/page.tsx](frontend/src/app/products/[slug]/page.tsx)

1. After the user selects all required options, find the matching variant from `product.variants` by comparing `selectedOptions` against each variant's `options` object.
2. Store the resolved `variantId` in local state.
3. Pass `variantId` to `addItem(product.id, quantity, variantId)` in `handleAddToCart`.
4. Include `variant_id` in the `handleBuyNow` redirect URL query params.
5. Validate that all required options are selected before allowing add-to-cart or buy-now. Show an inline validation message if not.

#### Step 2: Update CartItem type to include option labels

**File:** [frontend/src/types/cart.ts](frontend/src/types/cart.ts)

1. Extend `CartItem` to include a `variant` object with option labels:
   ```ts
   variant?: {
     id: number;
     options: Record<string, string>; // e.g. { "Size": "L", "Color": "Blue" }
     price_modifier?: number;
   };
   ```
2. Ensure the backend cart API returns variant details when fetching the cart (check the backend `CartController` response -- it may already eager-load variants).

#### Step 3: Display selected options in cart page

**File:** [frontend/src/app/cart/page.tsx](frontend/src/app/cart/page.tsx)

> Use the **`frontend-design`** plugin for designing the option badges/tags.

1. Below each product name in the cart list, render the variant option labels as small badges/tags (e.g. "Size: L | Color: Blue").
2. Add an "Edit Options" button/link per cart item that opens an inline option selector or a small modal.
3. When the user changes options, resolve the new `variantId` and call an `updateItemVariant(productId, newVariantId)` method on the cart context.
4. Update the cart context to expose this method (or extend `updateQuantity` to also accept a variant change).

#### Step 4: Display selected options in checkout page

**File:** [frontend/src/app/checkout/page.tsx](frontend/src/app/checkout/page.tsx)

> Use the **`frontend-design`** plugin for the checkout item option display.

1. In the order summary sidebar, show variant option labels beneath each product name (read-only, not editable at checkout).
2. For direct buy mode, fetch and display the variant details from the product data using the `variant_id` query param.

#### Step 5: Backend -- ensure variant info flows through

**Files:** Backend cart controller, checkout controller, order creation

1. Verify the backend cart endpoints accept and store `variant_id`.
2. Verify the cart API response includes variant option labels (eager-load the variant relationship).
3. Verify the checkout/order creation process records the selected variant on each order item.
4. If any of these are missing, add them.

#### Step 6: Update "Buy Now" direct checkout flow

**File:** [frontend/src/app/checkout/page.tsx](frontend/src/app/checkout/page.tsx)

1. Read `variant_id` from query params in direct buy mode.
2. Pass `variant_id` to the checkout API payload under `direct_buy`.
3. Display the variant options in the direct buy order summary.

---

## Task 2: Fix Product Delete Modal Not Closing

### Problem

On the business products page ([business/products/page.tsx](frontend/src/app/business/products/page.tsx)), clicking "Delete" in the confirmation modal successfully deletes the product via `DELETE /api/business/products/{id}`, but the modal does not visually close or respond.

### Root Cause Investigation

> Use the **`superpowers:systematic-debugging`** plugin for this investigation.

Debug in this order:

1. **Check `confirmDelete()` function** -- The function calls `setDeleteTarget(null)` on success (which should close the modal since the modal renders conditionally on `deleteTarget`). Verify this line executes.
2. **Check for React state batching issues** -- If `setDeleteTarget(null)` is called inside an async callback, React 18 should still batch it. But verify there's no race condition with `setDeleting(false)` in the `finally` block.
3. **Check the error path** -- The `catch` block is empty (silently swallows errors). If the API returns a non-2xx but the product is deleted (e.g. a 204 that Axios treats oddly, or a response parsing error), the code could enter `catch` instead of the success path, leaving the modal open. This is the most likely cause.
4. **Check network response** -- Inspect what status code and body the `DELETE` endpoint returns. If it returns 204 No Content, verify the frontend HTTP client handles it correctly (some Axios configs expect JSON and throw on empty responses).

### Implementation Steps

#### Step 1: Fix the delete handler

**File:** [frontend/src/app/business/products/page.tsx](frontend/src/app/business/products/page.tsx)

1. Add proper error handling in the `catch` block -- show a toast/alert with the error message.
2. **Crucially**: investigate whether the issue is that the API succeeds (product is deleted) but the response parsing throws. If so, fix the response handling.
3. Ensure `setDeleteTarget(null)` is always called after a successful delete, regardless of response format.
4. Add a small success toast/notification confirming deletion.

#### Step 2: Add visual feedback

> Use the **`frontend-design`** plugin if redesigning the modal.

1. The loading spinner during deletion (via `deleting` state) should already work -- verify it does.
2. After successful deletion, briefly show a success state before closing, or close immediately with a toast notification.

---

## Task 3: Fix Product Images Turning Blank

### Problem

Product images turn blank/broken after uploading. Product card images also show blank. This may be a regression or incomplete fix from Module 29.

### Root Cause Investigation

> Use the **`superpowers:systematic-debugging`** plugin for this investigation.

Debug in this order:

1. **Check recent fix from commit `04573ba`** -- Module 29 fixed the Supabase disk config missing the `url` key in `config/filesystems.php`. Verify this fix is properly deployed and the `SUPABASE_PUBLIC_URL` env var is set correctly.
2. **Check API response** -- Hit `GET /api/products` and inspect the `primary_image` field. Is the URL present? Is it a valid, accessible URL? Open it in a browser.
3. **Check `is_primary` flag in database** -- Verify products actually have an image record with `is_primary = 1`. Run migration `0019_fix_missing_primary_images` if not already run.
4. **Check `ProductResource.formatImageUrl()`** -- This prepends `asset('storage/')` only for non-http URLs. Supabase URLs start with `https://` and should pass through unchanged. Verify no double-prefixing.
5. **Check `ImageService::upload()` return value** -- After uploading, does `Storage::disk('supabase')->url($path)` return the correct full public URL? Log or debug this.
6. **Check frontend rendering**:
   - [ProductCard.tsx](frontend/src/components/ProductCard.tsx): Uses `product.primary_image?.url` with fallback to `/placeholder-product.png`. The image uses an `onLoad` callback to fade in -- if the URL is broken, the image stays invisible (opacity 0) with no error indicator.
   - Product detail page: Uses `product.images[activeImage].url`.
7. **Check for CORS issues** -- If Supabase Storage has restrictive CORS settings, images may fail to load in the browser despite the URL being valid.

### Implementation Steps

#### Step 1: Verify and fix Supabase configuration

**Files:** [backend/config/filesystems.php](backend/config/filesystems.php), `.env`

1. Confirm the Supabase disk has the `url` key set to `SUPABASE_PUBLIC_URL`.
2. Confirm the env var `SUPABASE_PUBLIC_URL` is set and points to the correct public bucket URL.
3. Test by uploading a new image and checking the stored URL in the database.

#### Step 2: Fix the upload flow if URLs are malformed

**File:** [backend/app/Services/ImageService.php](backend/app/Services/ImageService.php)

1. After `Storage::disk('supabase')->putFileAs(...)`, log the URL returned by `->url($path)`.
2. If the URL is relative or malformed, fix the Supabase disk config or construct the URL manually from the public bucket URL + path.

#### Step 3: Fix existing broken image records

**File:** Create a new migration or artisan command

1. Query all product images where the `url` column is null, empty, or not a valid `https://` URL.
2. For images with a valid `path` but broken `url`, reconstruct the URL from `SUPABASE_PUBLIC_URL` + path.
3. For images with no recoverable path, remove the orphaned records and ensure the product's `is_primary` flag is reassigned if needed.

#### Step 4: Add error handling for broken images on frontend

**File:** [frontend/src/components/ProductCard.tsx](frontend/src/components/ProductCard.tsx)

> Use the **`frontend-design`** plugin for the error/fallback state design.

1. Add an `onError` handler to the `<img>` tag that shows the placeholder image instead of staying invisible.
2. Currently the image starts at opacity 0 and only shows on `onLoad` -- if the image fails, it stays invisible forever. The `onError` handler should trigger the fallback.

**File:** [frontend/src/app/products/[slug]/page.tsx](frontend/src/app/products/[slug]/page.tsx)

1. Same fix for the product detail page gallery images -- add `onError` fallback.

---

## Testing Checklist

After implementing each task, verify using the **`superpowers:verification-before-completion`** plugin:

### Task 1: Cart Options
- [ ] Select variant options on product page, add to cart -- verify variant ID is stored
- [ ] Open cart page -- verify option labels display correctly per item
- [ ] Edit options in cart -- verify variant changes and price updates
- [ ] Proceed to checkout -- verify options show in order summary (read-only)
- [ ] Use "Buy Now" -- verify variant info carries through direct checkout
- [ ] Place order -- verify order record includes correct variant

### Task 2: Delete Modal
- [ ] Delete a product -- modal should close promptly after success
- [ ] Verify success toast/notification appears
- [ ] Simulate API error -- verify error message displays and modal remains open with option to retry or cancel
- [ ] Verify product list refreshes after deletion

### Task 3: Product Images
- [ ] Upload new product images -- verify they display immediately in the product form
- [ ] View product listing page -- verify product card images load
- [ ] View product detail page -- verify gallery images load
- [ ] Test with a product that has no images -- verify placeholder shows
- [ ] Test with a broken image URL -- verify fallback placeholder shows instead of blank

---

## Implementation Order

1. **Task 3 first** (Image fix) -- this is likely the simplest and unblocks visual verification of other tasks
2. **Task 2 second** (Delete modal) -- quick fix, high annoyance factor
3. **Task 1 last** (Cart options) -- largest scope, requires backend + frontend changes

---

## Files Expected to Change

| File | Task |
|------|------|
| `frontend/src/app/products/[slug]/page.tsx` | 1, 3 |
| `frontend/src/types/cart.ts` | 1 |
| `frontend/src/contexts/CartContext.tsx` | 1 |
| `frontend/src/app/cart/page.tsx` | 1 |
| `frontend/src/app/checkout/page.tsx` | 1 |
| `frontend/src/components/ProductCard.tsx` | 3 |
| `frontend/src/app/business/products/page.tsx` | 2 |
| `backend/app/Services/ImageService.php` | 3 |
| `backend/config/filesystems.php` | 3 |
| `backend/app/Http/Resources/ProductResource.php` | 3 |
| Backend cart/checkout controllers | 1 |
