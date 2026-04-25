<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;


class UserController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = User::with('roles');

        if ($request->has('role') && $request->input('role') !== 'all') {
            $query->whereHas('roles', fn ($q) => $q->where('name', $request->input('role')));
        }

        if ($request->has('status')) {
            match ($request->input('status')) {
                'suspended' => $query->where('is_suspended', true),
                'active'    => $query->where('is_suspended', false),
                default     => null,
            };
        }

        if ($request->has('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('first_name', 'ILIKE', "%{$search}%")
                  ->orWhere('last_name', 'ILIKE', "%{$search}%")
                  ->orWhere('email', 'ILIKE', "%{$search}%");
            });
        }

        return response()->json($query->orderByDesc('created_at')->paginate(20));
    }

    public function show(User $user): JsonResponse
    {
        return response()->json($user->load('roles', 'orders'));
    }

    public function update(Request $request, User $user): JsonResponse
    {
        $request->validate([
            'first_name' => ['sometimes', 'string', 'max:255'],
            'last_name'  => ['sometimes', 'string', 'max:255'],
            'role'       => ['sometimes', 'string', 'in:user,business'],
        ]);

        if ($request->has('role')) {
            if ($user->id === auth()->id()) {
                return response()->json(['error' => 'Cannot change your own role'], 422);
            }
            $user->syncRoles([$request->input('role')]);
        }

        $user->update($request->only('first_name', 'last_name'));
        return response()->json($user->fresh()->load('roles'));
    }

    public function destroy(User $user): JsonResponse
    {
        if ($user->id === auth()->id()) {
            return response()->json(['error' => 'Cannot delete your own account'], 422);
        }

        $user->delete();
        return response()->json(['message' => 'User deleted']);
    }

    public function suspend(User $user): JsonResponse
    {
        if ($user->id === auth()->id()) {
            return response()->json(['error' => 'Cannot suspend your own account'], 422);
        }

        DB::transaction(function () use ($user) {
            $user->update(['is_suspended' => true]);
            $user->tokens()->delete();
        });

        return response()->json(['message' => 'User suspended']);
    }

    public function unsuspend(User $user): JsonResponse
    {
        $user->update(['is_suspended' => false]);
        return response()->json(['message' => 'User unsuspended']);
    }
}
