<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        // Find products that have images but none marked as primary,
        // then set the first image (lowest sort_order) as primary.
        // SQLite does not support ALTER TABLE ... DROP/ADD CONSTRAINT; skip in test environments.
        $castExpr = DB::getDriverName() === 'sqlite' ? 'SUM(CAST(is_primary AS INTEGER)) = 0' : 'SUM(is_primary::int) = 0';
        $productsWithoutPrimary = DB::table('product_images')
            ->select('product_id')
            ->groupBy('product_id')
            ->havingRaw($castExpr)
            ->pluck('product_id');

        foreach ($productsWithoutPrimary as $productId) {
            $firstImage = DB::table('product_images')
                ->where('product_id', $productId)
                ->orderBy('sort_order')
                ->orderBy('id')
                ->first();

            if ($firstImage) {
                DB::table('product_images')
                    ->where('id', $firstImage->id)
                    ->update(['is_primary' => true]);
            }
        }
    }

    public function down(): void
    {
        // No rollback needed — this is a data fix
    }
};
