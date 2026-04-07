'use client';

import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import { XCircle, ShoppingCart, ArrowLeft } from 'lucide-react';

export default function CheckoutCancelPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-gradient-to-b from-gray-50/80 to-white flex flex-col items-center justify-center text-center px-4">
        <div className="relative mb-8">
          <div className="absolute inset-0 scale-[2] bg-gradient-to-b from-red-100/30 to-transparent rounded-full blur-2xl" />
          <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-red-100 to-red-50 border-2 border-red-200/60 flex items-center justify-center shadow-lg shadow-red-100/30">
            <XCircle className="w-10 h-10 text-red-500" strokeWidth={1.8} />
          </div>
        </div>

        <h1 className="font-display text-3xl md:text-4xl text-gray-900 tracking-tight">
          Payment Cancelled
        </h1>
        <p className="mt-4 text-gray-500 text-sm md:text-base max-w-md leading-relaxed">
          Your payment was cancelled. No charges were made. You can try again or
          continue browsing.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-3 mt-8">
          <Link
            href="/cart"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-sari-500 to-sari-600 hover:from-sari-600 hover:to-sari-700 text-white font-medium px-7 py-3.5 rounded-full shadow-md shadow-sari-500/20 hover:shadow-lg hover:shadow-sari-500/30 transition-all duration-200"
          >
            <ShoppingCart className="w-4 h-4" />
            Return to Cart
          </Link>
          <Link
            href="/products"
            className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-sari-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Continue Shopping
          </Link>
        </div>
      </main>
    </>
  );
}
