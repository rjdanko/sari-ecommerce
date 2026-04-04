'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import ProductCard from '@/components/ProductCard';
import { Heart, ShoppingBag, Loader2 } from 'lucide-react';
import api from '@/lib/api';
import type { Product } from '@/types/product';

export default function WishlistPage() {
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchWishlist = useCallback(async () => {
    try {
      const { data } = await api.get('/api/wishlist');
      setItems(data.data ?? data);
    } catch {
      // not logged in or empty
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWishlist();
  }, [fetchWishlist]);

  const removeFromWishlist = async (productId: number) => {
    try {
      await api.post(`/api/wishlist/${productId}`);
      setItems((prev) => prev.filter((p) => p.id !== productId));
    } catch {
      // ignore
    }
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
            <h1 className="font-display text-3xl md:text-4xl text-gray-900 tracking-tight">
              My Wishlist
            </h1>
            <p className="mt-2 text-gray-500 text-sm md:text-base max-w-lg">
              Your saved items, all in one place.
            </p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-32">
              <Loader2 className="w-8 h-8 text-sari-500 animate-spin" />
              <p className="mt-3 text-sm text-gray-400">Loading your wishlist...</p>
            </div>
          ) : items.length === 0 ? (
            /* Empty State */
            <div className="flex flex-col items-center justify-center py-24 animate-fade-in">
              <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center mb-6">
                <Heart className="w-10 h-10 text-gray-300" strokeWidth={1.5} />
              </div>
              <h2 className="font-display text-2xl md:text-3xl text-gray-900 mb-2">
                Your Wishlist is Empty
              </h2>
              <p className="text-gray-500 text-sm md:text-base mb-8 max-w-sm text-center">
                Save your favorite items for later! Browse our collection and tap the heart icon on any product.
              </p>
              <Link
                href="/products"
                className="inline-flex items-center gap-2 bg-gradient-to-r from-sari-500 to-sari-600 hover:from-sari-600 hover:to-sari-700 text-white font-medium px-8 py-3.5 rounded-full shadow-md shadow-sari-500/20 hover:shadow-lg hover:shadow-sari-500/30 transition-all duration-200"
              >
                <ShoppingBag className="w-4 h-4" />
                Continue Shopping
              </Link>
            </div>
          ) : (
            /* Populated State */
            <>
              <p className="text-sm text-gray-500 mb-6">
                <span className="font-medium text-gray-900">{items.length}</span>{' '}
                item{items.length !== 1 ? 's' : ''} saved
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {items.map((product, i) => (
                  <div
                    key={product.id}
                    className="relative animate-fade-in"
                    style={{ animationDelay: `${i * 50}ms` }}
                  >
                    <ProductCard product={product} />
                    <button
                      onClick={() => removeFromWishlist(product.id)}
                      className="absolute top-3 right-3 z-20 p-2 rounded-full bg-red-50 text-red-500 shadow-md hover:bg-red-100 transition-colors duration-200"
                      aria-label="Remove from wishlist"
                    >
                      <Heart className="w-4 h-4 fill-current" />
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </main>
    </>
  );
}
