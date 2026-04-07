# Bug Fixes and Feature Enhancements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILLS: 
> - Use `superpowers:subagent-driven-development` to implement this plan task-by-task.
> - For any visual, styling, or UI changes (animations, new screens, layout changes), you MUST use the `frontend-design` plugin/skill. 
> Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Resolve critical bugs related to product management, checkout, carts, authentication syncing, update the styling (Plus Jakarta Sans and Footer), and implement new payment/order tracking flows.
**Architecture:** Next.js Frontend with Tailwind/CSS, Laravel backend.

---

### Task 1: Global Font and Google Auth Syncing (Frontend)

**Goal:** Apply 'Plus Jakarta Sans' globally and ensure Google OAuth login state persists in the web app UI.

- [ ] **Step 1: Update Global Font**
  - Use `frontend-design` to explore `frontend/src/app/layout.tsx` or `frontend/src/index.css` (or `globals.css`).
  - Import and apply the `Plus Jakarta Sans` Google font globally.
- [ ] **Step 2: Investigate Google Auth Redirect Callback**
  - Locate the Google Auth callback page (e.g., `frontend/src/app/(auth)/google/callback/page.tsx` or similar).
  - Determine why the token/session is not being stored/reflected.
  - Implement a fix to save the token (e.g., using localStorage, cookies, or context) and redirect the user back to the home page with an authenticated state.
- [ ] **Step 3: Test and Commit**
  - Verify that logging in via Google successfully updates the navigation/navbar state.
  - Commit: `fix: apply Plus Jakarta Sans font and resolve Google auth state syncing`

### Task 2: Logged-in Footer Updates (Frontend Design)

**Goal:** Update the footer component to display a specific format only when a user is logged in.

- [ ] **Step 1: Create/Update Footer Component**
  - Locate the footer component (e.g., `frontend/src/components/Footer.tsx` or layout).
  - Use `frontend-design` to update the footer design. Make it dynamic so it only renders the new design when `isAuthenticated` is true.
  - *Note: Since the specific design reference wasn't fully extracted in the prompt, invoke the visual companion or ask the user for the footer design details before starting this step.*
- [ ] **Step 2: Commit**
  - Commit: `feat: update footer design for authenticated users`

### Task 3: Product Management Bug Fixes (Backend / Frontend)

**Goal:** Fix the "client-settings" array key error, stop auto-generating options (like XL, XXL, Colors), and fix product images not displaying.

- [ ] **Step 1: Fix `client-settings` Undefined Array Key**
  - Locate the product creation logic on the Laravel Backend (e.g., `app/Http/Controllers/ProductController.php` or `app/Services/ProductService.php`).
  - Search for `client-settings` and wrap the access with `isset()` or `array_key_exists()`, or supply a default value using `??`.
- [ ] **Step 2: Stop Auto-Generation of Unwanted Product Options**
  - In the same product creation/variant generation logic, find where variants (sizes, colors) are generated.
  - Limit the generation strictly to the options provided in the initial request payload (e.g., if only S, M, L are sent, do not seed XL, XXL, and color). 
- [ ] **Step 3: Fix Product Image Display**
  - Verify if the `image_url` returned from the API needs to be prefixed with the backend URL, or if the storage symlink (`php artisan storage:link`) was missing.
  - If the path is correct, check the frontend `Image` component (e.g., `frontend/src/components/ProductCard.tsx`) to ensure the domain is allowed in `next.config.mjs` or that the correct absolute URL is formed.
- [ ] **Step 4: Commit**
  - Commit: `fix: handle client-settings array key, prevent auto-generating extra variants, and fix product image URLs`

### Task 4: Cart Fixes and Animations (Frontend)

**Goal:** Fix "Add to cart" functionality and add a success animation/confirmation using frontend-design.

- [ ] **Step 1: Fix Add to Cart Functionality**
  - Locate the add to cart logic (e.g., `frontend/src/app/products/[id]/page.tsx` or a `CartContext`).
  - Fix the payload or API endpoint target causing the failure. Ensure it correctly adds the item to the persistent cart or backend.
- [ ] **Step 2: Add Success Animation/Confirmation**
  - Use `frontend-design` to build a slick, dynamic toast notification or modal that animate in when an item is successfully added to the cart.
  - Implement this micro-animation within the Add to Cart button or as a global toast.
- [ ] **Step 3: Commit**
  - Commit: `fix: add to cart logic and implement success animation notification`

### Task 5: Checkout Form Fixes (Frontend)

**Goal:** Remove the delivery method selection and fix the `address.state` validation error.

- [ ] **Step 1: Remove Delivery Method Option**
  - Locate the checkout screen (e.g., `frontend/src/app/checkout/page.tsx`).
  - Remove or hide the delivery method selection completely. Hardcode the order payload to default to "Delivery".
- [ ] **Step 2: Fix Address State Field Validation**
  - Check the form validation schema (e.g., Zod schema or raw state) in the checkout screen.
  - If the state field is filled but still throwing an error, check the name binding of the input (e.g., `name="state"`), ensuring it properly matches the payload schema structure `address.state`.
  - Fix the other 2 unresolved validation errors by matching form names to validation paths.
- [ ] **Step 3: Commit**
  - Commit: `fix: remove checkout delivery method and resolve address form validation bugs`

### Task 6: Payment Gateway Integration (Backend / Frontend)

**Goal:** Ensure Paymongo is strictly in test mode and implement correct QR PH redirection flows.

- [ ] **Step 1: Verify Paymongo Test Mode**
  - Check the backend `.env` and `config/services.php` for Paymongo keys.
  - Ensure the API calls force using the `pk_test_...` and `sk_test_...` keys natively.
- [ ] **Step 2: QR PH Payment Flow Implementation**
  - In the checkout submission for the "QR PH" payment method, initiate a checkout session with Paymongo via the backend.
  - Get the Paymongo checkout URL and perform `window.location.href = checkout_url` on the frontend.
  - Ensure the backend passes a successful `success_url` back to the app (e.g., `http://localhost:3000/order-confirmed?session_id=...`).
- [ ] **Step 3: Commit**
  - Commit: `feat: enforce Paymongo test mode and implement QR PH redirect flow`

### Task 7: Order Confirmation & Tracking Screen (Frontend/Backend)

**Goal:** Build the Order Confirmed screen with AI recommendations and an Order Tracking panel.

- [ ] **Step 1: Order Confirmed Screen UI**
  - Create the UI at `frontend/src/app/order-confirmed/page.tsx`.
  - Use `frontend-design` to craft a premium success splash screen.
  - Display the user's name and filled shipping address.
- [ ] **Step 2: "You May Also Like" Section**
  - Below the confirmation, implement a "You may also like" product carousel.
  - Hook it up to an endpoint (or mock it temporarily) that serves related products.
- [ ] **Step 3: Order Tracking Panel UI**
  - Update the user Orders list (`frontend/src/app/(user)/orders/page.tsx` or similar).
  - Use `frontend-design` to create a beautiful progress tracker indicating the order states: `Packed -> Shipped -> Out for delivery -> Delivered`.
- [ ] **Step 4: Commit**
  - Commit: `feat: build out order confirmation splash screen, recommendations, and order tracking timeline`

---

**Execution Options:**
Plan complete and saved. Execute tasks using `superpowers:subagent-driven-development` and hand off any visual implementations to the `frontend-design` plugin subagents.
