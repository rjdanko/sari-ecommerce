# Module 33: Voucher System, Cart Variant Editing & Search Fix

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Use **frontend-design:frontend-design** skill for all UI component creation (voucher banners, modals, dropdowns, etc.) to ensure high design quality.

**Goal:** Implement a Lazada/Shopee-inspired voucher system with daily and special-date drops, make product variant options editable in the cart page, and fix the search bar so it filters products correctly and retains the query text.

**Architecture:** Backend voucher system via new Laravel model + controller + middleware. Cart variant editing via a new API endpoint to swap variants. Search fix by wiring the products page to read the `?q=` param and call the `/api/search` endpoint (or filter via the existing `/api/products` endpoint with a new `search` query param). All frontend components styled with Tailwind CSS v4, following the existing sari-500/600 color scheme.

**Tech Stack:** Laravel 12 (backend), Next.js 15 App Router + TypeScript + Tailwind CSS v4 (frontend), Redis (cart), PostgreSQL (vouchers)

---

## Part A: Voucher System

### Research: Lazada/Shopee Voucher Patterns

Philippine e-commerce platforms (Lazada, Shopee) implement vouchers as follows:

**Daily Vouchers:**
- Free shipping vouchers (e.g., "Free Shipping min. spend P299") — claimable once per day
- Small peso-off discounts (P20-P50 off, min spend P200-P500) — limited quantity per day
- Displayed in a "Voucher Center" or banner on the homepage
- Users must "claim" a voucher before it appears in checkout
- Auto-applied or manually selected at checkout

**Special Date Sales (Double-Day Sales: 1.1, 2.2, ... 12.12):**
- Major discount vouchers (10%-50% off, or P100-P500 off)
- Free shipping with no minimum spend
- Higher usage limits, limited-time window (usually 24h on the date)
- Countdown timers and flashy banners leading up to the event
- Vouchers become claimable a few days before the event

**Voucher Application Rules:**
- One voucher per order (or one shipping + one discount voucher)
- Minimum spend requirements
- Maximum discount caps (e.g., "20% off up to P100")
- Usage limit per user (usually 1 per voucher per user)
- Global usage limit (e.g., first 1000 claims)

---

### Task 1: Create Voucher Database Schema

**Files:**
- Create: `backend/database/migrations/0023_create_vouchers_table.php`
- Create: `backend/database/migrations/0024_create_voucher_claims_table.php`
- Create: `backend/app/Models/Voucher.php`
- Create: `backend/app/Models/VoucherClaim.php`

- [ ] **Step 1: Create the vouchers migration**

```bash
cd backend && php artisan make:migration create_vouchers_table --path=database/migrations/0023_create_vouchers_table.php
```

Then write the migration content:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('vouchers', function (Blueprint $table) {
            $table->id();
            $table->string('code', 50)->unique();
            $table->string('name');
            $table->text('description')->nullable();
            $table->enum('type', ['daily', 'special'])->default('daily');
            $table->enum('discount_type', ['percentage', 'fixed', 'free_shipping'])->default('fixed');
            $table->decimal('discount_value', 10, 2)->default(0);
            // e.g., 20% off => discount_value=20, discount_type=percentage
            // P50 off => discount_value=50, discount_type=fixed
            // free shipping => discount_type=free_shipping, discount_value=0
            $table->decimal('min_spend', 10, 2)->default(0);
            $table->decimal('max_discount', 10, 2)->nullable();
            // max_discount caps percentage discounts (e.g., 20% off up to P100)
            $table->integer('total_quantity')->nullable();
            // null = unlimited
            $table->integer('claimed_count')->default(0);
            $table->integer('max_claims_per_user')->default(1);
            $table->dateTime('starts_at');
            $table->dateTime('expires_at');
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index(['type', 'is_active', 'starts_at', 'expires_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('vouchers');
    }
};
```

- [ ] **Step 2: Create the voucher_claims migration**

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('voucher_claims', function (Blueprint $table) {
            $table->id();
            $table->foreignId('voucher_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('order_id')->nullable()->constrained()->nullOnDelete();
            // order_id is set when the voucher is actually used at checkout
            $table->enum('status', ['claimed', 'used', 'expired'])->default('claimed');
            $table->timestamps();

            $table->unique(['voucher_id', 'user_id', 'status']);
            // Prevents a user from claiming the same voucher twice (while claimed)
            $table->index(['user_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('voucher_claims');
    }
};
```

- [ ] **Step 3: Create the Voucher model**

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Voucher extends Model
{
    protected $fillable = [
        'code', 'name', 'description', 'type', 'discount_type',
        'discount_value', 'min_spend', 'max_discount',
        'total_quantity', 'claimed_count', 'max_claims_per_user',
        'starts_at', 'expires_at', 'is_active',
    ];

    protected function casts(): array
    {
        return [
            'discount_value' => 'decimal:2',
            'min_spend' => 'decimal:2',
            'max_discount' => 'decimal:2',
            'is_active' => 'boolean',
            'starts_at' => 'datetime',
            'expires_at' => 'datetime',
        ];
    }

    public function claims()
    {
        return $this->hasMany(VoucherClaim::class);
    }

    public function isValid(): bool
    {
        return $this->is_active
            && now()->between($this->starts_at, $this->expires_at)
            && ($this->total_quantity === null || $this->claimed_count < $this->total_quantity);
    }

    public function calculateDiscount(float $subtotal): float
    {
        if ($subtotal < $this->min_spend) {
            return 0;
        }

        if ($this->discount_type === 'free_shipping') {
            return 0; // handled separately — zeroes out shipping fee
        }

        if ($this->discount_type === 'fixed') {
            return min($this->discount_value, $subtotal);
        }

        // percentage
        $discount = $subtotal * ($this->discount_value / 100);
        if ($this->max_discount !== null) {
            $discount = min($discount, $this->max_discount);
        }
        return round($discount, 2);
    }

    public function grantsFreeShipping(): bool
    {
        return $this->discount_type === 'free_shipping';
    }
}
```

- [ ] **Step 4: Create the VoucherClaim model**

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class VoucherClaim extends Model
{
    protected $fillable = [
        'voucher_id', 'user_id', 'order_id', 'status',
    ];

    public function voucher()
    {
        return $this->belongsTo(Voucher::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function order()
    {
        return $this->belongsTo(Order::class);
    }
}
```

- [ ] **Step 5: Run the migration**

```bash
cd backend && php artisan migrate
```

- [ ] **Step 6: Commit**

```bash
git add backend/database/migrations/0023_create_vouchers_table.php backend/database/migrations/0024_create_voucher_claims_table.php backend/app/Models/Voucher.php backend/app/Models/VoucherClaim.php
git commit -m "feat(voucher): add vouchers and voucher_claims schema + models"
```

---

### Task 2: Voucher Backend API (Claim, List, Apply)

**Files:**
- Create: `backend/app/Http/Controllers/VoucherController.php`
- Create: `backend/app/Http/Requests/ClaimVoucherRequest.php`
- Create: `backend/app/Http/Requests/ApplyVoucherRequest.php`
- Modify: `backend/routes/api.php` (add voucher routes)

- [ ] **Step 1: Create ClaimVoucherRequest**

```php
<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ClaimVoucherRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'voucher_id' => ['required', 'integer', 'exists:vouchers,id'],
        ];
    }
}
```

- [ ] **Step 2: Create ApplyVoucherRequest**

```php
<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ApplyVoucherRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'code' => ['required', 'string', 'max:50'],
        ];
    }
}
```

- [ ] **Step 3: Create VoucherController**

```php
<?php

namespace App\Http\Controllers;

use App\Http\Requests\ApplyVoucherRequest;
use App\Http\Requests\ClaimVoucherRequest;
use App\Models\Voucher;
use App\Models\VoucherClaim;
use App\Services\CartService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class VoucherController extends Controller
{
    public function __construct(private CartService $cartService) {}

    /**
     * List available vouchers (active, not expired, within date range).
     */
    public function index(Request $request): JsonResponse
    {
        $vouchers = Voucher::where('is_active', true)
            ->where('starts_at', '<=', now())
            ->where('expires_at', '>=', now())
            ->where(function ($q) {
                $q->whereNull('total_quantity')
                  ->orWhereColumn('claimed_count', '<', 'total_quantity');
            })
            ->orderBy('type')
            ->orderBy('expires_at')
            ->get();

        // If user is authenticated, attach their claim status
        if ($request->user()) {
            $claimedIds = VoucherClaim::where('user_id', $request->user()->id)
                ->where('status', 'claimed')
                ->pluck('voucher_id')
                ->toArray();

            $vouchers->each(function ($voucher) use ($claimedIds) {
                $voucher->is_claimed = in_array($voucher->id, $claimedIds);
            });
        }

        return response()->json(['data' => $vouchers]);
    }

    /**
     * Claim a voucher (user adds it to their wallet).
     */
    public function claim(ClaimVoucherRequest $request): JsonResponse
    {
        $user = $request->user();
        $voucher = Voucher::findOrFail($request->validated()['voucher_id']);

        if (!$voucher->isValid()) {
            return response()->json(['error' => 'This voucher is no longer available.'], 422);
        }

        // Check per-user limit
        $existingClaims = VoucherClaim::where('voucher_id', $voucher->id)
            ->where('user_id', $user->id)
            ->whereIn('status', ['claimed', 'used'])
            ->count();

        if ($existingClaims >= $voucher->max_claims_per_user) {
            return response()->json(['error' => 'You have already claimed this voucher.'], 422);
        }

        // Check global quantity
        if ($voucher->total_quantity !== null && $voucher->claimed_count >= $voucher->total_quantity) {
            return response()->json(['error' => 'This voucher has been fully claimed.'], 422);
        }

        VoucherClaim::create([
            'voucher_id' => $voucher->id,
            'user_id' => $user->id,
            'status' => 'claimed',
        ]);

        $voucher->increment('claimed_count');

        return response()->json(['message' => 'Voucher claimed successfully!']);
    }

    /**
     * List user's claimed (unused) vouchers.
     */
    public function myClaimed(Request $request): JsonResponse
    {
        $claims = VoucherClaim::with('voucher')
            ->where('user_id', $request->user()->id)
            ->where('status', 'claimed')
            ->whereHas('voucher', function ($q) {
                $q->where('expires_at', '>=', now());
            })
            ->get();

        return response()->json(['data' => $claims]);
    }

    /**
     * Apply a voucher code at checkout — validates and returns discount preview.
     */
    public function apply(ApplyVoucherRequest $request): JsonResponse
    {
        $user = $request->user();
        $code = strtoupper(trim($request->validated()['code']));

        $voucher = Voucher::where('code', $code)->first();

        if (!$voucher || !$voucher->isValid()) {
            return response()->json(['error' => 'Invalid or expired voucher code.'], 422);
        }

        // User must have claimed this voucher
        $claim = VoucherClaim::where('voucher_id', $voucher->id)
            ->where('user_id', $user->id)
            ->where('status', 'claimed')
            ->first();

        if (!$claim) {
            return response()->json(['error' => 'You have not claimed this voucher. Claim it first from the voucher center.'], 422);
        }

        // Calculate discount based on cart total
        $cartTotal = $this->cartService->getCartTotal($user->id);

        if ($cartTotal < $voucher->min_spend) {
            return response()->json([
                'error' => "Minimum spend of P" . number_format($voucher->min_spend, 2) . " required.",
            ], 422);
        }

        $discount = $voucher->calculateDiscount($cartTotal);

        return response()->json([
            'voucher' => $voucher,
            'discount' => $discount,
            'free_shipping' => $voucher->grantsFreeShipping(),
            'new_subtotal' => $cartTotal - $discount,
        ]);
    }
}
```

- [ ] **Step 4: Add voucher routes to `backend/routes/api.php`**

Inside the `auth:sanctum` middleware group, add:

```php
    // Vouchers
    Route::get('/vouchers', [App\Http\Controllers\VoucherController::class, 'index']);
    Route::post('/vouchers/claim', [App\Http\Controllers\VoucherController::class, 'claim']);
    Route::get('/vouchers/my-claimed', [App\Http\Controllers\VoucherController::class, 'myClaimed']);
    Route::post('/vouchers/apply', [App\Http\Controllers\VoucherController::class, 'apply']);
```

Also add a public route for browsing vouchers without auth (outside the auth middleware):

```php
Route::middleware('throttle:public-api')->group(function () {
    // ... existing routes ...
    Route::get('/vouchers/available', [App\Http\Controllers\VoucherController::class, 'index']);
});
```

- [ ] **Step 5: Commit**

```bash
git add backend/app/Http/Controllers/VoucherController.php backend/app/Http/Requests/ClaimVoucherRequest.php backend/app/Http/Requests/ApplyVoucherRequest.php backend/routes/api.php
git commit -m "feat(voucher): add voucher claim, list, and apply API endpoints"
```

---

### Task 3: Integrate Vouchers into Checkout Flow (Backend)

**Files:**
- Modify: `backend/app/Http/Controllers/CheckoutController.php`
- Modify: `backend/app/Http/Requests/CheckoutRequest.php`
- Modify: `backend/app/Models/Order.php` (add discount fields)
- Create: `backend/database/migrations/0025_add_voucher_fields_to_orders.php`

- [ ] **Step 1: Create migration for voucher fields on orders**

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->foreignId('voucher_id')->nullable()->after('payment_method')->constrained()->nullOnDelete();
            $table->decimal('discount', 10, 2)->default(0)->after('tax');
            // Update total calculation: total = subtotal + shipping_fee + tax - discount
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropForeign(['voucher_id']);
            $table->dropColumn(['voucher_id', 'discount']);
        });
    }
};
```

- [ ] **Step 2: Run the migration**

```bash
cd backend && php artisan migrate
```

- [ ] **Step 3: Update Order model `$fillable` to include voucher_id and discount**

In `backend/app/Models/Order.php`, add `'voucher_id'` and `'discount'` to the `$fillable` array.

- [ ] **Step 4: Update CheckoutRequest to accept optional voucher_code**

Add to the rules array in `backend/app/Http/Requests/CheckoutRequest.php`:

```php
'voucher_code' => ['nullable', 'string', 'max:50'],
```

- [ ] **Step 5: Update CheckoutController to apply voucher at checkout**

In `backend/app/Http/Controllers/CheckoutController.php`, inside the `createSession` method's DB transaction, add voucher logic after calculating `$subtotal` but before creating the `Order`:

```php
// Apply voucher if provided
$discount = 0;
$voucherId = null;
$freeShipping = false;

if (!empty($validated['voucher_code'])) {
    $voucher = \App\Models\Voucher::where('code', strtoupper(trim($validated['voucher_code'])))->first();

    if ($voucher && $voucher->isValid()) {
        $claim = \App\Models\VoucherClaim::where('voucher_id', $voucher->id)
            ->where('user_id', $user->id)
            ->where('status', 'claimed')
            ->first();

        if ($claim && $subtotal >= $voucher->min_spend) {
            $discount = $voucher->calculateDiscount($subtotal);
            $freeShipping = $voucher->grantsFreeShipping();
            $voucherId = $voucher->id;

            // Mark claim as used
            $claim->update(['status' => 'used', 'order_id' => null]); // order_id set after order creation
        }
    }
}
```

Then update the `Order::create()` call to include:

```php
'voucher_id' => $voucherId,
'discount' => $discount,
'total' => $subtotal + ($freeShipping ? 0 : $shippingFee) - $discount,
```

And after order creation, update the claim with the order_id:

```php
if ($voucherId) {
    \App\Models\VoucherClaim::where('voucher_id', $voucherId)
        ->where('user_id', $user->id)
        ->where('status', 'used')
        ->whereNull('order_id')
        ->update(['order_id' => $order->id]);
}
```

Also update `$shippingFee` usage: if `$freeShipping` is true, pass `0` as the shipping fee in the PayMongo line items.

- [ ] **Step 6: Commit**

```bash
git add backend/database/migrations/0025_add_voucher_fields_to_orders.php backend/app/Models/Order.php backend/app/Http/Controllers/CheckoutController.php backend/app/Http/Requests/CheckoutRequest.php
git commit -m "feat(voucher): integrate voucher discount into checkout flow"
```

---

### Task 4: Voucher Seeder (Daily + Special Date Vouchers)

**Files:**
- Create: `backend/database/seeders/VoucherSeeder.php`

- [ ] **Step 1: Create the seeder**

```php
<?php

namespace Database\Seeders;

use App\Models\Voucher;
use Carbon\Carbon;
use Illuminate\Database\Seeder;

class VoucherSeeder extends Seeder
{
    public function run(): void
    {
        // ── Daily Vouchers (refreshed concept — valid today) ──
        $today = Carbon::today();

        Voucher::create([
            'code' => 'DAILYSHIP-' . $today->format('md'),
            'name' => 'Daily Free Shipping',
            'description' => 'Free shipping on orders P299+. Claim daily!',
            'type' => 'daily',
            'discount_type' => 'free_shipping',
            'discount_value' => 0,
            'min_spend' => 299,
            'max_discount' => null,
            'total_quantity' => 500,
            'max_claims_per_user' => 1,
            'starts_at' => $today->copy()->startOfDay(),
            'expires_at' => $today->copy()->endOfDay(),
        ]);

        Voucher::create([
            'code' => 'DAILY20-' . $today->format('md'),
            'name' => 'P20 Off',
            'description' => 'P20 off on orders P200+. Limited daily!',
            'type' => 'daily',
            'discount_type' => 'fixed',
            'discount_value' => 20,
            'min_spend' => 200,
            'max_discount' => null,
            'total_quantity' => 1000,
            'max_claims_per_user' => 1,
            'starts_at' => $today->copy()->startOfDay(),
            'expires_at' => $today->copy()->endOfDay(),
        ]);

        Voucher::create([
            'code' => 'DAILY50-' . $today->format('md'),
            'name' => 'P50 Off',
            'description' => 'P50 off on orders P500+. Hurry, limited stocks!',
            'type' => 'daily',
            'discount_type' => 'fixed',
            'discount_value' => 50,
            'min_spend' => 500,
            'max_discount' => null,
            'total_quantity' => 200,
            'max_claims_per_user' => 1,
            'starts_at' => $today->copy()->startOfDay(),
            'expires_at' => $today->copy()->endOfDay(),
        ]);

        // ── Special Double-Day Vouchers (1.1 through 12.12) ──
        $year = $today->year;
        for ($month = 1; $month <= 12; $month++) {
            $saleDate = Carbon::create($year, $month, $month);

            // Skip past dates
            if ($saleDate->lt($today)) continue;

            $monthLabel = $saleDate->format('n.j'); // e.g., "4.4"

            Voucher::create([
                'code' => 'SARI' . $month . $month . '-SHIP',
                'name' => $monthLabel . ' Free Shipping',
                'description' => "Free shipping on ALL orders! {$monthLabel} Sale special.",
                'type' => 'special',
                'discount_type' => 'free_shipping',
                'discount_value' => 0,
                'min_spend' => 0,
                'max_discount' => null,
                'total_quantity' => 2000,
                'max_claims_per_user' => 1,
                'starts_at' => $saleDate->copy()->startOfDay(),
                'expires_at' => $saleDate->copy()->endOfDay(),
            ]);

            Voucher::create([
                'code' => 'SARI' . $month . $month . '-20OFF',
                'name' => $monthLabel . ' 20% Off',
                'description' => "20% off up to P200! {$monthLabel} Sale special.",
                'type' => 'special',
                'discount_type' => 'percentage',
                'discount_value' => 20,
                'min_spend' => 300,
                'max_discount' => 200,
                'total_quantity' => 1000,
                'max_claims_per_user' => 1,
                'starts_at' => $saleDate->copy()->startOfDay(),
                'expires_at' => $saleDate->copy()->endOfDay(),
            ]);

            Voucher::create([
                'code' => 'SARI' . $month . $month . '-MEGA',
                'name' => $monthLabel . ' Mega Discount',
                'description' => "P150 off on orders P999+! {$monthLabel} mega sale.",
                'type' => 'special',
                'discount_type' => 'fixed',
                'discount_value' => 150,
                'min_spend' => 999,
                'max_discount' => null,
                'total_quantity' => 500,
                'max_claims_per_user' => 1,
                'starts_at' => $saleDate->copy()->startOfDay(),
                'expires_at' => $saleDate->copy()->endOfDay(),
            ]);
        }
    }
}
```

- [ ] **Step 2: Run the seeder**

```bash
cd backend && php artisan db:seed --class=VoucherSeeder
```

- [ ] **Step 3: Commit**

```bash
git add backend/database/seeders/VoucherSeeder.php
git commit -m "feat(voucher): add daily + special date voucher seeder"
```

---

### Task 5: Voucher Artisan Command (Auto-Generate Daily Vouchers)

**Files:**
- Create: `backend/app/Console/Commands/GenerateDailyVouchers.php`

- [ ] **Step 1: Create the command**

```php
<?php

namespace App\Console\Commands;

use App\Models\Voucher;
use Carbon\Carbon;
use Illuminate\Console\Command;

class GenerateDailyVouchers extends Command
{
    protected $signature = 'vouchers:generate-daily';
    protected $description = 'Generate daily vouchers for today (free shipping + small discounts)';

    public function handle(): int
    {
        $today = Carbon::today();
        $dateCode = $today->format('md');

        $dailyVouchers = [
            [
                'code' => 'DAILYSHIP-' . $dateCode,
                'name' => 'Daily Free Shipping',
                'description' => 'Free shipping on orders P299+. Claim daily!',
                'discount_type' => 'free_shipping',
                'discount_value' => 0,
                'min_spend' => 299,
                'total_quantity' => 500,
            ],
            [
                'code' => 'DAILY20-' . $dateCode,
                'name' => 'P20 Off',
                'description' => 'P20 off on orders P200+.',
                'discount_type' => 'fixed',
                'discount_value' => 20,
                'min_spend' => 200,
                'total_quantity' => 1000,
            ],
            [
                'code' => 'DAILY50-' . $dateCode,
                'name' => 'P50 Off',
                'description' => 'P50 off on orders P500+.',
                'discount_type' => 'fixed',
                'discount_value' => 50,
                'min_spend' => 500,
                'total_quantity' => 200,
            ],
        ];

        foreach ($dailyVouchers as $v) {
            Voucher::firstOrCreate(
                ['code' => $v['code']],
                array_merge($v, [
                    'type' => 'daily',
                    'max_claims_per_user' => 1,
                    'starts_at' => $today->copy()->startOfDay(),
                    'expires_at' => $today->copy()->endOfDay(),
                    'is_active' => true,
                ])
            );
        }

        // Also check for special date vouchers (double day)
        if ($today->day === $today->month) {
            $month = $today->month;
            $monthLabel = $today->format('n.j');
            $specialVouchers = [
                [
                    'code' => 'SARI' . $month . $month . '-SHIP',
                    'name' => $monthLabel . ' Free Shipping',
                    'description' => "Free shipping on ALL orders! {$monthLabel} Sale.",
                    'discount_type' => 'free_shipping',
                    'discount_value' => 0,
                    'min_spend' => 0,
                    'total_quantity' => 2000,
                ],
                [
                    'code' => 'SARI' . $month . $month . '-20OFF',
                    'name' => $monthLabel . ' 20% Off',
                    'description' => "20% off up to P200! {$monthLabel} Sale.",
                    'discount_type' => 'percentage',
                    'discount_value' => 20,
                    'min_spend' => 300,
                    'max_discount' => 200,
                    'total_quantity' => 1000,
                ],
                [
                    'code' => 'SARI' . $month . $month . '-MEGA',
                    'name' => $monthLabel . ' Mega Discount',
                    'description' => "P150 off on orders P999+!",
                    'discount_type' => 'fixed',
                    'discount_value' => 150,
                    'min_spend' => 999,
                    'total_quantity' => 500,
                ],
            ];

            foreach ($specialVouchers as $v) {
                Voucher::firstOrCreate(
                    ['code' => $v['code']],
                    array_merge($v, [
                        'type' => 'special',
                        'max_claims_per_user' => 1,
                        'starts_at' => $today->copy()->startOfDay(),
                        'expires_at' => $today->copy()->endOfDay(),
                        'is_active' => true,
                    ])
                );
            }
        }

        $this->info('Daily vouchers generated for ' . $today->toDateString());
        return Command::SUCCESS;
    }
}
```

- [ ] **Step 2: Register the command in Laravel's scheduler**

In `backend/routes/console.php`, add:

```php
use Illuminate\Support\Facades\Schedule;

Schedule::command('vouchers:generate-daily')->dailyAt('00:01');
```

- [ ] **Step 3: Commit**

```bash
git add backend/app/Console/Commands/GenerateDailyVouchers.php backend/routes/console.php
git commit -m "feat(voucher): add artisan command to auto-generate daily vouchers"
```

---

### Task 6: Frontend — Voucher Types & API Hook

**Files:**
- Create: `frontend/src/types/voucher.ts`
- Create: `frontend/src/hooks/useVouchers.ts`

- [ ] **Step 1: Create voucher types**

```typescript
export interface Voucher {
  id: number;
  code: string;
  name: string;
  description: string | null;
  type: 'daily' | 'special';
  discount_type: 'percentage' | 'fixed' | 'free_shipping';
  discount_value: number;
  min_spend: number;
  max_discount: number | null;
  total_quantity: number | null;
  claimed_count: number;
  max_claims_per_user: number;
  starts_at: string;
  expires_at: string;
  is_active: boolean;
  is_claimed?: boolean; // populated by API for logged-in users
}

export interface VoucherClaim {
  id: number;
  voucher_id: number;
  user_id: number;
  order_id: number | null;
  status: 'claimed' | 'used' | 'expired';
  voucher: Voucher;
}

export interface ApplyVoucherResponse {
  voucher: Voucher;
  discount: number;
  free_shipping: boolean;
  new_subtotal: number;
}
```

- [ ] **Step 2: Create useVouchers hook**

```typescript
'use client';

import { useState, useCallback } from 'react';
import api from '@/lib/api';
import type { Voucher, VoucherClaim, ApplyVoucherResponse } from '@/types/voucher';

export function useVouchers() {
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [claimedVouchers, setClaimedVouchers] = useState<VoucherClaim[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchAvailable = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/api/vouchers');
      setVouchers(data.data);
    } catch {
      // not logged in or error
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMyClaimed = useCallback(async () => {
    try {
      const { data } = await api.get('/api/vouchers/my-claimed');
      setClaimedVouchers(data.data);
    } catch {
      // ignore
    }
  }, []);

  const claimVoucher = async (voucherId: number): Promise<{ success: boolean; error?: string }> => {
    try {
      await api.post('/api/vouchers/claim', { voucher_id: voucherId });
      // Refresh lists
      await fetchAvailable();
      await fetchMyClaimed();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.response?.data?.error || 'Failed to claim voucher' };
    }
  };

  const applyVoucher = async (code: string): Promise<{ success: boolean; data?: ApplyVoucherResponse; error?: string }> => {
    try {
      const { data } = await api.post('/api/vouchers/apply', { code });
      return { success: true, data };
    } catch (err: any) {
      return { success: false, error: err.response?.data?.error || 'Invalid voucher code' };
    }
  };

  return {
    vouchers,
    claimedVouchers,
    loading,
    fetchAvailable,
    fetchMyClaimed,
    claimVoucher,
    applyVoucher,
  };
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/types/voucher.ts frontend/src/hooks/useVouchers.ts
git commit -m "feat(voucher): add frontend voucher types and useVouchers hook"
```

---

### Task 7: Frontend — Voucher Center Banner on Homepage

> **Use `frontend-design:frontend-design` skill** for this task to ensure high design quality.

**Files:**
- Create: `frontend/src/components/VoucherBanner.tsx`
- Modify: `frontend/src/app/page.tsx` (add VoucherBanner to homepage)

- [ ] **Step 1: Create VoucherBanner component**

Build a Lazada/Shopee-inspired voucher banner that shows:
- A horizontal scrollable row of voucher cards
- Each card shows: voucher name, discount value, minimum spend, "Claim" button
- Claimed vouchers show "Claimed" badge instead of button
- Special date vouchers get a flashy gradient background (orange/red)
- Daily vouchers get a subtle gradient (sari-50 to white)
- Countdown timer showing time remaining until expiry
- "Voucher Center" link to see all vouchers

Design reference: Shopee's homepage voucher carousel — compact cards with bold discount amounts, a "Claim" CTA, and a time-limited feel. Use the existing `sari-500`/`sari-600` color scheme for primary actions.

The component should:
1. Call `useVouchers().fetchAvailable()` on mount
2. Render voucher cards in a horizontal scroll container
3. Handle the claim action with loading state and toast notification
4. Show a skeleton loader while fetching

- [ ] **Step 2: Add VoucherBanner to the homepage**

In `frontend/src/app/page.tsx`, import and render `<VoucherBanner />` between the hero section and the product recommendations section.

- [ ] **Step 3: Test in browser**

Start the dev server (`cd frontend && npm run dev`), navigate to the homepage, and verify:
- Voucher banner loads and shows available vouchers
- Claim button works and shows toast
- Scrolling works on mobile viewport
- Special date vouchers (if active) have distinct styling

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/VoucherBanner.tsx frontend/src/app/page.tsx
git commit -m "feat(voucher): add voucher banner component to homepage"
```

---

### Task 8: Frontend — Voucher Application at Checkout

> **Use `frontend-design:frontend-design` skill** for this task.

**Files:**
- Modify: `frontend/src/app/checkout/page.tsx`

- [ ] **Step 1: Add voucher code input section to checkout page**

In the checkout page, add a new section between the Payment Method section and the Order Summary sidebar. This section should include:

1. A text input for entering a voucher code manually
2. An "Apply" button that calls `useVouchers().applyVoucher(code)`
3. A dropdown/expandable section showing the user's claimed vouchers for quick selection
4. Display applied discount in the Order Summary (between Delivery Fee and Total)
5. A "Remove" link to clear the applied voucher

State to add to `CheckoutContent`:
```typescript
const [voucherCode, setVoucherCode] = useState('');
const [appliedVoucher, setAppliedVoucher] = useState<ApplyVoucherResponse | null>(null);
const [applyingVoucher, setApplyingVoucher] = useState(false);
```

Update the total calculation:
```typescript
const discount = appliedVoucher?.discount ?? 0;
const effectiveShipping = appliedVoucher?.free_shipping ? 0 : (deliveryFee ?? 0);
const total = subtotal + effectiveShipping - discount;
```

Pass `voucher_code` in the checkout payload:
```typescript
if (appliedVoucher) {
  payload.voucher_code = appliedVoucher.voucher.code;
}
```

- [ ] **Step 2: Test in browser**

Navigate to checkout with items in cart. Verify:
- Voucher code input appears
- Applying a valid claimed voucher shows discount preview
- Invalid/unclaimed codes show error message
- Discount appears in Order Summary
- Free shipping voucher zeroes out delivery fee
- Order total updates correctly

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/checkout/page.tsx
git commit -m "feat(voucher): add voucher code input and discount display at checkout"
```

---

## Part B: Cart Variant Options Editing

### Task 9: Backend — Cart Variant Update Endpoint

**Files:**
- Create: `backend/app/Http/Requests/UpdateCartVariantRequest.php`
- Modify: `backend/app/Http/Controllers/CartController.php`
- Modify: `backend/app/Services/CartService.php`
- Modify: `backend/routes/api.php`

- [ ] **Step 1: Create UpdateCartVariantRequest**

```php
<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateCartVariantRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'variant_id' => ['required', 'integer', 'exists:product_variants,id'],
        ];
    }
}
```

- [ ] **Step 2: Add `updateVariant` method to CartService**

In `backend/app/Services/CartService.php`, add:

```php
public function updateVariant(int $userId, int $productId, int $variantId): array
{
    $key = $this->cartKey($userId);
    $existing = Redis::hget($key, $productId);

    if (!$existing) {
        throw new \InvalidArgumentException('Product not found in cart.');
    }

    // Validate the variant belongs to the product
    $variant = ProductVariant::where('id', $variantId)
        ->where('product_id', $productId)
        ->where('is_active', true)
        ->first();

    if (!$variant) {
        throw new \InvalidArgumentException('Invalid variant for this product.');
    }

    $decoded = json_decode($existing, true);
    $decoded['variant_id'] = $variantId;
    Redis::hset($key, $productId, json_encode($decoded));
    Redis::expire($key, self::CART_TTL);

    return $this->getCart($userId);
}
```

- [ ] **Step 3: Add controller method**

In `backend/app/Http/Controllers/CartController.php`, add:

```php
public function updateVariant(UpdateCartVariantRequest $request, int $productId): JsonResponse
{
    $validated = $request->validated();

    try {
        $cart = $this->cartService->updateVariant(
            $request->user()->id,
            $productId,
            $validated['variant_id'],
        );

        return response()->json(['items' => $cart]);
    } catch (\InvalidArgumentException $e) {
        return response()->json(['error' => $e->getMessage()], 422);
    }
}
```

Add the import at the top:
```php
use App\Http\Requests\UpdateCartVariantRequest;
```

- [ ] **Step 4: Add route**

In `backend/routes/api.php`, inside the auth group with the other cart routes, add:

```php
Route::put('/cart/{productId}/variant', [CartController::class, 'updateVariant']);
```

- [ ] **Step 5: Commit**

```bash
git add backend/app/Http/Requests/UpdateCartVariantRequest.php backend/app/Http/Controllers/CartController.php backend/app/Services/CartService.php backend/routes/api.php
git commit -m "feat(cart): add endpoint to update cart item variant"
```

---

### Task 10: Frontend — Cart Context Update for Variant Switching

**Files:**
- Modify: `frontend/src/contexts/CartContext.tsx`

- [ ] **Step 1: Add `updateVariant` method to CartContext**

Add to the `CartContextType` interface:
```typescript
updateVariant: (productId: number, variantId: number) => Promise<void>;
```

Add the implementation in `CartProvider`:
```typescript
const updateVariant = async (productId: number, variantId: number) => {
  const { data } = await api.put(`/api/cart/${productId}/variant`, { variant_id: variantId });
  setCart(data);
};
```

Add `updateVariant` to the provider value.

- [ ] **Step 2: Commit**

```bash
git add frontend/src/contexts/CartContext.tsx
git commit -m "feat(cart): add updateVariant to CartContext"
```

---

### Task 11: Frontend — Variant Dropdown in Cart Page

> **Use `frontend-design:frontend-design` skill** for this task.

**Files:**
- Modify: `frontend/src/app/cart/page.tsx`

- [ ] **Step 1: Fetch product variants for each cart item**

Add state and effect to fetch variants for products that have them. When the cart loads, for each item that has a `variant_id`, fetch the product detail to get all available variants:

```typescript
const [productVariants, setProductVariants] = useState<Record<number, any[]>>({});

useEffect(() => {
  // Fetch variants for products in cart that have a variant selected
  cart.items.forEach(async (item) => {
    if (item.variant_id && !productVariants[item.product_id]) {
      try {
        const { data } = await api.get(`/api/products/${item.product.slug}`);
        const product = data.data ?? data;
        if (product.variants?.length > 0) {
          setProductVariants((prev) => ({
            ...prev,
            [item.product_id]: product.variants.filter((v: any) => v.is_active),
          }));
        }
      } catch {
        // ignore — product detail fetch failed
      }
    }
  });
}, [cart.items]);
```

- [ ] **Step 2: Replace static variant badges with dropdown selectors**

In the cart item rendering, replace the current static badge display:

```tsx
{item.variant?.options && Object.keys(item.variant.options).length > 0 && (
  <div className="flex flex-wrap gap-1.5 mt-1">
    {Object.entries(item.variant.options).map(([key, value]) => (
      <span key={key} className="...">
        {key}: {value}
      </span>
    ))}
  </div>
)}
```

With an interactive dropdown for each option key. If the product has variants available in `productVariants[item.product_id]`, render a `<select>` dropdown for each option key (e.g., Color, Size). When the user selects a different combination, find the matching variant and call `updateVariant(item.product_id, matchingVariant.id)`.

Design: compact inline `<select>` elements styled with Tailwind, matching the existing card design. Each select shows the option key as a label (e.g., "Color") and lists all unique values for that key from the available variants. When a selection changes, find the variant that matches all selected options and call the update.

```tsx
{item.variant && productVariants[item.product_id] ? (
  <VariantSelector
    currentVariant={item.variant}
    variants={productVariants[item.product_id]}
    onVariantChange={(variantId) => handleVariantChange(item.product_id, variantId)}
  />
) : item.variant?.options && Object.keys(item.variant.options).length > 0 ? (
  <div className="flex flex-wrap gap-1.5 mt-1">
    {Object.entries(item.variant.options).map(([key, value]) => (
      <span key={key} className="inline-flex items-center text-[11px] font-medium text-gray-600 bg-gray-100 px-2 py-0.5 rounded-md">
        {key}: {value}
      </span>
    ))}
  </div>
) : null}
```

- [ ] **Step 3: Create inline VariantSelector component**

Create the `VariantSelector` as either an inline component within the cart page file or a small separate component. It should:

1. Extract unique option keys from all variants (e.g., ["Color", "Size"])
2. For each key, extract unique values (e.g., Color: ["Red", "Blue", "Black"])
3. Render a `<select>` per option key, pre-selected to the current variant's value
4. On change, find the variant matching all selected options and call `onVariantChange`
5. Show a loading spinner while the variant update API call is in flight

```typescript
function VariantSelector({
  currentVariant,
  variants,
  onVariantChange,
}: {
  currentVariant: { id: number; options: Record<string, string> };
  variants: Array<{ id: number; options: Record<string, string>; is_active: boolean }>;
  onVariantChange: (variantId: number) => void;
}) {
  const [selected, setSelected] = useState<Record<string, string>>(currentVariant.options);
  const [updating, setUpdating] = useState(false);

  const optionKeys = Array.from(
    new Set(variants.flatMap((v) => Object.keys(v.options)))
  );

  const handleChange = async (key: string, value: string) => {
    const newSelected = { ...selected, [key]: value };
    setSelected(newSelected);

    // Find matching variant
    const match = variants.find((v) =>
      optionKeys.every((k) => v.options[k] === newSelected[k])
    );

    if (match && match.id !== currentVariant.id) {
      setUpdating(true);
      onVariantChange(match.id);
      // updating state will be cleared when cart refreshes
    }
  };

  return (
    <div className="flex flex-wrap gap-2 mt-1.5">
      {optionKeys.map((key) => {
        const uniqueValues = Array.from(new Set(variants.map((v) => v.options[key]).filter(Boolean)));
        return (
          <label key={key} className="flex items-center gap-1.5 text-[11px]">
            <span className="font-medium text-gray-500">{key}:</span>
            <select
              value={selected[key] || ''}
              onChange={(e) => handleChange(key, e.target.value)}
              disabled={updating}
              className="text-[11px] font-medium text-gray-700 bg-gray-50 border border-gray-200 rounded-md px-1.5 py-0.5 focus:ring-1 focus:ring-sari-500/30 focus:border-sari-400 outline-none transition-all disabled:opacity-50"
            >
              {uniqueValues.map((val) => (
                <option key={val} value={val}>{val}</option>
              ))}
            </select>
          </label>
        );
      })}
      {updating && <Loader2 className="w-3 h-3 animate-spin text-sari-500" />}
    </div>
  );
}
```

- [ ] **Step 4: Add the variant change handler**

```typescript
const handleVariantChange = async (productId: number, variantId: number) => {
  try {
    await updateVariant(productId, variantId);
    addToast({ type: 'success', title: 'Variant updated' });
  } catch {
    addToast({ type: 'error', title: 'Failed to update variant' });
  }
};
```

Make sure to destructure `updateVariant` from `useCartContext()`.

- [ ] **Step 5: Test in browser**

1. Add a product with variants to the cart
2. Navigate to the cart page
3. Verify dropdowns appear for each variant option (Color, Size, etc.)
4. Change a dropdown value — verify the cart item updates with new variant
5. Verify the price updates if the variant has a different price modifier
6. Test with a product that has NO variants — should show nothing (no broken UI)

- [ ] **Step 6: Commit**

```bash
git add frontend/src/app/cart/page.tsx
git commit -m "feat(cart): add variant option dropdowns for editing in cart page"
```

---

## Part C: Search Bar Fix

### Task 12: Fix Search — Persist Query Text in Search Bar

**Files:**
- Modify: `frontend/src/components/layout/Navbar.tsx`

**Problem:** The Navbar's search bar uses local state (`searchQuery`) initialized to empty string. When the user searches and navigates to `/products?q=red+dress`, the Navbar re-mounts with an empty `searchQuery`, losing the typed text.

**Fix:** Initialize `searchQuery` from the URL's `q` parameter, and use Next.js `useRouter` instead of `window.location.href` to navigate (avoids full page reload).

- [ ] **Step 1: Update Navbar to read query from URL**

Add imports:
```typescript
import { useSearchParams, useRouter } from 'next/navigation';
```

Replace the search-related code:

```typescript
// Replace this:
const [searchQuery, setSearchQuery] = useState('');

const handleSearch = (e: React.FormEvent) => {
  e.preventDefault();
  if (searchQuery.trim()) {
    window.location.href = `/products?q=${encodeURIComponent(searchQuery)}`;
  }
};

// With this:
const searchParams = useSearchParams();
const router = useRouter();
const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');

// Keep searchQuery in sync when URL changes (e.g., browser back/forward)
useEffect(() => {
  setSearchQuery(searchParams.get('q') || '');
}, [searchParams]);

const handleSearch = (e: React.FormEvent) => {
  e.preventDefault();
  if (searchQuery.trim()) {
    router.push(`/products?q=${encodeURIComponent(searchQuery.trim())}`);
  }
};
```

Add `useEffect` to the existing imports from React:
```typescript
import { useState, useEffect } from 'react';
```

**Note:** Navbar must be wrapped in `<Suspense>` when using `useSearchParams()`. Since Navbar is rendered inside every page that already has `<Suspense>`, this should work. However, if errors occur, wrap the Navbar usage in `<Suspense>` at the point of use, or wrap the search-param-dependent portion.

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/layout/Navbar.tsx
git commit -m "fix(search): persist query text in search bar across navigation"
```

---

### Task 13: Fix Search — Filter Products by Search Query

**Files:**
- Modify: `frontend/src/app/products/page.tsx`
- Modify: `backend/app/Http/Controllers/ProductController.php`

**Problem:** The products page reads `?q=` from URL params but does NOT use it to filter products. The `fetchProducts` function calls `/api/products` without passing the search query. The backend `ProductController::index()` has no search/filter-by-name support.

**Fix (two options — implement Option A for simplicity):**

**Option A (recommended): Add `search` param to the existing `/api/products` endpoint.**

This avoids needing Typesense configured and works with the existing product listing flow.

- [ ] **Step 1: Add search filtering to backend ProductController::index**

In `backend/app/Http/Controllers/ProductController.php`, inside the `index` method, after the category filter and before the sort logic, add:

```php
if ($request->filled('search')) {
    $searchTerm = $request->input('search');
    $query->where(function ($q) use ($searchTerm) {
        $q->where('name', 'ILIKE', '%' . $searchTerm . '%')
          ->orWhere('description', 'ILIKE', '%' . $searchTerm . '%')
          ->orWhere('brand', 'ILIKE', '%' . $searchTerm . '%');
    });
}
```

(`ILIKE` is PostgreSQL case-insensitive LIKE. If using MySQL, use `LIKE` — it's case-insensitive by default with utf8 collations.)

- [ ] **Step 2: Update frontend fetchProducts to pass search query**

In `frontend/src/app/products/page.tsx`, modify `fetchProducts` to read the `q` search param and pass it to the API:

```typescript
const fetchProducts = useCallback(async (pageNum = 1, append = false) => {
  if (pageNum === 1) setLoading(true);
  else setLoadingMore(true);

  try {
    const params: Record<string, string | number> = {
      per_page: 20,
      page: pageNum,
      sort: sortBy,
    };
    if (activeCategory !== 'all') params.category = activeCategory;

    // Pass search query to API
    const q = searchParams.get('q');
    if (q) params.search = q;

    const res = await api.get('/api/products', { params });
    const data = res.data;
    const newProducts: Product[] = data.data ?? [];

    if (append) {
      setProducts((prev) => [...prev, ...newProducts]);
    } else {
      setProducts(newProducts);
    }

    setHasMore(data.current_page < data.last_page);
    setPage(data.current_page);
  } catch {
    if (!append) setProducts([]);
  } finally {
    setLoading(false);
    setLoadingMore(false);
  }
}, [activeCategory, sortBy, searchParams]);
```

Note the addition of `searchParams` to the dependency array. This ensures `fetchProducts` is re-called when the search query changes.

- [ ] **Step 3: Show the search query in the page header**

Update the page header to indicate a search is active:

```tsx
<h1 className="font-display text-3xl md:text-4xl text-gray-900 tracking-tight">
  {searchParams.get('q')
    ? <>Search: &ldquo;{searchParams.get('q')}&rdquo;</>
    : 'All Products'}
</h1>
```

- [ ] **Step 4: Add a "Clear Search" button when search is active**

Near the product count display, add a button to clear the search:

```tsx
{searchParams.get('q') && (
  <button
    onClick={() => {
      const url = new URL(window.location.href);
      url.searchParams.delete('q');
      window.location.href = url.toString();
    }}
    className="text-sm text-sari-600 hover:text-sari-700 font-medium transition-colors"
  >
    Clear search &times;
  </button>
)}
```

- [ ] **Step 5: Test in browser**

1. Type "red dress" in the search bar and press Enter
2. Verify: URL changes to `/products?q=red+dress`
3. Verify: only products matching "red dress" in name/description/brand are shown
4. Verify: the search bar still shows "red dress" (not empty)
5. Verify: the page header shows 'Search: "red dress"'
6. Verify: clicking "Clear search" removes the filter and shows all products
7. Verify: browser back button works correctly (search query restores)
8. Verify: category filtering still works alongside search

- [ ] **Step 6: Commit**

```bash
git add frontend/src/app/products/page.tsx backend/app/Http/Controllers/ProductController.php
git commit -m "fix(search): wire search query to product filtering API and persist in UI"
```

---

## Part D: Product Image Display Fix

### Root Cause Analysis

After investigating the image handling pipeline, there are **5 identified issues** causing product images to not display:

1. **Missing placeholder image** — `ProductCard.tsx:28` references `/placeholder-product.png` which does NOT exist in `frontend/public/`. When real images fail to load, the fallback also fails, resulting in a broken image icon.
2. **Supabase URL construction** — `ImageService.php:26` uses `Storage::disk('supabase')->url()` which relies on the S3 driver's URL generation. Depending on the driver version and config, this may produce an S3-style URL (e.g., `https://...storage.supabase.co/s3/product-images/products/uuid.jpg`) instead of the correct Supabase public URL format (`https://...supabase.co/storage/v1/object/public/product-images/products/uuid.jpg`).
3. **Empty `next.config.ts`** — No `remotePatterns` configured for Supabase domains. While currently using raw `<img>` tags (not `next/image`), this prevents any future migration to `next/image` and is a best practice gap.
4. **Supabase bucket RLS policies** — If the `product-images` bucket is private or lacks a public read policy for anonymous users, image URLs will return 403 Forbidden.
5. **No backend image proxy** — If Supabase is unreachable (CORS, bucket config, or credentials issue), there's no fallback path to serve images.

### Alternative Approaches Considered

| Approach | Pros | Cons |
|----------|------|------|
| **A. Fix Supabase URL + add proxy fallback** (recommended) | Fixes root cause, keeps Supabase CDN benefits, adds resilience | Requires Supabase dashboard access for RLS |
| **B. Switch to Laravel local storage** | No external dependency, simple | No CDN, images served from app server, slow |
| **C. Backend image proxy endpoint** | Bypasses CORS/RLS entirely, works everywhere | Double bandwidth (Supabase→Laravel→Browser), defeats CDN purpose |
| **D. Use Supabase signed URLs** | Works even with private buckets | URLs expire, extra API call per image, complex |

**Recommended: Approach A + partial C as fallback.** Fix the Supabase URL construction, ensure the bucket is public, add a placeholder image, configure `next.config.ts`, and add a lightweight backend proxy endpoint as a fallback for when Supabase URLs fail.

---

### Task 14: Add Missing Placeholder Image

**Files:**
- Create: `frontend/public/placeholder-product.png`

- [ ] **Step 1: Generate a placeholder product image**

Create a simple, clean placeholder image at `frontend/public/placeholder-product.png`. This should be a neutral gray/sari-toned image (e.g., 400x500px) with a shopping bag or package icon silhouette in the center. Options:

**Option A (quick):** Use a data URI SVG as a temporary solution — create a simple SVG file and save as PNG.

**Option B (recommended):** Download or generate a proper placeholder. Create a simple one with an inline script:

```bash
cd frontend/public
# Create a simple SVG placeholder and convert, OR use a publicly available placeholder
# For now, create a minimal SVG-based placeholder
```

Create the file `frontend/public/placeholder-product.svg` as an alternative that works everywhere:

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="400" height="500" viewBox="0 0 400 500" fill="none">
  <rect width="400" height="500" fill="#F9FAFB"/>
  <rect x="1" y="1" width="398" height="498" rx="7" stroke="#E5E7EB" stroke-width="2"/>
  <path d="M200 200 L230 250 H170 Z" fill="#D1D5DB"/>
  <rect x="175" y="250" width="50" height="40" rx="4" fill="#D1D5DB"/>
  <circle cx="200" cy="230" r="20" fill="#E5E7EB"/>
  <text x="200" y="320" text-anchor="middle" fill="#9CA3AF" font-family="system-ui" font-size="14" font-weight="500">No Image</text>
</svg>
```

Then update all references from `/placeholder-product.png` to `/placeholder-product.svg` in:
- `frontend/src/components/ProductCard.tsx` (lines 28, 49)

Or alternatively, keep the `.png` reference and also place a proper PNG file (can convert the SVG to PNG using any tool, or use a free stock placeholder).

- [ ] **Step 2: Commit**

```bash
git add frontend/public/placeholder-product.svg frontend/src/components/ProductCard.tsx
git commit -m "fix(images): add missing placeholder product image"
```

---

### Task 15: Fix Supabase Image URL Construction

**Files:**
- Modify: `backend/app/Services/ImageService.php`
- Modify: `backend/config/filesystems.php`

**Problem:** The S3 driver's `->url()` method may construct URLs using the S3 endpoint format rather than the Supabase public storage format. The correct Supabase public URL format is:

```
https://<project-ref>.supabase.co/storage/v1/object/public/<bucket>/<path>
```

But the S3 driver may generate:

```
https://<project-ref>.storage.supabase.co/storage/v1/s3/<bucket>/<path>
```

- [ ] **Step 1: Update ImageService to construct Supabase public URL explicitly**

In `backend/app/Services/ImageService.php`, replace the `upload` method's return line:

```php
public function upload(UploadedFile $file, string $directory = 'products'): string
{
    // UUID filename prevents path traversal and filename collisions
    $filename = $directory . '/' . Str::uuid() . '.' . $file->getClientOriginalExtension();
    Storage::disk($this->disk)->put($filename, file_get_contents($file));

    // Construct the public URL explicitly using SUPABASE_PUBLIC_URL
    // instead of relying on the S3 driver's url() which may produce
    // an incorrect format for Supabase
    $publicUrl = rtrim(config('filesystems.disks.supabase.url'), '/');
    return $publicUrl . '/' . $filename;
}
```

This ensures the URL is always in the format:
`https://<ref>.supabase.co/storage/v1/object/public/product-images/products/<uuid>.jpg`

- [ ] **Step 2: Add a diagnostic artisan command to verify existing image URLs**

Create `backend/app/Console/Commands/VerifyImageUrls.php`:

```php
<?php

namespace App\Console\Commands;

use App\Models\ProductImage;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;

class VerifyImageUrls extends Command
{
    protected $signature = 'images:verify {--fix : Auto-fix URLs with wrong format}';
    protected $description = 'Verify product image URLs are accessible and fix malformed URLs';

    public function handle(): int
    {
        $images = ProductImage::all();
        $publicBase = rtrim(config('filesystems.disks.supabase.url'), '/');
        $broken = 0;
        $fixed = 0;

        foreach ($images as $image) {
            $url = $image->url;

            // Check if URL uses the S3 endpoint format instead of public format
            if (str_contains($url, '.storage.supabase.co/storage/v1/s3/')) {
                $this->warn("Malformed URL (S3 format): {$url}");
                $broken++;

                if ($this->option('fix')) {
                    // Extract the path after the bucket name
                    preg_match('/\/s3\/[^\/]+\/(.+)$/', $url, $matches);
                    if (!empty($matches[1])) {
                        $newUrl = $publicBase . '/' . $matches[1];
                        $image->update(['url' => $newUrl]);
                        $this->info("  Fixed → {$newUrl}");
                        $fixed++;
                    }
                }
                continue;
            }

            // Check if URL is accessible (HEAD request, 2s timeout)
            if (str_starts_with($url, 'http')) {
                try {
                    $response = Http::timeout(2)->head($url);
                    if ($response->failed()) {
                        $this->warn("Unreachable ({$response->status()}): {$url}");
                        $broken++;
                    }
                } catch (\Exception $e) {
                    $this->warn("Unreachable (timeout): {$url}");
                    $broken++;
                }
            } else {
                $this->warn("Relative URL (not Supabase): {$url}");
                $broken++;

                if ($this->option('fix')) {
                    $newUrl = $publicBase . '/' . ltrim($url, '/');
                    $image->update(['url' => $newUrl]);
                    $this->info("  Fixed → {$newUrl}");
                    $fixed++;
                }
            }
        }

        $this->info("Total images: {$images->count()}, Broken: {$broken}, Fixed: {$fixed}");
        return Command::SUCCESS;
    }
}
```

- [ ] **Step 3: Run the verifier to diagnose and fix existing URLs**

```bash
cd backend && php artisan images:verify
# Review output, then fix if needed:
cd backend && php artisan images:verify --fix
```

- [ ] **Step 4: Commit**

```bash
git add backend/app/Services/ImageService.php backend/app/Console/Commands/VerifyImageUrls.php
git commit -m "fix(images): construct Supabase public URLs explicitly + add URL verifier"
```

---

### Task 16: Configure Next.js for Supabase Images

**Files:**
- Modify: `frontend/next.config.ts`

- [ ] **Step 1: Add Supabase domain to `remotePatterns`**

> **Important:** Read the Next.js docs at `node_modules/next/dist/docs/` before editing, per the project's AGENTS.md instructions.

Update `frontend/next.config.ts`:

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
};

export default nextConfig;
```

This allows `next/image` to optimize Supabase-hosted images. Even though the project currently uses raw `<img>` tags, this config:
- Enables future migration to `next/image` for automatic optimization
- Documents the allowed external image domains
- Prevents cryptic errors if any component switches to `next/image`

- [ ] **Step 2: Commit**

```bash
git add frontend/next.config.ts
git commit -m "fix(images): configure Next.js remotePatterns for Supabase domain"
```

---

### Task 17: Add Backend Image Proxy Endpoint (Fallback)

**Files:**
- Create: `backend/app/Http/Controllers/ImageProxyController.php`
- Modify: `backend/routes/api.php`

**Purpose:** When Supabase images fail to load on the frontend (CORS issues, bucket misconfiguration, temporary outages), the frontend can fall back to a backend proxy that fetches and streams the image. This is a safety net, not the primary delivery path.

- [ ] **Step 1: Create ImageProxyController**

```php
<?php

namespace App\Http\Controllers;

use App\Models\ProductImage;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Cache;

class ImageProxyController extends Controller
{
    /**
     * Proxy a product image through the backend.
     * Used as a fallback when Supabase CDN is unreachable from the client.
     *
     * Caches the image response for 1 hour to avoid hammering Supabase.
     */
    public function show(int $imageId)
    {
        $image = ProductImage::findOrFail($imageId);
        $url = $image->url;

        if (!$url || !str_starts_with($url, 'http')) {
            abort(404);
        }

        $cacheKey = 'img_proxy:' . $imageId;

        $cached = Cache::get($cacheKey);
        if ($cached) {
            return response($cached['body'])
                ->header('Content-Type', $cached['content_type'])
                ->header('Cache-Control', 'public, max-age=3600');
        }

        try {
            $response = Http::timeout(5)->get($url);

            if ($response->failed()) {
                abort(404);
            }

            $contentType = $response->header('Content-Type') ?? 'image/jpeg';
            $body = $response->body();

            // Cache for 1 hour
            Cache::put($cacheKey, [
                'body' => $body,
                'content_type' => $contentType,
            ], 3600);

            return response($body)
                ->header('Content-Type', $contentType)
                ->header('Cache-Control', 'public, max-age=3600');
        } catch (\Exception $e) {
            abort(404);
        }
    }
}
```

- [ ] **Step 2: Add route**

In `backend/routes/api.php`, inside the public `throttle:public-api` group, add:

```php
Route::get('/images/{imageId}', [App\Http\Controllers\ImageProxyController::class, 'show']);
```

- [ ] **Step 3: Commit**

```bash
git add backend/app/Http/Controllers/ImageProxyController.php backend/routes/api.php
git commit -m "fix(images): add backend image proxy endpoint as fallback"
```

---

### Task 18: Frontend — Add Image Fallback Chain

**Files:**
- Modify: `frontend/src/components/ProductCard.tsx`
- Modify: `frontend/src/app/cart/page.tsx`

**Current behavior:** When an image fails to load, `onError` sets `imageFailed = true` and shows `/placeholder-product.png` (which doesn't exist).

**New behavior:** Implement a fallback chain:
1. Try Supabase URL (primary) → if fails →
2. Try backend proxy URL (`/api/images/{imageId}`) → if fails →
3. Show SVG placeholder

- [ ] **Step 1: Update ProductCard image fallback chain**

In `frontend/src/components/ProductCard.tsx`, update the image handling:

```typescript
const hasRealImage = !!product.primary_image?.url;
const primaryUrl = product.primary_image?.url ?? null;
const proxyUrl = product.primary_image?.id
  ? `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/images/${product.primary_image.id}`
  : null;
const placeholderUrl = '/placeholder-product.svg';

const [imageLoaded, setImageLoaded] = useState(!hasRealImage);
const [failedUrls, setFailedUrls] = useState<Set<string>>(new Set());

// Determine current image URL based on what's failed
const imageUrl = (() => {
  if (primaryUrl && !failedUrls.has(primaryUrl)) return primaryUrl;
  if (proxyUrl && !failedUrls.has(proxyUrl)) return proxyUrl;
  return placeholderUrl;
})();

const handleImageError = () => {
  setFailedUrls((prev) => {
    const next = new Set(prev);
    next.add(imageUrl);
    return next;
  });
};
```

Then in the JSX, use `imageUrl` and `handleImageError`:
```tsx
<img
  src={imageUrl}
  alt={product.primary_image?.alt_text ?? product.name}
  className={cn(
    'absolute inset-0 w-full h-full object-cover transition-all duration-500 group-hover:scale-105',
    imageLoaded ? 'opacity-100' : 'opacity-0',
  )}
  onLoad={() => setImageLoaded(true)}
  onError={handleImageError}
/>
```

- [ ] **Step 2: Update cart page image fallback**

In `frontend/src/app/cart/page.tsx`, apply a similar pattern. The cart items don't have `primary_image.id` directly, so just add the placeholder fallback:

```tsx
{item.product.image_url ? (
  <img
    src={item.product.image_url}
    alt={item.product.name}
    className="w-full h-full object-cover"
    onError={(e) => {
      const target = e.target as HTMLImageElement;
      if (!target.dataset.fallback) {
        target.dataset.fallback = '1';
        target.src = '/placeholder-product.svg';
      }
    }}
  />
) : (
  <Package className="w-8 h-8 text-gray-300" strokeWidth={1.5} />
)}
```

- [ ] **Step 3: Test in browser**

1. Open the products page — check that images load from Supabase
2. If images don't load, open browser DevTools Network tab:
   - Check the image URL format — does it match `https://<ref>.supabase.co/storage/v1/object/public/...`?
   - Check for 403 (RLS/bucket policy issue) or 404 (wrong path)
   - Check for CORS errors in the console
3. Verify placeholder shows for products with no image
4. Verify the fallback chain works: block Supabase domain in DevTools → should fall back to proxy → then placeholder

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/ProductCard.tsx frontend/src/app/cart/page.tsx
git commit -m "fix(images): add fallback chain (Supabase → proxy → placeholder)"
```

---

### Task 19: Supabase Bucket Configuration Checklist

This is a manual verification task — no code changes, but critical for images to work.

- [ ] **Step 1: Verify Supabase bucket is public**

1. Log in to the Supabase dashboard at `https://app.supabase.com`
2. Navigate to **Storage** → **Buckets**
3. Find the `product-images` bucket
4. Verify it is set to **Public** (not Private)
5. If private, click the bucket settings and toggle to Public

- [ ] **Step 2: Add RLS policy for public read access**

Even with a public bucket, RLS policies may block access. In the Supabase dashboard:

1. Go to **Storage** → **Policies**
2. For the `product-images` bucket, add this policy if not present:
   - **Name:** `Public read access`
   - **Operation:** `SELECT`
   - **Target Roles:** `anon, authenticated`
   - **Policy:** `true` (allow all reads)

SQL equivalent (run in Supabase SQL Editor):
```sql
CREATE POLICY "Public read access for product images"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'product-images');
```

- [ ] **Step 3: Test direct image URL access**

Take any image URL from the `product_images` table and open it directly in a browser (incognito mode, no auth). It should load. If it returns 403 or redirects to an error, the bucket/RLS configuration needs further adjustment.

- [ ] **Step 4: Verify CORS**

In the Supabase dashboard, check if CORS is configured to allow requests from your frontend domain. Supabase Storage typically allows all origins for public buckets, but verify by:

1. Open browser DevTools → Console
2. Load a product page
3. Look for CORS errors like `Access-Control-Allow-Origin` missing
4. If present, you may need to configure CORS in the Supabase project settings, or use the backend proxy (Task 17) as the primary image source

- [ ] **Step 5: Document findings**

After verification, note which step resolved the issue so the team knows the root cause.

---

## Part E: Final Verification

### Task 20: End-to-End Testing

- [ ] **Step 1: Test voucher system end-to-end**

1. Run `php artisan vouchers:generate-daily` to create today's vouchers
2. Log in as a user
3. Visit homepage — verify voucher banner shows daily vouchers
4. Claim a free shipping voucher
5. Add items to cart totaling P300+
6. Go to checkout, enter the voucher code
7. Verify free shipping is applied and discount shows in order summary
8. Place the order — verify the order total reflects the discount

- [ ] **Step 2: Test cart variant editing end-to-end**

1. Add a product with multiple variants (e.g., different colors/sizes) to the cart
2. Go to cart page
3. Change the color/size from the dropdown
4. Verify the variant updates, variant badges change, and price adjusts if applicable

- [ ] **Step 3: Test search end-to-end**

1. Search for a specific product name
2. Verify only matching products appear
3. Verify search text persists in the search bar
4. Navigate away and come back — verify search still works
5. Test empty search results (search for gibberish)
6. Test search + category filter combination

- [ ] **Step 4: Test product images end-to-end**

1. Run `php artisan images:verify` to check all image URLs
2. Open products page — verify images load
3. Open a product detail page — verify image gallery works
4. Open cart with items — verify cart item images show
5. Block Supabase domain in DevTools → verify proxy fallback works
6. Remove all image sources → verify SVG placeholder appears
7. Check browser console for any remaining CORS or 404 errors

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "feat: module 33 — voucher system, cart variant editing, search fix, image fix"
```

---

## Summary

| Feature | Backend Changes | Frontend Changes |
|---------|----------------|-----------------|
| **Voucher System** | 2 new migrations, 2 new models, 1 controller, 2 form requests, 1 artisan command, checkout integration | Types, hook, VoucherBanner component, checkout voucher input |
| **Cart Variant Editing** | 1 new form request, CartService + CartController methods, 1 new route | CartContext method, VariantSelector component in cart page |
| **Search Fix** | 1 line added to ProductController (search filter) | Navbar: persist query from URL; Products page: pass `q` to API |
| **Image Display Fix** | ImageService URL fix, image URL verifier command, image proxy endpoint | Placeholder SVG, fallback chain (Supabase→proxy→placeholder), Next.js remotePatterns, Supabase bucket/RLS checklist |
