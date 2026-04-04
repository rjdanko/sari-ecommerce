'use client';

import { useEffect, useState, useCallback } from 'react';
import { AlertTriangle, Package, PackageCheck, RefreshCw } from 'lucide-react';
import api from '@/lib/api';
import { cn } from '@/lib/utils';

// ─── Types ──────────────────────────────────────────────────────────────────

interface Product {
  id: number;
  name: string;
  sku: string;
  stock_quantity: number;
  low_stock_threshold: number;
  status: string;
  category: { name: string } | null;
  business: { name: string } | null;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function stockLevel(p: Product): 'out' | 'low' | 'in' {
  if (p.stock_quantity === 0) return 'out';
  if (p.stock_quantity <= p.low_stock_threshold) return 'low';
  return 'in';
}

// ─── Skeleton ───────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <tr className="border-b border-gray-50 last:border-0">
      <td className="px-5 py-3.5">
        <div className="h-4 w-36 animate-pulse rounded bg-gray-100" />
      </td>
      <td className="px-5 py-3.5">
        <div className="h-4 w-20 animate-pulse rounded bg-gray-100" />
      </td>
      <td className="px-5 py-3.5">
        <div className="h-5 w-12 animate-pulse rounded-full bg-gray-100" />
      </td>
      <td className="px-5 py-3.5">
        <div className="h-8 w-20 animate-pulse rounded-lg bg-gray-100" />
      </td>
    </tr>
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <div className="h-3 w-20 animate-pulse rounded bg-gray-100" />
          <div className="mt-3 h-7 w-14 animate-pulse rounded bg-gray-100" />
        </div>
        <div className="h-10 w-10 animate-pulse rounded-xl bg-gray-100" />
      </div>
    </div>
  );
}

// ─── Stock Badge ────────────────────────────────────────────────────────────

function StockBadge({ product }: { product: Product }) {
  const level = stockLevel(product);
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold tabular-nums',
        level === 'out' && 'bg-red-50 text-red-700',
        level === 'low' && 'bg-amber-50 text-amber-700',
        level === 'in' && 'bg-emerald-50 text-emerald-700'
      )}
    >
      {product.stock_quantity}
    </span>
  );
}

// ─── Product Table ──────────────────────────────────────────────────────────

function ProductTable({
  products,
  loading,
  onRestock,
}: {
  products: Product[];
  loading: boolean;
  onRestock: (product: Product) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
              Product
            </th>
            <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
              Category
            </th>
            <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
              Current Stock
            </th>
            <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {loading
            ? Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} />)
            : products.map((product) => (
                <tr
                  key={product.id}
                  className="border-b border-gray-50 last:border-0 transition-colors hover:bg-gray-50/50"
                >
                  <td className="px-5 py-3.5">
                    <p className="font-medium text-gray-900">{product.name}</p>
                    <p className="mt-0.5 text-xs text-gray-400">
                      SKU: <span className="font-mono">{product.sku}</span>
                    </p>
                  </td>
                  <td className="px-5 py-3.5 text-gray-600">
                    {product.category?.name ?? '—'}
                  </td>
                  <td className="px-5 py-3.5">
                    <StockBadge product={product} />
                  </td>
                  <td className="px-5 py-3.5">
                    <button
                      onClick={() => onRestock(product)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition-all duration-200 hover:bg-emerald-100 hover:shadow-sm"
                    >
                      <RefreshCw className="h-3 w-3" />
                      Restock
                    </button>
                  </td>
                </tr>
              ))}
          {!loading && products.length === 0 && (
            <tr>
              <td colSpan={4} className="px-5 py-10 text-center text-sm text-gray-400">
                No products found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchInventory = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/admin/inventory', {
        params: { per_page: 100 },
      });
      setProducts(res.data.data ?? []);
    } catch {
      // silently handle — user sees empty state
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  // ── Derived counts ──

  const outOfStock = products.filter((p) => stockLevel(p) === 'out');
  const lowStock = products.filter((p) => stockLevel(p) === 'low');
  const inStock = products.filter((p) => stockLevel(p) === 'in');

  // ── Restock handler ──

  const handleRestock = async (product: Product) => {
    const value = window.prompt('Enter new stock quantity:');
    if (value === null) return;
    const qty = parseInt(value, 10);
    if (isNaN(qty) || qty < 0) return;

    try {
      await api.put(`/api/admin/inventory/${product.id}`, {
        stock_quantity: qty,
      });
      await fetchInventory();
    } catch {
      // silently handle
    }
  };

  // ── Summary cards config ──

  const summaryCards = [
    {
      label: 'Out of Stock',
      count: outOfStock.length,
      icon: Package,
      accent: 'from-red-500 to-red-600',
      bgAccent: 'bg-red-50',
      textAccent: 'text-red-700',
    },
    {
      label: 'Low Stock',
      count: lowStock.length,
      icon: AlertTriangle,
      accent: 'from-amber-500 to-amber-600',
      bgAccent: 'bg-amber-50',
      textAccent: 'text-amber-700',
    },
    {
      label: 'In Stock',
      count: inStock.length,
      icon: PackageCheck,
      accent: 'from-emerald-500 to-emerald-600',
      bgAccent: 'bg-emerald-50',
      textAccent: 'text-emerald-700',
    },
  ];

  return (
    <div className="px-8 py-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-display text-2xl tracking-tight text-gray-900">
          Inventory Management
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Monitor stock levels and restock products as needed.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="mb-8 grid grid-cols-1 gap-5 sm:grid-cols-3">
        {loading
          ? Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)
          : summaryCards.map((card, i) => {
              const Icon = card.icon;
              return (
                <div
                  key={card.label}
                  className="group relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-all duration-200 hover:shadow-md hover:border-gray-200"
                  style={{ animationDelay: `${i * 80}ms` }}
                >
                  <div
                    className={cn(
                      'pointer-events-none absolute -right-4 -top-4 h-20 w-20 rounded-full opacity-[0.08] blur-2xl transition-opacity duration-300 group-hover:opacity-[0.14]',
                      `bg-gradient-to-br ${card.accent}`
                    )}
                  />
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
                        {card.label}
                      </p>
                      <p className="mt-2 text-2xl font-bold tracking-tight text-gray-900">
                        {card.count}
                      </p>
                    </div>
                    <div
                      className={cn(
                        'flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-200',
                        card.bgAccent
                      )}
                    >
                      <Icon
                        className={cn('h-5 w-5', card.textAccent)}
                        strokeWidth={1.8}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
      </div>

      {/* Low Stock Alert Section */}
      <div className="mb-6 rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="flex items-center gap-2 border-b border-gray-100 px-5 py-4">
          <AlertTriangle className="h-4 w-4 text-amber-500" strokeWidth={1.8} />
          <h2 className="text-sm font-semibold text-gray-900">Low Stock Alert</h2>
          <span className="ml-1 inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
            {outOfStock.length + lowStock.length}
          </span>
        </div>
        <ProductTable
          products={[...outOfStock, ...lowStock]}
          loading={loading}
          onRestock={handleRestock}
        />
      </div>

      {/* In Stock Section */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="flex items-center gap-2 border-b border-gray-100 px-5 py-4">
          <PackageCheck className="h-4 w-4 text-emerald-500" strokeWidth={1.8} />
          <h2 className="text-sm font-semibold text-gray-900">In Stock</h2>
          <span className="ml-1 inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
            {inStock.length}
          </span>
        </div>
        <ProductTable
          products={inStock}
          loading={loading}
          onRestock={handleRestock}
        />
      </div>
    </div>
  );
}
