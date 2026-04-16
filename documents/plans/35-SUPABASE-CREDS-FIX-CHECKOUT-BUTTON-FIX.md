# Module 35 — Supabase S3 Credentials Fix & Checkout Button Fix

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **IMPORTANT:** Use the `superpowers` plugin skills throughout execution (`superpowers:systematic-debugging`, `superpowers:verification-before-completion`).
> Use the `frontend-design` plugin skill for all frontend/UI work (form validation states, error banners, inline field errors).

**Goal:** Fix product image uploads by correcting invalid Supabase S3 credentials, and fix the checkout button so orders can be placed on all payment paths (COD, card, QR PH).

**Architecture:** Two independent bugs. Bug 1 is a misconfigured `.env` — the `SUPABASE_ACCESS_KEY` is a Personal Access Token (`sbp_…`), not an S3 key. Bug 2 is a checkout UX/validation problem: the backend requires `state` and `postal_code` but the frontend submits without checking them, the error surfaces silently at the top of a long page the user may have scrolled past.

**Tech Stack:** Laravel 12 (backend), Next.js 15 App Router (frontend), Supabase Storage S3 API, PayMongo, Tailwind CSS v4

---

## File Map

| File | Change |
|------|--------|
| `backend/.env` | Replace `SUPABASE_ACCESS_KEY` / `SUPABASE_SECRET_KEY` with correct S3 key pair |
| `frontend/src/app/checkout/page.tsx` | Add client-side form validation, scroll-to-error, inline field error messages |

---

## Task 1: Fix Supabase S3 Credentials

### Problem

`backend/.env` line 69–70:
```
SUPABASE_ACCESS_KEY=REDACTED_SUPABASE_PAT
SUPABASE_SECRET_KEY=REDACTED_SUPABASE_SECRET
```

The `sbp_…` value is a **Supabase Personal Access Token** (used for the Management API). S3-compatible storage requires a separate **S3 Access Key pair** — a short alphanumeric Access Key ID and a secret. Using a PAT triggers `InvalidAccessKeyId` from AWS-compatible S3 clients.

### Root Cause

Wrong credential type was placed in `.env`. The S3 credentials must come from **Supabase Dashboard → Storage → S3 Access Keys**, not from Account Settings → Access Tokens.

### Fix Steps

- [ ] **Step 1: Get S3 Access Keys from the Supabase Dashboard**

  1. Open your Supabase project: `https://supabase.com/dashboard/project/sglapvdokkfrlcdwpywf`
  2. In the left sidebar, click **Storage**
  3. Click the **S3 Access Keys** tab (or look for "S3 Connection" under Settings)
  4. If no keys exist, click **Generate new access key**
  5. Copy the **Access Key ID** (looks like: `[alphanumeric, ~20 chars]`)
  6. Copy the **Secret Access Key** (looks like: `[alphanumeric, ~40 chars]`)

  > **Note:** The secret is only shown once. Store it securely before closing the modal.

- [ ] **Step 2: Update `backend/.env`**

  Replace lines 69–70 with the values from Step 1:

  ```dotenv
  SUPABASE_ACCESS_KEY=<paste-access-key-id-here>
  SUPABASE_SECRET_KEY=<paste-secret-access-key-here>
  ```

  Leave all other Supabase variables unchanged:
  ```dotenv
  SUPABASE_URL=https://sglapvdokkfrlcdwpywf.supabase.co
  SUPABASE_BUCKET_NAME=product-images
  SUPABASE_REGION=ap-southeast-1
  SUPABASE_ENDPOINT=https://sglapvdokkfrlcdwpywf.storage.supabase.co/storage/v1/s3
  SUPABASE_PUBLIC_URL=https://sglapvdokkfrlcdwpywf.supabase.co/storage/v1/object/public/product-images
  ```

- [ ] **Step 3: Clear Laravel config cache**

  Run this in the `backend/` directory:
  ```bash
  php artisan config:clear
  php artisan cache:clear
  ```

  Expected output:
  ```
  Configuration cache cleared successfully.
  Application cache cleared successfully.
  ```

- [ ] **Step 4: Verify the S3 connection with a smoke test**

  Run this Tinker command from the `backend/` directory:
  ```bash
  php artisan tinker
  ```
  Then paste:
  ```php
  Storage::disk('supabase')->put('test/ping.txt', 'ok');
  echo Storage::disk('supabase')->exists('test/ping.txt') ? "SUCCESS" : "FAIL";
  Storage::disk('supabase')->delete('test/ping.txt');
  ```

  Expected output: `SUCCESS`

  If you see `InvalidAccessKeyId` again, double-check that the key in `.env` is the S3 key (short alphanumeric), not the PAT (`sbp_…`).

- [ ] **Step 5: Manually test product image upload**

  1. Open the admin panel (or product create form) in the browser
  2. Add a new product with an image
  3. Confirm the image uploads without error and the product page shows the image

- [ ] **Step 6: Commit**

  ```bash
  # DO NOT commit .env — it contains secrets
  # This task requires no code change, only env update
  # Only commit if you added any helper code; otherwise skip this step
  git add backend/app/Services/ImageService.php
  git commit -m "fix: document S3 key requirement in ImageService"
  ```

---

## Task 2: Fix Checkout Button — Form Validation & Error Visibility

### Problem

**Use `superpowers:systematic-debugging` before implementing.**

The checkout button calls `handlePlaceOrder` which submits to `POST /api/checkout`. The backend (`CheckoutRequest`) marks these fields as **required**:
- `shipping_address.state` (maps to the `province` form field)
- `shipping_address.postal_code` (maps to the `zip` form field)

When the user submits without filling these in, the backend returns HTTP 422. The frontend catches the error and calls `setError(message)`, which renders a red banner — but it renders **at the top of the page**. If the user is scrolled down to the Place Order button, the banner is invisible. The user sees the loading spinner appear and disappear, with no visible feedback → "nothing happens."

For COD, this is the only issue. For card/QR PH, there is an additional PayMongo call — if that call also fails silently (e.g. expired test key), the same invisible-error UX applies.

### Fix Plan

**Use `frontend-design:frontend-design` when implementing the UI changes below.**

- [ ] **Step 1: Add a `formErrors` state and a `validateForm()` helper to `CheckoutContent`**

  In `frontend/src/app/checkout/page.tsx`, inside `CheckoutContent`, add after the existing `useState` declarations:

  ```tsx
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!form.fullName.trim()) errors.fullName = 'Full name is required';
    if (!form.phone.trim()) errors.phone = 'Phone number is required';
    if (!form.address1.trim()) errors.address1 = 'Address is required';
    if (!form.city.trim()) errors.city = 'City is required';
    if (!form.province.trim()) errors.province = 'Province / State is required';
    if (!form.zip.trim()) errors.zip = 'Zip / Postal code is required';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };
  ```

- [ ] **Step 2: Run validateForm before submitting in `handlePlaceOrder`**

  Find the existing `handlePlaceOrder` function (around line 203). At the very top of the function body, add:

  ```tsx
  const handlePlaceOrder = async () => {
    if (!validateForm()) {
      // Scroll to the first visible field error
      const firstErrorEl = document.querySelector('[data-field-error]');
      firstErrorEl?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    setError('');
    setSubmitting(true);
    // ... rest of existing code unchanged ...
  ```

- [ ] **Step 3: Clear field errors on input change**

  Replace `updateForm` with a version that clears the per-field error:

  ```tsx
  const updateForm = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };
  ```

- [ ] **Step 4: Add inline error messages below each required input**

  **Use `frontend-design:frontend-design` for this step.**

  In the Shipping Information `<section>`, add a helper component just above the `return` statement of `CheckoutContent`:

  ```tsx
  const FieldError = ({ field }: { field: string }) =>
    formErrors[field] ? (
      <p data-field-error className="mt-1 text-xs text-red-500">
        {formErrors[field]}
      </p>
    ) : null;
  ```

  Then, after each required input, add `<FieldError field="fieldName" />`. The full updated grid inside the Shipping section:

  ```tsx
  <div className="sm:col-span-1">
    <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
    <input
      type="text"
      value={form.fullName}
      onChange={(e) => updateForm('fullName', e.target.value)}
      placeholder="Juan Dela Cruz"
      className={cn(
        'w-full px-4 py-3 rounded-xl border text-sm text-gray-900 placeholder:text-gray-300 focus:ring-2 focus:ring-sari-500/20 focus:border-sari-500 outline-none transition-all duration-200',
        formErrors.fullName ? 'border-red-400 bg-red-50/30' : 'border-gray-200',
      )}
    />
    <FieldError field="fullName" />
  </div>

  <div className="sm:col-span-1">
    <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone Number</label>
    <input
      type="tel"
      inputMode="numeric"
      pattern="[0-9+]*"
      value={form.phone}
      onChange={(e) => {
        const numericOnly = e.target.value.replace(/[^0-9+]/g, '');
        updateForm('phone', numericOnly);
      }}
      placeholder="09123456789"
      className={cn(
        'w-full px-4 py-3 rounded-xl border text-sm text-gray-900 placeholder:text-gray-300 focus:ring-2 focus:ring-sari-500/20 focus:border-sari-500 outline-none transition-all duration-200',
        formErrors.phone ? 'border-red-400 bg-red-50/30' : 'border-gray-200',
      )}
    />
    <FieldError field="phone" />
  </div>

  <div className="sm:col-span-2">
    <label className="block text-sm font-medium text-gray-700 mb-1.5">Address Line 1</label>
    <div className="relative">
      <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
      <input
        type="text"
        value={form.address1}
        onChange={(e) => updateForm('address1', e.target.value)}
        placeholder="House/Unit No., Street, Barangay"
        className={cn(
          'w-full pl-10 pr-4 py-3 rounded-xl border text-sm text-gray-900 placeholder:text-gray-300 focus:ring-2 focus:ring-sari-500/20 focus:border-sari-500 outline-none transition-all duration-200',
          formErrors.address1 ? 'border-red-400 bg-red-50/30' : 'border-gray-200',
        )}
      />
    </div>
    <FieldError field="address1" />
  </div>

  <div className="sm:col-span-2">
    <label className="block text-sm font-medium text-gray-700 mb-1.5">
      Address Line 2 <span className="text-gray-300 font-normal">(Optional)</span>
    </label>
    <input
      type="text"
      value={form.address2}
      onChange={(e) => updateForm('address2', e.target.value)}
      placeholder="Building, Floor, Landmark"
      className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder:text-gray-300 focus:ring-2 focus:ring-sari-500/20 focus:border-sari-500 outline-none transition-all duration-200"
    />
  </div>

  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1.5">City</label>
    <input
      type="text"
      value={form.city}
      onChange={(e) => updateForm('city', e.target.value)}
      placeholder="Quezon City"
      className={cn(
        'w-full px-4 py-3 rounded-xl border text-sm text-gray-900 placeholder:text-gray-300 focus:ring-2 focus:ring-sari-500/20 focus:border-sari-500 outline-none transition-all duration-200',
        formErrors.city ? 'border-red-400 bg-red-50/30' : 'border-gray-200',
      )}
    />
    <FieldError field="city" />
  </div>

  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1.5">Province</label>
    <input
      type="text"
      value={form.province}
      onChange={(e) => updateForm('province', e.target.value)}
      placeholder="Metro Manila"
      className={cn(
        'w-full px-4 py-3 rounded-xl border text-sm text-gray-900 placeholder:text-gray-300 focus:ring-2 focus:ring-sari-500/20 focus:border-sari-500 outline-none transition-all duration-200',
        formErrors.province ? 'border-red-400 bg-red-50/30' : 'border-gray-200',
      )}
    />
    <FieldError field="province" />
  </div>

  <div className="sm:col-span-1">
    <label className="block text-sm font-medium text-gray-700 mb-1.5">Zip Code</label>
    <input
      type="text"
      value={form.zip}
      onChange={(e) => updateForm('zip', e.target.value)}
      placeholder="1100"
      className={cn(
        'w-full px-4 py-3 rounded-xl border text-sm text-gray-900 placeholder:text-gray-300 focus:ring-2 focus:ring-sari-500/20 focus:border-sari-500 outline-none transition-all duration-200',
        formErrors.zip ? 'border-red-400 bg-red-50/30' : 'border-gray-200',
      )}
    />
    <FieldError field="zip" />
  </div>
  ```

- [ ] **Step 5: Make the backend error banner scroll into view automatically**

  Find the `catch` block inside `handlePlaceOrder` (around line 244). After `setError(...)`, scroll to the error banner:

  ```tsx
  } catch (err: any) {
    const message = err.response?.data?.message || err.response?.data?.error || 'Failed to place order. Please try again.';
    setError(message);
    // Scroll to the top-of-page error banner so the user sees it
    setTimeout(() => {
      document.querySelector('[data-checkout-error]')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 50);
  } finally {
    setSubmitting(false);
  }
  ```

  Then add the `data-checkout-error` attribute to the existing error `<div>` (around line 316):

  ```tsx
  {error && (
    <div
      data-checkout-error
      className="mb-6 bg-red-50 text-red-600 text-sm rounded-xl p-4 border border-red-100 animate-fade-in"
    >
      {error}
    </div>
  )}
  ```

- [ ] **Step 6: Start the dev server and test the checkout flow manually**

  ```bash
  cd frontend && npm run dev
  ```

  Test these scenarios in the browser at `http://localhost:3000/checkout`:

  | Scenario | Expected result |
  |----------|-----------------|
  | Click "Place Order" with all fields empty | Red border on all required fields, scroll to first error |
  | Fill all fields, select COD, click "Place Order" | Order created, redirect to `/checkout/success` |
  | Fill all fields, select QR PH, click "Place Order" | Redirect to PayMongo checkout page |
  | Fill all fields, select Card, click "Place Order" | Redirect to PayMongo checkout page |
  | PayMongo returns error (invalid key) | Red error banner appears AND page scrolls to it |

  If COD succeeds but card/QR PH fails with a PayMongo error in the logs, check `backend/storage/logs/laravel.log` for the PayMongo response body. The test keys in `.env` (`REDACTED_PAYMONGO_TEST_KEY`) may be expired — if so, generate fresh keys at `https://dashboard.paymongo.com/developers`.

- [ ] **Step 7: Commit**

  ```bash
  git add frontend/src/app/checkout/page.tsx
  git commit -m "fix: add checkout form validation and scroll-to-error for better UX"
  ```

---

## Task 3: Update Plan Index

- [ ] **Step 1: Add Module 35 to `documents/plans/00-PLAN-INDEX.md`**

  Append this line under the existing module list:

  ```markdown
  | 35 | Supabase S3 Credentials Fix & Checkout Button Fix | Completed |
  ```

- [ ] **Step 2: Commit**

  ```bash
  git add documents/plans/00-PLAN-INDEX.md documents/plans/35-SUPABASE-CREDS-FIX-CHECKOUT-BUTTON-FIX.md
  git commit -m "docs: add Module 35 plan — Supabase creds fix and checkout button fix"
  ```

---

## Self-Review

### Spec coverage

| Issue | Task covering it |
|-------|-----------------|
| `InvalidAccessKeyId` on product image upload | Task 1 (correct S3 key type from Supabase Storage dashboard) |
| Nothing happens on checkout button (all payment methods) | Task 2 (client-side validation, scroll-to-error, field highlights) |
| Silent error when PayMongo call fails | Task 2, Step 5 (scroll backend error into view) |

### Placeholder scan

No TBDs, TODOs, or "implement later" phrases. All code blocks are complete and immediately usable.

### Type consistency

- `formErrors` is `Record<string, string>` — used consistently in `FieldError`, `validateForm`, `updateForm`, and class conditionals.
- `FieldError` receives `field: string` — matches the string keys of `form` state.
- No method name conflicts with existing code.
