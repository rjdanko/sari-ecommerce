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
