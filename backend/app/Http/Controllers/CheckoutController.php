<?php

namespace App\Http\Controllers;

use App\Http\Requests\CheckoutRequest;
use App\Models\Order;
use App\Services\CartService;
use App\Services\PaymentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class CheckoutController extends Controller
{
    public function __construct(
        private CartService $cartService,
        private PaymentService $paymentService,
    ) {}

    public function createSession(CheckoutRequest $request): JsonResponse
    {
        $validated = $request->validated();
        $user = $request->user();

        // Cart is always scoped to authenticated user
        $cartItems = $this->cartService->getCart($user->id);

        if (empty($cartItems)) {
            return response()->json(['error' => 'Cart is empty'], 422);
        }

        return DB::transaction(function () use ($user, $cartItems, $validated) {
            // Prices come from the database, NOT from user input
            $lineItems = [];
            $subtotal = 0;

            foreach ($cartItems as $item) {
                $amount = (int) ($item['product']['base_price'] * 100); // centavos
                $lineItems[] = [
                    'name' => $item['product']['name'],
                    'quantity' => $item['quantity'],
                    'amount' => $amount,
                    'currency' => 'PHP',
                    'description' => "SKU: {$item['product_id']}",
                ];
                $subtotal += $item['product']['base_price'] * $item['quantity'];
            }

            $order = Order::create([
                'order_number' => Order::generateOrderNumber(),
                'user_id' => $user->id,
                'status' => 'pending',
                'subtotal' => $subtotal,
                'shipping_fee' => 0,
                'tax' => 0,
                'total' => $subtotal,
                'shipping_address' => $validated['shipping_address'],
                'billing_address' => $validated['billing_address'] ?? $validated['shipping_address'],
            ]);

            foreach ($cartItems as $item) {
                $order->items()->create([
                    'product_id' => $item['product_id'],
                    'product_variant_id' => $item['variant_id'] ?? null,
                    'product_name' => $item['product']['name'],
                    'quantity' => $item['quantity'],
                    'unit_price' => $item['product']['base_price'],
                    'total_price' => $item['product']['base_price'] * $item['quantity'],
                ]);
            }

            $session = $this->paymentService->createCheckoutSession(
                $lineItems,
                ['order_id' => $order->id, 'order_number' => $order->order_number]
            );

            $order->update([
                'paymongo_checkout_id' => $session['id'],
            ]);

            return response()->json([
                'checkout_url' => $session['attributes']['checkout_url'],
                'order' => $order->load('items'),
            ]);
        });
    }
}
