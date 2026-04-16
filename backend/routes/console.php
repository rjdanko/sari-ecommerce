<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// 16:01 UTC = 00:01 PHT (UTC+8)
Schedule::command('vouchers:generate-daily')->dailyAt('16:01');
