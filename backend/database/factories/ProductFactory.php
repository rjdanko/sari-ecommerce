<?php

namespace Database\Factories;

use App\Models\Category;
use App\Models\Product;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Product>
 */
class ProductFactory extends Factory
{
    public function definition(): array
    {
        $name = fake()->words(3, true);

        return [
            'category_id' => Category::factory(),
            'business_id' => User::factory(),
            'name' => $name,
            'slug' => Str::slug($name) . '-' . fake()->unique()->numberBetween(1000, 99999),
            'description' => fake()->paragraph(),
            'short_description' => fake()->sentence(),
            'base_price' => fake()->randomFloat(2, 10, 5000),
            'sku' => strtoupper(fake()->unique()->bothify('SKU-####-????')),
            'stock_quantity' => fake()->numberBetween(0, 500),
            'status' => 'active',
        ];
    }
}
