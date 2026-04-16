# SARI E-Commerce — Modular Implementation Plan Index

> **For agentic workers:** Each module below is a self-contained implementation plan.
> Execute them in order. Each module MUST be completed before starting the next.
> Use checkbox (`- [ ]`) syntax for tracking progress.

**Goal:** Build a complete, production-ready e-commerce platform ("SARI") with
role-based authentication, inventory management, GCash/Card payments via
PayMongo, AI-powered search via Typesense, and smart product recommendations —
with security hardened at every layer.

**Architecture:** Decoupled monolith — Laravel API backend serves a Next.js SPA
frontend. Laravel handles all business logic, auth (Sanctum), queue processing
(RabbitMQ), caching (Redis), payments (PayMongo), and search indexing
(Typesense). Next.js handles rendering, routing, and user interactions.
Supabase provides managed PostgreSQL + object storage for product images.

**Tech Stack:**
- Back-End:      PHP 8.2+ / Laravel 12 (API-only via Breeze)
- Front-End:     Next.js 15 (App Router) / TypeScript / Tailwind CSS v4
- Database:      PostgreSQL via Supabase (managed)
- Auth:          Laravel Sanctum (cookie-based SPA auth)
- RBAC:          Spatie laravel-permission (User / Business / Admin roles)
- Payments:      PayMongo Checkout API (GCash, Visa, Mastercard)
- Search:        Typesense via Laravel Scout
- Caching:       Redis (sessions, cart, general cache)
- Queues:        RabbitMQ via vladimir-yuldashev/laravel-queue-rabbitmq
- Recommendations: Recombee PHP SDK (optional, AI-powered)
- Storage:       Supabase Storage (S3-compatible, CDN-backed)
- Admin Panel:   Filament PHP (for internal admin/business dashboards)

---

## 🔒 Cross-Cutting Security Requirements

These security concerns apply to EVERY module. Each module plan integrates them
where relevant, but here is the authoritative checklist:

### 1. Rate Limiting on API Endpoints
- All public endpoints (login, register, search, product listing) MUST have rate limits
- Use Laravel's built-in `RateLimiter` in `RouteServiceProvider` / `bootstrap/app.php`
- Login/Register: 5 requests/minute per IP
- Search: 30 requests/minute per IP
- Public API: 60 requests/minute per IP
- Authenticated API: 120 requests/minute per user

### 2. Secure API Keys in Client Code
- NEVER expose secret keys (`PAYMONGO_SECRET_KEY`, `TYPESENSE_API_KEY`, `SUPABASE_SECRET_KEY`) in frontend code
- Only `NEXT_PUBLIC_*` prefixed env vars are safe for frontend — and these must be **read-only / search-only** keys
- PayMongo public key (`pk_*`) is safe for frontend; secret key (`sk_*`) is backend-only
- Typesense: Create a separate **search-only** API key for frontend; admin key stays backend-only

### 3. SQL Injection Prevention
- Laravel Eloquent ORM is parameterized by default — use it everywhere
- NEVER use `DB::raw()` or `DB::select()` with concatenated user input
- If raw queries are unavoidable, use `DB::select('... WHERE id = ?', [$id])` with bindings
- All search filters, sort params, and pagination values must be validated before use

### 4. IDOR (Insecure Direct Object Reference) Prevention
- Every endpoint that accesses user-scoped data MUST verify ownership
- Orders: `$user->orders()->findOrFail($orderId)` — NOT `Order::findOrFail($orderId)`
- Products (business): verify `$product->business_id === $user->id` before allow edit/delete
- Wishlist: scope all queries to `$user->id`
- Cart: Redis keys namespaced by `cart:{userId}` (already scoped)

### 5. Missing Authorization on Protected Routes
- Backend middleware MUST enforce roles — never rely on frontend hiding buttons
- Admin routes: `middleware('role:admin')` — verified server-side
- Business routes: `middleware('role:business|admin')` — verified server-side
- User data routes: `middleware('auth:sanctum')` + ownership checks in controller
- Product mutations (create/edit/delete): require `permission:create products` etc.
- Use Laravel Policies for resource-level authorization (`ProductPolicy`, `OrderPolicy`)

### 6. Input Validation
- ALL request inputs MUST be validated using Laravel Form Request classes
- File uploads: validate MIME type, max size, dimensions
- String inputs: max length, regex where appropriate (e.g., phone numbers)
- Numeric inputs: min/max bounds (prices, quantities)
- JSON inputs: validate nested structure (addresses, attributes)
- Reject unexpected fields with `$request->validated()` — never use `$request->all()`

---

## Module Execution Order

| # | Module | File | Est. Hours |
|---|--------|------|-----------|
| 1 | Project Scaffolding & Infrastructure | [01-SCAFFOLDING.md](./01-SCAFFOLDING.md) | 3-4h |
| 2 | Database Schema & Models | [02-DATABASE.md](./02-DATABASE.md) | 4-5h |
| 3 | Authentication & RBAC (Security-Hardened) | [03-AUTH-RBAC.md](./03-AUTH-RBAC.md) | 5-6h |
| 4 | Security Middleware & Policies | [04-SECURITY.md](./04-SECURITY.md) | 4-5h |
| 5 | Core Services (Cart, Image Storage) | [05-CORE-SERVICES.md](./05-CORE-SERVICES.md) | 4-5h |
| 6 | Payment Integration (PayMongo) | [06-PAYMENTS.md](./06-PAYMENTS.md) | 4-5h |
| 7 | Search (Typesense + Laravel Scout) | [07-SEARCH.md](./07-SEARCH.md) | 3-4h |
| 8 | AI Recommendations (Recombee) | [08-RECOMMENDATIONS.md](./08-RECOMMENDATIONS.md) | 3-4h |
| 9 | Queue Configuration (RabbitMQ) | [09-QUEUES.md](./09-QUEUES.md) | 2-3h |
| 10 | Product CRUD & Business Logic | [10-PRODUCTS.md](./10-PRODUCTS.md) | 4-5h |
| 11 | Next.js Frontend Foundation | [11-FRONTEND-FOUNDATION.md](./11-FRONTEND-FOUNDATION.md) | 5-6h |
| 12 | Frontend Pages & Components | [12-FRONTEND-PAGES.md](./12-FRONTEND-PAGES.md) | 5-6h |
| 13 | Integration Testing & Verification | [13-VERIFICATION.md](./13-VERIFICATION.md) | 3-4h |

| 32 | Image Display, Store Coords, Gender Filter & Search Fix | [32-IMAGE-DISPLAY-STORE-COORDS-GENDER-FILTER.md](./32-IMAGE-DISPLAY-STORE-COORDS-GENDER-FILTER.md) | 3-5h |
| 33 | Voucher System, Cart Variant Editing, Search Fix & Image Fix | [33-VOUCHER-CART-OPTIONS-SEARCH-FIX.md](./33-VOUCHER-CART-OPTIONS-SEARCH-FIX.md) | 8-12h |
| 34 | Product Delete Fix, Card Payment, Image Fix & Performance | [34-DELETE-FIX-CARD-PAYMENT-IMAGE-FIX-PERFORMANCE.md](./34-DELETE-FIX-CARD-PAYMENT-IMAGE-FIX-PERFORMANCE.md) | 6-10h |
| 35 | Supabase S3 Credentials Fix & Checkout Button Fix | [35-SUPABASE-CREDS-FIX-CHECKOUT-BUTTON-FIX.md](./35-SUPABASE-CREDS-FIX-CHECKOUT-BUTTON-FIX.md) | Completed |

**Total estimated time: 53-74 hours for a single developer.**

---

## Directory Structure (Monorepo)

```
sari-ecommerce/
├── backend/                          # Laravel 12 API
│   ├── app/
│   │   ├── Enums/RoleEnum.php
│   │   ├── Http/
│   │   │   ├── Controllers/
│   │   │   │   ├── Auth/{Login,Register,Logout}Controller.php
│   │   │   │   ├── {Product,Category,Cart,Order,Checkout}Controller.php
│   │   │   │   ├── {Webhook,Search,Recommendation,Wishlist}Controller.php
│   │   │   │   └── Admin/{User,Inventory,Dashboard}Controller.php
│   │   │   ├── Middleware/
│   │   │   │   ├── EnsureRole.php
│   │   │   │   └── [Rate limiter config in bootstrap/app.php]
│   │   │   ├── Requests/              # ← Form Request validation classes
│   │   │   │   ├── StoreProductRequest.php
│   │   │   │   ├── UpdateProductRequest.php
│   │   │   │   ├── LoginRequest.php
│   │   │   │   ├── RegisterRequest.php
│   │   │   │   ├── StoreCartItemRequest.php
│   │   │   │   ├── CheckoutRequest.php
│   │   │   │   └── SearchRequest.php
│   │   │   └── Resources/
│   │   │       ├── {Product,Category,Order,User}Resource.php
│   │   ├── Jobs/
│   │   │   ├── ProcessPaymentWebhook.php
│   │   │   ├── SyncProductToTypesense.php
│   │   │   ├── SyncInteractionToRecombee.php
│   │   │   └── ProcessImageUpload.php
│   │   ├── Models/
│   │   │   ├── {User,Product,ProductVariant,Category}.php
│   │   │   ├── {Order,OrderItem,ProductImage,Wishlist,SearchHistory}.php
│   │   ├── Policies/                  # ← Authorization policies
│   │   │   ├── ProductPolicy.php
│   │   │   └── OrderPolicy.php
│   │   └── Services/
│   │       ├── CartService.php
│   │       ├── PaymentService.php
│   │       ├── RecommendationService.php
│   │       ├── SearchService.php
│   │       └── ImageService.php
│   ├── config/
│   ├── database/migrations/
│   ├── database/seeders/
│   ├── routes/api.php
│   └── tests/Feature/                 # ← Security & integration tests
│       ├── Auth/LoginTest.php
│       ├── Auth/RegistrationTest.php
│       ├── Security/RateLimitTest.php
│       ├── Security/IDORTest.php
│       ├── Security/AuthorizationTest.php
│       └── Product/ProductCrudTest.php
│
├── frontend/                          # Next.js 15 App
│   ├── src/app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── (auth)/{login,register}/page.tsx
│   │   ├── (shop)/{products,categories,cart,checkout}/
│   │   ├── (user)/{profile,orders,wishlist}/
│   │   ├── (business)/{dashboard,products,orders}/
│   │   └── (admin)/{dashboard,users,inventory}/
│   ├── src/components/
│   ├── src/hooks/
│   ├── src/lib/
│   ├── src/services/
│   └── src/types/
│
├── docker-compose.yml
└── documents/plans/                   # These plan files
```
