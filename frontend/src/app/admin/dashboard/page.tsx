'use client';

import { useEffect, useState } from 'react';
import { Users, Store, Package, ShoppingCart, Banknote, Loader2 } from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import api from '@/lib/api';

interface DashboardData {
  totals: { users: number; stores: number; products: number; orders: number; revenue: number };
  ordersByDay: { date: string; count: number }[];
  recentOrders: { id: number; order_number: string; buyer: string; total: number; status: string; created_at: string }[];
  recentUsers: { id: number; name: string; email: string; created_at: string }[];
}

const statusColors: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  processing: 'bg-blue-100 text-blue-700',
  paid: 'bg-green-100 text-green-700',
  shipped: 'bg-indigo-100 text-indigo-700',
  delivered: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-red-100 text-red-700',
  refunded: 'bg-gray-100 text-gray-600',
  payment_failed: 'bg-rose-100 text-rose-700',
};

const tiles = [
  { key: 'users' as const, label: 'Total Users', icon: Users, color: 'from-blue-500 to-blue-600' },
  { key: 'stores' as const, label: 'Total Stores', icon: Store, color: 'from-violet-500 to-violet-600' },
  { key: 'products' as const, label: 'Active Products', icon: Package, color: 'from-emerald-500 to-emerald-600' },
  { key: 'orders' as const, label: 'Total Orders', icon: ShoppingCart, color: 'from-amber-500 to-amber-600' },
  { key: 'revenue' as const, label: 'Total Revenue', icon: Banknote, color: 'from-sari-600 to-sari-700', isCurrency: true },
];

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/admin/dashboard')
      .then(r => setData(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-sari-600" />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">Platform-wide overview</p>
      </div>

      {/* Stat tiles */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
        {tiles.map(({ key, label, icon: Icon, color, isCurrency }) => (
          <div key={key} className="rounded-2xl bg-white p-4 shadow-sm border border-gray-100">
            <div className={`mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${color}`}>
              <Icon className="h-5 w-5 text-white" />
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {isCurrency
                ? `₱${Number(data.totals[key]).toLocaleString('en-PH', { minimumFractionDigits: 0 })}`
                : data.totals[key].toLocaleString()}
            </p>
            <p className="mt-0.5 text-xs font-medium text-gray-500">{label}</p>
          </div>
        ))}
      </div>

      {/* Orders chart */}
      <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
        <h2 className="mb-4 text-sm font-semibold text-gray-900">Orders — Last 30 Days</h2>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={data.ordersByDay} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: '#9ca3af' }}
              tickFormatter={(v) => v.slice(5)}
              interval="preserveStartEnd"
            />
            <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} allowDecimals={false} />
            <Tooltip
              contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
              formatter={(v) => [v, 'Orders']}
            />
            <Line
              type="monotone"
              dataKey="count"
              stroke="#b91c1c"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: '#b91c1c' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Recent activity */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent orders */}
        <div className="rounded-2xl bg-white shadow-sm border border-gray-100">
          <div className="border-b border-gray-100 px-6 py-4">
            <h2 className="text-sm font-semibold text-gray-900">Recent Orders</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {data.recentOrders.length === 0 ? (
              <p className="px-6 py-4 text-sm text-gray-400">No orders yet.</p>
            ) : (
              data.recentOrders.map((o) => (
                <div key={o.id} className="flex items-center gap-3 px-6 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium text-gray-900">{o.order_number}</p>
                    <p className="truncate text-xs text-gray-500">{o.buyer}</p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${statusColors[o.status] ?? 'bg-gray-100 text-gray-600'}`}
                  >
                    {o.status.replace('_', ' ')}
                  </span>
                  <span className="shrink-0 text-sm font-medium text-gray-900">
                    ₱{Number(o.total).toLocaleString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recently joined users */}
        <div className="rounded-2xl bg-white shadow-sm border border-gray-100">
          <div className="border-b border-gray-100 px-6 py-4">
            <h2 className="text-sm font-semibold text-gray-900">Recently Joined Users</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {data.recentUsers.length === 0 ? (
              <p className="px-6 py-4 text-sm text-gray-400">No users yet.</p>
            ) : (
              data.recentUsers.map((u) => (
                <div key={u.id} className="flex items-center gap-3 px-6 py-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sari-50 text-xs font-bold text-sari-700">
                    {u.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium text-gray-900">{u.name}</p>
                    <p className="truncate text-xs text-gray-500">{u.email}</p>
                  </div>
                  <span className="shrink-0 text-xs text-gray-400">
                    {new Date(u.created_at).toLocaleDateString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
