import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import HomeRecommendations from '@/components/HomeRecommendations';

const categories = [
  { name: 'T-Shirts', slug: 't-shirts', accent: 'from-sari-300/40 to-sari-500/20' },
  { name: 'Jeans', slug: 'jeans', accent: 'from-blue-300/40 to-blue-500/20' },
  { name: 'Dresses', slug: 'dresses', accent: 'from-rose-300/40 to-rose-500/20' },
  { name: 'Jackets', slug: 'jackets', accent: 'from-stone-300/40 to-stone-500/20' },
];

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main>
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-gradient-to-br from-sari-400 via-sari-500 to-sari-700">
          {/* Decorative background elements */}
          <div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'1\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }} />
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-white/5 rounded-full -translate-y-1/2 translate-x-1/4 blur-3xl" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-sari-900/10 rounded-full translate-y-1/3 -translate-x-1/4 blur-3xl" />

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
            <div className="max-w-2xl animate-slide-up">
              <span className="inline-flex items-center gap-1.5 bg-white/15 backdrop-blur-sm text-white text-xs font-semibold px-4 py-1.5 rounded-full mb-6 border border-white/10">
                NEW COLLECTION
              </span>
              <h1 className="font-display text-5xl md:text-6xl lg:text-7xl text-white leading-[1.1] tracking-tight">
                Discover Your Perfect Style
              </h1>
              <p className="mt-5 text-lg md:text-xl text-white/75 leading-relaxed max-w-lg">
                Explore the latest fashion trends with our AI-powered
                recommendations and smart comparison tools.
              </p>
              <div className="mt-10 flex flex-wrap gap-4">
                <Link
                  href="/products"
                  className="group bg-gray-900 hover:bg-gray-800 text-white font-medium px-8 py-3.5 rounded-full transition-all duration-200 shadow-lg shadow-gray-900/30 hover:shadow-xl hover:shadow-gray-900/40"
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

        {/* Shop by Category */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
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
                href={`/categories/${cat.slug}`}
                className="group relative aspect-[3/4] rounded-2xl overflow-hidden bg-gray-100"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                {/* Gradient overlay */}
                <div className={`absolute inset-0 bg-gradient-to-br ${cat.accent} group-hover:opacity-80 transition-opacity duration-300`} />
                <div className="absolute inset-0 bg-gradient-to-t from-gray-900/70 via-gray-900/20 to-transparent z-10" />
                <div className="absolute bottom-0 left-0 right-0 p-5 z-20">
                  <h3 className="text-white font-semibold text-lg tracking-tight">
                    {cat.name}
                  </h3>
                  <span className="inline-flex items-center mt-1 text-white/70 text-xs font-medium opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
                    Explore &rarr;
                  </span>
                </div>
                {/* Hover scale effect */}
                <div className="absolute inset-0 bg-gray-200/30 group-hover:scale-105 transition-transform duration-500" />
              </Link>
            ))}
          </div>
        </section>

        {/* Recommended For You */}
        <HomeRecommendations />
      </main>
    </>
  );
}
