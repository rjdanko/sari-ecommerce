<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;

class InventoryController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json([]);
    }

    public function update(int $product): JsonResponse
    {
        return response()->json([]);
    }
}
