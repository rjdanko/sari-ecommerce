'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2 } from 'lucide-react';
import api from '@/lib/api';

interface OrderItem {
  id: number;
  product_name: string;
  quantity: number;
  price: number;
  subtotal: number;
}

interface Order {
  id: number;
  order_number: string;
  status: string;
  payment_status: string;
  payment_method?: string;
  subtotal: number;
  shipping_fee: number;
  tax: number;
  discount: number;
  total: number;
  shipping_address?: Record<string, string>;
  notes?: string;
  created_at: string;
  paid_at?: string;
  shipped_at?: string;
  delivered_at?: string;
  user?: { id: number; first_name: string; last_name: string; email: string };
  items: OrderItem[];
}

const statusColors: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  processing: 'bg-blue-100 text-blue-700',
  paid: 'bg-green-100 text-green-700',
  shipped: 'bg-indigo-100 text-indigo-700',
  delivered: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-red-100 text-red-700',
  refunded: 'bg-gray-100 text-gray-600',
};

const STATUSES = ['pending', 'processing', 'paid', 'shipped', 'delivered', 'cancelled', 'refunded'];

export default function AdminOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [newStatus, setNewStatus] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/api/admin/orders/${id}`)
      .then(r => {
        const o = r.data?.order ?? r.data;
        setOrder(o);
        setNewStatus(o.status);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  const updateStatus = async () => {
    if (!order) return;
    setSaving(true); setError('');
    try {
      const { data } = await api.put(`/api/admin/orders/${order.id}/status`, { status: newStatus });
      const o = data?.order ?? data;
      setOrder(o);
      setNewStatus(o.status);
    } catch { setError('Failed to update status'); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-sari-600" /></div>;
  if (!order) return <div className="p-6 text-sm text-gray-500">Order not found.</div>;

  const addr = order.shipping_address;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/admin/orders" className="rounded-lg p-2 text-gray-500 hover:bg-gray-100">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900 font-mono">{order.order_number}</h1>
          <p className="text-sm text-gray-500">{new Date(order.created_at).toLocaleString()}</p>
        </div>
        <span className={`ml-auto rounded-full px-3 py-1 text-xs font-semibold capitalize ${statusColors[order.status] ?? 'bg-gray-100 text-gray-600'}`}>
          {order.status.replace('_', ' ')}
        </span>
      </div>

      {error && <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      {/* Two-column grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column — Items table */}
        <div className="lg:col-span-2">
          <div className="rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden h-full">
            <div className="border-b border-gray-100 px-6 py-4">
              <h2 className="text-sm font-semibold text-gray-900">Items</h2>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-gray-50/60">
                <tr>
                  <th className="px-5 py-2 text-left text-xs font-semibold text-gray-500">Product</th>
                  <th className="px-5 py-2 text-right text-xs font-semibold text-gray-500">Qty</th>
                  <th className="px-5 py-2 text-right text-xs font-semibold text-gray-500">Price</th>
                  <th className="px-5 py-2 text-right text-xs font-semibold text-gray-500">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {order.items.map(item => (
                  <tr key={item.id}>
                    <td className="px-5 py-3 text-gray-900">{item.product_name}</td>
                    <td className="px-5 py-3 text-right text-gray-600">{item.quantity}</td>
                    <td className="px-5 py-3 text-right text-gray-600">₱{Number(item.price).toLocaleString()}</td>
                    <td className="px-5 py-3 text-right font-medium text-gray-900">₱{Number(item.subtotal).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="border-t border-gray-100 px-6 py-4 space-y-1 text-sm">
              <div className="flex justify-between text-gray-600"><span>Subtotal</span><span>₱{Number(order.subtotal).toLocaleString()}</span></div>
              <div className="flex justify-between text-gray-600"><span>Shipping</span><span>₱{Number(order.shipping_fee).toLocaleString()}</span></div>
              {Number(order.discount) > 0 && <div className="flex justify-between text-emerald-700"><span>Discount</span><span>-₱{Number(order.discount).toLocaleString()}</span></div>}
              <div className="flex justify-between font-semibold text-gray-900 pt-1 border-t border-gray-100"><span>Total</span><span>₱{Number(order.total).toLocaleString()}</span></div>
            </div>
          </div>
        </div>

        {/* Right column — Buyer, Shipping, Status */}
        <div className="lg:col-span-1 space-y-6">
          {/* Buyer */}
          {order.user && (
            <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-6 space-y-2">
              <h2 className="text-sm font-semibold text-gray-900">Buyer</h2>
              <dl className="grid grid-cols-1 gap-3 text-sm">
                <div><dt className="text-gray-500">Name</dt><dd className="font-medium text-gray-900">{order.user.first_name} {order.user.last_name}</dd></div>
                <div><dt className="text-gray-500">Email</dt><dd className="font-medium text-gray-900 break-all">{order.user.email}</dd></div>
              </dl>
              <Link href={`/admin/users/${order.user.id}`} className="inline-block text-xs text-sari-600 hover:underline">View user →</Link>
            </div>
          )}

          {/* Shipping address */}
          {addr && (
            <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-6 space-y-2">
              <h2 className="text-sm font-semibold text-gray-900">Shipping Address</h2>
              <p className="text-sm text-gray-700">
                {[addr.line1, addr.line2, addr.city, addr.state, addr.postal_code, addr.country].filter(Boolean).join(', ')}
              </p>
            </div>
          )}

          {/* Status update */}
          <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-6 space-y-4">
            <h2 className="text-sm font-semibold text-gray-900">Update Status</h2>
            <div className="flex flex-col gap-3">
              <select
                value={newStatus}
                onChange={e => setNewStatus(e.target.value)}
                className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:border-sari-400 focus:outline-none focus:ring-1 focus:ring-sari-400"
              >
                {STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
              </select>
              <button
                onClick={updateStatus}
                disabled={saving || newStatus === order.status}
                className="rounded-xl bg-sari-600 px-4 py-2 text-sm font-medium text-white hover:bg-sari-700 disabled:opacity-40"
              >
                {saving ? 'Saving…' : 'Update'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
