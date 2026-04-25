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

    #[Test]
    public function a_business_user_cannot_convert_again(): void
    {
        $user = User::factory()->create();
        $user->assignRole(RoleEnum::BUSINESS->value);

        $response = $this->actingAs($user)->postJson('/api/user/become-seller', [
            'name' => 'Duplicate Store',
        ]);

        $response->assertStatus(422);
    }

    #[Test]
    public function an_admin_user_cannot_use_the_conversion_endpoint(): void
    {
        $user = User::factory()->create();
        $user->assignRole(RoleEnum::ADMIN->value);

        $response = $this->actingAs($user)->postJson('/api/user/become-seller', [
            'name' => 'Admin Store',
        ]);

        $response->assertStatus(422);
    }

    #[Test]
    public function a_user_with_an_existing_store_cannot_convert(): void
    {
        $user = User::factory()->create();
        $user->assignRole(RoleEnum::USER->value);

        // Simulate data drift: user somehow has a store row without the business role
        Store::create([
            'user_id' => $user->id,
            'name'    => 'Legacy Store',
            'slug'    => 'legacy-store-' . \Illuminate\Support\Str::random(5),
        ]);

        $response = $this->actingAs($user)->postJson('/api/user/become-seller', [
            'name' => 'New Store',
        ]);

        $response->assertStatus(422);
    }
}
