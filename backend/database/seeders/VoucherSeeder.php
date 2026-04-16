<?php

namespace Database\Seeders;

use App\Models\Voucher;
use Carbon\Carbon;
use Illuminate\Database\Seeder;

class VoucherSeeder extends Seeder
{
    public function run(): void
    {
        $today = Carbon::today();

        // Daily Vouchers
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

        // Special Double-Day Vouchers (1.1 through 12.12)
        $year = $today->year;
        for ($month = 1; $month <= 12; $month++) {
            $saleDate = Carbon::create($year, $month, $month);

            if ($saleDate->lt($today)) continue;

            $monthLabel = $saleDate->format('n.j');

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
