<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function index(): JsonResponse
    {
        $totals = [
            'users'    => User::count(),
            'stores'   => \App\Models\Store::count(),
            'products' => Product::where('status', 'active')->count(),
            'orders'   => Order::count(),
            'revenue'  => (float) Order::where('payment_status', 'paid')->sum('total'),
        ];

        $ordersByDay = Order::select(
                DB::raw('DATE(created_at) as date'),
                DB::raw('COUNT(*) as count')
            )
            ->where('created_at', '>=', now()->subDays(30))
            ->groupBy(DB::raw('DATE(created_at)'))
            ->orderBy('date')
            ->get()
            ->map(fn ($row) => ['date' => $row->date, 'count' => (int) $row->count]);

        $recentOrders = Order::with('user')
            ->orderByDesc('created_at')
            ->limit(10)
            ->get()
            ->map(fn ($o) => [
                'id'           => $o->id,
                'order_number' => $o->order_number,
                'buyer'        => $o->user?->full_name,
                'total'        => $o->total,
                'status'       => $o->status,
                'created_at'   => $o->created_at,
            ]);

        $recentUsers = User::orderByDesc('created_at')
            ->limit(10)
            ->get()
            ->map(fn ($u) => [
                'id'         => $u->id,
                'name'       => $u->full_name,
                'email'      => $u->email,
                'created_at' => $u->created_at,
            ]);

        return response()->json(compact('totals', 'ordersByDay', 'recentOrders', 'recentUsers'));
    }
}
