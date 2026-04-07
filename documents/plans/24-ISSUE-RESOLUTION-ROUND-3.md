# Issue Resolution Round 3 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
> Use **frontend-design:frontend-design** skill for any UI component work (splash screens, order status badges, interactive buttons).
> Use **superpowers:systematic-debugging** skill for all bug investigations.

**Goal:** Fix 9 issues covering cart rendering, product images, order confirmation flow, stock management, Buy Now behavior, interactive cursors, and QR PH payment integration.

**Architecture:** Cart page is currently a static empty-state skeleton — needs to consume `CartContext` to render items. The order system needs a new `confirmed` status with store-owner confirmation flow. Checkout needs a "direct buy" mode that bypasses the cart. PayMongo QR PH payment requires using the `gcash`/`grab_pay` replacement with `qrph` payment method type.

**Tech Stack:** Next.js (frontend), Laravel 11 (backend), Redis (cart storage), PayMongo API (payments), Tailwind CSS (styling)

---

## Issue Index

| # | Issue | Type | Layer |
|---|-------|------|-------|
| 1 | Cart page always shows empty despite items being added | Bug | Frontend |
| 2 | Product images not loading on product cards | Bug | Backend/Frontend |
| 3 | Order confirmation flow (store confirms, client can cancel before) | Feature | Full-stack |
| 4 | Order placed splash screen ("Pending Store Confirmation" + recommendations) | Feature | Frontend |
| 5 | Stock quantity not decrementing after checkout | Bug | Backend |
| 6 | Remove checked-out products from cart after order placement | Bug | Backend |
| 7 | Interactive cursor styles on buttons | Enhancement | Frontend |
| 8 | "Buy Now" should go directly to checkout without adding to cart | Feature | Full-stack |
| 9 | QR PH payment via PayMongo gateway in new tab | Feature | Full-stack |

---

## File Structure

### Files to Modify
- `frontend/src/app/cart/page.tsx` — render actual cart items from CartContext (currently skeleton-only)
- `frontend/src/components/ProductCard.tsx` — fix image URL resolution
- `frontend/src/app/products/[slug]/page.tsx` — fix "Buy Now" to use direct checkout
- `frontend/src/app/checkout/page.tsx` — support "direct buy" mode via query params, handle QR PH redirect, clear cart after order
- `frontend/src/app/orders/page.tsx` — show "Pending Store Confirmation" status, add cancel button
- `frontend/src/app/business/orders/page.tsx` — add "Confirm Order" action button
- `frontend/src/app/globals.css` — add `cursor-pointer` utility for interactive elements
- `backend/app/Http/Controllers/OrderController.php` — add confirm/cancel endpoints, new status
- `backend/app/Http/Controllers/CheckoutController.php` — add direct-buy endpoint, clear cart after order, handle COD stock decrement
- `backend/app/Services/PaymentService.php` — add QR PH payment method support
- `backend/app/Services/CartService.php` — add method to clear cart
- `backend/app/Jobs/ProcessPaymentWebhook.php` — also clear cart after payment confirmation
- `backend/app/Http/Resources/ProductResource.php` — ensure `primary_image` URL is absolute
- `backend/app/Models/Order.php` — add `confirmed_at` and `cancelled_at` timestamps, update status options

### Files to Create
- `frontend/src/app/checkout/success/page.tsx` — order confirmation splash screen with clock icon and recommendations
- `frontend/src/app/checkout/cancel/page.tsx` — payment cancelled landing page
- `backend/database/migrations/XXXX_add_confirmation_fields_to_orders_table.php` — adds `confirmed_at`, `cancelled_at`, updates status enum

---

## Task 1: Fix Cart Page — Render Actual Cart Items

**Skill:** `superpowers:systematic-debugging`

**Root Cause:** [cart/page.tsx](frontend/src/app/cart/page.tsx) is a static component that only renders the empty state. It never imports `useCartContext` or calls `fetchCart()`. The add-to-cart animations and badge work because `CartContext` is wired up in the navbar and `ProductCard`, but the cart page itself is disconnected.

**Files:**
- Modify: `frontend/src/app/cart/page.tsx`

- [ ] **Step 1: Read the Next.js docs**

Before writing any Next.js code, check `node_modules/next/dist/docs/` for any API changes relevant to client components.

- [ ] **Step 2: Rewrite cart page to consume CartContext**

Replace the static empty-state-only page with a full cart page that:
- Imports and uses `useCartContext()` to get `cart`, `loading`, `fetchCart`, `updateQuantity`, `removeItem`
- Shows a loading skeleton while `loading` is true
- Shows the empty state when `cart.items.length === 0`
- Renders each cart item with: product image, name, unit price, quantity controls (+/- buttons), remove button (trash icon), line total
- Shows subtotal and a "Proceed to Checkout" button linking to `/checkout`
- Uses `frontend-design:frontend-design` skill for the cart item layout and quantity controls

Key implementation details:
- Cart items are available at `cart.items`, each with shape: `{ product_id, quantity, variant_id, product: { name, base_price, image_url, stock_quantity } }`
- Use `updateQuantity(productId, newQty)` for +/- buttons (min 1, max `product.stock_quantity`)
- Use `removeItem(productId)` for the trash button
- Call `fetchCart()` in a `useEffect` on mount

- [ ] **Step 3: Verify the fix**

Run the dev server, add items to cart, navigate to `/cart`, confirm items appear with correct quantities and prices. Test +/-, remove, and empty state.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/app/cart/page.tsx
git commit -m "fix: render actual cart items from CartContext on cart page"
```

---

## Task 2: Fix Product Images Not Loading on Product Cards

**Skill:** `superpowers:systematic-debugging`

**Root Cause:** The product list API at `ProductController::index()` returns paginated Eloquent models that eager-load `primaryImage` (camelCase relation name). Laravel serializes camelCase relations as `primary_image` (snake_case) in JSON. However, the issue is likely that:
1. Image URLs stored in the database are **relative paths** (e.g., `products/image.jpg`) without the full storage URL prefix
2. Or the `ProductResource` wraps URLs with the storage base URL but the index endpoint doesn't use `ProductResource`

**Files:**
- Investigate: `backend/app/Http/Controllers/ProductController.php` — check if index uses `ProductResource`
- Investigate: `backend/app/Models/Product.php` — check `primaryImage` relation
- Investigate: `backend/app/Http/Resources/ProductResource.php` — check how image URL is returned
- Modify: whichever file needs the fix (likely `ProductResource.php` or `ProductController.php`)
- Check: `frontend/src/components/ProductCard.tsx:27-28` — reads `product.primary_image?.url`

- [ ] **Step 1: Investigate the API response**

Run:
```bash
cd backend && php artisan tinker --execute="echo json_encode(App\Models\Product::with('primaryImage')->first()?->toArray(), JSON_PRETTY_PRINT);"
```

Check: Does the `primary_image` key exist? Does `url` contain a full URL or a relative path?

- [ ] **Step 2: Check ProductController index endpoint**

Read `backend/app/Http/Controllers/ProductController.php` lines 22-46. Verify whether it returns raw models or uses `ProductResource::collection()`.

- [ ] **Step 3: Fix the image URL**

If URLs are relative, ensure the `ProductResource` (or wherever the response is built) prepends the storage URL:

```php
// In ProductResource.php, inside the toArray method:
'primary_image' => $this->whenLoaded('primaryImage', function () {
    $image = $this->primaryImage;
    return [
        'url' => $image->url ? (str_starts_with($image->url, 'http') ? $image->url : asset('storage/' . $image->url)) : null,
        'alt_text' => $image->alt_text,
    ];
}),
```

If the index endpoint doesn't use `ProductResource`, wrap it:
```php
return ProductResource::collection($products);
```

- [ ] **Step 4: Verify the fix**

Load the products page in the browser. Confirm product card images load correctly. Check the network tab to see the actual image URLs being requested.

- [ ] **Step 5: Commit**

```bash
git add backend/app/Http/Resources/ProductResource.php backend/app/Http/Controllers/ProductController.php
git commit -m "fix: ensure product image URLs are absolute in API responses"
```

---

## Task 3: Order Confirmation Flow — Store Confirms, Client Can Cancel

**Skill:** `superpowers:brainstorming` (for feature design), then implementation

This is the largest task. The flow is:

1. Customer places order -> status = `pending_confirmation`
2. Customer sees "Pending Store Confirmation" on their orders page, with a "Cancel Order" button
3. Store owner sees the order in their dashboard with a "Confirm Order" button
4. Store owner confirms -> status = `confirmed` -> customer's order page auto-updates to reflect this
5. Once confirmed, the customer **cannot** cancel
6. Normal flow continues: `confirmed` -> `processing` -> `shipped` -> `delivered`

**Files:**
- Create: `backend/database/migrations/XXXX_add_confirmation_fields_to_orders_table.php`
- Modify: `backend/app/Models/Order.php` — add `confirmed_at`, `cancelled_at` casts
- Modify: `backend/app/Http/Controllers/OrderController.php` — add `confirmOrder()`, `cancelOrder()` methods
- Modify: `backend/app/Http/Controllers/CheckoutController.php` — set initial status to `pending_confirmation`
- Modify: `backend/routes/api.php` — add new routes
- Modify: `frontend/src/app/orders/page.tsx` — show new statuses, add cancel button
- Modify: `frontend/src/app/business/orders/page.tsx` — add confirm button

### Backend

- [ ] **Step 3.1: Create migration for confirmation fields**

```bash
cd backend && php artisan make:migration add_confirmation_fields_to_orders_table
```

Migration content:
```php
public function up(): void
{
    Schema::table('orders', function (Blueprint $table) {
        $table->timestamp('confirmed_at')->nullable()->after('paid_at');
        $table->timestamp('cancelled_at')->nullable()->after('confirmed_at');
    });
}

public function down(): void
{
    Schema::table('orders', function (Blueprint $table) {
        $table->dropColumn(['confirmed_at', 'cancelled_at']);
    });
}
```

Run: `php artisan migrate`

- [ ] **Step 3.2: Update Order model**

In `backend/app/Models/Order.php`:
- Add `confirmed_at` and `cancelled_at` to `$fillable`
- Add them to the `casts()` method as `'datetime'`

- [ ] **Step 3.3: Update CheckoutController — set initial status**

In `backend/app/Http/Controllers/CheckoutController.php`, change:
```php
'status' => 'pending',
```
to:
```php
'status' => 'pending_confirmation',
```

- [ ] **Step 3.4: Add confirmOrder and cancelOrder to OrderController**

In `backend/app/Http/Controllers/OrderController.php`:

```php
/**
 * Business: Confirm an order.
 */
public function confirmOrder(Request $request, Order $order): JsonResponse
{
    $this->authorize('updateStatus', $order);

    if ($order->status !== 'pending_confirmation') {
        return response()->json(['error' => 'Order cannot be confirmed in its current state.'], 422);
    }

    $order->update([
        'status' => 'confirmed',
        'confirmed_at' => now(),
    ]);

    return response()->json($order->fresh()->load('items'));
}

/**
 * Customer: Cancel an order (only before store confirmation).
 */
public function cancelOrder(Request $request, Order $order): JsonResponse
{
    $this->authorize('view', $order);

    if ($order->status !== 'pending_confirmation') {
        return response()->json(['error' => 'Order can only be cancelled before store confirmation.'], 422);
    }

    $order->update([
        'status' => 'cancelled',
        'cancelled_at' => now(),
    ]);

    return response()->json($order->fresh()->load('items'));
}
```

- [ ] **Step 3.5: Update the updateStatus allowed values**

In `OrderController::updateStatus()`, update the validation to include `pending_confirmation` and `confirmed`:
```php
'status' => ['required', 'string', 'in:pending_confirmation,confirmed,processing,shipped,delivered,cancelled'],
```

- [ ] **Step 3.6: Add routes**

In `backend/routes/api.php`, add inside the authenticated user group:
```php
Route::post('/orders/{order}/cancel', [OrderController::class, 'cancelOrder']);
```

And inside the business group:
```php
Route::post('/orders/{order}/confirm', [OrderController::class, 'confirmOrder']);
```

- [ ] **Step 3.7: Run migration and verify endpoints**

```bash
cd backend && php artisan migrate
```

Test with tinker or a REST client that the new endpoints work.

### Frontend

- [ ] **Step 3.8: Update customer orders page**

**Skill:** `frontend-design:frontend-design`

In `frontend/src/app/orders/page.tsx`:
- Add `pending_confirmation` to `statusStyles`:
  ```ts
  pending_confirmation: 'bg-amber-50 text-amber-700',
  confirmed: 'bg-blue-50 text-blue-700',
  ```
- Display `pending_confirmation` as `"Pending Store Confirmation"` (human-readable label)
- Add a "Cancel Order" button that appears only when `order.status === 'pending_confirmation'`:
  ```tsx
  {order.status === 'pending_confirmation' && (
    <button
      onClick={() => handleCancelOrder(order.id)}
      className="mt-3 text-sm text-red-600 hover:text-red-700 font-medium cursor-pointer"
    >
      Cancel Order
    </button>
  )}
  ```
- Implement `handleCancelOrder`:
  ```ts
  const handleCancelOrder = async (orderId: number) => {
    try {
      await api.post(`/api/orders/${orderId}/cancel`);
      // Refresh orders
      const { data } = await api.get('/api/orders');
      setOrders(data.data ?? []);
      addToast({ type: 'info', title: 'Order cancelled' });
    } catch (err: any) {
      addToast({ type: 'error', title: 'Could not cancel order', message: err.response?.data?.error });
    }
  };
  ```

- [ ] **Step 3.9: Update business orders page**

**Skill:** `frontend-design:frontend-design`

In `frontend/src/app/business/orders/page.tsx`:
- Add `pending_confirmation` and `confirmed` to `statusStyles` and `statusOptions`
- Add a "Confirm" action button in each row for orders with status `pending_confirmation`:
  ```tsx
  {order.status === 'pending_confirmation' && (
    <button
      onClick={() => handleConfirmOrder(order.id)}
      className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-600 transition-colors cursor-pointer"
    >
      Confirm
    </button>
  )}
  ```
- Add an "Actions" column header in the table
- Implement `handleConfirmOrder`:
  ```ts
  const handleConfirmOrder = async (orderId: number) => {
    try {
      await api.post(`/api/business/orders/${orderId}/confirm`);
      fetchOrders(search, statusFilter);
    } catch {}
  };
  ```

- [ ] **Step 3.10: Verify the flow end-to-end**

1. Place an order -> should show as `Pending Store Confirmation` on customer orders page
2. Cancel button should appear and work
3. Place another order -> store owner confirms it in business dashboard
4. Customer orders page should reflect `confirmed` status
5. Cancel button should NOT appear for confirmed orders

- [ ] **Step 3.11: Commit**

```bash
git add backend/database/migrations/ backend/app/Models/Order.php backend/app/Http/Controllers/OrderController.php backend/app/Http/Controllers/CheckoutController.php backend/routes/api.php frontend/src/app/orders/page.tsx frontend/src/app/business/orders/page.tsx
git commit -m "feat: add order confirmation flow with store confirm and client cancel"
```

---

## Task 4: Order Confirmation Splash Screen

**Skill:** `frontend-design:frontend-design`

After placing an order, the user should see a splash screen with:
- A clock icon and "Pending Store Confirmation" message
- A "You May Also Like" section showing recommended products related to what was ordered

**Files:**
- Create: `frontend/src/app/checkout/success/page.tsx`
- Modify: `frontend/src/app/checkout/page.tsx` — redirect to `/checkout/success` after placing order

- [ ] **Step 4.1: Create the success/splash page**

**Skill:** `frontend-design:frontend-design` — use this skill for the splash screen design.

Create `frontend/src/app/checkout/success/page.tsx`:

Key design elements:
- Full-page layout with Navbar
- Centered hero section with:
  - Animated clock icon (use `Clock` from lucide-react) inside a pulsing amber/sari circle
  - Large heading: "Order Placed Successfully!"
  - Subheading: "Pending Store Confirmation"
  - Explanatory text: "Your order is being reviewed by the store. You'll be notified once it's confirmed."
  - "View My Orders" button linking to `/orders`
  - "Continue Shopping" secondary link to `/products`
- Below the hero, a "You May Also Like" section:
  - Fetch recommendations from `/api/recommendations/for-you` or `/api/products?limit=4` as fallback
  - Render using `ProductCard` components in a grid
- Accept `?order_id=X` query param (optional, for fetching order-specific recommendations)

- [ ] **Step 4.2: Update checkout to redirect to splash screen**

In `frontend/src/app/checkout/page.tsx`, change the `handlePlaceOrder` success handler:

```ts
// Before:
window.location.href = '/orders';

// After:
window.location.href = '/checkout/success';
```

For QR PH payments (Task 9), the PayMongo redirect will handle the return to this page via `success_url`.

- [ ] **Step 4.3: Verify**

Place a COD order, confirm redirect to splash screen, confirm recommendations load, confirm "View My Orders" link works.

- [ ] **Step 4.4: Commit**

```bash
git add frontend/src/app/checkout/success/page.tsx frontend/src/app/checkout/page.tsx
git commit -m "feat: add order confirmation splash screen with recommendations"
```

---

## Task 5: Fix Stock Quantity Not Decrementing After Checkout

**Skill:** `superpowers:systematic-debugging`

**Root Cause:** Stock is ONLY decremented in `ProcessPaymentWebhook` (line 58-59), which runs after PayMongo confirms payment. For **COD orders**, there is NO payment webhook — the order is created with status `pending_confirmation` and stock is never decremented.

**Files:**
- Modify: `backend/app/Http/Controllers/CheckoutController.php`

- [ ] **Step 5.1: Decrement stock at order creation for COD**

In `CheckoutController::createSession()`, after creating order items, check payment method. For COD orders, decrement stock immediately since there's no payment webhook:

```php
// After creating order items, inside the DB::transaction:
if ($validated['payment_method'] === 'cod') {
    foreach ($cartItems as $item) {
        Product::where('id', $item['product_id'])
            ->decrement('stock_quantity', $item['quantity']);
    }
}
```

Add the `use App\Models\Product;` import at the top of the file.

For QR PH (PayMongo) orders, stock will be decremented in `ProcessPaymentWebhook` as it already does.

- [ ] **Step 5.2: Differentiate COD vs online payment flow in CheckoutController**

The current `CheckoutController` always creates a PayMongo session. For COD, skip PayMongo and return the order directly:

```php
if ($validated['payment_method'] === 'cod') {
    $order->update(['payment_method' => 'cod']);

    // Clear cart
    $this->cartService->clearCart($user->id);

    return response()->json([
        'order' => $order->load('items'),
        'redirect_url' => config('app.frontend_url') . '/checkout/success',
    ]);
}

// QR PH / online payment — create PayMongo session
$session = $this->paymentService->createCheckoutSession(
    $lineItems,
    ['order_id' => $order->id, 'order_number' => $order->order_number]
);
```

- [ ] **Step 5.3: Add clearCart method to CartService if missing**

Check if `CartService` has a `clearCart(int $userId)` method. If not, add one:

```php
public function clearCart(int $userId): void
{
    Redis::del("cart:{$userId}");
}
```

- [ ] **Step 5.4: Verify stock decrement**

1. Note a product's stock quantity (e.g., 10)
2. Place a COD order for 1 unit
3. Check the product's stock_quantity in DB — should be 9
4. Check the product page in the frontend — should show 9 available

- [ ] **Step 5.5: Commit**

```bash
git add backend/app/Http/Controllers/CheckoutController.php backend/app/Services/CartService.php
git commit -m "fix: decrement stock at checkout for COD orders, clear cart after order"
```

---

## Task 6: Remove Checked-Out Products from Cart After Order

**Skill:** `superpowers:systematic-debugging`

**Root Cause:** The cart is stored in Redis (`cart:{userId}`) and is never cleared after checkout. This was partially addressed in Task 5 (COD), but needs to also work for PayMongo payments.

**Files:**
- Modify: `backend/app/Jobs/ProcessPaymentWebhook.php` — clear cart after payment
- Modify: `frontend/src/contexts/CartContext.tsx` — refresh cart state after checkout

- [ ] **Step 6.1: Clear cart in ProcessPaymentWebhook**

In `backend/app/Jobs/ProcessPaymentWebhook.php`, after marking the order as paid and decrementing stock:

```php
// Clear the user's cart after successful payment
app(CartService::class)->clearCart($order->user_id);
```

Add import: `use App\Services\CartService;`

- [ ] **Step 6.2: Refresh cart on frontend after order placement**

In `frontend/src/app/checkout/page.tsx`, after successful order placement, the redirect to `/checkout/success` will cause a page reload which triggers `CartContext`'s `useEffect` to re-fetch the cart (now empty).

No additional frontend change needed here — the cart refresh happens automatically on navigation.

- [ ] **Step 6.3: Verify**

1. Add 2 items to cart
2. Place a COD order
3. Navigate to cart page — should be empty
4. Check navbar badge — should show 0 / be hidden

- [ ] **Step 6.4: Commit**

```bash
git add backend/app/Jobs/ProcessPaymentWebhook.php
git commit -m "fix: clear cart after successful payment webhook"
```

---

## Task 7: Interactive Cursor Styles on Buttons

**Files:**
- Modify: `frontend/src/app/globals.css`

- [ ] **Step 7.1: Add global cursor-pointer rule for interactive elements**

In `frontend/src/app/globals.css`, add a global rule that applies `cursor: pointer` to all interactive elements:

```css
/* Interactive cursor for clickable elements */
button:not(:disabled),
[role="button"]:not(:disabled),
a,
select,
label[for],
input[type="checkbox"],
input[type="radio"],
summary {
  cursor: pointer;
}

button:disabled,
[role="button"]:disabled {
  cursor: not-allowed;
}
```

This is a one-line global fix rather than modifying every button across the codebase. Tailwind's `cursor-pointer` class on individual buttons becomes redundant but harmless.

- [ ] **Step 7.2: Verify**

Navigate through the app and hover over various buttons, links, checkboxes. Confirm the pointer cursor appears. Confirm disabled buttons show `not-allowed` cursor.

- [ ] **Step 7.3: Commit**

```bash
git add frontend/src/app/globals.css
git commit -m "feat: add global interactive cursor styles for buttons and links"
```

---

## Task 8: "Buy Now" Goes Directly to Checkout (No Cart)

**Skill:** `superpowers:brainstorming` (for flow design)

Currently, `handleBuyNow` in `products/[slug]/page.tsx` adds the item to cart then redirects to checkout. The user wants "Buy Now" to bypass the cart entirely.

**Approach:** Pass product details via URL query params to a "direct checkout" mode on the checkout page. The checkout page will read these params and display only that single product, without touching the cart.

**Files:**
- Modify: `frontend/src/app/products/[slug]/page.tsx` — change `handleBuyNow` to redirect with query params
- Modify: `frontend/src/app/checkout/page.tsx` — detect direct-buy mode and show single product
- Modify: `backend/app/Http/Controllers/CheckoutController.php` — accept `direct_buy` with product_id + quantity
- Modify: `backend/routes/api.php` — add direct-buy checkout route if needed

- [ ] **Step 8.1: Update handleBuyNow on product page**

In `frontend/src/app/products/[slug]/page.tsx`, change:

```ts
const handleBuyNow = async () => {
  if (!product) return;
  // Navigate directly to checkout with product info — does NOT add to cart
  const params = new URLSearchParams({
    direct: '1',
    product_id: product.id.toString(),
    quantity: quantity.toString(),
  });
  window.location.href = `/checkout?${params.toString()}`;
};
```

Remove the `await handleAddToCart()` call from `handleBuyNow`.

- [ ] **Step 8.2: Update checkout page to support direct-buy mode**

In `frontend/src/app/checkout/page.tsx`:

```ts
import { useSearchParams } from 'next/navigation';

// Inside the component:
const searchParams = useSearchParams();
const isDirect = searchParams.get('direct') === '1';
const directProductId = searchParams.get('product_id');
const directQuantity = parseInt(searchParams.get('quantity') || '1', 10);

const [directProduct, setDirectProduct] = useState<any>(null);
```

Add a `useEffect` to fetch the product when in direct mode:
```ts
useEffect(() => {
  if (isDirect && directProductId) {
    api.get(`/api/products/${directProductId}`).then(({ data }) => {
      setDirectProduct(data.data ?? data);
    });
  } else {
    fetchCart();
  }
}, [isDirect, directProductId, fetchCart]);
```

When rendering items:
- If `isDirect && directProduct`: render only the direct product with `directQuantity`
- Otherwise: render cart items as currently done

Update `handlePlaceOrder` to pass `direct_buy` info:
```ts
const payload: any = {
  payment_method: paymentMethod,
  shipping_address: { ... },
};

if (isDirect && directProductId) {
  payload.direct_buy = {
    product_id: parseInt(directProductId),
    quantity: directQuantity,
  };
}

const { data } = await api.post('/api/checkout', payload);
```

- [ ] **Step 8.3: Update backend CheckoutController for direct buy**

In `CheckoutController::createSession()`, check for `direct_buy` in the request:

```php
if ($request->has('direct_buy')) {
    $directBuy = $validated['direct_buy'];
    $product = Product::findOrFail($directBuy['product_id']);
    
    $cartItems = [[
        'product_id' => $product->id,
        'quantity' => $directBuy['quantity'],
        'product' => $product->toArray(),
    ]];
} else {
    $cartItems = $this->cartService->getCart($user->id);
}
```

Update `CheckoutRequest` validation to accept `direct_buy`:
```php
'direct_buy' => ['sometimes', 'array'],
'direct_buy.product_id' => ['required_with:direct_buy', 'integer', 'exists:products,id'],
'direct_buy.quantity' => ['required_with:direct_buy', 'integer', 'min:1'],
```

Only clear cart if NOT a direct buy:
```php
if (!$request->has('direct_buy')) {
    $this->cartService->clearCart($user->id);
}
```

- [ ] **Step 8.4: Verify**

1. Go to a product detail page, click "Buy Now"
2. Should redirect to checkout with only that product shown
3. Cart should be unaffected (items still there if any)
4. Place the order — should work correctly
5. Test "Add to Cart" still works separately

- [ ] **Step 8.5: Commit**

```bash
git add frontend/src/app/products/[slug]/page.tsx frontend/src/app/checkout/page.tsx backend/app/Http/Controllers/CheckoutController.php backend/app/Http/Requests/CheckoutRequest.php
git commit -m "feat: Buy Now bypasses cart and goes directly to checkout"
```

---

## Task 9: Fix QR PH Payment — PayMongo Gateway in New Tab

**Skill:** `superpowers:systematic-debugging` (to understand current PayMongo integration)

Currently, `PaymentService::createCheckoutSession()` creates a PayMongo Checkout Session with `payment_method_types: ['card', 'gcash']`. For QR PH, PayMongo doesn't have a direct `qrph` type in Checkout Sessions. Instead, you need to:

1. Create a **PayMongo Source** (not a Checkout Session) with type `grab_pay` or use the **PayMongo Links** API, OR
2. Use PayMongo's Checkout Session which already supports QR PH natively when you include it in payment methods

PayMongo's Checkout Sessions support `qrph` as a payment method type. The fix is to add `'qrph'` to the `payment_method_types` array.

**Files:**
- Modify: `backend/app/Services/PaymentService.php` — add `qrph` payment method type
- Modify: `backend/app/Http/Controllers/CheckoutController.php` — conditionally set payment methods based on user's choice
- Modify: `frontend/src/app/checkout/page.tsx` — open PayMongo URL in a new tab for QR PH, handle return

- [ ] **Step 9.1: Update PaymentService to support QR PH**

In `backend/app/Services/PaymentService.php`, modify `createCheckoutSession` to accept payment method types:

```php
public function createCheckoutSession(array $lineItems, array $metadata = [], array $paymentMethods = ['card', 'gcash']): array
{
    $response = Http::withBasicAuth($this->secretKey, '')
        ->post("{$this->baseUrl}/checkout_sessions", [
            'data' => [
                'attributes' => [
                    'line_items' => $lineItems,
                    'payment_method_types' => $paymentMethods,
                    // ... rest stays the same
                ],
            ],
        ]);
    // ...
}
```

- [ ] **Step 9.2: Update CheckoutController to pass QR PH method**

In `CheckoutController::createSession()`, when the payment method is `qrph`:

```php
$paymentMethods = match ($validated['payment_method']) {
    'qrph' => ['qrph'],
    default => ['card', 'gcash'],
};

$session = $this->paymentService->createCheckoutSession(
    $lineItems,
    ['order_id' => $order->id, 'order_number' => $order->order_number],
    $paymentMethods
);
```

The response will contain `checkout_url` — this is the PayMongo-hosted page with the QR code.

- [ ] **Step 9.3: Update frontend checkout to open PayMongo in new tab**

In `frontend/src/app/checkout/page.tsx`, update `handlePlaceOrder`:

```ts
const { data } = await api.post('/api/checkout', payload);

if (data.checkout_url) {
  // Online payment — open PayMongo gateway in new tab
  window.open(data.checkout_url, '_blank');
  // Redirect current page to success (will show "pending" until webhook confirms)
  window.location.href = '/checkout/success';
} else {
  // COD — redirect directly
  window.location.href = data.redirect_url || '/checkout/success';
}
```

- [ ] **Step 9.4: Create checkout cancel page**

Create `frontend/src/app/checkout/cancel/page.tsx` — a simple page shown when the user cancels from PayMongo:

Design:
- Message: "Payment was cancelled"
- Link back to cart or to retry checkout

- [ ] **Step 9.5: Verify the success_url return**

The `PaymentService` already sets `success_url` to `FRONTEND_URL/checkout/success?session_id={id}`. After the user pays via QR PH, PayMongo redirects them to this URL. The PayMongo tab should close (or show the redirect). The main tab is already on `/checkout/success`.

- [ ] **Step 9.6: Verify end-to-end**

1. Select QR PH at checkout
2. Click "Place Order"
3. A new tab opens with PayMongo's QR code page
4. Complete payment (or use PayMongo test mode)
5. The tab redirects to `/checkout/success`
6. Check that the webhook fires and updates the order to `paid`

- [ ] **Step 9.7: Commit**

```bash
git add backend/app/Services/PaymentService.php backend/app/Http/Controllers/CheckoutController.php frontend/src/app/checkout/page.tsx frontend/src/app/checkout/cancel/page.tsx
git commit -m "feat: integrate QR PH payment via PayMongo gateway in new tab"
```

---

## Execution Order

Execute in dependency order — foundational fixes first, then features that build on them:

| Phase | Tasks | Rationale |
|-------|-------|-----------|
| **Phase 1: Core Fixes** | 1, 2, 7 | Fix broken cart page, product images, and cursor styles |
| **Phase 2: Stock & Cart Cleanup** | 5, 6 | Fix stock decrement and cart clearing |
| **Phase 3: Order Flow** | 3, 4 | New confirmation flow + splash screen |
| **Phase 4: Buy Now** | 8 | Direct checkout bypassing cart |
| **Phase 5: Payments** | 9 | QR PH PayMongo integration |

### Per-Task Process

For each task:
1. Invoke the relevant **superpowers skill** (`systematic-debugging` for bugs, `brainstorming` for features)
2. For any UI component work, invoke `frontend-design:frontend-design` to ensure polished design
3. Before writing any Next.js code, read `node_modules/next/dist/docs/` for API changes
4. Implement the fix
5. Use `superpowers:verification-before-completion` — run the app and verify the fix works before moving on
6. Commit after each task with a descriptive message

---

## Notes

- **AGENTS.md Warning:** The frontend uses a newer Next.js version. Before writing any Next.js code, read `node_modules/next/dist/docs/` for API changes.
- Tasks 5 and 6 are closely related (stock + cart clearing) — implement together.
- Task 3 (order confirmation flow) is the largest and most complex. Consider breaking into backend and frontend sub-tasks.
- PayMongo QR PH (Task 9) requires a valid PayMongo API key with QR PH enabled. Verify in the PayMongo dashboard that QR PH is an active payment method.
- The `CheckoutController` currently always creates a PayMongo session — Task 5 refactors it to branch on payment method (COD vs online).
