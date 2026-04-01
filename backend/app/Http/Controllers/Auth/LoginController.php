<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\LoginRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;

class LoginController extends Controller
{
    public function __invoke(LoginRequest $request): JsonResponse
    {
        $credentials = $request->validated();

        if (! Auth::attempt($credentials)) {
            return response()->json([
                'message' => 'The provided credentials are incorrect.',
            ], 401);
        }

        $request->session()->regenerate();

        return response()->json([
            'message' => 'Login successful.',
            'user' => Auth::user()->load('roles'),
        ]);
    }
}
