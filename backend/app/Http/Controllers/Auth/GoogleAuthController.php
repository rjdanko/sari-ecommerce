<?php

namespace App\Http\Controllers\Auth;

use App\Enums\RoleEnum;
use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;
use Laravel\Socialite\Facades\Socialite;
use Symfony\Component\HttpFoundation\Response;

class GoogleAuthController extends Controller
{
    public function redirect(): Response
    {
        return Socialite::driver('google')->stateless()->with(['prompt' => 'select_account'])->redirect();
    }

    public function callback(): RedirectResponse
    {
        $frontendUrl = env('FRONTEND_URL', 'http://localhost:3000');

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

            // Generate a one-time token and store in cache (expires in 60 seconds)
            $token = Str::random(64);
            Cache::put('google_auth_token:' . $token, $user->id, 60);

            return redirect()->to($frontendUrl . '/login?google_token=' . $token);
        } catch (\Exception $e) {
            return redirect()->to($frontendUrl . '/login?error=google_auth_failed');
        }
    }

    /**
     * Exchange a one-time Google auth token for a session cookie.
     */
    public function exchangeToken(Request $request): JsonResponse
    {
        $token = $request->input('token');

        if (! $token) {
            return response()->json(['message' => 'Token is required.'], 422);
        }

        $userId = Cache::pull('google_auth_token:' . $token);

        if (! $userId) {
            return response()->json(['message' => 'Invalid or expired token.'], 401);
        }

        $user = User::find($userId);

        if (! $user) {
            return response()->json(['message' => 'User not found.'], 404);
        }

        if ($user->is_suspended) {
            return response()->json(['error' => 'Account suspended'], 403);
        }

        Auth::login($user);
        $request->session()->regenerate();

        return response()->json([
            'message' => 'Login successful.',
            'user' => $user->load('roles'),
        ]);
    }
}
