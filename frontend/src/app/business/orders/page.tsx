'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { Search, ShoppingCart } from 'lucide-react';
import api from '@/lib/api';
import { cn, formatPrice } from '@/lib/utils';

interface OrderItem {
  id: number;
  product_name: string;
  quantity: number;
  unit_price: number;
}

interface OrderUser {
  first_name: string;
  last_name: string;
  email: string;
}

interface Order {
  id: number;
  order_number: string;
  status: string;
  total: number;
  payment_status: string;
  created_at: string;
  user: OrderUser;
  items: OrderItem[];
}

const statusStyles: Record<string, string> = {
  pending_confirmation: 'bg-amber-50 text-amber-700',
  confirmed: 'bg-blue-50 text-blue-700',
  pending: 'bg-gray-100 text-gray-700',
  processing: 'bg-blue-50 text-blue-700',
  paid: 'bg-emerald-50 text-emerald-700',
  shipped: 'bg-sari-50 text-sari-700',
  delivered: 'bg-emerald-50 text-emerald-700',
  cancelled: 'bg-red-50 text-red-700',
};

const statusLabels: Record<string, string> = {
  pending_confirmation: 'Pending Confirmation',
  confirmed: 'Confirmed',
};

const statusOptions = ['all', 'pending_confirmation', 'confirmed', 'processing', 'paid', 'shipped', 'delivered', 'cancelled'];

function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      <td className="px-5 py-4"><div className="h-4 w-24 rounded bg-gray-200" /></td>
      <td className="px-5 py-4"><div className="h-4 w-28 rounded bg-gray-200" /></td>
      <td className="px-5 py-4"><div className="h-4 w-32 rounded bg-gray-200" /></td>
      <td className="px-5 py-4"><div className="h-4 w-10 rounded bg-gray-200" /></td>
      <td className="px-5 py-4"><div className="h-4 w-20 rounded bg-gray-200" /></td>
      <td className="px-5 py-4"><div className="h-5 w-16 rounded-full bg-gray-200" /></td>
      <td className="px-5 py-4"><div className="h-5 w-16 rounded bg-gray-200" /></td>
    </tr>
  );
}

export default function BusinessOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchOrders = useCallback(async (query = '', status = 'all') => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (query) params.search = query;
      if (status !== 'all') params.status = status;
      const res = await api.get('/api/business/orders', { params });
      setOrders(res.data.data ?? []);
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchOrders(value, statusFilter);
    }, 300);
  };

  const handleConfirmOrder = async (orderId: number) => {
    try {
      await api.post(`/api/business/orders/${orderId}/confirm`);
      fetchOrders(search, statusFilter);
    } catch {
      // error handled silently
    }
  };

  const handleStatusChange = (status: string) => {
    setStatusFilter(status);
    fetchOrders(search, status);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-PH', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="px-8 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-display text-2xl tracking-tight text-gray-900">Orders</h1>
        <p className="mt-1 text-sm text-gray-500">Track and manage orders for your products.</p>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search orders..."
            className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-11 pr-4 text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus:border-sari-400 focus:outline-none focus:ring-2 focus:ring-sari-100"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => handleStatusChange(e.target.value)}
          className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-700 transition-colors focus:border-sari-400 focus:outline-none focus:ring-2 focus:ring-sari-100"
        >
          {statusOptions.map((s) => (
            <option key={s} value={s}>
              {s === 'all' ? 'All Statuses' : (statusLabels[s] || s.charAt(0).toUpperCase() + s.slice(1))}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/60">
                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Order</th>
                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Date</th>
                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Customer</th>
                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Items</th>
                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Total</th>
                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Status</th>
                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading && Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}
              {!loading &&
                orders.map((order) => (
                  <tr key={order.id} className="transition-colors hover:bg-gray-50/50">
                    <td className="px-5 py-4">
                      <span className="font-mono text-sm font-medium text-gray-900">{order.order_number}</span>
                    </td>
                    <td className="px-5 py-4 text-gray-600">{formatDate(order.created_at)}</td>
                    <td className="px-5 py-4">
                      <p className="font-medium text-gray-900">
                        {order.user.first_name} {order.user.last_name}
                      </p>
                      <p className="text-xs text-gray-400">{order.user.email}</p>
                    </td>
                    <td className="px-5 py-4 tabular-nums text-gray-600">{order.items.length}</td>
                    <td className="px-5 py-4 tabular-nums font-medium text-gray-900">{formatPrice(order.total)}</td>
                    <td className="px-5 py-4">
                      <span
                        className={cn(
                          'inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold',
                          statusStyles[order.status] || 'bg-gray-100 text-gray-700'
                        )}
                      >
                        {statusLabels[order.status] || (order.status.charAt(0).toUpperCase() + order.status.slice(1))}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      {order.status === 'pending_confirmation' && (
                        <button
                          onClick={() => handleConfirmOrder(order.id)}
                          className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-600 transition-colors"
                        >
                          Confirm
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {/* Empty State */}
        {!loading && orders.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50">
              <ShoppingCart className="h-7 w-7 text-blue-400" strokeWidth={1.5} />
            </div>
            <p className="text-sm font-semibold text-gray-900">No orders found</p>
            <p className="mt-1 max-w-xs text-xs text-gray-400">
              {search || statusFilter !== 'all'
                ? 'Try adjusting your filters.'
                : 'Orders will appear here when customers purchase your products.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
