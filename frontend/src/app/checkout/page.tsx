'use client';

import { useState } from 'react';
import Navbar from '@/components/layout/Navbar';
import { cn, formatPrice } from '@/lib/utils';
import {
  Truck,
  Store,
  MapPin,
  CreditCard,
  QrCode,
  ShieldCheck,
  ChevronRight,
  Package,
} from 'lucide-react';

type DeliveryMethod = 'delivery' | 'pickup';
type PaymentMethod = 'cod' | 'qrph';

interface MockOrderItem {
  id: number;
  name: string;
  spec: string;
  price: number;
  quantity: number;
  image: string;
}

const mockItems: MockOrderItem[] = [
  {
    id: 1,
    name: 'Classic Cotton Tee',
    spec: 'Size: M · Color: Ivory',
    price: 599,
    quantity: 2,
    image: '/placeholder-tee.jpg',
  },
  {
    id: 2,
    name: 'Slim Fit Denim Jeans',
    spec: 'Size: 32 · Color: Indigo',
    price: 1899,
    quantity: 1,
    image: '/placeholder-jeans.jpg',
  },
  {
    id: 3,
    name: 'Linen Blend Overshirt',
    spec: 'Size: L · Color: Sage',
    price: 1299,
    quantity: 1,
    image: '/placeholder-overshirt.jpg',
  },
];

export default function CheckoutPage() {
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>('delivery');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cod');
  const [form, setForm] = useState({
    fullName: '',
    phone: '',
    address1: '',
    address2: '',
    city: '',
    province: '',
    zip: '',
  });

  const subtotal = mockItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const deliveryFee = deliveryMethod === 'delivery' ? 150 : 0;
  const total = subtotal + deliveryFee;

  const updateForm = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-gradient-to-b from-gray-50/80 to-white">
        {/* Page Header */}
        <div className="relative overflow-hidden bg-gradient-to-r from-sari-50 via-white to-sari-50 border-b border-gray-100">
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage:
                'radial-gradient(circle, #92400E 1px, transparent 1px)',
              backgroundSize: '24px 24px',
            }}
          />
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-10">
            {/* Breadcrumb */}
            <div className="flex items-center gap-1.5 text-sm text-gray-400 mb-4">
              <span className="hover:text-sari-600 cursor-pointer transition-colors">Cart</span>
              <ChevronRight className="w-3.5 h-3.5" />
              <span className="text-gray-700 font-medium">Checkout</span>
              <ChevronRight className="w-3.5 h-3.5" />
              <span className="text-gray-400">Confirmation</span>
            </div>
            <h1 className="font-display text-3xl md:text-4xl text-gray-900 tracking-tight">
              Checkout
            </h1>
            <p className="mt-2 text-gray-500 text-sm md:text-base max-w-lg">
              Complete your order details below and place your order.
            </p>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-10">
            {/* Left Column — Forms */}
            <div className="lg:col-span-2 space-y-6">
              {/* Delivery Method */}
              <section
                className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 animate-slide-up"
                style={{ animationDelay: '0.05s' }}
              >
                <h2 className="font-display text-lg text-gray-900 mb-4 flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-sari-100 text-sari-700 text-xs font-bold">
                    1
                  </span>
                  Delivery Method
                </h2>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setDeliveryMethod('delivery')}
                    className={cn(
                      'relative flex flex-col items-center gap-2 p-5 rounded-xl border-2 transition-all duration-200 cursor-pointer',
                      deliveryMethod === 'delivery'
                        ? 'border-sari-500 bg-sari-50/60 shadow-sm shadow-sari-500/10'
                        : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/50'
                    )}
                  >
                    {deliveryMethod === 'delivery' && (
                      <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-sari-500" />
                    )}
                    <div
                      className={cn(
                        'w-11 h-11 rounded-xl flex items-center justify-center transition-colors duration-200',
                        deliveryMethod === 'delivery'
                          ? 'bg-gradient-to-br from-sari-400 to-sari-600 text-white shadow-sm'
                          : 'bg-gray-100 text-gray-400'
                      )}
                    >
                      <Truck className="w-5 h-5" strokeWidth={1.8} />
                    </div>
                    <span
                      className={cn(
                        'font-medium text-sm transition-colors',
                        deliveryMethod === 'delivery' ? 'text-sari-800' : 'text-gray-600'
                      )}
                    >
                      Delivery
                    </span>
                    <span className="text-xs text-gray-400">2–5 business days</span>
                  </button>

                  <button
                    onClick={() => setDeliveryMethod('pickup')}
                    className={cn(
                      'relative flex flex-col items-center gap-2 p-5 rounded-xl border-2 transition-all duration-200 cursor-pointer',
                      deliveryMethod === 'pickup'
                        ? 'border-sari-500 bg-sari-50/60 shadow-sm shadow-sari-500/10'
                        : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/50'
                    )}
                  >
                    {deliveryMethod === 'pickup' && (
                      <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-sari-500" />
                    )}
                    <div
                      className={cn(
                        'w-11 h-11 rounded-xl flex items-center justify-center transition-colors duration-200',
                        deliveryMethod === 'pickup'
                          ? 'bg-gradient-to-br from-sari-400 to-sari-600 text-white shadow-sm'
                          : 'bg-gray-100 text-gray-400'
                      )}
                    >
                      <Store className="w-5 h-5" strokeWidth={1.8} />
                    </div>
                    <span
                      className={cn(
                        'font-medium text-sm transition-colors',
                        deliveryMethod === 'pickup' ? 'text-sari-800' : 'text-gray-600'
                      )}
                    >
                      Store Pickup
                    </span>
                    <span className="text-xs text-gray-400">Ready in 24 hours</span>
                  </button>
                </div>
              </section>

              {/* Shipping Information */}
              <section
                className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 animate-slide-up"
                style={{ animationDelay: '0.1s' }}
              >
                <h2 className="font-display text-lg text-gray-900 mb-4 flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-sari-100 text-sari-700 text-xs font-bold">
                    2
                  </span>
                  {deliveryMethod === 'delivery' ? 'Shipping Information' : 'Pickup Contact'}
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Full Name */}
                  <div className="sm:col-span-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={form.fullName}
                      onChange={(e) => updateForm('fullName', e.target.value)}
                      placeholder="Juan Dela Cruz"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder:text-gray-300 focus:ring-2 focus:ring-sari-500/20 focus:border-sari-500 outline-none transition-all duration-200"
                    />
                  </div>

                  {/* Phone Number */}
                  <div className="sm:col-span-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={form.phone}
                      onChange={(e) => updateForm('phone', e.target.value)}
                      placeholder="+63 912 345 6789"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder:text-gray-300 focus:ring-2 focus:ring-sari-500/20 focus:border-sari-500 outline-none transition-all duration-200"
                    />
                  </div>

                  {/* Address Line 1 */}
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Address Line 1
                    </label>
                    <div className="relative">
                      <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                      <input
                        type="text"
                        value={form.address1}
                        onChange={(e) => updateForm('address1', e.target.value)}
                        placeholder="House/Unit No., Street, Barangay"
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder:text-gray-300 focus:ring-2 focus:ring-sari-500/20 focus:border-sari-500 outline-none transition-all duration-200"
                      />
                    </div>
                  </div>

                  {/* Address Line 2 */}
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Address Line 2{' '}
                      <span className="text-gray-300 font-normal">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      value={form.address2}
                      onChange={(e) => updateForm('address2', e.target.value)}
                      placeholder="Building, Floor, Landmark"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder:text-gray-300 focus:ring-2 focus:ring-sari-500/20 focus:border-sari-500 outline-none transition-all duration-200"
                    />
                  </div>

                  {/* City */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      City
                    </label>
                    <input
                      type="text"
                      value={form.city}
                      onChange={(e) => updateForm('city', e.target.value)}
                      placeholder="Quezon City"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder:text-gray-300 focus:ring-2 focus:ring-sari-500/20 focus:border-sari-500 outline-none transition-all duration-200"
                    />
                  </div>

                  {/* Province */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Province
                    </label>
                    <input
                      type="text"
                      value={form.province}
                      onChange={(e) => updateForm('province', e.target.value)}
                      placeholder="Metro Manila"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder:text-gray-300 focus:ring-2 focus:ring-sari-500/20 focus:border-sari-500 outline-none transition-all duration-200"
                    />
                  </div>

                  {/* Zip Code */}
                  <div className="sm:col-span-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Zip Code
                    </label>
                    <input
                      type="text"
                      value={form.zip}
                      onChange={(e) => updateForm('zip', e.target.value)}
                      placeholder="1100"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder:text-gray-300 focus:ring-2 focus:ring-sari-500/20 focus:border-sari-500 outline-none transition-all duration-200"
                    />
                  </div>
                </div>
              </section>

              {/* Payment Method */}
              <section
                className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 animate-slide-up"
                style={{ animationDelay: '0.15s' }}
              >
                <h2 className="font-display text-lg text-gray-900 mb-4 flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-sari-100 text-sari-700 text-xs font-bold">
                    3
                  </span>
                  Payment Method
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    onClick={() => setPaymentMethod('cod')}
                    className={cn(
                      'flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all duration-200 cursor-pointer',
                      paymentMethod === 'cod'
                        ? 'border-sari-500 bg-sari-50/60 shadow-sm shadow-sari-500/10'
                        : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/50'
                    )}
                  >
                    <div
                      className={cn(
                        'w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors duration-200',
                        paymentMethod === 'cod'
                          ? 'bg-gradient-to-br from-sari-400 to-sari-600 text-white'
                          : 'bg-gray-100 text-gray-400'
                      )}
                    >
                      <CreditCard className="w-5 h-5" strokeWidth={1.8} />
                    </div>
                    <div>
                      <span
                        className={cn(
                          'font-medium text-sm block transition-colors',
                          paymentMethod === 'cod' ? 'text-sari-800' : 'text-gray-700'
                        )}
                      >
                        Cash on Delivery
                      </span>
                      <span className="text-xs text-gray-400">Pay when you receive</span>
                    </div>
                  </button>

                  <button
                    onClick={() => setPaymentMethod('qrph')}
                    className={cn(
                      'flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all duration-200 cursor-pointer',
                      paymentMethod === 'qrph'
                        ? 'border-sari-500 bg-sari-50/60 shadow-sm shadow-sari-500/10'
                        : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/50'
                    )}
                  >
                    <div
                      className={cn(
                        'w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors duration-200',
                        paymentMethod === 'qrph'
                          ? 'bg-gradient-to-br from-sari-400 to-sari-600 text-white'
                          : 'bg-gray-100 text-gray-400'
                      )}
                    >
                      <QrCode className="w-5 h-5" strokeWidth={1.8} />
                    </div>
                    <div>
                      <span
                        className={cn(
                          'font-medium text-sm block transition-colors',
                          paymentMethod === 'qrph' ? 'text-sari-800' : 'text-gray-700'
                        )}
                      >
                        QR PH
                      </span>
                      <span className="text-xs text-gray-400">Scan to pay instantly</span>
                    </div>
                  </button>
                </div>
              </section>
            </div>

            {/* Right Column — Order Summary */}
            <div className="lg:col-span-1">
              <div
                className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 lg:sticky lg:top-24 animate-slide-up"
                style={{ animationDelay: '0.2s' }}
              >
                <h2 className="font-display text-lg text-gray-900 mb-5 flex items-center gap-2">
                  <Package className="w-5 h-5 text-sari-500" strokeWidth={1.8} />
                  Order Summary
                </h2>

                {/* Item List */}
                <div className="space-y-4 mb-6">
                  {mockItems.map((item) => (
                    <div key={item.id} className="flex gap-3">
                      {/* Thumbnail placeholder */}
                      <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-gray-100 to-gray-50 border border-gray-200/60 flex items-center justify-center shrink-0">
                        <Package className="w-6 h-6 text-gray-300" strokeWidth={1.5} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {item.name}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">{item.spec}</p>
                        <div className="flex items-center justify-between mt-1.5">
                          <span className="text-xs text-gray-400">Qty: {item.quantity}</span>
                          <span className="text-sm font-semibold text-gray-800">
                            {formatPrice(item.price * item.quantity)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Divider */}
                <div className="border-t border-dashed border-gray-200 my-4" />

                {/* Totals */}
                <div className="space-y-2.5 text-sm">
                  <div className="flex justify-between text-gray-500">
                    <span>Subtotal</span>
                    <span className="font-medium text-gray-700">{formatPrice(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-gray-500">
                    <span>Delivery Fee</span>
                    <span className="font-medium text-gray-700">
                      {deliveryFee === 0 ? 'Free' : formatPrice(deliveryFee)}
                    </span>
                  </div>
                </div>

                <div className="border-t border-gray-200 mt-4 pt-4">
                  <div className="flex justify-between items-baseline">
                    <span className="text-base font-medium text-gray-700">Total</span>
                    <span className="font-display text-2xl text-gray-900 tracking-tight">
                      {formatPrice(total)}
                    </span>
                  </div>
                </div>

                {/* Place Order Button */}
                <button className="group w-full mt-6 bg-gradient-to-r from-sari-500 to-sari-600 hover:from-sari-600 hover:to-sari-700 text-white font-medium py-3.5 rounded-xl shadow-md shadow-sari-500/20 hover:shadow-lg hover:shadow-sari-500/30 transition-all duration-200 flex items-center justify-center gap-2">
                  Place Order
                  <span className="inline-block transition-transform duration-200 group-hover:translate-x-0.5">
                    &rarr;
                  </span>
                </button>

                {/* Trust Badge */}
                <div className="mt-4 flex items-center justify-center gap-1.5 text-xs text-gray-400">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Secure checkout &middot; 100% buyer protection</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
