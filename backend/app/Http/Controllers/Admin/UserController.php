<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class UserController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = User::with('roles');

        if ($request->has('role')) {
            $query->whereHas('roles', fn ($q) => $q->where('name', $request->input('role')));
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
            'last_name' => ['sometimes', 'string', 'max:255'],
            'role' => ['sometimes', 'string', 'in:user,business,admin'],
        ]);

        if ($request->has('role')) {
            $user->syncRoles([$request->input('role')]);
        }

        $user->update($request->except('role'));
        return response()->json($user->fresh()->load('roles'));
    }

    public function destroy(User $user): JsonResponse
    {
        // Prevent admin from deleting themselves
        if ($user->id === auth()->id()) {
            return response()->json(['error' => 'Cannot delete your own account'], 422);
        }

        $user->delete(); // soft delete
        return response()->json(['message' => 'User deleted']);
    }
}
