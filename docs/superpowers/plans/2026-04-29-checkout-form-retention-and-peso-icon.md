# Checkout Form Retention & Peso Icon Fix — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Retain the user's shipping form data after a cancelled/failed QRPH or card payment so they don't have to re-enter it on retry; and replace the `DollarSign` lucide icon with `Banknote` on both dashboard revenue metric tiles.

**Architecture:** Feature 1 uses `sessionStorage` to serialize and restore the checkout form state across the PayMongo redirect cycle — write on submit, restore on mount, clear on success. Feature 2 is a pure icon swap in two dashboard files with no logic changes.

**Tech Stack:** Next.js (App Router), React hooks (`useState`, `useEffect`), browser `sessionStorage` API, lucide-react icon library, TypeScript.

---

## File Map

| File | Change |
|------|--------|
| `frontend/src/app/checkout/page.tsx` | Save form to sessionStorage before redirect; restore on mount; clear on COD success |
| `frontend/src/app/checkout/success/page.tsx` | Clear sessionStorage draft on mount (handles card/qrph success) |
| `frontend/src/app/business/dashboard/page.tsx` | Swap `DollarSign` → `Banknote` |
| `frontend/src/app/admin/dashboard/page.tsx` | Swap `DollarSign` → `Banknote` |

---

## Task 1: Restore shipping form draft on checkout page mount

**Files:**
- Modify: `frontend/src/app/checkout/page.tsx`

This task adds a `useEffect` inside `CheckoutContent` that reads `sessionStorage` on mount and pre-fills the form and payment method if a previous draft exists.

The draft key is `checkout_shipping_draft`. The stored value is:
```json
{ "form": { "fullName": "", "phone": "", "address1": "", "address2": "", "city": "", "province": "", "zip": "" }, "paymentMethod": "qrph" }
```

- [ ] **Step 1: Add restore-draft effect to CheckoutContent**

Open `frontend/src/app/checkout/page.tsx`. Inside `CheckoutContent`, find the block of existing `useEffect` calls (around line 90). Add this new effect **after** the existing effects:

```typescript
// Restore shipping draft saved before payment redirect
useEffect(() => {
  try {
    const raw = sessionStorage.getItem('checkout_shipping_draft');
    if (!raw) return;
    const draft = JSON.parse(raw) as {
      form: typeof form;
      paymentMethod: PaymentMethod;
    };
    if (draft.form) setForm(draft.form);
    if (draft.paymentMethod) setPaymentMethod(draft.paymentMethod);
  } catch {
    // Ignore malformed draft
  }
}, []); // eslint-disable-line react-hooks/exhaustive-deps
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd "c:\Users\Username\Downloads\PERSONAL PROJECTS\sari-ecommerce\frontend"
npx tsc --noEmit
```

Expected: No errors related to checkout/page.tsx.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/checkout/page.tsx
git commit -m "feat(checkout): restore shipping form draft from sessionStorage on mount"
```

---

## Task 2: Save shipping form draft before payment redirect

**Files:**
- Modify: `frontend/src/app/checkout/page.tsx`

This task writes the form state to `sessionStorage` inside `handlePlaceOrder`, after validation passes and before the PayMongo redirect (for card/qrph) or before the COD redirect. For COD it also immediately clears the draft since the order is confirmed.

- [ ] **Step 1: Find handlePlaceOrder**

Open `frontend/src/app/checkout/page.tsx`. Find the `handlePlaceOrder` function (around line 221). It looks like:

```typescript
const handlePlaceOrder = async () => {
  if (!validateForm()) return;
  setSubmitting(true);
  setError('');
  try {
    const { data } = await api.post('/api/checkout', { ... });
    if (data.checkout_url) {
      window.location.href = data.checkout_url;
    } else {
      window.location.href = data.redirect_url || '/checkout/success';
    }
  } catch (err: any) {
    ...
  } finally {
    setSubmitting(false);
  }
};
```

- [ ] **Step 2: Write draft before redirect, clear on COD**

Replace the `if (data.checkout_url)` block inside `handlePlaceOrder` with the following (keep all surrounding code unchanged):

```typescript
// Save draft so form can be restored if payment is cancelled
const draft = { form, paymentMethod };
try {
  sessionStorage.setItem('checkout_shipping_draft', JSON.stringify(draft));
} catch {
  // sessionStorage unavailable — proceed without saving
}

if (data.checkout_url) {
  // Online payment — redirect to PayMongo; draft will be restored on cancel/retry
  window.location.href = data.checkout_url;
} else {
  // COD — order is confirmed, clear the draft immediately
  try {
    sessionStorage.removeItem('checkout_shipping_draft');
  } catch {
    // ignore
  }
  window.location.href = data.redirect_url || '/checkout/success';
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd "c:\Users\Username\Downloads\PERSONAL PROJECTS\sari-ecommerce\frontend"
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/app/checkout/page.tsx
git commit -m "feat(checkout): save shipping form draft to sessionStorage before payment redirect"
```

---

## Task 3: Clear shipping draft on payment success page

**Files:**
- Modify: `frontend/src/app/checkout/success/page.tsx`

When card/qrph payment succeeds, PayMongo redirects to the success page. The draft should be cleared here so it doesn't re-populate the form on a future unrelated checkout.

- [ ] **Step 1: Read the success page**

Open `frontend/src/app/checkout/success/page.tsx` and identify the main content component (there is a `Suspense` wrapper similar to the cancel page). Find where `useEffect` is used or where component mount logic lives.

- [ ] **Step 2: Add draft-clearing effect**

Inside the inner content component (the one that renders the success UI), add this effect at the top of the component body, alongside any existing `useEffect` calls:

```typescript
useEffect(() => {
  try {
    sessionStorage.removeItem('checkout_shipping_draft');
  } catch {
    // ignore
  }
}, []);
```

If the file uses `'use client'` at the top and imports from `react`, add `useEffect` to the existing React import if it isn't already there:
```typescript
import { useEffect, ... } from 'react';
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd "c:\Users\Username\Downloads\PERSONAL PROJECTS\sari-ecommerce\frontend"
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/app/checkout/success/page.tsx
git commit -m "feat(checkout): clear shipping form draft from sessionStorage on payment success"
```

---

## Task 4: Replace DollarSign with Banknote in business dashboard

**Files:**
- Modify: `frontend/src/app/business/dashboard/page.tsx`

The `DollarSign` icon from lucide-react is used as the icon for the Revenue metric tile. Replace it with `Banknote`.

- [ ] **Step 1: Update the import**

Open `frontend/src/app/business/dashboard/page.tsx`. Find the lucide-react import at the top (line ~6):

```typescript
import {
  DollarSign,
  ShoppingCart,
  Package,
  AlertTriangle,
  ArrowUpRight,
  Clock,
  AlertCircle,
  Plus,
  Store,
} from 'lucide-react';
```

Replace `DollarSign` with `Banknote`:

```typescript
import {
  Banknote,
  ShoppingCart,
  Package,
  AlertTriangle,
  ArrowUpRight,
  Clock,
  AlertCircle,
  Plus,
  Store,
} from 'lucide-react';
```

- [ ] **Step 2: Update buildMetrics**

Find the `buildMetrics` function (around line 47). Change `icon: DollarSign` to `icon: Banknote`:

```typescript
function buildMetrics(data: DashboardData) {
  return [
    {
      label: 'Revenue',
      value: formatPrice(data.revenue),
      icon: Banknote,
      accent: 'from-emerald-500 to-emerald-600',
      bgAccent: 'bg-emerald-50',
      textAccent: 'text-emerald-700',
    },
    // ... rest unchanged
  ];
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd "c:\Users\Username\Downloads\PERSONAL PROJECTS\sari-ecommerce\frontend"
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/app/business/dashboard/page.tsx
git commit -m "fix(business-dashboard): replace DollarSign icon with Banknote for revenue tile"
```

---

## Task 5: Replace DollarSign with Banknote in admin dashboard

**Files:**
- Modify: `frontend/src/app/admin/dashboard/page.tsx`

The `DollarSign` icon is used in the `tiles` array for the Total Revenue tile. Replace it with `Banknote`.

- [ ] **Step 1: Update the import**

Open `frontend/src/app/admin/dashboard/page.tsx`. Find the lucide-react import at line 4:

```typescript
import { Users, Store, Package, ShoppingCart, DollarSign, Loader2 } from 'lucide-react';
```

Replace `DollarSign` with `Banknote`:

```typescript
import { Users, Store, Package, ShoppingCart, Banknote, Loader2 } from 'lucide-react';
```

- [ ] **Step 2: Update the tiles array**

Find the `tiles` array (around line 34). Change `icon: DollarSign` to `icon: Banknote` on the revenue tile:

```typescript
const tiles = [
  { key: 'users' as const, label: 'Total Users', icon: Users, color: 'from-blue-500 to-blue-600' },
  { key: 'stores' as const, label: 'Total Stores', icon: Store, color: 'from-violet-500 to-violet-600' },
  { key: 'products' as const, label: 'Active Products', icon: Package, color: 'from-emerald-500 to-emerald-600' },
  { key: 'orders' as const, label: 'Total Orders', icon: ShoppingCart, color: 'from-amber-500 to-amber-600' },
  { key: 'revenue' as const, label: 'Total Revenue', icon: Banknote, color: 'from-sari-600 to-sari-700', isCurrency: true },
];
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd "c:\Users\Username\Downloads\PERSONAL PROJECTS\sari-ecommerce\frontend"
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/app/admin/dashboard/page.tsx
git commit -m "fix(admin-dashboard): replace DollarSign icon with Banknote for total revenue tile"
```

---

## Verification Checklist

After all tasks are complete:

- [ ] `npx tsc --noEmit` passes with zero errors
- [ ] Business dashboard Revenue tile shows `Banknote` icon (no `$` glyph), value shows `₱`
- [ ] Admin dashboard Total Revenue tile shows `Banknote` icon (no `$` glyph), value shows `₱`
- [ ] Fill shipping form on `/checkout`, select QRPH or Card, click Place Order — confirm `sessionStorage` key `checkout_shipping_draft` is set (check in DevTools → Application → Session Storage)
- [ ] Navigate to `/checkout/cancel` then click "Try Again" → form fields and payment method are pre-filled
- [ ] Complete a COD order → `checkout_shipping_draft` is absent from sessionStorage after success redirect
- [ ] Complete a card/qrph order → `checkout_shipping_draft` is absent after reaching `/checkout/success`
