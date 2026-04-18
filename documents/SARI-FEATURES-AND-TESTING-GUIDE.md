# 🛒 Sari E-Commerce Platform — Complete Feature Inventory & Testing Guide

> **Last Updated:** April 16, 2026
> **Project:** Sari E-Commerce (Fashion E-Commerce Platform — Philippines Market)

---

## 📐 Project Architecture Overview

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend** | Next.js (React/TypeScript) + TailwindCSS | Customer & Business UI |
| **Backend API** | Laravel 11 (PHP) | RESTful API, Auth, Business Logic |
| **Database** | PostgreSQL (Supabase-hosted) | Primary data store |
| **Cache / Session** | Redis | Session management, Cart storage |
| **Search Engine** | Typesense | Full-text product search |
| **Message Queue** | RabbitMQ | Async job processing (recommendations) |
| **Payment Gateway** | PayMongo | Online payments (Card, QR PH, GCash) |
| **Image Storage** | Supabase Storage (S3-compatible) | Product image hosting |
| **Recommendations** | Recombee | AI-powered product recommendations |
| **Auth** | Laravel Sanctum (cookie-based SPA) + Google OAuth 2.0 | Authentication |
| **Containerization** | Docker Compose | Redis, RabbitMQ, Typesense |

### User Roles (RBAC via `spatie/laravel-permission`)

| Role | Description |
|---|---|
| **Customer** (default) | Browse, buy, review, wishlist |
| **Business** | All customer features + Store management, product CRUD, order fulfillment |
| **Admin** | Full platform control: users, products, orders, inventory |

---

## 📋 Complete Feature List

### Module 1: Authentication & User Management

| # | Feature | Role | Description |
|---|---|---|---|
| 1.1 | **Email/Password Registration** | Public | Register with first name, last name, email, password |
| 1.2 | **Email/Password Login** | Public | Login with email + password via Sanctum session |
| 1.3 | **Google OAuth Login** | Public | "Continue with Google" — creates account or links existing |
| 1.4 | **Forgot Password** | Public | Request password reset link via email |
| 1.5 | **Reset Password** | Public | Set new password using reset token |
| 1.6 | **Email Verification** | Authenticated | Verify email with signed link (rate-limited to 6/min) |
| 1.7 | **Logout** | Authenticated | Destroy session and clear auth state |
| 1.8 | **Password Visibility Toggle** | Public | Show/hide password on login and register forms |
| 1.9 | **Session Persistence** | Authenticated | User remains logged in across page refreshes |
| 1.10 | **Role-Based Navigation** | Authenticated | Navbar shows "Business Dashboard" link for business users |

---

### Module 2: Product Browsing & Discovery

| # | Feature | Role | Description |
|---|---|---|---|
| 2.1 | **Home Page — Hero Banner** | Public | Gradient hero section with CTA buttons ("Shop Now", "Try AI Comparison") |
| 2.2 | **Shop by Category** | Public | Category cards (T-Shirts, Jeans, Dresses, Jackets) with hover animations and images |
| 2.3 | **All Products Page** | Public | Paginated product grid with skeleton loading |
| 2.4 | **Category Filtering** | Public | Filter products by category via sidebar or URL param `?category=` |
| 2.5 | **Price Range Filtering** | Public | Client-side filter by min/max price range |
| 2.6 | **Sort Options** | Public | Sort by: Newest, Price Low→High, Price High→Low, Popular |
| 2.7 | **Product Search** | Public | Navbar search bar → redirects to `/products?q=<query>` |
| 2.8 | **Typesense Full-Text Search** | Public | Backend search via Typesense (name, description, category, brand) |
| 2.9 | **Search History Tracking** | Customer | Records search queries for logged-in users |
| 2.10 | **Grid Toggle** | Public | Switch between 3-column and 4-column product grid (desktop) |
| 2.11 | **Load More Pagination** | Public | "Load More Products" button with loading state |
| 2.12 | **Product Detail Page** | Public | Full product info: images, description, price, variants, reviews, store info |
| 2.13 | **Product Image Gallery** | Public | Primary image + multiple image support with sort order |
| 2.14 | **Product Variants** | Public | Size/Color/etc. variant selection on product detail and in cart |
| 2.15 | **View Count Tracking** | Public | Increments `view_count` on every product detail page visit |
| 2.16 | **Gender-Based Navigation** | Public | Navbar links to "Men" and "Women" product categories |
| 2.17 | **Mobile Sidebar Filter** | Public | Responsive filter panel with open/close animation |
| 2.18 | **Store Page** | Public | View a store's profile (logo, banner, description) and its active products |

---

### Module 3: AI-Powered Product Comparison

| # | Feature | Role | Description |
|---|---|---|---|
| 3.1 | **Compare Toggle** | Public | Checkbox on each product card to select for comparison |
| 3.2 | **Compare Bar** | Public | Sticky bar showing selected count, with "Clear" and "Compare Now" buttons |
| 3.3 | **AI Comparison Modal** | Public | Side-by-side comparison scoring products on price, rating, stock, discount, featured status |
| 3.4 | **AI Score (0-100)** | Public | Calculated composite score with visual progress bar |
| 3.5 | **Best Choice Badge** | Public | Trophy badge on the highest-scoring product |
| 3.6 | **Product Strengths** | Public | Auto-detected strengths: "Best Price", "Highest Rated", "High Availability", "Great Discount", "Staff Pick" |
| 3.7 | **Auto-Compare via URL** | Public | `?ai=compare` query param auto-selects first 2 products |

---

### Module 4: Shopping Cart

| # | Feature | Role | Description |
|---|---|---|---|
| 4.1 | **Add to Cart** | Customer | Add product with quantity and optional variant |
| 4.2 | **View Cart** | Customer | Cart page showing line items, images, prices |
| 4.3 | **Update Quantity** | Customer | +/- buttons with stock limit enforcement |
| 4.4 | **Remove Item** | Customer | Remove individual items with toast confirmation |
| 4.5 | **Clear Cart** | Customer | Clear entire cart |
| 4.6 | **Cart Badge** | Customer | Navbar cart icon shows item count (max "99+") |
| 4.7 | **Variant Selection in Cart** | Customer | Dropdown selectors to change variant (Size/Color) without removing item |
| 4.8 | **Order Summary Sidebar** | Customer | Shows subtotal, shipping, total with "Proceed to Checkout" button |
| 4.9 | **Redis-Backed Cart** | Customer | Cart state persisted in Redis (server-side) |
| 4.10 | **Empty Cart State** | Customer | Empty state with "Continue Shopping" CTA |
| 4.11 | **Cart Skeleton Loading** | Customer | Animated placeholder while loading |

---

### Module 5: Checkout & Payment

| # | Feature | Role | Description |
|---|---|---|---|
| 5.1 | **Checkout Page** | Customer | Multi-step: Shipping Info → Payment → Voucher → Order Summary |
| 5.2 | **Shipping Form** | Customer | Full name, phone (numeric-only validation), address, city, province, zip |
| 5.3 | **Form Validation** | Customer | Client-side validation with inline error messages, auto-scroll to first error |
| 5.4 | **Phone Number Validation** | Customer | Strips non-numeric characters; `inputMode="numeric"` |
| 5.5 | **Cash on Delivery (COD)** | Customer | Place order without online payment; stock decremented immediately |
| 5.6 | **QR PH Payment** | Customer | Redirects to PayMongo QR PH checkout |
| 5.7 | **Card Payment** | Customer | Redirects to PayMongo card payment (Visa/Mastercard) |
| 5.8 | **PayMongo Checkout Session** | Customer | Creates PayMongo checkout session with line items and success/cancel URLs |
| 5.9 | **PayMongo Webhook** | System | Handles `paymongo` webhook for payment confirmation |
| 5.10 | **Delivery Fee Estimation** | Customer | Geocode-based distance calculation between store and buyer |
| 5.11 | **Default Delivery Fee** | Customer | Fallback ₱100 fee when geocoding fails |
| 5.12 | **Direct Buy** | Customer | "Buy Now" bypasses cart — goes straight to checkout with `?direct=1` params |
| 5.13 | **Checkout Breadcrumb** | Customer | Visual breadcrumb: Cart → Checkout → Confirmation |
| 5.14 | **Voucher Application at Checkout** | Customer | Enter code or click claimed voucher to apply discount |
| 5.15 | **Order Success Page** | Customer | Post-checkout confirmation page |
| 5.16 | **Order Cancel Page** | Customer | Shown when user cancels payment at PayMongo |
| 5.17 | **Cart Auto-Clear on COD** | Customer | Cart cleared after successful COD placement |

---

### Module 6: Voucher System

| # | Feature | Role | Description |
|---|---|---|---|
| 6.1 | **Voucher Center (Home Page)** | Public | Banner on home page showing available vouchers |
| 6.2 | **Browse Available Vouchers** | Public | List active, non-expired, claimable vouchers |
| 6.3 | **Claim Voucher** | Customer | Add voucher to "wallet" (per-user claim limit enforced) |
| 6.4 | **My Claimed Vouchers** | Customer | View list of unused, non-expired claimed vouchers |
| 6.5 | **Apply Voucher Code** | Customer | Enter code at checkout; validates: claimed, min spend, expiry |
| 6.6 | **Quick-Select Claimed Voucher** | Customer | Clickable pills showing claimed voucher codes at checkout |
| 6.7 | **Discount Types** | System | Fixed amount, percentage (with max cap), free shipping |
| 6.8 | **Minimum Spend Requirement** | System | Vouchers enforced against cart subtotal |
| 6.9 | **Voucher Usage Tracking** | System | Claims marked as "used" on order placement, linked to order |
| 6.10 | **Global Quantity Limit** | System | Total claimable quantity per voucher |
| 6.11 | **Remove Applied Voucher** | Customer | "X" button to remove voucher from checkout |

---

### Module 7: Order Management

| # | Feature | Role | Description |
|---|---|---|---|
| 7.1 | **My Orders Page** | Customer | List of all user orders with status badges, date, total |
| 7.2 | **Order Detail Page** | Customer | Full order breakdown: items with images, variants, pricing, status, addresses |
| 7.3 | **Order Number** | System | Auto-generated format: `SARI-<unique_id>` |
| 7.4 | **Order Statuses** | System | `pending_confirmation` → `confirmed` → `processing` → `paid` → `shipped` → `delivered` (or `cancelled` / `payment_failed`) |
| 7.5 | **Cancel Order** | Customer | Cancel before store confirmation; requires reason selection |
| 7.6 | **Cancel Reason Options** | Customer | changed_mind, found_better_deal, ordered_by_mistake, delivery_too_long, want_to_change_order, other |
| 7.7 | **Cancel Order Modal** | Customer | Confirmation modal with reason picker and optional notes (required if "other") |
| 7.8 | **Mark Payment Failed** | Customer | For online payment orders where user didn't complete payment |
| 7.9 | **Business Order Confirmation** | Business | Confirm pending orders (sets `confirmed_at` timestamp) |
| 7.10 | **Business Order Status Update** | Business | Update to: processing, shipped, delivered |
| 7.11 | **Business Order List** | Business | View orders containing this business's products |
| 7.12 | **Admin Order Management** | Admin | View all orders, update any order status |
| 7.13 | **Order Timestamps** | System | Tracks `paid_at`, `confirmed_at`, `cancelled_at`, `shipped_at`, `delivered_at` |

---

### Module 8: Product Reviews & Ratings

| # | Feature | Role | Description |
|---|---|---|---|
| 8.1 | **View Product Reviews** | Public | Paginated review list with user name (first name + last initial), rating, comment |
| 8.2 | **Submit Review** | Customer | Rate 1-5 stars + optional comment (max 1000 chars) |
| 8.3 | **Purchase Verification** | Customer | Can only review products from delivered orders |
| 8.4 | **One Review Per Product** | Customer | Duplicate review prevention (returns 409) |
| 8.5 | **Delete Own Review** | Customer | Remove own review |
| 8.6 | **Average Rating Calculation** | System | Auto-updates `average_rating` and `review_count` on product |
| 8.7 | **Review Eligibility Check** | Customer | API returns `can_review` boolean and existing `user_review` if any |

---

### Module 9: Wishlist

| # | Feature | Role | Description |
|---|---|---|---|
| 9.1 | **Wishlist Page** | Customer | Grid of saved products with remove buttons |
| 9.2 | **Toggle Wishlist** | Customer | Heart icon adds/removes product (single API call toggles) |
| 9.3 | **Wishlist Heart Icon** | Customer | Navbar link to wishlist page |
| 9.4 | **Empty Wishlist State** | Customer | "Your Wishlist is Empty" with CTA to browse |
| 9.5 | **Remove from Wishlist** | Customer | Red heart button on each wishlist item |

---

### Module 10: User Profile

| # | Feature | Role | Description |
|---|---|---|---|
| 10.1 | **Profile Page** | Customer | Avatar, name, email, role badge |
| 10.2 | **Edit Personal Info** | Customer | Inline edit for first name, last name, phone number |
| 10.3 | **Edit Saved Address** | Customer | Inline edit for default address (label, line1, line2, city, province, zip) |
| 10.4 | **Add Address** | Customer | Add default address if none saved |
| 10.5 | **Role Display** | Customer | Shows "Customer", "Business Owner", or "Administrator" |

---

### Module 11: AI Recommendations

| # | Feature | Role | Description |
|---|---|---|---|
| 11.1 | **Home Page Recommendations** | Public | "Recommended For You" section on home page |
| 11.2 | **Popular Products** | Public | Featured products sorted by view count (fallback) |
| 11.3 | **Personalized Recommendations** | Customer | Recombee-powered "For You" suggestions based on browsing history |
| 11.4 | **Similar Products** | Public | "You might also like" on product detail pages (same category fallback) |
| 11.5 | **View Event Tracking** | Customer | Product views dispatched to Recombee via async queue job |

---

### Module 12: Business Dashboard

| # | Feature | Role | Description |
|---|---|---|---|
| 12.1 | **Dashboard Overview** | Business | Stats: total products, active products, total orders, revenue, pending orders, low stock |
| 12.2 | **Create Store** | Business | Name, description, logo, banner, address, phone, coordinates |
| 12.3 | **Update Store** | Business | Edit store info, upload new logo/banner |
| 12.4 | **My Store View** | Business | View own store details |
| 12.5 | **Business Sidebar Layout** | Business | Sidebar navigation: Dashboard, Products, Orders, Store Settings |
| 12.6 | **Product List (Business)** | Business | View own products with status, stock, prices |
| 12.7 | **Create Product** | Business | Full form: name, description, category, price, SKU, stock, images, option categories |
| 12.8 | **Edit Product** | Business | Update product details, add/delete images, regenerate variants |
| 12.9 | **Delete Product** | Business | Soft-delete product (ProductPolicy enforces ownership) |
| 12.10 | **Auto-Generate Variants** | Business | Option categories (e.g., Size: S, M, L × Color: Red, Blue) auto-create all combinations |
| 12.11 | **Image Upload (Supabase)** | Business | Upload product images to Supabase S3 bucket |
| 12.12 | **Image Proxy** | System | Backend proxies Supabase images to avoid CORS issues |
| 12.13 | **Business Order Management** | Business | View and manage orders for own products |
| 12.14 | **Confirm Order** | Business | Confirm pending orders |
| 12.15 | **Update Order Status** | Business | Advance order through workflow (processing → shipped → delivered) |

---

### Module 13: Admin Panel

| # | Feature | Role | Description |
|---|---|---|---|
| 13.1 | **Admin Dashboard** | Admin | Platform-wide statistics |
| 13.2 | **User Management** | Admin | Full CRUD on users (list, show, create, update, delete) |
| 13.3 | **Product Management** | Admin | View, update, delete any product |
| 13.4 | **Inventory Management** | Admin | View and update stock levels across all products |
| 13.5 | **Order Management** | Admin | View all orders, update any order's status |

---

### Module 14: UI/UX & Design

| # | Feature | Role | Description |
|---|---|---|---|
| 14.1 | **Responsive Design** | All | Mobile-first layout across all pages |
| 14.2 | **Sticky Navbar** | All | Glassmorphism navbar with backdrop blur, stays on scroll |
| 14.3 | **Mobile Navigation** | All | Hamburger menu with search, links, auth actions |
| 14.4 | **Skeleton Loading States** | All | Animated placeholders on products, cart, orders pages |
| 14.5 | **Toast Notifications** | All | Success, error, info toasts for user actions |
| 14.6 | **Animated Transitions** | All | `slide-up`, `fade-in` animations on page elements |
| 14.7 | **Empty State Designs** | All | Illustrated empty states for cart, orders, wishlist |
| 14.8 | **Custom Font (Montserrat)** | All | Applied globally via `font-display` class |
| 14.9 | **Custom Branding** | All | Sari logo, favicon, custom color palette (`sari-*` colors) |
| 14.10 | **Footer** | All | Site footer with links and info |
| 14.11 | **Image Fallback** | All | Graceful fallback to placeholder SVG on broken images |
| 14.12 | **Hover Micro-Interactions** | All | Card lift, image zoom, underline animation on links |

---

### Module 15: Security & Performance

| # | Feature | Role | Description |
|---|---|---|---|
| 15.1 | **CSRF Protection** | System | Sanctum CSRF cookie for all mutating requests |
| 15.2 | **Rate Limiting** | System | Separate limits: auth (5/min), search (30/min), public API, authenticated API |
| 15.3 | **IDOR Prevention** | System | All data access scoped to authenticated user (OrderPolicy, ProductPolicy) |
| 15.4 | **Server-Side Pricing** | System | Prices always sourced from DB, never from client input |
| 15.5 | **Input Validation** | System | Form Request classes validate all inputs server-side |
| 15.6 | **Soft Deletes** | System | Products and Orders use soft deletes |
| 15.7 | **Product Listing Cache** | System | Cached product listings with versioned invalidation (5-min TTL) |
| 15.8 | **Performance Indexes** | System | Database indexes on frequently queried columns |
| 15.9 | **Password Hashing** | System | Bcrypt with 12 rounds |
| 15.10 | **RBAC Middleware** | System | `role:business\|admin` and `role:admin` middleware on business/admin routes |

---

## 🧪 Testing Guidelines

### How to Use This Guide

Each test case follows a **Given → When → Then** format. Testers should work through each module systematically. Mark each test as ✅ Pass, ❌ Fail, or ⏭️ Skipped.

> [!IMPORTANT]
> **Prerequisites before testing:**
> - Backend running: `php artisan serve` (port 8000)
> - Frontend running: `npm run dev` (port 3000)
> - Docker services running: `docker compose up -d` (Redis, RabbitMQ, Typesense)
> - At least one **Customer**, one **Business**, and one **Admin** account created
> - At least some products and categories seeded

---

### Test Suite 1: Authentication & User Management

| Test ID | Test Case | Steps | Expected Result |
|---|---|---|---|
| T-1.1 | Register new customer | Go to `/register` → fill form → submit | User created, redirected to home, logged in |
| T-1.2 | Register with existing email | Register with an already used email | Error message shown, no duplicate created |
| T-1.3 | Login with valid credentials | Go to `/login` → enter email/password → submit | Logged in, redirected to home |
| T-1.4 | Login with wrong password | Enter valid email + wrong password | "Invalid credentials" error |
| T-1.5 | Google OAuth login | Click "Continue with Google" → complete OAuth | Logged in, redirected to home |
| T-1.6 | Forgot password flow | Go to `/forgot-password` → enter email → submit | "Reset link sent" message; check email |
| T-1.7 | Reset password | Click reset link → enter new password → submit | Password updated, can login with new password |
| T-1.8 | Toggle password visibility | Click eye icon on password field | Password text toggles between dots and plaintext |
| T-1.9 | Logout | Click user menu → Logout | Session destroyed, redirected to login |
| T-1.10 | Session persistence | Login → close tab → reopen site | User still logged in |
| T-1.11 | Protected route redirect | Visit `/orders` while logged out | Redirected to `/login` |
| T-1.12 | Business nav link | Login as business user → check navbar dropdown | "Business Dashboard" link visible |
| T-1.13 | Customer nav link | Login as regular customer → check navbar dropdown | No "Business Dashboard" link |

---

### Test Suite 2: Product Browsing & Discovery

| Test ID | Test Case | Steps | Expected Result |
|---|---|---|---|
| T-2.1 | Home page loads | Navigate to `/` | Hero banner, voucher section, category cards, recommendations all render |
| T-2.2 | Category card navigation | Click "T-Shirts" category card | Navigates to `/products?category=t-shirts`, filtered results shown |
| T-2.3 | All products page | Navigate to `/products` | Product grid with cards, sidebar filter visible on desktop |
| T-2.4 | Category filter | Click a category in sidebar | Products filtered to that category |
| T-2.5 | Price range filter | Adjust price slider | Only products within range shown |
| T-2.6 | Sort by price ascending | Select "Price: Low to High" | Products ordered cheapest first |
| T-2.7 | Sort by price descending | Select "Price: High to Low" | Products ordered most expensive first |
| T-2.8 | Sort by newest | Select "Newest" (default) | Products ordered by creation date descending |
| T-2.9 | Sort by popular | Select "Popular" | Products ordered by view count descending |
| T-2.10 | Search from navbar | Type "jacket" → press Enter | Navigates to `/products?q=jacket`, matching products shown |
| T-2.11 | Clear search | After searching, click "Clear search ×" | Search param removed, all products shown again |
| T-2.12 | Grid toggle (3/4 col) | Click grid icons on desktop toolbar | Grid columns switch between 3 and 4 |
| T-2.13 | Load more pagination | Scroll down → click "Load More Products" | Next page of products appended to grid |
| T-2.14 | Product detail page | Click a product card | Detail page loads with images, description, price, variants |
| T-2.15 | Product image display | View product with multiple images | Primary image shown prominently, gallery available |
| T-2.16 | Variant selection | On detail page, select a Size/Color variant | Variant selection updates, shows correct options |
| T-2.17 | Mobile filter | On mobile, tap "Filters" → filter panel opens | Filter panel slides in, can be closed |
| T-2.18 | Store page | Click store name on product detail → store page loads | Store info + its products displayed |
| T-2.19 | Empty results | Filter to a category with no products | "No products found" with reset button |
| T-2.20 | Skeleton loading | Navigate to products page (slow connection) | Skeleton placeholders shown while loading |

---

### Test Suite 3: AI Product Comparison

| Test ID | Test Case | Steps | Expected Result |
|---|---|---|---|
| T-3.1 | Select products for compare | Check compare checkboxes on 2+ product cards | Compare bar appears showing selected count |
| T-3.2 | Compare bar actions | Click "Clear" in compare bar | All selections cleared, bar disappears |
| T-3.3 | Open comparison modal | Select 2+ products → click "Compare Now" | Modal opens with AI scoring |
| T-3.4 | AI scores displayed | Inside comparison modal | Each product shows score (0-100), progress bar, strengths |
| T-3.5 | Best choice highlighted | Compare products | Highest-scoring product gets gold "Best Choice" badge |
| T-3.6 | Compare disabled under 2 | Select only 1 product | "Compare Now" button disabled |
| T-3.7 | Auto-compare via URL | Navigate to `/products?ai=compare` | First 2 products auto-selected for comparison |
| T-3.8 | Close comparison modal | Click X or backdrop | Modal closes |

---

### Test Suite 4: Shopping Cart

| Test ID | Test Case | Steps | Expected Result |
|---|---|---|---|
| T-4.1 | Add to cart | On product detail, click "Add to Cart" | Item added, cart badge updates, toast shown |
| T-4.2 | Add with variant | Select a variant → add to cart | Cart item includes selected variant info |
| T-4.3 | View cart | Click cart icon → navigate to `/cart` | All cart items listed with images, prices |
| T-4.4 | Increase quantity | Click "+" button on cart item | Quantity increases, total updates |
| T-4.5 | Decrease quantity | Click "−" button on cart item | Quantity decreases, total updates |
| T-4.6 | Quantity min limit | Try to reduce quantity below 1 | "−" button disabled at qty 1 |
| T-4.7 | Quantity max limit | Try to increase beyond stock quantity | "+" button disabled at stock limit |
| T-4.8 | Remove item | Click trash icon on cart item | Item removed, toast "Removed from cart" shown |
| T-4.9 | Change variant in cart | Use variant dropdowns in cart | Variant updated without removing item |
| T-4.10 | Cart badge count | Add/remove items | Navbar badge reflects total item count |
| T-4.11 | Empty cart display | Remove all items | "Your Cart is Empty" state with "Continue Shopping" link |
| T-4.12 | Cart persistence | Add items → logout → login | Cart items restored (Redis-backed) |

---

### Test Suite 5: Checkout & Payment

| Test ID | Test Case | Steps | Expected Result |
|---|---|---|---|
| T-5.1 | Navigate to checkout | In cart, click "Proceed to Checkout" | Checkout page loads with shipping form, payment options, order summary |
| T-5.2 | Submit empty form | Click "Place Order" with empty shipping fields | Inline errors appear on required fields, auto-scrolls to first |
| T-5.3 | Phone number validation | Enter letters in phone field | Non-numeric chars stripped automatically |
| T-5.4 | COD order placement | Fill form → select COD → Place Order | Order created, cart cleared, redirected to success page |
| T-5.5 | QR PH payment | Fill form → select QR PH → Place Order | Redirected to PayMongo QR PH checkout page |
| T-5.6 | Card payment | Fill form → select Card → Place Order | Redirected to PayMongo card checkout page |
| T-5.7 | Payment cancel | At PayMongo, click cancel | Redirected to `/checkout/cancel` with order ID |
| T-5.8 | Estimate delivery fee | Fill address → click "Estimate Delivery Fee" | Fee calculated and shown in summary; free shipping if voucher grants it |
| T-5.9 | Default delivery fee | Use an address that can't be geocoded | ₱100 default fee shown |
| T-5.10 | Direct buy flow | On product detail, click "Buy Now" → checkout | Checkout shows single direct-buy item, not full cart |
| T-5.11 | Empty checkout redirect | Navigate to `/checkout` with empty cart | "Your Cart is Empty" with link to browse products |
| T-5.12 | Order summary accuracy | Review totals in right sidebar | Subtotal, discount, shipping, total all calculated correctly |
| T-5.13 | Stock decrement on COD | Place COD order → check product stock | Stock quantity reduced by ordered amount |

---

### Test Suite 6: Voucher System

| Test ID | Test Case | Steps | Expected Result |
|---|---|---|---|
| T-6.1 | View voucher banner | Visit home page | Voucher center section displays available vouchers |
| T-6.2 | Claim a voucher | Click "Claim" on available voucher | Voucher added to user's claimed list |
| T-6.3 | Already claimed voucher | Try claiming same voucher again | "Already claimed" error |
| T-6.4 | Apply voucher at checkout | Enter claimed voucher code → click "Apply" | Discount shown in order summary |
| T-6.5 | Quick-select voucher | Click a claimed voucher pill at checkout | Voucher auto-applied |
| T-6.6 | Invalid voucher code | Enter a non-existent code → apply | "Invalid or expired voucher code" error |
| T-6.7 | Unclaimed voucher code | Enter a valid code that user hasn't claimed | "You have not claimed this voucher" error |
| T-6.8 | Min spend check | Apply voucher where cart total < min spend | Error showing minimum spend requirement |
| T-6.9 | Free shipping voucher | Apply a free_shipping voucher | Shipping fee becomes ₱0 in summary |
| T-6.10 | Percentage discount | Apply percentage voucher | Correct % discount calculated (capped at max_discount) |
| T-6.11 | Fixed discount | Apply fixed amount voucher | Exact amount deducted (or entire subtotal if discount > subtotal) |
| T-6.12 | Remove applied voucher | Click "X" on applied voucher | Discount removed, totals recalculated |
| T-6.13 | Expired voucher | Try applying expired voucher | "Invalid or expired voucher code" error |

---

### Test Suite 7: Order Management

| Test ID | Test Case | Steps | Expected Result |
|---|---|---|---|
| T-7.1 | View my orders | Navigate to `/orders` | List of orders with statuses, dates, totals |
| T-7.2 | View order detail | Click on an order | Full detail page with items, images, variants, status, addresses |
| T-7.3 | Cancel pending order | Click "Cancel Order" on pending_confirmation order | Cancel modal opens |
| T-7.4 | Select cancel reason | Choose reason → confirm | Order status changes to "cancelled" |
| T-7.5 | Cancel with "other" reason | Select "other" → must provide notes | Notes field becomes required |
| T-7.6 | Cannot cancel confirmed order | Try cancelling a confirmed/shipped/delivered order | Cancel button not shown or error returned |
| T-7.7 | Mark payment failed | Return from PayMongo without paying → order shows payment failed | Order status updates to `payment_failed` |
| T-7.8 | Empty orders state | New user with no orders → visit `/orders` | "No orders yet" with "Start Shopping" CTA |
| T-7.9 | Order status badges | View orders with different statuses | Correct color-coded badges: amber (pending), blue (confirmed), green (delivered), red (cancelled) |
| T-7.10 | Business: confirm order | Login as business → go to orders → click confirm | Order moves to "confirmed" status |
| T-7.11 | Business: update status | Advance order to shipped/delivered | Status and timestamps update correctly |
| T-7.12 | Admin: view all orders | Login as admin → admin orders page | All platform orders visible |
| T-7.13 | Admin: update any status | Change any order's status | Status updated successfully |

---

### Test Suite 8: Reviews & Ratings

| Test ID | Test Case | Steps | Expected Result |
|---|---|---|---|
| T-8.1 | View reviews | On product detail, scroll to reviews section | Reviews listed with name, rating stars, comment, date |
| T-8.2 | Submit review | After receiving delivery, leave 4-star review + comment | Review saved, average rating updated |
| T-8.3 | Cannot review without purchase | Try reviewing a product never ordered | "Must purchase and receive" error (403) |
| T-8.4 | Cannot review undelivered | Try reviewing item with pending/shipped order | `can_review` is false |
| T-8.5 | Duplicate review blocked | Try submitting second review on same product | "Already reviewed" error (409) |
| T-8.6 | Delete review | Remove own review | Review deleted, product rating recalculated |
| T-8.7 | Name privacy | Check reviewer display name | Shows "FirstName L." (last initial only) |
| T-8.8 | Rating validation | Try submitting rating 0 or 6 | Validation error (1-5 only) |

---

### Test Suite 9: Wishlist

| Test ID | Test Case | Steps | Expected Result |
|---|---|---|---|
| T-9.1 | Add to wishlist | On product detail, click heart/wishlist button | Product saved, toast confirmation |
| T-9.2 | Remove from wishlist | On wishlist page, click red heart | Product removed from list |
| T-9.3 | Toggle wishlist | Click heart on already-wishlisted product | Removed (toggle behavior) |
| T-9.4 | View wishlist page | Navigate to `/wishlist` | Grid of saved products shown |
| T-9.5 | Empty wishlist | Remove all items | "Your Wishlist is Empty" with CTA |
| T-9.6 | Wishlist requires login | Try adding without login | Redirected to login or action fails |

---

### Test Suite 10: User Profile

| Test ID | Test Case | Steps | Expected Result |
|---|---|---|---|
| T-10.1 | View profile | Navigate to `/profile` | Profile card with avatar, name, email, role badge |
| T-10.2 | Edit personal info | Click "Edit" on personal info → change name → Save | Name updated, form collapses to display mode |
| T-10.3 | Edit phone number | Change phone → Save | Phone updated, only numeric chars allowed |
| T-10.4 | Cancel edit | Click "Cancel" during edit | Form reverts to original values |
| T-10.5 | Add address | No address saved → click "Add Address" → fill form | Address saved and displayed |
| T-10.6 | Edit address | Click "Edit" on address → change city → Save | Address updated |
| T-10.7 | Profile redirect | Visit `/profile` when logged out | Redirected to `/login` |

---

### Test Suite 11: Business Dashboard

| Test ID | Test Case | Steps | Expected Result |
|---|---|---|---|
| T-11.1 | Access dashboard | Login as business → go to `/business/dashboard` | Dashboard with stats: products, orders, revenue, low stock |
| T-11.2 | No store prompt | Business user without store visits dashboard | "Create a store" prompt shown |
| T-11.3 | Create store | Fill store form with name, description, address, logo | Store created, dashboard populates |
| T-11.4 | Update store | Go to store settings → change description → save | Store updated |
| T-11.5 | Create product | Go to Products → New → fill form → submit | Product created with slug, images, variants |
| T-11.6 | Upload product images | Attach 1-3 images to product | Images uploaded to Supabase, displayed on product |
| T-11.7 | Auto-generate variants | Add option categories (Size: S, M, L; Color: Red, Blue) | 6 variants auto-created (S/Red, S/Blue, M/Red, M/Blue, L/Red, L/Blue) |
| T-11.8 | Edit product | Change price, description → save | Product updated, cache invalidated |
| T-11.9 | Delete product | Click delete on a product → confirm | Product soft-deleted, removed from public listing |
| T-11.10 | View business orders | Go to business orders page | Only orders containing this business's products shown |
| T-11.11 | Confirm order | Click "Confirm" on pending order | Status changes to "confirmed", `confirmed_at` set |
| T-11.12 | Update order to shipped | Mark confirmed order as shipped | Status updated, `shipped_at` timestamp set |
| T-11.13 | IDOR protection | Try editing another business's product via API | 403 Forbidden |

---

### Test Suite 12: Admin Panel

| Test ID | Test Case | Steps | Expected Result |
|---|---|---|---|
| T-12.1 | Admin dashboard | Login as admin → `/admin/dashboard` | Platform-wide stats displayed |
| T-12.2 | List users | Navigate to user management | All users listed |
| T-12.3 | Edit user | Update a user's role/info | User updated |
| T-12.4 | Delete user | Delete a non-admin user | User removed |
| T-12.5 | Manage products | View all products across stores | Full product list visible |
| T-12.6 | Update inventory | Change stock quantity for a product | Stock updated |
| T-12.7 | Non-admin blocked | Login as customer → try `/admin/dashboard` via API | 403 Forbidden |

---

### Test Suite 13: Cross-Cutting Concerns

| Test ID | Test Case | Steps | Expected Result |
|---|---|---|---|
| T-13.1 | Mobile responsiveness | Open every page on mobile viewport (375px) | All pages render correctly, no horizontal scroll |
| T-13.2 | Tablet responsiveness | Open every page on tablet viewport (768px) | Appropriate grid layouts adjust |
| T-13.3 | Toast notifications | Perform actions (add to cart, remove, error) | Correct toast type appears and auto-dismisses |
| T-13.4 | Image fallback | View product with broken image URL | Placeholder SVG displayed |
| T-13.5 | Rate limiting | Send 6+ login attempts in 1 minute | 429 Too Many Requests after limit |
| T-13.6 | CSRF validation | Make POST request without CSRF token | 419 CSRF token mismatch |
| T-13.7 | API error handling | Trigger server error (invalid data) | Friendly error message shown, no crash |
| T-13.8 | Navbar behavior | Scroll down on any page | Navbar sticks to top with blur effect |
| T-13.9 | Browser back/forward | Navigate between pages with back/forward buttons | Correct page state restores |
| T-13.10 | SEO metadata | Check tab title and favicon | "SARI" favicon and correct page title shown |

---

## 📊 Feature Count Summary

| Module | Feature Count |
|---|---|
| Authentication & User Management | 10 |
| Product Browsing & Discovery | 18 |
| AI Product Comparison | 7 |
| Shopping Cart | 11 |
| Checkout & Payment | 17 |
| Voucher System | 11 |
| Order Management | 13 |
| Reviews & Ratings | 7 |
| Wishlist | 5 |
| User Profile | 5 |
| AI Recommendations | 5 |
| Business Dashboard | 15 |
| Admin Panel | 5 |
| UI/UX & Design | 12 |
| Security & Performance | 10 |
| **Total** | **151 features** |

---

## 📝 Test Execution Tracker Template

Copy the table below per tester:

| Test ID | Status | Tester | Date | Notes |
|---|---|---|---|---|
| T-1.1 | ⬜ | | | |
| T-1.2 | ⬜ | | | |
| ... | ... | ... | ... | ... |

> **Legend:** ✅ Pass | ❌ Fail | ⏭️ Skipped | ⬜ Not Started
