# Module 8: AI Recommendations (Recombee)

> **For agentic workers:** REQUIRED: Implement this plan task-by-task.
> Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate Recombee for AI-powered product recommendations including
personalized "for you" recommendations, similar product suggestions, and
interaction tracking (views, cart additions, purchases).

**Architecture:** RecommendationService wraps the Recombee PHP SDK.
User interactions are tracked via queued jobs (SyncInteractionToRecombee)
to avoid blocking the request. Graceful fallbacks return popular/category
products if Recombee is unavailable.

**Tech Stack:** Recombee PHP SDK, RabbitMQ (for async interaction syncing)

---

## 🔒 Security Context

- **API Key Security:** `RECOMBEE_PRIVATE_TOKEN` is backend-only. NEVER exposed to frontend.
- **No Direct Frontend Access:** All recommendation requests go through the Laravel API.
  The frontend never talks to Recombee directly.
- **Graceful Degradation:** If Recombee is down or misconfigured, the app falls back
  to database queries — no errors shown to users.

---

## Files

- Modify: `backend/config/services.php`
- Create: `backend/app/Services/RecommendationService.php`
- Create: `backend/app/Jobs/SyncInteractionToRecombee.php`
- Create: `backend/app/Http/Controllers/RecommendationController.php`

---

### Task 8.1: Recombee Recommendation Service

- [ ] **Step 1: Add Recombee config to services.php**

File: `backend/config/services.php` — add:

```php
'recombee' => [
    'database_id' => env('RECOMBEE_DATABASE_ID'),
    'private_token' => env('RECOMBEE_PRIVATE_TOKEN'),
    'region' => env('RECOMBEE_REGION', 'ap-se'),
],
```

- [ ] **Step 2: Create RecommendationService**

Create file: `backend/app/Services/RecommendationService.php`

```php
<?php

namespace App\Services;

use Recombee\RecommApi\Client;
use Recombee\RecommApi\Requests as Reqs;
use Illuminate\Support\Facades\Log;

class RecommendationService
{
    private Client $client;

    public function __construct()
    {
        $this->client = new Client(
            config('services.recombee.database_id'),
            config('services.recombee.private_token'),
            ['region' => config('services.recombee.region')]
        );
    }

    public function addDetailView(int $userId, int $productId): void
    {
        try {
            $this->client->send(new Reqs\AddDetailView(
                (string) $userId,
                (string) $productId,
                ['cascadeCreate' => true, 'timestamp' => time()]
            ));
        } catch (\Exception $e) {
            Log::warning('Recombee addDetailView failed', ['error' => $e->getMessage()]);
        }
    }

    public function addCartAddition(int $userId, int $productId, int $amount = 1): void
    {
        try {
            $this->client->send(new Reqs\AddCartAddition(
                (string) $userId,
                (string) $productId,
                ['cascadeCreate' => true, 'amount' => $amount]
            ));
        } catch (\Exception $e) {
            Log::warning('Recombee addCartAddition failed', ['error' => $e->getMessage()]);
        }
    }

    public function addPurchase(int $userId, int $productId, int $amount = 1): void
    {
        try {
            $this->client->send(new Reqs\AddPurchase(
                (string) $userId,
                (string) $productId,
                ['cascadeCreate' => true, 'amount' => $amount]
            ));
        } catch (\Exception $e) {
            Log::warning('Recombee addPurchase failed', ['error' => $e->getMessage()]);
        }
    }

    public function recommendForUser(int $userId, int $count = 10): array
    {
        try {
            $response = $this->client->send(new Reqs\RecommendItemsToUser(
                (string) $userId,
                $count,
                ['cascadeCreate' => true, 'returnProperties' => true]
            ));

            return $response['recomms'] ?? [];
        } catch (\Exception $e) {
            Log::warning('Recombee recommendForUser failed', ['error' => $e->getMessage()]);
            return [];
        }
    }

    public function recommendSimilar(int $productId, int $count = 10): array
    {
        try {
            $response = $this->client->send(new Reqs\RecommendItemsToItem(
                (string) $productId,
                null,
                $count,
                ['cascadeCreate' => true, 'returnProperties' => true]
            ));

            return $response['recomms'] ?? [];
        } catch (\Exception $e) {
            Log::warning('Recombee recommendSimilar failed', ['error' => $e->getMessage()]);
            return [];
        }
    }

    public function syncProduct(array $product): void
    {
        try {
            $this->client->send(new Reqs\SetItemValues(
                (string) $product['id'],
                [
                    'name' => $product['name'],
                    'category' => $product['category'] ?? '',
                    'base_price' => (float) $product['base_price'],
                    'brand' => $product['brand'] ?? '',
                ],
                ['cascadeCreate' => true]
            ));
        } catch (\Exception $e) {
            Log::warning('Recombee syncProduct failed', ['error' => $e->getMessage()]);
        }
    }
}
```

- [ ] **Step 3: Create SyncInteractionToRecombee job**

Create file: `backend/app/Jobs/SyncInteractionToRecombee.php`

```php
<?php

namespace App\Jobs;

use App\Services\RecommendationService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class SyncInteractionToRecombee implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(
        private string $interactionType,
        private int $userId,
        private int $productId,
        private int $amount = 1,
    ) {}

    public function handle(RecommendationService $service): void
    {
        match ($this->interactionType) {
            'view' => $service->addDetailView($this->userId, $this->productId),
            'cart' => $service->addCartAddition($this->userId, $this->productId, $this->amount),
            'purchase' => $service->addPurchase($this->userId, $this->productId, $this->amount),
            default => null,
        };
    }
}
```

- [ ] **Step 4: Create RecommendationController**

Create file: `backend/app/Http/Controllers/RecommendationController.php`

```php
<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Services\RecommendationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RecommendationController extends Controller
{
    public function __construct(private RecommendationService $recombee) {}

    /**
     * Public — returns popular/featured products (no auth required).
     */
    public function popular(): JsonResponse
    {
        $products = Product::where('status', 'active')
            ->where('is_featured', true)
            ->orderByDesc('view_count')
            ->limit(12)
            ->with('primaryImage', 'category')
            ->get();

        return response()->json(['data' => $products]);
    }

    /**
     * Authenticated — returns personalized recommendations.
     * Falls back to popular items if Recombee returns nothing.
     */
    public function forUser(Request $request): JsonResponse
    {
        $recommendations = $this->recombee->recommendForUser(
            $request->user()->id,
            12
        );

        if (empty($recommendations)) {
            return $this->popular();
        }

        $productIds = collect($recommendations)->pluck('id')->toArray();
        $products = Product::whereIn('id', $productIds)
            ->with('primaryImage', 'category')
            ->get();

        return response()->json(['data' => $products]);
    }

    /**
     * Public — returns products similar to the given product.
     * Falls back to same-category products if Recombee returns nothing.
     */
    public function similarTo(Product $product): JsonResponse
    {
        $recommendations = $this->recombee->recommendSimilar(
            $product->id,
            8
        );

        if (empty($recommendations)) {
            $products = Product::where('category_id', $product->category_id)
                ->where('id', '!=', $product->id)
                ->where('status', 'active')
                ->limit(8)
                ->with('primaryImage')
                ->get();

            return response()->json(['data' => $products]);
        }

        $productIds = collect($recommendations)->pluck('id')->toArray();
        $products = Product::whereIn('id', $productIds)
            ->with('primaryImage')
            ->get();

        return response()->json(['data' => $products]);
    }
}
```

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "feat: add Recombee recommendation service and controller"
```
