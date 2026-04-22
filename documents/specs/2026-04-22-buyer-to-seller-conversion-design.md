# Buyer → Seller Conversion — Design Spec

**Date:** 2026-04-22
**Status:** Approved
**Target plan:** Module 37 (to be written)

---

## Problem Statement

A user who registered as a buyer (role `user`) or signed in via Google OAuth has no path to become a seller. Google OAuth always assigns the `user` role at account creation ([GoogleAuthController.php:43](../../backend/app/Http/Controllers/Auth/GoogleAuthController.php#L43)), and the existing store-creation endpoint `POST /api/business/store` is gated behind `role:business|admin` middleware ([routes/api.php:99-103](../../backend/routes/api.php#L99-L103)), so buyers cannot self-promote.

The only workaround today is creating a second account with the `business` role at registration — lossy for the user (they abandon their order history, wishlist, addresses) and bad for product discovery.

This spec defines a self-service flow that lets an authenticated buyer convert their existing account into a seller account, creating their store in the same motion.

---

## Approved Design

### Scope

**In scope (v1):**
- One-step conversion that both (a) upgrades the user's role from `user` → `business` and (b) creates the user's `Store` row in a single atomic action.
- A 3-step wizard UI on a dedicated route `/become-seller`.
- Two discovery entry points for buyers: a card on the profile page, and an item in the navbar user dropdown.
- Backend validation, transaction safety, and guardrails against double-conversion.

**Out of scope (v1):**
- Reversibility (seller → buyer). Once converted, users stay `business`. To revert, a separate feature is required to handle the user's existing products, orders, and payouts.
- Admin approval / application review. Conversion is instant and self-service.
- Seller identity verification (TIN, business license, KYC).
- A marketing landing page at `/sell`. Can be added later for external acquisition.
- Email notifications (welcome email for new sellers).
- Migrating or surfacing existing `business`-role users who registered as business but never created a store — they already have the first-time creation UX at [business/store](../../frontend/src/app/business/store/page.tsx).

### Architecture

```
┌─ Profile page ──────┐         ┌─ Navbar dropdown ─┐
│ "Become a Seller"   │         │ "Sell on SARI"    │
│ card (buyers only)  │         │ (buyers only)     │
└────────┬────────────┘         └──────────┬────────┘
         │                                 │
         └────────────┬────────────────────┘
                      ▼
         ┌──────────────────────────┐
         │ /become-seller           │  new route, wizard
         │ Step 1 → Step 2 → Step 3 │
         └────────────┬─────────────┘
                      │  POST /api/user/become-seller (multipart)
                      ▼
         ┌──────────────────────────┐
         │ BecomeSellerController   │  atomic DB transaction:
         │                          │   1. validate
         │                          │   2. reject if already business
         │                          │   3. upload images
         │                          │   4. create Store row
         │                          │   5. assignRole('business')
         └────────────┬─────────────┘
                      │  returns { user, store }
                      ▼
         Frontend refreshes auth context
         → router.push('/business/dashboard')
```

**Core architectural choice:** A new dedicated endpoint `POST /api/user/become-seller` under `auth:sanctum` (outside the `role:business` group), not a loosening of the existing `POST /api/business/store` middleware. This keeps the business-scoped endpoints clean and makes the conversion a distinct, auditable domain action.

### Backend

#### New route

Inside the `auth:sanctum` + `throttle:authenticated` group in [backend/routes/api.php](../../backend/routes/api.php), outside the `role:business|admin` sub-group:

```php
Route::post('/user/become-seller', BecomeSellerController::class);
```

#### New controller — `App\Http\Controllers\BecomeSellerController`

Single-action via `__invoke`. Depends on `ImageService` (constructor-injected) for logo/banner uploads, matching the existing pattern in [StoreController.php:14](../../backend/app/Http/Controllers/StoreController.php#L14).

Logic sequence inside a `DB::transaction`:

1. Reject (422) if `$user->hasRole('business')` or `$user->hasRole('admin')`.
2. Reject (422) if `$user->store` already exists (defensive — shouldn't be possible given step 1, but guards data drift).
3. Upload `logo` and `banner` via `ImageService::upload()` if files were provided.
4. Create the `Store` row with: `user_id`, `name`, `slug = Str::slug(name) . '-' . Str::random(5)`, `description`, `address`, `phone`, `latitude`, `longitude`, and optional `logo_url` / `banner_url`.
5. `$user->assignRole(RoleEnum::BUSINESS->value)`.
6. Log the conversion: `Log::info('User converted to seller', ['user_id' => $user->id, 'store_id' => $store->id])`.
7. Return 201 with `{ user: $user->load('roles'), store }`.

#### New FormRequest — `App\Http\Requests\BecomeSellerRequest`

Validation rules mirror the existing [StoreController.php:18-27](../../backend/app/Http/Controllers/StoreController.php#L18-L27):

```php
return [
    'name'        => ['required', 'string', 'max:255'],
    'description' => ['nullable', 'string', 'max:2000'],
    'logo'        => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:2048'],
    'banner'      => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
    'address'     => ['nullable', 'string', 'max:500'],
    'phone'       => ['nullable', 'string', 'max:20'],
    'latitude'    => ['nullable', 'numeric', 'between:-90,90'],
    'longitude'   => ['nullable', 'numeric', 'between:-180,180'],
];
```

Adding a FormRequest (vs. inline `$request->validate()`) follows the project convention set by `RegisterRequest`.

#### No DB migration required

The existing `users`, `stores`, and Spatie `model_has_roles` tables cover every field. Role changes are idempotent inserts into `model_has_roles`.

### Frontend

#### New route & page

- **Route:** `/become-seller`
- **File:** [frontend/src/app/become-seller/page.tsx](../../frontend/src/app/become-seller/page.tsx) (new)
- **Guard on mount:** If `user.roles[0].name === 'business' || 'admin'`, `router.replace('/business/dashboard')`. Prevents stale bookmarks and accidental re-runs. If unauthenticated, redirect to `/login`.
- The page renders a `<BecomeSellerWizard />` client component and nothing else (keeps the page file thin and lets the wizard own its state).

#### New component — `BecomeSellerWizard`

Location: [frontend/src/components/seller/BecomeSellerWizard.tsx](../../frontend/src/components/seller/BecomeSellerWizard.tsx) (new).

State: current step (1–3), form fields, file previews, submitting flag, error message.

**Step 1 — Store basics**
- `name` (required, max 255)
- `description` (optional, max 2000, textarea)
- "Next" disabled until `name` is non-empty.

**Step 2 — Branding**
- `logo` file input + preview (optional, square aspect ratio recommended in helper text)
- `banner` file input + preview (optional, wide aspect ratio recommended in helper text)
- "Next" always enabled.

**Step 3 — Contact & location**
- `phone` (optional, tel input, numeric-only pattern matching the existing profile page pattern at [profile/page.tsx:216](../../frontend/src/app/profile/page.tsx#L216))
- `address` (optional, textarea)
- `latitude` / `longitude` (optional, numeric inputs) — matches the manual-entry pattern in [business/store/page.tsx](../../frontend/src/app/business/store/page.tsx). No map picker in v1.
- "Create my shop" button submits.

**Progress indicator:** simple `1 ─ 2 ─ 3` top of wizard, with the active step highlighted in brand color.

**Submit behavior:** Build `FormData` (multipart because of images). POST to `/api/user/become-seller`. On success: (a) show a toast "Your shop is live", (b) `window.location.href = '/business/dashboard'` — a full page load rather than `router.push`, because `useAuth` ([useAuth.ts](../../frontend/src/hooks/useAuth.ts)) is a plain hook with per-component local state (not a shared context), so `router.push` alone wouldn't refresh the role across components. This matches the logout pattern already in use at [business/layout.tsx:55](../../frontend/src/app/business/layout.tsx#L55). On validation error (422): surface the field errors inline on the relevant step.

#### Entry point 1 — Profile page

Modify [frontend/src/app/profile/page.tsx](../../frontend/src/app/profile/page.tsx) to render a new "Become a Seller" card in the right column, below "Saved Addresses". Conditional on `user.roles[0]?.name === 'user'` — hidden for `business`, `admin`, or users without roles (defensive).

Card copy (tentative; can be tuned during implementation): headline "Start selling on SARI", subtext "Turn your account into a shop — list products, manage orders, grow your business", primary button "Become a Seller" → `router.push('/become-seller')`.

#### Entry point 2 — Navbar dropdown

Modify the existing navbar user dropdown in [frontend/src/components/layout/Navbar.tsx](../../frontend/src/components/layout/Navbar.tsx) to add a "Sell on SARI" menu item. Same visibility rule: only rendered when `user.roles[0]?.name === 'user'`.

### Edge Cases & Guardrails

| Case | Handling |
|---|---|
| User already has `business` or `admin` role | Controller rejects with 422. Wizard route also redirects them to `/business/dashboard` on mount. |
| User has no role at all (data drift) | Treat as `user` — conversion proceeds normally. |
| User already has a `Store` row (defensive) | Controller rejects with 422. |
| Google-auth users (no password) | No special handling. They have `email_verified_at` from the Google callback ([GoogleAuthController.php:38](../../backend/app/Http/Controllers/Auth/GoogleAuthController.php#L38)), which is all we require. |
| Existing `business`-role users without a store | Out of scope. The existing [business/store](../../frontend/src/app/business/store/page.tsx) first-time creation UX covers them, and our entry points are hidden from non-`user` roles. |
| Reversibility (seller → buyer) | Out of scope for v1. |
| Image upload succeeds but DB transaction rolls back | Matches existing pre-existing behavior of `ImageService` in [StoreController.php:44-50](../../backend/app/Http/Controllers/StoreController.php#L44-L50). Orphan files can result; not solved here. |
| Slug collisions | Use the existing pattern `Str::slug($name) . '-' . Str::random(5)` from [StoreController.php:37](../../backend/app/Http/Controllers/StoreController.php#L37). |
| Audit trail | `Log::info` on successful conversion, including `user_id` and `store_id`. No dedicated audit table. |
| Rate limiting | Covered by existing `throttle:authenticated` middleware on the route group. No new limits. |

---

## What Is Out of Scope

- Admin approval flow, seller KYC/verification, TIN collection.
- Reversing the conversion (seller → buyer).
- Marketing landing page at `/sell`.
- Email/SMS notifications to the new seller.
- Automatic backfill or migration UX for existing `business`-role users who haven't created a store.
- Map-based location picker (manual lat/lng entry only in v1).
- Dedicated audit trail table (log-file audit only).

---

## Success Criteria

1. A buyer (role `user`) can click "Become a Seller" from the profile page OR the navbar dropdown, complete the 3-step wizard, and land on `/business/dashboard` with a live shop.
2. After conversion, the user's role is `business`, a `Store` row exists with the submitted data, and the "Become a Seller" entry points are no longer visible.
3. A Google-auth user can convert via the same flow with no additional friction.
4. A user with role `business` or `admin` who visits `/become-seller` directly is redirected to `/business/dashboard`.
5. A user with role `business` or `admin` who POSTs to `/api/user/become-seller` receives a 422.
6. If store creation fails for any reason inside the transaction, the user's role is NOT upgraded (verified via backend test).
7. All existing backend feature tests remain green.

---

## Testing

### Backend (`backend/tests/Feature/BecomeSellerTest.php`, new)

Cover these cases:

1. A `user` with no store can convert → gets `business` role, store row created, response includes both.
2. A user with `business` role is rejected with 422.
3. A user with `admin` role is rejected with 422.
4. A user with an existing store (edge case with no `business` role) is rejected with 422.
5. Unauthenticated request is rejected with 401.
6. Missing `name` field fails validation (422).
7. Google-auth user (no password) can convert successfully.
8. Transaction rollback: if store creation fails (forced via a DB constraint or mocked failure), role is NOT assigned.

### Frontend (manual verification)

1. Sign in as a fresh buyer → profile page shows "Become a Seller" card; navbar dropdown shows "Sell on SARI".
2. Click entry point → wizard loads at `/become-seller`, step 1 visible, step indicator shows 1/3.
3. Try to advance step 1 with empty `name` → Next button disabled.
4. Complete all 3 steps, submit → loading state → redirect to `/business/dashboard`.
5. On profile page (post-conversion) → role label is "Business Owner", "Become a Seller" card is gone, navbar dropdown item is gone.
6. Navigate directly to `/become-seller` after conversion → redirected to `/business/dashboard`.
7. Repeat full flow with a Google-auth user (sign in via Google, then convert).
8. Verify the created store is visible at `/business/store` and its data matches what was submitted.
