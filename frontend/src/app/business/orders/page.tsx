'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, ShoppingCart, ChevronDown, Eye, CheckCircle } from 'lucide-react';
import api from '@/lib/api';
import { cn, formatPrice } from '@/lib/utils';
import ConfirmOrderModal from '@/components/orders/ConfirmOrderModal';

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
  cancellation_reason?: string | null;
  cancellation_notes?: string | null;
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
  payment_failed: 'bg-red-50 text-red-600',
};

const statusLabels: Record<string, string> = {
  pending_confirmation: 'Pending Confirmation',
  confirmed: 'Confirmed',
  payment_failed: 'Payment Failed',
};

const statusOptions = ['all', 'pending_confirmation', 'confirmed', 'processing', 'paid', 'shipped', 'delivered', 'cancelled', 'payment_failed'];

const reasonLabels: Record<string, string> = {
  changed_mind: 'Changed my mind',
  found_better_deal: 'Found a better deal',
  ordered_by_mistake: 'Ordered by mistake',
  delivery_too_long: 'Delivery takes too long',
  want_to_change_order: 'Wants to change order',
  other: 'Other',
};

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
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [confirmingOrder, setConfirmingOrder] = useState<Order | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [openDropdownId, setOpenDropdownId] = useState<number | null>(null);
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

  // Close dropdown on click outside
  useEffect(() => {
    const handler = () => setOpenDropdownId(null);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchOrders(value, statusFilter);
    }, 300);
  };

  const handleConfirmOrder = async () => {
    if (!confirmingOrder) return;
    setConfirmLoading(true);
    try {
      await api.post(`/api/business/orders/${confirmingOrder.id}/confirm`);
      fetchOrders(search, statusFilter);
      setConfirmingOrder(null);
    } catch {
      // silently fail
    } finally {
      setConfirmLoading(false);
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
                    <td
                      className="px-5 py-4 cursor-pointer"
                      onClick={() => router.push(`/business/orders/${order.id}`)}
                    >
                      <span className="font-mono text-sm font-medium text-gray-900 hover:text-sari-600 transition-colors">
                        {order.order_number}
                      </span>
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
                      {order.status === 'cancelled' && order.cancellation_reason && (
                        <p className="mt-1 text-[11px] text-gray-400">
                          {reasonLabels[order.cancellation_reason] ?? order.cancellation_reason}
                          {order.cancellation_notes && `: ${order.cancellation_notes}`}
                        </p>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      {order.status === 'pending_confirmation' ? (
                        <div className="flex items-center gap-1 relative">
                          <button
                            onClick={() => setConfirmingOrder(order)}
                            className="rounded-l-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-600 transition-colors"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenDropdownId(openDropdownId === order.id ? null : order.id);
                            }}
                            className="rounded-r-lg bg-emerald-500 border-l border-emerald-400 px-2 py-1.5 text-white hover:bg-emerald-600 transition-colors"
                            aria-label="More actions"
                          >
                            <ChevronDown className="w-3.5 h-3.5" />
                          </button>
                          {/* Dropdown */}
                          {openDropdownId === order.id && (
                            <div className="absolute top-full right-0 mt-1 z-20 w-52 bg-white rounded-xl shadow-lg border border-gray-100 py-1 text-sm">
                              <button
                                onClick={() => { router.push(`/business/orders/${order.id}`); setOpenDropdownId(null); }}
                                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-gray-700 hover:bg-gray-50 transition-colors"
                              >
                                <Eye className="w-4 h-4 text-gray-400" />
                                View Order Details
                              </button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <button
                          onClick={() => router.push(`/business/orders/${order.id}`)}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-200 transition-colors"
                        >
                          <Eye className="w-3 h-3" />
                          View
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

      <ConfirmOrderModal
        isOpen={!!confirmingOrder}
        orderNumber={confirmingOrder?.order_number ?? ''}
        onConfirm={handleConfirmOrder}
        onCancel={() => setConfirmingOrder(null)}
        loading={confirmLoading}
      />
    </div>
  );
}
