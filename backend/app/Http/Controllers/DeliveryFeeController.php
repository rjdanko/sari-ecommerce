<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Services\DeliveryFeeService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DeliveryFeeController extends Controller
{
    public function __construct(private DeliveryFeeService $deliveryFeeService) {}

    public function estimate(Request $request): JsonResponse
    {
        $request->validate([
            'product_id' => ['required', 'exists:products,id'],
            'shipping_address' => ['required', 'array'],
            'shipping_address.line1' => ['required', 'string'],
            'shipping_address.city' => ['required', 'string'],
            'shipping_address.state' => ['nullable', 'string'],
            'shipping_address.postal_code' => ['nullable', 'string'],
            'shipping_address.country' => ['nullable', 'string'],
        ]);

        $product = Product::with('store')->findOrFail($request->product_id);
        $store = $product->store;

        // If store has no coordinates, return default fee
        if (!$store || !$store->latitude || !$store->longitude) {
            return response()->json([
                'distance_km' => null,
                'delivery_fee' => $this->deliveryFeeService->getDefaultFee(),
                'breakdown' => null,
                'is_estimate' => true,
            ]);
        }

        // Geocode buyer address
        $buyerCoords = $this->deliveryFeeService->geocodeAddress($request->shipping_address);

        if (!$buyerCoords) {
            return response()->json([
                'distance_km' => null,
                'delivery_fee' => $this->deliveryFeeService->getDefaultFee(),
                'breakdown' => null,
                'is_estimate' => true,
            ]);
        }

        $result = $this->deliveryFeeService->calculateFee(
            $store->latitude,
            $store->longitude,
            $buyerCoords['lat'],
            $buyerCoords['lng'],
        );

        return response()->json([
            ...$result,
            'is_estimate' => false,
        ]);
    }
}
