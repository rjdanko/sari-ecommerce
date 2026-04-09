# Checkout Fix & Phone Validation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the PostgreSQL `orders_status_check` constraint violation that blocks checkout, and enforce numeric-only input on all phone number fields across the platform.

**Architecture:** A new database migration will alter the `status` enum on the `orders` table to include `pending_confirmation` and `confirmed` values — the two statuses already used by `CheckoutController` and `OrderController` but missing from the original schema. Phone number validation will be enforced at three layers: frontend input masking (strip non-digits on change), backend request validation (regex rule), and a shared utility for consistent sanitisation.

**Tech Stack:** Laravel 11 (PHP 8.2), Next.js 14 (React/TypeScript), PostgreSQL (Supabase)

---

## Root Cause Analysis

### Issue 1: `orders_status_check` Constraint Violation

The error:
```
SQLSTATE[23514]: Check violation: 7 ERROR: new row for relation "orders" violates check constraint "orders_status_check"
```

**What happened:**
- Migration `0006_create_orders_table.php` defines the `status` column as:
  ```php
  $table->enum('status', [
      'pending', 'processing', 'paid', 'shipped',
      'delivered', 'cancelled', 'refunded',
  ])->default('pending');
  ```
- In PostgreSQL, Laravel's `enum()` creates a **CHECK constraint** (`orders_status_check`) that restricts values to ONLY the listed values.
- `CheckoutController.php` line 65 inserts `'status' => 'pending_confirmation'` — a value NOT in the enum.
- `OrderController.php` lines 59, 78 reference `'pending_confirmation'`; line 64 references `'confirmed'` — also not in the enum.
- Migration `0015` added `confirmed_at` / `cancelled_at` timestamp columns but **never updated the status enum** to include the new statuses.

### Issue 2: Phone Number Accepts Text

All phone number input fields across the application accept arbitrary text. There is no numeric-only enforcement on:
- **Checkout page** (`frontend/src/app/checkout/page.tsx` line 277)
- **Profile page** (`frontend/src/app/profile/page.tsx` line 217)
- **Business store page** (`frontend/src/app/business/store/page.tsx` line 183)
- **Backend validation** (`CheckoutRequest.php` line 19 — uses generic `'string'` rule)

---

## Proposed Changes

### Task 1: Fix the Orders Status Enum (Database Migration)

> Use the **superpowers plugin** to execute this task.

**Files:**
- Create: `backend/database/migrations/0016_update_orders_status_enum.php`

This migration will alter the PostgreSQL CHECK constraint on `orders.status` to include all valid statuses used by the application. Since PostgreSQL does not support `ALTER TYPE ... ADD VALUE` for inline check constraints, we must drop and recreate the constraint.

- [ ] **Step 1: Create the migration file**

  Create `backend/database/migrations/0016_update_orders_status_enum.php`:

  ```php
  <?php

  use Illuminate\Database\Migrations\Migration;
  use Illuminate\Support\Facades\DB;

  return new class extends Migration
  {
      public function up(): void
      {
          // Drop the existing CHECK constraint created by Laravel's enum()
          DB::statement('ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check');

          // Recreate with all valid statuses including 'pending_confirmation' and 'confirmed'
          DB::statement("ALTER TABLE orders ADD CONSTRAINT orders_status_check CHECK (status::text = ANY (ARRAY['pending'::text, 'pending_confirmation'::text, 'confirmed'::text, 'processing'::text, 'paid'::text, 'shipped'::text, 'delivered'::text, 'cancelled'::text, 'refunded'::text]))");
      }

      public function down(): void
      {
          DB::statement('ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check');

          DB::statement("ALTER TABLE orders ADD CONSTRAINT orders_status_check CHECK (status::text = ANY (ARRAY['pending'::text, 'processing'::text, 'paid'::text, 'shipped'::text, 'delivered'::text, 'cancelled'::text, 'refunded'::text]))");
      }
  };
  ```

- [ ] **Step 2: Run the migration**

  ```bash
  cd backend
  php artisan migrate
  ```
  
  Expected: Migration runs successfully, constraint is updated.

- [ ] **Step 3: Verify the fix by testing checkout**

  Attempt a checkout through the frontend. The `pending_confirmation` status should now be accepted by PostgreSQL.

- [ ] **Step 4: Commit**

  ```bash
  git add backend/database/migrations/0016_update_orders_status_enum.php
  git commit -m "fix: add pending_confirmation and confirmed to orders status enum"
  ```

---

### Task 2: Add Phone Number Validation — Backend

> Use the **superpowers plugin** to execute this task.

**Files:**
- Modify: `backend/app/Http/Requests/CheckoutRequest.php` (line 19)

Add a `regex` rule to the phone field in CheckoutRequest to only allow digits, plus sign, spaces, and hyphens (standard phone number characters), then strip non-numeric characters before persisting.

- [ ] **Step 1: Update CheckoutRequest validation rule**

  In `backend/app/Http/Requests/CheckoutRequest.php`, change line 19 from:
  ```php
  'shipping_address.phone' => ['nullable', 'string', 'max:20'],
  ```
  to:
  ```php
  'shipping_address.phone' => ['nullable', 'string', 'max:20', 'regex:/^[0-9+\-\s()]*$/'],
  ```

  This allows only digits, `+`, `-`, spaces, and parentheses — standard phone formatting characters.

- [ ] **Step 2: Add a `prepareForValidation` method to strip non-numeric characters**

  In `backend/app/Http/Requests/CheckoutRequest.php`, add after the `rules()` method:

  ```php
  protected function prepareForValidation(): void
  {
      if ($this->has('shipping_address.phone')) {
          $address = $this->input('shipping_address');
          if (isset($address['phone'])) {
              $address['phone'] = preg_replace('/[^0-9+]/', '', $address['phone']);
              $this->merge(['shipping_address' => $address]);
          }
      }
  }
  ```

  This sanitizes the phone number to digits and `+` before validation and storage.

- [ ] **Step 3: Commit**

  ```bash
  git add backend/app/Http/Requests/CheckoutRequest.php
  git commit -m "fix: add phone number validation and sanitisation to checkout"
  ```

---

### Task 3: Add Phone Number Validation — Frontend (Checkout Page)

> Use the **frontend-design plugin** for this design-related component change.

**Files:**
- Modify: `frontend/src/app/checkout/page.tsx` (lines 105-107, 274-280)

Replace the phone input's `onChange` handler to strip non-numeric characters (except `+`) in real-time as the user types. This gives immediate visual feedback that only numbers are allowed.

- [ ] **Step 1: Update the `updateForm` call for the phone field**

  In `frontend/src/app/checkout/page.tsx`, change line 277 from:
  ```tsx
  onChange={(e) => updateForm('phone', e.target.value)}
  ```
  to:
  ```tsx
  onChange={(e) => {
    // Strip all non-numeric characters except + (for country code)
    const numericOnly = e.target.value.replace(/[^0-9+]/g, '');
    updateForm('phone', numericOnly);
  }}
  ```

- [ ] **Step 2: Add input attributes for mobile UX**

  On the same `<input>` element, add `inputMode="numeric"` and `pattern="[0-9+]*"` to show a numeric keyboard on mobile devices:
  ```tsx
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
    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder:text-gray-300 focus:ring-2 focus:ring-sari-500/20 focus:border-sari-500 outline-none transition-all duration-200"
  />
  ```

- [ ] **Step 3: Commit**

  ```bash
  git add frontend/src/app/checkout/page.tsx
  git commit -m "fix: enforce numeric-only phone input on checkout page"
  ```

---

### Task 4: Add Phone Number Validation — Frontend (Profile Page)

> Use the **frontend-design plugin** for this design-related component change.

**Files:**
- Modify: `frontend/src/app/profile/page.tsx` (lines 213-221)

Apply the same numeric-only phone input pattern to the profile edit form.

- [ ] **Step 1: Update the phone input `onChange` handler**

  In `frontend/src/app/profile/page.tsx`, change line 216-217 from:
  ```tsx
  onChange={(e) =>
    setPersonalForm((prev) => ({ ...prev, phone: e.target.value }))
  }
  ```
  to:
  ```tsx
  onChange={(e) => {
    const numericOnly = e.target.value.replace(/[^0-9+]/g, '');
    setPersonalForm((prev) => ({ ...prev, phone: numericOnly }));
  }}
  ```

- [ ] **Step 2: Add `inputMode` and `pattern` attributes**

  Update the same `<input>` element to include mobile-friendly attributes:
  ```tsx
  <input
    type="tel"
    inputMode="numeric"
    pattern="[0-9+]*"
    value={personalForm.phone}
    onChange={(e) => {
      const numericOnly = e.target.value.replace(/[^0-9+]/g, '');
      setPersonalForm((prev) => ({ ...prev, phone: numericOnly }));
    }}
    placeholder="09123456789"
    className={inputClass}
  />
  ```

- [ ] **Step 3: Commit**

  ```bash
  git add frontend/src/app/profile/page.tsx
  git commit -m "fix: enforce numeric-only phone input on profile page"
  ```

---

### Task 5: Add Phone Number Validation — Frontend (Business Store Page)

> Use the **frontend-design plugin** for this design-related component change.

**Files:**
- Modify: `frontend/src/app/business/store/page.tsx` (lines 180-187)

Apply the same numeric-only phone input pattern to the business store settings form.

- [ ] **Step 1: Update the phone input `onChange` handler**

  In `frontend/src/app/business/store/page.tsx`, change line 183 from:
  ```tsx
  onChange={(e) => setPhone(e.target.value)}
  ```
  to:
  ```tsx
  onChange={(e) => {
    const numericOnly = e.target.value.replace(/[^0-9+]/g, '');
    setPhone(numericOnly);
  }}
  ```

- [ ] **Step 2: Update the input type and add mobile attributes**

  Change line 181 `type="text"` to `type="tel"` and add mobile-friendly attributes:
  ```tsx
  <input
    type="tel"
    inputMode="numeric"
    pattern="[0-9+]*"
    value={phone}
    onChange={(e) => {
      const numericOnly = e.target.value.replace(/[^0-9+]/g, '');
      setPhone(numericOnly);
    }}
    maxLength={20}
    placeholder="09123456789"
    className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-sari-400 focus:outline-none focus:ring-2 focus:ring-sari-100 transition-colors"
  />
  ```

- [ ] **Step 3: Commit**

  ```bash
  git add frontend/src/app/business/store/page.tsx
  git commit -m "fix: enforce numeric-only phone input on business store page"
  ```

---

## File Change Summary

| File | Action | Description |
|------|--------|-------------|
| `backend/database/migrations/0016_update_orders_status_enum.php` | **CREATE** | New migration to add `pending_confirmation` and `confirmed` to the orders status enum CHECK constraint |
| `backend/app/Http/Requests/CheckoutRequest.php` | **MODIFY** | Add regex validation rule and `prepareForValidation()` sanitisation for phone numbers |
| `frontend/src/app/checkout/page.tsx` | **MODIFY** | Add numeric-only filtering on phone `onChange`, add `inputMode="numeric"` |
| `frontend/src/app/profile/page.tsx` | **MODIFY** | Add numeric-only filtering on phone `onChange`, add `inputMode="numeric"` |
| `frontend/src/app/business/store/page.tsx` | **MODIFY** | Add numeric-only filtering on phone `onChange`, change to `type="tel"`, add `inputMode="numeric"` |

## Verification Plan

### Automated Tests
1. Run `php artisan migrate` — migration should succeed without error
2. Attempt a checkout via the frontend — order should be created successfully with `status = 'pending_confirmation'`
3. Test phone fields on all three pages by typing letters — only digits and `+` should appear

### Manual Verification
1. Place a test order via the checkout page — verify no constraint violation error
2. Type `abc123def` into a phone field — verify only `123` appears
3. Confirm business store phone field and profile phone field both reject non-numeric input
4. Test on a mobile device or mobile emulator — verify numeric keyboard appears for phone inputs
