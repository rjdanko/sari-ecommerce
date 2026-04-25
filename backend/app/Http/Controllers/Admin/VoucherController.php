<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreVoucherRequest;
use App\Http\Requests\Admin\UpdateVoucherRequest;
use App\Models\Voucher;
use Illuminate\Http\JsonResponse;

class VoucherController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(Voucher::orderByDesc('created_at')->paginate(20));
    }

    public function store(StoreVoucherRequest $request): JsonResponse
    {
        $voucher = Voucher::create($request->validated());
        return response()->json($voucher, 201);
    }

    public function show(Voucher $voucher): JsonResponse
    {
        return response()->json($voucher->loadCount('claims'));
    }

    public function update(UpdateVoucherRequest $request, Voucher $voucher): JsonResponse
    {
        $voucher->update($request->validated());
        return response()->json($voucher->fresh());
    }

    public function destroy(Voucher $voucher): JsonResponse
    {
        if ($voucher->claims()->exists()) {
            return response()->json(
                ['error' => 'This voucher has been claimed; deactivate it instead.'],
                409
            );
        }

        $voucher->delete();
        return response()->json(['message' => 'Voucher deleted']);
    }
}
