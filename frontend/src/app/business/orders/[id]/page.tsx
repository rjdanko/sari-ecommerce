'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Package, MapPin, User, CreditCard, Tag, CheckCircle } from 'lucide-react';
import api from '@/lib/api';
import { formatPrice, cn } from '@/lib/utils';
import ConfirmOrderModal from '@/components/orders/ConfirmOrderModal';
import type { Order } from '@/types/order';

const statusStyles: Record<string, string> = {
  pending_confirmation: 'bg-amber-50 text-amber-700 border-amber-200',
  confirmed: 'bg-blue-50 text-blue-700 border-blue-200',
  processing: 'bg-blue-50 text-blue-700 border-blue-200',
  paid: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  shipped: 'bg-sari-50 text-sari-700 border-sari-200',
  delivered: 'bg-green-50 text-green-700 border-green-200',
  cancelled: 'bg-red-50 text-red-700 border-red-200',
  payment_failed: 'bg-red-50 text-red-600 border-red-200',
};

const statusLabels: Record<string, string> = {
  pending_confirmation: 'Pending Confirmation',
  confirmed: 'Confirmed',
  processing: 'Processing',
  paid: 'Paid',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  payment_failed: 'Payment Failed',
};

function formatDate(d: string) {
  return new Intl.DateTimeFormat('en-PH', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(d));
}

interface BusinessOrder extends Order {
  user?: {
    first_name: string;
    last_name: string;
    email: string;
    phone?: string;
  };
}

export default function BusinessOrderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const orderId = params.id as string;

  const [order, setOrder] = useState<BusinessOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [confirmingOrder, setConfirmingOrder] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);

  const fetchOrder = () => {
    api.get(`/api/business/orders`, { params: { per_page: 999 } })
      .then(({ data }) => {
        const found = (data.data ?? []).find((o: BusinessOrder) => String(o.id) === String(orderId));
        if (found) setOrder(found);
        else setNotFound(true);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchOrder(); }, [orderId]);

  const handleConfirm = async () => {
    if (!order) return;
    setConfirmLoading(true);
    try {
      await api.post(`/api/business/orders/${order.id}/confirm`);
      fetchOrder();
      setConfirmingOrder(false);
    } finally {
      setConfirmLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="px-8 py-6 animate-pulse space-y-4">
        <div className="h-8 w-48 bg-gray-200 rounded" />
        <div className="h-64 bg-gray-100 rounded-2xl" />
      </div>
    );
  }

  if (notFound || !order) {
    return (
      <div className="px-8 py-6 text-center">
        <p className="text-gray-500">Order not found.</p>
        <Link href="/business/orders" className="text-sari-600 hover:underline text-sm mt-2 inline-block">
          Back to orders
        </Link>
      </div>
    );
  }

  const addr = order.shipping_address ?? {};

  return (
    <div className="px-6 py-6 max-w-4xl">
      {/* Back + Header */}
      <Link
        href="/business/orders"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-5 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to orders
      </Link>

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <h1 className="font-display text-2xl font-bold text-gray-900 font-mono">
          {order.order_number}
        </h1>
        <span className={cn(
          'inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold border',
          statusStyles[order.status] ?? 'bg-gray-100 text-gray-700 border-gray-200'
        )}>
          {statusLabels[order.status] ?? order.status}
        </span>
        {order.status === 'pending_confirmation' && (
          <button
            onClick={() => setConfirmingOrder(true)}
            className="ml-auto flex items-center gap-1.5 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600 transition-colors"
          >
            <CheckCircle className="w-4 h-4" />
            Confirm Order
          </button>
        )}
      </div>

      <div className="space-y-6">
        {/* Items */}
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <Package className="w-4 h-4 text-sari-600" />
            <h2 className="font-semibold text-gray-900 text-sm">Order Items</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {order.items.map((item) => (
              <div key={item.id} className="flex gap-4 px-5 py-4">
                <div className="shrink-0 w-16 h-16 rounded-xl overflow-hidden bg-gray-50 border border-gray-100">
                  {item.product_image_url ? (
                    <img
                      src={item.product_image_url}
                      alt={item.product_name}
                      className="w-full h-full object-cover"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/placeholder-product.svg'; }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="w-6 h-6 text-gray-300" strokeWidth={1.5} />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 text-sm">{item.product_name}</p>
                  {item.variant_options && Object.keys(item.variant_options).length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {Object.entries(item.variant_options).map(([key, value]) => (
                        <span key={key} className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600">
                          <Tag className="w-2.5 h-2.5" />{key}: {value}
                        </span>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-gray-400 mt-0.5">Qty: {item.quantity}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-semibold text-sm text-gray-900">{formatPrice(item.total_price)}</p>
                  <p className="text-xs text-gray-400">{formatPrice(item.unit_price)} each</p>
                </div>
              </div>
            ))}
          </div>
          <div className="px-5 py-4 border-t border-gray-100 bg-gray-50/40 space-y-1 text-sm">
            <div className="flex justify-between text-gray-500"><span>Subtotal</span><span>{formatPrice(order.subtotal)}</span></div>
            <div className="flex justify-between text-gray-500"><span>Shipping</span><span>{formatPrice(order.shipping_fee)}</span></div>
            {order.discount > 0 && <div className="flex justify-between text-emerald-600"><span>Discount</span><span>-{formatPrice(order.discount)}</span></div>}
            <div className="flex justify-between font-semibold text-gray-900 pt-1 border-t border-gray-200"><span>Total</span><span>{formatPrice(order.total)}</span></div>
          </div>
        </section>

        <div className="grid sm:grid-cols-2 gap-6">
          {/* Customer info */}
          {order.user && (
            <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-4">
                <User className="w-4 h-4 text-sari-600" />
                <h2 className="font-semibold text-gray-900 text-sm">Customer</h2>
              </div>
              <div className="space-y-1 text-sm text-gray-600">
                <p className="font-medium text-gray-900">{order.user.first_name} {order.user.last_name}</p>
                <p className="text-gray-500">{order.user.email}</p>
                {order.user.phone && <p>{order.user.phone}</p>}
              </div>
            </section>
          )}

          {/* Shipping address */}
          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="w-4 h-4 text-sari-600" />
              <h2 className="font-semibold text-gray-900 text-sm">Shipping Address</h2>
            </div>
            <div className="space-y-1 text-sm text-gray-600">
              {addr.first_name && <p className="font-medium text-gray-900">{addr.first_name} {addr.last_name}</p>}
              {addr.phone && <p>{addr.phone}</p>}
              {addr.address_line_1 && <p>{addr.address_line_1}</p>}
              {addr.address_line_2 && <p>{addr.address_line_2}</p>}
              {(addr.city || addr.province) && <p>{[addr.city, addr.province].filter(Boolean).join(', ')}</p>}
              {addr.postal_code && <p>{addr.postal_code}</p>}
            </div>
          </section>

          {/* Payment */}
          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <CreditCard className="w-4 h-4 text-sari-600" />
              <h2 className="font-semibold text-gray-900 text-sm">Payment</h2>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Method</span>
                <span className="text-gray-900 font-medium capitalize">
                  {order.payment_method?.replace('_', ' ') ?? 'N/A'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Status</span>
                <span className="text-gray-900 font-medium capitalize">
                  {order.payment_status ?? 'N/A'}
                </span>
              </div>
              {order.paid_at && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Paid at</span>
                  <span className="text-gray-900 text-xs">{formatDate(order.paid_at)}</span>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>

      <ConfirmOrderModal
        isOpen={confirmingOrder}
        orderNumber={order.order_number}
        onConfirm={handleConfirm}
        onCancel={() => setConfirmingOrder(false)}
        loading={confirmLoading}
      />
    </div>
  );
}
