# Design Spec: Admin UI Fixes & Footer Pages
**Date:** 2026-04-28  
**Status:** Approved

---

## Overview

Three independent UI tasks for the SARI e-commerce frontend:

1. Fix the admin order detail page layout (whitespace, two-column grid)
2. Partially align the admin dashboard color scheme to the sari amber/orange brand palette
3. Add four static footer pages: Contact Us, Shipping Info, Returns, FAQ

All changes are frontend-only. No backend API changes required. No existing functionality is altered — these are additive or cosmetic changes only.

---

## Task 1: Admin Order Detail Layout Fix

### Scope
**File:** `frontend/src/app/admin/orders/[id]/page.tsx`

### Problem
The page uses `max-w-2xl` with no centering, producing a narrow left-aligned column that wastes the admin content area on wide screens. Sections are stacked vertically even when they could share horizontal space.

### Solution
Replace the single-column stacked layout with a two-column CSS grid using Tailwind:

- **Outer wrapper:** Remove `max-w-2xl`. Use full-width `p-6 space-y-6`.
- **Header row** (order number + date + status badge): Full-width, unchanged.
- **Error banner:** Full-width, unchanged.
- **Grid body:** `grid grid-cols-1 lg:grid-cols-3 gap-6`
  - **Left column** (`lg:col-span-2`): Items table card (most data-dense, needs the most space)
  - **Right column** (`lg:col-span-1`): Stacked cards — Buyer Info, Shipping Address, Update Status
- On mobile (`< lg`), all columns stack to single column (default grid behavior).

### Constraints
- No changes to API calls, state, interfaces, or business logic.
- No new dependencies.

---

## Task 2: Admin Color Scheme Partial Alignment

### Scope
**Primary file:** `frontend/src/app/admin/layout.tsx`  
**Secondary file:** `frontend/src/app/admin/orders/[id]/page.tsx`  
**Other admin pages** using red accent classes should also be scanned and updated.

### Problem
The admin dashboard uses `red-700`/`red-900` throughout — sidebar gradient, active nav states, hover states, buttons, badges, spinners, and avatar ring. This clashes with the sari brand amber/orange palette used on all storefront pages.

### Solution
Partial replacement: swap red accent classes with sari amber equivalents. The sidebar structure (white background, gray borders) stays unchanged so admin still feels distinct. Only accent/interactive colors change.

#### Color Swap Table

| Current | Replacement |
|---|---|
| `from-red-700 to-red-900` (active nav gradient) | `from-sari-600 to-sari-700` |
| `hover:bg-red-50 hover:text-red-800` (nav hover) | `hover:bg-sari-50 hover:text-sari-800` |
| `text-red-700` (icon hover, links, spinner) | `text-sari-600` |
| `bg-red-50 text-red-700` (ADMIN badge) | `bg-sari-50 text-sari-700` |
| `from-red-100 to-red-200` (avatar background) | `from-sari-100 to-sari-200` |
| `ring-red-100` (avatar ring) | `ring-sari-100` |
| `text-red-800` (avatar initials) | `text-sari-800` |
| `hover:bg-red-50 hover:text-red-500` (logout hover) | `hover:bg-sari-50 hover:text-sari-600` |
| `bg-red-700 hover:bg-red-800` (Update Status button) | `bg-sari-600 hover:bg-sari-700` |
| `focus:border-red-400 focus:ring-red-400` (select focus) | `focus:border-sari-400 focus:ring-sari-400` |
| `shadow-[...rgba(127,29,29,0.08)]` (sidebar shadow) | `shadow-[...rgba(180,83,9,0.08)]` |
| `text-red-700` (View user link) | `text-sari-600` |

#### Untouched
- Order status badge colors (`pending` → amber, `processing` → blue, `cancelled` → red, etc.) — these carry semantic meaning and must not change.
- Gray structural colors (borders, backgrounds, text).

### Constraints
- No changes to layout structure or component logic.
- All other admin pages should be scanned for matching red classes and updated with the same swaps for consistency. Specific files to check: `frontend/src/app/admin/dashboard/page.tsx`, `frontend/src/app/admin/users/page.tsx`, `frontend/src/app/admin/users/[id]/page.tsx`, `frontend/src/app/admin/stores/page.tsx`, `frontend/src/app/admin/stores/[id]/page.tsx`, `frontend/src/app/admin/products/page.tsx`, `frontend/src/app/admin/products/[id]/page.tsx`, `frontend/src/app/admin/inventory/page.tsx`, `frontend/src/app/admin/vouchers/page.tsx`, `frontend/src/app/admin/vouchers/new/page.tsx`, `frontend/src/app/admin/vouchers/[id]/page.tsx`, `frontend/src/app/admin/reviews/page.tsx`.

---

## Task 3: Footer Pages

### Scope
**New files:**
- `frontend/src/app/contact/page.tsx`
- `frontend/src/app/shipping/page.tsx`
- `frontend/src/app/returns/page.tsx`
- `frontend/src/app/faq/page.tsx`

All four use the root layout (`frontend/src/app/layout.tsx`) which already wraps pages with Navbar and Footer — no layout files needed.

### Design System
Consistent with existing storefront pages (products, profile):
- Page background: `bg-white` or `bg-gray-50`
- Max width: `max-w-3xl mx-auto px-4 sm:px-6 py-12`
- Section cards: `rounded-2xl bg-white border border-gray-100 shadow-sm p-6`
- Headings: `text-sari-700 font-semibold`
- Body text: `text-gray-600`
- Icons: lucide-react, `text-sari-500`

### Page Content

#### Contact Us (`/contact`)
- Hero heading: "Get in Touch"
- Short intro: "We're here to help. Reach out to the SARI team and we'll get back to you as soon as possible."
- **Contact card:** Email — support@sari.ph, response time — within 24 hours on business days
- **Social section:** Instagram, Facebook links (placeholder hrefs)
- **FAQ nudge:** "Have a quick question? Check our [FAQ](/faq) page first."

#### Shipping Info (`/shipping`)
- Hero heading: "Shipping Information"
- **Delivery timeframes card:**
  - Metro Manila: 2–3 business days
  - Luzon (provincial): 3–5 business days
  - Visayas & Mindanao: 5–7 business days
- **Shipping fees card:**
  - Standard: ₱99 flat rate
  - Free shipping on orders ₱999 and above
- **Carriers card:** J&T Express, LBC, Ninja Van — carrier assigned based on availability and destination
- **Tracking card:** Order tracking link sent via email once shipped; track via carrier website using provided tracking number

#### Returns (`/returns`)
- Hero heading: "Returns & Refunds"
- **Return window card:** 7 days from delivery date
- **Eligible items card:** Unworn, unwashed, tags intact, original packaging
- **Ineligible items card:** Sale/clearance items, intimate apparel, items marked final sale
- **Return process card (numbered steps):**
  1. Email support@sari.ph with order number and reason
  2. Wait for return approval (1–2 business days)
  3. Ship item back using provided return label
  4. Refund processed within 5–10 banking days after item received
- **Refund method:** Refunded to original payment method

#### FAQ (`/faq`)
- Hero heading: "Frequently Asked Questions"
- Accordion component (local `useState` per item, no library): ~8 questions
  1. How do I create an account? — Sign up via the Register page, verify email.
  2. How do I track my order? — Tracking number emailed after shipment; check carrier site.
  3. What payment methods do you accept? — GCash, credit/debit card (Visa, Mastercard), PayMaya.
  4. Can I change or cancel my order? — Only before the order is processed; email support immediately.
  5. How do I return an item? — See our [Returns page](/returns).
  6. When will I receive my refund? — 5–10 banking days after return is received.
  7. How do I become a seller on SARI? — Apply via the [Become a Seller](/become-seller) page.
  8. I have a discount voucher — how do I use it? — Enter the code at checkout in the voucher field.

### Implementation Notes
- All pages are `'use client'` only if they contain interactive state (FAQ accordion). Contact, Shipping, Returns can be server components.
- No new API calls. All content is static.
- The FAQ accordion uses a single `useState<number | null>` to track the open item index.

---

## Implementation Instructions

### Plugin Usage
- Use the **superpowers** plugin workflow for planning and execution:
  - `superpowers:writing-plans` to generate the step-by-step implementation plan
  - `superpowers:executing-plans` when executing the plan
  - `superpowers:verification-before-completion` before marking any task complete
- Use the **frontend-design** plugin (`frontend-design:frontend-design`) when implementing the four footer pages and the order detail layout — these are new UI components that benefit from the design quality guidance.

### Safety Requirements
- No existing pages or components are deleted or restructured.
- Admin layout changes are CSS-only — no logic, routing, or auth changes.
- Footer pages are new routes that do not conflict with any existing routes.
- All changes must be verified visually in the browser before marking complete.

---

## Files Changed Summary

| File | Change Type |
|---|---|
| `frontend/src/app/admin/orders/[id]/page.tsx` | Modify — layout + color |
| `frontend/src/app/admin/layout.tsx` | Modify — color swaps only |
| `frontend/src/app/admin/**/page.tsx` (others) | Modify — color swaps scan |
| `frontend/src/app/contact/page.tsx` | New |
| `frontend/src/app/shipping/page.tsx` | New |
| `frontend/src/app/returns/page.tsx` | New |
| `frontend/src/app/faq/page.tsx` | New |
