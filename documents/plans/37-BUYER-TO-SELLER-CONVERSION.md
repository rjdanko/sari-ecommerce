# Buyer → Seller Conversion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a buyer (role `user`, including Google-OAuth users) convert their existing account into a seller account and create their shop in a single 3-step wizard, without creating a second account.

**Architecture:** A new dedicated endpoint `POST /api/user/become-seller` (under `auth:sanctum`, outside the `role:business` group) atomically assigns the `business` role and creates the `Store` row inside a DB transaction. The frontend delivers the action via a new `/become-seller` route rendering a 3-step wizard, reachable from a card on the profile page and a dropdown item in the navbar (both visible only to users with the `user` role). Both the backend endpoint and the wizard route guard against double-conversion by users who already have `business` or `admin` roles.

**Tech Stack:** Laravel 11 (PHP 8.3), Spatie Permission (`HasRoles`), Sanctum auth, PHPUnit/Pest feature tests, Next.js 15 App Router, React, TypeScript, Tailwind CSS, Lucide React icons, `frontend-design:frontend-design` skill when polishing UI surfaces.

**Spec:** [2026-04-22-buyer-to-seller-conversion-design.md](../specs/2026-04-22-buyer-to-seller-conversion-design.md)

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `backend/app/Http/Requests/BecomeSellerRequest.php` | Create | Validation rules mirroring `StoreController::store` |
| `backend/app/Http/Controllers/BecomeSellerController.php` | Create | Single-action `__invoke` controller; atomic role-upgrade + store creation |
| `backend/routes/api.php` | Modify | Register `POST /user/become-seller` inside the `auth:sanctum` group (outside `role:business`) |
| `backend/tests/Feature/BecomeSellerTest.php` | Create | Feature tests for all documented cases |
| `frontend/src/components/seller/BecomeSellerWizard.tsx` | Create | 3-step wizard client component with form state, step navigation, and submit logic |
| `frontend/src/app/become-seller/page.tsx` | Create | Route page; auth + role guard; renders the wizard |
| `frontend/src/app/profile/page.tsx` | Modify | Add "Become a Seller" card in right column for buyers only |
| `frontend/src/components/layout/Navbar.tsx` | Modify | Add "Sell on SARI" link in user dropdown for buyers only |

---

## Task 1 — Backend: FormRequest + Controller + Route (happy path)

**Files:**
- Create: `backend/app/Http/Requests/BecomeSellerRequest.php`
- Create: `backend/app/Http/Controllers/BecomeSellerController.php`
- Modify: `backend/routes/api.php`
- Create: `backend/tests/Feature/BecomeSellerTest.php`

- [ ] **Step 1.1: Write the failing happy-path test**

Create `backend/tests/Feature/BecomeSellerTest.php`:

```php
<?php

namespace Tests\Feature;

use App\Enums\RoleEnum;
use App\Models\Store;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class BecomeSellerTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(\Database\Seeders\RoleSeeder::class);
    }

    #[Test]
    public function a_buyer_can_convert_to_seller_and_create_a_store(): void
    {
        $user = User::factory()->create();
        $user->assignRole(RoleEnum::USER->value);

        $response = $this->actingAs($user)->postJson('/api/user/become-seller', [
            'name' => 'Corner Sari-Sari Store',
            'description' => 'Best neighborhood shop',
            'phone' => '09171234567',
            'address' => '123 Mabuhay St, Quezon City',
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('user.roles.0.name', RoleEnum::BUSINESS->value)
            ->assertJsonPath('store.name', 'Corner Sari-Sari Store');

        $this->assertTrue($user->fresh()->hasRole(RoleEnum::BUSINESS->value));
        $this->assertDatabaseHas('stores', [
            'user_id' => $user->id,
            'name' => 'Corner Sari-Sari Store',
        ]);
    }
}
```

- [ ] **Step 1.2: Run the test to verify it fails**

Run: `cd backend && php artisan test --filter=BecomeSellerTest`
Expected: FAIL — route `POST /api/user/become-seller` does not exist (404 response).

- [ ] **Step 1.3: Create the FormRequest**

Create `backend/app/Http/Requests/BecomeSellerRequest.php`:

```php
<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class BecomeSellerRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name'        => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:2000'],
            'logo'        => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:2048'],
            'banner'      => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
            'address'     => ['nullable', 'string', 'max:500'],
            'phone'       => ['nullable', 'string', 'max:20'],
            'latitude'    => ['nullable', 'numeric', 'between:-90,90'],
            'longitude'   => ['nullable', 'numeric', 'between:-180,180'],
        ];
    }
}
```

- [ ] **Step 1.4: Create the controller**

Create `backend/app/Http/Controllers/BecomeSellerController.php`:

```php
<?php

namespace App\Http\Controllers;

use App\Enums\RoleEnum;
use App\Http\Requests\BecomeSellerRequest;
use App\Models\Store;
use App\Services\ImageService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class BecomeSellerController extends Controller
{
    public function __construct(private ImageService $imageService) {}

    public function __invoke(BecomeSellerRequest $request): JsonResponse
    {
        $user = $request->user();

        if ($user->hasRole(RoleEnum::BUSINESS->value) || $user->hasRole(RoleEnum::ADMIN->value)) {
            return response()->json([
                'message' => 'Your account is already a seller account.',
            ], 422);
        }

        if ($user->store) {
            return response()->json([
                'message' => 'A store already exists for this account.',
            ], 422);
        }

        $store = DB::transaction(function () use ($request, $user) {
            $data = [
                'user_id'     => $user->id,
                'name'        => $request->name,
                'slug'        => Str::slug($request->name) . '-' . Str::random(5),
                'description' => $request->description,
                'address'     => $request->address,
                'phone'       => $request->phone,
                'latitude'    => $request->latitude,
                'longitude'   => $request->longitude,
            ];

            if ($request->hasFile('logo')) {
                $data['logo_url'] = $this->imageService->upload($request->file('logo'));
            }

            if ($request->hasFile('banner')) {
                $data['banner_url'] = $this->imageService->upload($request->file('banner'));
            }

            $store = Store::create($data);

            $user->assignRole(RoleEnum::BUSINESS->value);

            return $store;
        });

        Log::info('User converted to seller', [
            'user_id'  => $user->id,
            'store_id' => $store->id,
        ]);

        return response()->json([
            'message' => 'Welcome to SARI, seller!',
            'user'    => $user->fresh()->load('roles'),
            'store'   => $store,
        ], 201);
    }
}
```

- [ ] **Step 1.5: Register the route**

Open `backend/routes/api.php`. Locate the `auth:sanctum` + `throttle:authenticated` group (starts near line 55). Inside that group but OUTSIDE the nested `role:business|admin` group, add:

```php
Route::post('/user/become-seller', App\Http\Controllers\BecomeSellerController::class);
```

Place it next to the other `/user/...` routes (near `Route::put('/user/profile', ...)`).

- [ ] **Step 1.6: Run the test to verify it passes**

Run: `cd backend && php artisan test --filter=BecomeSellerTest`
Expected: PASS (1 test, assertions for status 201, user role, and store creation).

- [ ] **Step 1.7: Commit**

```bash
git add backend/app/Http/Requests/BecomeSellerRequest.php \
        backend/app/Http/Controllers/BecomeSellerController.php \
        backend/routes/api.php \
        backend/tests/Feature/BecomeSellerTest.php
git commit -m "feat(backend): add buyer-to-seller conversion endpoint"
```

---

## Task 2 — Backend: Role Guards

**Files:**
- Modify: `backend/tests/Feature/BecomeSellerTest.php`

- [ ] **Step 2.1: Add failing guard tests**

Append these three test methods to `BecomeSellerTest`:

```php
    #[Test]
    public function a_business_user_cannot_convert_again(): void
    {
        $user = User::factory()->create();
        $user->assignRole(RoleEnum::BUSINESS->value);

        $response = $this->actingAs($user)->postJson('/api/user/become-seller', [
            'name' => 'Duplicate Store',
        ]);

        $response->assertStatus(422);
    }

    #[Test]
    public function an_admin_user_cannot_use_the_conversion_endpoint(): void
    {
        $user = User::factory()->create();
        $user->assignRole(RoleEnum::ADMIN->value);

        $response = $this->actingAs($user)->postJson('/api/user/become-seller', [
            'name' => 'Admin Store',
        ]);

        $response->assertStatus(422);
    }

    #[Test]
    public function a_user_with_an_existing_store_cannot_convert(): void
    {
        $user = User::factory()->create();
        $user->assignRole(RoleEnum::USER->value);

        // Simulate data drift: user somehow has a store row without the business role
        Store::create([
            'user_id' => $user->id,
            'name'    => 'Legacy Store',
            'slug'    => 'legacy-store-' . \Illuminate\Support\Str::random(5),
        ]);

        $response = $this->actingAs($user)->postJson('/api/user/become-seller', [
            'name' => 'New Store',
        ]);

        $response->assertStatus(422);
    }
```

- [ ] **Step 2.2: Run the tests to verify they pass**

Run: `cd backend && php artisan test --filter=BecomeSellerTest`
Expected: PASS (4 tests now). The controller logic from Task 1 already handles these cases — this task just locks in the behavior.

- [ ] **Step 2.3: Commit**

```bash
git add backend/tests/Feature/BecomeSellerTest.php
git commit -m "test(backend): cover role guards on buyer-to-seller conversion"
```

---

## Task 3 — Backend: Validation, Auth, and Google-User Tests

**Files:**
- Modify: `backend/tests/Feature/BecomeSellerTest.php`

- [ ] **Step 3.1: Add validation and auth tests**

Append these test methods to `BecomeSellerTest`:

```php
    #[Test]
    public function unauthenticated_users_cannot_convert(): void
    {
        $response = $this->postJson('/api/user/become-seller', [
            'name' => 'Test Store',
        ]);

        $response->assertUnauthorized();
    }

    #[Test]
    public function name_is_required(): void
    {
        $user = User::factory()->create();
        $user->assignRole(RoleEnum::USER->value);

        $response = $this->actingAs($user)->postJson('/api/user/become-seller', [
            // no name
            'description' => 'Just a description',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['name']);
    }

    #[Test]
    public function a_google_auth_user_without_a_password_can_convert(): void
    {
        // Simulate a Google-auth user: no password, email pre-verified
        $user = User::factory()->create([
            'password' => null,
            'google_id' => 'google-test-id-123',
            'email_verified_at' => now(),
        ]);
        $user->assignRole(RoleEnum::USER->value);

        $response = $this->actingAs($user)->postJson('/api/user/become-seller', [
            'name' => 'Google User Store',
        ]);

        $response->assertStatus(201);
        $this->assertTrue($user->fresh()->hasRole(RoleEnum::BUSINESS->value));
    }
```

- [ ] **Step 3.2: Run the tests to verify they pass**

Run: `cd backend && php artisan test --filter=BecomeSellerTest`
Expected: PASS (7 tests now).

- [ ] **Step 3.3: Commit**

```bash
git add backend/tests/Feature/BecomeSellerTest.php
git commit -m "test(backend): cover validation, auth, and google-user paths for conversion"
```

---

## Task 4 — Backend: Transaction Rollback Test

**Files:**
- Modify: `backend/tests/Feature/BecomeSellerTest.php`

- [ ] **Step 4.1: Add the transaction rollback test**

Append this test method to `BecomeSellerTest`. It forces a failure during store creation by seeding an existing store with a pre-determined slug — but since slugs use random suffixes, we take a different approach: mock the `Store::create` to throw, and verify the role is NOT persisted.

```php
    #[Test]
    public function if_store_creation_fails_the_role_is_not_assigned(): void
    {
        $user = User::factory()->create();
        $user->assignRole(RoleEnum::USER->value);

        // Force Store::create to throw by passing invalid data through a mock.
        // We simulate a runtime failure using a DB-level mock on Store.
        \Illuminate\Database\Eloquent\Model::preventLazyLoading(false);

        $this->mock(\App\Models\Store::class, function ($mock) {
            $mock->shouldReceive('create')
                ->andThrow(new \RuntimeException('Simulated DB failure'));
        });

        try {
            $this->actingAs($user)->postJson('/api/user/become-seller', [
                'name' => 'Failing Store',
            ]);
        } catch (\RuntimeException $e) {
            // expected
        }

        // Role must NOT have been assigned because the transaction rolled back
        $this->assertFalse($user->fresh()->hasRole(RoleEnum::BUSINESS->value));
        $this->assertDatabaseMissing('stores', ['user_id' => $user->id]);
    }
```

**Note:** Laravel's mock of a model class can be finicky. If `$this->mock(Store::class, ...)` proves flaky, replace the mock approach with a database-level enforcement: add a temporary `DB::beforeExecuting` callback that throws when the `insert into stores` query is detected. The behavior asserted (role not assigned + no store row) stays the same.

- [ ] **Step 4.2: Run the tests to verify they pass**

Run: `cd backend && php artisan test --filter=BecomeSellerTest`
Expected: PASS (8 tests now).

- [ ] **Step 4.3: Run the full backend suite to confirm no regressions**

Run: `cd backend && php artisan test`
Expected: All tests pass.

- [ ] **Step 4.4: Commit**

```bash
git add backend/tests/Feature/BecomeSellerTest.php
git commit -m "test(backend): verify transaction rollback on conversion failure"
```

---

## Task 5 — Frontend: BecomeSellerWizard Component

**Files:**
- Create: `frontend/src/components/seller/BecomeSellerWizard.tsx`

- [ ] **Step 5.1: Create the wizard component**

Create `frontend/src/components/seller/BecomeSellerWizard.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { Store, Upload, Loader2, ArrowLeft, ArrowRight, Check } from 'lucide-react';
import api from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';

type Step = 1 | 2 | 3;

interface FormState {
  name: string;
  description: string;
  logo: File | null;
  banner: File | null;
  phone: string;
  address: string;
  latitude: string;
  longitude: string;
}

const initialState: FormState = {
  name: '',
  description: '',
  logo: null,
  banner: null,
  phone: '',
  address: '',
  latitude: '',
  longitude: '',
};

export default function BecomeSellerWizard() {
  const { addToast } = useToast();
  const [step, setStep] = useState<Step>(1);
  const [form, setForm] = useState<FormState>(initialState);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const canAdvanceStep1 = form.name.trim().length > 0;

  const handleFile = (
    file: File | null,
    setFile: (f: File | null) => void,
    setPreview: (url: string | null) => void,
  ) => {
    setFile(file);
    setPreview(file ? URL.createObjectURL(file) : null);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setFieldErrors({});

    const data = new FormData();
    data.append('name', form.name);
    if (form.description) data.append('description', form.description);
    if (form.logo) data.append('logo', form.logo);
    if (form.banner) data.append('banner', form.banner);
    if (form.phone) data.append('phone', form.phone);
    if (form.address) data.append('address', form.address);
    if (form.latitude) data.append('latitude', form.latitude);
    if (form.longitude) data.append('longitude', form.longitude);

    try {
      await api.post('/api/user/become-seller', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      addToast({
        type: 'success',
        title: 'Your shop is live!',
        message: 'Redirecting to your business dashboard…',
      });

      // Full page load so every component's useAuth re-fetches the user+roles.
      window.location.href = '/business/dashboard';
    } catch (err: unknown) {
      const axiosErr = err as {
        response?: { status?: number; data?: { errors?: Record<string, string[]>; message?: string } };
      };
      const status = axiosErr.response?.status;
      const body = axiosErr.response?.data;

      if (status === 422 && body?.errors) {
        setFieldErrors(body.errors);
        // If the name error came back, jump to step 1
        if (body.errors.name) setStep(1);
      }

      addToast({
        type: 'error',
        title: 'Could not create your shop',
        message: body?.message ?? 'Please review your details and try again.',
      });
      setSubmitting(false);
    }
  };

  const input =
    'w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder:text-gray-300 focus:ring-2 focus:ring-sari-500/20 focus:border-sari-500 outline-none transition-all duration-200';

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      {/* Progress indicator */}
      <div className="flex items-center justify-center mb-10">
        {([1, 2, 3] as Step[]).map((n, idx) => (
          <div key={n} className="flex items-center">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                step >= n
                  ? 'bg-gradient-to-br from-sari-500 to-sari-600 text-white shadow-md shadow-sari-500/30'
                  : 'bg-gray-100 text-gray-400'
              }`}
            >
              {step > n ? <Check className="w-5 h-5" /> : n}
            </div>
            {idx < 2 && (
              <div
                className={`w-16 h-[2px] mx-2 transition-all ${
                  step > n ? 'bg-sari-500' : 'bg-gray-200'
                }`}
              />
            )}
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
        {step === 1 && (
          <div className="space-y-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-sari-50 flex items-center justify-center">
                <Store className="w-5 h-5 text-sari-500" />
              </div>
              <div>
                <h2 className="font-display text-xl font-bold text-gray-900">Store basics</h2>
                <p className="text-sm text-gray-500">Tell us what your shop is called.</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Store name <span className="text-sari-600">*</span>
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="Corner Sari-Sari Store"
                className={input}
                maxLength={255}
              />
              {fieldErrors.name && (
                <p className="text-xs text-red-600 mt-1.5">{fieldErrors.name[0]}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Description <span className="text-gray-400 font-normal">(Optional)</span>
              </label>
              <textarea
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="What makes your shop special?"
                rows={4}
                maxLength={2000}
                className={input}
              />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-sari-50 flex items-center justify-center">
                <Upload className="w-5 h-5 text-sari-500" />
              </div>
              <div>
                <h2 className="font-display text-xl font-bold text-gray-900">Branding</h2>
                <p className="text-sm text-gray-500">Add a logo and banner (both optional).</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Logo <span className="text-gray-400 font-normal">(square image works best)</span>
              </label>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) =>
                  handleFile(e.target.files?.[0] ?? null, (f) => setForm((p) => ({ ...p, logo: f })), setLogoPreview)
                }
                className="block w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-sari-50 file:text-sari-700 file:font-medium hover:file:bg-sari-100"
              />
              {logoPreview && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={logoPreview} alt="Logo preview" className="mt-3 w-24 h-24 rounded-xl object-cover" />
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Banner <span className="text-gray-400 font-normal">(wide image works best)</span>
              </label>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) =>
                  handleFile(e.target.files?.[0] ?? null, (f) => setForm((p) => ({ ...p, banner: f })), setBannerPreview)
                }
                className="block w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-sari-50 file:text-sari-700 file:font-medium hover:file:bg-sari-100"
              />
              {bannerPreview && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={bannerPreview} alt="Banner preview" className="mt-3 w-full h-32 rounded-xl object-cover" />
              )}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-sari-50 flex items-center justify-center">
                <Store className="w-5 h-5 text-sari-500" />
              </div>
              <div>
                <h2 className="font-display text-xl font-bold text-gray-900">Contact & location</h2>
                <p className="text-sm text-gray-500">How can buyers reach you? (all optional)</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone</label>
              <input
                type="tel"
                inputMode="numeric"
                pattern="[0-9+]*"
                value={form.phone}
                onChange={(e) =>
                  setForm((p) => ({ ...p, phone: e.target.value.replace(/[^0-9+]/g, '') }))
                }
                placeholder="09171234567"
                className={input}
                maxLength={20}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Address</label>
              <textarea
                value={form.address}
                onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
                placeholder="Street, city, province"
                rows={3}
                maxLength={500}
                className={input}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Latitude</label>
                <input
                  type="number"
                  step="any"
                  value={form.latitude}
                  onChange={(e) => setForm((p) => ({ ...p, latitude: e.target.value }))}
                  placeholder="14.5995"
                  className={input}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Longitude</label>
                <input
                  type="number"
                  step="any"
                  value={form.longitude}
                  onChange={(e) => setForm((p) => ({ ...p, longitude: e.target.value }))}
                  placeholder="120.9842"
                  className={input}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Nav buttons */}
      <div className="flex items-center justify-between mt-6">
        <button
          type="button"
          onClick={() => setStep((s) => Math.max(1, s - 1) as Step)}
          disabled={step === 1 || submitting}
          className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-900 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        {step < 3 ? (
          <button
            type="button"
            onClick={() => setStep((s) => Math.min(3, s + 1) as Step)}
            disabled={(step === 1 && !canAdvanceStep1) || submitting}
            className="flex items-center gap-1.5 bg-gradient-to-r from-sari-500 to-sari-600 hover:from-sari-600 hover:to-sari-700 text-white font-medium px-6 py-2.5 rounded-xl shadow-md shadow-sari-500/20 hover:shadow-lg transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
            <ArrowRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="flex items-center gap-1.5 bg-gradient-to-r from-sari-500 to-sari-600 hover:from-sari-600 hover:to-sari-700 text-white font-medium px-6 py-2.5 rounded-xl shadow-md shadow-sari-500/20 hover:shadow-lg transition-all text-sm disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Creating your shop…
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                Create my shop
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 5.2: Commit**

```bash
git add frontend/src/components/seller/BecomeSellerWizard.tsx
git commit -m "feat(frontend): add 3-step BecomeSellerWizard component"
```

---

## Task 6 — Frontend: /become-seller Route Page with Guards

**Files:**
- Create: `frontend/src/app/become-seller/page.tsx`

- [ ] **Step 6.1: Create the route page**

Create `frontend/src/app/become-seller/page.tsx`:

```tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import Navbar from '@/components/layout/Navbar';
import BecomeSellerWizard from '@/components/seller/BecomeSellerWizard';
import { useAuth } from '@/hooks/useAuth';

export default function BecomeSellerPage() {
  const { user, loading, hasRole } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    if (hasRole('business') || hasRole('admin')) {
      router.replace('/business/dashboard');
    }
  }, [user, loading, hasRole, router]);

  if (loading || !user || hasRole('business') || hasRole('admin')) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-sari-500" />
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-gradient-to-b from-gray-50/80 to-white">
        <div className="relative overflow-hidden bg-gradient-to-r from-sari-50 via-white to-sari-50 border-b border-gray-100">
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-10">
            <h1 className="font-display text-3xl md:text-4xl font-bold text-gray-900 tracking-tight">
              Become a Seller
            </h1>
            <p className="mt-2 text-gray-500 text-sm md:text-base max-w-lg">
              Turn your account into a shop in three quick steps.
            </p>
          </div>
        </div>

        <BecomeSellerWizard />
      </main>
    </>
  );
}
```

- [ ] **Step 6.2: Commit**

```bash
git add frontend/src/app/become-seller/page.tsx
git commit -m "feat(frontend): add /become-seller route with auth and role guards"
```

---

## Task 7 — Frontend: Profile Page "Become a Seller" Card

**Files:**
- Modify: `frontend/src/app/profile/page.tsx`

- [ ] **Step 7.1: Add the needed imports**

Open `frontend/src/app/profile/page.tsx`. At the top of the file, update the `lucide-react` import (currently line 7) to include the `Store` and `ArrowRight` icons:

```tsx
import { User, Mail, Phone, MapPin, Pencil, Store, ArrowRight } from 'lucide-react';
```

Then add a new import line for `Link` (the file does not currently import it). Place it with the other `next/*` imports near the top:

```tsx
import Link from 'next/link';
```

- [ ] **Step 7.2: Compute the buyers-only flag**

In the component body of `ProfilePage`, after the existing `roleLabel` computation (around line 75), add:

```tsx
const isBuyerOnly = roleName === 'user';
```

- [ ] **Step 7.3: Render the "Become a Seller" card**

In the right column of the profile grid (after the "Saved Addresses Card" closing `</div>` near line 443, but still inside the `<div className="lg:col-span-2 space-y-6">` wrapper), insert the following card. It only renders when the user is a buyer:

```tsx
{isBuyerOnly && (
  <div className="rounded-2xl border border-sari-100 bg-gradient-to-br from-sari-50 via-white to-white shadow-sm p-6 relative overflow-hidden">
    <div
      className="absolute inset-0 opacity-[0.04] pointer-events-none"
      style={{
        backgroundImage: 'radial-gradient(circle, #92400E 1px, transparent 1px)',
        backgroundSize: '20px 20px',
      }}
    />
    <div className="relative flex items-start gap-4">
      <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-sari-500 to-sari-600 flex items-center justify-center shrink-0 shadow-md shadow-sari-500/30">
        <Store className="w-5 h-5 text-white" strokeWidth={2} />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-display text-lg font-semibold text-gray-900">
          Start selling on SARI
        </h3>
        <p className="text-sm text-gray-600 mt-1 max-w-md">
          Turn your account into a shop — list products, manage orders, and grow your business.
        </p>
        <Link
          href="/become-seller"
          className="inline-flex items-center gap-1.5 mt-4 bg-gradient-to-r from-sari-500 to-sari-600 hover:from-sari-600 hover:to-sari-700 text-white font-medium px-5 py-2.5 rounded-xl shadow-md shadow-sari-500/20 hover:shadow-lg transition-all text-sm"
        >
          Become a Seller
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  </div>
)}
```

- [ ] **Step 7.4: Commit**

```bash
git add frontend/src/app/profile/page.tsx
git commit -m "feat(frontend): add 'Become a Seller' card to profile page for buyers"
```

---

## Task 8 — Frontend: Navbar Dropdown "Sell on SARI" Item

**Files:**
- Modify: `frontend/src/components/layout/Navbar.tsx`

- [ ] **Step 8.1: Add the dropdown item**

Open `frontend/src/components/layout/Navbar.tsx`. The user dropdown is defined around lines 120–140. Locate the existing `hasRole('business')` conditional `Link` (line 128–132) and add a parallel conditional for buyers ABOVE it:

Find this block:

```tsx
{/* UI-only role check — backend enforces actual access */}
{hasRole('business') && (
  <Link href="/business/dashboard" className="flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
    Business Dashboard
  </Link>
)}
```

Replace it with:

```tsx
{/* UI-only role check — backend enforces actual access */}
{hasRole('user') && !hasRole('business') && !hasRole('admin') && (
  <Link href="/become-seller" className="flex items-center px-4 py-2.5 text-sm text-sari-700 hover:bg-sari-50 font-medium transition-colors">
    Sell on SARI
  </Link>
)}
{hasRole('business') && (
  <Link href="/business/dashboard" className="flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
    Business Dashboard
  </Link>
)}
```

The `!hasRole('business') && !hasRole('admin')` guards are defensive — a user in Spatie permission can technically hold multiple roles simultaneously, and we don't want to show the "Sell on SARI" nudge to anyone who is already a seller or admin.

- [ ] **Step 8.2: Commit**

```bash
git add frontend/src/components/layout/Navbar.tsx
git commit -m "feat(frontend): add 'Sell on SARI' link to navbar dropdown for buyers"
```

---

## Task 9 — Manual Verification

No code changes. Walk through the full flow end-to-end to verify the feature works in the browser and no existing flows regressed.

- [ ] **Step 9.1: Start the stack**

In three terminals:

```bash
# Terminal 1
cd backend && php artisan serve

# Terminal 2
cd backend && php artisan queue:work

# Terminal 3
cd frontend && npm run dev
```

- [ ] **Step 9.2: Fresh buyer flow (email/password)**

1. Go to `http://localhost:3000/register`. Register a new account with role `user` (the default).
2. Log in. Confirm you land on `/`.
3. Open the user dropdown in the navbar → verify "Sell on SARI" appears.
4. Navigate to `/profile` → verify the "Start selling on SARI" card appears below "Saved Addresses".
5. Click "Become a Seller" → you land on `/become-seller` with step 1 visible and indicator showing `1 — 2 — 3`.
6. Try to click "Next" with the name field empty → the button is disabled.
7. Fill in a store name, click Next → step 2 visible.
8. (Optional) Upload a logo and/or banner and verify previews appear.
9. Click Next → step 3 visible. Fill in phone and address (optional fields).
10. Click "Create my shop" → toast shows "Your shop is live!" → redirected to `/business/dashboard` after full page reload.
11. Verify the role label on `/profile` now reads "Business Owner".
12. Verify the "Start selling on SARI" card is GONE from profile.
13. Verify the "Sell on SARI" navbar item is GONE.
14. Verify "Business Dashboard" navbar item NOW appears.
15. Navigate to `/become-seller` directly → you are redirected to `/business/dashboard`.
16. Navigate to `/business/store` → the store you created should appear with the submitted data.

- [ ] **Step 9.3: Google-auth buyer flow**

1. Log out. Click "Login", use the "Continue with Google" option.
2. Sign in with a Google account that has never used SARI before.
3. After redirect, you are logged in with `user` role.
4. Repeat steps 3–14 from 9.2. Verify the conversion works identically.

- [ ] **Step 9.4: Guard verification**

1. Using a user already converted to business, directly visit `/become-seller` → redirected to `/business/dashboard`.
2. Using the browser devtools or Postman while authenticated as a business user, POST to `/api/user/become-seller` with `{ "name": "X" }` → response is 422.
3. Log out. POST to `/api/user/become-seller` with `{ "name": "X" }` → response is 401.

- [ ] **Step 9.5: Regression sweep**

1. Log in as a regular buyer. Add a product to cart and checkout to the payment step — verify nothing in the buyer path is affected.
2. Log in as an admin (seeded via `AdminSeeder`, email `admin@sari.ph`). Visit `/profile` → the "Start selling on SARI" card must NOT appear. Visit `/become-seller` directly → redirected to `/business/dashboard`.
3. Log in as a pre-existing business user (one who was created with `role: business` at registration). Verify their existing flow at `/business/store` still works unchanged.

- [ ] **Step 9.6: Done**

If all checks pass, the feature is complete. Tag a final summary commit if needed, otherwise the feature is ready for review/merge.
