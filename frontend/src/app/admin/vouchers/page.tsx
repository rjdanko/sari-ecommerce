'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Plus, ChevronLeft, ChevronRight, Loader2, AlertTriangle } from 'lucide-react';
import api from '@/lib/api';

interface Voucher {
  id: number;
  code: string;
  name: string;
  discount_type: string;
  discount_value: number;
  min_spend: number;
  claimed_count: number;
  total_quantity?: number;
  expires_at: string;
  is_active: boolean;
}

interface Paginated<T> { data: T[]; current_page: number; last_page: number; total: number }

function ConfirmModal({ title, message, confirmLabel, confirmClass, onConfirm, onCancel }: {
  title: string; message: string; confirmLabel: string; confirmClass: string;
  onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-sari-50">
          <AlertTriangle className="h-6 w-6 text-sari-600" />
        </div>
        <h3 className="text-base font-semibold text-gray-900">{title}</h3>
        <p className="mt-1 text-sm text-gray-500">{message}</p>
        <div className="mt-5 flex gap-3">
          <button onClick={onCancel} className="flex-1 rounded-xl border border-gray-200 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
          <button onClick={onConfirm} className={`flex-1 rounded-xl py-2 text-sm font-medium text-white ${confirmClass}`}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

export default function AdminVouchersPage() {
  const [result, setResult] = useState<Paginated<Voucher> | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<Voucher | null>(null);
  const [deleteError, setDeleteError] = useState('');

  const fetch = useCallback(() => {
    setLoading(true);
    api.get('/api/admin/vouchers', { params: { page } })
      .then(r => setResult(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [page]);

  useEffect(() => { fetch(); }, [fetch]);

  const doDelete = async () => {
    if (!deleteTarget) return;
    setDeleteError('');
    try {
      await api.delete(`/api/admin/vouchers/${deleteTarget.id}`);
      setDeleteTarget(null);
      fetch();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      setDeleteError(err.response?.data?.error ?? 'Failed to delete');
      setDeleteTarget(null);
    }
  };

  const toggleActive = async (v: Voucher) => {
    await api.put(`/api/admin/vouchers/${v.id}`, { is_active: !v.is_active });
    fetch();
  };

  const discountLabel = (v: Voucher) => {
    if (v.discount_type === 'free_shipping') return 'Free Shipping';
    if (v.discount_type === 'percentage') return `${v.discount_value}%`;
    return `₱${Number(v.discount_value).toLocaleString()}`;
  };

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Vouchers</h1>
          <p className="mt-1 text-sm text-gray-500">{result?.total ?? 0} total</p>
        </div>
        <Link href="/admin/vouchers/new" className="inline-flex items-center gap-2 rounded-xl bg-sari-600 px-4 py-2 text-sm font-medium text-white hover:bg-sari-700">
          <Plus className="h-4 w-4" /> Create Voucher
        </Link>
      </div>

      {deleteError && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">{deleteError}</div>
      )}

      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-sari-600" /></div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100 bg-gray-50/60">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Code</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Type</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Value</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Min Spend</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Claims</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Expires</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Status</th>
                <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {result?.data.length === 0 ? (
                <tr><td colSpan={8} className="px-5 py-10 text-center text-sm text-gray-400">No vouchers.</td></tr>
              ) : result?.data.map(v => (
                <tr key={v.id} className="hover:bg-gray-50/60 transition-colors">
                  <td className="px-5 py-3 font-mono font-semibold text-gray-900">{v.code}</td>
                  <td className="px-5 py-3 capitalize text-gray-600">{v.discount_type.replace('_', ' ')}</td>
                  <td className="px-5 py-3 text-gray-900">{discountLabel(v)}</td>
                  <td className="px-5 py-3 text-gray-600">₱{Number(v.min_spend).toLocaleString()}</td>
                  <td className="px-5 py-3 text-gray-600">
                    {v.claimed_count}{v.total_quantity ? `/${v.total_quantity}` : ''}
                  </td>
                  <td className="px-5 py-3 text-gray-500">{new Date(v.expires_at).toLocaleDateString()}</td>
                  <td className="px-5 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${v.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {v.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <div className="inline-flex gap-2">
                      <Link href={`/admin/vouchers/${v.id}`} className="rounded-lg bg-sari-50 px-3 py-1.5 text-xs font-medium text-sari-700 hover:bg-sari-100">Edit</Link>
                      <button onClick={() => toggleActive(v)} className="rounded-lg bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100">
                        {v.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                      <button onClick={() => setDeleteTarget(v)} className="rounded-lg bg-sari-50 px-3 py-1.5 text-xs font-medium text-sari-700 hover:bg-sari-100">Delete</button>
                    </div>
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
          title="Delete voucher?"
          message={`Voucher "${deleteTarget.code}" will be permanently deleted. This is only allowed if no claims exist.`}
          confirmLabel="Delete"
          confirmClass="bg-sari-600 hover:bg-sari-700"
          onConfirm={doDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
