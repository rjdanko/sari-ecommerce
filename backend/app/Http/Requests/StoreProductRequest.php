<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreProductRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->hasRole(['business', 'admin']);
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:10000'],
            'short_description' => ['nullable', 'string', 'max:500'],
            'category_id' => ['required', 'integer', 'exists:categories,id'],
            'base_price' => ['required', 'numeric', 'min:0', 'max:99999999.99'],
            'compare_at_price' => ['nullable', 'numeric', 'min:0', 'max:99999999.99'],
            'sku' => ['required', 'string', 'max:100', 'unique:products,sku'],
            'stock_quantity' => ['required', 'integer', 'min:0', 'max:999999'],
            'low_stock_threshold' => ['nullable', 'integer', 'min:0', 'max:999999'],
            'brand' => ['nullable', 'string', 'max:255'],
            'gender' => ['nullable', 'string', 'in:men,women,unisex'],
            'weight' => ['nullable', 'numeric', 'min:0', 'max:99999.99'],
            'attributes' => ['nullable', 'array'],
            'attributes.*' => ['string', 'max:255'],
            'images' => ['nullable', 'array', 'max:10'],
            'images.*' => ['image', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
            'option_categories' => ['nullable', 'array', 'max:5'],
            'option_categories.*.name' => ['required_with:option_categories', 'string', 'max:100'],
            'option_categories.*.values' => ['required_with:option_categories', 'array', 'min:1', 'max:20'],
            'option_categories.*.values.*' => ['string', 'max:100'],
        ];
    }
}
