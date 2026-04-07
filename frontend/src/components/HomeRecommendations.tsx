'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import ProductCard from '@/components/ProductCard';
import { Loader2, Sparkles } from 'lucide-react';
import api from '@/lib/api';
import type { Product } from '@/types/product';

export default function HomeRecommendations() {
  const { user, loading: authLoading } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchRecommendations = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/api/recommendations/for-you');
      const items = data.data ?? data;
      setProducts(Array.isArray(items) ? items.slice(0, 4) : []);
    } catch {
      // Fallback to popular products
      try {
        const { data } = await api.get('/api/recommendations/popular');
        const items = data.data ?? data;
        setProducts(Array.isArray(items) ? items.slice(0, 4) : []);
      } catch {
        // ignore
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchRecommendations();
    }
  }, [user, fetchRecommendations]);

  // Still loading auth — show nothing to prevent flash
  if (authLoading) return null;

  // Not logged in — show sign-in CTA
  if (!user) {
    return (
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-gray-50 to-white" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <h2 className="font-display text-3xl md:text-4xl text-gray-900 mb-3">
            Recommended For You
          </h2>
          <p className="text-gray-500 max-w-md">
            Sign in to see personalized recommendations powered by AI.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center mt-6 text-sm font-medium text-sari-600 hover:text-sari-700 transition-colors"
          >
            Sign in to get started &rarr;
          </Link>
        </div>
      </section>
    );
  }

  // Logged in — show recommendations
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-gray-50 to-white" />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="flex items-end justify-between mb-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-5 h-5 text-sari-500" />
              <span className="text-xs font-semibold text-sari-600 tracking-wide uppercase">
                Personalized
              </span>
            </div>
            <h2 className="font-display text-3xl md:text-4xl text-gray-900">
              Recommended For You
            </h2>
            <p className="mt-2 text-gray-500">
              Picks curated just for you, powered by AI.
            </p>
          </div>
          <Link
            href="/products"
            className="hidden sm:inline-flex text-sm font-medium text-sari-600 hover:text-sari-700 transition-colors"
          >
            View all &rarr;
          </Link>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 text-sari-500 animate-spin" />
          </div>
        ) : products.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {products.map((product, i) => (
              <div
                key={product.id}
                className="animate-fade-in"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <ProductCard product={product} />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500 text-sm">
              Browse some products and we&apos;ll start personalizing your recommendations!
            </p>
            <Link
              href="/products"
              className="inline-flex items-center mt-4 text-sm font-medium text-sari-600 hover:text-sari-700 transition-colors"
            >
              Explore products &rarr;
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
