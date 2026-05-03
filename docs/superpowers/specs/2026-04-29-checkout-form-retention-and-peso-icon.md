# Spec: Checkout Form Retention & Peso Icon Fix

**Date:** 2026-04-29

---

## Feature 1: Retain Shipping Form After Payment Cancellation

### Problem

When a user fills in shipping information on `/checkout` and proceeds to pay via QRPH or card, they are redirected to PayMongo's payment gateway. If they cancel or payment fails, PayMongo redirects back to `/checkout/cancel`. Clicking "Try Again" navigates to `/checkout`, which re-mounts `CheckoutContent` — all form state is lost.

### Solution

Use `sessionStorage` to persist the shipping form fields and selected payment method across the redirect cycle.

### Data Flow

1. User fills the shipping form and clicks "Place Order"
2. `handlePlaceOrder` validates the form — if valid, before redirecting to PayMongo, write to `sessionStorage`:
   ```
   key: "checkout_shipping_draft"
   value: JSON.stringify({ form: { fullName, phone, address1, address2, city, province, zip }, paymentMethod })
   ```
3. On `CheckoutContent` mount, read `sessionStorage["checkout_shipping_draft"]`. If present, call `setForm(draft.form)` and `setPaymentMethod(draft.paymentMethod)` to pre-fill the form.
4. On successful COD order (before redirecting to `/checkout/success`), call `sessionStorage.removeItem("checkout_shipping_draft")` to clear the draft.
5. For online payments (card/qrph), the draft is cleared on the success page mount (the user has already been charged — their order went through).

### Files Changed

- `frontend/src/app/checkout/page.tsx` — only file modified

### Constraints

- No backend changes
- No new dependencies
- `sessionStorage` is tab-scoped and origin-scoped; clears on tab close
- Does not affect COD flow (draft is written then immediately cleared)
- Does not affect the direct-purchase flow (`?direct=1` params) — those come from URL params, not the form

---

## Feature 2: Replace `DollarSign` Icon with `Banknote` on Dashboard Metric Cards

### Problem

Both the business dashboard and admin dashboard use the `DollarSign` icon from lucide-react as the decorative icon inside the Revenue/Total Revenue metric card tile. This shows a `$` glyph, which is incorrect for a Philippine-peso business. The actual displayed number values already correctly show `₱` via `formatPrice()` (which uses `currency: 'PHP'`) and explicit `₱` template literals.

### Solution

Replace `DollarSign` with `Banknote` in both dashboard files. `Banknote` is already available in lucide-react (no new dependency), is currency-neutral, and clearly represents revenue/money.

### Files Changed

- `frontend/src/app/business/dashboard/page.tsx` — swap `DollarSign` → `Banknote` in import and `buildMetrics`
- `frontend/src/app/admin/dashboard/page.tsx` — swap `DollarSign` → `Banknote` in import and `tiles` array

### Constraints

- Icon-only change — no logic, no layout, no value formatting affected
- `formatPrice()` in `lib/utils.ts` is unchanged
