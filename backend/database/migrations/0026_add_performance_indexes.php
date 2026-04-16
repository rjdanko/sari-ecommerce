<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Products
        Schema::table('products', function (Blueprint $table) {
            $table->index('status', 'idx_products_status');
            $table->index(['category_id', 'status'], 'idx_products_category_status');
            $table->index('business_id', 'idx_products_business_id');
            $table->index('slug', 'idx_products_slug');
            $table->index('is_featured', 'idx_products_is_featured');
        });

        // Product images
        Schema::table('product_images', function (Blueprint $table) {
            $table->index(['product_id', 'is_primary'], 'idx_product_images_product_primary');
        });

        // Orders
        Schema::table('orders', function (Blueprint $table) {
            $table->index('user_id', 'idx_orders_user_id');
            $table->index('status', 'idx_orders_status');
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropIndex('idx_products_status');
            $table->dropIndex('idx_products_category_status');
            $table->dropIndex('idx_products_business_id');
            $table->dropIndex('idx_products_slug');
            $table->dropIndex('idx_products_is_featured');
        });

        Schema::table('product_images', function (Blueprint $table) {
            $table->dropIndex('idx_product_images_product_primary');
        });

        Schema::table('orders', function (Blueprint $table) {
            $table->dropIndex('idx_orders_user_id');
            $table->dropIndex('idx_orders_status');
        });
    }
};
