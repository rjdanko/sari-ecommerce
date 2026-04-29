'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import ProductCard from '@/components/ProductCard';
import { MapPin, Phone, Store, Loader2 } from 'lucide-react';
import api from '@/lib/api';
import type { Product, Store as StoreType } from '@/types/product';

export default function StorePublicPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [store, setStore] = useState<StoreType | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function fetchStore() {
      try {
        const res = await api.get(`/api/stores/${slug}`);
        setStore(res.data.store);
        setProducts(res.data.products.data ?? []);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    }
    if (slug) fetchStore();
  }, [slug]);

  if (loading) {
    return (
      <>
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-sari-500" />
        </div>
      </>
    );
  }

  if (error || !store) {
    return (
      <>
        <div className="flex min-h-[60vh] flex-col items-center justify-center text-center px-4">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100">
            <Store className="h-8 w-8 text-gray-300" />
          </div>
          <h1 className="font-display text-2xl text-gray-900">Store Not Found</h1>
          <p className="mt-2 text-sm text-gray-500">
            The store you&apos;re looking for doesn&apos;t exist or is no longer available.
          </p>
          <Link
            href="/products"
            className="mt-6 text-sm font-medium text-sari-600 hover:text-sari-700 transition-colors"
          >
            Browse all products &rarr;
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
      <main className="min-h-screen bg-gradient-to-b from-gray-50/80 to-white">
        {/* Banner */}
        <div className="relative h-48 sm:h-64 lg:h-72 overflow-hidden">
          {store.banner_url ? (
            <img
              src={store.banner_url}
              alt={`${store.name} banner`}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-sari-400 via-sari-500 to-sari-700">
              <div
                className="absolute inset-0 opacity-[0.07]"
                style={{
                  backgroundImage:
                    'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'1\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
                }}
              />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        </div>

        {/* Store Info */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative -mt-16 mb-8 flex flex-col sm:flex-row items-start gap-5">
            {/* Logo */}
            <div className="relative z-10 flex h-28 w-28 shrink-0 items-center justify-center rounded-2xl border-4 border-white bg-white shadow-lg overflow-hidden">
              {store.logo_url ? (
                <img src={store.logo_url} alt={store.name} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-sari-100 to-sari-200">
                  <Store className="h-10 w-10 text-sari-600" strokeWidth={1.5} />
                </div>
              )}
            </div>

            {/* Store details */}
            <div className="pt-2 sm:pt-8">
              <h1 className="font-display text-2xl sm:text-3xl text-gray-900 tracking-tight">
                {store.name}
              </h1>
              {store.description && (
                <p className="mt-1 text-sm text-gray-500 max-w-2xl">{store.description}</p>
              )}
              <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-gray-500">
                {store.address && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {store.address}
                  </span>
                )}
                {store.phone && (
                  <span className="inline-flex items-center gap-1">
                    <Phone className="h-3.5 w-3.5" />
                    {store.phone}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Products */}
          <div className="pb-16">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="font-display text-xl text-gray-900">
                Products
                <span className="ml-2 text-sm font-normal text-gray-400">
                  ({products.length})
                </span>
              </h2>
            </div>

            {products.length > 0 ? (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {products.map((product, i) => (
                  <div
                    key={product.id}
                    className="animate-fade-in"
                    style={{ animationDelay: `${i * 50}ms` }}
                  >
                    <ProductCard product={product} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100">
                  <Store className="h-7 w-7 text-gray-300" />
                </div>
                <p className="text-sm font-semibold text-gray-900">No products yet</p>
                <p className="mt-1 text-xs text-gray-400">
                  This store hasn&apos;t added any products yet.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
