<?php

namespace App\Http\Controllers\Auth;

use App\Enums\RoleEnum;
use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Laravel\Socialite\Facades\Socialite;

class GoogleAuthController extends Controller
{
    public function redirect(): JsonResponse
    {
        return response()->json([
            'url' => Socialite::driver('google')->stateless()->redirect()->getTargetUrl(),
        ]);
    }

    public function callback(): JsonResponse
    {
        try {
            $googleUser = Socialite::driver('google')->stateless()->user();

            $user = User::updateOrCreate(
                ['email' => $googleUser->getEmail()],
                [
                    'first_name' => $googleUser->user['given_name'] ?? $googleUser->getName(),
                    'last_name' => $googleUser->user['family_name'] ?? '',
                    'google_id' => $googleUser->getId(),
                    'avatar_url' => $googleUser->getAvatar(),
                    'email_verified_at' => now(),
                ]
            );

            if ($user->wasRecentlyCreated) {
                $user->assignRole(RoleEnum::USER->value);
            }

            Auth::login($user);
            request()->session()->regenerate();

            return response()->json([
                'message' => 'Google login successful.',
                'user' => $user->load('roles'),
            ]);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Google login failed.', 'error' => $e->getMessage()], 401);
        }
    }
}
