<?php

namespace Tests\Feature\Security;

use App\Enums\RoleEnum;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class AuthorizationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(\Database\Seeders\RoleSeeder::class);
    }

    #[Test]
    public function regular_user_cannot_access_admin_routes(): void
    {
        $user = User::factory()->create();
        $user->assignRole(RoleEnum::USER->value);

        // Regular user tries to access admin dashboard — must be denied
        $response = $this->actingAs($user)->getJson('/api/admin/dashboard');
        $response->assertForbidden();
    }

    #[Test]
    public function regular_user_cannot_access_business_routes(): void
    {
        $user = User::factory()->create();
        $user->assignRole(RoleEnum::USER->value);

        // Regular user tries to create a product — must be denied
        $response = $this->actingAs($user)->postJson('/api/business/products', [
            'name' => 'Test Product',
        ]);
        $response->assertForbidden();
    }

    #[Test]
    public function unauthenticated_user_cannot_access_protected_routes(): void
    {
        // No auth token — must be denied
        $response = $this->getJson('/api/user');
        $response->assertUnauthorized();

        $response = $this->getJson('/api/cart');
        $response->assertUnauthorized();

        $response = $this->getJson('/api/orders');
        $response->assertUnauthorized();
    }

    #[Test]
    public function user_cannot_self_assign_admin_role(): void
    {
        // Attempt to register with admin role — should be rejected
        $response = $this->postJson('/api/register', [
            'first_name' => 'Evil',
            'last_name' => 'Hacker',
            'email' => 'hacker@evil.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'role' => 'admin',
        ]);

        $response->assertUnprocessable();
    }
}
