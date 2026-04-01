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
