# Module 32: Product Image Display Fix, Store Coordinates, Gender Classification & Search Persistence

**Date:** 2026-04-09
**Status:** Planned

---

## Overview

This module addresses three issues:

1. **Product images not displaying on frontend** -- images upload to Supabase successfully and URLs are saved in the database, but the frontend renders placeholders/broken images instead
2. **Store latitude/longitude column missing** -- updating a store with coordinates fails with `SQLSTATE[42703]: Undefined column` because migration `0020_add_coordinates_to_stores.php` has not been applied to the live database
3. **Gender classification for products** -- add a gender identifier (Men / Women / Unisex) to products, with a filter on the storefront and a selector in the seller product form
4. **Search query not persisting** -- when a user types a query in the Navbar search bar and presses Enter, the text disappears from the input on the products page, and the query is not used to filter products

---

## Plugin Usage

- Use the **`superpowers`** plugin throughout implementation for systematic debugging (Task 1), TDD (Task 3), verification before completion, and code review.
- Use the **`frontend-design`** plugin for all frontend UI components -- especially the gender selector on the product form and the gender filter chips on the product listing page.

---

## Task 1: Fix Product Images Not Displaying on Frontend

### Problem

Product images upload to Supabase Storage and their full URLs (e.g., `https://db.sglapvdokkfrlcdwpywf.supabase.co/storage/v1/object/public/...`) are correctly saved in the `product_images` table. However, the frontend shows placeholders or broken images.

**Root cause:** The Next.js `next.config.ts` has **no `images` configuration at all** -- Supabase domains are not whitelisted for the `next/image` component, which blocks all external image loading.

### Diagnosis Steps

Before implementing fixes, verify the root cause using the `superpowers:systematic-debugging` skill:

1. Open browser DevTools on a product page and inspect the `<img>` element -- check if the `src` attribute contains a valid Supabase URL
2. Check the browser console for Next.js image optimization errors (e.g., `"hostname is not configured under images in your next.config"`)
3. Verify a Supabase image URL loads directly in the browser (paste the raw URL)
4. Check Supabase Storage bucket is set to **public** access

### Implementation Steps

#### Step 1: Configure Next.js remote image patterns

**File:** [next.config.ts](frontend/next.config.ts)

The current config is empty:
```ts
const nextConfig: NextConfig = {
  /* config options here */
};
```

Add the Supabase domain to `images.remotePatterns`:
```ts
const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'db.sglapvdokkfrlcdwpywf.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
};
```

> **Note:** Read the Next.js docs at `node_modules/next/dist/docs/` before writing the config, as the API may differ from training data.

#### Step 2: Verify ProductResource URL passthrough

**File:** [ProductResource.php](backend/app/Http/Resources/ProductResource.php)

The `formatImageUrl()` method (line 10-16) currently passes through URLs starting with `http` unchanged -- this is correct. Verify no middleware or serialization is stripping or modifying the URL downstream.

#### Step 3: Audit frontend image components

**Files to check:**
- [ProductCard.tsx](frontend/src/components/ProductCard.tsx) -- verify `src` prop uses the full URL from `product.primary_image?.url`
- [products/[slug]/page.tsx](frontend/src/app/products/[slug]/page.tsx) -- verify image gallery uses full URLs
- Any component using `next/image` with Supabase URLs

Ensure all `<Image>` components include proper `width`/`height` or `fill` props. If any components use raw `<img>` tags, they should also work once the URL is correct.

#### Step 4: Test and verify

Use the `superpowers:verification-before-completion` skill:
1. Restart the Next.js dev server (config changes require restart)
2. Load the product listing page -- images should render
3. Load a product detail page -- all gallery images should render
4. Check the business dashboard product list -- images should render there too

### Expected Result

Product images display correctly across all pages using Supabase URLs via Next.js image optimization.

---

## Task 2: Fix Store Latitude/Longitude Column Error

### Problem

Updating a store with latitude/longitude fails with:
```
SQLSTATE[42703]: Undefined column: 7 ERROR: column "latitude" of relation "stores" does not exist
```

The migration file `0020_add_coordinates_to_stores.php` exists in the codebase, and the `Store` model already has `latitude`/`longitude` in `$fillable` and `$casts`. The migration simply hasn't been run against the Supabase database.

### Implementation Steps

#### Step 1: Run pending migrations

```bash
php artisan migrate --force
```

This will apply `0020_add_coordinates_to_stores.php` (and any other pending migrations) to the live database, adding the `latitude` (decimal 10,8) and `longitude` (decimal 11,8) nullable columns.

#### Step 2: Verify columns exist

```bash
php artisan tinker --execute="echo Schema::hasColumn('stores', 'latitude') ? 'OK' : 'MISSING';"
```

Or check via Supabase SQL editor:
```sql
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'stores' AND column_name IN ('latitude', 'longitude');
```

#### Step 3: Test the store update

1. Go to the business store settings page
2. Enter a phone number with latitude (e.g., 15.0794) and longitude (e.g., 120.6200)
3. Submit the form -- it should succeed without errors
4. Verify the values are saved by refreshing the page

### Expected Result

Store updates with coordinates save successfully. The `SQLSTATE[42703]` error no longer occurs.

---

## Task 3: Add Gender Classification to Products

### Problem

There is no way to identify whether a product is for men, women, or unisex. Sellers need a way to classify products during creation/editing, and customers need a filter to browse by gender on product listings.

### Approach

Add a dedicated `gender` enum column to the `products` table with values `men`, `women`, `unisex`, defaulting to `unisex`. This gives clean queries, DB-level validation, and easy filtering.

### Implementation Steps

#### Step 1: Create migration

**New file:** `backend/database/migrations/XXXX_add_gender_to_products_table.php`

```php
Schema::table('products', function (Blueprint $table) {
    $table->string('gender', 10)->default('unisex')->after('brand');
});

// Add check constraint for valid values
DB::statement("ALTER TABLE products ADD CONSTRAINT products_gender_check CHECK (gender IN ('men', 'women', 'unisex'))");
```

Run the migration:
```bash
php artisan migrate
```

#### Step 2: Update Product model

**File:** [Product.php](backend/app/Models/Product.php)

1. Add `'gender'` to the `$fillable` array
2. Add cast: `'gender' => 'string'`

#### Step 3: Update form request validation

**File:** [StoreProductRequest.php](backend/app/Http/Requests/StoreProductRequest.php)

Add validation rule:
```php
'gender' => ['sometimes', 'in:men,women,unisex'],
```

**File:** [UpdateProductRequest.php](backend/app/Http/Requests/UpdateProductRequest.php)

Same rule:
```php
'gender' => ['sometimes', 'in:men,women,unisex'],
```

#### Step 4: Update ProductResource

**File:** [ProductResource.php](backend/app/Http/Resources/ProductResource.php)

Add `'gender' => $this->gender` to the `toArray()` return array (after `brand`).

#### Step 5: Add gender filter to product listing endpoint

**File:** [ProductController.php](backend/app/Http/Controllers/ProductController.php) (or whichever controller handles the `GET /products` listing)

Accept `gender` as a query parameter and filter:
```php
$query->when($request->gender, fn ($q, $gender) => $q->where('gender', $gender));
```

#### Step 6: Update frontend TypeScript types

**File:** [product.ts](frontend/src/types/product.ts)

Add to the `Product` interface:
```ts
gender: 'men' | 'women' | 'unisex';
```

#### Step 7: Add gender selector to seller product form

**Files:**
- [business/products/new/page.tsx](frontend/src/app/business/products/new/page.tsx)
- [business/products/[id]/edit/page.tsx](frontend/src/app/business/products/[id]/edit/page.tsx)

Use the **`frontend-design`** plugin to design this component:

- **Component:** Segmented button group with 3 options: Men / Women / Unisex
- **Placement:** Near the category selector (they are related classification fields)
- **Default:** "Unisex" pre-selected
- **Behavior:** Single-select, required field (always has a value due to default)
- **Label:** "Target Audience" or "Gender Category"
- **Design notes:** Use a pill/toggle style that matches the existing form aesthetics. All 3 options visible at once (no dropdown -- only 3 values)

#### Step 8: Add gender filter to storefront product listing

**File:** [products/page.tsx](frontend/src/app/products/page.tsx) (or the product listing component)

Use the **`frontend-design`** plugin to design this filter:

- **Component:** Filter chips/pills above the product grid: All | Men | Women | Unisex
- **Default:** "All" selected (shows all products regardless of gender)
- **Behavior:**
  - Clicking a chip filters the product listing via API query param `?gender=men`
  - "All" removes the gender filter
  - Filter updates the URL query params for shareability (e.g., `/products?gender=women`)
  - Works alongside existing category filters
- **Design notes:** Place as a horizontal row of pills. Use subtle styling that matches the existing filter/category UI. Show product count per option if available (e.g., "Men (24)")

#### Step 9: Add gender badge to product cards (optional enhancement)

**File:** [ProductCard.tsx](frontend/src/components/ProductCard.tsx)

Use the **`frontend-design`** plugin:

- Show a small, subtle badge on product cards for "Men" and "Women" products
- Skip the badge for "Unisex" products (reduces visual noise)
- Position: top-left corner of the card, semi-transparent background
- Keep it minimal -- should not compete with the product image or price

#### Step 10: Update Typesense search index (if applicable)

If products are indexed in Typesense for search, add `gender` as a filterable field:

1. Update the Typesense collection schema to include `gender` as a `string` field with `facet: true`
2. Update the Laravel Scout `toSearchableArray()` method on the Product model to include `gender`
3. Re-index products: `php artisan scout:import "App\Models\Product"`
4. Update the frontend Typesense `InstantSearch` config to add gender as a refinement/facet filter

### UX Enhancement Ideas

These are optional enhancements to consider during or after implementation:

- **Smart filter visibility:** Only show gender filter chips when the current category has gendered products (e.g., show on "Clothing" but hide on "Electronics"). Requires a quick count query per category.
- **Badge with count:** Show product count per gender option in the filter chips (e.g., "Men (24)") to give users a sense of available inventory.
- **Search integration:** Gender as a Typesense facet allows it to work within the search results page too, not just the category browse.
- **URL-driven state:** Gender filter in URL query params means users can share filtered views (e.g., `/products?category=clothing&gender=women`).

### Expected Result

- Sellers see a segmented "Men / Women / Unisex" toggle on the product form, defaulting to "Unisex"
- Customers can filter products by gender on the listing page
- Product cards show subtle gender badges for Men/Women products
- Existing products default to "Unisex" via the migration default

---

## Task 4: Fix Search Query Persistence & Functionality

### Problem

When a user types a search query in the Navbar search bar and presses Enter/Search:

1. **Search text disappears** -- the Navbar navigates to `/products?q=shoes` via `window.location.href`, but the search bar resets to empty because `searchQuery` state is initialized as `useState('')` and never reads from URL params
2. **Query is ignored** -- the products page (`ProductsPageContent`) reads `searchParams` but only extracts `category` and `ai` params. The `q` param is never read or passed to the API, so no search filtering occurs

### Root Cause Analysis

**Navbar** ([Navbar.tsx](frontend/src/components/layout/Navbar.tsx), line 15):
```tsx
const [searchQuery, setSearchQuery] = useState(''); // Always starts empty
```
The `handleSearch` function (line 17) navigates to `/products?q=...`, but when the Navbar re-renders on the products page, the state resets to `''`.

**Products page** ([products/page.tsx](frontend/src/app/products/page.tsx), lines 43-50):
```tsx
const params: Record<string, string | number> = {
  per_page: 20,
  page: pageNum,
  sort: sortBy,
};
if (activeCategory !== 'all') params.category = activeCategory;
// ← 'q' param is never read from searchParams or passed to the API
```

### Implementation Steps

#### Step 1: Populate Navbar search bar from URL params

**File:** [Navbar.tsx](frontend/src/components/layout/Navbar.tsx)

1. Import `useSearchParams` from `next/navigation` (or `usePathname` + manual URL parsing)
2. On mount and when URL changes, read the `q` param and set `searchQuery` state:
   ```tsx
   const searchParams = useSearchParams();
   
   useEffect(() => {
     const q = searchParams.get('q');
     if (q) setSearchQuery(q);
   }, [searchParams]);
   ```
3. This ensures the search bar shows the current query when landing on `/products?q=shoes` (from navigation, shared link, or page refresh)

> **Note:** The Navbar is a shared layout component. Ensure `useSearchParams` is only used where the Navbar is wrapped in a `<Suspense>` boundary, or handle the client component boundary appropriately.

#### Step 2: Pass search query to the products API call

**File:** [products/page.tsx](frontend/src/app/products/page.tsx)

1. Read the `q` param from `searchParams`:
   ```tsx
   const searchQuery = searchParams.get('q') || '';
   ```
2. Include it in the `fetchProducts` API call params:
   ```tsx
   const params: Record<string, string | number> = {
     per_page: 20,
     page: pageNum,
     sort: sortBy,
   };
   if (activeCategory !== 'all') params.category = activeCategory;
   if (searchQuery) params.q = searchQuery; // ← Add this
   ```
3. Add `searchQuery` to the `useCallback` dependency array so products re-fetch when the query changes
4. Reset to page 1 when the search query changes

#### Step 3: Verify backend handles search query

Check the `ProductController@index` (or equivalent) to confirm it accepts a `q` parameter and filters products by name/description. If it doesn't, add:
```php
$query->when($request->q, function ($q, $search) {
    $q->where(function ($q) use ($search) {
        $q->where('name', 'ilike', "%{$search}%")
          ->orWhere('description', 'ilike', "%{$search}%");
    });
});
```

> If Typesense search is already integrated for the `q` param, the backend may route to the search service instead -- verify which path is taken.

#### Step 4: Show active search state on products page

**File:** [products/page.tsx](frontend/src/app/products/page.tsx)

When a search query is active, display it above the product grid:
- Show text like: **Showing results for "shoes"** with a clear/X button to remove the query
- Clearing the search should navigate to `/products` (removing the `q` param)
- This gives users visibility that a filter is active and a way to reset it

#### Step 5: Use router navigation instead of window.location.href

**File:** [Navbar.tsx](frontend/src/components/layout/Navbar.tsx)

Replace `window.location.href` with Next.js router navigation to avoid full page reloads:
```tsx
import { useRouter } from 'next/navigation';

const router = useRouter();

const handleSearch = (e: React.FormEvent) => {
  e.preventDefault();
  if (searchQuery.trim()) {
    router.push(`/products?q=${encodeURIComponent(searchQuery)}`);
  }
};
```

This preserves client-side navigation, avoids remounting the entire app, and keeps the search input populated.

### Expected Result

- User types "shoes" in the search bar and presses Enter
- URL updates to `/products?q=shoes`
- The search bar retains "shoes" as the input value
- The products page shows filtered results matching "shoes"
- A "Showing results for 'shoes'" indicator appears with a clear button
- Refreshing the page or sharing the URL preserves the search state

---

## Testing Checklist

Use the `superpowers:verification-before-completion` skill after each task:

- [ ] **Task 1:** Product images display correctly on product listing, product detail, and business dashboard
- [ ] **Task 2:** Store update with latitude/longitude succeeds without SQL errors
- [ ] **Task 3 - Backend:** Migration runs, model/resource/validation updated, API filter works
- [ ] **Task 3 - Seller form:** Gender selector appears on new/edit product forms, defaults to Unisex, saves correctly
- [ ] **Task 3 - Customer filter:** Gender filter chips appear on product listing, filtering works, URL updates
- [ ] **Task 3 - Badge:** Product cards show gender badge for Men/Women (not Unisex)
- [ ] **Task 3 - Search:** Gender facet works in Typesense search results (if applicable)
- [ ] **Task 4 - Persistence:** Search query remains in Navbar input after navigating to products page
- [ ] **Task 4 - Filtering:** Products are filtered by the `q` parameter from the URL
- [ ] **Task 4 - Indicator:** "Showing results for..." text appears with clear button
- [ ] **Task 4 - URL state:** Refreshing or sharing `/products?q=shoes` preserves search state

---

## Files Modified

### Task 1 (Image Fix)
| File | Change |
|------|--------|
| `frontend/next.config.ts` | Add Supabase domain to `images.remotePatterns` |
| `frontend/src/components/ProductCard.tsx` | Verify image `src` usage (may need no change) |
| `frontend/src/app/products/[slug]/page.tsx` | Verify gallery image URLs (may need no change) |

### Task 2 (Store Coordinates)
| File | Change |
|------|--------|
| Database (Supabase) | Run pending migration `0020_add_coordinates_to_stores.php` |

### Task 3 (Gender Classification)
| File | Change |
|------|--------|
| `backend/database/migrations/XXXX_add_gender_to_products_table.php` | **New** -- add `gender` column |
| `backend/app/Models/Product.php` | Add `gender` to `$fillable` and `$casts` |
| `backend/app/Http/Requests/StoreProductRequest.php` | Add `gender` validation |
| `backend/app/Http/Requests/UpdateProductRequest.php` | Add `gender` validation |
| `backend/app/Http/Resources/ProductResource.php` | Include `gender` in response |
| `backend/app/Http/Controllers/ProductController.php` | Add `gender` query filter |
| `frontend/src/types/product.ts` | Add `gender` to `Product` interface |
| `frontend/src/app/business/products/new/page.tsx` | Add gender selector (use `frontend-design`) |
| `frontend/src/app/business/products/[id]/edit/page.tsx` | Add gender selector (use `frontend-design`) |
| `frontend/src/app/products/page.tsx` | Add gender filter chips (use `frontend-design`) |
| `frontend/src/components/ProductCard.tsx` | Add gender badge (use `frontend-design`) |

### Task 4 (Search Persistence)
| File | Change |
|------|--------|
| `frontend/src/components/layout/Navbar.tsx` | Read `q` from URL params, populate search input, use `router.push` instead of `window.location.href` |
| `frontend/src/app/products/page.tsx` | Read `q` from `searchParams`, pass to API, show search indicator with clear button |
| `backend/app/Http/Controllers/ProductController.php` | Verify/add `q` param handling for product search (may already exist) |
