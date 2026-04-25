<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateVoucherRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $voucherId = $this->route('voucher')?->id;

        return [
            'code'               => ['sometimes', 'string', 'max:50', Rule::unique('vouchers', 'code')->ignore($voucherId)],
            'name'               => ['sometimes', 'string', 'max:255'],
            'description'        => ['nullable', 'string'],
            'type'               => ['sometimes', 'in:daily,special'],
            'discount_type'      => ['sometimes', 'in:percentage,fixed,free_shipping'],
            'discount_value'     => ['sometimes', 'numeric', 'min:0'],
            'min_spend'          => ['nullable', 'numeric', 'min:0'],
            'max_discount'       => ['nullable', 'numeric', 'min:0'],
            'total_quantity'     => ['nullable', 'integer', 'min:1'],
            'max_claims_per_user'=> ['nullable', 'integer', 'min:1'],
            'starts_at'          => ['sometimes', 'date'],
            'expires_at'         => ['sometimes', 'date', 'after:starts_at'],
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
