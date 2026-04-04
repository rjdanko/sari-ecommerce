# Frontend Pages Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
> 
> **CRITICAL INSTRUCTION:** Every design related component in this plan MUST be built out using the `frontend-design` plugin based on the reference images provided in the task context.

**Goal:** Complete the remaining 80% of frontend pages matching the provided design references.

**Architecture:** We will implement the missing React/Next.js pages (`/products`, `/cart`, `/checkout`, `/admin/*`) using standard Tailwind/CSS practices. We will heavily rely on the `frontend-design` plugin to scaffold the aesthetics. Mock data will be used initially before wiring API calls.

**Tech Stack:** Next.js, React, Tailwind CSS

---

### Task 1: Products Listing Page (`/products`)

**Files:**
- Create: `frontend/src/app/products/page.tsx`
- Create: `frontend/src/components/ProductCard.tsx`
- Create: `frontend/src/components/SidebarFilter.tsx`

- [ ] **Step 1: Generate layout using frontend-design plugin**
Use the `frontend-design` plugin to implement the Products interface. The layout consists of a left-aligned sidebar (`SidebarFilter.tsx`) containing "Filters", "Category" links, "Price Range", and "Sort By". The main content area should render a responsive grid (3-4 columns) of products.

- [ ] **Step 2: Implement Product Card Component**
Create a `ProductCard.tsx` component matching the reference:
It includes an image at the top with a top-left pill overlay containing a "Compare" checkbox and a heart icon on the top right. Below the image, left-align the product name and star rating, and display the price alongside an orange cart call-to-action button.

### Task 2: Cart Page (`/cart`)

**Files:**
- Create: `frontend/src/app/cart/page.tsx`

- [ ] **Step 1: Scaffold Empty Cart State**
Use the `frontend-design` plugin to design the cart view. For now, implement the "Empty state" view matching the reference:
Render a large gray bag icon in the center, a bold title `Your Cart is Empty`, a subtitle `Add some products to get started!`, and an orange `Continue Shopping` button below it. 

### Task 3: Checkout Page (`/checkout`)

**Files:**
- Create: `frontend/src/app/checkout/page.tsx`

- [ ] **Step 1: Implement Form Sections**
Use the `frontend-design` plugin to construct the two-column checkout page layout. 
Left column:
- **Delivery Method**: Two toggle-able cards side by side ("Delivery" vs "Store Pickup").
- **Shipping Information**: A classic form grid with inputs for Full Name, Phone Number, Address Line 1 & 2, City, Province, and Zip Code.
- **Payment Method**: Radio/Button selectors for "Cash on Delivery", "QR PH" in bordered card layouts.

Right column:
- **Order Summary**: A card displaying the item list (with thumbnail, title, spec, and price), Subtotal, Delivery Fee, Total, and an orange "Place Order" button.

### Task 4: Admin Dashboard (`/admin`)

**Files:**
- Create: `frontend/src/app/admin/page.tsx`
- Create: `frontend/src/app/admin/layout.tsx`

- [ ] **Step 1: Admin Layout**
Create a sidebar layout inside `frontend/src/app/admin/layout.tsx`. Include a light-gray sidebar with a logo and navigation links for Dashboard (highlighted orange background), Products, Inventory, Orders, Users, Analytics. Include an Admin profile footer at the bottom of the sidebar.

- [ ] **Step 2: Admin Dashboard View**
Implement `admin/page.tsx`. Use the `frontend-design` plugin to recreate the 4 top metrics cards (Total Revenue, Orders, Products, Customers) with trailing status icons. Below the cards, add a full-width yellow warning banner for "Low Stock Alert". Bottom section should be split in two columns: "Recent Orders" and "Low Stock Products".
