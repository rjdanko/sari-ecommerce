<?php

namespace Database\Factories;

use App\Models\Order;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Order>
 */
class OrderFactory extends Factory
{
    public function definition(): array
    {
        $subtotal = fake()->randomFloat(2, 100, 10000);
        $shippingFee = fake()->randomFloat(2, 0, 200);
        $tax = round($subtotal * 0.12, 2);

        return [
            'order_number' => 'SARI-' . strtoupper(uniqid()),
            'user_id' => User::factory(),
            'status' => 'pending',
            'subtotal' => $subtotal,
            'shipping_fee' => $shippingFee,
            'tax' => $tax,
            'total' => $subtotal + $shippingFee + $tax,
            'shipping_address' => [
                'line1' => fake()->streetAddress(),
                'city' => fake()->city(),
                'state' => fake()->state(),
                'postal_code' => fake()->postcode(),
                'country' => 'Philippines',
            ],
        ];
    }
}
