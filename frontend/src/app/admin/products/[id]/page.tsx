'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Loader2, Trash2, AlertTriangle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

interface Product {
  id: number;
  name: string;
  status: string;
  is_featured: boolean;
  base_price: number;
  stock_quantity: number;
  description?: string;
  sku?: string;
  store?: { id: number; name: string };
  category?: { name: string };
  primary_image?: { url: string };
}

function ConfirmModal({ title, message, confirmLabel, onConfirm, onCancel }: {
  title: string; message: string; confirmLabel: string;
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
          <button onClick={onConfirm} className="flex-1 rounded-xl bg-sari-600 py-2 text-sm font-medium text-white hover:bg-sari-700">{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

export default function AdminProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');
  const [isFeatured, setIsFeatured] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/api/admin/products/${id}`)
      .then(r => {
        const p = r.data?.product ?? r.data;
        setProduct(p);
        setStatus(p.status);
        setIsFeatured(p.is_featured);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  const save = async () => {
    if (!product) return;
    setSaving(true); setError('');
    try {
      const { data } = await api.put(`/api/admin/products/${product.id}`, { status, is_featured: isFeatured });
      const p = data?.product ?? data;
      setProduct(p);
      setStatus(p.status);
      setIsFeatured(p.is_featured);
    } catch { setError('Failed to save changes'); }
    finally { setSaving(false); }
  };

  const doDelete = async () => {
    if (!product) return;
    setShowDelete(false);
    try {
      await api.delete(`/api/admin/products/${product.id}`);
      router.push('/admin/products');
    } catch { setError('Failed to delete product'); }
  };

  if (loading) return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-sari-600" /></div>;
  if (!product) return <div className="p-6 text-sm text-gray-500">Product not found.</div>;

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Link href="/admin/products" className="rounded-lg p-2 text-gray-500 hover:bg-gray-100">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-gray-900 truncate">{product.name}</h1>
          <p className="text-sm text-gray-500">{product.store?.name ?? '—'}</p>
        </div>
      </div>

      {error && <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      {/* Preview */}
      <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-6 flex gap-4">
        {product.primary_image ? (
          <Image src={product.primary_image.url} alt={product.name} width={80} height={80} className="h-20 w-20 rounded-xl object-cover shrink-0" />
        ) : (
          <div className="h-20 w-20 rounded-xl bg-gray-100 shrink-0" />
        )}
        <dl className="grid grid-cols-2 gap-3 text-sm flex-1">
          <div><dt className="text-gray-500">Category</dt><dd className="font-medium text-gray-900">{product.category?.name ?? '—'}</dd></div>
          <div><dt className="text-gray-500">SKU</dt><dd className="font-medium text-gray-900">{product.sku ?? '—'}</dd></div>
          <div><dt className="text-gray-500">Base price</dt><dd className="font-medium text-gray-900">₱{Number(product.base_price).toLocaleString()}</dd></div>
          <div><dt className="text-gray-500">Stock</dt><dd className="font-medium text-gray-900">{product.stock_quantity}</dd></div>
        </dl>
      </div>

      {/* Edit status + featured */}
      <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-6 space-y-4">
        <h2 className="text-sm font-semibold text-gray-900">Edit</h2>
        <div className="flex items-center gap-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Status</label>
            <select
              value={status}
              onChange={e => setStatus(e.target.value)}
              className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:border-sari-400 focus:outline-none focus:ring-1 focus:ring-sari-400"
            >
              <option value="active">Active</option>
              <option value="draft">Draft</option>
              <option value="archived">Archived</option>
            </select>
          </div>
          <label className="flex items-center gap-2 cursor-pointer mt-5">
            <input type="checkbox" checked={isFeatured} onChange={e => setIsFeatured(e.target.checked)} className="rounded accent-red-700" />
            <span className="text-sm font-medium text-gray-700">Featured</span>
          </label>
        </div>
        <button onClick={save} disabled={saving} className="rounded-xl bg-sari-600 px-5 py-2 text-sm font-medium text-white hover:bg-sari-700 disabled:opacity-40">
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>

      {/* Delete */}
      <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-6 space-y-3">
        <h2 className="text-sm font-semibold text-gray-900">Danger Zone</h2>
        <p className="text-xs text-gray-500">Deleting a product is a soft delete — it will be archived and hidden from buyers.</p>
        <button onClick={() => setShowDelete(true)} className="flex items-center gap-2 rounded-xl border border-red-200 px-4 py-2 text-sm font-medium text-sari-600 hover:bg-sari-50">
          <Trash2 className="h-4 w-4" /> Delete Product
        </button>
      </div>

      {showDelete && (
        <ConfirmModal
          title="Delete product?"
          message={`"${product.name}" will be soft-deleted and hidden from all buyer surfaces.`}
          confirmLabel="Delete"
          onConfirm={doDelete}
          onCancel={() => setShowDelete(false)}
        />
      )}
    </div>
  );
}
