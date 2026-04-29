'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Package, MapPin, CreditCard, Tag } from 'lucide-react';
import api from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { formatPrice, cn } from '@/lib/utils';
import { Order } from '@/types/order';

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
  pending_confirmation: 'Pending Store Confirmation',
  confirmed: 'Confirmed',
  processing: 'Processing',
  paid: 'Paid',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  payment_failed: 'Payment Failed',
};

function formatDate(date: string): string {
  return new Intl.DateTimeFormat('en-PH', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(date));
}

export default function OrderDetailPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const orderId = params.id as string;

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user || !orderId) return;
    api.get(`/api/orders/${orderId}`)
      .then(({ data }) => setOrder(data))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [user, orderId]);

  if (loading || authLoading) {
    return (
      <>
        <main className="min-h-screen bg-gradient-to-b from-gray-50/80 to-white">
          <div className="max-w-4xl mx-auto px-4 py-10 space-y-6 animate-pulse">
            <div className="h-8 w-48 bg-gray-200 rounded" />
            <div className="h-64 bg-gray-100 rounded-2xl" />
            <div className="h-48 bg-gray-100 rounded-2xl" />
          </div>
        </main>
      </>
    );
  }

  if (notFound || !order) {
    return (
      <>
        <main className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" strokeWidth={1.5} />
            <h2 className="text-xl font-semibold text-gray-800">Order not found</h2>
            <Link href="/orders" className="mt-4 inline-block text-sari-600 hover:underline text-sm">
              Back to orders
            </Link>
          </div>
        </main>
      </>
    );
  }

  const addr = order.shipping_address ?? {};

  return (
    <>
      <main className="min-h-screen bg-gradient-to-b from-gray-50/80 to-white">
        {/* Header */}
        <div className="relative overflow-hidden bg-gradient-to-r from-sari-50 via-white to-sari-50 border-b border-gray-100">
          <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <Link
              href="/orders"
              className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to orders
            </Link>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-display text-2xl md:text-3xl text-gray-900 font-bold tracking-tight font-mono">
                {order.order_number}
              </h1>
              <span className={cn(
                'inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold border',
                statusStyles[order.status] ?? 'bg-gray-100 text-gray-700 border-gray-200'
              )}>
                {statusLabels[order.status] ?? order.status}
              </span>
            </div>
            <p className="mt-1 text-sm text-gray-500">Placed {formatDate(order.created_at)}</p>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          {/* Items */}
          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
              <Package className="w-4 h-4 text-sari-600" />
              <h2 className="font-semibold text-gray-900 text-sm">Order Items</h2>
            </div>
            <div className="divide-y divide-gray-50">
              {order.items.map((item) => (
                <div key={item.id} className="flex gap-4 px-5 py-4">
                  {/* Product image */}
                  <div className="shrink-0 w-20 h-20 rounded-xl overflow-hidden bg-gray-50 border border-gray-100">
                    {item.product_image_url ? (
                      <img
                        src={item.product_image_url}
                        alt={item.product_name}
                        className="w-full h-full object-cover"
                        onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/placeholder-product.svg'; }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-8 h-8 text-gray-300" strokeWidth={1.5} />
                      </div>
                    )}
                  </div>
                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-sm leading-snug">
                      {item.product_slug ? (
                        <Link href={`/products/${item.product_slug}`} className="hover:text-sari-700 transition-colors">
                          {item.product_name}
                        </Link>
                      ) : item.product_name}
                    </p>
                    {/* Variant options */}
                    {item.variant_options && Object.keys(item.variant_options).length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {Object.entries(item.variant_options).map(([key, value]) => (
                          <span
                            key={key}
                            className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600"
                          >
                            <Tag className="w-2.5 h-2.5" />
                            {key}: {value}
                          </span>
                        ))}
                      </div>
                    )}
                    {item.variant_name && !item.variant_options && (
                      <p className="text-xs text-gray-500 mt-1">Variant: {item.variant_name}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">Qty: {item.quantity}</p>
                  </div>
                  {/* Price */}
                  <div className="shrink-0 text-right">
                    <p className="font-semibold text-gray-900 text-sm">{formatPrice(item.total_price)}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{formatPrice(item.unit_price)} each</p>
                  </div>
                </div>
              ))}
            </div>
            {/* Totals */}
            <div className="px-5 py-4 border-t border-gray-100 bg-gray-50/40 space-y-1.5 text-sm">
              <div className="flex justify-between text-gray-500">
                <span>Subtotal</span><span>{formatPrice(order.subtotal)}</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>Shipping</span><span>{formatPrice(order.shipping_fee)}</span>
              </div>
              {order.tax > 0 && (
                <div className="flex justify-between text-gray-500">
                  <span>Tax</span><span>{formatPrice(order.tax)}</span>
                </div>
              )}
              {order.discount > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Discount</span><span>-{formatPrice(order.discount)}</span>
                </div>
              )}
              <div className="flex justify-between font-semibold text-gray-900 pt-1 border-t border-gray-200">
                <span>Total</span><span>{formatPrice(order.total)}</span>
              </div>
            </div>
          </section>

          {/* Delivery & Personal Info */}
          <div className="grid sm:grid-cols-2 gap-6">
            <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-4">
                <MapPin className="w-4 h-4 text-sari-600" />
                <h2 className="font-semibold text-gray-900 text-sm">Shipping Address</h2>
              </div>
              <div className="space-y-1 text-sm text-gray-600">
                {addr.first_name && (
                  <p className="font-medium text-gray-900">
                    {addr.first_name} {addr.last_name}
                  </p>
                )}
                {addr.phone && <p>{addr.phone}</p>}
                {addr.address_line_1 && <p>{addr.address_line_1}</p>}
                {addr.address_line_2 && <p>{addr.address_line_2}</p>}
                {(addr.city || addr.province) && (
                  <p>{[addr.city, addr.province].filter(Boolean).join(', ')}</p>
                )}
                {addr.postal_code && <p>{addr.postal_code}</p>}
                {addr.country && <p>{addr.country}</p>}
                {addr.email && <p className="text-gray-400 text-xs mt-1">{addr.email}</p>}
              </div>
            </section>

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
              {order.notes && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">Order Notes</p>
                  <p className="text-sm text-gray-600">{order.notes}</p>
                </div>
              )}
            </section>
          </div>
        </div>
      </main>
    </>
  );
}
