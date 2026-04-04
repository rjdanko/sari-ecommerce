<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateProfileRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'first_name' => 'sometimes|string|max:255',
            'last_name' => 'sometimes|string|max:255',
            'phone' => 'sometimes|nullable|string|max:20',
            'default_address' => 'sometimes|nullable|array',
            'default_address.label' => 'sometimes|string|max:50',
            'default_address.line1' => 'required_with:default_address|string|max:255',
            'default_address.line2' => 'sometimes|nullable|string|max:255',
            'default_address.city' => 'required_with:default_address|string|max:100',
            'default_address.state' => 'required_with:default_address|string|max:100',
            'default_address.postal_code' => 'required_with:default_address|string|max:20',
            'default_address.country' => 'sometimes|string|max:100',
        ];
    }
}
