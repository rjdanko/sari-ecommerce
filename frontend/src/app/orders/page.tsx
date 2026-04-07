'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Package, ChevronDown, ChevronUp, ShoppingBag, XCircle } from 'lucide-react';
import Navbar from '@/components/layout/Navbar';
import api from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { formatPrice, cn } from '@/lib/utils';
import { useToast } from '@/contexts/ToastContext';
import { Order } from '@/types/order';

const statusStyles: Record<string, string> = {
  pending_confirmation: 'bg-amber-50 text-amber-700',
  confirmed: 'bg-blue-50 text-blue-700',
  pending: 'bg-gray-100 text-gray-700',
  processing: 'bg-blue-50 text-blue-700',
  paid: 'bg-emerald-50 text-emerald-700',
  shipped: 'bg-sari-50 text-sari-700',
  delivered: 'bg-green-50 text-green-700',
  cancelled: 'bg-red-50 text-red-700',
};

const statusLabels: Record<string, string> = {
  pending_confirmation: 'Pending Store Confirmation',
  confirmed: 'Confirmed',
  pending: 'Pending',
  processing: 'Processing',
  paid: 'Paid',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

function formatDate(date: string): string {
  return new Intl.DateTimeFormat('en-PH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(date));
}

function OrderSkeleton() {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-5 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-4 w-36 bg-gray-200 rounded" />
          <div className="h-3 w-24 bg-gray-100 rounded" />
        </div>
        <div className="flex items-center gap-3">
          <div className="h-6 w-20 bg-gray-100 rounded-full" />
          <div className="h-5 w-20 bg-gray-200 rounded" />
        </div>
      </div>
    </div>
  );
}

export default function OrdersPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { addToast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;

    async function fetchOrders() {
      try {
        const { data } = await api.get('/api/orders');
        setOrders(data.data ?? []);
      } catch {
        setOrders([]);
      } finally {
        setLoading(false);
      }
    }

    fetchOrders();
  }, [user]);

  const toggleExpand = (id: number) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const handleCancelOrder = async (orderId: number) => {
    try {
      await api.post(`/api/orders/${orderId}/cancel`);
      const { data } = await api.get('/api/orders');
      setOrders(data.data ?? []);
      addToast({ type: 'info', title: 'Order cancelled' });
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Could not cancel order',
        message: err.response?.data?.error,
      });
    }
  };

  const isLoading = authLoading || loading;

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-gradient-to-b from-gray-50/80 to-white">
        {/* Page header */}
        <div className="relative overflow-hidden bg-gradient-to-r from-sari-50 via-white to-sari-50 border-b border-gray-100">
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage:
                'radial-gradient(circle, #92400E 1px, transparent 1px)',
              backgroundSize: '24px 24px',
            }}
          />
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-10">
            <h1 className="font-display text-3xl md:text-4xl text-gray-900 tracking-tight font-bold">
              My Orders
            </h1>
            <p className="mt-2 text-gray-500 text-sm md:text-base max-w-lg">
              Track and review all your past and current orders.
            </p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-10">
          {/* Loading state */}
          {isLoading && (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <OrderSkeleton key={i} />
              ))}
            </div>
          )}

          {/* Empty state */}
          {!isLoading && orders.length === 0 && (
            <div className="flex flex-col items-center justify-center text-center py-16 sm:py-24">
              <div className="relative mb-8">
                <div className="absolute inset-0 scale-150 bg-gradient-to-b from-sari-100/40 to-transparent rounded-full blur-2xl" />
                <div className="relative w-28 h-28 rounded-3xl bg-gradient-to-br from-gray-100 to-gray-50 border border-gray-200/60 flex items-center justify-center shadow-sm">
                  <Package className="w-12 h-12 text-gray-300" strokeWidth={1.5} />
                </div>
              </div>
              <h2 className="font-display text-2xl md:text-3xl text-gray-900 tracking-tight">
                No orders yet
              </h2>
              <p className="mt-3 text-gray-500 text-base max-w-sm">
                Once you place an order, it will appear here.
              </p>
              <Link
                href="/products"
                className="mt-6 inline-flex items-center gap-2 rounded-full bg-sari-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-sari-700 transition-colors"
              >
                <ShoppingBag className="w-4 h-4" />
                Start Shopping
              </Link>
            </div>
          )}

          {/* Order list */}
          {!isLoading && orders.length > 0 && (
            <div className="space-y-4">
              {orders.map((order) => {
                const isExpanded = expandedId === order.id;
                return (
                  <div
                    key={order.id}
                    className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden"
                  >
                    {/* Order summary row */}
                    <button
                      type="button"
                      onClick={() => toggleExpand(order.id)}
                      className="w-full px-5 py-4 flex items-center justify-between gap-4 text-left hover:bg-gray-50/60 transition-colors"
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="hidden sm:flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sari-50 text-sari-600">
                          <Package className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-900">
                            <span className="font-mono tracking-tight">
                              {order.order_number}
                            </span>
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {formatDate(order.created_at)} &middot;{' '}
                            {order.items.length}{' '}
                            {order.items.length === 1 ? 'item' : 'items'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span
                          className={cn(
                            'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                            statusStyles[order.status] ?? 'bg-gray-100 text-gray-700'
                          )}
                        >
                          {statusLabels[order.status] ?? order.status}
                        </span>
                        <span className="text-sm font-semibold text-gray-900">
                          {formatPrice(order.total)}
                        </span>
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-gray-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-gray-400" />
                        )}
                      </div>
                    </button>

                    {/* Expanded items table */}
                    {isExpanded && (
                      <div className="border-t border-gray-100 bg-gray-50/40 px-5 py-4">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-xs text-gray-500 uppercase tracking-wider">
                              <th className="text-left pb-2 font-medium">Product</th>
                              <th className="text-right pb-2 font-medium">Qty</th>
                              <th className="text-right pb-2 font-medium">Unit Price</th>
                              <th className="text-right pb-2 font-medium">Total</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {order.items.map((item) => (
                              <tr key={item.id}>
                                <td className="py-2 text-gray-900">
                                  {item.product_name}
                                </td>
                                <td className="py-2 text-right text-gray-600">
                                  {item.quantity}
                                </td>
                                <td className="py-2 text-right text-gray-600">
                                  {formatPrice(item.unit_price)}
                                </td>
                                <td className="py-2 text-right font-medium text-gray-900">
                                  {formatPrice(item.total_price)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>

                        {/* Order totals */}
                        <div className="mt-3 pt-3 border-t border-gray-200 space-y-1 text-sm text-right">
                          <p className="text-gray-500">
                            Subtotal: <span className="text-gray-700">{formatPrice(order.subtotal)}</span>
                          </p>
                          <p className="text-gray-500">
                            Shipping: <span className="text-gray-700">{formatPrice(order.shipping_fee)}</span>
                          </p>
                          <p className="text-gray-500">
                            Tax: <span className="text-gray-700">{formatPrice(order.tax)}</span>
                          </p>
                          <p className="font-semibold text-gray-900">
                            Total: {formatPrice(order.total)}
                          </p>
                        </div>

                        {/* Cancel button — only for pending_confirmation orders */}
                        {order.status === 'pending_confirmation' && (
                          <div className="mt-4 pt-3 border-t border-gray-200">
                            <button
                              onClick={() => handleCancelOrder(order.id)}
                              className="inline-flex items-center gap-1.5 text-sm text-red-600 hover:text-red-700 font-medium transition-colors"
                            >
                              <XCircle className="w-4 h-4" />
                              Cancel Order
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
