<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WebhookController extends Controller
{
    public function handlePaymongo(Request $request): JsonResponse
    {
        return response()->json(['message' => 'Webhook received']);
    }
}
