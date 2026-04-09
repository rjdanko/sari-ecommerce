<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class PaymentService
{
    private string $baseUrl;
    private string $secretKey;

    public function __construct()
    {
        $this->baseUrl = config('services.paymongo.base_url');
        $this->secretKey = config('services.paymongo.secret_key');
    }

    /**
     * Create a PayMongo Checkout Session.
     * Supports: card (Visa/Mastercard), gcash
     *
     * Line items are built from server-side cart data (Redis),
     * NOT from user-submitted prices. This prevents price manipulation.
     */
    public function createCheckoutSession(array $lineItems, array $metadata = [], array $paymentMethods = ['card', 'gcash'], ?string $cancelUrl = null): array
    {
        $response = Http::withBasicAuth($this->secretKey, '')
            ->post("{$this->baseUrl}/checkout_sessions", [
                'data' => [
                    'attributes' => [
                        'line_items' => $lineItems,
                        'payment_method_types' => $paymentMethods,
                        'send_email_receipt' => true,
                        'show_description' => true,
                        'show_line_items' => true,
                        'description' => 'SARI E-Commerce Order',
                        'success_url' => config('app.frontend_url') . '/checkout/success?session_id={id}',
                        'cancel_url' => $cancelUrl ?? config('app.frontend_url') . '/checkout/cancel',
                        'metadata' => $metadata,
                    ],
                ],
            ]);

        if ($response->failed()) {
            Log::error('PayMongo checkout creation failed', [
                'status' => $response->status(),
                'body' => $response->json(),
            ]);
            throw new \RuntimeException('Failed to create checkout session');
        }

        return $response->json('data');
    }

    /**
     * Retrieve a checkout session by ID.
     */
    public function getCheckoutSession(string $sessionId): array
    {
        $response = Http::withBasicAuth($this->secretKey, '')
            ->get("{$this->baseUrl}/checkout_sessions/{$sessionId}");

        return $response->json('data');
    }

    /**
     * Verify the PayMongo webhook signature.
     *
     * This MUST be called before processing any webhook event.
     * Without this, an attacker could send fake webhook requests to mark
     * orders as paid without actually paying.
     */
    public function verifyWebhookSignature(string $payload, string $signature): bool
    {
        $webhookSecret = config('services.paymongo.webhook_secret');

        if (empty($webhookSecret)) {
            Log::error('PayMongo webhook secret is not configured');
            return false;
        }

        $parts = explode(',', $signature);
        $timestamp = null;
        $testSignature = null;
        $liveSignature = null;

        foreach ($parts as $part) {
            [$key, $value] = explode('=', $part, 2);
            match (trim($key)) {
                't' => $timestamp = $value,
                'te' => $testSignature = $value,
                'li' => $liveSignature = $value,
                default => null,
            };
        }

        $activeSignature = $liveSignature ?? $testSignature;

        if (! $activeSignature || ! $timestamp) {
            return false;
        }

        $computedSignature = hash_hmac(
            'sha256',
            "{$timestamp}.{$payload}",
            $webhookSecret
        );

        return hash_equals($computedSignature, $activeSignature);
    }
}
