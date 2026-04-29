'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import ProductCard from '@/components/ProductCard';
import api from '@/lib/api';
import type { Product } from '@/types/product';
import { Clock, Package, ShoppingBag, ChevronRight } from 'lucide-react';

export default function CheckoutSuccessPage() {
  const [recommendations, setRecommendations] = useState<Product[]>([]);

  useEffect(() => {
    async function fetchRecommendations() {
      try {
        const { data } = await api.get('/api/recommendations/for-you');
        const items = data.data ?? data;
        setRecommendations(Array.isArray(items) ? items.slice(0, 4) : []);
      } catch {
        try {
          const { data } = await api.get('/api/products?per_page=4');
          const items = data.data ?? data;
          setRecommendations(Array.isArray(items) ? items.slice(0, 4) : []);
        } catch {
          // ignore
        }
      }
    }

    fetchRecommendations();
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.removeItem('checkout_shipping_draft');
      } catch {
        // ignore
      }
    }
  }, []);

  return (
    <>
      <main className="min-h-screen bg-gradient-to-b from-gray-50/80 to-white">
        {/* Hero section */}
        <div className="flex flex-col items-center justify-center text-center px-4 pt-16 pb-12 sm:pt-24 sm:pb-16">
          {/* Animated clock icon */}
          <div className="relative mb-8">
            <div className="absolute inset-0 scale-[2] bg-gradient-to-b from-amber-200/30 to-transparent rounded-full blur-2xl animate-pulse" />
            <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-amber-100 to-amber-50 border-2 border-amber-200/60 flex items-center justify-center shadow-lg shadow-amber-200/30">
              <Clock className="w-10 h-10 text-amber-600" strokeWidth={1.8} />
            </div>
          </div>

          <h1 className="font-display text-3xl md:text-4xl text-gray-900 tracking-tight animate-fade-in">
            Order Placed Successfully!
          </h1>

          <div
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-amber-50 border border-amber-200/60 px-5 py-2 animate-slide-up"
            style={{ animationDelay: '0.1s' }}
          >
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500" />
            </span>
            <span className="text-sm font-semibold text-amber-700">
              Pending Store Confirmation
            </span>
          </div>

          <p
            className="mt-5 text-gray-500 text-sm md:text-base max-w-md leading-relaxed animate-slide-up"
            style={{ animationDelay: '0.2s' }}
          >
            Your order is being reviewed by the store. You&apos;ll be notified
            once it&apos;s confirmed. You can cancel your order anytime before
            confirmation.
          </p>

          <div
            className="flex flex-col sm:flex-row items-center gap-3 mt-8 animate-slide-up"
            style={{ animationDelay: '0.3s' }}
          >
            <Link
              href="/orders"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-sari-500 to-sari-600 hover:from-sari-600 hover:to-sari-700 text-white font-medium px-7 py-3.5 rounded-full shadow-md shadow-sari-500/20 hover:shadow-lg hover:shadow-sari-500/30 transition-all duration-200"
            >
              <Package className="w-4 h-4" />
              View My Orders
            </Link>
            <Link
              href="/products"
              className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-sari-600 transition-colors"
            >
              Continue Shopping
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 border-t border-gray-100">
            <div className="flex items-center gap-2 mb-6">
              <ShoppingBag className="w-5 h-5 text-sari-500" />
              <h2 className="font-display text-2xl text-gray-900">
                You May Also Like
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {recommendations.map((product, i) => (
                <div
                  key={product.id}
                  className="animate-fade-in"
                  style={{ animationDelay: `${i * 80}ms` }}
                >
                  <ProductCard product={product} />
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </>
  );
}
