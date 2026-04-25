<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class StoreVoucherRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'code'               => ['required', 'string', 'max:50', 'unique:vouchers,code'],
            'name'               => ['required', 'string', 'max:255'],
            'description'        => ['nullable', 'string'],
            'type'               => ['required', 'in:daily,special'],
            'discount_type'      => ['required', 'in:percentage,fixed,free_shipping'],
            'discount_value'     => ['required', 'numeric', 'min:0'],
            'min_spend'          => ['nullable', 'numeric', 'min:0'],
            'max_discount'       => ['nullable', 'numeric', 'min:0'],
            'total_quantity'     => ['nullable', 'integer', 'min:1'],
            'max_claims_per_user'=> ['nullable', 'integer', 'min:1'],
            'starts_at'          => ['required', 'date'],
            'expires_at'         => ['required', 'date', 'after:starts_at'],
            'is_active'          => ['boolean'],
        ];
    }

    protected function prepareForValidation(): void
    {
        if ($this->has('code')) {
            $this->merge(['code' => strtoupper($this->input('code'))]);
        }
    }
}
