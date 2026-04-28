'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

const INITIAL = {
  code: '',
  name: '',
  description: '',
  type: 'daily',
  discount_type: 'fixed',
  discount_value: '',
  min_spend: '',
  max_discount: '',
  total_quantity: '',
  max_claims_per_user: '1',
  starts_at: '',
  expires_at: '',
  is_active: true,
};

export default function AdminVoucherNewPage() {
  const router = useRouter();
  const [form, setForm] = useState(INITIAL);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (field: string, value: unknown) => setForm(f => ({ ...f, [field]: value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      await api.post('/api/admin/vouchers', {
        ...form,
        code: form.code.toUpperCase(),
        discount_value: parseFloat(form.discount_value) || 0,
        min_spend: parseFloat(form.min_spend) || 0,
        max_discount: form.max_discount ? parseFloat(form.max_discount) : null,
        total_quantity: form.total_quantity ? parseInt(form.total_quantity) : null,
        max_claims_per_user: parseInt(form.max_claims_per_user) || 1,
      });
      router.push('/admin/vouchers');
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } };
      const msg = err.response?.data?.message ?? JSON.stringify(err.response?.data?.errors ?? 'Failed to create');
      setError(msg);
    } finally { setSaving(false); }
  };

  return (
    <div className="p-6 space-y-6 max-w-xl">
      <div className="flex items-center gap-3">
        <Link href="/admin/vouchers" className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"><ArrowLeft className="h-4 w-4" /></Link>
        <h1 className="text-xl font-bold text-gray-900">Create Voucher</h1>
      </div>

      {error && <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <form onSubmit={submit} className="rounded-2xl bg-white border border-gray-100 shadow-sm p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="mb-1 block text-xs font-medium text-gray-600">Code *</label>
            <input required value={form.code} onChange={e => set('code', e.target.value.toUpperCase())}
              placeholder="SAVE20"
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm font-mono uppercase focus:border-sari-400 focus:outline-none focus:ring-1 focus:ring-sari-400" />
          </div>
          <div className="col-span-2">
            <label className="mb-1 block text-xs font-medium text-gray-600">Name *</label>
            <input required value={form.name} onChange={e => set('name', e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-sari-400 focus:outline-none focus:ring-1 focus:ring-sari-400" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Type *</label>
            <select value={form.type} onChange={e => set('type', e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-sari-400 focus:outline-none focus:ring-1 focus:ring-sari-400">
              <option value="daily">Daily</option>
              <option value="special">Special</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Discount Type *</label>
            <select value={form.discount_type} onChange={e => set('discount_type', e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-sari-400 focus:outline-none focus:ring-1 focus:ring-sari-400">
              <option value="fixed">Fixed (₱)</option>
              <option value="percentage">Percentage (%)</option>
              <option value="free_shipping">Free Shipping</option>
            </select>
          </div>
          {form.discount_type !== 'free_shipping' && (
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Discount Value *</label>
              <input required type="number" min="0" step="0.01" value={form.discount_value} onChange={e => set('discount_value', e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-sari-400 focus:outline-none focus:ring-1 focus:ring-sari-400" />
            </div>
          )}
          {form.discount_type === 'percentage' && (
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Max Discount Cap (₱)</label>
              <input type="number" min="0" step="0.01" value={form.max_discount} onChange={e => set('max_discount', e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-sari-400 focus:outline-none focus:ring-1 focus:ring-sari-400" />
            </div>
          )}
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Min Spend (₱)</label>
            <input type="number" min="0" step="0.01" value={form.min_spend} onChange={e => set('min_spend', e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-sari-400 focus:outline-none focus:ring-1 focus:ring-sari-400" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Max Claims</label>
            <input type="number" min="1" value={form.total_quantity} onChange={e => set('total_quantity', e.target.value)}
              placeholder="Unlimited"
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-sari-400 focus:outline-none focus:ring-1 focus:ring-sari-400" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Max per User</label>
            <input type="number" min="1" value={form.max_claims_per_user} onChange={e => set('max_claims_per_user', e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-sari-400 focus:outline-none focus:ring-1 focus:ring-sari-400" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Starts At *</label>
            <input required type="datetime-local" value={form.starts_at} onChange={e => set('starts_at', e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-sari-400 focus:outline-none focus:ring-1 focus:ring-sari-400" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Expires At *</label>
            <input required type="datetime-local" value={form.expires_at} onChange={e => set('expires_at', e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-sari-400 focus:outline-none focus:ring-1 focus:ring-sari-400" />
          </div>
          <div className="col-span-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.is_active} onChange={e => set('is_active', e.target.checked)} className="rounded accent-red-700" />
              <span className="text-sm font-medium text-gray-700">Active</span>
            </label>
          </div>
        </div>

        <button type="submit" disabled={saving} className="w-full rounded-xl bg-sari-600 py-2.5 text-sm font-medium text-white hover:bg-sari-700 disabled:opacity-40 flex items-center justify-center gap-2">
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          Create Voucher
        </button>
      </form>
    </div>
  );
}
