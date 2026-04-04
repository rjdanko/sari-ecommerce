'use client';

import { useState, useEffect } from 'react';
import {
  DollarSign,
  ShoppingCart,
  Package,
  Users,
  AlertTriangle,
  ArrowUpRight,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { cn, formatPrice } from '@/lib/utils';
import api from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';

// ─── Types ──────────────────────────────────────────────────────────────────

interface DashboardData {
  total_users: number;
  total_products: number;
  total_orders: number;
  revenue: number;
  pending_orders: number;
  low_stock_products: number;
}

interface OrderUser {
  first_name: string;
  last_name: string;
}

interface Order {
  order_number: string;
  status: string;
  total: number;
  created_at: string;
  user: OrderUser;
  items: unknown[];
}

interface LowStockProduct {
  name: string;
  sku: string;
  stock_quantity: number;
  low_stock_threshold: number;
}

// ─── Metric Card Config ─────────────────────────────────────────────────────

function buildMetrics(data: DashboardData) {
  return [
    {
      label: 'Total Revenue',
      value: formatPrice(data.revenue),
      icon: DollarSign,
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
      value: data.total_products.toLocaleString(),
      icon: Package,
      accent: 'from-sari-500 to-sari-600',
      bgAccent: 'bg-sari-50',
      textAccent: 'text-sari-700',
    },
    {
      label: 'Customers',
      value: data.total_users.toLocaleString(),
      icon: Users,
      accent: 'from-violet-500 to-violet-600',
      bgAccent: 'bg-violet-50',
      textAccent: 'text-violet-700',
    },
  ];
}

// ─── Status Helpers ─────────────────────────────────────────────────────────

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

// ─── Skeleton Components ────────────────────────────────────────────────────

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

function StockRowSkeleton() {
  return (
    <div className="flex items-center gap-4 px-5 py-3.5">
      <div className="h-9 w-9 animate-pulse rounded-lg bg-gray-100" />
      <div className="flex-1 min-w-0">
        <div className="h-4 w-36 animate-pulse rounded bg-gray-100" />
        <div className="mt-1.5 h-3 w-20 animate-pulse rounded bg-gray-100" />
      </div>
      <div className="h-1.5 w-16 animate-pulse rounded-full bg-gray-100" />
    </div>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<LowStockProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [dashRes, ordersRes, inventoryRes] = await Promise.all([
          api.get('/api/admin/dashboard'),
          api.get('/api/admin/orders', { params: { per_page: 5 } }),
          api.get('/api/admin/inventory', { params: { low_stock: true } }),
        ]);
        setDashboard(dashRes.data);
        setRecentOrders(ordersRes.data.data ?? []);
        setLowStockProducts(inventoryRes.data.data ?? []);
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const metrics = dashboard ? buildMetrics(dashboard) : [];
  const firstName = user?.first_name ?? 'there';

  return (
    <div className="px-8 py-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-display text-2xl tracking-tight text-gray-900">
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Welcome back, {firstName}. Here&apos;s what&apos;s happening with your store.
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
                  {/* Decorative corner glow */}
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

      {/* Low Stock Alert Banner */}
      {(loading || lowStockProducts.length > 0) && (
        <div className="mb-6 flex items-center gap-3 rounded-2xl border border-amber-200/80 bg-gradient-to-r from-amber-50 via-yellow-50 to-amber-50 px-5 py-4 shadow-sm">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100">
            <AlertTriangle className="h-5 w-5 text-amber-600" strokeWidth={2} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-900">Low Stock Alert</p>
            <p className="text-xs text-amber-700/80">
              {loading
                ? 'Checking inventory levels...'
                : `${lowStockProducts.length} product${lowStockProducts.length !== 1 ? 's are' : ' is'} running low on inventory and need${lowStockProducts.length === 1 ? 's' : ''} restocking soon.`}
            </p>
          </div>
          <button className="shrink-0 rounded-lg bg-gradient-to-r from-sari-500 to-sari-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition-all duration-200 hover:shadow-md hover:brightness-105">
            View Inventory
          </button>
        </div>
      )}

      {/* Bottom Two-Column Section */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Orders */}
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 text-gray-400" strokeWidth={1.8} />
              <h2 className="text-sm font-semibold text-gray-900">Recent Orders</h2>
            </div>
            <button className="flex items-center gap-1 text-xs font-medium text-sari-600 transition-colors hover:text-sari-700">
              View all
              <ArrowUpRight className="h-3 w-3" />
            </button>
          </div>
          <div className="divide-y divide-gray-50">
            {loading
              ? Array.from({ length: 5 }).map((_, i) => <OrderRowSkeleton key={i} />)
              : recentOrders.length === 0
                ? (
                  <div className="px-5 py-8 text-center text-sm text-gray-400">
                    No recent orders
                  </div>
                )
                : recentOrders.map((order) => (
                    <div
                      key={order.order_number}
                      className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-gray-50/50"
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
                    </div>
                  ))}
          </div>
        </div>

        {/* Low Stock Products */}
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-500" strokeWidth={1.8} />
              <h2 className="text-sm font-semibold text-gray-900">Low Stock Products</h2>
            </div>
            <button className="flex items-center gap-1 text-xs font-medium text-sari-600 transition-colors hover:text-sari-700">
              Manage stock
              <ArrowUpRight className="h-3 w-3" />
            </button>
          </div>
          <div className="divide-y divide-gray-50">
            {loading
              ? Array.from({ length: 5 }).map((_, i) => <StockRowSkeleton key={i} />)
              : lowStockProducts.length === 0
                ? (
                  <div className="px-5 py-8 text-center text-sm text-gray-400">
                    All products are well stocked
                  </div>
                )
                : lowStockProducts.map((product) => {
                    const urgency =
                      product.stock_quantity <= 2
                        ? 'critical'
                        : product.stock_quantity <= 5
                          ? 'warning'
                          : 'low';
                    return (
                      <div
                        key={product.sku}
                        className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-gray-50/50"
                      >
                        <div
                          className={cn(
                            'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-bold',
                            urgency === 'critical'
                              ? 'bg-red-50 text-red-600'
                              : urgency === 'warning'
                                ? 'bg-amber-50 text-amber-600'
                                : 'bg-gray-100 text-gray-600'
                          )}
                        >
                          {product.stock_quantity}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="truncate text-sm font-medium text-gray-900">
                            {product.name}
                          </p>
                          <p className="mt-0.5 text-xs text-gray-400">
                            SKU: <span className="font-mono">{product.sku}</span>
                          </p>
                        </div>
                        <div className="shrink-0">
                          {/* Stock bar indicator */}
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-16 overflow-hidden rounded-full bg-gray-100">
                              <div
                                className={cn(
                                  'h-full rounded-full transition-all duration-500',
                                  urgency === 'critical'
                                    ? 'bg-red-500'
                                    : urgency === 'warning'
                                      ? 'bg-amber-500'
                                      : 'bg-sari-500'
                                )}
                                style={{
                                  width: `${Math.min((product.stock_quantity / product.low_stock_threshold) * 100, 100)}%`,
                                }}
                              />
                            </div>
                            <span className="text-[11px] tabular-nums text-gray-400">
                              {product.stock_quantity}/{product.low_stock_threshold}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
          </div>
        </div>
      </div>
    </div>
  );
}
