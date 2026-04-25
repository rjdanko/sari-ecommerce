<?php

namespace Tests\Feature;

use App\Enums\RoleEnum;
use App\Models\Store;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class BecomeSellerTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(\Database\Seeders\RoleSeeder::class);
    }

    #[Test]
    public function a_buyer_can_convert_to_seller_and_create_a_store(): void
    {
        $user = User::factory()->create();
        $user->assignRole(RoleEnum::USER->value);

        $response = $this->actingAs($user)->postJson('/api/user/become-seller', [
            'name' => 'Corner Sari-Sari Store',
            'description' => 'Best neighborhood shop',
            'phone' => '09171234567',
            'address' => '123 Mabuhay St, Quezon City',
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('user.roles.0.name', RoleEnum::BUSINESS->value)
            ->assertJsonPath('store.name', 'Corner Sari-Sari Store');

        $this->assertTrue($user->fresh()->hasRole(RoleEnum::BUSINESS->value));
        $this->assertDatabaseHas('stores', [
            'user_id' => $user->id,
            'name' => 'Corner Sari-Sari Store',
        ]);
    }
}
