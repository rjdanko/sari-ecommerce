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
            $table->decimal('min_spend', 10, 2)->default(0);
            $table->decimal('max_discount', 10, 2)->nullable();
            $table->integer('total_quantity')->nullable();
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
