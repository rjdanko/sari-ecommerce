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
