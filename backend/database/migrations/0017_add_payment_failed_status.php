<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // SQLite does not support ALTER TABLE ... DROP/ADD CONSTRAINT; skip in test environments.
        if (DB::getDriverName() !== 'sqlite') {
            DB::statement('ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check');

            DB::statement("ALTER TABLE orders ADD CONSTRAINT orders_status_check CHECK (status::text = ANY (ARRAY['pending'::text, 'pending_confirmation'::text, 'confirmed'::text, 'processing'::text, 'paid'::text, 'shipped'::text, 'delivered'::text, 'cancelled'::text, 'refunded'::text, 'payment_failed'::text]))");
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() !== 'sqlite') {
            DB::statement('ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check');

            DB::statement("ALTER TABLE orders ADD CONSTRAINT orders_status_check CHECK (status::text = ANY (ARRAY['pending'::text, 'pending_confirmation'::text, 'confirmed'::text, 'processing'::text, 'paid'::text, 'shipped'::text, 'delivered'::text, 'cancelled'::text, 'refunded'::text]))");
        }
    }
};
