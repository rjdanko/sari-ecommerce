'use client';

import { useEffect, useState, useCallback } from 'react';
import { Search, ChevronLeft, ChevronRight, Loader2, Save } from 'lucide-react';
import api from '@/lib/api';

interface Product {
  id: number;
  name: string;
  sku?: string;
  stock_quantity: number;
  low_stock_threshold: number;
  store?: { name: string };
  category?: { name: string };
}

interface Paginated<T> { data: T[]; current_page: number; last_page: number; total: number }

export default function AdminInventoryPage() {
  const [result, setResult] = useState<Paginated<Product> | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [lowStock, setLowStock] = useState(false);
  const [page, setPage] = useState(1);
  const [edits, setEdits] = useState<Record<number, number>>({});
  const [saving, setSaving] = useState<Record<number, boolean>>({});

  const fetch = useCallback(() => {
    setLoading(true);
    const params: Record<string, string | number | boolean> = { page };
    if (search) params.search = search;
    if (lowStock) params.low_stock = true;
    api.get('/api/admin/inventory', { params })
      .then(r => setResult(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [search, lowStock, page]);

  useEffect(() => { fetch(); }, [fetch]);

  const save = async (product: Product) => {
    const newQty = edits[product.id];
    if (newQty === undefined) return;
    setSaving(s => ({ ...s, [product.id]: true }));
    try {
      await api.put(`/api/admin/inventory/${product.id}`, { stock_quantity: newQty });
      setEdits(e => { const n = { ...e }; delete n[product.id]; return n; });
      setResult(r => r ? { ...r, data: r.data.map(p => p.id === product.id ? { ...p, stock_quantity: newQty } : p) } : r);
    } catch { /* noop */ }
    finally { setSaving(s => { const n = { ...s }; delete n[product.id]; return n; }); }
  };

  const currentQty = (p: Product) => edits[p.id] !== undefined ? edits[p.id] : p.stock_quantity;

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Inventory</h1>
        <p className="mt-1 text-sm text-gray-500">Bulk-edit stock quantities</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search products…"
            className="w-full rounded-xl border border-gray-200 bg-white py-2 pl-9 pr-4 text-sm focus:border-sari-400 focus:outline-none focus:ring-1 focus:ring-sari-400"
          />
        </div>
        <label className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm cursor-pointer">
          <input type="checkbox" checked={lowStock} onChange={e => { setLowStock(e.target.checked); setPage(1); }} className="rounded accent-red-700" />
          Low stock only
        </label>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-sari-600" /></div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100 bg-gray-50/60">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Product</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Store</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Category</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Current Stock</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">New Stock</th>
                <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">Save</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {result?.data.length === 0 ? (
                <tr><td colSpan={6} className="px-5 py-10 text-center text-sm text-gray-400">No products found.</td></tr>
              ) : result?.data.map(p => (
                <tr key={p.id} className="hover:bg-gray-50/60 transition-colors">
                  <td className="px-5 py-3">
                    <p className="font-medium text-gray-900">{p.name}</p>
                    {p.sku && <p className="text-xs text-gray-400">{p.sku}</p>}
                  </td>
                  <td className="px-5 py-3 text-gray-600">{p.store?.name ?? '—'}</td>
                  <td className="px-5 py-3 text-gray-600">{p.category?.name ?? '—'}</td>
                  <td className="px-5 py-3">
                    <span className={`font-semibold ${p.stock_quantity === 0 ? 'text-red-600' : p.stock_quantity <= p.low_stock_threshold ? 'text-amber-600' : 'text-gray-900'}`}>
                      {p.stock_quantity}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <input
                      type="number"
                      min={0}
                      value={currentQty(p)}
                      onChange={e => setEdits(prev => ({ ...prev, [p.id]: parseInt(e.target.value, 10) || 0 }))}
                      className="w-24 rounded-lg border border-gray-200 px-2 py-1 text-sm focus:border-sari-400 focus:outline-none focus:ring-1 focus:ring-sari-400"
                    />
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button
                      onClick={() => save(p)}
                      disabled={edits[p.id] === undefined || saving[p.id]}
                      className="inline-flex items-center gap-1 rounded-lg bg-sari-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-sari-700 disabled:opacity-40 transition-colors"
                    >
                      {saving[p.id] ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                      Save
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {result && result.last_page > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">Page {result.current_page} of {result.last_page}</p>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="rounded-lg border border-gray-200 p-2 text-gray-600 hover:bg-gray-50 disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button>
            <button onClick={() => setPage(p => Math.min(result.last_page, p + 1))} disabled={page === result.last_page} className="rounded-lg border border-gray-200 p-2 text-gray-600 hover:bg-gray-50 disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button>
          </div>
        </div>
      )}
    </div>
  );
}
