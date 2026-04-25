# 38 — Admin Panel

**Date:** 2026-04-25
**Status:** Approved (design)
**Scope:** Build the admin UI and supporting backend so the `admin@sari.ph` account can manage users, stores, products, inventory, orders, vouchers, and reviews from a dedicated `/admin` surface.

---

## Problem Statement

The platform has admin scaffolding on the backend ([routes/api.php:118-130](../../backend/routes/api.php#L118-L130) plus controllers under [backend/app/Http/Controllers/Admin/](../../backend/app/Http/Controllers/Admin/)) but **no admin UI** at `frontend/src/app/admin/`. The seller dashboard at [frontend/src/app/business/](../../frontend/src/app/business/) sets the visual and structural pattern, but admin cross-store concerns (vouchers, stores, reviews, suspensions) are not addressed.

Today the only admin is the `admin@sari.ph` account, which has the `admin` role but no dedicated dashboard. Platform-level moderation requires direct DB access.

---

## Goals

1. Give the admin a single, role-gated UI to manage every cross-store concern.
2. Reuse seller-dashboard primitives so we don't reinvent table/card/modal components.
3. Keep all destructive actions reversible (suspensions over deletes; soft-deletes where deletes are required).
4. Stay consistent with the existing Laravel + Next.js conventions in the repo.

---

## Non-Goals (v1)

- Audit log of admin actions
- Analytics beyond a 30-day orders-per-day chart
- Categories management UI
- Banner / Voucher Center curation (which vouchers are featured on the home page)
- Feature flags / maintenance-mode toggles
- Seller payouts
- Review reason codes / flag queue / "report this review" buyer feature
- Email notifications when an account or store is suspended

---

## Approved Design

### Auth gating

- **Role-only.** Frontend `/admin/layout.tsx` checks the auth context; if `user.role !== 'admin'`, redirect to `/`. Backend reuses the existing `role:admin` middleware on the existing `/api/admin` route group ([routes/api.php:118](../../backend/routes/api.php#L118)).
- The fact that only `admin@sari.ph` is admin today is a data fact, not a code rule. No email hardcoding.
- Self-action guards: an admin cannot change their own role, suspend themselves, or be demoted via the user-edit endpoint.
- The admin role is **not assignable** from the user-edit UI/API. The role-edit field accepts `user` or `business` only.

### Visual differentiator

Admin reuses the seller-dashboard sidebar shell but with:

- A red/burgundy accent color (replacing the buyer/seller orange) on active links, primary buttons, and badges.
- An **`ADMIN`** pill rendered next to the SARI wordmark in the sidebar header.

This makes it visually obvious which surface the user is on without forking the entire UI primitive set.

### Frontend route tree

Under [frontend/src/app/admin/](../../frontend/src/app/admin/) (new):

```
admin/
  layout.tsx              # role:admin guard + sidebar + header pill
  dashboard/page.tsx      # 5 stat tiles + recent activity + 30-day chart
  users/
    page.tsx              # list, search, filter by role + status
    [id]/page.tsx         # detail: change role, suspend toggle
  stores/
    page.tsx              # list with seller, product/order counts, revenue
    [id]/page.tsx         # detail + suspend toggle
  products/
    page.tsx              # all products across stores
    [id]/page.tsx         # edit / delete (reuses seller form)
  inventory/page.tsx      # flat stock-editing table
  orders/
    page.tsx              # all orders, filter by status/store/date
    [id]/page.tsx         # detail + status update
  vouchers/
    page.tsx              # list + create
    [id]/page.tsx         # edit / deactivate / delete
  reviews/page.tsx        # all reviews, filter, soft-delete
```

### Backend controllers

Under [backend/app/Http/Controllers/Admin/](../../backend/app/Http/Controllers/Admin/):

| Controller | Status | Notes |
|---|---|---|
| `DashboardController` | extend | Add chart data + recent activity payload |
| `UserController` | extend | Add `suspend`/`unsuspend`, role whitelist, self-guard |
| `ProductController` | keep | Already supports cross-store edit/delete |
| `InventoryController` | keep | Already supports stock updates |
| `OrderController` | keep | Already supports cross-store status updates |
| `StoreController` | **new** | `index`, `show`, `suspend`, `unsuspend` |
| `VoucherController` | **new** | Full `apiResource` |
| `ReviewController` | **new** | `index`, `destroy` (soft delete) |

### Data model changes

**Existing columns reused:**
- `stores.is_active` ([0013_create_stores_table.php:21](../../backend/database/migrations/0013_create_stores_table.php#L21)) — store suspension toggles this.
- `vouchers.is_active` ([0023_create_vouchers_table.php:26](../../backend/database/migrations/0023_create_vouchers_table.php#L26)) — voucher deactivation toggles this.

**New migrations:**

1. `0028_add_is_suspended_to_users_table.php` — adds `is_suspended` boolean, default `false`, indexed.
2. `0029_add_soft_deletes_to_reviews_table.php` — adds `deleted_at` to `reviews`.

### Auth flow changes

Suspended users must not be able to log in via either path:

- [LoginController](../../backend/app/Http/Controllers/Auth/LoginController.php): after credentials are verified, check `$user->is_suspended`; if true, return `403 { error: "Account suspended" }` and do not issue a token.
- [GoogleAuthController](../../backend/app/Http/Controllers/Auth/GoogleAuthController.php): after lookup/creation, apply the same check before issuing a token.

Existing tokens of a user being suspended must also be revoked at suspension time (delete all of the user's Sanctum tokens inside the same DB transaction as the `is_suspended = true` update) so an in-session suspended user is logged out on next request.

### Store suspension semantics

Suspending a store sets `stores.is_active = false`. Effects:

- Public product listings, search index entries, store pages, and recommendation feeds must filter on `stores.is_active = true`. Verify each surface during implementation.
- The store's existing in-flight orders are **not** touched. The seller can still log in to their seller dashboard (their user role is unchanged) and fulfill those orders.
- New orders cannot be placed against a suspended store because the products are no longer publicly visible.
- Reversible by toggling back to active.

### Voucher delete behavior

- `is_active = false` is the soft-delete equivalent ("Deactivate"). Always allowed. The voucher disappears from the public Voucher Center but historical claim/redemption records survive.
- Hard-delete (`DELETE /admin/vouchers/{voucher}`) is allowed **only if** no claims or redemptions exist. Otherwise the controller returns `409 { error: "This voucher has been claimed; deactivate it instead." }`.

### Review delete behavior

- Soft-delete only (sets `reviews.deleted_at`).
- Public review listings, the product-detail review section, and the product `average_rating` / review-count aggregates must exclude soft-deleted rows. The product's average rating recalculates server-side on delete.

---

## API Contract

All endpoints under `/api/admin`, gated by `auth:sanctum` + `role:admin`.

### Existing — keep as-is

- `GET    /admin/dashboard`
- `GET    /admin/users`
- `GET    /admin/users/{user}`
- `PUT    /admin/users/{user}`
- `DELETE /admin/users/{user}` *(stays wired but no UI affordance in v1)*
- `GET    /admin/products`
- `PUT    /admin/products/{product}`
- `DELETE /admin/products/{product}`
- `GET    /admin/inventory`
- `PUT    /admin/inventory/{product}`
- `GET    /admin/orders`
- `GET    /admin/orders/{order}`
- `PUT    /admin/orders/{order}/status`

### Existing — extend

- `GET /admin/dashboard` payload becomes:
  ```json
  {
    "totals": { "users": 0, "stores": 0, "products": 0, "orders": 0, "revenue": 0 },
    "ordersByDay": [ { "date": "2026-04-01", "count": 0 } ],
    "recentOrders": [ /* last 10 across all stores */ ],
    "recentUsers": [ /* last 10 joined */ ]
  }
  ```

### New — Users

- `POST /admin/users/{user}/suspend`
- `POST /admin/users/{user}/unsuspend`

### New — Stores

- `GET  /admin/stores` *(includes seller, product count, order count, lifetime revenue)*
- `GET  /admin/stores/{store}`
- `POST /admin/stores/{store}/suspend`
- `POST /admin/stores/{store}/unsuspend`

### New — Vouchers (apiResource)

- `GET    /admin/vouchers`
- `POST   /admin/vouchers`
- `GET    /admin/vouchers/{voucher}`
- `PUT    /admin/vouchers/{voucher}`
- `DELETE /admin/vouchers/{voucher}` *(409 if claimed)*

### New — Reviews

- `GET    /admin/reviews` *(filters: `rating`, `product_id`, `store_id`)*
- `DELETE /admin/reviews/{review}` *(soft delete + recompute aggregates)*

### Auth flow (not under `/admin`)

- `POST /api/auth/login` and the Google OAuth callback both return `403 { error: "Account suspended" }` when `is_suspended = true`.

### Cross-cutting guards

- Form Requests validate every write endpoint.
- API Resources used for every response.
- Self-action endpoints (suspend, role change) reject when the target is the requesting admin → `422`.
- The `PUT /admin/users/{user}` role field whitelists `user` and `business` only.

---

## Page-by-Page UI

All pages reuse the existing seller-dashboard primitives (table, card, badge, modal). Color accent throughout is deep red/burgundy; the `ADMIN` pill sits next to the SARI wordmark in the sidebar header.

### Dashboard — `/admin/dashboard`

- Top: 5 stat tiles — Total Users, Total Stores, Total Products, Total Orders, Total Revenue.
- Middle: 30-day orders-per-day line chart, single line.
- Bottom split: "Recent Orders" table (last 10 across the platform, with Store column) and "Recently Joined Users" list (last 10).

### Users — `/admin/users` and `/admin/users/[id]`

- List: Name, Email, Role badge, Joined date, Status (Active/Suspended), Actions.
- Filters: role (`all` / `user` / `business`), status (`all` / `active` / `suspended`); search by name/email.
- Detail: profile info, role selector (`user` ↔ `business`), Suspend/Unsuspend button with confirmation modal.
- Self-guard: admin cannot change own role or suspend self; both actions hidden in UI and blocked server-side.

### Stores — `/admin/stores` and `/admin/stores/[id]`

- List: Store Name, Owner, Products count, Orders count, Lifetime Revenue, Status, Actions.
- Filter: status.
- Detail: store header (banner/logo/address), seller info card, "View Storefront" link, Suspend/Unsuspend button with confirmation. Suspending hides store + products from buyer surfaces; the owner retains seller-dashboard access for in-flight orders.

### Products — `/admin/products` and `/admin/products/[id]`

- List: Image thumbnail, Name, Store, Category, Price, Stock, Status, Actions.
- Filters: store, category, gender, low-stock toggle.
- Edit page reuses the seller's product edit form, with the store derived from the product (not the logged-in user). Delete is the existing soft-delete.

### Inventory — `/admin/inventory`

- Flat table optimized for fast stock edits: Product, Variant (size/color), Store, Current Stock, [editable input], Save.
- Search and low-stock filter. No detail page — a pure bulk-edit surface.

### Orders — `/admin/orders` and `/admin/orders/[id]`

- List: Order #, Buyer, Store, Total, Status badge, Payment Method, Date.
- Filters: status, store, date range, payment method.
- Detail: items, shipping address, payment status. Status update follows the same status flow as the seller dashboard.

### Vouchers — `/admin/vouchers` and `/admin/vouchers/[id]`

- List: Code, Type (Fixed/Percent/Free Shipping), Value, Min Spend, Claims (used/max), Expires, Status.
- Create button → form with: code (auto-uppercased), type, discount value, max discount cap (for percent), min spend, max claims, starts_at, expires_at, is_active toggle.
- Edit page is the same form. Deactivate flips `is_active`. Hard-delete only when no claims exist; on `409`, UI shows: "This voucher has been claimed; deactivate it instead."

### Reviews — `/admin/reviews`

- List: Product, Reviewer, Rating, Comment (truncated), Date, Actions.
- Filters: rating (1–5), product search, store.
- Row action: Delete with confirmation modal. Soft delete; product `average_rating` recalculates server-side.

### Shared chrome

Sidebar links: Dashboard, Users, Stores, Products, Inventory, Orders, Vouchers, Reviews. Header strip shows the SARI wordmark with the red `ADMIN` pill, the admin's email, and a logout button.

---

## Implementation Order

Each step is independently shippable and verifiable.

1. **DB migrations.** `users.is_suspended`, `reviews.deleted_at`. Update `LoginController` and `GoogleAuthController` to reject suspended users. Revoke tokens on suspension.
2. **Backend: extend existing controllers.** `UserController` (suspend/unsuspend, role whitelist, self-guard). `DashboardController` (30-day chart + recent activity payload).
3. **Backend: new controllers + routes.** `Admin\StoreController`, `Admin\VoucherController`, `Admin\ReviewController` with Form Requests and API Resources. Wire into the existing `/api/admin` group.
4. **Frontend: shared chrome.** `/admin/layout.tsx` with role guard, sidebar, `ADMIN` pill, deep-red accent.
5. **Frontend: dashboard.** Tiles + chart + recent tables.
6. **Frontend: users.** List + detail + role/suspend actions.
7. **Frontend: stores.** List + detail + suspend.
8. **Frontend: products + inventory.** Reuse seller product form for edit.
9. **Frontend: orders.** List + detail + status update.
10. **Frontend: vouchers.** List + create/edit form + deactivate/delete.
11. **Frontend: reviews.** List + soft-delete.

---

## Testing Strategy

- **Backend feature tests per controller:** 200 happy path, 403 for non-admin, 422 for self-action, 409 for voucher-with-claims hard-delete.
- **Auth flow tests:** suspended user is rejected at password login *and* Google OAuth callback.
- **Frontend smoke tests:** each admin page renders for the admin user; non-admin users are redirected away from `/admin/*`. Deeper UI testing follows existing project conventions.

---

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Mistaken suspension or deletion | Confirmation modals on every state-changing action; suspensions are reversible by design. |
| Admin demotes themselves and loses access | Backend rejects self-role-change (422); frontend hides the action. |
| Suspended store breaks in-flight orders | Store suspension hides public surfaces only; seller can still log in and fulfill. Documented above. |
| Voucher hard-delete after claims | 409 on the API + UI message recommending Deactivate. |
| Public surfaces still showing suspended stores | During Step 3, audit product listings, search index, and recommendation feed for `stores.is_active` filtering. Add filter where missing. |
| Suspended user keeps a live token | Revoke tokens at suspension time so the next request bounces them. |

---

## File Touch List (informational)

**New (backend):**
- `database/migrations/0028_add_is_suspended_to_users_table.php`
- `database/migrations/0029_add_soft_deletes_to_reviews_table.php`
- `app/Http/Controllers/Admin/StoreController.php`
- `app/Http/Controllers/Admin/VoucherController.php`
- `app/Http/Controllers/Admin/ReviewController.php`
- Form Requests + API Resources for the new controllers

**Modified (backend):**
- `app/Http/Controllers/Admin/DashboardController.php`
- `app/Http/Controllers/Admin/UserController.php`
- `app/Http/Controllers/Auth/LoginController.php`
- `app/Http/Controllers/Auth/GoogleAuthController.php`
- `app/Models/User.php` (cast for `is_suspended`)
- `app/Models/Review.php` (`SoftDeletes` trait)
- `routes/api.php`
- Wherever public product listings / search index / recommendations are built (audit during Step 3)

**New (frontend):**
- `src/app/admin/layout.tsx`
- `src/app/admin/dashboard/page.tsx`
- `src/app/admin/users/page.tsx` + `[id]/page.tsx`
- `src/app/admin/stores/page.tsx` + `[id]/page.tsx`
- `src/app/admin/products/page.tsx` + `[id]/page.tsx`
- `src/app/admin/inventory/page.tsx`
- `src/app/admin/orders/page.tsx` + `[id]/page.tsx`
- `src/app/admin/vouchers/page.tsx` + `[id]/page.tsx`
- `src/app/admin/reviews/page.tsx`
- Admin sidebar component (or a variant of the seller sidebar accepting a `variant="admin"` prop)
