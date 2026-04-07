# Plan 19: Frontend Fixes & Missing Features

> Resolve remaining frontend issues: Wishlist page, Admin Panel 404, Product Detail page, Checkout improvements, AI Product Comparison, and Google OAuth buttons.

---

## Issues Overview

| # | Issue | Root Cause | Severity |
|---|-------|------------|----------|
| 1 | Wishlist page shows 404 | Page component `frontend/src/app/wishlist/page.tsx` does not exist | High |
| 2 | Admin Panel link returns 404 | Navbar links to `/admin/dashboard` but page lives at `/admin` | High |
| 3 | Product detail page missing | No `/products/[slug]/page.tsx` route exists | High |
| 4 | Checkout uses mock data | Hardcoded items instead of real cart integration | Medium |
| 5 | AI Comparison not working | No comparison modal/logic; `?ai=compare` query param unhandled | Medium |
| 6 | No Google login button | Auth pages lack Google OAuth UI; backend endpoints exist | Medium |

---

## Reference Images

The provided screenshots serve as the design target:

- **AI Product Comparison modal** - Side-by-side cards with AI Score bars, material/style/availability details, strengths list, "Best Choice" badge
- **Product Detail page** - Breadcrumb, image gallery, star rating, price, size/color selectors, quantity picker, Add to Cart / Buy Now / Wishlist buttons, trust badges (Fast Delivery, Secure Payment, Easy Returns), Product Details table, Customer Reviews, "You May Also Like" carousel
- **Checkout page** - Delivery Method toggle (Delivery / Store Pickup), Shipping Information form, Payment Method options (COD, GCash, Credit/Debit, Maya, ShopeePay with "Simulated" labels), sticky Order Summary sidebar
- **Wishlist empty state** - Centered heart icon, "Your Wishlist is Empty" heading, "Save your favorite items for later!" subtext, orange "Continue Shopping" CTA

---

## Implementation Steps

### Step 1: Fix Admin Panel 404 (Quick Fix)

**File:** `frontend/src/components/layout/Navbar.tsx` (line 108)

- Change the Admin Panel link from `/admin/dashboard` to `/admin`
- Verify the dropdown renders correctly and navigates to the admin dashboard page

**Verification:** Click "Admin Panel" in user dropdown -> should load admin dashboard without 404.

---

### Step 2: Create Wishlist Page

> **Skill:** Use `frontend-design` skill for the UI component design. Reference the wishlist empty-state screenshot.

**Files to create/modify:**
- Create `frontend/src/app/wishlist/page.tsx`

**Requirements:**
- Fetch wishlist items from `GET /api/wishlist` (backend already implemented)
- **Empty state** (from reference image):
  - Centered layout with large gray heart icon
  - Bold heading: "Your Wishlist is Empty"
  - Subtext: "Save your favorite items for later!"
  - Orange "Continue Shopping" button linking to `/products`
- **Populated state:**
  - Grid of product cards (reuse existing `ProductCard` component)
  - Each card has a remove-from-wishlist action via `POST /api/wishlist/{product}` (toggle endpoint)
  - Show product image, name, price, rating
- Include `Navbar` and `Footer` components
- Match existing design system (sari brand colors, rounded-2xl cards, consistent spacing)

**Verification:** Navigate to `/wishlist` logged in -> see empty state or items. Toggle wishlist from product card -> item appears/disappears.

---

### Step 3: Create Product Detail Page

> **Skill:** Use `frontend-design` skill for the page layout. Reference the product detail screenshot closely.

**Files to create/modify:**
- Create `frontend/src/app/products/[slug]/page.tsx`

**Requirements (from reference image):**
- **Breadcrumb:** Home / Shop / {Product Name}
- **Layout:** Two-column on desktop (image left, details right)
- **Product image:** Large display with potential thumbnail gallery below
- **Product info panel:**
  - Product name (bold, large)
  - Star rating display + review count (e.g., "4.6 (89 reviews)")
  - Price in PHP with peso sign (bold, large)
  - Short description text
  - Stock status badge ("In Stock" green check)
  - **Size selector:** Row of bordered pill buttons (S, M, L, XL, XXL)
  - **Color selector:** Row of bordered pill buttons with color names (White, Black, Gray)
  - **Quantity picker:** Minus/Plus buttons with count + "X available" text
  - **Action buttons row:**
    - "Add to Cart" - outlined orange button with cart icon
    - "Buy Now" - solid orange button
    - Heart/Wishlist icon button (outlined)
  - **Trust badges row:** Fast Delivery, Secure Payment, Easy Returns (icons + labels)
  - **Product Details table:** Material, Style, Category rows
- **Customer Reviews section:**
  - Reviewer name, star rating, date, review text
  - Fetch from `GET /api/products/{slug}` (backend includes reviews)
- **"You May Also Like" section:**
  - Horizontal scroll of `ProductCard` components
  - Fetch related products (same category)
- Include `Navbar` and `Footer`

**Data source:** `GET /api/products/{slug}` endpoint (already implemented in backend `ProductController@show`)

**Verification:** Click any product card on products listing -> navigates to detail page with full product info rendered.

---

### Step 4: Improve Checkout Page

> **Skill:** Use `frontend-design` skill for payment method cards. Reference the checkout screenshot.

**File:** `frontend/src/app/checkout/page.tsx`

**Requirements (matching reference image):**
- **Replace mock data** with real cart items from `useCart` hook / `GET /api/cart`
- **Delivery Method cards:** Delivery (map pin icon) and Store Pickup (store icon) - styled as selectable bordered cards with orange highlight on active
- **Shipping Information form:** Full Name, Phone Number, Address Line 1, Address Line 2, City, Province, Zip Code - all with proper labels and placeholder text
- **Payment Method options** (keep existing 2 options, matching PayMongo integration):
  - Cash on Delivery (active by default, orange highlight)
  - QR PH (PayMongo QR code payment)
- **Order Summary sidebar** (sticky on desktop):
  - Product thumbnail, name, variant info (size/color), quantity, price
  - Subtotal, Delivery Fee, Total
  - "Place Order" orange button
- Wire up form submission to `POST /api/checkout` endpoint

**Verification:** Add items to cart -> go to checkout -> see real cart items in summary. Fill form and submit -> order created.

---

### Step 5: Implement AI Product Comparison

> **Skill:** Use `frontend-design` skill for the comparison modal. Reference the AI comparison screenshot closely.
> **Skill:** Use `superpowers:brainstorming` skill to design the comparison data structure and scoring logic before implementation.

**Files to create/modify:**
- Create `frontend/src/components/ProductComparisonModal.tsx`
- Modify `frontend/src/app/products/page.tsx` (handle `?ai=compare` param, add comparison state)

**Requirements (from reference image):**
- **Comparison trigger:** Users select 2+ products via compare checkboxes on `ProductCard` -> floating "Compare" button appears -> opens modal
- **Also trigger from:** Homepage "Try AI Comparison" button -> navigate to `/products?ai=compare` -> enable comparison mode
- **Modal design:**
  - Header: "AI Product Comparison" title + "Comparing X products by price, material, and style" subtitle + close button
  - Side-by-side product cards in a horizontal scrollable row
  - **"Best Choice" badge** on top-recommended product (orange banner with trophy icon)
  - Each card shows:
    - Product image
    - Product name
    - Star rating + review count
    - Price (bold, PHP format)
    - **AI Score** (X/100) with green progress bar
    - Material info
    - Style tags
    - Availability status (green "In Stock")
    - **Strengths list** (green checkmarks with bullet points like "Best Price", "Durable Blend", "High Availability", "Highest Rated")
  - Orange border highlight on the "Best Choice" card
- **Comparison logic:** Client-side scoring based on price, rating, stock, material quality (no backend AI endpoint needed - generate scores from product attributes)
- Handle empty state and minimum 2 products requirement

**Verification:** Select 2+ products on listing page -> click Compare -> modal opens with side-by-side comparison, AI scores, and "Best Choice" recommendation.

---

### Step 6: Add Google OAuth Buttons to Auth Pages

> **Skill:** Use `frontend-design` skill for the OAuth button styling to match the existing auth page design.

**Files to modify:**
- `frontend/src/app/(auth)/login/page.tsx`
- `frontend/src/app/(auth)/register/page.tsx`

**Requirements:**
- Add a visual divider ("or continue with") between the form and Google button
- Add a "Continue with Google" button with Google logo/icon
- On click, redirect to `GET /api/auth/google/redirect` (backend endpoint already exists at `backend/app/Http/Controllers/Auth/GoogleAuthController.php`)
- The backend handles the OAuth flow and redirects back with auth session
- Style to match existing auth page design system (rounded-xl, consistent padding, sari brand colors for accents)
- Button should be full-width, white/light background with Google branding

**Verification:** Click "Continue with Google" on login/register page -> redirects to Google OAuth -> returns authenticated.

---

## Execution Order

```
Step 1 (Admin 404 fix) - 2 minutes, zero risk
    |
    v
Step 2 (Wishlist page) ──────────┐
Step 6 (Google OAuth buttons) ───┤── Can be parallelized
    |                             |
    v                             v
Step 3 (Product Detail page) ────── Depends on nothing, but larger scope
    |
    v
Step 4 (Checkout improvements) ──── Depends on cart being functional
    |
    v
Step 5 (AI Comparison) ──────────── Most complex, do last
```

## Skill Usage Instructions

For each step that involves creating or significantly modifying UI components:

1. **Before implementation:** Invoke `superpowers:brainstorming` skill if the design has open questions or ambiguity that needs resolution
2. **During implementation:** Invoke `frontend-design` skill to generate production-grade, polished UI code that matches the reference screenshots and avoids generic AI aesthetics
3. **After implementation:** Invoke `superpowers:verification-before-completion` skill to verify each step works end-to-end before marking it complete

## Technical Notes

- All new pages must include `'use client'` directive (Next.js App Router client components)
- Reuse existing components: `Navbar`, `Footer`, `ProductCard`
- Reuse existing utilities: `formatPrice` from `@/lib/utils`, `api` from `@/lib/api`
- Follow existing type definitions in `frontend/src/types/`
- Before writing any Next.js code, read the relevant guide in `node_modules/next/dist/docs/` per `AGENTS.md` instructions
- Backend API endpoints are already implemented for all features - this is frontend-only work
- Match the existing design system: sari brand colors (orange/amber), rounded-2xl cards, gradient buttons, consistent spacing and typography
