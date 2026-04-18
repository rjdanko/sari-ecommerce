# SARI E-Commerce — Feature Summary

> A plain-language overview of everything the Sari platform can do.
> Last updated: April 16, 2026

---

## 🔐 1. Account & Login

- Users can **sign up** using their name, email, and password
- Users can **log in** with email/password or **sign in with Google** in one click
- A "**Forgot Password**" flow lets users reset their password via email
- Users can **show or hide** their password while typing it
- The system **remembers users** so they stay logged in even after closing the browser
- Users are automatically **redirected to the login page** if they try to access a page that requires being logged in
- There are **three types of users**:
  - **Customer** — can shop, buy, leave reviews
  - **Business Owner** — can sell products and manage a store
  - **Admin** — can manage the entire platform

---

## 🏠 2. Home Page

- A **large hero banner** at the top with a call-to-action to start shopping
- A **Voucher Center** section where users can browse and grab discount vouchers
- A "**Shop by Category**" section with visually styled cards for T-Shirts, Jeans, Dresses, and Jackets
- A "**Recommended For You**" section showing popular or personally suggested products

---

## 🛍️ 3. Browsing & Finding Products

- A full **"All Products" page** displaying products in a grid
- Users can **filter by category** (e.g., T-Shirts, Jeans, Dresses, Jackets, Men, Women)
- Users can **filter by price range** using a slider
- Users can **sort products** by Newest, Price (low to high or high to low), or Popularity
- A **search bar** in the navigation bar lets users search for products by name, description, or brand
- Users can switch between a **3-column or 4-column grid layout** on desktop
- A "**Load More**" button at the bottom fetches additional products without reloading the page
- Each product has a **detail page** showing its full description, images, price, available sizes/colors, reviews, and store info
- Products can have **multiple images** with one main image displayed first
- Products can have **variants** like different sizes and colors
- A **store page** shows a seller's profile (name, logo, banner) and all their products
- The navigation bar includes links to shop by **Men** and **Women** categories

---

## 🤖 4. AI Product Comparison

- Users can **select multiple products** to compare by ticking a checkbox on each product card
- A **comparison bar** appears at the bottom showing how many products are selected
- Clicking "**Compare Now**" opens a side-by-side comparison window
- Each product gets an **AI Score (out of 100)** based on price, rating, stock availability, discounts, and whether it's a staff pick
- The product with the highest score is highlighted as the "**Best Choice**"
- Each product's **strengths** are listed (e.g., "Best Price", "Highest Rated", "Great Discount")

---

## 🛒 5. Shopping Cart

- Users can **add products to the cart** from the product detail page
- Users can **choose a variant** (size/color) when adding to cart
- The **cart page** shows all added items with their image, name, price, and quantity
- Users can **increase or decrease** the quantity of each item (limited by available stock)
- Users can **remove items** individually from the cart
- Users can **change the variant** (e.g., switch from Size M to Size L) directly in the cart without removing and re-adding
- A **cart icon badge** in the navigation bar shows the current number of items
- An **order summary** sidebar shows the subtotal, shipping, and total
- If the cart is empty, a friendly "**Your Cart is Empty**" message is shown with a link to continue shopping

---

## 💳 6. Checkout & Payment

- A dedicated **checkout page** with a step-by-step layout:
  1. **Shipping Information** — full name, phone number, complete address
  2. **Payment Method** — choose from Cash on Delivery, QR PH, or Card Payment
  3. **Voucher Code** — optionally apply a discount voucher
- The phone number field **only accepts numbers** (letters are automatically blocked)
- All required fields are **validated** before the order can be placed, with clear error messages
- **Cash on Delivery (COD)**: order is placed immediately, stock is deducted, and the cart is cleared
- **QR PH / Card Payment**: the user is redirected to a secure payment page (powered by PayMongo) to complete the transaction
- A **"Buy Now"** button on each product lets users skip the cart and go straight to checkout with just that item
- The system **estimates a delivery fee** based on the distance between the store and the buyer's address
- If the distance can't be calculated, a **default flat fee** is used
- A **breadcrumb trail** (Cart → Checkout → Confirmation) helps users know where they are in the process
- After a successful order, a **confirmation page** is shown
- If a user cancels payment at the gateway, a **cancellation page** is shown

---

## 🎟️ 7. Vouchers & Discounts

- Available vouchers are displayed in a **Voucher Center** on the home page
- Users can **claim vouchers** to add them to their personal wallet
- At checkout, users can **type a voucher code** or **tap a claimed voucher** to apply it instantly
- Vouchers can offer:
  - **Fixed discount** (e.g., ₱50 off)
  - **Percentage discount** (e.g., 10% off, capped at a maximum amount)
  - **Free shipping**
- Each voucher can have a **minimum spend requirement** (e.g., "minimum ₱500 purchase")
- Vouchers have an **expiration date** and a **limited number of claims**
- Users can **remove an applied voucher** at checkout if they change their mind
- The system prevents users from **claiming the same voucher more than once**

---

## 📦 8. Order Tracking & Management

- Users can view **all their orders** on the "My Orders" page
- Each order shows its **order number**, date, number of items, status, and total amount
- Clicking on an order opens a **detailed view** showing every item (with image and variant info), pricing breakdown, and shipping address
- Orders go through a **status flow**:
  - Pending Store Confirmation → Confirmed → Processing → Shipped → Delivered
- Users can **cancel an order** before the store confirms it
  - They must select a **reason** (e.g., "Changed my mind", "Found a better deal", "Ordered by mistake")
  - If they select "Other", they must provide a **written explanation**
- Each order status is shown with a **color-coded badge** for easy identification
- If user didn't complete an online payment, the order is marked as "**Payment Failed**"

---

## ⭐ 9. Product Reviews & Ratings

- Anyone can **read reviews** on a product's detail page
- Reviews show the **reviewer's first name and last initial** (for privacy), their **star rating (1–5)**, their **comment**, and the **date**
- Only users who have **received** (delivered) the product can leave a review
- Each user can only submit **one review per product**
- Users can **delete their own review**
- The product's **average rating** and **total review count** update automatically when reviews are added or removed

---

## ❤️ 10. Wishlist

- Users can **save products** they like by tapping a heart icon
- All saved products appear on a dedicated **Wishlist page**
- Users can **remove items** from their wishlist by tapping the heart again
- If the wishlist is empty, a friendly message encourages users to **start browsing**

---

## 👤 11. User Profile

- Users have a **profile page** showing their name, email, and account type
- Users can **edit their personal info** (first name, last name, phone number)
- Users can **add or edit a saved address** (street, city, province, zip code)
- The profile displays a **role badge**: "Customer", "Business Owner", or "Administrator"

---

## 🏪 12. Business Dashboard (for Sellers)

- Business users have access to a **dedicated dashboard** with key stats:
  - Total products, active products, total orders, revenue earned, pending orders, and low-stock alerts
- Business users can **create a store** with a name, description, logo, banner, address, and map coordinates
- Business users can **update their store** info at any time
- A **sidebar navigation** provides quick access to: Dashboard, Products, Orders, and Store Settings
- Business users can **add new products** with:
  - Name, description, category, price, SKU, stock quantity
  - Multiple images (uploaded to cloud storage)
  - Option categories (e.g., Size and Color) that **automatically generate all variant combinations**
- Business users can **edit or delete** their own products
- Business users can **view orders** that contain their products
- Business users can **confirm pending orders** and **update order status** (e.g., mark as shipped or delivered)
- **Security**: a business user can only manage their own products and orders — they cannot access other sellers' data

---

## 🛡️ 13. Admin Panel (for Platform Managers)

- Admins have access to a **platform-wide dashboard** with overall statistics
- Admins can **manage all users** — view, edit roles, or remove accounts
- Admins can **manage all products** across every store — edit details or remove listings
- Admins can **manage inventory** — update stock levels for any product
- Admins can **view and manage all orders** — update status for any order on the platform

---

## 🎨 14. Design & User Experience

- The entire platform is **mobile-friendly** — it looks great on phones, tablets, and desktops
- The **navigation bar stays visible** at the top of the screen when scrolling (with a frosted glass effect)
- On mobile, a **hamburger menu** opens the navigation links
- **Loading skeletons** (animated grey placeholders) appear while content is being fetched, so the page never feels "broken"
- **Toast notifications** pop up to confirm actions (e.g., "Added to cart", "Order cancelled")
- Smooth **animations** on cards, buttons, and page transitions give the platform a polished feel
- Thoughtful **empty states** with illustrations and action buttons guide users when there's nothing to show
- Custom **Sari branding** — logo, favicon, and a warm orange/brown color scheme
- Modern **Montserrat font** used across the entire platform

---

## 🔒 15. Security & Performance

- All forms are protected against **cross-site request forgery (CSRF)** attacks
- The platform has **rate limiting** to prevent abuse (e.g., too many login attempts)
- Users can **only access their own data** — they cannot see other people's orders, carts, or profiles
- Product prices are **always verified on the server** — they cannot be manipulated by users
- Deleted products and orders are **soft-deleted** (hidden but recoverable, not permanently erased)
- Product listings are **cached** for faster page loads
- Passwords are **securely hashed** and never stored in plain text

---

## 📊 Feature Count by Area

| Area | Number of Features |
|---|---|
| Account & Login | 10 |
| Home Page | 4 |
| Browsing & Finding Products | 18 |
| AI Product Comparison | 7 |
| Shopping Cart | 11 |
| Checkout & Payment | 17 |
| Vouchers & Discounts | 11 |
| Order Tracking & Management | 13 |
| Reviews & Ratings | 7 |
| Wishlist | 5 |
| User Profile | 5 |
| Business Dashboard | 15 |
| Admin Panel | 5 |
| Design & User Experience | 12 |
| Security & Performance | 10 |
| **Grand Total** | **151 features** |
