'use client';

import { useEffect, useState, useCallback } from 'react';
import { Search, ChevronLeft, ChevronRight, Loader2, AlertTriangle, Star } from 'lucide-react';
import api from '@/lib/api';

interface Review {
  id: number;
  rating: number;
  comment?: string;
  created_at: string;
  user?: { first_name: string; last_name: string };
  product?: { id: number; name: string; store?: { name: string } };
}

interface Paginated<T> { data: T[]; current_page: number; last_page: number; total: number }

function ConfirmModal({ title, message, onConfirm, onCancel }: {
  title: string; message: string; onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
          <AlertTriangle className="h-6 w-6 text-red-700" />
        </div>
        <h3 className="text-base font-semibold text-gray-900">{title}</h3>
        <p className="mt-1 text-sm text-gray-500">{message}</p>
        <div className="mt-5 flex gap-3">
          <button onClick={onCancel} className="flex-1 rounded-xl border border-gray-200 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
          <button onClick={onConfirm} className="flex-1 rounded-xl bg-red-700 py-2 text-sm font-medium text-white hover:bg-red-800">Delete</button>
        </div>
      </div>
    </div>
  );
}

function Stars({ rating }: { rating: number }) {
  return (
    <span className="inline-flex gap-0.5">
      {[1,2,3,4,5].map(i => (
        <Star key={i} className={`h-3.5 w-3.5 ${i <= rating ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}`} />
      ))}
    </span>
  );
}

export default function AdminReviewsPage() {
  const [result, setResult] = useState<Paginated<Review> | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [rating, setRating] = useState('');
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<Review | null>(null);

  const fetch = useCallback(() => {
    setLoading(true);
    const params: Record<string, string | number> = { page };
    if (rating) params.rating = rating;
    api.get('/api/admin/reviews', { params })
      .then(r => setResult(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [rating, page]);

  useEffect(() => { fetch(); }, [fetch]);

  const doDelete = async () => {
    if (!deleteTarget) return;
    const id = deleteTarget.id;
    setDeleteTarget(null);
    try {
      await api.delete(`/api/admin/reviews/${id}`);
      setResult(r => r ? { ...r, data: r.data.filter(rev => rev.id !== id), total: r.total - 1 } : r);
    } catch { fetch(); }
  };

  const filtered = search
    ? result?.data.filter(r =>
        r.product?.name.toLowerCase().includes(search.toLowerCase()) ||
        r.user?.first_name.toLowerCase().includes(search.toLowerCase()) ||
        r.user?.last_name.toLowerCase().includes(search.toLowerCase())
      )
    : result?.data;

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reviews</h1>
        <p className="mt-1 text-sm text-gray-500">{result?.total ?? 0} total</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search product or reviewer…"
            className="w-full rounded-xl border border-gray-200 bg-white py-2 pl-9 pr-4 text-sm focus:border-red-400 focus:outline-none focus:ring-1 focus:ring-red-400"
          />
        </div>
        <select
          value={rating}
          onChange={e => { setRating(e.target.value); setPage(1); }}
          className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:border-red-400 focus:outline-none focus:ring-1 focus:ring-red-400"
        >
          <option value="">All ratings</option>
          {[5,4,3,2,1].map(r => <option key={r} value={r}>{r} star{r !== 1 ? 's' : ''}</option>)}
        </select>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-red-700" /></div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100 bg-gray-50/60">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Product</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Reviewer</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Rating</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Comment</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Date</th>
                <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered?.length === 0 ? (
                <tr><td colSpan={6} className="px-5 py-10 text-center text-sm text-gray-400">No reviews found.</td></tr>
              ) : filtered?.map(r => (
                <tr key={r.id} className="hover:bg-gray-50/60 transition-colors">
                  <td className="px-5 py-3">
                    <p className="font-medium text-gray-900 line-clamp-1">{r.product?.name ?? '—'}</p>
                    {r.product?.store && <p className="text-xs text-gray-400">{r.product.store.name}</p>}
                  </td>
                  <td className="px-5 py-3 text-gray-600">
                    {r.user ? `${r.user.first_name} ${r.user.last_name}` : '—'}
                  </td>
                  <td className="px-5 py-3"><Stars rating={r.rating} /></td>
                  <td className="px-5 py-3 text-gray-600 max-w-xs">
                    <span className="line-clamp-2">{r.comment ?? <em className="text-gray-400">No comment</em>}</span>
                  </td>
                  <td className="px-5 py-3 text-gray-500 whitespace-nowrap">{new Date(r.created_at).toLocaleDateString()}</td>
                  <td className="px-5 py-3 text-right">
                    <button
                      onClick={() => setDeleteTarget(r)}
                      className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 transition-colors"
                    >
                      Delete
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
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="rounded-lg border border-gray-200 p-2 disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button>
            <button onClick={() => setPage(p => Math.min(result.last_page, p + 1))} disabled={page === result.last_page} className="rounded-lg border border-gray-200 p-2 disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button>
          </div>
        </div>
      )}

      {deleteTarget && (
        <ConfirmModal
          title="Delete review?"
          message={`This review by ${deleteTarget.user ? `${deleteTarget.user.first_name} ${deleteTarget.user.last_name}` : 'this user'} will be soft-deleted and the product's rating will be recalculated.`}
          onConfirm={doDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
