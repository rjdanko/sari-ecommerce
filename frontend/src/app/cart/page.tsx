'use client';

import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import { ShoppingBag } from 'lucide-react';

export default function CartPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-gradient-to-b from-gray-50/80 to-white">
        {/* Page header */}
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
            <h1 className="font-display text-3xl md:text-4xl text-gray-900 tracking-tight">
              Shopping Cart
            </h1>
            <p className="mt-2 text-gray-500 text-sm md:text-base max-w-lg">
              Review your items and proceed to checkout when you&apos;re ready.
            </p>
          </div>
        </div>

        {/* Empty cart state */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
          <div className="flex flex-col items-center justify-center text-center">
            {/* Layered icon container with ambient glow */}
            <div className="relative mb-8">
              <div className="absolute inset-0 scale-150 bg-gradient-to-b from-sari-100/40 to-transparent rounded-full blur-2xl" />
              <div className="relative w-28 h-28 rounded-3xl bg-gradient-to-br from-gray-100 to-gray-50 border border-gray-200/60 flex items-center justify-center shadow-sm">
                <ShoppingBag className="w-12 h-12 text-gray-300" strokeWidth={1.5} />
              </div>
            </div>

            <h2 className="font-display text-2xl md:text-3xl text-gray-900 tracking-tight">
              Your Cart is Empty
            </h2>
            <p className="mt-3 text-gray-500 text-base max-w-sm">
              Add some products to get started!
            </p>

            <Link
              href="/products"
              className="group mt-8 inline-flex items-center gap-2 bg-gradient-to-r from-sari-500 to-sari-600 hover:from-sari-600 hover:to-sari-700 text-white font-medium px-8 py-3.5 rounded-full shadow-md shadow-sari-500/20 hover:shadow-lg hover:shadow-sari-500/30 transition-all duration-200"
            >
              Continue Shopping
              <span className="inline-block transition-transform duration-200 group-hover:translate-x-0.5">&rarr;</span>
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
