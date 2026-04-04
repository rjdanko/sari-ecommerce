'use client';

import { useEffect, useState } from 'react';
import {
  DollarSign,
  TrendingUp,
  ShoppingCart,
  Users,
  BarChart3,
  PieChart,
} from 'lucide-react';
import api from '@/lib/api';
import { cn, formatPrice } from '@/lib/utils';

// ─── Types ──────────────────────────────────────────────────────────────────

interface DashboardData {
  total_users: number;
  total_products: number;
  total_orders: number;
  revenue: number;
  pending_orders: number;
  low_stock_products: number;
}

// ─── Loading Skeleton ───────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-lg bg-gray-200/70',
        className
      )}
    />
  );
}

function StatCardSkeleton() {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="mt-3 h-7 w-32" />
        </div>
        <Skeleton className="h-10 w-10 rounded-xl" />
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="px-8 py-6">
      {/* Header skeleton */}
      <div className="mb-8">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="mt-2 h-4 w-80" />
      </div>

      {/* Stat cards skeleton */}
      <div className="mb-6 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>

      {/* Order status skeleton */}
      <div className="mb-6 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <Skeleton className="h-5 w-32 mb-4" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      </div>

      {/* Bottom sections skeleton */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <Skeleton className="h-5 w-44 mb-4" />
          <Skeleton className="h-48 rounded-xl" />
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <Skeleton className="h-5 w-44 mb-4" />
          <Skeleton className="h-48 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const { data } = await api.get('/api/admin/dashboard');
        setDashboard(data);
      } catch {
        // silently fail — page will show zeroes
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) return <LoadingSkeleton />;

  const revenue = dashboard?.revenue ?? 0;
  const totalOrders = dashboard?.total_orders ?? 0;
  const totalCustomers = dashboard?.total_users ?? 0;
  const pendingOrders = dashboard?.pending_orders ?? 0;
  const avgOrderValue = totalOrders > 0 ? revenue / totalOrders : 0;

  const statCards = [
    {
      label: 'Total Revenue',
      value: formatPrice(revenue),
      icon: DollarSign,
      bgAccent: 'bg-emerald-50',
      textAccent: 'text-emerald-700',
      glowAccent: 'from-emerald-500 to-emerald-600',
    },
    {
      label: 'Avg Order Value',
      value: formatPrice(avgOrderValue),
      icon: TrendingUp,
      bgAccent: 'bg-blue-50',
      textAccent: 'text-blue-700',
      glowAccent: 'from-blue-500 to-blue-600',
    },
    {
      label: 'Total Orders',
      value: totalOrders.toLocaleString(),
      icon: ShoppingCart,
      bgAccent: 'bg-violet-50',
      textAccent: 'text-violet-700',
      glowAccent: 'from-violet-500 to-violet-600',
    },
    {
      label: 'Total Customers',
      value: totalCustomers.toLocaleString(),
      icon: Users,
      bgAccent: 'bg-sari-50',
      textAccent: 'text-sari-700',
      glowAccent: 'from-sari-500 to-sari-600',
    },
  ];

  const orderStatuses = [
    {
      label: 'Completed',
      value: 0,
      bg: 'bg-emerald-50',
      text: 'text-emerald-700',
      border: 'border-emerald-100',
      note: 'Data not yet available',
    },
    {
      label: 'Pending',
      value: pendingOrders,
      bg: 'bg-amber-50',
      text: 'text-amber-700',
      border: 'border-amber-100',
      note: null,
    },
    {
      label: 'Total',
      value: totalOrders,
      bg: 'bg-blue-50',
      text: 'text-blue-700',
      border: 'border-blue-100',
      note: null,
    },
    {
      label: 'Cancelled',
      value: 0,
      bg: 'bg-red-50',
      text: 'text-red-700',
      border: 'border-red-100',
      note: 'Data not yet available',
    },
  ];

  return (
    <div className="px-8 py-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-display text-2xl tracking-tight text-gray-900">
          Analytics &amp; Reports
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Track your store performance, revenue trends, and customer insights.
        </p>
      </div>

      {/* Stat Cards */}
      <div className="mb-6 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="group relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-all duration-200 hover:shadow-md hover:border-gray-200"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              {/* Decorative corner glow */}
              <div
                className={cn(
                  'pointer-events-none absolute -right-4 -top-4 h-20 w-20 rounded-full opacity-[0.08] blur-2xl transition-opacity duration-300 group-hover:opacity-[0.14]',
                  `bg-gradient-to-br ${card.glowAccent}`
                )}
              />

              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
                    {card.label}
                  </p>
                  <p className="mt-2 text-2xl font-bold tracking-tight text-gray-900">
                    {card.value}
                  </p>
                </div>
                <div
                  className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-200',
                    card.bgAccent
                  )}
                >
                  <Icon className={cn('h-5 w-5', card.textAccent)} strokeWidth={1.8} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Order Status */}
      <div className="mb-6 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold text-gray-900">Order Status</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {orderStatuses.map((status) => (
            <div
              key={status.label}
              className={cn(
                'rounded-xl border p-4 transition-all duration-200',
                status.bg,
                status.border
              )}
            >
              <p className={cn('text-xs font-medium', status.text)}>
                {status.label}
              </p>
              <p className={cn('mt-1 text-2xl font-bold', status.text)}>
                {status.value.toLocaleString()}
              </p>
              {status.note && (
                <p className="mt-1 text-[11px] text-gray-400">{status.note}</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Two-Column Section */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Top Selling Products */}
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="flex items-center gap-2 border-b border-gray-100 px-5 py-4">
            <BarChart3 className="h-4 w-4 text-gray-400" strokeWidth={1.8} />
            <h2 className="text-sm font-semibold text-gray-900">
              Top Selling Products
            </h2>
          </div>
          <div className="flex items-center justify-center px-5 py-16">
            <p className="text-sm text-gray-400">
              Coming soon &mdash; data not yet available
            </p>
          </div>
        </div>

        {/* Revenue by Category */}
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="flex items-center gap-2 border-b border-gray-100 px-5 py-4">
            <PieChart className="h-4 w-4 text-gray-400" strokeWidth={1.8} />
            <h2 className="text-sm font-semibold text-gray-900">
              Revenue by Category
            </h2>
          </div>
          <div className="flex items-center justify-center px-5 py-16">
            <p className="text-sm text-gray-400">
              Coming soon &mdash; data not yet available
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
