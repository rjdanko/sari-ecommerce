import Link from 'next/link';
import Image from 'next/image';
import { Sparkles } from 'lucide-react';
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
      <main>
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-gradient-to-br from-sari-400 via-sari-500 to-sari-700">
          {/* Woven mosaic — flush grid, no gaps, no overlaps. Each row = 100% width, each col exact. */}
          <div className="absolute inset-0 pointer-events-none select-none grid grid-rows-4" style={{gridTemplateRows: '25% 25% 25% 25%'}}>
            {/* Row 1 — 7 cols: 15+12+14+13+16+14+16 = 100 */}
            <div className="grid grid-cols-[15%_12%_14%_13%_16%_14%_16%] items-stretch">
              <div className="bg-sari-300/15" />
              <div className="bg-sari-600/22" />
              <div className="bg-sari-400/15" />
              <div className="bg-sari-700/22" />
              <div className="bg-sari-300/28" />
              <div className="bg-sari-600/22" />
              <div className="bg-sari-500/28" />
            </div>
            {/* Row 2 — 6 cols: 18+14+16+15+18+19 = 100 */}
            <div className="grid grid-cols-[18%_14%_16%_15%_18%_19%] items-stretch">
              <div className="bg-sari-500/18" />
              <div className="bg-sari-300/25" />
              <div className="bg-sari-700/20" />
              <div className="bg-sari-400/28" />
              <div className="bg-sari-600/22" />
              <div className="bg-sari-300/28" />
            </div>
            {/* Row 3 — 7 cols: 13+16+12+15+14+16+14 = 100 */}
            <div className="grid grid-cols-[13%_16%_12%_15%_14%_16%_14%] items-stretch">
              <div className="bg-sari-600/15" />
              <div className="bg-sari-400/22" />
              <div className="bg-sari-300/18" />
              <div className="bg-sari-700/25" />
              <div className="bg-sari-500/20" />
              <div className="bg-sari-300/28" />
              <div className="bg-sari-600/22" />
            </div>
            {/* Row 4 — 6 cols: 16+15+18+14+19+18 = 100 */}
            <div className="grid grid-cols-[16%_15%_18%_14%_19%_18%] items-stretch">
              <div className="bg-sari-400/18" />
              <div className="bg-sari-700/22" />
              <div className="bg-sari-300/25" />
              <div className="bg-sari-600/20" />
              <div className="bg-sari-400/28" />
              <div className="bg-sari-500/22" />
            </div>
          </div>

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-14">
            <div className="max-w-2xl animate-slide-up relative z-10">
              <span className="inline-flex items-center gap-1.5 bg-white/15 backdrop-blur-sm text-white text-xs font-semibold px-4 py-1.5 rounded-full mb-5 border border-white/10">
                <Sparkles className="w-3.5 h-3.5" />
                NEW COLLECTION
              </span>
              <h1 className="font-black text-5xl md:text-6xl lg:text-7xl text-white leading-[1.05] tracking-tight drop-shadow-[0_2px_12px_rgba(0,0,0,0.18)]">
                Discover Your Perfect Style
              </h1>
              <p className="mt-4 text-base md:text-lg text-white/80 leading-relaxed max-w-lg drop-shadow-sm">
                Explore the latest fashion trends with our AI-powered
                recommendations and smart comparison tools.
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
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
