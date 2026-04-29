import Link from 'next/link';
import Image from 'next/image';
import { Sparkles } from 'lucide-react';
import Navbar from '@/components/layout/Navbar';
import HomeRecommendations from '@/components/HomeRecommendations';
import VoucherBanner from '@/components/VoucherBanner';

const categories = [
  { name: 'T-Shirts', slug: 't-shirts', image: '/images/shirts-sari.jpg', accent: 'from-sari-100 to-sari-50', iconBg: 'bg-sari-200/60', textColor: 'text-sari-800', subtextColor: 'text-sari-600/70', hoverBorder: 'hover:border-sari-300', ringColor: 'ring-sari-200' },
  { name: 'Jeans', slug: 'jeans', image: '/images/jeans-sari.webp', accent: 'from-blue-100 to-blue-50', iconBg: 'bg-blue-200/60', textColor: 'text-blue-800', subtextColor: 'text-blue-600/70', hoverBorder: 'hover:border-blue-300', ringColor: 'ring-blue-200' },
  { name: 'Dresses', slug: 'dresses', image: '/images/dress-sari.jpg', accent: 'from-rose-100 to-rose-50', iconBg: 'bg-rose-200/60', textColor: 'text-rose-800', subtextColor: 'text-rose-600/70', hoverBorder: 'hover:border-rose-300', ringColor: 'ring-rose-200' },
  { name: 'Jackets', slug: 'jackets', image: '/images/jacket-sari.jpg', accent: 'from-stone-100 to-stone-50', iconBg: 'bg-stone-200/60', textColor: 'text-stone-800', subtextColor: 'text-stone-600/70', hoverBorder: 'hover:border-stone-300', ringColor: 'ring-stone-200' },
];

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main>
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-gradient-to-br from-sari-400 via-sari-500 to-sari-700">
          {/* Geometric mosaic pattern */}
          <div className="absolute inset-0 pointer-events-none select-none overflow-hidden">
            <div className="absolute top-4 right-8 w-48 h-32 rounded-2xl bg-sari-300/40" />
            <div className="absolute top-0 right-48 w-24 h-24 rounded-xl bg-sari-600/30" />
            <div className="absolute top-8 right-20 w-32 h-48 rounded-2xl bg-sari-500/25" />
            <div className="absolute top-32 right-4 w-40 h-28 rounded-xl bg-sari-700/20" />
            <div className="absolute top-16 right-64 w-20 h-36 rounded-2xl bg-sari-400/35" />
            <div className="absolute bottom-0 right-12 w-56 h-24 rounded-2xl bg-sari-600/25" />
            <div className="absolute bottom-8 right-40 w-28 h-32 rounded-xl bg-sari-300/30" />
            <div className="absolute bottom-4 right-72 w-20 h-20 rounded-xl bg-sari-500/20" />
            <div className="absolute top-0 right-96 w-16 h-40 rounded-2xl bg-sari-400/25" />
            <div className="absolute bottom-0 right-96 w-36 h-20 rounded-xl bg-sari-700/15" />
          </div>

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
            <div className="max-w-2xl animate-slide-up">
              <span className="inline-flex items-center gap-1.5 bg-white/15 backdrop-blur-sm text-white text-xs font-semibold px-4 py-1.5 rounded-full mb-6 border border-white/10">
                <Sparkles className="w-3.5 h-3.5" />
                NEW COLLECTION
              </span>
              <h1 className="font-black text-6xl md:text-7xl lg:text-8xl text-white leading-[1.05] tracking-tight">
                Discover Your Perfect Style
              </h1>
              <p className="mt-5 text-lg md:text-xl text-white/75 leading-relaxed max-w-lg">
                Explore the latest fashion trends with our AI-powered
                recommendations and smart comparison tools.
              </p>
              <div className="mt-10 flex flex-wrap gap-4">
                <Link
                  href="/products"
                  className="group bg-white hover:bg-sari-50 text-sari-700 font-medium px-8 py-3.5 rounded-full transition-all duration-200 shadow-lg shadow-white/30 hover:shadow-xl hover:shadow-white/40"
                >
                  Shop Now
                  <span className="inline-block ml-1.5 transition-transform duration-200 group-hover:translate-x-0.5">&rarr;</span>
                </Link>
                <Link
                  href="/products?ai=compare"
                  className="border-2 border-white/40 text-white hover:bg-white hover:text-sari-700 font-medium px-8 py-3.5 rounded-full transition-all duration-200 backdrop-blur-sm"
                >
                  Try AI Comparison
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Voucher Banner */}
        <VoucherBanner />

        {/* Shop by Category */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-gray-50 to-white" />
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
            <div className="flex items-end justify-between mb-10">
              <div>
                <h2 className="font-display text-3xl md:text-4xl text-gray-900">
                  Shop by Category
                </h2>
                <p className="mt-2 text-gray-500">
                  Find exactly what you&apos;re looking for
                </p>
              </div>
              <Link
                href="/products"
                className="hidden sm:inline-flex text-sm font-medium text-sari-600 hover:text-sari-700 transition-colors"
              >
                View all &rarr;
              </Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
              {categories.map((cat, i) => (
                <Link
                  key={cat.slug}
                  href={`/products?category=${cat.slug}`}
                  className={`group relative rounded-2xl overflow-hidden border border-gray-200 shadow-sm flex flex-col justify-between aspect-[3/4] transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-gray-300`}
                  style={{ animationDelay: `${i * 100}ms` }}
                >
                  <Image src={cat.image} alt={cat.name} fill className="object-cover transition-transform duration-700 group-hover:scale-110 z-0" sizes="(max-width: 768px) 50vw, 25vw" />
                  <div className="absolute inset-0 bg-gradient-to-t from-gray-900/90 via-gray-900/20 to-transparent z-10 transition-opacity duration-300 group-hover:opacity-90" />
                  
                  <div className="relative z-20 p-6 flex flex-col h-full justify-between">
                    {/* Top Section */}
                    <div className="flex justify-end">
                      <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 border border-white/30">
                        <span className="text-white text-sm font-medium">&rarr;</span>
                      </div>
                    </div>
                    {/* Bottom Section */}
                    <div className="transform transition-transform duration-300 group-hover:-translate-y-1">
                      <h3 className="font-display font-semibold text-2xl tracking-tight text-white drop-shadow-md">
                        {cat.name}
                      </h3>
                      <span className="inline-flex items-center mt-2 text-white/90 text-sm font-medium opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
                        Explore Collection
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Recommended For You */}
        <HomeRecommendations />
      </main>
    </>
  );
}
