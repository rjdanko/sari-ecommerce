# UI Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement five targeted UI improvements across the SARI storefront and admin dashboard: admin order detail two-column layout, admin color scheme alignment to sari amber, four static footer pages, hero section mosaic pattern + typography upgrade, and navbar/CTA button color fixes.

**Architecture:** All changes are frontend-only Tailwind CSS / React component edits in the Next.js App Router project. New footer pages are static server components using the existing root layout. No new dependencies are introduced — lucide-react is already installed.

**Tech Stack:** Next.js 15 (App Router), React 19, Tailwind CSS v4, lucide-react, TypeScript

**Specs:**
- `frontend/docs/superpowers/specs/2026-04-28-admin-ui-footer-pages-design.md`
- `frontend/docs/superpowers/specs/2026-04-28-hero-cta-navbar-design.md`

---

## File Map

| File | Action | Task |
|---|---|---|
| `frontend/src/app/admin/orders/[id]/page.tsx` | Modify — two-column layout + color swaps | 1, 3 |
| `frontend/src/app/admin/layout.tsx` | Modify — color swaps | 2 |
| `frontend/src/app/admin/dashboard/page.tsx` | Modify — color swaps | 3 |
| `frontend/src/app/admin/users/page.tsx` | Modify — color swaps | 3 |
| `frontend/src/app/admin/users/[id]/page.tsx` | Modify — color swaps | 3 |
| `frontend/src/app/admin/stores/page.tsx` | Modify — color swaps | 3 |
| `frontend/src/app/admin/stores/[id]/page.tsx` | Modify — color swaps | 3 |
| `frontend/src/app/admin/products/page.tsx` | Modify — color swaps | 3 |
| `frontend/src/app/admin/products/[id]/page.tsx` | Modify — color swaps | 3 |
| `frontend/src/app/admin/inventory/page.tsx` | Modify — color swaps | 3 |
| `frontend/src/app/admin/orders/page.tsx` | Modify — color swaps | 3 |
| `frontend/src/app/admin/reviews/page.tsx` | Modify — color swaps | 3 |
| `frontend/src/app/admin/vouchers/page.tsx` | Modify — color swaps | 3 |
| `frontend/src/app/admin/vouchers/new/page.tsx` | Modify — color swaps | 3 |
| `frontend/src/app/admin/vouchers/[id]/page.tsx` | Modify — color swaps | 3 |
| `frontend/src/app/contact/page.tsx` | Create | 4 |
| `frontend/src/app/shipping/page.tsx` | Create | 5 |
| `frontend/src/app/returns/page.tsx` | Create | 6 |
| `frontend/src/app/faq/page.tsx` | Create | 7 |
| `frontend/src/app/page.tsx` | Modify — hero mosaic + typography + CTA button | 8 |
| `frontend/src/components/layout/Navbar.tsx` | Modify — login button color | 9 |

---

## Task 1: Admin Order Detail — Two-Column Layout

**Files:**
- Modify: `frontend/src/app/admin/orders/[id]/page.tsx`

**Use frontend-design skill** when implementing this task for design quality guidance.

- [ ] **Step 1: Replace the outer wrapper and restructure to two-column grid**

Open `frontend/src/app/admin/orders/[id]/page.tsx`. Replace the outer `<div className="p-6 space-y-6 max-w-2xl">` with a full-width wrapper and introduce a grid body. The full return JSX should become:

```tsx
return (
  <div className="p-6 space-y-6">
    {/* Header */}
    <div className="flex items-center gap-3">
      <Link href="/admin/orders" className="rounded-lg p-2 text-gray-500 hover:bg-gray-100">
        <ArrowLeft className="h-4 w-4" />
      </Link>
      <div>
        <h1 className="text-xl font-bold text-gray-900 font-mono">{order.order_number}</h1>
        <p className="text-sm text-gray-500">{new Date(order.created_at).toLocaleString()}</p>
      </div>
      <span className={`ml-auto rounded-full px-3 py-1 text-xs font-semibold capitalize ${statusColors[order.status] ?? 'bg-gray-100 text-gray-600'}`}>
        {order.status.replace('_', ' ')}
      </span>
    </div>

    {error && <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

    {/* Two-column grid */}
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left column — Items table */}
      <div className="lg:col-span-2">
        <div className="rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden h-full">
          <div className="border-b border-gray-100 px-6 py-4">
            <h2 className="text-sm font-semibold text-gray-900">Items</h2>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50/60">
              <tr>
                <th className="px-5 py-2 text-left text-xs font-semibold text-gray-500">Product</th>
                <th className="px-5 py-2 text-right text-xs font-semibold text-gray-500">Qty</th>
                <th className="px-5 py-2 text-right text-xs font-semibold text-gray-500">Price</th>
                <th className="px-5 py-2 text-right text-xs font-semibold text-gray-500">Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {order.items.map(item => (
                <tr key={item.id}>
                  <td className="px-5 py-3 text-gray-900">{item.product_name}</td>
                  <td className="px-5 py-3 text-right text-gray-600">{item.quantity}</td>
                  <td className="px-5 py-3 text-right text-gray-600">₱{Number(item.price).toLocaleString()}</td>
                  <td className="px-5 py-3 text-right font-medium text-gray-900">₱{Number(item.subtotal).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="border-t border-gray-100 px-6 py-4 space-y-1 text-sm">
            <div className="flex justify-between text-gray-600"><span>Subtotal</span><span>₱{Number(order.subtotal).toLocaleString()}</span></div>
            <div className="flex justify-between text-gray-600"><span>Shipping</span><span>₱{Number(order.shipping_fee).toLocaleString()}</span></div>
            {Number(order.discount) > 0 && <div className="flex justify-between text-emerald-700"><span>Discount</span><span>-₱{Number(order.discount).toLocaleString()}</span></div>}
            <div className="flex justify-between font-semibold text-gray-900 pt-1 border-t border-gray-100"><span>Total</span><span>₱{Number(order.total).toLocaleString()}</span></div>
          </div>
        </div>
      </div>

      {/* Right column — Buyer, Shipping, Status */}
      <div className="lg:col-span-1 space-y-6">
        {/* Buyer */}
        {order.user && (
          <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-6 space-y-2">
            <h2 className="text-sm font-semibold text-gray-900">Buyer</h2>
            <dl className="grid grid-cols-1 gap-3 text-sm">
              <div><dt className="text-gray-500">Name</dt><dd className="font-medium text-gray-900">{order.user.first_name} {order.user.last_name}</dd></div>
              <div><dt className="text-gray-500">Email</dt><dd className="font-medium text-gray-900 break-all">{order.user.email}</dd></div>
            </dl>
            <Link href={`/admin/users/${order.user.id}`} className="inline-block text-xs text-sari-600 hover:underline">View user →</Link>
          </div>
        )}

        {/* Shipping address */}
        {addr && (
          <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-6 space-y-2">
            <h2 className="text-sm font-semibold text-gray-900">Shipping Address</h2>
            <p className="text-sm text-gray-700">
              {[addr.line1, addr.line2, addr.city, addr.state, addr.postal_code, addr.country].filter(Boolean).join(', ')}
            </p>
          </div>
        )}

        {/* Status update */}
        <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-6 space-y-4">
          <h2 className="text-sm font-semibold text-gray-900">Update Status</h2>
          <div className="flex flex-col gap-3">
            <select
              value={newStatus}
              onChange={e => setNewStatus(e.target.value)}
              className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:border-sari-400 focus:outline-none focus:ring-1 focus:ring-sari-400"
            >
              {STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
            </select>
            <button
              onClick={updateStatus}
              disabled={saving || newStatus === order.status}
              className="rounded-xl bg-sari-600 px-4 py-2 text-sm font-medium text-white hover:bg-sari-700 disabled:opacity-40"
            >
              {saving ? 'Saving…' : 'Update'}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
);
```

- [ ] **Step 2: Verify loading and not-found states are unchanged**

Confirm lines 80–81 (loading spinner and not-found fallback) are untouched. They should still read:
```tsx
if (loading) return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-sari-600" /></div>;
if (!order) return <div className="p-6 text-sm text-gray-500">Order not found.</div>;
```
Note: the spinner color is updated to `text-sari-600` here as part of the color alignment (covered in Task 2).

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/admin/orders/[id]/page.tsx
git commit -m "feat(admin): two-column layout for order detail page"
```

---

## Task 2: Admin Layout — Color Scheme Alignment

**Files:**
- Modify: `frontend/src/app/admin/layout.tsx`

- [ ] **Step 1: Swap sidebar gradient and active nav color**

In `frontend/src/app/admin/layout.tsx`, find the sidebar `<aside>` block. Apply these replacements:

| Find | Replace |
|---|---|
| `shadow-[1px_0_12px_-4px_rgba(127,29,29,0.08)]` | `shadow-[1px_0_12px_-4px_rgba(180,83,9,0.08)]` |
| `bg-gradient-to-br from-red-700 to-red-900` (logo icon bg) | `bg-gradient-to-br from-sari-600 to-sari-700` |
| `bg-red-50 text-red-700` (ADMIN badge, appears twice) | `bg-sari-50 text-sari-700` |
| `bg-gradient-to-r from-red-700 to-red-900` (active nav item) | `bg-gradient-to-r from-sari-600 to-sari-700` |
| `shadow-red-900/20` (active nav shadow) | `shadow-sari-700/20` |
| `hover:bg-red-50 hover:text-red-800` (nav hover) | `hover:bg-sari-50 hover:text-sari-800` |
| `text-gray-400 group-hover:text-red-700` (nav icon hover) | `text-gray-400 group-hover:text-sari-600` |
| `from-red-100 to-red-200` (avatar bg) | `from-sari-100 to-sari-200` |
| `ring-red-100` (avatar ring) | `ring-sari-100` |
| `text-red-800` (avatar initials) | `text-sari-800` |
| `hover:bg-red-50 hover:text-red-500` (logout hover) | `hover:bg-sari-50 hover:text-sari-600` |
| `animate-spin text-red-700` (loading spinner) | `animate-spin text-sari-600` |

- [ ] **Step 2: Verify mobile header ADMIN badge**

The mobile header `<div>` (around line 71) also has an ADMIN badge. Confirm it now reads `bg-sari-50 text-sari-700` after the replacements above.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/admin/layout.tsx
git commit -m "feat(admin): align sidebar color scheme to sari amber palette"
```

---

## Task 3: Remaining Admin Pages — Color Sweep

**Files (all modify):**
- `frontend/src/app/admin/dashboard/page.tsx`
- `frontend/src/app/admin/users/page.tsx`
- `frontend/src/app/admin/users/[id]/page.tsx`
- `frontend/src/app/admin/stores/page.tsx`
- `frontend/src/app/admin/stores/[id]/page.tsx`
- `frontend/src/app/admin/products/page.tsx`
- `frontend/src/app/admin/products/[id]/page.tsx`
- `frontend/src/app/admin/inventory/page.tsx`
- `frontend/src/app/admin/orders/page.tsx`
- `frontend/src/app/admin/reviews/page.tsx`
- `frontend/src/app/admin/vouchers/page.tsx`
- `frontend/src/app/admin/vouchers/new/page.tsx`
- `frontend/src/app/admin/vouchers/[id]/page.tsx`

- [ ] **Step 1: Apply color swaps to each file**

For each file listed above, apply these replacements (only where the classes exist — not all files will have all of them):

| Find | Replace |
|---|---|
| `text-red-700` | `text-sari-600` |
| `bg-red-700` | `bg-sari-600` |
| `hover:bg-red-700` | `hover:bg-sari-600` |
| `bg-red-700 hover:bg-red-800` | `bg-sari-600 hover:bg-sari-700` |
| `from-red-700 to-red-900` | `from-sari-600 to-sari-700` |
| `bg-red-50 text-red-700` | `bg-sari-50 text-sari-700` |
| `hover:bg-red-50` | `hover:bg-sari-50` |
| `hover:text-red-800` | `hover:text-sari-800` |
| `focus:border-red-400` | `focus:border-sari-400` |
| `focus:ring-red-400` | `focus:ring-sari-400` |
| `animate-spin text-red-700` | `animate-spin text-sari-600` |
| `border-red-400` | `border-sari-400` |
| `ring-red-400` | `ring-sari-400` |

**Important — do NOT replace these** (semantic status colors, not admin brand):
- `bg-red-100 text-red-700` (cancelled order status badge)
- `text-red-600` (logout button — this is intentionally destructive red)
- `hover:bg-red-50` when it follows `text-red-600` (logout hover)
- `bg-red-50 px-4 py-3 text-sm text-red-700` (error message banners)

- [ ] **Step 2: Commit**

```bash
git add frontend/src/app/admin/dashboard/page.tsx \
        frontend/src/app/admin/users/page.tsx \
        frontend/src/app/admin/users/[id]/page.tsx \
        frontend/src/app/admin/stores/page.tsx \
        frontend/src/app/admin/stores/[id]/page.tsx \
        frontend/src/app/admin/products/page.tsx \
        frontend/src/app/admin/products/[id]/page.tsx \
        frontend/src/app/admin/inventory/page.tsx \
        frontend/src/app/admin/orders/page.tsx \
        frontend/src/app/admin/reviews/page.tsx \
        frontend/src/app/admin/vouchers/page.tsx \
        frontend/src/app/admin/vouchers/new/page.tsx \
        frontend/src/app/admin/vouchers/[id]/page.tsx
git commit -m "feat(admin): sweep remaining pages to sari amber color scheme"
```

---

## Task 4: Contact Us Page

**Files:**
- Create: `frontend/src/app/contact/page.tsx`

**Use frontend-design skill** when implementing this task.

- [ ] **Step 1: Create the Contact Us page**

Create `frontend/src/app/contact/page.tsx` with this content:

```tsx
import Link from 'next/link';
import { Mail, Clock, Instagram, Facebook } from 'lucide-react';

export default function ContactPage() {
  return (
    <main className="bg-white min-h-screen">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Get in Touch</h1>
        <p className="text-gray-500 mb-8">
          We&apos;re here to help. Reach out to the SARI team and we&apos;ll get back to you as soon as possible.
        </p>

        <div className="space-y-4">
          {/* Contact card */}
          <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-6 space-y-4">
            <h2 className="text-base font-semibold text-sari-700">Contact Details</h2>
            <div className="flex items-start gap-3">
              <Mail className="w-5 h-5 text-sari-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-gray-900">support@sari.ph</p>
                <p className="text-sm text-gray-500">For order issues, returns, and general inquiries</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-sari-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-gray-900">Response Time</p>
                <p className="text-sm text-gray-500">Within 24 hours on business days (Monday–Friday, 9AM–6PM PHT)</p>
              </div>
            </div>
          </div>

          {/* Social */}
          <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-6 space-y-4">
            <h2 className="text-base font-semibold text-sari-700">Follow Us</h2>
            <div className="flex gap-4">
              <a
                href="https://instagram.com/sarifashionph"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-gray-600 hover:text-sari-700 transition-colors"
              >
                <Instagram className="w-5 h-5" />
                @sarifashionph
              </a>
              <a
                href="https://facebook.com/sarifashionph"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-gray-600 hover:text-sari-700 transition-colors"
              >
                <Facebook className="w-5 h-5" />
                SARI Fashion PH
              </a>
            </div>
          </div>

          {/* FAQ nudge */}
          <div className="rounded-2xl bg-sari-50 border border-sari-100 p-5">
            <p className="text-sm text-sari-800">
              Have a quick question?{' '}
              <Link href="/faq" className="font-semibold underline hover:text-sari-900">
                Check our FAQ page
              </Link>{' '}
              first — you might find your answer there instantly.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Verify the page renders at `/contact`**

Start the dev server if not running: `cd frontend && npm run dev`

Open `http://localhost:3000/contact` in the browser. Confirm:
- Navbar and Footer render (from root layout)
- All three cards display correctly
- No console errors

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/contact/page.tsx
git commit -m "feat: add Contact Us page"
```

---

## Task 5: Shipping Info Page

**Files:**
- Create: `frontend/src/app/shipping/page.tsx`

**Use frontend-design skill** when implementing this task.

- [ ] **Step 1: Create the Shipping Info page**

Create `frontend/src/app/shipping/page.tsx`:

```tsx
import { Truck, Clock, Package, MapPin } from 'lucide-react';

export default function ShippingPage() {
  return (
    <main className="bg-white min-h-screen">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Shipping Information</h1>
        <p className="text-gray-500 mb-8">
          We ship nationwide across the Philippines. Here&apos;s everything you need to know.
        </p>

        <div className="space-y-4">
          {/* Delivery timeframes */}
          <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-sari-500" />
              <h2 className="text-base font-semibold text-sari-700">Delivery Timeframes</h2>
            </div>
            <div className="divide-y divide-gray-50">
              {[
                { area: 'Metro Manila', time: '2–3 business days' },
                { area: 'Luzon (provincial)', time: '3–5 business days' },
                { area: 'Visayas', time: '5–7 business days' },
                { area: 'Mindanao', time: '5–7 business days' },
              ].map(({ area, time }) => (
                <div key={area} className="flex justify-between py-3 text-sm">
                  <span className="text-gray-700 font-medium">{area}</span>
                  <span className="text-gray-500">{time}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Shipping fees */}
          <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-sari-500" />
              <h2 className="text-base font-semibold text-sari-700">Shipping Fees</h2>
            </div>
            <div className="divide-y divide-gray-50">
              <div className="flex justify-between py-3 text-sm">
                <span className="text-gray-700 font-medium">Standard shipping</span>
                <span className="text-gray-500">₱99 flat rate</span>
              </div>
              <div className="flex justify-between py-3 text-sm">
                <span className="text-gray-700 font-medium">Free shipping</span>
                <span className="text-emerald-600 font-medium">Orders ₱999 and above</span>
              </div>
            </div>
          </div>

          {/* Carriers */}
          <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Truck className="w-5 h-5 text-sari-500" />
              <h2 className="text-base font-semibold text-sari-700">Our Carriers</h2>
            </div>
            <p className="text-sm text-gray-600">
              We partner with trusted Philippine couriers. Your carrier is assigned based on availability and destination.
            </p>
            <div className="flex flex-wrap gap-2">
              {['J&T Express', 'LBC Express', 'Ninja Van'].map(carrier => (
                <span key={carrier} className="rounded-full bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700">
                  {carrier}
                </span>
              ))}
            </div>
          </div>

          {/* Tracking */}
          <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-6 space-y-3">
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-sari-500" />
              <h2 className="text-base font-semibold text-sari-700">Tracking Your Order</h2>
            </div>
            <p className="text-sm text-gray-600">
              Once your order is shipped, you&apos;ll receive an email with your tracking number. Use it on your assigned carrier&apos;s website to follow your delivery in real time.
            </p>
            <p className="text-sm text-gray-600">
              You can also view your order status anytime from{' '}
              <a href="/orders" className="font-medium text-sari-600 hover:underline">My Orders</a>.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Verify the page renders at `/shipping`**

Open `http://localhost:3000/shipping`. Confirm all four cards display, Navbar and Footer render, no console errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/shipping/page.tsx
git commit -m "feat: add Shipping Info page"
```

---

## Task 6: Returns & Refunds Page

**Files:**
- Create: `frontend/src/app/returns/page.tsx`

**Use frontend-design skill** when implementing this task.

- [ ] **Step 1: Create the Returns page**

Create `frontend/src/app/returns/page.tsx`:

```tsx
import { CheckCircle, XCircle, RotateCcw, CreditCard } from 'lucide-react';

export default function ReturnsPage() {
  return (
    <main className="bg-white min-h-screen">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Returns &amp; Refunds</h1>
        <p className="text-gray-500 mb-8">
          Not satisfied with your order? We make returns easy. Here&apos;s our policy.
        </p>

        <div className="space-y-4">
          {/* Return window */}
          <div className="rounded-2xl bg-sari-50 border border-sari-100 p-6">
            <p className="text-sari-800 font-semibold text-lg">7-Day Return Window</p>
            <p className="text-sari-700 text-sm mt-1">
              You have 7 days from the date of delivery to request a return.
            </p>
          </div>

          {/* Eligible items */}
          <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-6 space-y-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-500" />
              <h2 className="text-base font-semibold text-gray-900">Eligible for Return</h2>
            </div>
            <ul className="space-y-2 text-sm text-gray-600">
              {[
                'Unworn and unwashed items',
                'Items with original tags still attached',
                'Items in original packaging',
                'Items received damaged or defective',
              ].map(item => (
                <li key={item} className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Ineligible items */}
          <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-6 space-y-3">
            <div className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-400" />
              <h2 className="text-base font-semibold text-gray-900">Not Eligible for Return</h2>
            </div>
            <ul className="space-y-2 text-sm text-gray-600">
              {[
                'Sale and clearance items',
                'Intimate apparel and undergarments',
                'Items marked as final sale',
                'Items that have been worn, washed, or altered',
              ].map(item => (
                <li key={item} className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-300 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Return process */}
          <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-6 space-y-4">
            <div className="flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-sari-500" />
              <h2 className="text-base font-semibold text-sari-700">How to Return</h2>
            </div>
            <ol className="space-y-4">
              {[
                { step: '1', title: 'Email us', desc: 'Send your order number and reason for return to support@sari.ph within 7 days of delivery.' },
                { step: '2', title: 'Wait for approval', desc: 'Our team will review your request and respond within 1–2 business days.' },
                { step: '3', title: 'Ship the item back', desc: 'Pack the item securely and ship it using the return label we provide.' },
                { step: '4', title: 'Receive your refund', desc: 'Once we receive and inspect the item, your refund will be processed within 5–10 banking days.' },
              ].map(({ step, title, desc }) => (
                <li key={step} className="flex gap-4">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sari-100 text-sm font-bold text-sari-700">
                    {step}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{title}</p>
                    <p className="text-sm text-gray-500 mt-0.5">{desc}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          {/* Refund method */}
          <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-6 space-y-3">
            <div className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-sari-500" />
              <h2 className="text-base font-semibold text-sari-700">Refund Method</h2>
            </div>
            <p className="text-sm text-gray-600">
              Refunds are returned to your original payment method — GCash, credit/debit card, or PayMaya. Allow 5–10 banking days for the amount to reflect in your account.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Verify the page renders at `/returns`**

Open `http://localhost:3000/returns`. Confirm all cards display, numbered steps are visible, Navbar and Footer render, no console errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/returns/page.tsx
git commit -m "feat: add Returns and Refunds page"
```

---

## Task 7: FAQ Page

**Files:**
- Create: `frontend/src/app/faq/page.tsx`

**Use frontend-design skill** when implementing this task.

- [ ] **Step 1: Create the FAQ page with accordion**

Create `frontend/src/app/faq/page.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import Link from 'next/link';

const faqs = [
  {
    q: 'How do I create an account?',
    a: 'Click "Login" in the navbar and select "Register". Fill in your name, email, and password, then verify your email address to activate your account.',
  },
  {
    q: 'How do I track my order?',
    a: 'Once your order is shipped, you\'ll receive an email with a tracking number. Visit your assigned carrier\'s website and enter the tracking number to follow your delivery. You can also check your order status in My Orders.',
  },
  {
    q: 'What payment methods do you accept?',
    a: 'We accept GCash, PayMaya, and major credit/debit cards (Visa and Mastercard). Payment is processed securely at checkout.',
  },
  {
    q: 'Can I change or cancel my order?',
    a: 'Orders can only be changed or cancelled before they are processed by the seller. Email support@sari.ph immediately with your order number. Once processing has begun, cancellations may no longer be possible.',
  },
  {
    q: 'How do I return an item?',
    a: null,
    link: { label: 'Returns page', href: '/returns' },
  },
  {
    q: 'When will I receive my refund?',
    a: 'Refunds are processed within 5–10 banking days after we receive and inspect your returned item. The refund goes back to your original payment method.',
  },
  {
    q: 'How do I become a seller on SARI?',
    a: null,
    link: { label: 'Become a Seller page', href: '/become-seller' },
  },
  {
    q: 'How do I use a discount voucher?',
    a: 'At checkout, look for the "Voucher Code" field and enter your code before placing your order. Valid vouchers are applied automatically to your total.',
  },
];

export default function FAQPage() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <main className="bg-white min-h-screen">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Frequently Asked Questions</h1>
        <p className="text-gray-500 mb-8">
          Quick answers to common questions about shopping on SARI.
        </p>

        <div className="divide-y divide-gray-100 rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {faqs.map((faq, i) => (
            <div key={i}>
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="flex w-full items-center justify-between px-6 py-4 text-left hover:bg-gray-50 transition-colors"
              >
                <span className="text-sm font-semibold text-gray-900 pr-4">{faq.q}</span>
                <ChevronDown
                  className={`w-4 h-4 text-sari-500 shrink-0 transition-transform duration-200 ${open === i ? 'rotate-180' : ''}`}
                />
              </button>
              {open === i && (
                <div className="px-6 pb-5 text-sm text-gray-600">
                  {faq.a ? (
                    <p>{faq.a}</p>
                  ) : (
                    <p>
                      Please visit our{' '}
                      <Link href={faq.link!.href} className="font-medium text-sari-600 hover:underline">
                        {faq.link!.label}
                      </Link>{' '}
                      for full details.
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        <p className="mt-8 text-sm text-gray-500 text-center">
          Still have questions?{' '}
          <Link href="/contact" className="font-medium text-sari-600 hover:underline">
            Contact our support team
          </Link>
        </p>
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Verify the page renders at `/faq`**

Open `http://localhost:3000/faq`. Confirm:
- All 8 accordion items render
- Clicking an item opens/closes the answer
- Only one item is open at a time
- Links to `/returns` and `/become-seller` are present
- Navbar and Footer render, no console errors

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/faq/page.tsx
git commit -m "feat: add FAQ page with accordion"
```

---

## Task 8: Hero Section — Mosaic Pattern, Typography & CTA Button

**Files:**
- Modify: `frontend/src/app/page.tsx`

**Use frontend-design skill** when implementing this task.

- [ ] **Step 1: Add Sparkles import**

At the top of `frontend/src/app/page.tsx`, the file currently has only `Link` and `Image` imports from next. Add the lucide-react import:

```tsx
import { Sparkles } from 'lucide-react';
```

- [ ] **Step 2: Replace the hero section background and decorative elements**

Find the hero `<section>` (line 20). Replace the two existing decorative `div`s (the SVG background div and the two blur circle divs) with the mosaic rectangle layout:

Remove these three elements:
```tsx
<div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: 'url("data:image/svg+xml,...")' }} />
<div className="absolute top-0 right-0 w-[500px] h-[500px] bg-white/5 rounded-full -translate-y-1/2 translate-x-1/4 blur-3xl" />
<div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-sari-900/10 rounded-full translate-y-1/3 -translate-x-1/4 blur-3xl" />
```

Replace with:
```tsx
{/* Geometric mosaic pattern */}
<div className="absolute inset-0 pointer-events-none select-none overflow-hidden">
  <div className="absolute top-4 right-8 w-48 h-32 rounded-2xl bg-sari-300/40" />
  <div className="absolute top-0 right-48 w-24 h-24 rounded-xl bg-sari-600/30" />
  <div className="absolute top-8 right-20 w-32 h-48 rounded-2xl bg-sari-500/25" />
  <div className="absolute top-32 right-4 w-40 h-28 rounded-xl bg-sari-700/20" />
  <div className="absolute top-16 right-64 w-20 h-36 rounded-2xl bg-sari-400/35" />
  <div className="absolute bottom-0 right-12 w-56 h-24 rounded-2xl bg-sari-600/25" />
  <div className="absolute bottom-8 right-40 w-28 h-32 rounded-xl bg-sari-300/30" />
  <div className="absolute bottom-4 right-72 w-20 h-20 rounded-xl bg-sari-500/20" />
  <div className="absolute top-0 right-96 w-16 h-40 rounded-2xl bg-sari-400/25" />
  <div className="absolute bottom-0 right-96 w-36 h-20 rounded-xl bg-sari-700/15" />
</div>
```

- [ ] **Step 3: Update the badge to use Sparkles icon**

Find the badge `<span>` inside the hero content. Replace the existing inner content:

From:
```tsx
<span className="inline-flex items-center gap-1.5 bg-white/15 backdrop-blur-sm text-white text-xs font-semibold px-4 py-1.5 rounded-full mb-6 border border-white/10">
  NEW COLLECTION
</span>
```

To:
```tsx
<span className="inline-flex items-center gap-1.5 bg-white/15 backdrop-blur-sm text-white text-xs font-semibold px-4 py-1.5 rounded-full mb-6 border border-white/10">
  <Sparkles className="w-3.5 h-3.5" />
  NEW COLLECTION
</span>
```

- [ ] **Step 4: Upgrade the h1 typography**

From:
```tsx
<h1 className="font-display text-5xl md:text-6xl lg:text-7xl text-white leading-[1.1] tracking-tight">
```

To:
```tsx
<h1 className="font-black text-6xl md:text-7xl lg:text-8xl text-white leading-[1.05] tracking-tight">
```

- [ ] **Step 5: Update the Shop Now button**

From:
```tsx
className="group bg-gray-900 hover:bg-gray-800 text-white font-medium px-8 py-3.5 rounded-full transition-all duration-200 shadow-lg shadow-gray-900/30 hover:shadow-xl hover:shadow-gray-900/40"
```

To:
```tsx
className="group bg-white hover:bg-sari-50 text-sari-700 font-medium px-8 py-3.5 rounded-full transition-all duration-200 shadow-lg shadow-white/30 hover:shadow-xl hover:shadow-white/40"
```

- [ ] **Step 6: Verify hero at multiple viewports**

Open `http://localhost:3000`. Check:
- Mobile (375px): mosaic tiles don't overflow hero section bounds, h1 is large but fits without line-break issues
- Tablet (768px): layout looks balanced
- Desktop (1280px+): mosaic fills the right side of the hero naturally
- "Shop Now" button is white with amber text
- Sparkles icon appears in the badge
- No console errors

- [ ] **Step 7: Commit**

```bash
git add frontend/src/app/page.tsx
git commit -m "feat(hero): mosaic background, bold typography, white CTA button"
```

---

## Task 9: Navbar Login Button Color

**Files:**
- Modify: `frontend/src/components/layout/Navbar.tsx`

- [ ] **Step 1: Update the Login button classes**

In `frontend/src/components/layout/Navbar.tsx`, find the Login `Link` (around line 153):

From:
```tsx
className="bg-gradient-to-r from-sari-500 to-sari-600 hover:from-sari-600 hover:to-sari-700 text-white text-sm font-medium px-5 py-2 rounded-full shadow-sm hover:shadow-md transition-all duration-200"
```

To:
```tsx
className="bg-amber-400 hover:bg-amber-500 text-gray-900 text-sm font-medium px-5 py-2 rounded-full shadow-sm hover:shadow-md transition-all duration-200"
```

- [ ] **Step 2: Verify in browser**

Open `http://localhost:3000` while logged out. Confirm:
- Login button is a flat yellowish-gold color (not orange-gradient)
- Text is dark (`text-gray-900`) and legible
- Hover darkens slightly to `amber-500`
- No other navbar elements are affected

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/layout/Navbar.tsx
git commit -m "feat(navbar): set login button to yellowish-gold flat color"
```

---

## Self-Review Checklist

- [x] **Spec coverage — admin-ui-footer-pages spec:**
  - Admin order detail two-column layout → Task 1 ✓
  - Admin color scheme alignment (layout.tsx) → Task 2 ✓
  - Admin color sweep (all other pages) → Task 3 ✓
  - Contact Us page → Task 4 ✓
  - Shipping Info page → Task 5 ✓
  - Returns page → Task 6 ✓
  - FAQ page → Task 7 ✓

- [x] **Spec coverage — hero-cta-navbar spec:**
  - Hero mosaic pattern → Task 8, Steps 2 ✓
  - Extra-bold typography → Task 8, Step 4 ✓
  - Sparkles badge icon → Task 8, Step 3 ✓
  - Shop Now button white/amber → Task 8, Step 5 ✓
  - Navbar login button gold → Task 9 ✓

- [x] **No placeholders** — all steps have complete code
- [x] **Type consistency** — no cross-task type references; all changes are self-contained JSX/CSS
- [x] **Safety** — error banner red preserved, logout red preserved, order status badge colors preserved
