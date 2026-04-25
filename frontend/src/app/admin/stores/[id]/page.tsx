'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ExternalLink, Loader2, AlertTriangle } from 'lucide-react';
import api from '@/lib/api';

interface Store {
  id: number;
  name: string;
  slug: string;
  description?: string;
  address?: string;
  phone?: string;
  logo_url?: string;
  banner_url?: string;
  is_active: boolean;
  created_at: string;
  owner?: { id: number; first_name: string; last_name: string; email: string };
}

function ConfirmModal({ title, message, confirmLabel, confirmClass, onConfirm, onCancel }: {
  title: string; message: string; confirmLabel: string; confirmClass: string;
  onConfirm: () => void; onCancel: () => void;
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
          <button onClick={onConfirm} className={`flex-1 rounded-xl py-2 text-sm font-medium text-white ${confirmClass}`}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

export default function AdminStoreDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [store, setStore] = useState<Store | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modal, setModal] = useState<'suspend' | 'unsuspend' | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/api/admin/stores/${id}`)
      .then(r => setStore(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  const doSuspend = async () => {
    if (!store) return;
    setModal(null); setSaving(true);
    try {
      await api.post(`/api/admin/stores/${store.id}/suspend`);
      setStore(s => s ? { ...s, is_active: false } : s);
    } catch { setError('Failed to suspend store'); }
    finally { setSaving(false); }
  };

  const doUnsuspend = async () => {
    if (!store) return;
    setModal(null); setSaving(true);
    try {
      await api.post(`/api/admin/stores/${store.id}/unsuspend`);
      setStore(s => s ? { ...s, is_active: true } : s);
    } catch { setError('Failed to unsuspend store'); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-red-700" /></div>;
  if (!store) return <div className="p-6 text-sm text-gray-500">Store not found.</div>;

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Link href="/admin/stores" className="rounded-lg p-2 text-gray-500 hover:bg-gray-100">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900">{store.name}</h1>
          <p className="text-sm text-gray-500">@{store.slug}</p>
        </div>
        <span className={`ml-auto rounded-full px-3 py-1 text-xs font-semibold ${store.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {store.is_active ? 'Active' : 'Suspended'}
        </span>
      </div>

      {error && <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      {/* Store info */}
      <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-6 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">Store Info</h2>
          <Link
            href={`/stores/${store.slug}`}
            target="_blank"
            className="flex items-center gap-1 text-xs text-red-700 hover:underline"
          >
            View Storefront <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
        <dl className="grid grid-cols-2 gap-4 text-sm">
          <div><dt className="text-gray-500">Name</dt><dd className="font-medium text-gray-900">{store.name}</dd></div>
          <div><dt className="text-gray-500">Phone</dt><dd className="font-medium text-gray-900">{store.phone ?? '—'}</dd></div>
          <div className="col-span-2"><dt className="text-gray-500">Address</dt><dd className="font-medium text-gray-900">{store.address ?? '—'}</dd></div>
          {store.description && (
            <div className="col-span-2"><dt className="text-gray-500">Description</dt><dd className="font-medium text-gray-900">{store.description}</dd></div>
          )}
        </dl>
      </div>

      {/* Owner info */}
      {store.owner && (
        <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-6 space-y-3">
          <h2 className="text-sm font-semibold text-gray-900">Seller</h2>
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div><dt className="text-gray-500">Name</dt><dd className="font-medium text-gray-900">{store.owner.first_name} {store.owner.last_name}</dd></div>
            <div><dt className="text-gray-500">Email</dt><dd className="font-medium text-gray-900">{store.owner.email}</dd></div>
          </dl>
          <Link href={`/admin/users/${store.owner.id}`} className="inline-block text-xs text-red-700 hover:underline">
            View user profile →
          </Link>
        </div>
      )}

      {/* Suspend / Unsuspend */}
      <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-6 space-y-3">
        <h2 className="text-sm font-semibold text-gray-900">Store Status</h2>
        <p className="text-xs text-gray-500">
          Suspending a store hides all its products from buyer surfaces. The seller retains dashboard access for in-flight orders.
        </p>
        {store.is_active ? (
          <button onClick={() => setModal('suspend')} disabled={saving} className="rounded-xl bg-red-700 px-4 py-2 text-sm font-medium text-white hover:bg-red-800 disabled:opacity-40">
            Suspend Store
          </button>
        ) : (
          <button onClick={() => setModal('unsuspend')} disabled={saving} className="rounded-xl bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-40">
            Unsuspend Store
          </button>
        )}
      </div>

      {modal === 'suspend' && (
        <ConfirmModal
          title="Suspend store?"
          message={`"${store.name}" and all its products will be hidden from buyers. Existing in-flight orders are not affected.`}
          confirmLabel="Suspend"
          confirmClass="bg-red-700 hover:bg-red-800"
          onConfirm={doSuspend}
          onCancel={() => setModal(null)}
        />
      )}
      {modal === 'unsuspend' && (
        <ConfirmModal
          title="Unsuspend store?"
          message={`"${store.name}" and its active products will become visible to buyers again.`}
          confirmLabel="Unsuspend"
          confirmClass="bg-green-600 hover:bg-green-700"
          onConfirm={doUnsuspend}
          onCancel={() => setModal(null)}
        />
      )}
    </div>
  );
}
