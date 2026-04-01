<?php

namespace Database\Seeders;

use App\Models\Category;
use Illuminate\Database\Seeder;

class CategorySeeder extends Seeder
{
    public function run(): void
    {
        $categories = [
            ['name' => 'T-Shirts', 'slug' => 't-shirts', 'description' => 'Casual and graphic tees'],
            ['name' => 'Jeans', 'slug' => 'jeans', 'description' => 'Denim jeans and pants'],
            ['name' => 'Dresses', 'slug' => 'dresses', 'description' => 'Casual and formal dresses'],
            ['name' => 'Jackets', 'slug' => 'jackets', 'description' => 'Outerwear and jackets'],
            ['name' => 'Men', 'slug' => 'men', 'description' => 'Men\'s fashion'],
            ['name' => 'Women', 'slug' => 'women', 'description' => 'Women\'s fashion'],
        ];

        foreach ($categories as $category) {
            Category::create($category);
        }
    }
}
