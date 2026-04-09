# Unpaid Order Fix & Cancel Order Modal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the bug where unpaid QR PH (PayMongo) orders are treated as valid orders, and replace the plain `window.confirm()` cancel dialog with a styled modal that collects a cancellation reason and submits it to the store.

**Architecture:** The checkout flow will be updated so that online-payment orders are not finalized (cart not cleared) until the PayMongo webhook confirms payment. A new endpoint will mark orders as `payment_failed` when the user returns from PayMongo without paying. The cancel order flow will be upgraded with a new modal component, backend validation for cancellation reasons, and visibility of those reasons on both customer and business dashboards.

**Tech Stack:** Laravel 11 (PHP 8.2), Next.js 14 (React/TypeScript), PostgreSQL (Supabase), Tailwind CSS

---

## Issue 1: Unpaid QR PH Orders Still Counted as Orders

### Root Cause

In `backend/app/Http/Controllers/CheckoutController.php`:
- **Line 62-73:** An `Order` record is created with status `pending_confirmation` *before* the user is redirected to PayMongo.
- **Lines 122-125:** The cart is cleared for online payments *before* payment is confirmed.
- **`ProcessPaymentWebhook.php`:** Only updates the order to `paid` on successful payment — but there is no mechanism to handle failed/abandoned payments.

**Result:** If the user clicks "Place Order" with QR PH, gets redirected to PayMongo, then hits back/cancel without paying, a ghost order exists as `pending_confirmation` and the cart is empty.

### Solution Overview

1. Stop clearing the cart until payment is confirmed (webhook only)
2. Pass order ID in PayMongo cancel URL so the cancel page knows which order failed
3. New backend endpoint to verify PayMongo session and mark order as `payment_failed`
4. Update the cancel page to call the endpoint and show appropriate UI
5. Add `payment_failed` to the status enum

---

## Issue 2: Cancel Order Needs a Modal with Reasons

### Current State

In `frontend/src/app/orders/page.tsx` line 97-98, cancellation uses `window.confirm()` — no reason is collected. The backend `OrderController::cancelOrder()` (line 74-88) doesn't accept or store a reason. The business dashboard has no visibility into why orders are cancelled.

### Solution Overview

1. Database migration to add `cancellation_reason` and `cancellation_notes` columns
2. Update backend endpoint to accept and validate reason data
3. New `CancelOrderModal` frontend component with predefined reasons + "Other" text field
4. Display cancellation reason on both customer and business order views

---

## Proposed Changes

### Task 1: Add `payment_failed` to Orders Status Enum

> Use the **superpowers plugin** to execute this task.

**Files:**
- Modify: `backend/database/migrations/0016_update_orders_status_enum.php` (if not yet migrated — extend it)
- OR Create: `backend/database/migrations/0017_add_payment_failed_status.php` (if 0016 already ran)

Add `payment_failed` to the PostgreSQL CHECK constraint on `orders.status`.

- [ ] **Step 1: Check if migration 0016 has already been run**

  ```bash
  cd backend
  php artisan migrate:status
  ```

  - If `0016_update_orders_status_enum` has NOT run yet: edit it to include `payment_failed` in the allowed values.
  - If it HAS run: create a new migration `0017_add_payment_failed_status.php`.

- [ ] **Step 2: Create/update the migration**

  The constraint should allow these values:
  ```
  pending, pending_confirmation, confirmed, processing, paid, shipped, delivered, cancelled, refunded, payment_failed
  ```

  Migration pattern:
  ```php
  DB::statement('ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check');
  DB::statement("ALTER TABLE orders ADD CONSTRAINT orders_status_check CHECK (status::text = ANY (ARRAY['pending'::text, 'pending_confirmation'::text, 'confirmed'::text, 'processing'::text, 'paid'::text, 'shipped'::text, 'delivered'::text, 'cancelled'::text, 'refunded'::text, 'payment_failed'::text]))");
  ```

- [ ] **Step 3: Run the migration**

  ```bash
  php artisan migrate
  ```

- [ ] **Step 4: Update frontend status maps**

  Add `payment_failed` to the status styles and labels in:
  - `frontend/src/app/orders/page.tsx` — `statusStyles` and `statusLabels` maps
  - `frontend/src/app/business/orders/page.tsx` — `statusStyles`, `statusLabels`, and `statusOptions`

  Use a red/orange style like:
  ```typescript
  payment_failed: 'bg-red-50 text-red-600'
  ```
  Label: `"Payment Failed"`

---

### Task 2: Stop Clearing Cart Before Payment Confirmation

> Use the **superpowers plugin** to execute this task.

**Files:**
- Modify: `backend/app/Http/Controllers/CheckoutController.php`

The cart is currently cleared at lines 122-125 for online payments BEFORE the user has actually paid. This should only happen after the webhook confirms payment (which `ProcessPaymentWebhook.php` line 65 already handles).

- [ ] **Step 1: Remove premature cart clearing for online payments**

  In `backend/app/Http/Controllers/CheckoutController.php`, remove lines 122-125:
  ```php
  // Clear cart for online payments too (stock decremented in webhook)
  if (!$request->has('direct_buy')) {
      $this->cartService->clearCart($user->id);
  }
  ```

  The `ProcessPaymentWebhook` job at line 65 already calls `$this->cartService->clearCart($order->user_id)` after successful payment, so this is redundant and harmful when payment fails.

  **Important:** Leave the COD cart clearing (lines 96-98) untouched — COD orders are finalized immediately.

---

### Task 3: Pass Order ID to PayMongo Cancel URL

> Use the **superpowers plugin** to execute this task.

**Files:**
- Modify: `backend/app/Http/Controllers/CheckoutController.php`
- Modify: `backend/app/Services/PaymentService.php`

The PayMongo cancel URL currently points to `/checkout/cancel` with no context about which order was abandoned. We need to pass the order ID so the cancel page can mark it as failed.

- [ ] **Step 1: Update `PaymentService::createCheckoutSession` to accept a cancel URL parameter**

  In `backend/app/Services/PaymentService.php`, modify the method signature to accept an optional custom cancel URL:
  ```php
  public function createCheckoutSession(array $lineItems, array $metadata = [], array $paymentMethods = ['card', 'gcash'], ?string $cancelUrl = null): array
  ```

  Use it in the request body:
  ```php
  'cancel_url' => $cancelUrl ?? config('app.frontend_url') . '/checkout/cancel',
  ```

- [ ] **Step 2: Pass order-specific cancel URL from CheckoutController**

  In `backend/app/Http/Controllers/CheckoutController.php`, when calling `createCheckoutSession`, pass a cancel URL that includes the order ID:
  ```php
  $cancelUrl = config('app.frontend_url') . '/checkout/cancel?order_id=' . $order->id;

  $session = $this->paymentService->createCheckoutSession(
      $lineItems,
      ['order_id' => $order->id, 'order_number' => $order->order_number],
      $paymentMethods,
      $cancelUrl
  );
  ```

---

### Task 4: New Backend Endpoint — Mark Order as Payment Failed

> Use the **superpowers plugin** to execute this task.

**Files:**
- Modify: `backend/app/Http/Controllers/OrderController.php`
- Modify: `backend/routes/api.php`

Create a new endpoint that the cancel page calls to verify the PayMongo session and mark the order as `payment_failed`.

- [ ] **Step 1: Add `markPaymentFailed` method to OrderController**

  In `backend/app/Http/Controllers/OrderController.php`, add:

  ```php
  /**
   * Mark an order as payment_failed after user returns from PayMongo without paying.
   * Verifies the PayMongo session to confirm payment was not completed.
   */
  public function markPaymentFailed(Request $request, Order $order, PaymentService $paymentService): JsonResponse
  {
      $this->authorize('view', $order);

      // Only process orders that are still pending_confirmation with a PayMongo session
      if ($order->status !== 'pending_confirmation' || !$order->paymongo_checkout_id) {
          return response()->json(['error' => 'Order cannot be marked as payment failed.'], 422);
      }

      // Verify with PayMongo that payment was NOT completed
      $session = $paymentService->getCheckoutSession($order->paymongo_checkout_id);
      $paymentStatus = $session['attributes']['payment_intent']['attributes']['status'] ?? null;

      if ($paymentStatus === 'succeeded') {
          // Payment actually went through — don't mark as failed
          // The webhook will handle this
          return response()->json(['error' => 'Payment was completed. Order will be updated shortly.'], 422);
      }

      $order->update([
          'status' => 'payment_failed',
      ]);

      return response()->json($order->fresh()->load('items'));
  }
  ```

  Don't forget to add the `use App\Services\PaymentService;` import at the top.

- [ ] **Step 2: Register the route**

  In `backend/routes/api.php`, add after line 70 (the existing cancel route):
  ```php
  Route::post('/orders/{order}/payment-failed', [OrderController::class, 'markPaymentFailed']);
  ```

---

### Task 5: Update Cancel Page to Handle Failed Payments

> Use the **superpowers plugin** and the **frontend-design plugin** for design-related component changes.

**Files:**
- Modify: `frontend/src/app/checkout/cancel/page.tsx`

The cancel page should detect the `order_id` query param, call the backend to mark the order as `payment_failed`, and show an appropriate message that their cart items are still available.

- [ ] **Step 1: Add `useSearchParams` and API call on mount**

  Wrap the page in a `Suspense` boundary (like the checkout page does). On mount, if `order_id` is present in query params, call `POST /api/orders/{order_id}/payment-failed`.

- [ ] **Step 2: Update the UI messaging**

  - Show "Payment Not Completed" heading (already exists)
  - Update the description to say: "Your payment was not completed. No charges were made. Your cart items are still available."
  - Change the "Try Again" link to point to `/checkout` (cart is preserved)
  - Keep the "Return to Cart" and "Continue Shopping" links

- [ ] **Step 3: Handle edge cases**

  - If no `order_id` param: show the existing generic cancel message
  - If API call fails: still show the cancel page, just log the error (the order will remain as `pending_confirmation` — the business can handle it manually)

---

### Task 6: Database Migration — Add Cancellation Reason Columns

> Use the **superpowers plugin** to execute this task.

**Files:**
- Create: `backend/database/migrations/0017_add_cancellation_reason_to_orders.php` (or 0018 depending on Task 1)

Add columns to store the cancellation reason and optional notes.

- [ ] **Step 1: Create the migration**

  ```php
  <?php

  use Illuminate\Database\Migrations\Migration;
  use Illuminate\Database\Schema\Blueprint;
  use Illuminate\Support\Facades\Schema;

  return new class extends Migration
  {
      public function up(): void
      {
          Schema::table('orders', function (Blueprint $table) {
              $table->string('cancellation_reason')->nullable()->after('notes');
              $table->text('cancellation_notes')->nullable()->after('cancellation_reason');
          });
      }

      public function down(): void
      {
          Schema::table('orders', function (Blueprint $table) {
              $table->dropColumn(['cancellation_reason', 'cancellation_notes']);
          });
      }
  };
  ```

- [ ] **Step 2: Update the Order model**

  In `backend/app/Models/Order.php`, add `'cancellation_reason'` and `'cancellation_notes'` to the `$fillable` array.

- [ ] **Step 3: Run the migration**

  ```bash
  cd backend
  php artisan migrate
  ```

---

### Task 7: Update Backend Cancel Endpoint to Accept Reasons

> Use the **superpowers plugin** to execute this task.

**Files:**
- Modify: `backend/app/Http/Controllers/OrderController.php`

Update the `cancelOrder` method to validate and store the cancellation reason.

- [ ] **Step 1: Add validation and store the reason**

  Replace the existing `cancelOrder` method with:

  ```php
  public function cancelOrder(Request $request, Order $order): JsonResponse
  {
      $this->authorize('view', $order);

      if ($order->status !== 'pending_confirmation') {
          return response()->json(['error' => 'Order can only be cancelled before store confirmation.'], 422);
      }

      $validated = $request->validate([
          'reason' => ['required', 'string', 'in:changed_mind,found_better_deal,ordered_by_mistake,delivery_too_long,want_to_change_order,other'],
          'notes' => ['nullable', 'string', 'max:500', 'required_if:reason,other'],
      ]);

      $order->update([
          'status' => 'cancelled',
          'cancelled_at' => now(),
          'cancellation_reason' => $validated['reason'],
          'cancellation_notes' => $validated['notes'] ?? null,
      ]);

      return response()->json($order->fresh()->load('items'));
  }
  ```

  The predefined reason values map to:
  - `changed_mind` — "I changed my mind"
  - `found_better_deal` — "I found a better deal"
  - `ordered_by_mistake` — "Ordered by mistake"
  - `delivery_too_long` — "Delivery takes too long"
  - `want_to_change_order` — "I want to change my order"
  - `other` — Free text (requires `notes`)

---

### Task 8: Create CancelOrderModal Frontend Component

> Use the **frontend-design plugin** for this design-related component. Use the **superpowers plugin** to execute the task.

**Files:**
- Create: `frontend/src/components/orders/CancelOrderModal.tsx`

A modal popup with cancellation reason selection. Design should match the existing Sari aesthetic (rounded corners, sari-500 accents, clean typography).

- [ ] **Step 1: Create the modal component**

  The component should accept these props:
  ```typescript
  interface CancelOrderModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (reason: string, notes: string | null) => Promise<void>;
    orderNumber: string;
  }
  ```

  **Modal content:**
  - Backdrop overlay with click-to-close
  - Header: "Cancel Order" with the order number
  - Radio button group with 6 predefined reasons:
    1. "I changed my mind" (`changed_mind`)
    2. "I found a better deal" (`found_better_deal`)
    3. "Ordered by mistake" (`ordered_by_mistake`)
    4. "Delivery takes too long" (`delivery_too_long`)
    5. "I want to change my order" (`want_to_change_order`)
    6. "Other" (`other`)
  - When "Other" is selected: show a `<textarea>` with placeholder "Please tell us why..." (required, max 500 chars)
  - Footer with two buttons:
    - "Go Back" (secondary/gray, calls `onClose`)
    - "Cancel Order" (destructive/red, calls `onConfirm`)
  - Loading spinner on the "Cancel Order" button during submission
  - Disable submit if no reason selected, or if "Other" is selected but notes are empty

  **Styling guidelines:**
  - Use existing Tailwind classes from the project (`rounded-2xl`, `shadow-sm`, `border-gray-100`, etc.)
  - Red accent for destructive action (`bg-red-500`, `hover:bg-red-600`)
  - Animate in with fade + scale (use existing `animate-fade-in` if available or Tailwind defaults)
  - Responsive: full-width on mobile with padding, max-width `md` on desktop
  - Close on Escape key press

- [ ] **Step 2: Verify the component renders correctly**

  The component should work standalone with no external state dependencies beyond its props.

---

### Task 9: Integrate CancelOrderModal into Customer Orders Page

> Use the **superpowers plugin** to execute this task.

**Files:**
- Modify: `frontend/src/app/orders/page.tsx`

Replace the `window.confirm()` cancel flow with the new modal.

- [ ] **Step 1: Add modal state**

  Add state for tracking which order is being cancelled:
  ```typescript
  const [cancellingOrder, setCancellingOrder] = useState<Order | null>(null);
  ```

- [ ] **Step 2: Replace `handleCancelOrder` function**

  Change the cancel button's `onClick` from calling `handleCancelOrder(order.id)` to opening the modal:
  ```typescript
  onClick={() => setCancellingOrder(order)}
  ```

  Add a new handler for the modal's `onConfirm`:
  ```typescript
  const handleConfirmCancel = async (reason: string, notes: string | null) => {
    if (!cancellingOrder) return;
    await api.post(`/api/orders/${cancellingOrder.id}/cancel`, { reason, notes });
    const { data } = await api.get('/api/orders');
    setOrders(data.data ?? []);
    setCancellingOrder(null);
    addToast({ type: 'info', title: 'Order cancelled' });
  };
  ```

- [ ] **Step 3: Render the modal**

  Add the `CancelOrderModal` at the bottom of the component, before the closing `</>`:
  ```tsx
  <CancelOrderModal
    isOpen={!!cancellingOrder}
    onClose={() => setCancellingOrder(null)}
    onConfirm={handleConfirmCancel}
    orderNumber={cancellingOrder?.order_number ?? ''}
  />
  ```

- [ ] **Step 4: Display cancellation reason on cancelled orders**

  In the expanded order details section, if the order is cancelled and has a `cancellation_reason`, display it:
  ```tsx
  {order.status === 'cancelled' && order.cancellation_reason && (
    <div className="mt-3 pt-3 border-t border-gray-200">
      <p className="text-sm text-gray-500">
        <span className="font-medium text-gray-700">Reason:</span>{' '}
        {reasonLabels[order.cancellation_reason] ?? order.cancellation_reason}
        {order.cancellation_notes && ` — ${order.cancellation_notes}`}
      </p>
    </div>
  )}
  ```

  Add a `reasonLabels` map:
  ```typescript
  const reasonLabels: Record<string, string> = {
    changed_mind: 'Changed my mind',
    found_better_deal: 'Found a better deal',
    ordered_by_mistake: 'Ordered by mistake',
    delivery_too_long: 'Delivery takes too long',
    want_to_change_order: 'Wants to change order',
    other: 'Other',
  };
  ```

---

### Task 10: Display Cancellation Reason on Business Orders Page

> Use the **frontend-design plugin** for design-related changes. Use the **superpowers plugin** to execute the task.

**Files:**
- Modify: `frontend/src/app/business/orders/page.tsx`

Show the cancellation reason to the business owner so they understand why customers are cancelling.

- [ ] **Step 1: Update the Order interface**

  Add to the local `Order` interface in this file:
  ```typescript
  cancellation_reason?: string | null;
  cancellation_notes?: string | null;
  ```

- [ ] **Step 2: Display reason for cancelled orders in the table**

  In the table row for cancelled orders, show the reason below the status badge or as a tooltip. A simple approach is to add a line below the status badge:
  ```tsx
  {order.status === 'cancelled' && order.cancellation_reason && (
    <p className="mt-1 text-[11px] text-gray-400">
      {reasonLabels[order.cancellation_reason] ?? order.cancellation_reason}
      {order.cancellation_notes && `: ${order.cancellation_notes}`}
    </p>
  )}
  ```

  Add the same `reasonLabels` map as in Task 9.

---

### Task 11: Update Frontend Order Type

> Use the **superpowers plugin** to execute this task.

**Files:**
- Modify: `frontend/src/types/order.ts`

Add the new fields to the shared Order type so TypeScript is happy across the app.

- [ ] **Step 1: Add new fields to the Order interface**

  ```typescript
  export interface Order {
    id: number;
    order_number: string;
    status: string;
    subtotal: number;
    shipping_fee: number;
    tax: number;
    total: number;
    payment_method: string | null;
    payment_status: string;
    shipping_address: Record<string, string>;
    items: OrderItem[];
    created_at: string;
    paid_at: string | null;
    cancellation_reason: string | null;
    cancellation_notes: string | null;
  }
  ```

---

## File Change Summary

| File | Action | Description |
|------|--------|-------------|
| `backend/database/migrations/0016_*` or `0017_*` | **MODIFY/CREATE** | Add `payment_failed` to orders status enum |
| `backend/database/migrations/0017_*` or `0018_*` | **CREATE** | Add `cancellation_reason` and `cancellation_notes` columns |
| `backend/app/Models/Order.php` | **MODIFY** | Add new fields to `$fillable` |
| `backend/app/Http/Controllers/CheckoutController.php` | **MODIFY** | Remove premature cart clearing for online payments |
| `backend/app/Services/PaymentService.php` | **MODIFY** | Accept custom cancel URL parameter |
| `backend/app/Http/Controllers/OrderController.php` | **MODIFY** | Add `markPaymentFailed` method, update `cancelOrder` to accept reasons |
| `backend/routes/api.php` | **MODIFY** | Add `payment-failed` route |
| `frontend/src/app/checkout/cancel/page.tsx` | **MODIFY** | Call payment-failed endpoint on mount, update messaging |
| `frontend/src/components/orders/CancelOrderModal.tsx` | **CREATE** | Modal component with reason selection form |
| `frontend/src/app/orders/page.tsx` | **MODIFY** | Integrate modal, display cancellation reasons |
| `frontend/src/app/business/orders/page.tsx` | **MODIFY** | Display cancellation reasons, add `payment_failed` status |
| `frontend/src/types/order.ts` | **MODIFY** | Add `cancellation_reason` and `cancellation_notes` fields |

## Verification Plan

### Issue 1: Unpaid Orders
1. Select QR PH payment at checkout, place order, get redirected to PayMongo
2. Hit cancel/back on the PayMongo page — should land on `/checkout/cancel?order_id=X`
3. Verify the order is marked as `payment_failed` in the database
4. Verify the cart still has the original items (not cleared)
5. Go to `/orders` — the order should show with "Payment Failed" status badge
6. Place a new QR PH order and complete payment — verify it goes through normally, cart is cleared by webhook

### Issue 2: Cancel Order Modal
1. Place a COD order (creates `pending_confirmation` order)
2. Go to `/orders`, expand the order, click "Cancel Order"
3. Verify the modal appears with all 6 reason options
4. Select "I changed my mind" — verify "Cancel Order" button is enabled
5. Select "Other" — verify textarea appears and "Cancel Order" is disabled until text is entered
6. Submit cancellation — verify order is marked as cancelled with the reason stored
7. Verify the cancellation reason appears in the expanded order view
8. Log in as the business owner — verify the cancellation reason is visible on the business orders page
9. Test modal keyboard interaction: Escape to close, tab navigation through options
