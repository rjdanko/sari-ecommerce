<?php

namespace App\Console\Commands;

use App\Models\Voucher;
use Carbon\Carbon;
use Illuminate\Console\Command;

class GenerateDailyVouchers extends Command
{
    protected $signature = 'vouchers:generate-daily';
    protected $description = 'Generate daily vouchers for today (free shipping + small discounts)';

    public function handle(): int
    {
        $today = Carbon::today('Asia/Manila');
        $dateCode = $today->format('md');

        $dailyVouchers = [
            [
                'code' => 'DAILYSHIP-' . $dateCode,
                'name' => 'Daily Free Shipping',
                'description' => 'Free shipping on orders P299+. Claim daily!',
                'discount_type' => 'free_shipping',
                'discount_value' => 0,
                'min_spend' => 299,
                'total_quantity' => 500,
            ],
            [
                'code' => 'DAILY20-' . $dateCode,
                'name' => 'P20 Off',
                'description' => 'P20 off on orders P200+.',
                'discount_type' => 'fixed',
                'discount_value' => 20,
                'min_spend' => 200,
                'total_quantity' => 1000,
            ],
            [
                'code' => 'DAILY50-' . $dateCode,
                'name' => 'P50 Off',
                'description' => 'P50 off on orders P500+.',
                'discount_type' => 'fixed',
                'discount_value' => 50,
                'min_spend' => 500,
                'total_quantity' => 200,
            ],
        ];

        foreach ($dailyVouchers as $v) {
            Voucher::firstOrCreate(
                ['code' => $v['code']],
                array_merge($v, [
                    'type' => 'daily',
                    'max_claims_per_user' => 1,
                    'starts_at' => $today->copy()->startOfDay(),
                    'expires_at' => $today->copy()->endOfDay(),
                    'is_active' => true,
                ])
            );
        }

        // Also check for special date vouchers (double day)
        if ($today->day === $today->month) {
            $month = $today->month;
            $monthLabel = $today->format('n.j');
            $specialVouchers = [
                [
                    'code' => 'SARI' . $month . $month . '-SHIP',
                    'name' => $monthLabel . ' Free Shipping',
                    'description' => "Free shipping on ALL orders! {$monthLabel} Sale.",
                    'discount_type' => 'free_shipping',
                    'discount_value' => 0,
                    'min_spend' => 0,
                    'total_quantity' => 2000,
                ],
                [
                    'code' => 'SARI' . $month . $month . '-20OFF',
                    'name' => $monthLabel . ' 20% Off',
                    'description' => "20% off up to P200! {$monthLabel} Sale.",
                    'discount_type' => 'percentage',
                    'discount_value' => 20,
                    'min_spend' => 300,
                    'max_discount' => 200,
                    'total_quantity' => 1000,
                ],
                [
                    'code' => 'SARI' . $month . $month . '-MEGA',
                    'name' => $monthLabel . ' Mega Discount',
                    'description' => "P150 off on orders P999+!",
                    'discount_type' => 'fixed',
                    'discount_value' => 150,
                    'min_spend' => 999,
                    'total_quantity' => 500,
                ],
            ];

            foreach ($specialVouchers as $v) {
                Voucher::firstOrCreate(
                    ['code' => $v['code']],
                    array_merge($v, [
                        'type' => 'special',
                        'max_claims_per_user' => 1,
                        'starts_at' => $today->copy()->startOfDay(),
                        'expires_at' => $today->copy()->endOfDay(),
                        'is_active' => true,
                    ])
                );
            }
        }

        $this->info('Daily vouchers generated for ' . $today->toDateString());
        return Command::SUCCESS;
    }
}
