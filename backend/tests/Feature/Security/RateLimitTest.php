<?php

namespace Tests\Feature\Security;

use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class RateLimitTest extends TestCase
{
    use RefreshDatabase;

    #[Test]
    public function login_endpoint_is_rate_limited(): void
    {
        // Send 6 login attempts (limit is 5/min) — 6th should be throttled
        for ($i = 0; $i < 5; $i++) {
            $this->postJson('/api/login', [
                'email' => 'test@test.com',
                'password' => 'wrong',
            ]);
        }

        $response = $this->postJson('/api/login', [
            'email' => 'test@test.com',
            'password' => 'wrong',
        ]);

        $response->assertStatus(429);
    }
}
