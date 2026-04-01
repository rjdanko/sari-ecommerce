<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateProductRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('update', $this->route('product'));
    }

    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:10000'],
            'short_description' => ['nullable', 'string', 'max:500'],
            'category_id' => ['sometimes', 'integer', 'exists:categories,id'],
            'base_price' => ['sometimes', 'numeric', 'min:0', 'max:99999999.99'],
            'compare_at_price' => ['nullable', 'numeric', 'min:0', 'max:99999999.99'],
            'stock_quantity' => ['sometimes', 'integer', 'min:0', 'max:999999'],
            'status' => ['sometimes', 'string', 'in:draft,active,archived'],
            'brand' => ['nullable', 'string', 'max:255'],
            'weight' => ['nullable', 'numeric', 'min:0', 'max:99999.99'],
        ];
    }
}
