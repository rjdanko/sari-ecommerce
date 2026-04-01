<?php

namespace Database\Seeders;

use App\Enums\RoleEnum;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class RoleSeeder extends Seeder
{
    public function run(): void
    {
        // Reset cached roles and permissions
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        // Create permissions
        $permissions = [
            // Product permissions
            'view products', 'create products', 'edit products', 'delete products',
            // Order permissions
            'view orders', 'manage orders', 'view own orders',
            // User permissions
            'view users', 'manage users',
            // Inventory permissions
            'manage inventory',
            // Dashboard permissions
            'view admin dashboard', 'view business dashboard',
        ];

        foreach ($permissions as $permission) {
            Permission::create(['name' => $permission]);
        }

        // Create roles and assign permissions
        $userRole = Role::create(['name' => RoleEnum::USER->value]);
        $userRole->givePermissionTo([
            'view products', 'view own orders',
        ]);

        $businessRole = Role::create(['name' => RoleEnum::BUSINESS->value]);
        $businessRole->givePermissionTo([
            'view products', 'create products', 'edit products', 'delete products',
            'view orders', 'manage orders', 'manage inventory',
            'view business dashboard',
        ]);

        $adminRole = Role::create(['name' => RoleEnum::ADMIN->value]);
        $adminRole->givePermissionTo(Permission::all());
    }
}
