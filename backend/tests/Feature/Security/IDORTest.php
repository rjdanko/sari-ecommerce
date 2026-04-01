<?php

namespace Tests\Feature\Security;

use App\Enums\RoleEnum;
use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class IDORTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(\Database\Seeders\RoleSeeder::class);
    }

    #[Test]
    public function user_cannot_view_another_users_order(): void
    {
        $userA = User::factory()->create();
        $userA->assignRole(RoleEnum::USER->value);

        $userB = User::factory()->create();
        $userB->assignRole(RoleEnum::USER->value);

        $order = Order::factory()->create(['user_id' => $userB->id]);

        // User A tries to access User B's order — must be denied
        $response = $this->actingAs($userA)->getJson("/api/orders/{$order->id}");
        $response->assertForbidden();
    }

    #[Test]
    public function business_user_cannot_edit_another_business_product(): void
    {
        $businessA = User::factory()->create();
        $businessA->assignRole(RoleEnum::BUSINESS->value);

        $businessB = User::factory()->create();
        $businessB->assignRole(RoleEnum::BUSINESS->value);

        $product = Product::factory()->create(['business_id' => $businessB->id]);

        // Business A tries to edit Business B's product — must be denied
        $response = $this->actingAs($businessA)
            ->putJson("/api/business/products/{$product->id}", ['name' => 'Hacked']);
        $response->assertForbidden();
    }

    #[Test]
    public function admin_can_view_any_order(): void
    {
        $admin = User::factory()->create();
        $admin->assignRole(RoleEnum::ADMIN->value);

        $user = User::factory()->create();
        $order = Order::factory()->create(['user_id' => $user->id]);

        // Admin can access any order
        $response = $this->actingAs($admin)->getJson("/api/orders/{$order->id}");
        $response->assertOk();
    }
}
