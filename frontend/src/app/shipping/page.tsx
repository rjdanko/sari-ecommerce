import { Truck, Clock, Package, MapPin } from 'lucide-react';
import Link from 'next/link';

export default function ShippingPage() {
  return (
    <main className="bg-white min-h-screen">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Shipping Information</h1>
        <p className="text-gray-500 mb-8">
          We ship nationwide across the Philippines. Here&apos;s everything you need to know.
        </p>

        <div className="space-y-4">
          {/* Delivery timeframes */}
          <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-sari-500" />
              <h2 className="text-base font-semibold text-sari-700">Delivery Timeframes</h2>
            </div>
            <div className="divide-y divide-gray-50">
              {[
                { area: 'Metro Manila', time: '2–3 business days' },
                { area: 'Luzon (provincial)', time: '3–5 business days' },
                { area: 'Visayas', time: '5–7 business days' },
                { area: 'Mindanao', time: '5–7 business days' },
              ].map(({ area, time }) => (
                <div key={area} className="flex justify-between py-3 text-sm">
                  <span className="text-gray-700 font-medium">{area}</span>
                  <span className="text-gray-500">{time}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Shipping fees */}
          <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-sari-500" />
              <h2 className="text-base font-semibold text-sari-700">Shipping Fees</h2>
            </div>
            <div className="divide-y divide-gray-50">
              <div className="flex justify-between py-3 text-sm">
                <span className="text-gray-700 font-medium">Standard shipping</span>
                <span className="text-gray-500">₱99 flat rate</span>
              </div>
              <div className="flex justify-between py-3 text-sm">
                <span className="text-gray-700 font-medium">Free shipping</span>
                <span className="text-emerald-600 font-medium">Orders ₱999 and above</span>
              </div>
            </div>
          </div>

          {/* Carriers */}
          <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Truck className="w-5 h-5 text-sari-500" />
              <h2 className="text-base font-semibold text-sari-700">Our Carriers</h2>
            </div>
            <p className="text-sm text-gray-600">
              We partner with trusted Philippine couriers. Your carrier is assigned based on availability and destination.
            </p>
            <div className="flex flex-wrap gap-2">
              {['J&T Express', 'LBC Express', 'Ninja Van'].map(carrier => (
                <span key={carrier} className="rounded-full bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700">
                  {carrier}
                </span>
              ))}
            </div>
          </div>

          {/* Tracking */}
          <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-6 space-y-3">
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-sari-500" />
              <h2 className="text-base font-semibold text-sari-700">Tracking Your Order</h2>
            </div>
            <p className="text-sm text-gray-600">
              Once your order is shipped, you&apos;ll receive an email with your tracking number. Use it on your assigned carrier&apos;s website to follow your delivery in real time.
            </p>
            <p className="text-sm text-gray-600">
              You can also view your order status anytime from{' '}
              <Link href="/orders" className="font-medium text-sari-600 hover:underline">My Orders</Link>.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
