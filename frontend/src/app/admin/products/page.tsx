'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Search, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import api from '@/lib/api';

interface Product {
  id: number;
  name: string;
  status: string;
  base_price: number;
  stock_quantity: number;
  gender?: string;
  store?: { id: number; name: string };
  category?: { name: string };
  primary_image?: { url: string };
}

interface Paginated<T> { data: T[]; current_page: number; last_page: number; total: number }

const statusStyles: Record<string, string> = {
  active: 'bg-emerald-50 text-emerald-700',
  draft: 'bg-gray-100 text-gray-600',
  archived: 'bg-red-50 text-red-700',
};

function stockColor(qty: number) {
  if (qty === 0) return 'text-red-600 font-semibold';
  if (qty < 15) return 'text-amber-600 font-semibold';
  return 'text-emerald-600';
}

export default function AdminProductsPage() {
  const [result, setResult] = useState<Paginated<Product> | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [gender, setGender] = useState('all');
  const [lowStock, setLowStock] = useState(false);
  const [page, setPage] = useState(1);

  const fetch = useCallback(() => {
    setLoading(true);
    const params: Record<string, string | number | boolean> = { page };
    if (search) params.search = search;
    if (status !== 'all') params.status = status;
    if (gender !== 'all') params.gender = gender;
    if (lowStock) params.low_stock = true;
    api.get('/api/admin/products', { params })
      .then(r => setResult(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [search, status, gender, lowStock, page]);

  useEffect(() => { fetch(); }, [fetch]);

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Products</h1>
        <p className="mt-1 text-sm text-gray-500">{result?.total ?? 0} total products</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search products…"
            className="w-full rounded-xl border border-gray-200 bg-white py-2 pl-9 pr-4 text-sm focus:border-red-400 focus:outline-none focus:ring-1 focus:ring-red-400"
          />
        </div>
        <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }} className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:border-red-400 focus:outline-none focus:ring-1 focus:ring-red-400">
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="draft">Draft</option>
          <option value="archived">Archived</option>
        </select>
        <select value={gender} onChange={e => { setGender(e.target.value); setPage(1); }} className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:border-red-400 focus:outline-none focus:ring-1 focus:ring-red-400">
          <option value="all">All genders</option>
          <option value="men">Men</option>
          <option value="women">Women</option>
          <option value="unisex">Unisex</option>
        </select>
        <label className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm cursor-pointer">
          <input type="checkbox" checked={lowStock} onChange={e => { setLowStock(e.target.checked); setPage(1); }} className="rounded accent-red-700" />
          Low stock only
        </label>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-red-700" /></div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100 bg-gray-50/60">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Product</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Store</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Category</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Price</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Stock</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Status</th>
                <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {result?.data.length === 0 ? (
                <tr><td colSpan={7} className="px-5 py-10 text-center text-sm text-gray-400">No products found.</td></tr>
              ) : result?.data.map(p => (
                <tr key={p.id} className="hover:bg-gray-50/60 transition-colors">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      {p.primary_image ? (
                        <Image src={p.primary_image.url} alt={p.name} width={36} height={36} className="h-9 w-9 rounded-lg object-cover" />
                      ) : (
                        <div className="h-9 w-9 rounded-lg bg-gray-100" />
                      )}
                      <span className="font-medium text-gray-900 line-clamp-1">{p.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-gray-600">{p.store?.name ?? '—'}</td>
                  <td className="px-5 py-3 text-gray-600">{p.category?.name ?? '—'}</td>
                  <td className="px-5 py-3 text-gray-900">₱{Number(p.base_price).toLocaleString()}</td>
                  <td className={`px-5 py-3 ${stockColor(p.stock_quantity)}`}>{p.stock_quantity}</td>
                  <td className="px-5 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${statusStyles[p.status] ?? 'bg-gray-100 text-gray-600'}`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <Link href={`/admin/products/${p.id}`} className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 transition-colors">
                      Edit
                    </Link>
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
