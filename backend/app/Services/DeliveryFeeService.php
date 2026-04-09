<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;

class DeliveryFeeService
{
    private const BASE_FEE = 30.0;
    private const BASE_KM = 5;
    private const PER_KM_RATE = 2.0;
    private const ROAD_MULTIPLIER = 1.3;
    private const DEFAULT_FEE = 100.0;

    public function calculateFee(float $storeLat, float $storeLng, float $buyerLat, float $buyerLng): array
    {
        $straightLineKm = $this->haversineDistance($storeLat, $storeLng, $buyerLat, $buyerLng);
        $estimatedKm = $straightLineKm * self::ROAD_MULTIPLIER;
        $roundedKm = ceil($estimatedKm);

        $additionalKm = max(0, $roundedKm - self::BASE_KM);
        $additionalFee = $additionalKm * self::PER_KM_RATE;
        $totalFee = self::BASE_FEE + $additionalFee;

        return [
            'distance_km' => round($estimatedKm, 1),
            'delivery_fee' => round($totalFee, 2),
            'breakdown' => [
                'base_fee' => self::BASE_FEE,
                'base_km' => self::BASE_KM,
                'additional_km' => (int) $additionalKm,
                'per_km_rate' => self::PER_KM_RATE,
                'additional_fee' => round($additionalFee, 2),
            ],
        ];
    }

    public function geocodeAddress(array $address): ?array
    {
        $query = implode(', ', array_filter([
            $address['line1'] ?? null,
            $address['city'] ?? null,
            $address['state'] ?? null,
            $address['postal_code'] ?? null,
            $address['country'] ?? 'PH',
        ]));

        try {
            $response = Http::withHeaders([
                'User-Agent' => 'SariEcommerce/1.0',
            ])->get('https://nominatim.openstreetmap.org/search', [
                'q' => $query,
                'format' => 'json',
                'limit' => 1,
                'countrycodes' => strtolower($address['country'] ?? 'PH'),
            ]);

            if ($response->successful() && !empty($response->json())) {
                $result = $response->json()[0];
                return [
                    'lat' => (float) $result['lat'],
                    'lng' => (float) $result['lon'],
                ];
            }
        } catch (\Throwable) {
            // Geocoding failed — caller should use fallback
        }

        return null;
    }

    public function getDefaultFee(): float
    {
        return self::DEFAULT_FEE;
    }

    private function haversineDistance(float $lat1, float $lon1, float $lat2, float $lon2): float
    {
        $earthRadiusKm = 6371;

        $dLat = deg2rad($lat2 - $lat1);
        $dLon = deg2rad($lon2 - $lon1);

        $a = sin($dLat / 2) * sin($dLat / 2)
            + cos(deg2rad($lat1)) * cos(deg2rad($lat2))
            * sin($dLon / 2) * sin($dLon / 2);

        $c = 2 * atan2(sqrt($a), sqrt(1 - $a));

        return $earthRadiusKm * $c;
    }
}
