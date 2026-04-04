'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { Search, Plus, Pencil, Trash2, Package } from 'lucide-react';
import api from '@/lib/api';
import { cn, formatPrice } from '@/lib/utils';
import type { Product } from '@/types/product';

// ─── Status Badge ──────────────────────────────────────────────────────────

const statusStyles: Record<Product['status'], string> = {
  active: 'bg-emerald-50 text-emerald-700',
  draft: 'bg-gray-100 text-gray-600',
  archived: 'bg-red-50 text-red-700',
};

// ─── Stock Color Helper ────────────────────────────────────────────────────

function stockColor(qty: number): string {
  if (qty === 0) return 'text-red-600 font-semibold';
  if (qty < 15) return 'text-amber-600 font-semibold';
  return 'text-emerald-600';
}

// ─── Skeleton Row ──────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      <td className="px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-gray-200" />
          <div className="space-y-1.5">
            <div className="h-3.5 w-32 rounded bg-gray-200" />
            <div className="h-3 w-48 rounded bg-gray-100" />
          </div>
        </div>
      </td>
      <td className="px-5 py-4"><div className="h-3.5 w-20 rounded bg-gray-200" /></td>
      <td className="px-5 py-4"><div className="h-3.5 w-16 rounded bg-gray-200" /></td>
      <td className="px-5 py-4"><div className="h-3.5 w-10 rounded bg-gray-200" /></td>
      <td className="px-5 py-4"><div className="h-5 w-14 rounded-full bg-gray-200" /></td>
      <td className="px-5 py-4"><div className="h-4 w-16 rounded bg-gray-200" /></td>
    </tr>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch products from API
  const fetchProducts = useCallback(async (query = '') => {
    setLoading(true);
    try {
      const params = query ? { search: query } : {};
      const res = await api.get('/api/admin/products', { params });
      setProducts(res.data.data ?? []);
    } catch {
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Debounced search
  const handleSearchChange = (value: string) => {
    setSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchProducts(value);
    }, 300);
  };

  // Delete handler
  const handleDelete = async (product: Product) => {
    if (!window.confirm(`Delete "${product.name}"? This action cannot be undone.`)) return;
    try {
      await api.delete(`/api/admin/products/${product.id}`);
      fetchProducts(search);
    } catch {
      // silently fail — could add toast later
    }
  };

  return (
    <div className="px-8 py-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl tracking-tight text-gray-900">
            Products Management
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your store inventory and product catalog.
          </p>
        </div>
        <button className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-sari-500 to-sari-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:shadow-md hover:brightness-105">
          <Plus className="h-4 w-4" strokeWidth={2.2} />
          Add Product
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative mb-6">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder="Search products by name, SKU, or category..."
          className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-11 pr-4 text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus:border-sari-400 focus:outline-none focus:ring-2 focus:ring-sari-100"
        />
      </div>

      {/* Table Card */}
      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/60">
                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Product
                </th>
                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Category
                </th>
                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Price
                </th>
                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Stock
                </th>
                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Status
                </th>
                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {/* Loading Skeleton */}
              {loading && (
                <>
                  <SkeletonRow />
                  <SkeletonRow />
                  <SkeletonRow />
                  <SkeletonRow />
                  <SkeletonRow />
                </>
              )}

              {/* Product Rows */}
              {!loading &&
                products.map((product) => (
                  <tr
                    key={product.id}
                    className="transition-colors hover:bg-gray-50/50"
                  >
                    {/* Product */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        {product.primary_image ? (
                          <img
                            src={product.primary_image.url}
                            alt={product.primary_image.alt_text || product.name}
                            className="h-10 w-10 shrink-0 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sari-50">
                            <Package className="h-5 w-5 text-sari-400" strokeWidth={1.5} />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="truncate font-medium text-gray-900">
                            {product.name}
                          </p>
                          {product.short_description && (
                            <p className="mt-0.5 truncate text-xs text-gray-400">
                              {product.short_description}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="px-5 py-4 text-gray-600">
                      {product.category?.name ?? '—'}
                    </td>

                    {/* Price */}
                    <td className="px-5 py-4 tabular-nums font-medium text-gray-900">
                      {formatPrice(product.base_price)}
                    </td>

                    {/* Stock */}
                    <td className={cn('px-5 py-4 tabular-nums', stockColor(product.stock_quantity))}>
                      {product.stock_quantity}
                    </td>

                    {/* Status */}
                    <td className="px-5 py-4">
                      <span
                        className={cn(
                          'inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize',
                          statusStyles[product.status]
                        )}
                      >
                        {product.status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1">
                        <button
                          className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-sari-50 hover:text-sari-600"
                          title="Edit product"
                        >
                          <Pencil className="h-4 w-4" strokeWidth={1.8} />
                        </button>
                        <button
                          onClick={() => handleDelete(product)}
                          className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
                          title="Delete product"
                        >
                          <Trash2 className="h-4 w-4" strokeWidth={1.8} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {/* Empty State */}
        {!loading && products.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-sari-50">
              <Package className="h-7 w-7 text-sari-400" strokeWidth={1.5} />
            </div>
            <p className="text-sm font-semibold text-gray-900">No products found</p>
            <p className="mt-1 max-w-xs text-xs text-gray-400">
              {search
                ? `No products match "${search}". Try a different search term.`
                : 'Get started by adding your first product to the catalog.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
