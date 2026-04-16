<?php

namespace App\Http\Controllers;

use App\Http\Requests\ApplyVoucherRequest;
use App\Http\Requests\ClaimVoucherRequest;
use App\Models\Voucher;
use App\Models\VoucherClaim;
use App\Services\CartService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class VoucherController extends Controller
{
    public function __construct(private CartService $cartService) {}

    /**
     * List available vouchers (active, not expired, within date range).
     */
    public function index(Request $request): JsonResponse
    {
        $vouchers = Voucher::where('is_active', true)
            ->where('starts_at', '<=', now())
            ->where('expires_at', '>=', now())
            ->where(function ($q) {
                $q->whereNull('total_quantity')
                  ->orWhereColumn('claimed_count', '<', 'total_quantity');
            })
            ->orderBy('type')
            ->orderBy('expires_at')
            ->get();

        // If user is authenticated, attach their claim status
        if ($request->user()) {
            $claimedIds = VoucherClaim::where('user_id', $request->user()->id)
                ->where('status', 'claimed')
                ->pluck('voucher_id')
                ->toArray();

            $vouchers->each(function ($voucher) use ($claimedIds) {
                $voucher->is_claimed = in_array($voucher->id, $claimedIds);
            });
        }

        return response()->json(['data' => $vouchers]);
    }

    /**
     * Claim a voucher (user adds it to their wallet).
     */
    public function claim(ClaimVoucherRequest $request): JsonResponse
    {
        $user = $request->user();
        $voucher = Voucher::findOrFail($request->validated()['voucher_id']);

        if (!$voucher->isValid()) {
            return response()->json(['error' => 'This voucher is no longer available.'], 422);
        }

        // Check per-user limit
        $existingClaims = VoucherClaim::where('voucher_id', $voucher->id)
            ->where('user_id', $user->id)
            ->whereIn('status', ['claimed', 'used'])
            ->count();

        if ($existingClaims >= $voucher->max_claims_per_user) {
            return response()->json(['error' => 'You have already claimed this voucher.'], 422);
        }

        // Check global quantity
        if ($voucher->total_quantity !== null && $voucher->claimed_count >= $voucher->total_quantity) {
            return response()->json(['error' => 'This voucher has been fully claimed.'], 422);
        }

        VoucherClaim::create([
            'voucher_id' => $voucher->id,
            'user_id' => $user->id,
            'status' => 'claimed',
        ]);

        $voucher->increment('claimed_count');

        return response()->json(['message' => 'Voucher claimed successfully!']);
    }

    /**
     * List user's claimed (unused) vouchers.
     */
    public function myClaimed(Request $request): JsonResponse
    {
        $claims = VoucherClaim::with('voucher')
            ->where('user_id', $request->user()->id)
            ->where('status', 'claimed')
            ->whereHas('voucher', function ($q) {
                $q->where('expires_at', '>=', now());
            })
            ->get();

        return response()->json(['data' => $claims]);
    }

    /**
     * Apply a voucher code at checkout — validates and returns discount preview.
     */
    public function apply(ApplyVoucherRequest $request): JsonResponse
    {
        $user = $request->user();
        $code = strtoupper(trim($request->validated()['code']));

        $voucher = Voucher::where('code', $code)->first();

        if (!$voucher || !$voucher->isValid()) {
            return response()->json(['error' => 'Invalid or expired voucher code.'], 422);
        }

        // User must have claimed this voucher
        $claim = VoucherClaim::where('voucher_id', $voucher->id)
            ->where('user_id', $user->id)
            ->where('status', 'claimed')
            ->first();

        if (!$claim) {
            return response()->json(['error' => 'You have not claimed this voucher. Claim it first from the voucher center.'], 422);
        }

        // Calculate discount based on cart total
        $cartTotal = $this->cartService->getCartTotal($user->id);

        if ($cartTotal < $voucher->min_spend) {
            return response()->json([
                'error' => "Minimum spend of P" . number_format($voucher->min_spend, 2) . " required.",
            ], 422);
        }

        $discount = $voucher->calculateDiscount($cartTotal);

        return response()->json([
            'voucher' => $voucher,
            'discount' => $discount,
            'free_shipping' => $voucher->grantsFreeShipping(),
            'new_subtotal' => $cartTotal - $discount,
        ]);
    }
}
