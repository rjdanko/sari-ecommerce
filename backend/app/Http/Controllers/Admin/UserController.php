<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;

class UserController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json([]);
    }

    public function show(int $id): JsonResponse
    {
        return response()->json([]);
    }

    public function store(): JsonResponse
    {
        return response()->json([], 201);
    }

    public function update(int $id): JsonResponse
    {
        return response()->json([]);
    }

    public function destroy(int $id): JsonResponse
    {
        return response()->json(null, 204);
    }
}
