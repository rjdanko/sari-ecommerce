'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { Search, Filter, ShoppingCart, Eye } from 'lucide-react';
import api from '@/lib/api';
import { formatPrice, cn } from '@/lib/utils';
import type { Order } from '@/types/order';

// The API returns orders with a nested user object
interface OrderWithUser extends Order {
  user: { first_name: string; last_name: string };
}

// ─── Status Helpers ─────────────────────────────────────────────────────────

const statusOptions = [
  'All',
  'Pending',
  'Processing',
  'Paid',
  'Shipped',
  'Delivered',
  'Cancelled',
] as const;

const statusStyles: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-700',
  processing: 'bg-blue-50 text-blue-700',
  paid: 'bg-emerald-50 text-emerald-700',
  shipped: 'bg-sari-50 text-sari-700',
  delivered: 'bg-green-50 text-green-700',
  cancelled: 'bg-red-50 text-red-700',
};

function formatDate(date: string): string {
  return new Intl.DateTimeFormat('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(date));
}

// ─── Loading Skeleton ───────────────────────────────────────────────────────

function TableSkeleton() {
  return (
    <div className="divide-y divide-gray-50">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-5 py-4">
          <div className="h-4 w-32 animate-pulse rounded bg-gray-100" />
          <div className="h-4 w-24 animate-pulse rounded bg-gray-100" />
          <div className="h-4 w-28 animate-pulse rounded bg-gray-100 flex-1" />
          <div className="h-4 w-10 animate-pulse rounded bg-gray-100" />
          <div className="h-4 w-20 animate-pulse rounded bg-gray-100" />
          <div className="h-5 w-16 animate-pulse rounded-full bg-gray-100" />
          <div className="h-4 w-10 animate-pulse rounded bg-gray-100" />
        </div>
      ))}
    </div>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<OrderWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchOrders = useCallback(async (searchQuery: string, status: string) => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (searchQuery) params.search = searchQuery;
      if (status !== 'All') params.status = status.toLowerCase();

      const response = await api.get('/api/admin/orders', { params });
      setOrders(response.data.data ?? []);
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchOrders('', 'All');
  }, [fetchOrders]);

  // Debounced search
  const handleSearchChange = (value: string) => {
    setSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchOrders(value, statusFilter);
    }, 300);
  };

  // Status filter change (immediate)
  const handleStatusChange = (value: string) => {
    setStatusFilter(value);
    fetchOrders(search, value);
  };

  return (
    <div className="px-8 py-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-display text-2xl tracking-tight text-gray-900">
          Orders Management
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          View and manage all customer orders.
        </p>
      </div>

      {/* Search & Filter Bar */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search orders..."
            className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition-all focus:border-sari-400 focus:ring-2 focus:ring-sari-100"
          />
        </div>

        {/* Status Filter */}
        <div className="relative">
          <Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <select
            value={statusFilter}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="appearance-none rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-10 text-sm text-gray-700 outline-none transition-all focus:border-sari-400 focus:ring-2 focus:ring-sari-100"
          >
            {statusOptions.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Orders Table Card */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
        {/* Table Header */}
        <div className="border-b border-gray-100 px-5 py-4">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-4 w-4 text-gray-400" strokeWidth={1.8} />
            <h2 className="text-sm font-semibold text-gray-900">All Orders</h2>
          </div>
        </div>

        {loading ? (
          <TableSkeleton />
        ) : orders.length === 0 ? (
          /* Empty State */
          <div className="flex flex-col items-center justify-center py-16">
            <ShoppingCart className="h-10 w-10 text-gray-300" strokeWidth={1.5} />
            <p className="mt-3 text-sm font-medium text-gray-500">No orders found</p>
            <p className="mt-1 text-xs text-gray-400">
              Try adjusting your search or filter.
            </p>
          </div>
        ) : (
          /* Data Table */
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs font-medium uppercase tracking-wider text-gray-400">
                  <th className="px-5 py-3">Order ID</th>
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3">Customer</th>
                  <th className="px-5 py-3 text-center">Items</th>
                  <th className="px-5 py-3 text-right">Total</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {orders.map((order) => (
                  <tr
                    key={order.id}
                    className="transition-colors hover:bg-gray-50/50"
                  >
                    <td className="whitespace-nowrap px-5 py-3.5 font-mono text-sm text-gray-900">
                      {order.order_number}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5 text-sm text-gray-500">
                      {formatDate(order.created_at)}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5 text-sm font-medium text-gray-900">
                      {order.user?.first_name} {order.user?.last_name}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5 text-center text-sm text-gray-500">
                      {order.items?.length ?? 0}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5 text-right text-sm font-semibold text-gray-900">
                      {formatPrice(order.total)}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5">
                      <span
                        className={cn(
                          'inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize',
                          statusStyles[order.status] || 'bg-gray-100 text-gray-700'
                        )}
                      >
                        {order.status}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5 text-center">
                      <a
                        href={`/admin/orders/${order.id}`}
                        className="inline-flex items-center gap-1 text-sm font-medium text-sari-600 transition-colors hover:text-sari-700"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        View
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
