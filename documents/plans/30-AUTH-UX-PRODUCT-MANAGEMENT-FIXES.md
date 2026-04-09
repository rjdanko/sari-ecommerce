# Module 30: Auth UX, Product Management & Image/Options Fixes

**Date:** 2026-04-09
**Status:** Planned

---

## Overview

This module addresses six user-reported issues spanning authentication UX, product management, and product display:

1. **Password visibility toggle** on login page
2. **Forgot password link** on login page
3. **Edit product not working** + add delete product UI
4. **Typesense API key error** on product creation (non-blocking but confusing)
5. **Product options (Size, Color, etc.) not reflecting** on product detail page
6. **Product images not reflecting** after upload during product creation

---

## Plugin Usage

- Use the **`superpowers`** plugin throughout implementation for TDD, systematic debugging, verification, and code review.
- Use the **`frontend-design`** plugin for all frontend UI components — especially the password toggle, forgot password link, edit product form/modal, and delete confirmation UI.

---

## Task 1: Password Visibility Toggle (Eye Icon)

### Problem
The login page (`frontend/src/app/(auth)/login/page.tsx`) has a plain `type="password"` input with no way to reveal the entered password for verification.

### Solution
Add a toggle button with an eye/eye-off icon inside the password input field.

### Files to Modify
- `frontend/src/app/(auth)/login/page.tsx` — add visibility toggle state and icon button
- `frontend/src/app/(auth)/register/page.tsx` — add the same toggle for consistency

### Implementation Details
1. Add a `showPassword` boolean state
2. Toggle the input `type` between `"password"` and `"text"`
3. Use `Eye` / `EyeOff` icons from `lucide-react` (already a project dependency)
4. Position the icon button inside the input field (absolute positioning on the right)
5. Use the **`frontend-design`** plugin to ensure the toggle matches the existing design system (rounded-xl inputs, sari color scheme, smooth transitions)

### Acceptance Criteria
- Eye icon appears inside the password field
- Clicking toggles between showing/hiding the password
- Works on both login and register pages
- Accessible (aria-label on the toggle button)

---

## Task 2: Forgot Password Link

### Problem
No "Forgot Password?" option exists on the login page. The backend already has the routes and controllers set up:
- `POST /forgot-password` → `PasswordResetLinkController@store` (in `backend/routes/auth.php`)
- `NewPasswordController` exists at `backend/app/Http/Controllers/Auth/NewPasswordController.php`

### Solution
Add a "Forgot Password?" link on the login page and create a frontend forgot-password flow.

### Files to Create
- `frontend/src/app/(auth)/forgot-password/page.tsx` — email input form to request reset link
- `frontend/src/app/(auth)/reset-password/page.tsx` — new password form (token + email from URL params)

### Files to Modify
- `frontend/src/app/(auth)/login/page.tsx` — add "Forgot Password?" link below the password field

### Implementation Details
1. Add a `Forgot Password?` link between the password input and the login button (right-aligned, small text, sari-600 color)
2. **Forgot Password page**: simple form with email input, calls `POST /forgot-password`, shows success/error message
3. **Reset Password page**: reads `token` and `email` from URL search params, shows new password + confirm password form, calls the backend reset endpoint
4. Use the **`frontend-design`** plugin for both new pages to match the existing auth page design (centered card, decorative blurs, Sari logo, consistent styling)

### Backend Investigation Needed
- Read `NewPasswordController.php` and `PasswordResetLinkController.php` to confirm the exact API contract (request/response shape)
- Check `backend/routes/auth.php` for the reset-password POST route

### Acceptance Criteria
- "Forgot Password?" link visible on login page
- User can enter email and receive a reset link (backend handles email sending)
- User can set a new password via the reset page
- Error states handled gracefully (invalid token, expired link, etc.)

---

## Task 3: Edit Product Not Working + Delete Product UI

### Problem
- The edit button on the business products page (`frontend/src/app/business/products/page.tsx:174`) is a plain `<button>` with no `onClick` handler or navigation — it does nothing.
- There is no dedicated edit product page (`frontend/src/app/business/products/[id]/edit/` does not exist).
- The delete button exists and calls `handleDelete` with a `window.confirm`, but needs a proper UI confirmation modal.
- The backend `PUT /api/business/products/{product}` route exists and works.

### Solution
Create an edit product page and improve the delete UX.

### Files to Create
- `frontend/src/app/business/products/[id]/edit/page.tsx` — edit product form (pre-populated)

### Files to Modify
- `frontend/src/app/business/products/page.tsx` — wire up edit button to navigate to edit page, replace `window.confirm` with a proper delete confirmation modal

### Implementation Details

#### Edit Product
1. Create an edit page that mirrors the "Add New Product" form (`frontend/src/app/business/products/new/page.tsx`)
2. On mount, fetch the product via `GET /api/business/products` (filter by ID) or add a new backend endpoint `GET /api/business/products/{product}` if needed
3. Pre-populate all fields: name, description, short_description, category, brand, pricing, SKU, stock
4. Handle image management: show existing images, allow adding new ones and removing existing ones
5. Handle option categories: show existing variants/options, allow modifications
6. Submit via `PUT /api/business/products/{product}` with the updated data
7. Use the **`frontend-design`** plugin for the edit form layout

#### Backend for Edit
- Check if `UpdateProductRequest` validates all necessary fields
- Ensure the update endpoint handles image additions/removals
- May need a new endpoint or logic to manage image CRUD on update

#### Delete Product UI
1. Replace `window.confirm` with a styled confirmation modal
2. Modal should show the product name, a warning message, and Cancel/Delete buttons
3. Delete button should be red with a loading state
4. Use the **`frontend-design`** plugin for the modal design

### Acceptance Criteria
- Edit button navigates to `/business/products/{id}/edit`
- Edit form loads with existing product data
- Changes save correctly via the API
- Delete shows a styled modal instead of browser `confirm()`
- After delete, product disappears from the list

---

## Task 4: Typesense API Key Error on Product Creation

### Problem
When creating a product, the error `Forbidden - a valid x-typesense-api-key header must be sent` appears. The product still saves successfully — this is a non-blocking error from Laravel Scout's Typesense integration trying to index the new product.

### Root Cause
The `Product` model uses the `Searchable` trait from Laravel Scout. On product creation, Scout attempts to sync the product to Typesense. The `shouldBeSearchable()` method at `backend/app/Models/Product.php:38` checks for the API key:

```php
public function shouldBeSearchable(): bool
{
    return !empty(config('scout.typesense.client-settings.api_key'));
}
```

If the key is set in `.env` but is invalid/expired, `shouldBeSearchable()` returns `true` and the sync attempt fails, surfacing the error to the frontend.

### Solution
Fix the error suppression so it doesn't leak to the user.

### Files to Modify
- `backend/app/Models/Product.php` — improve `shouldBeSearchable()` or remove the Typesense key from `.env` if not in use
- Alternatively, wrap the Scout sync in a try-catch in the `ProductController@store` method

### Implementation Details
1. **Option A (Recommended):** If Typesense is not actively used, remove/empty the `TYPESENSE_API_KEY` from `.env` so `shouldBeSearchable()` returns `false` and no sync is attempted
2. **Option B:** If Typesense is intended to be used, configure it properly with a valid API key
3. **Option C:** Configure Scout to queue the sync (`SCOUT_QUEUE=true` in `.env`) so failures happen in the background and don't surface to the user
4. Investigate if the error is coming from the Scout observer firing after `Product::create()` — if so, wrapping in try-catch may suppress it but hides a real config issue

### Investigation Needed
- Check `.env` for `TYPESENSE_API_KEY` value — is it set but invalid?
- Check `config/scout.php` for the driver and queue settings
- Determine if Typesense search is actively used in the app or just leftover config

### Acceptance Criteria
- Creating a product no longer shows the Typesense error
- Product creation still works correctly
- If Typesense is meant to be used, it should be properly configured

---

## Task 5: Product Options Not Reflecting on Product Detail Page

### Problem
Options added during product creation (Size, Color, etc.) are not showing on the product detail page despite being saved as variants in the database.

### Root Cause Investigation
The product detail page (`frontend/src/app/products/[slug]/page.tsx:118-129`) correctly extracts options from `product.variants[].options`:

```tsx
const optionMap = new Map<string, string[]>();
if (product?.variants && Array.isArray(product.variants)) {
  for (const variant of product.variants) {
    if (variant.options && typeof variant.options === 'object') { ... }
  }
}
```

The issue is likely one of:
1. **Variants not being loaded** — the `show` method loads `'variants'` relationship, but check if variants are actually created during product creation
2. **Options stored incorrectly** — the `options` field on variants might not be cast to array/JSON properly
3. **Frontend rendering** — only `size` and `color` keys are rendered (lines 130-131: `optionMap.get('size')`, `optionMap.get('color')`), but user might use different casing or option names

### Files to Investigate
- `backend/app/Models/Product.php` — check `variants()` relationship
- `backend/database/migrations/` — check variants table schema, especially the `options` column type
- `backend/app/Http/Controllers/ProductController.php:97-109` — variant creation logic
- `frontend/src/app/products/[slug]/page.tsx:130-131` — hardcoded `size`/`color` keys

### Solution

#### Backend
1. Verify variants are actually being created (check DB after adding a product with options)
2. Ensure the `options` column on the variants table is cast to `array` in the Variant model
3. Check that `ProductController::generateCombinations()` output matches what the frontend expects

#### Frontend
1. **Critical fix**: The product detail page only renders `size` and `color` options. It should dynamically render ALL option keys from the variant data, not just hardcoded ones
2. Replace the hardcoded size/color selectors with a dynamic loop over `optionMap` entries
3. Use the **`frontend-design`** plugin for the dynamic option selectors to ensure they look consistent

### Files to Modify
- `frontend/src/app/products/[slug]/page.tsx` — make option rendering dynamic instead of hardcoded to size/color
- Possibly backend variant model if `options` cast is missing

### Acceptance Criteria
- All option categories (Size, Color, Material, etc.) appear on the product detail page
- Option values are selectable
- Options reflect what was entered during product creation

---

## Task 6: Product Images Not Reflecting After Upload

### Problem
Images uploaded during product creation are not showing on the product page, despite the upload to Supabase Storage succeeding.

### Root Cause Investigation
The `ImageService` uploads to Supabase via the `supabase` disk and returns a full URL. The `ProductResource` has a `formatImageUrl` method that prefixes `asset('storage/')` to URLs that don't start with `http`:

```php
private function formatImageUrl(?string $url): ?string
{
    if ($url && !str_starts_with($url, 'http')) {
        return asset('storage/' . $url);
    }
    return $url;
}
```

Possible issues:
1. **URL format mismatch** — `ImageService::upload()` returns `Storage::disk('supabase')->url($filename)` which should be a full HTTP URL, but the Supabase disk config might return a relative path instead
2. **Image record not being created** — the `ProductController::store()` creates image records (lines 85-93), but check if `$this->imageService->upload($file)` returns the expected URL
3. **Relationship not loading** — the `primaryImage` relationship or `images` relationship might not be loading correctly

### Files to Investigate
- `backend/config/filesystems.php` — check the `supabase` disk configuration and URL generation
- `backend/app/Models/Product.php` — check `images()` and `primaryImage()` relationships
- `backend/database/migrations/` — check product_images table structure

### Solution
1. Debug the full flow: upload → URL stored in DB → URL returned by API → URL rendered in frontend
2. Check if the Supabase storage disk returns full URLs or relative paths
3. If relative paths, the `formatImageUrl` in `ProductResource` should construct the correct Supabase public URL
4. Verify the `primaryImage` relationship query (usually `->where('is_primary', true)->first()`)

### Files to Modify
- Depends on investigation — likely `backend/config/filesystems.php` or `backend/app/Http/Resources/ProductResource.php`

### Acceptance Criteria
- Images uploaded during product creation display correctly on:
  - Business products list (thumbnail)
  - Public product detail page (gallery)
  - Homepage/product listings (card image)
- Both primary and additional images show correctly

---

## Implementation Order

Execute tasks in this order to minimize dependencies:

1. **Task 4** (Typesense error) — quick config fix, unblocks clean product creation testing
2. **Task 6** (Product images) — investigate and fix image URL pipeline
3. **Task 5** (Product options) — fix dynamic option rendering
4. **Task 1** (Password toggle) — quick UI enhancement
5. **Task 2** (Forgot password) — new pages, relies on existing backend
6. **Task 3** (Edit/delete products) — largest task, benefits from images and options working first

---

## Testing Strategy

- **Task 1 & 2**: Manual testing of auth flows (login, forgot password, reset)
- **Task 3**: Test edit form pre-population, save, image management, delete confirmation
- **Task 4**: Create a product and verify no Typesense error appears
- **Task 5**: Create a product with Size + Color options, verify they appear on the detail page
- **Task 6**: Upload images during product creation, verify they display everywhere
