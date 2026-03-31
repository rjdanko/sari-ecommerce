# Module 7: Search (Typesense + Laravel Scout)

> **For agentic workers:** REQUIRED: Implement this plan task-by-task.
> Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Configure Typesense search via Laravel Scout and create the
SearchController with validated, rate-limited search.

**Architecture:** Laravel Scout indexes products to Typesense. Frontend searches
via the backend API (rate-limited). Optionally, the frontend can also query
Typesense directly using a search-only API key for instant search.

**Tech Stack:** Typesense, Laravel Scout

---

## 🔒 Security Context

- **API Key Security:** The Typesense admin API key stays backend-only. A separate
  search-only key (created in Module 1, Task 1.3, Step 4) is used for frontend.
- **Rate Limiting:** Search endpoint has its own rate limit: 30 requests/min per IP.
- **Input Validation:** Search query validated via `SearchRequest` Form Request.
- **SQL Injection:** Not applicable — Typesense uses its own query language, not SQL.
  However, the SearchHistory insert uses Eloquent (parameterized).

---

## Files

- Modify: `backend/config/scout.php`
- Create: `backend/app/Http/Controllers/SearchController.php`
- Create: `frontend/src/lib/typesense.ts`

---

### Task 7.1: Typesense Configuration

- [ ] **Step 1: Configure Scout for Typesense**

File: `backend/config/scout.php` — set the driver and Typesense config:

```php
'driver' => env('SCOUT_DRIVER', 'typesense'),

'typesense' => [
    'api_key' => env('TYPESENSE_API_KEY', ''),
    'nodes' => [
        [
            'host' => env('TYPESENSE_HOST', 'localhost'),
            'port' => env('TYPESENSE_PORT', '8108'),
            'protocol' => env('TYPESENSE_PROTOCOL', 'http'),
        ],
    ],
    'nearest_node' => null,
    'connection_timeout_seconds' => 2,
    'healthcheck_interval_seconds' => 30,
    'num_retries' => 3,
    'retry_interval_seconds' => 1,
],
```

> **🔒 NOTE:** `TYPESENSE_API_KEY` in `.env` is the **admin key**. It stays on
> the backend ONLY. The frontend uses `NEXT_PUBLIC_TYPESENSE_SEARCH_ONLY_KEY`.

- [ ] **Step 2: Create SearchController**

Create file: `backend/app/Http/Controllers/SearchController.php`

> **🔒 SECURITY:**
> - Uses `SearchRequest` Form Request for input validation (max 255 chars, valid sort values only)
> - Filters are applied via Scout's builder — no raw SQL
> - Search history only recorded for authenticated users (privacy-controlled)

```php
<?php

namespace App\Http\Controllers;

use App\Http\Requests\SearchRequest;
use App\Models\Product;
use App\Models\SearchHistory;
use Illuminate\Http\JsonResponse;

class SearchController extends Controller
{
    public function search(SearchRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $query = Product::search($validated['q']);

        // Apply filters — all values are validated by SearchRequest
        if (! empty($validated['category'])) {
            $query->where('category', $validated['category']);
        }
        if (! empty($validated['min_price'])) {
            $query->where('base_price', '>=', (float) $validated['min_price']);
        }
        if (! empty($validated['max_price'])) {
            $query->where('base_price', '<=', (float) $validated['max_price']);
        }

        $perPage = $validated['per_page'] ?? 20;
        $results = $query->paginate($perPage);

        // Record search history for logged-in users
        if ($request->user()) {
            SearchHistory::create([
                'user_id' => $request->user()->id,
                'query' => $validated['q'],
                'results_count' => $results->total(),
            ]);
        }

        return response()->json($results);
    }
}
```

- [ ] **Step 3: Create frontend Typesense client**

Create file: `frontend/src/lib/typesense.ts`

> **🔒 SECURITY:** This client uses the SEARCH-ONLY API key. It can only
> search documents — it cannot create, update, or delete anything in Typesense.

```typescript
import Typesense from 'typesense';

// 🔒 This key is search-only — it cannot modify data
const typesenseClient = new Typesense.Client({
  nodes: [
    {
      host: process.env.NEXT_PUBLIC_TYPESENSE_HOST || 'localhost',
      port: parseInt(process.env.NEXT_PUBLIC_TYPESENSE_PORT || '8108'),
      protocol: process.env.NEXT_PUBLIC_TYPESENSE_PROTOCOL || 'http',
    },
  ],
  apiKey: process.env.NEXT_PUBLIC_TYPESENSE_SEARCH_ONLY_KEY || '',
  connectionTimeoutSeconds: 2,
});

export default typesenseClient;
```

- [ ] **Step 4: Import existing products to Typesense**

```bash
php artisan scout:import "App\Models\Product"
```
Expected: All active products synced to Typesense collection.

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "feat: add Typesense search with Scout and SearchController"
```
