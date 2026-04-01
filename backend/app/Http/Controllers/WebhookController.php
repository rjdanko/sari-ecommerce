<?php

namespace App\Http\Controllers;

use App\Jobs\ProcessPaymentWebhook;
use App\Services\PaymentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class WebhookController extends Controller
{
    public function handlePaymongo(Request $request, PaymentService $paymentService): JsonResponse
    {
        $payload = $request->getContent();
        $signature = $request->header('Paymongo-Signature', '');

        // Verify webhook signature before processing
        if (! $paymentService->verifyWebhookSignature($payload, $signature)) {
            Log::warning('PayMongo webhook: invalid signature');
            return response()->json(['error' => 'Invalid signature'], 403);
        }

        $event = $request->input('data');
        $eventType = $event['attributes']['type'] ?? '';

        if ($eventType === 'checkout_session.payment.paid') {
            ProcessPaymentWebhook::dispatch($event);
        }

        return response()->json(['message' => 'Webhook received'], 200);
    }
}
