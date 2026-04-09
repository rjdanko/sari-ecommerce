# Plan 26 — Order Management & UX Fixes

**Date:** 2026-04-07
**Status:** Draft
**Scope:** 4 tasks across frontend (checkout, orders, business dashboard, auth)

---

## Overview

This plan addresses four user-facing issues:

1. **Business dashboard** — No "Confirm Order" button visible to store owners
2. **Customer orders** — No "Cancel Order" button visible to customers
3. **QR PH payment** — No error handling when payment fails or user closes the payment window
4. **Logout redirect** — User is not redirected to login screen after logging out

---

## Task 1: Business Dashboard — Confirm Order Button

**Problem:** The business orders page has the `handleConfirmOrder` function and a Confirm button coded at `frontend/src/app/business/orders/page.tsx:196-203`, but it may not be rendering due to order status mismatch (orders not arriving with `pending_confirmation` status) or a backend issue.

**Investigation steps:**
1. Verify the backend `POST /api/business/orders/{order}/confirm` endpoint works (check `OrderController::confirmOrder`)
2. Verify orders are created with `pending_confirmation` status by checking the `OrderController::store` / checkout logic
3. Check that the business orders API (`GET /api/business/orders`) returns orders with `status: "pending_confirmation"`

**Implementation:**
- If the button exists but orders never have the right status: fix the backend order creation to set initial status to `pending_confirmation`
- If the API returns the wrong status key: fix the status mapping
- Add a confirmation dialog before confirming (to prevent accidental clicks)
- Show a toast notification on successful confirmation
- Use the **superpowers:systematic-debugging** skill to trace the root cause
- Use the **frontend-design** skill for the confirmation dialog component design

**Files likely affected:**
- `frontend/src/app/business/orders/page.tsx` — UI and confirm handler
- `backend/app/Http/Controllers/OrderController.php` — confirm endpoint and order creation status
- `backend/app/Models/Order.php` — status constants/defaults

---

## Task 2: Customer Orders — Cancel Order Button

**Problem:** The customer orders page at `frontend/src/app/orders/page.tsx:275-285` has a Cancel button, but it only shows when `order.status === 'pending_confirmation'`. The logic and handler `handleCancelOrder` exist.

**Investigation steps:**
1. Verify the backend `POST /api/orders/{order}/cancel` endpoint exists and works
2. Verify that orders returned by `GET /api/orders` include the correct `status` field
3. Confirm that the status is `pending_confirmation` for new orders (same root cause as Task 1)

**Business logic (as specified by user):**
- Customer can cancel an order **only while** status is `pending_confirmation`
- Once the business confirms the order (status changes to `confirmed`), the cancel button must no longer appear
- This logic is already coded correctly in the frontend conditional — the fix is ensuring orders actually arrive with the `pending_confirmation` status

**Implementation:**
- Fix is likely shared with Task 1 (ensure correct initial order status)
- Add a confirmation dialog before cancelling ("Are you sure you want to cancel this order?")
- Ensure the cancel button is styled clearly (it already uses red text with XCircle icon)
- Use the **superpowers:systematic-debugging** skill to verify the cancel flow end-to-end
- Use the **frontend-design** skill for the cancel confirmation dialog

**Files likely affected:**
- `frontend/src/app/orders/page.tsx` — cancel button visibility (likely already correct)
- `backend/app/Http/Controllers/OrderController.php` — cancel endpoint, initial status

---

## Task 3: QR PH Payment Error Handling

**Problem:** When a user selects QR PH payment, the checkout page at `frontend/src/app/checkout/page.tsx:152-157` opens the PayMongo checkout URL in a new tab and immediately redirects to `/checkout/success`. There is no verification that payment actually succeeded. If the user closes the payment window or payment fails, the order still appears as successful.

**Current broken flow:**
```
User clicks "Place Order" with QR PH
  → Backend creates order + PayMongo checkout session
  → Frontend opens checkout_url in new tab
  → Frontend IMMEDIATELY redirects to /checkout/success  ← BUG
  → User sees "Order Placed Successfully" even if they never paid
```

**Correct flow:**
```
User clicks "Place Order" with QR PH
  → Backend creates order + PayMongo checkout session
  → Frontend redirects to PayMongo checkout (same tab, not new tab)
  → PayMongo redirects back to:
      /checkout/success (if paid)   → show success screen
      /checkout/cancel  (if failed) → show error/payment-failed screen
```

**Implementation:**

### Frontend changes:
1. **Checkout page** (`frontend/src/app/checkout/page.tsx`):
   - Change `window.open(data.checkout_url, '_blank')` + `window.location.href = '/checkout/success'` to just `window.location.href = data.checkout_url` (redirect in same tab so PayMongo handles the return)
   
2. **Cancel/Error page** (`frontend/src/app/checkout/cancel/page.tsx`):
   - Enhance the existing cancel page to also handle payment failure scenarios
   - Add clearer messaging: "Payment was not completed" / "Your payment could not be processed"
   - Add a "Try Again" button that links back to `/checkout`
   - Use the **frontend-design** skill for the error splash screen design — must be visually distinct and clearly communicate the payment error state

3. **Success page** (`frontend/src/app/checkout/success/page.tsx`):
   - Optionally verify payment status via API call on mount (call backend to check if the order's payment is actually confirmed)
   - If payment is not confirmed, redirect to the cancel/error page

### Backend changes:
4. **Checkout controller** — Ensure PayMongo checkout session is configured with:
   - `success_url` → `{frontend_url}/checkout/success?session_id={SESSION_ID}`
   - `cancel_url` → `{frontend_url}/checkout/cancel`
   
5. **Webhook / verification endpoint** — Ensure a PayMongo webhook or verification endpoint exists to update order payment status when payment is actually completed

**Skills to use:**
- Use the **superpowers:systematic-debugging** skill to trace the current payment flow
- Use the **superpowers:test-driven-development** skill for the backend payment verification
- Use the **frontend-design** skill for the payment error splash screen — this is a design-heavy component that needs to clearly communicate the error state with appropriate iconography, color, and messaging

**Files likely affected:**
- `frontend/src/app/checkout/page.tsx` — fix redirect logic
- `frontend/src/app/checkout/cancel/page.tsx` — enhance error messaging and design
- `frontend/src/app/checkout/success/page.tsx` — add payment verification
- `backend/app/Http/Controllers/CheckoutController.php` — PayMongo session URLs
- `backend/routes/api.php` — payment verification route (if needed)

---

## Task 4: Logout Redirect to Login Screen

**Problem:** When a user logs out via the Navbar, the `logout()` function in `frontend/src/hooks/useAuth.ts:45-48` calls `POST /api/logout` and sets user to null, but does **not** redirect anywhere. The business layout (`frontend/src/app/business/layout.tsx:37-39`) does redirect to `/` after logout, but the main Navbar does not.

**Implementation:**
1. **Navbar** (`frontend/src/components/layout/Navbar.tsx:120`):
   - After calling `logout()`, redirect to `/login` using `window.location.href = '/login'` or `router.push('/login')`
   - Use `window.location.href` to ensure a full page refresh (clears any cached auth state)

2. **Business layout** (`frontend/src/app/business/layout.tsx:38-39`):
   - Change redirect from `/` to `/login` for consistency

**Files affected:**
- `frontend/src/components/layout/Navbar.tsx` — add redirect after logout call
- `frontend/src/app/business/layout.tsx` — update redirect target to `/login`

---

## Execution Order

Tasks should be executed in this order due to dependencies:

| Step | Task | Reason |
|------|------|--------|
| 1 | Task 1 + Task 2 | Likely share the same root cause (order status). Fix together. |
| 2 | Task 3 | Independent. Most complex — involves both frontend and backend payment flow. |
| 3 | Task 4 | Independent and simplest. Quick win. |

---

## Verification Checklist

Use the **superpowers:verification-before-completion** skill before marking any task as done.

- [ ] **Task 1:** Create a test order → business dashboard shows "Confirm" button → clicking it changes status to "confirmed"
- [ ] **Task 2:** Create a test order → customer orders page shows "Cancel Order" button → cancelling works → after business confirms, cancel button disappears
- [ ] **Task 3:** Select QR PH at checkout → redirected to PayMongo → close/cancel payment → redirected to error page with clear messaging → retry works → complete payment → redirected to success page
- [ ] **Task 4:** Log out from any page → redirected to `/login` screen

---

## Skills Reference

| Skill | When to use |
|-------|-------------|
| `superpowers:systematic-debugging` | Tasks 1, 2, 3 — tracing why buttons don't appear, payment flow issues |
| `superpowers:test-driven-development` | Task 3 — backend payment verification endpoint |
| `frontend-design` | Tasks 1, 2, 3 — confirmation dialogs, payment error splash screen |
| `superpowers:verification-before-completion` | All tasks — before claiming any task is complete |
| `superpowers:requesting-code-review` | After all tasks — final review before commit |
