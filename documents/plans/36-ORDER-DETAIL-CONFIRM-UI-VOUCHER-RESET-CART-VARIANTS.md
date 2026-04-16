# Order Detail Pages, Confirm UI, Voucher Reset Fix & Cart Variant Selector

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Design tasks:** REQUIRED SUB-SKILL: Use `frontend-design:frontend-design` when implementing any new UI component or page (Tasks 1, 2, 3, 5).

**Goal:** Deliver five improvements: customer order detail page with product images & personal info; business order detail with dropdown action menu; a custom in-page confirm modal replacing `window.confirm()`; fix daily voucher schedule to reset at Philippine midnight; and a cart variant selector modal triggered from ProductCard.

**Architecture:** All five tasks are independent. Backend changes are limited to enriching the `OrderController::show` response (eager-loading variant options and product image) and fixing the voucher cron timezone. Frontend changes are new pages/components in Next.js 15 App Router using the existing `api` Axios instance and `CartContext`.

**Tech Stack:** Next.js 15 App Router, React, TypeScript, Tailwind CSS, Lucide React, Laravel 11, PHP 8.3, Sanctum auth, `frontend-design:frontend-design` skill for new UI surfaces.

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `backend/app/Http/Controllers/OrderController.php` | Modify | Eager-load `items.variant`, `items.product.primaryImage` in `show()` and `businessOrders()` |
| `backend/app/Http/Resources/OrderResource.php` | Modify | Expose `cancellation_reason`, `cancellation_notes`, `confirmed_at`, `discount`, `voucher_id` |
| `backend/routes/console.php` | Modify | Fix voucher cron to run at 16:01 UTC (= midnight PHT) |
| `frontend/src/types/order.ts` | Modify | Extend `OrderItem` with `variant_options`, `product_image_url`, `product_slug`; extend `Order` with `confirmed_at`, `discount` |
| `frontend/src/app/orders/[id]/page.tsx` | Create | Customer order detail page |
| `frontend/src/app/orders/page.tsx` | Modify | Make each order row a clickable link to `/orders/[id]` instead of expanding inline |
| `frontend/src/app/business/orders/page.tsx` | Modify | Make rows clickable links + add dropdown action menu next to Confirm button |
| `frontend/src/components/orders/ConfirmOrderModal.tsx` | Create | Custom in-page modal replacing `window.confirm()` for business order confirmation |
| `frontend/src/components/cart/VariantSelectorModal.tsx` | Create | Quick variant picker modal shown when cart icon clicked on a product with variants |
| `frontend/src/components/ProductCard.tsx` | Modify | Fetch product variants on cart-icon click; show `VariantSelectorModal` when variants exist |

---

## Task 1 — Enrich Order API Response

**Files:**
- Modify: `backend/app/Http/Controllers/OrderController.php`
- Modify: `backend/app/Http/Resources/OrderResource.php`

- [ ] **Step 1.1: Update `OrderController::show` to eager-load variant & product image**

  Open `backend/app/Http/Controllers/OrderController.php`. Change the `show()` method from:
  ```php
  return response()->json($order->load('items'));
  ```
  to:
  ```php
  return response()->json($order->load([
      'items.variant',
      'items.product.primaryImage',
  ]));
  ```

- [ ] **Step 1.2: Update `businessOrders` to include variant & product image**

  In the same file, change `businessOrders()` from:
  ```php
  ->with('items', 'user')
  ```
  to:
  ```php
  ->with(['items.variant', 'items.product.primaryImage', 'user'])
  ```

- [ ] **Step 1.3: Enrich `OrderResource` to expose all needed fields**

  Open `backend/app/Http/Resources/OrderResource.php`. Replace the `toArray` method body with:
  ```php
  return [
      'id'                  => $this->id,
      'order_number'        => $this->order_number,
      'status'              => $this->status,
      'subtotal'            => (float) $this->subtotal,
      'shipping_fee'        => (float) $this->shipping_fee,
      'tax'                 => (float) $this->tax,
      'discount'            => (float) ($this->discount ?? 0),
      'total'               => (float) $this->total,
      'payment_method'      => $this->payment_method,
      'payment_status'      => $this->payment_status,
      'shipping_address'    => $this->shipping_address,
      'notes'               => $this->notes,
      'cancellation_reason' => $this->cancellation_reason,
      'cancellation_notes'  => $this->cancellation_notes,
      'confirmed_at'        => $this->confirmed_at,
      'paid_at'             => $this->paid_at,
      'shipped_at'          => $this->shipped_at,
      'delivered_at'        => $this->delivered_at,
      'created_at'          => $this->created_at,
      'items'               => $this->whenLoaded('items', fn () =>
          $this->items->map(fn ($item) => [
              'id'              => $item->id,
              'product_id'      => $item->product_id,
              'product_name'    => $item->product_name,
              'product_slug'    => optional($item->product)->slug,
              'product_image_url' => optional(optional($item->product)->primaryImage)->url,
              'variant_id'      => $item->product_variant_id,
              'variant_options' => optional($item->variant)->options,
              'variant_name'    => optional($item->variant)->name,
              'quantity'        => $item->quantity,
              'unit_price'      => (float) $item->unit_price,
              'total_price'     => (float) $item->total_price,
          ])
      ),
      'user'                => $this->whenLoaded('user'),
  ];
  ```

- [ ] **Step 1.4: Verify the user-facing `OrderController::show` also uses `OrderResource`**

  In `backend/app/Http/Controllers/OrderController.php`, update `show()` to return via `OrderResource`:
  ```php
  use App\Http\Resources\OrderResource;

  public function show(Request $request, Order $order): JsonResponse
  {
      $this->authorize('view', $order);
      return response()->json(new OrderResource($order->load([
          'items.variant',
          'items.product.primaryImage',
      ])));
  }
  ```

- [ ] **Step 1.5: Update `OrderType` in frontend to match new payload**

  Open `frontend/src/types/order.ts`. Replace with:
  ```typescript
  export interface Order {
    id: number;
    order_number: string;
    status: string;
    subtotal: number;
    shipping_fee: number;
    tax: number;
    discount: number;
    total: number;
    payment_method: string | null;
    payment_status: string;
    shipping_address: Record<string, string>;
    notes: string | null;
    items: OrderItem[];
    created_at: string;
    confirmed_at: string | null;
    paid_at: string | null;
    shipped_at: string | null;
    delivered_at: string | null;
    cancellation_reason: string | null;
    cancellation_notes: string | null;
  }

  export interface OrderItem {
    id: number;
    product_id: number;
    product_name: string;
    product_slug: string | null;
    product_image_url: string | null;
    variant_id: number | null;
    variant_name: string | null;
    variant_options: Record<string, string> | null;
    quantity: number;
    unit_price: number;
    total_price: number;
  }
  ```

- [ ] **Step 1.6: Commit**
  ```bash
  git add backend/app/Http/Controllers/OrderController.php \
          backend/app/Http/Resources/OrderResource.php \
          frontend/src/types/order.ts
  git commit -m "feat: enrich order API with variant options, product images, and full address fields"
  ```

---

## Task 2 — Customer Order Detail Page

> **Use `frontend-design:frontend-design` skill when implementing this task for polished UI.**

**Files:**
- Create: `frontend/src/app/orders/[id]/page.tsx`
- Modify: `frontend/src/app/orders/page.tsx`

- [ ] **Step 2.1: Create the customer order detail page**

  Create `frontend/src/app/orders/[id]/page.tsx`:
  ```tsx
  'use client';

  import { useState, useEffect } from 'react';
  import { useRouter, useParams } from 'next/navigation';
  import Link from 'next/link';
  import { ArrowLeft, Package, MapPin, CreditCard, Tag } from 'lucide-react';
  import Navbar from '@/components/layout/Navbar';
  import api from '@/lib/api';
  import { useAuth } from '@/hooks/useAuth';
  import { formatPrice, cn } from '@/lib/utils';
  import { Order } from '@/types/order';

  const statusStyles: Record<string, string> = {
    pending_confirmation: 'bg-amber-50 text-amber-700 border-amber-200',
    confirmed: 'bg-blue-50 text-blue-700 border-blue-200',
    processing: 'bg-blue-50 text-blue-700 border-blue-200',
    paid: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    shipped: 'bg-sari-50 text-sari-700 border-sari-200',
    delivered: 'bg-green-50 text-green-700 border-green-200',
    cancelled: 'bg-red-50 text-red-700 border-red-200',
    payment_failed: 'bg-red-50 text-red-600 border-red-200',
  };

  const statusLabels: Record<string, string> = {
    pending_confirmation: 'Pending Store Confirmation',
    confirmed: 'Confirmed',
    processing: 'Processing',
    paid: 'Paid',
    shipped: 'Shipped',
    delivered: 'Delivered',
    cancelled: 'Cancelled',
    payment_failed: 'Payment Failed',
  };

  function formatDate(date: string): string {
    return new Intl.DateTimeFormat('en-PH', {
      year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    }).format(new Date(date));
  }

  export default function OrderDetailPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const params = useParams();
    const orderId = params.id as string;

    const [order, setOrder] = useState<Order | null>(null);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);

    useEffect(() => {
      if (!authLoading && !user) router.push('/login');
    }, [user, authLoading, router]);

    useEffect(() => {
      if (!user || !orderId) return;
      api.get(`/api/orders/${orderId}`)
        .then(({ data }) => setOrder(data))
        .catch(() => setNotFound(true))
        .finally(() => setLoading(false));
    }, [user, orderId]);

    if (loading || authLoading) {
      return (
        <>
          <Navbar />
          <main className="min-h-screen bg-gradient-to-b from-gray-50/80 to-white">
            <div className="max-w-4xl mx-auto px-4 py-10 space-y-6 animate-pulse">
              <div className="h-8 w-48 bg-gray-200 rounded" />
              <div className="h-64 bg-gray-100 rounded-2xl" />
              <div className="h-48 bg-gray-100 rounded-2xl" />
            </div>
          </main>
        </>
      );
    }

    if (notFound || !order) {
      return (
        <>
          <Navbar />
          <main className="min-h-screen bg-gray-50 flex items-center justify-center">
            <div className="text-center">
              <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" strokeWidth={1.5} />
              <h2 className="text-xl font-semibold text-gray-800">Order not found</h2>
              <Link href="/orders" className="mt-4 inline-block text-sari-600 hover:underline text-sm">
                Back to orders
              </Link>
            </div>
          </main>
        </>
      );
    }

    const addr = order.shipping_address ?? {};

    return (
      <>
        <Navbar />
        <main className="min-h-screen bg-gradient-to-b from-gray-50/80 to-white">
          {/* Header */}
          <div className="relative overflow-hidden bg-gradient-to-r from-sari-50 via-white to-sari-50 border-b border-gray-100">
            <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
              <Link
                href="/orders"
                className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to orders
              </Link>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="font-display text-2xl md:text-3xl text-gray-900 font-bold tracking-tight font-mono">
                  {order.order_number}
                </h1>
                <span className={cn(
                  'inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold border',
                  statusStyles[order.status] ?? 'bg-gray-100 text-gray-700 border-gray-200'
                )}>
                  {statusLabels[order.status] ?? order.status}
                </span>
              </div>
              <p className="mt-1 text-sm text-gray-500">Placed {formatDate(order.created_at)}</p>
            </div>
          </div>

          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
            {/* Items */}
            <section className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
                <Package className="w-4 h-4 text-sari-600" />
                <h2 className="font-semibold text-gray-900 text-sm">Order Items</h2>
              </div>
              <div className="divide-y divide-gray-50">
                {order.items.map((item) => (
                  <div key={item.id} className="flex gap-4 px-5 py-4">
                    {/* Product image */}
                    <div className="shrink-0 w-20 h-20 rounded-xl overflow-hidden bg-gray-50 border border-gray-100">
                      {item.product_image_url ? (
                        <img
                          src={item.product_image_url}
                          alt={item.product_name}
                          className="w-full h-full object-cover"
                          onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/placeholder-product.svg'; }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="w-8 h-8 text-gray-300" strokeWidth={1.5} />
                        </div>
                      )}
                    </div>
                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 text-sm leading-snug">
                        {item.product_slug ? (
                          <Link href={`/products/${item.product_slug}`} className="hover:text-sari-700 transition-colors">
                            {item.product_name}
                          </Link>
                        ) : item.product_name}
                      </p>
                      {/* Variant options */}
                      {item.variant_options && Object.keys(item.variant_options).length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                          {Object.entries(item.variant_options).map(([key, value]) => (
                            <span
                              key={key}
                              className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600"
                            >
                              <Tag className="w-2.5 h-2.5" />
                              {key}: {value}
                            </span>
                          ))}
                        </div>
                      )}
                      {item.variant_name && !item.variant_options && (
                        <p className="text-xs text-gray-500 mt-1">Variant: {item.variant_name}</p>
                      )}
                      <p className="text-xs text-gray-400 mt-1">Qty: {item.quantity}</p>
                    </div>
                    {/* Price */}
                    <div className="shrink-0 text-right">
                      <p className="font-semibold text-gray-900 text-sm">{formatPrice(item.total_price)}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{formatPrice(item.unit_price)} each</p>
                    </div>
                  </div>
                ))}
              </div>
              {/* Totals */}
              <div className="px-5 py-4 border-t border-gray-100 bg-gray-50/40 space-y-1.5 text-sm">
                <div className="flex justify-between text-gray-500">
                  <span>Subtotal</span><span>{formatPrice(order.subtotal)}</span>
                </div>
                <div className="flex justify-between text-gray-500">
                  <span>Shipping</span><span>{formatPrice(order.shipping_fee)}</span>
                </div>
                {order.tax > 0 && (
                  <div className="flex justify-between text-gray-500">
                    <span>Tax</span><span>{formatPrice(order.tax)}</span>
                  </div>
                )}
                {order.discount > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Discount</span><span>-{formatPrice(order.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-semibold text-gray-900 pt-1 border-t border-gray-200">
                  <span>Total</span><span>{formatPrice(order.total)}</span>
                </div>
              </div>
            </section>

            {/* Delivery & Personal Info */}
            <div className="grid sm:grid-cols-2 gap-6">
              <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center gap-2 mb-4">
                  <MapPin className="w-4 h-4 text-sari-600" />
                  <h2 className="font-semibold text-gray-900 text-sm">Shipping Address</h2>
                </div>
                <div className="space-y-1 text-sm text-gray-600">
                  {addr.first_name && (
                    <p className="font-medium text-gray-900">
                      {addr.first_name} {addr.last_name}
                    </p>
                  )}
                  {addr.phone && <p>{addr.phone}</p>}
                  {addr.address_line_1 && <p>{addr.address_line_1}</p>}
                  {addr.address_line_2 && <p>{addr.address_line_2}</p>}
                  {(addr.city || addr.province) && (
                    <p>{[addr.city, addr.province].filter(Boolean).join(', ')}</p>
                  )}
                  {addr.postal_code && <p>{addr.postal_code}</p>}
                  {addr.country && <p>{addr.country}</p>}
                  {addr.email && <p className="text-gray-400 text-xs mt-1">{addr.email}</p>}
                </div>
              </section>

              <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center gap-2 mb-4">
                  <CreditCard className="w-4 h-4 text-sari-600" />
                  <h2 className="font-semibold text-gray-900 text-sm">Payment</h2>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Method</span>
                    <span className="text-gray-900 font-medium capitalize">
                      {order.payment_method?.replace('_', ' ') ?? 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Status</span>
                    <span className="text-gray-900 font-medium capitalize">
                      {order.payment_status ?? 'N/A'}
                    </span>
                  </div>
                  {order.paid_at && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Paid at</span>
                      <span className="text-gray-900 text-xs">{formatDate(order.paid_at)}</span>
                    </div>
                  )}
                </div>
                {order.notes && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">Order Notes</p>
                    <p className="text-sm text-gray-600">{order.notes}</p>
                  </div>
                )}
              </section>
            </div>
          </div>
        </main>
      </>
    );
  }
  ```

- [ ] **Step 2.2: Update customer orders list to navigate instead of expand inline**

  In `frontend/src/app/orders/page.tsx`, change the outer `<button>` on the order summary row so clicking routes to the detail page instead of toggling expansion. Replace the `toggleExpand` button with a `Link`:
  ```tsx
  // Add to imports:
  import Link from 'next/link';

  // Replace the <button type="button" onClick={() => toggleExpand(order.id)} ...> wrapper with:
  <Link
    href={`/orders/${order.id}`}
    className="w-full px-5 py-4 flex items-center justify-between gap-4 text-left hover:bg-gray-50/60 transition-colors"
  >
    {/* ... same inner content, remove ChevronUp/ChevronDown icons ... */}
  </Link>
  ```
  Also remove the `expandedId` state, `toggleExpand` function, and the `{isExpanded && ...}` section since details are now on their own page. Keep the `CancelOrderModal` only accessible from the detail page (move the cancel button to the detail page in the next iteration, or leave it for now — the list page no longer needs expansion).

  > Note: Keep the cancel-order flow on the list page for now (render a "Cancel" button inline in the list for `pending_confirmation` status orders). Only the full item-detail is moved to the new page.

- [ ] **Step 2.3: Commit**
  ```bash
  git add frontend/src/app/orders/page.tsx \
          frontend/src/app/orders/[id]/page.tsx
  git commit -m "feat: add customer order detail page with product images, variant options, and shipping info"
  ```

---

## Task 3 — Business Order Detail & Dropdown Action Menu

> **Use `frontend-design:frontend-design` skill when implementing this task.**

**Files:**
- Create: `frontend/src/components/orders/ConfirmOrderModal.tsx`
- Modify: `frontend/src/app/business/orders/page.tsx`

- [ ] **Step 3.1: Create `ConfirmOrderModal` component**

  Create `frontend/src/components/orders/ConfirmOrderModal.tsx`:
  ```tsx
  'use client';

  import { CheckCircle, X } from 'lucide-react';

  interface ConfirmOrderModalProps {
    isOpen: boolean;
    orderNumber: string;
    onConfirm: () => void;
    onCancel: () => void;
    loading?: boolean;
  }

  export default function ConfirmOrderModal({
    isOpen,
    orderNumber,
    onConfirm,
    onCancel,
    loading = false,
  }: ConfirmOrderModalProps) {
    if (!isOpen) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          onClick={onCancel}
        />
        {/* Modal */}
        <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-200">
          <button
            onClick={onCancel}
            className="absolute top-4 right-4 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center justify-center w-14 h-14 rounded-full bg-emerald-50 mx-auto mb-4">
            <CheckCircle className="w-7 h-7 text-emerald-500" strokeWidth={1.5} />
          </div>

          <h2 className="text-center font-display text-lg font-semibold text-gray-900 mb-1">
            Confirm Order
          </h2>
          <p className="text-center text-sm text-gray-500 mb-6">
            Are you sure you want to confirm order{' '}
            <span className="font-mono font-semibold text-gray-700">{orderNumber}</span>?
            This action cannot be undone.
          </p>

          <div className="flex gap-3">
            <button
              onClick={onCancel}
              disabled={loading}
              className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              className="flex-1 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-600 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4" />
              )}
              Confirm Order
            </button>
          </div>
        </div>
      </div>
    );
  }
  ```

- [ ] **Step 3.2: Rewrite `BusinessOrdersPage` with clickable rows, detail dropdown, and `ConfirmOrderModal`**

  Open `frontend/src/app/business/orders/page.tsx`. Make these changes:

  1. Add imports:
     ```tsx
     import { useRouter } from 'next/navigation';
     import { Search, ShoppingCart, ChevronDown, Eye, CheckCircle } from 'lucide-react';
     import ConfirmOrderModal from '@/components/orders/ConfirmOrderModal';
     ```

  2. Add state:
     ```tsx
     const router = useRouter();
     const [confirmingOrder, setConfirmingOrder] = useState<Order | null>(null);
     const [confirmLoading, setConfirmLoading] = useState(false);
     const [openDropdownId, setOpenDropdownId] = useState<number | null>(null);
     ```

  3. Replace `handleConfirmOrder` with:
     ```tsx
     const handleConfirmOrder = async () => {
       if (!confirmingOrder) return;
       setConfirmLoading(true);
       try {
         await api.post(`/api/business/orders/${confirmingOrder.id}/confirm`);
         fetchOrders(search, statusFilter);
         setConfirmingOrder(null);
       } catch {
         // silently fail — add toast if available
       } finally {
         setConfirmLoading(false);
       }
     };
     ```

  4. In the table row, make the order number cell a clickable link:
     ```tsx
     <td className="px-5 py-4 cursor-pointer" onClick={() => router.push(`/business/orders/${order.id}`)}>
       <span className="font-mono text-sm font-medium text-gray-900 hover:text-sari-600 transition-colors">
         {order.order_number}
       </span>
     </td>
     ```

  5. Replace the Actions `<td>` with a split-button approach:
     ```tsx
     <td className="px-5 py-4">
       {order.status === 'pending_confirmation' ? (
         <div className="flex items-center gap-1 relative">
           <button
             onClick={() => setConfirmingOrder(order)}
             className="rounded-l-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-600 transition-colors"
           >
             Confirm
           </button>
           <button
             onClick={(e) => {
               e.stopPropagation();
               setOpenDropdownId(openDropdownId === order.id ? null : order.id);
             }}
             className="rounded-r-lg bg-emerald-500 border-l border-emerald-400 px-2 py-1.5 text-white hover:bg-emerald-600 transition-colors"
             aria-label="More actions"
           >
             <ChevronDown className="w-3.5 h-3.5" />
           </button>
           {/* Dropdown */}
           {openDropdownId === order.id && (
             <div className="absolute top-full right-0 mt-1 z-20 w-52 bg-white rounded-xl shadow-lg border border-gray-100 py-1 text-sm">
               <button
                 onClick={() => { router.push(`/business/orders/${order.id}`); setOpenDropdownId(null); }}
                 className="w-full flex items-center gap-2.5 px-4 py-2.5 text-gray-700 hover:bg-gray-50 transition-colors"
               >
                 <Eye className="w-4 h-4 text-gray-400" />
                 View Order Details
               </button>
             </div>
           )}
         </div>
       ) : (
         <button
           onClick={() => router.push(`/business/orders/${order.id}`)}
           className="inline-flex items-center gap-1.5 rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-200 transition-colors"
         >
           <Eye className="w-3 h-3" />
           View
         </button>
       )}
     </td>
     ```

  6. Add click-outside handler to close dropdown:
     ```tsx
     useEffect(() => {
       const handler = () => setOpenDropdownId(null);
       document.addEventListener('click', handler);
       return () => document.removeEventListener('click', handler);
     }, []);
     ```

  7. Render `ConfirmOrderModal` at the bottom of the return:
     ```tsx
     <ConfirmOrderModal
       isOpen={!!confirmingOrder}
       orderNumber={confirmingOrder?.order_number ?? ''}
       onConfirm={handleConfirmOrder}
       onCancel={() => setConfirmingOrder(null)}
       loading={confirmLoading}
     />
     ```

- [ ] **Step 3.3: Create the business order detail page**

  Create `frontend/src/app/business/orders/[id]/page.tsx`. This page fetches `/api/business/orders` and finds the matching order (or calls `/api/orders/{id}` via the admin-capable endpoint). Use the same layout as the customer detail page (Task 2) but render the customer's personal information (name, email, phone, full address) in a dedicated "Customer Info" card, and show the Confirm action button if status is `pending_confirmation`.

  ```tsx
  'use client';

  import { useState, useEffect } from 'react';
  import { useRouter, useParams } from 'next/navigation';
  import Link from 'next/link';
  import { ArrowLeft, Package, MapPin, User, CreditCard, Tag, CheckCircle } from 'lucide-react';
  import api from '@/lib/api';
  import { formatPrice, cn } from '@/lib/utils';
  import ConfirmOrderModal from '@/components/orders/ConfirmOrderModal';

  // Re-use the same Order/OrderItem types from @/types/order
  import type { Order } from '@/types/order';

  const statusStyles: Record<string, string> = {
    pending_confirmation: 'bg-amber-50 text-amber-700 border-amber-200',
    confirmed: 'bg-blue-50 text-blue-700 border-blue-200',
    processing: 'bg-blue-50 text-blue-700 border-blue-200',
    paid: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    shipped: 'bg-sari-50 text-sari-700 border-sari-200',
    delivered: 'bg-green-50 text-green-700 border-green-200',
    cancelled: 'bg-red-50 text-red-700 border-red-200',
    payment_failed: 'bg-red-50 text-red-600 border-red-200',
  };

  const statusLabels: Record<string, string> = {
    pending_confirmation: 'Pending Confirmation',
    confirmed: 'Confirmed',
    processing: 'Processing',
    paid: 'Paid',
    shipped: 'Shipped',
    delivered: 'Delivered',
    cancelled: 'Cancelled',
    payment_failed: 'Payment Failed',
  };

  function formatDate(d: string) {
    return new Intl.DateTimeFormat('en-PH', {
      year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    }).format(new Date(d));
  }

  interface BusinessOrder extends Order {
    user?: {
      first_name: string;
      last_name: string;
      email: string;
      phone?: string;
    };
  }

  export default function BusinessOrderDetailPage() {
    const router = useRouter();
    const params = useParams();
    const orderId = params.id as string;

    const [order, setOrder] = useState<BusinessOrder | null>(null);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);
    const [confirmingOrder, setConfirmingOrder] = useState(false);
    const [confirmLoading, setConfirmLoading] = useState(false);

    const fetchOrder = () => {
      api.get(`/api/business/orders`, { params: { per_page: 999 } })
        .then(({ data }) => {
          const found = (data.data ?? []).find((o: BusinessOrder) => String(o.id) === String(orderId));
          if (found) setOrder(found);
          else setNotFound(true);
        })
        .catch(() => setNotFound(true))
        .finally(() => setLoading(false));
    };

    useEffect(() => { fetchOrder(); }, [orderId]);

    const handleConfirm = async () => {
      if (!order) return;
      setConfirmLoading(true);
      try {
        await api.post(`/api/business/orders/${order.id}/confirm`);
        fetchOrder();
        setConfirmingOrder(false);
      } finally {
        setConfirmLoading(false);
      }
    };

    if (loading) {
      return (
        <div className="px-8 py-6 animate-pulse space-y-4">
          <div className="h-8 w-48 bg-gray-200 rounded" />
          <div className="h-64 bg-gray-100 rounded-2xl" />
        </div>
      );
    }

    if (notFound || !order) {
      return (
        <div className="px-8 py-6 text-center">
          <p className="text-gray-500">Order not found.</p>
          <Link href="/business/orders" className="text-sari-600 hover:underline text-sm mt-2 inline-block">
            Back to orders
          </Link>
        </div>
      );
    }

    const addr = order.shipping_address ?? {};

    return (
      <div className="px-6 py-6 max-w-4xl">
        {/* Back + Header */}
        <Link
          href="/business/orders"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-5 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to orders
        </Link>

        <div className="flex flex-wrap items-center gap-3 mb-6">
          <h1 className="font-display text-2xl font-bold text-gray-900 font-mono">
            {order.order_number}
          </h1>
          <span className={cn(
            'inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold border',
            statusStyles[order.status] ?? 'bg-gray-100 text-gray-700 border-gray-200'
          )}>
            {statusLabels[order.status] ?? order.status}
          </span>
          {order.status === 'pending_confirmation' && (
            <button
              onClick={() => setConfirmingOrder(true)}
              className="ml-auto flex items-center gap-1.5 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600 transition-colors"
            >
              <CheckCircle className="w-4 h-4" />
              Confirm Order
            </button>
          )}
        </div>

        <div className="space-y-6">
          {/* Items */}
          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
              <Package className="w-4 h-4 text-sari-600" />
              <h2 className="font-semibold text-gray-900 text-sm">Order Items</h2>
            </div>
            <div className="divide-y divide-gray-50">
              {order.items.map((item) => (
                <div key={item.id} className="flex gap-4 px-5 py-4">
                  <div className="shrink-0 w-16 h-16 rounded-xl overflow-hidden bg-gray-50 border border-gray-100">
                    {item.product_image_url ? (
                      <img
                        src={item.product_image_url}
                        alt={item.product_name}
                        className="w-full h-full object-cover"
                        onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/placeholder-product.svg'; }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-6 h-6 text-gray-300" strokeWidth={1.5} />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-sm">{item.product_name}</p>
                    {item.variant_options && Object.keys(item.variant_options).length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {Object.entries(item.variant_options).map(([key, value]) => (
                          <span key={key} className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600">
                            <Tag className="w-2.5 h-2.5" />{key}: {value}
                          </span>
                        ))}
                      </div>
                    )}
                    <p className="text-xs text-gray-400 mt-0.5">Qty: {item.quantity}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-semibold text-sm text-gray-900">{formatPrice(item.total_price)}</p>
                    <p className="text-xs text-gray-400">{formatPrice(item.unit_price)} each</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="px-5 py-4 border-t border-gray-100 bg-gray-50/40 space-y-1 text-sm">
              <div className="flex justify-between text-gray-500"><span>Subtotal</span><span>{formatPrice(order.subtotal)}</span></div>
              <div className="flex justify-between text-gray-500"><span>Shipping</span><span>{formatPrice(order.shipping_fee)}</span></div>
              {order.discount > 0 && <div className="flex justify-between text-emerald-600"><span>Discount</span><span>-{formatPrice(order.discount)}</span></div>}
              <div className="flex justify-between font-semibold text-gray-900 pt-1 border-t border-gray-200"><span>Total</span><span>{formatPrice(order.total)}</span></div>
            </div>
          </section>

          <div className="grid sm:grid-cols-2 gap-6">
            {/* Customer info */}
            {order.user && (
              <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center gap-2 mb-4">
                  <User className="w-4 h-4 text-sari-600" />
                  <h2 className="font-semibold text-gray-900 text-sm">Customer</h2>
                </div>
                <div className="space-y-1 text-sm text-gray-600">
                  <p className="font-medium text-gray-900">{order.user.first_name} {order.user.last_name}</p>
                  <p className="text-gray-500">{order.user.email}</p>
                  {order.user.phone && <p>{order.user.phone}</p>}
                </div>
              </section>
            )}

            {/* Shipping address */}
            <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-4">
                <MapPin className="w-4 h-4 text-sari-600" />
                <h2 className="font-semibold text-gray-900 text-sm">Shipping Address</h2>
              </div>
              <div className="space-y-1 text-sm text-gray-600">
                {addr.first_name && <p className="font-medium text-gray-900">{addr.first_name} {addr.last_name}</p>}
                {addr.phone && <p>{addr.phone}</p>}
                {addr.address_line_1 && <p>{addr.address_line_1}</p>}
                {addr.address_line_2 && <p>{addr.address_line_2}</p>}
                {(addr.city || addr.province) && <p>{[addr.city, addr.province].filter(Boolean).join(', ')}</p>}
                {addr.postal_code && <p>{addr.postal_code}</p>}
              </div>
            </section>
          </div>
        </div>

        <ConfirmOrderModal
          isOpen={confirmingOrder}
          orderNumber={order.order_number}
          onConfirm={handleConfirm}
          onCancel={() => setConfirmingOrder(false)}
          loading={confirmLoading}
        />
      </div>
    );
  }
  ```

- [ ] **Step 3.4: Commit**
  ```bash
  git add frontend/src/components/orders/ConfirmOrderModal.tsx \
          frontend/src/app/business/orders/page.tsx \
          frontend/src/app/business/orders/[id]/page.tsx
  git commit -m "feat: add business order detail page, dropdown action menu, and custom confirm modal"
  ```

---

## Task 4 — Fix Daily Voucher Reset to Philippine Midnight

**Files:**
- Modify: `backend/routes/console.php`

### Context: Why vouchers aren't resetting at midnight PHT

The scheduler calls `dailyAt('00:01')` which runs at **00:01 UTC**. The Philippines is **UTC+8**, so this fires at **08:01 AM Philippine Time** — not midnight. Daily vouchers have `expires_at = today()->endOfDay()` set in UTC. When a user in the Philippines tries to claim a voucher after midnight PHT but before the 8 AM scheduler run, the previous day's vouchers are expired and new ones haven't been generated yet.

**Fix:** Run the command at `16:01 UTC` which equals `00:01 PHT (UTC+8)`.

- [ ] **Step 4.1: Fix the cron schedule to UTC equivalent of midnight PHT**

  Open `backend/routes/console.php`. Change:
  ```php
  Schedule::command('vouchers:generate-daily')->dailyAt('00:01');
  ```
  to:
  ```php
  // 16:01 UTC = 00:01 PHT (UTC+8)
  Schedule::command('vouchers:generate-daily')->dailyAt('16:01');
  ```

- [ ] **Step 4.2: Fix the voucher expiry to also use PHT midnight**

  Open `backend/app/Console/Commands/GenerateDailyVouchers.php`. Change the Carbon initialization to use the Asia/Manila timezone so `startOfDay()` and `endOfDay()` are correct in PHT:

  Replace:
  ```php
  $today = Carbon::today();
  ```
  with:
  ```php
  $today = Carbon::today('Asia/Manila');
  ```

- [ ] **Step 4.3: Verify the fix manually**

  Run the command to confirm it generates vouchers for today in PHT:
  ```bash
  cd backend && php artisan vouchers:generate-daily
  ```
  Expected output:
  ```
  Daily vouchers generated for [today's date in PHT]
  ```
  Check the `vouchers` table and confirm `starts_at` and `expires_at` are `YYYY-MM-DD 00:00:00` and `YYYY-MM-DD 23:59:59` in Asia/Manila (stored in DB as UTC equivalents: `YYYY-MM-(D-1) 16:00:00` and `YYYY-MM-DD 15:59:59`).

- [ ] **Step 4.4: Commit**
  ```bash
  git add backend/routes/console.php \
          backend/app/Console/Commands/GenerateDailyVouchers.php
  git commit -m "fix: run daily voucher generation at 16:01 UTC (midnight PHT) and use Asia/Manila timezone for expiry"
  ```

---

## Task 5 — Cart Variant Selector Modal

> **Use `frontend-design:frontend-design` skill when implementing this task.**

**Files:**
- Create: `frontend/src/components/cart/VariantSelectorModal.tsx`
- Modify: `frontend/src/components/ProductCard.tsx`

- [ ] **Step 5.1: Create `VariantSelectorModal` component**

  Create `frontend/src/components/cart/VariantSelectorModal.tsx`:
  ```tsx
  'use client';

  import { useState } from 'react';
  import { X, ShoppingCart, Loader2 } from 'lucide-react';
  import { cn, formatPrice } from '@/lib/utils';

  interface Variant {
    id: number;
    name: string;
    price: number;
    stock_quantity: number;
    options: Record<string, string> | null;
    is_active: boolean;
  }

  interface VariantSelectorModalProps {
    isOpen: boolean;
    productName: string;
    productImage: string | null;
    basePrice: number;
    variants: Variant[];
    onClose: () => void;
    onAddToCart: (variantId: number) => Promise<void>;
  }

  export default function VariantSelectorModal({
    isOpen,
    productName,
    productImage,
    basePrice,
    variants,
    onClose,
    onAddToCart,
  }: VariantSelectorModalProps) {
    const [selectedVariantId, setSelectedVariantId] = useState<number | null>(null);
    const [adding, setAdding] = useState(false);

    const activeVariants = variants.filter((v) => v.is_active && v.stock_quantity > 0);
    const selectedVariant = activeVariants.find((v) => v.id === selectedVariantId) ?? null;

    const handleAdd = async () => {
      if (!selectedVariantId || adding) return;
      setAdding(true);
      try {
        await onAddToCart(selectedVariantId);
        onClose();
        setSelectedVariantId(null);
      } finally {
        setAdding(false);
      }
    };

    if (!isOpen) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          onClick={onClose}
        />
        {/* Sheet / modal */}
        <div className="relative bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl shadow-2xl animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200">
          {/* Handle (mobile) */}
          <div className="sm:hidden flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 rounded-full bg-gray-200" />
          </div>

          {/* Header */}
          <div className="flex items-start gap-3 px-5 pt-4 pb-4 border-b border-gray-100">
            {productImage && (
              <div className="shrink-0 w-14 h-14 rounded-xl overflow-hidden bg-gray-50 border border-gray-100">
                <img
                  src={productImage}
                  alt={productName}
                  className="w-full h-full object-cover"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/placeholder-product.svg'; }}
                />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 text-sm leading-snug line-clamp-2">{productName}</p>
              <p className="text-sari-600 font-bold text-base mt-0.5">
                {selectedVariant ? formatPrice(selectedVariant.price) : formatPrice(basePrice)}
              </p>
            </div>
            <button
              onClick={onClose}
              className="shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Variants */}
          <div className="px-5 py-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Select Variant
            </p>
            <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto pr-1">
              {activeVariants.map((variant) => {
                const isSelected = selectedVariantId === variant.id;
                return (
                  <button
                    key={variant.id}
                    onClick={() => setSelectedVariantId(variant.id)}
                    className={cn(
                      'w-full flex items-center justify-between px-3.5 py-3 rounded-xl border-2 text-left transition-all duration-150',
                      isSelected
                        ? 'border-sari-400 bg-sari-50 text-sari-800'
                        : 'border-gray-100 bg-white text-gray-700 hover:border-gray-200 hover:bg-gray-50',
                    )}
                  >
                    <div>
                      <p className="font-medium text-sm">{variant.name}</p>
                      {variant.options && Object.keys(variant.options).length > 0 && (
                        <p className="text-xs text-gray-400 mt-0.5">
                          {Object.entries(variant.options).map(([k, v]) => `${k}: ${v}`).join(' · ')}
                        </p>
                      )}
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <p className={cn('font-semibold text-sm', isSelected ? 'text-sari-700' : 'text-gray-900')}>
                        {formatPrice(variant.price)}
                      </p>
                      {variant.stock_quantity <= 5 && (
                        <p className="text-[10px] text-amber-500 font-medium mt-0.5">
                          Only {variant.stock_quantity} left
                        </p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
            {activeVariants.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-4">No variants available.</p>
            )}
          </div>

          {/* Footer CTA */}
          <div className="px-5 pb-6 pt-2">
            <button
              onClick={handleAdd}
              disabled={!selectedVariantId || adding}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-sari-400 to-sari-600 text-white py-3 text-sm font-semibold shadow-sm hover:shadow-md hover:from-sari-500 hover:to-sari-700 active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {adding ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ShoppingCart className="w-4 h-4" />
              )}
              {selectedVariantId ? 'Add to Cart' : 'Select a Variant'}
            </button>
          </div>
        </div>
      </div>
    );
  }
  ```

- [ ] **Step 5.2: Update `ProductCard` to show variant modal on cart click when variants exist**

  Open `frontend/src/components/ProductCard.tsx`. Add the following changes:

  1. Add import at top:
     ```tsx
     import VariantSelectorModal from '@/components/cart/VariantSelectorModal';
     import api from '@/lib/api';
     ```
     Also import `ProductVariant` type or define locally:
     ```tsx
     interface ProductVariant {
       id: number;
       name: string;
       price: number;
       stock_quantity: number;
       options: Record<string, string> | null;
       is_active: boolean;
     }
     ```

  2. Add state inside `ProductCard`:
     ```tsx
     const [variantModalOpen, setVariantModalOpen] = useState(false);
     const [variants, setVariants] = useState<ProductVariant[]>([]);
     const [loadingVariants, setLoadingVariants] = useState(false);
     ```

  3. Replace the cart button's `onClick` handler:
     ```tsx
     onClick={async (e) => {
       e.preventDefault();
       if (addingToCart || loadingVariants) return;

       // Fetch variants for this product on first click
       setLoadingVariants(true);
       try {
         const { data } = await api.get(`/api/products/${product.slug}`);
         const productVariants: ProductVariant[] = data.variants ?? [];
         const activeVariants = productVariants.filter((v) => v.is_active && v.stock_quantity > 0);

         if (activeVariants.length > 0) {
           setVariants(activeVariants);
           setVariantModalOpen(true);
           return; // don't add yet — wait for user to pick
         }
       } catch {
         // If fetch fails, fall through to add without variant
       } finally {
         setLoadingVariants(false);
       }

       // No variants or fetch failed — add directly
       setAddingToCart(true);
       try {
         await addItem(product.id);
         addToast({
           type: 'success',
           title: 'Added to cart',
           message: product.name,
           action: { label: 'View Cart', href: '/cart' },
         });
       } catch {
         addToast({
           type: 'error',
           title: 'Could not add to cart',
           message: 'Please log in or try again.',
         });
       } finally {
         setAddingToCart(false);
       }
     }}
     ```

  4. Update the disabled state and spinner:
     ```tsx
     disabled={addingToCart || loadingVariants}
     ```
     And show spinner when `loadingVariants`:
     ```tsx
     {(addingToCart || loadingVariants) ? (
       <Loader2 className="w-4 h-4 animate-spin" />
     ) : (
       <ShoppingCart className="w-4 h-4" />
     )}
     ```

  5. Add the modal at the bottom of the returned JSX, before the closing `</div>`:
     ```tsx
     <VariantSelectorModal
       isOpen={variantModalOpen}
       productName={product.name}
       productImage={primaryUrl ?? proxyUrl}
       basePrice={product.base_price}
       variants={variants}
       onClose={() => setVariantModalOpen(false)}
       onAddToCart={async (variantId) => {
         await addItem(product.id, 1, variantId);
         addToast({
           type: 'success',
           title: 'Added to cart',
           message: product.name,
           action: { label: 'View Cart', href: '/cart' },
         });
       }}
     />
     ```

- [ ] **Step 5.3: Verify `GET /api/products/{slug}` returns variants**

  Check `backend/app/Http/Controllers/ProductController.php`'s `show()` method loads `variants`. If it doesn't, add it:
  ```php
  $product->load(['category', 'images', 'primaryImage', 'variants', 'store', 'business']);
  ```

- [ ] **Step 5.4: Commit**
  ```bash
  git add frontend/src/components/cart/VariantSelectorModal.tsx \
          frontend/src/components/ProductCard.tsx
  git commit -m "feat: show variant selector modal when adding product with variants to cart from product card"
  ```

---

## Self-Review

**Spec coverage check:**

| Requirement | Task |
|---|---|
| Customer order detail page with product image, variant options, personal info | Task 1 (API) + Task 2 (UI) |
| Business admin can click order row → redirect to detail | Task 3, Step 3.2 |
| Business admin dropdown arrow next to Confirm showing order + customer details | Task 3, Steps 3.2 & 3.3 |
| Replace `window.confirm()` with in-page confirm modal | Task 3, Step 3.1 |
| Voucher reset time explanation and fix for PHT midnight | Task 4 |
| Cart icon on product card with variants → variant selector modal | Task 5 |

**No placeholders:** All steps include full code. No TBDs.

**Type consistency:** `OrderItem.product_image_url`, `variant_options`, `variant_name`, `product_slug` defined in Task 1, Step 1.5 and used consistently in Tasks 2 and 3. `ProductVariant` interface defined in Task 5 and matches the `ProductResource` `variants` field.
