<?php

namespace Database\Seeders;

use App\Enums\RoleEnum;
use App\Models\User;
use Illuminate\Database\Seeder;

class AdminSeeder extends Seeder
{
    public function run(): void
    {
        $admin = User::create([
            'first_name' => 'Sari',
            'last_name' => 'Admin',
            'email' => 'admin@sari.ph',
            'password' => bcrypt(env('ADMIN_DEFAULT_PASSWORD', 'password')),
            'email_verified_at' => now(),
        ]);

        $admin->assignRole(RoleEnum::ADMIN->value);
    }
}
