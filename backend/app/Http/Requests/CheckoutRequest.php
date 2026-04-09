<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class CheckoutRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'shipping_address' => ['required', 'array'],
            'shipping_address.full_name' => ['nullable', 'string', 'max:255'],
            'shipping_address.phone' => ['nullable', 'string', 'max:20', 'regex:/^[0-9+\-\s()]*$/'],
            'shipping_address.line1' => ['required', 'string', 'max:255'],
            'shipping_address.line2' => ['nullable', 'string', 'max:255'],
            'shipping_address.city' => ['required', 'string', 'max:100'],
            'shipping_address.state' => ['required', 'string', 'max:100'],
            'shipping_address.postal_code' => ['required', 'string', 'max:20'],
            'shipping_address.country' => ['required', 'string', 'max:100'],
            'billing_address' => ['nullable', 'array'],
            'billing_address.line1' => ['required_with:billing_address', 'string', 'max:255'],
            'billing_address.city' => ['required_with:billing_address', 'string', 'max:100'],
            'billing_address.state' => ['required_with:billing_address', 'string', 'max:100'],
            'billing_address.postal_code' => ['required_with:billing_address', 'string', 'max:20'],
            'billing_address.country' => ['required_with:billing_address', 'string', 'max:100'],
            'payment_method' => ['nullable', 'string', 'in:cod,qrph'],
            'notes' => ['nullable', 'string', 'max:1000'],
            'direct_buy' => ['sometimes', 'array'],
            'direct_buy.product_id' => ['required_with:direct_buy', 'integer', 'exists:products,id'],
            'direct_buy.quantity' => ['required_with:direct_buy', 'integer', 'min:1'],
            'direct_buy.variant_id' => ['nullable', 'integer', 'exists:product_variants,id'],
        ];
    }

    protected function prepareForValidation(): void
    {
        if ($this->has('shipping_address.phone')) {
            $address = $this->input('shipping_address');
            if (isset($address['phone'])) {
                $address['phone'] = preg_replace('/[^0-9+]/', '', $address['phone']);
                $this->merge(['shipping_address' => $address]);
            }
        }
    }
}
