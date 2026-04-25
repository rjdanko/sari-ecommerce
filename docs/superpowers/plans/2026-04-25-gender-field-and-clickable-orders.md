# Gender Field + Clickable Recent Orders Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `gender` column to products (men / women / unisex) with full backend + frontend support, and make recent order rows in the seller dashboard clickable so sellers navigate directly to the order detail page.

**Architecture:** The gender field is a nullable enum column added via a new migration, exposed through existing form requests, surfaced in the product create/edit forms, and filterable from the buyer-facing sidebar. The clickable orders change is a pure frontend modification — wrapping each recent order `<div>` in a `<Link>` to `/business/orders/{id}`.

**Tech Stack:** Laravel 11 (PHP), Next.js 14 App Router (TypeScript/React), Tailwind CSS, PostgreSQL

---

## File Map

| File | Change |
|------|--------|
| `backend/database/migrations/0027_add_gender_to_products_table.php` | New — adds `gender` enum column |
| `backend/app/Models/Product.php` | Modify — add `gender` to `$fillable` and `$casts` |
| `backend/app/Http/Requests/StoreProductRequest.php` | Modify — add `gender` validation rule |
| `backend/app/Http/Requests/UpdateProductRequest.php` | Modify — add `gender` validation rule |
| `backend/app/Http/Controllers/ProductController.php` | Modify — add `?gender=` filter in `buildProductListing` |
| `frontend/src/types/product.ts` | Modify — add `gender` field to `Product` interface |
| `frontend/src/app/business/products/new/page.tsx` | Modify — add gender dropdown to create form + submit |
| `frontend/src/app/business/products/[id]/edit/page.tsx` | Modify — add gender dropdown to edit form + submit |
| `frontend/src/components/SidebarFilter.tsx` | Modify — add Gender filter section + prop |
| `frontend/src/app/products/page.tsx` | Modify — wire `activeGender` state + pass to sidebar + API call |
| `frontend/src/app/business/dashboard/page.tsx` | Modify — wrap recent order rows with `<Link>` |

---

## Task 1: Backend Migration — Add `gender` Column

**Files:**
- Create: `backend/database/migrations/0027_add_gender_to_products_table.php`

- [ ] **Step 1: Create the migration file**

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->enum('gender', ['men', 'women', 'unisex'])->nullable()->after('brand');
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn('gender');
        });
    }
};
```

- [ ] **Step 2: Run the migration**

```bash
cd backend && php artisan migrate
```

Expected: `Migrating: 0027_add_gender_to_products_table` then `Migrated` with no errors.

- [ ] **Step 3: Verify the column exists**

```bash
php artisan tinker --execute="echo implode(', ', array_column(\DB::select(\"SELECT column_name FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'gender'\"), 'column_name'));"
```

Expected output: `gender`

- [ ] **Step 4: Commit**

```bash
git add backend/database/migrations/0027_add_gender_to_products_table.php
git commit -m "feat(db): add nullable gender enum column to products table"
```

---

## Task 2: Backend Model — Expose `gender` Field

**Files:**
- Modify: `backend/app/Models/Product.php:14-19` (fillable array)

- [ ] **Step 1: Add `gender` to `$fillable` in Product.php**

Replace the current `$fillable` array (lines 14–20):

```php
protected $fillable = [
    'category_id', 'business_id', 'store_id', 'name', 'slug', 'description',
    'short_description', 'base_price', 'compare_at_price', 'sku',
    'stock_quantity', 'low_stock_threshold', 'status', 'brand', 'gender',
    'attributes', 'weight', 'is_featured', 'view_count',
    'average_rating', 'review_count',
];
```

- [ ] **Step 2: Verify no tests break**

```bash
cd backend && php artisan test --filter=ProductTest
```

Expected: all tests pass (or "No tests found" if no product tests exist — both are acceptable).

- [ ] **Step 3: Commit**

```bash
git add backend/app/Models/Product.php
git commit -m "feat(model): add gender to Product fillable"
```

---

## Task 3: Backend Validation — Accept `gender` in Form Requests

**Files:**
- Modify: `backend/app/Http/Requests/StoreProductRequest.php:16-36`
- Modify: `backend/app/Http/Requests/UpdateProductRequest.php:16-36`

- [ ] **Step 1: Add gender rule to StoreProductRequest**

In `StoreProductRequest.php`, add this line inside the `rules()` return array, after the `'brand'` rule:

```php
'gender' => ['nullable', 'string', 'in:men,women,unisex'],
```

Full `rules()` method should look like:

```php
public function rules(): array
{
    return [
        'name' => ['required', 'string', 'max:255'],
        'description' => ['nullable', 'string', 'max:10000'],
        'short_description' => ['nullable', 'string', 'max:500'],
        'category_id' => ['required', 'integer', 'exists:categories,id'],
        'base_price' => ['required', 'numeric', 'min:0', 'max:99999999.99'],
        'compare_at_price' => ['nullable', 'numeric', 'min:0', 'max:99999999.99'],
        'sku' => ['required', 'string', 'max:100', 'unique:products,sku'],
        'stock_quantity' => ['required', 'integer', 'min:0', 'max:999999'],
        'low_stock_threshold' => ['nullable', 'integer', 'min:0', 'max:999999'],
        'brand' => ['nullable', 'string', 'max:255'],
        'gender' => ['nullable', 'string', 'in:men,women,unisex'],
        'weight' => ['nullable', 'numeric', 'min:0', 'max:99999.99'],
        'attributes' => ['nullable', 'array'],
        'attributes.*' => ['string', 'max:255'],
        'images' => ['nullable', 'array', 'max:10'],
        'images.*' => ['image', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
        'option_categories' => ['nullable', 'array', 'max:5'],
        'option_categories.*.name' => ['required_with:option_categories', 'string', 'max:100'],
        'option_categories.*.values' => ['required_with:option_categories', 'array', 'min:1', 'max:20'],
        'option_categories.*.values.*' => ['string', 'max:100'],
    ];
}
```

- [ ] **Step 2: Add gender rule to UpdateProductRequest**

In `UpdateProductRequest.php`, add this line inside the `rules()` return array, after the `'brand'` rule:

```php
'gender' => ['nullable', 'string', 'in:men,women,unisex'],
```

Full `rules()` method:

```php
public function rules(): array
{
    return [
        'name' => ['sometimes', 'string', 'max:255'],
        'description' => ['nullable', 'string', 'max:10000'],
        'short_description' => ['nullable', 'string', 'max:500'],
        'category_id' => ['sometimes', 'integer', 'exists:categories,id'],
        'base_price' => ['sometimes', 'numeric', 'min:0', 'max:99999999.99'],
        'compare_at_price' => ['nullable', 'numeric', 'min:0', 'max:99999999.99'],
        'sku' => ['sometimes', 'string', 'max:100'],
        'stock_quantity' => ['sometimes', 'integer', 'min:0', 'max:999999'],
        'status' => ['sometimes', 'string', 'in:draft,active,archived'],
        'brand' => ['nullable', 'string', 'max:255'],
        'gender' => ['nullable', 'string', 'in:men,women,unisex'],
        'weight' => ['nullable', 'numeric', 'min:0', 'max:99999.99'],
        'images' => ['nullable', 'array', 'max:10'],
        'images.*' => ['image', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
        'delete_images' => ['nullable', 'array'],
        'delete_images.*' => ['integer', 'exists:product_images,id'],
        'option_categories' => ['nullable', 'array', 'max:5'],
        'option_categories.*.name' => ['required_with:option_categories', 'string', 'max:100'],
        'option_categories.*.values' => ['required_with:option_categories', 'array', 'min:1', 'max:20'],
        'option_categories.*.values.*' => ['string', 'max:100'],
    ];
}
```

- [ ] **Step 3: Commit**

```bash
git add backend/app/Http/Requests/StoreProductRequest.php backend/app/Http/Requests/UpdateProductRequest.php
git commit -m "feat(validation): accept gender field in product form requests"
```

---

## Task 4: Backend Filter — Add `?gender=` Query Param

**Files:**
- Modify: `backend/app/Http/Controllers/ProductController.php:42-75` (`buildProductListing` method)

- [ ] **Step 1: Add gender filter inside `buildProductListing`**

Add the following block after the existing `category` filter (after line 49), before the `featured` filter:

```php
if ($request->filled('gender')) {
    $query->where('gender', $request->input('gender'));
}
```

The full `buildProductListing` method should look like:

```php
private function buildProductListing(Request $request)
{
    $query = Product::where('status', 'active')
        ->with('primaryImage', 'category');

    if ($request->has('category')) {
        $query->whereHas('category', fn ($q) => $q->where('slug', $request->input('category')));
    }

    if ($request->filled('gender')) {
        $query->where('gender', $request->input('gender'));
    }

    if ($request->boolean('featured')) {
        $query->where('is_featured', true);
    }

    if ($request->filled('search')) {
        $searchTerm = $request->input('search');
        $query->where(function ($q) use ($searchTerm) {
            $q->where('name', 'ILIKE', '%' . $searchTerm . '%')
              ->orWhere('description', 'ILIKE', '%' . $searchTerm . '%')
              ->orWhere('brand', 'ILIKE', '%' . $searchTerm . '%');
        });
    }

    $sort = $request->input('sort', 'newest');
    match ($sort) {
        'price_asc' => $query->orderBy('base_price', 'asc'),
        'price_desc' => $query->orderBy('base_price', 'desc'),
        'popular' => $query->orderByDesc('view_count'),
        default => $query->orderByDesc('created_at'),
    };

    $perPage = min((int) $request->input('per_page', 20), 100);
    return ProductResource::collection($query->paginate($perPage));
}
```

- [ ] **Step 2: Manually test the filter via curl or browser**

Start the backend server if not running (`php artisan serve`), then:

```bash
curl "http://localhost:8000/api/products?gender=men" | python -m json.tool | head -40
```

Expected: JSON response with `data` array (may be empty if no products have gender set yet — that is correct).

- [ ] **Step 3: Commit**

```bash
git add backend/app/Http/Controllers/ProductController.php
git commit -m "feat(api): add gender filter to public product listing endpoint"
```

---

## Task 5: Frontend Types — Add `gender` to Product Interface

**Files:**
- Modify: `frontend/src/types/product.ts:15-34`

- [ ] **Step 1: Add `gender` field to the `Product` interface**

In `frontend/src/types/product.ts`, update the `Product` interface to include `gender`:

```typescript
export interface Product {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  short_description: string | null;
  base_price: number;
  compare_at_price: number | null;
  sku: string;
  stock_quantity: number;
  status: 'draft' | 'active' | 'archived';
  brand: string | null;
  gender: 'men' | 'women' | 'unisex' | null;
  is_featured: boolean;
  average_rating: number;
  review_count: number;
  category: Category;
  images: ProductImage[];
  primary_image: ProductImage | null;
  store?: Store | null;
}
```

- [ ] **Step 2: Check TypeScript compiles without errors**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no output (success), or only pre-existing errors unrelated to `gender`.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/types/product.ts
git commit -m "feat(types): add gender field to Product interface"
```

---

## Task 6: Seller Create Form — Add Gender Dropdown

**Files:**
- Modify: `frontend/src/app/business/products/new/page.tsx`

- [ ] **Step 1: Add `gender` state variable**

After the `const [brand, setBrand] = useState('');` line (around line 48), add:

```typescript
const [gender, setGender] = useState('');
```

- [ ] **Step 2: Add `gender` to the formData submission**

In `handleSubmit`, after the `formData.append('brand', brand);` line (around line 167), add:

```typescript
if (gender) formData.append('gender', gender);
```

- [ ] **Step 3: Add gender dropdown to the JSX form**

Find the Brand field section in the JSX (look for the `<label>` with text "Brand" and its `<input>`). Add the gender dropdown **after** the brand field's closing `</div>`:

```tsx
<div>
  <label className="block text-sm font-medium text-gray-700 mb-1.5">
    Gender
  </label>
  <select
    value={gender}
    onChange={(e) => setGender(e.target.value)}
    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-900 focus:ring-2 focus:ring-sari-500/20 focus:border-sari-500 outline-none transition-all duration-200 bg-white"
  >
    <option value="">Not specified</option>
    <option value="men">Men</option>
    <option value="women">Women</option>
    <option value="unisex">Unisex</option>
  </select>
</div>
```

- [ ] **Step 4: Verify the page compiles**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no new TypeScript errors.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/business/products/new/page.tsx
git commit -m "feat(ui): add gender dropdown to seller product create form"
```

---

## Task 7: Seller Edit Form — Add Gender Dropdown

**Files:**
- Modify: `frontend/src/app/business/products/[id]/edit/page.tsx`

- [ ] **Step 1: Add `gender` state variable**

After `const [brand, setBrand] = useState('');` (around line 67), add:

```typescript
const [gender, setGender] = useState('');
```

- [ ] **Step 2: Populate gender state when product data loads**

In the `useEffect` that fetches and populates the product (look for where `setBrand(product.brand || '')` is called), add:

```typescript
setGender(product.gender || '');
```

- [ ] **Step 3: Add `gender` to the update formData**

In the submit handler, after the line that appends `brand`, add:

```typescript
if (gender) formData.append('gender', gender);
```

- [ ] **Step 4: Add gender dropdown to the JSX form**

In the same location as the create form (after the brand field), add:

```tsx
<div>
  <label className="block text-sm font-medium text-gray-700 mb-1.5">
    Gender
  </label>
  <select
    value={gender}
    onChange={(e) => setGender(e.target.value)}
    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-900 focus:ring-2 focus:ring-sari-500/20 focus:border-sari-500 outline-none transition-all duration-200 bg-white"
  >
    <option value="">Not specified</option>
    <option value="men">Men</option>
    <option value="women">Women</option>
    <option value="unisex">Unisex</option>
  </select>
</div>
```

- [ ] **Step 5: Verify the page compiles**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no new TypeScript errors.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/app/business/products/[id]/edit/page.tsx
git commit -m "feat(ui): add gender dropdown to seller product edit form"
```

---

## Task 8: Buyer Sidebar — Add Gender Filter Section

**Files:**
- Modify: `frontend/src/components/SidebarFilter.tsx`

- [ ] **Step 1: Add `activeGender` and `onGenderChange` to the props interface**

Replace the `SidebarFilterProps` interface (lines 25–34):

```typescript
interface SidebarFilterProps {
  activeCategory: string;
  onCategoryChange: (slug: string) => void;
  activeGender: string;
  onGenderChange: (value: string) => void;
  sortBy: string;
  onSortChange: (value: string) => void;
  priceRange: [number, number];
  onPriceRangeChange: (range: [number, number]) => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}
```

- [ ] **Step 2: Destructure new props in the component function**

Replace the destructuring in the function signature (lines 36–45):

```typescript
export default function SidebarFilter({
  activeCategory,
  onCategoryChange,
  activeGender,
  onGenderChange,
  sortBy,
  onSortChange,
  priceRange,
  onPriceRangeChange,
  mobileOpen = false,
  onMobileClose,
}: SidebarFilterProps) {
```

- [ ] **Step 3: Add `gender` to the `expandedSections` state**

Replace the `expandedSections` state (lines 46–50):

```typescript
const [expandedSections, setExpandedSections] = useState({
  category: true,
  gender: true,
  price: true,
  sort: true,
});
```

- [ ] **Step 4: Add the Gender filter section JSX**

Add this block after the closing `</div>` of the Category section (after line 127), before the Price Range section:

```tsx
{/* Gender Section */}
<div className="pt-4">
  <button
    onClick={() => toggleSection('gender')}
    className="flex items-center justify-between w-full text-left group"
  >
    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
      Gender
    </span>
    <ChevronDown
      className={cn(
        'w-4 h-4 text-gray-400 transition-transform duration-200',
        expandedSections.gender && 'rotate-180',
      )}
    />
  </button>
  {expandedSections.gender && (
    <ul className="mt-3 space-y-0.5">
      {[
        { label: 'All', value: '' },
        { label: 'Men', value: 'men' },
        { label: 'Women', value: 'women' },
        { label: 'Unisex', value: 'unisex' },
      ].map((opt) => (
        <li key={opt.value}>
          <button
            onClick={() => onGenderChange(opt.value)}
            className={cn(
              'flex items-center justify-between w-full px-3 py-2 rounded-lg text-sm transition-all duration-150',
              activeGender === opt.value
                ? 'bg-sari-50 text-sari-700 font-medium'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
            )}
          >
            <span className="flex items-center gap-2">
              {activeGender === opt.value && (
                <span className="w-1.5 h-1.5 rounded-full bg-sari-500" />
              )}
              {opt.label}
            </span>
          </button>
        </li>
      ))}
    </ul>
  )}
</div>
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/SidebarFilter.tsx
git commit -m "feat(ui): add gender filter section to buyer sidebar"
```

---

## Task 9: Products Page — Wire Gender Filter State

**Files:**
- Modify: `frontend/src/app/products/page.tsx`

- [ ] **Step 1: Add `activeGender` state**

In the products page, after the `const [activeCategory, setActiveCategory] = useState('all');` line, add:

```typescript
const [activeGender, setActiveGender] = useState('');
```

- [ ] **Step 2: Add gender to the API params**

In the function that builds the API request params (where `params.category = activeCategory` is set), add:

```typescript
if (activeGender) params.gender = activeGender;
```

- [ ] **Step 3: Reset gender when category changes (and vice versa if desired)**

This is optional UX — skip for now. Filters are independent.

- [ ] **Step 4: Pass `activeGender` and `onGenderChange` to `SidebarFilter`**

Find where `<SidebarFilter` is rendered and add the two new props:

```tsx
<SidebarFilter
  activeCategory={activeCategory}
  onCategoryChange={setActiveCategory}
  activeGender={activeGender}
  onGenderChange={setActiveGender}
  sortBy={sortBy}
  onSortChange={setSortBy}
  priceRange={priceRange}
  onPriceRangeChange={setPriceRange}
  mobileOpen={mobileOpen}
  onMobileClose={() => setMobileOpen(false)}
/>
```

- [ ] **Step 5: Verify TypeScript compilation**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no new errors.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/app/products/page.tsx
git commit -m "feat(ui): wire gender filter state and API param on products page"
```

---

## Task 10: Dashboard — Make Recent Orders Clickable

**Files:**
- Modify: `frontend/src/app/business/dashboard/page.tsx:323-357`

- [ ] **Step 1: Verify `Link` is already imported**

At the top of `frontend/src/app/business/dashboard/page.tsx`, confirm `Link` is imported from `'next/link'`. If not, add it:

```typescript
import Link from 'next/link';
```

- [ ] **Step 2: Replace the `<div>` order row with a `<Link>`**

In the `recentOrders.map(...)` block (lines 323–358), replace the outer `<div>` with a `<Link>`:

**Before:**
```tsx
recentOrders.map((order) => (
  <div
    key={order.order_number}
    className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-gray-50/50"
  >
```

**After:**
```tsx
recentOrders.map((order) => (
  <Link
    key={order.order_number}
    href={`/business/orders/${order.id}`}
    className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-gray-50/50 hover:cursor-pointer"
  >
```

And close with `</Link>` instead of `</div>`.

- [ ] **Step 3: Verify the dashboard page type-checks**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no new errors. If `order.id` causes a type error, check the order type used in the dashboard and ensure `id: number` is present.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/app/business/dashboard/page.tsx
git commit -m "feat(ui): make recent order rows clickable in seller dashboard"
```

---

## Task 11: Smoke Test Both Features

- [ ] **Step 1: Start both servers**

```bash
# Terminal 1
cd backend && php artisan serve

# Terminal 2
cd frontend && npm run dev
```

- [ ] **Step 2: Test clickable dashboard orders**

1. Log in as a business user
2. Navigate to `/business/dashboard`
3. Click any row in "Recent Orders"
4. Verify you land on `/business/orders/{id}` showing the correct order detail

- [ ] **Step 3: Test gender filter on buyer side**

1. Log in or browse as a buyer to `/products`
2. Verify a "Gender" section appears in the sidebar
3. Click "Men" — verify the URL updates to include `?gender=men` and the product list refreshes
4. Click "All" — verify gender param is removed and all products show

- [ ] **Step 4: Test gender field in seller product form**

1. Navigate to `/business/products/new`
2. Verify a "Gender" dropdown appears after the Brand field
3. Select "Women", fill all required fields, submit
4. Navigate to the created product's edit page
5. Verify the Gender dropdown pre-selects "Women"

- [ ] **Step 5: Final commit if any last fixes were needed**

```bash
git add -p
git commit -m "fix: smoke test corrections"
```
