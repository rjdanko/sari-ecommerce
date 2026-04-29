'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Banknote,
  ShoppingCart,
  Package,
  AlertTriangle,
  ArrowUpRight,
  Clock,
  AlertCircle,
  Plus,
  Store,
} from 'lucide-react';
import { cn, formatPrice } from '@/lib/utils';
import api from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';

interface DashboardData {
  has_store: boolean;
  store?: { name: string; slug: string };
  total_products: number;
  active_products: number;
  total_orders: number;
  revenue: number;
  pending_orders: number;
  low_stock_products: number;
  message?: string;
}

interface OrderUser {
  first_name: string;
  last_name: string;
}

interface Order {
  id: number;
  order_number: string;
  status: string;
  total: number;
  created_at: string;
  user: OrderUser;
  items: unknown[];
}

function buildMetrics(data: DashboardData) {
  return [
    {
      label: 'Revenue',
      value: formatPrice(data.revenue),
      icon: Banknote,
      accent: 'from-emerald-500 to-emerald-600',
      bgAccent: 'bg-emerald-50',
      textAccent: 'text-emerald-700',
    },
    {
      label: 'Orders',
      value: data.total_orders.toLocaleString(),
      icon: ShoppingCart,
      accent: 'from-blue-500 to-blue-600',
      bgAccent: 'bg-blue-50',
      textAccent: 'text-blue-700',
    },
    {
      label: 'Products',
      value: data.active_products.toLocaleString(),
      icon: Package,
      accent: 'from-sari-500 to-sari-600',
      bgAccent: 'bg-sari-50',
      textAccent: 'text-sari-700',
    },
    {
      label: 'Pending Orders',
      value: data.pending_orders.toLocaleString(),
      icon: Clock,
      accent: 'from-amber-500 to-amber-600',
      bgAccent: 'bg-amber-50',
      textAccent: 'text-amber-700',
    },
  ];
}

const statusStyles: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-700',
  processing: 'bg-blue-50 text-blue-700',
  shipped: 'bg-sari-50 text-sari-700',
  delivered: 'bg-emerald-50 text-emerald-700',
  cancelled: 'bg-red-50 text-red-700',
};

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return 'Just now';
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function MetricCardSkeleton() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="h-3 w-20 animate-pulse rounded bg-gray-100" />
          <div className="mt-3 h-7 w-28 animate-pulse rounded bg-gray-100" />
        </div>
        <div className="h-10 w-10 animate-pulse rounded-xl bg-gray-100" />
      </div>
    </div>
  );
}

function OrderRowSkeleton() {
  return (
    <div className="flex items-center gap-4 px-5 py-3.5">
      <div className="flex-1 min-w-0">
        <div className="h-4 w-32 animate-pulse rounded bg-gray-100" />
        <div className="mt-1.5 h-3 w-44 animate-pulse rounded bg-gray-100" />
      </div>
      <div className="shrink-0 text-right">
        <div className="h-4 w-16 animate-pulse rounded bg-gray-100" />
        <div className="mt-1.5 h-3 w-12 animate-pulse rounded bg-gray-100 ml-auto" />
      </div>
    </div>
  );
}

export default function BusinessDashboardPage() {
  const { user } = useAuth();
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [dashRes, ordersRes] = await Promise.all([
          api.get('/api/business/dashboard'),
          api.get('/api/business/orders', { params: { per_page: 5 } }),
        ]);
        setDashboard(dashRes.data);
        setRecentOrders(ordersRes.data.data ?? []);
      } catch (err) {
        console.error('Failed to load dashboard:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const firstName = user?.first_name ?? 'there';

  // No store yet — show creation prompt
  if (!loading && dashboard && !dashboard.has_store) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-8">
        <div className="text-center max-w-md">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-sari-100 to-sari-200">
            <Store className="h-8 w-8 text-sari-600" strokeWidth={1.5} />
          </div>
          <h2 className="font-display text-2xl text-gray-900">Create Your Store</h2>
          <p className="mt-2 text-sm text-gray-500">
            Set up your store to start selling on SARI. It only takes a minute.
          </p>
          <Link
            href="/business/store"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-sari-500 to-sari-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:shadow-md hover:brightness-105"
          >
            <Plus className="h-4 w-4" />
            Create Store
          </Link>
        </div>
      </div>
    );
  }

  const metrics = dashboard ? buildMetrics(dashboard) : [];

  return (
    <div className="px-8 py-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-display text-2xl tracking-tight text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Welcome back, {firstName}. Here&apos;s how your store is doing.
        </p>
      </div>

      {/* Metrics Cards */}
      <div className="mb-6 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <MetricCardSkeleton key={i} />)
          : metrics.map((metric, i) => {
              const Icon = metric.icon;
              return (
                <div
                  key={metric.label}
                  className="group relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-all duration-200 hover:shadow-md hover:border-gray-200"
                  style={{ animationDelay: `${i * 80}ms` }}
                >
                  <div
                    className={cn(
                      'pointer-events-none absolute -right-4 -top-4 h-20 w-20 rounded-full opacity-[0.08] blur-2xl transition-opacity duration-300 group-hover:opacity-[0.14]',
                      `bg-gradient-to-br ${metric.accent}`
                    )}
                  />
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
                        {metric.label}
                      </p>
                      <p className="mt-2 text-2xl font-bold tracking-tight text-gray-900">
                        {metric.value}
                      </p>
                    </div>
                    <div
                      className={cn(
                        'flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-200',
                        metric.bgAccent
                      )}
                    >
                      <Icon className={cn('h-5 w-5', metric.textAccent)} strokeWidth={1.8} />
                    </div>
                  </div>
                </div>
              );
            })}
      </div>

      {/* Low Stock Alert */}
      {dashboard && dashboard.low_stock_products > 0 && (
        <div className="mb-6 flex items-center gap-3 rounded-2xl border border-amber-200/80 bg-gradient-to-r from-amber-50 via-yellow-50 to-amber-50 px-5 py-4 shadow-sm">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100">
            <AlertTriangle className="h-5 w-5 text-amber-600" strokeWidth={2} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-900">Low Stock Alert</p>
            <p className="text-xs text-amber-700/80">
              {dashboard.low_stock_products} product{dashboard.low_stock_products !== 1 ? 's are' : ' is'} running low on inventory.
            </p>
          </div>
          <Link
            href="/business/products"
            className="shrink-0 rounded-lg bg-gradient-to-r from-sari-500 to-sari-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition-all duration-200 hover:shadow-md hover:brightness-105"
          >
            View Products
          </Link>
        </div>
      )}

      {/* Quick Actions + Recent Orders */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Quick Actions */}
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-5 py-4">
            <h2 className="text-sm font-semibold text-gray-900">Quick Actions</h2>
          </div>
          <div className="grid grid-cols-2 gap-3 p-5">
            <Link
              href="/business/products/new"
              className="flex flex-col items-center gap-2 rounded-xl border border-gray-100 p-4 text-center transition-all duration-200 hover:border-sari-200 hover:bg-sari-50/50 hover:shadow-sm"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sari-50">
                <Plus className="h-5 w-5 text-sari-600" />
              </div>
              <span className="text-xs font-medium text-gray-700">Add Product</span>
            </Link>
            <Link
              href="/business/orders"
              className="flex flex-col items-center gap-2 rounded-xl border border-gray-100 p-4 text-center transition-all duration-200 hover:border-blue-200 hover:bg-blue-50/50 hover:shadow-sm"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
                <ShoppingCart className="h-5 w-5 text-blue-600" />
              </div>
              <span className="text-xs font-medium text-gray-700">View Orders</span>
            </Link>
            <Link
              href="/business/products"
              className="flex flex-col items-center gap-2 rounded-xl border border-gray-100 p-4 text-center transition-all duration-200 hover:border-emerald-200 hover:bg-emerald-50/50 hover:shadow-sm"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50">
                <Package className="h-5 w-5 text-emerald-600" />
              </div>
              <span className="text-xs font-medium text-gray-700">My Products</span>
            </Link>
            <Link
              href="/business/store"
              className="flex flex-col items-center gap-2 rounded-xl border border-gray-100 p-4 text-center transition-all duration-200 hover:border-violet-200 hover:bg-violet-50/50 hover:shadow-sm"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50">
                <Store className="h-5 w-5 text-violet-600" />
              </div>
              <span className="text-xs font-medium text-gray-700">Store Settings</span>
            </Link>
          </div>
        </div>

        {/* Recent Orders */}
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 text-gray-400" strokeWidth={1.8} />
              <h2 className="text-sm font-semibold text-gray-900">Recent Orders</h2>
            </div>
            <Link
              href="/business/orders"
              className="flex items-center gap-1 text-xs font-medium text-sari-600 transition-colors hover:text-sari-700"
            >
              View all
              <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {loading
              ? Array.from({ length: 5 }).map((_, i) => <OrderRowSkeleton key={i} />)
              : recentOrders.length === 0
                ? (
                  <div className="px-5 py-8 text-center text-sm text-gray-400">
                    No orders yet
                  </div>
                )
                : recentOrders.map((order) => (
                    <Link
                      key={order.order_number}
                      href={`/business/orders/${order.id}`}
                      className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-gray-50/50 cursor-pointer"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-medium text-gray-900">
                            {order.user.first_name} {order.user.last_name}
                          </p>
                          <span
                            className={cn(
                              'inline-flex shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize',
                              statusStyles[order.status] || 'bg-gray-100 text-gray-700'
                            )}
                          >
                            {order.status}
                          </span>
                        </div>
                        <div className="mt-0.5 flex items-center gap-2 text-xs text-gray-400">
                          <span className="font-mono">{order.order_number}</span>
                          <span className="inline-block h-0.5 w-0.5 rounded-full bg-gray-300" />
                          <span>{order.items.length} item{order.items.length !== 1 ? 's' : ''}</span>
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-semibold text-gray-900">
                          {formatPrice(order.total)}
                        </p>
                        <p className="mt-0.5 flex items-center justify-end gap-1 text-[11px] text-gray-400">
                          <Clock className="h-3 w-3" />
                          {formatTimeAgo(order.created_at)}
                        </p>
                      </div>
                    </Link>
                  ))}
          </div>
        </div>
      </div>
    </div>
  );
}
