<?php

namespace App\Http\Controllers;

use App\Http\Requests\CheckoutRequest;
use Illuminate\Http\JsonResponse;

class CheckoutController extends Controller
{
    public function createSession(CheckoutRequest $request): JsonResponse
    {
        return response()->json(['message' => 'Checkout session created'], 201);
    }
}
