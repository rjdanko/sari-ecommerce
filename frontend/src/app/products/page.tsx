'use client';

import { useState, useEffect, Suspense, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Navbar from '@/components/layout/Navbar';
import ProductCard from '@/components/ProductCard';
import type { VariantModalPayload } from '@/components/ProductCard';
import SidebarFilter from '@/components/SidebarFilter';
import ProductComparisonModal from '@/components/ProductComparisonModal';
import VariantSelectorModal from '@/components/cart/VariantSelectorModal';
import { SlidersHorizontal, LayoutGrid, Rows3, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import { useCartContext } from '@/contexts/CartContext';
import { useToast } from '@/contexts/ToastContext';
import type { Product } from '@/types/product';

// ── Page Component ──────────────────────────────────────────
export default function ProductsPage() {
  return (
    <Suspense>
      <ProductsPageContent />
    </Suspense>
  );
}

function ProductsPageContent() {
  const searchParams = useSearchParams();
  const { addItem } = useCartContext();
  const { addToast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  // Initialize from URL immediately so the first fetch uses the correct category.
  const [activeCategory, setActiveCategory] = useState(() => searchParams.get('category') ?? 'all');
  const [activeGender, setActiveGender] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 10000]);
  const [compareIds, setCompareIds] = useState<Set<number>>(new Set());
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [gridCols, setGridCols] = useState<3 | 4>(3);
  const [comparisonOpen, setComparisonOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [variantModal, setVariantModal] = useState<VariantModalPayload | null>(null);

  const fetchProducts = useCallback(async (pageNum = 1, append = false) => {
    if (pageNum === 1) setLoading(true);
    else setLoadingMore(true);

    try {
      const params: Record<string, string | number> = {
        per_page: 20,
        page: pageNum,
        sort: sortBy,
      };
      if (activeCategory !== 'all') params.category = activeCategory;
      if (activeGender) params.gender = activeGender;

      const q = searchParams.get('q');
      if (q) params.search = q;

      const res = await api.get('/api/products', { params });
      const data = res.data;
      const newProducts: Product[] = data.data ?? [];

      if (append) {
        setProducts((prev) => [...prev, ...newProducts]);
      } else {
        setProducts(newProducts);
      }

      setHasMore(data.current_page < data.last_page);
      setPage(data.current_page);
    } catch {
      if (!append) setProducts([]);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [activeCategory, activeGender, sortBy, searchParams]);

  // Re-fetch when filters change
  useEffect(() => {
    fetchProducts(1);
  }, [fetchProducts]);

  // Handle ?ai=compare query param
  useEffect(() => {
    if (searchParams.get('ai') === 'compare' && products.length >= 2) {
      setCompareIds(new Set(products.slice(0, 2).map((p) => p.id)));
    }
  }, [searchParams, products]);

  const handleCompareToggle = (productId: number, checked: boolean) => {
    setCompareIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(productId);
      } else {
        next.delete(productId);
      }
      return next;
    });
  };

  const loadMore = () => {
    if (!loadingMore && hasMore) {
      fetchProducts(page + 1, true);
    }
  };

  // Client-side price filter (API doesn't support price range)
  const filtered = products.filter((p) => {
    if (p.base_price < priceRange[0] || p.base_price > priceRange[1]) return false;
    return true;
  });

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-white">
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
              {searchParams.get('q')
                ? <>Search: &ldquo;{searchParams.get('q')}&rdquo;</>
                : 'All Products'}
            </h1>
            <p className="mt-2 text-gray-500 text-sm md:text-base max-w-lg">
              {searchParams.get('q')
                ? 'Showing results matching your search.'
                : 'Browse our curated collection of fashion essentials, from everyday basics to statement pieces.'}
            </p>
          </div>
        </div>

        {/* Content area */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Mobile toolbar */}
          <div className="flex items-center justify-between lg:hidden mb-6">
            <button
              onClick={() => setMobileFilterOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:border-sari-300 hover:text-sari-700 transition-colors shadow-sm"
            >
              <SlidersHorizontal className="w-4 h-4" />
              Filters
            </button>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-400">
                {filtered.length} product{filtered.length !== 1 ? 's' : ''}
              </span>
              {searchParams.get('q') && (
                <button
                  onClick={() => {
                    const url = new URL(window.location.href);
                    url.searchParams.delete('q');
                    window.location.href = url.toString();
                  }}
                  className="text-sm text-sari-600 hover:text-sari-700 font-medium transition-colors"
                >
                  Clear search &times;
                </button>
              )}
            </div>
          </div>

          <div className="flex gap-8">
            {/* Sidebar */}
            <SidebarFilter
              activeCategory={activeCategory}
              onCategoryChange={setActiveCategory}
              activeGender={activeGender}
              onGenderChange={setActiveGender}
              sortBy={sortBy}
              onSortChange={setSortBy}
              priceRange={priceRange}
              onPriceRangeChange={setPriceRange}
              mobileOpen={mobileFilterOpen}
              onMobileClose={() => setMobileFilterOpen(false)}
            />

            {/* Product grid area */}
            <div className="flex-1 min-w-0">
              {/* Desktop toolbar */}
              <div className="hidden lg:flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <p className="text-sm text-gray-500">
                    Showing{' '}
                    <span className="font-medium text-gray-900">
                      {filtered.length}
                    </span>{' '}
                    product{filtered.length !== 1 ? 's' : ''}
                  </p>
                  {searchParams.get('q') && (
                    <button
                      onClick={() => {
                        const url = new URL(window.location.href);
                        url.searchParams.delete('q');
                        window.location.href = url.toString();
                      }}
                      className="text-sm text-sari-600 hover:text-sari-700 font-medium transition-colors"
                    >
                      Clear search &times;
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setGridCols(3)}
                    className={cn(
                      'p-2 rounded-lg transition-colors',
                      gridCols === 3
                        ? 'bg-sari-50 text-sari-600'
                        : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50',
                    )}
                    aria-label="3 column grid"
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setGridCols(4)}
                    className={cn(
                      'p-2 rounded-lg transition-colors',
                      gridCols === 4
                        ? 'bg-sari-50 text-sari-600'
                        : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50',
                    )}
                    aria-label="4 column grid"
                  >
                    <Rows3 className="w-4 h-4 rotate-90" />
                  </button>
                </div>
              </div>

              {/* Compare bar */}
              {compareIds.size > 0 && (
                <div className="mb-6 flex items-center justify-between bg-sari-50 border border-sari-200 rounded-xl px-5 py-3 animate-slide-up">
                  <span className="text-sm font-medium text-sari-800">
                    {compareIds.size} product{compareIds.size !== 1 ? 's' : ''}{' '}
                    selected for comparison
                  </span>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setCompareIds(new Set())}
                      className="text-sm text-sari-600 hover:text-sari-800 font-medium transition-colors"
                    >
                      Clear
                    </button>
                    <button
                      onClick={() => setComparisonOpen(true)}
                      disabled={compareIds.size < 2}
                      className="px-4 py-1.5 bg-gradient-to-r from-sari-500 to-sari-600 text-white text-sm font-medium rounded-full hover:from-sari-600 hover:to-sari-700 shadow-sm hover:shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Compare Now
                    </button>
                  </div>
                </div>
              )}

              {/* Loading skeleton */}
              {loading ? (
                <div
                  className={cn(
                    'grid gap-5',
                    gridCols === 4
                      ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
                      : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
                  )}
                >
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="aspect-[3/4] rounded-2xl bg-gray-200" />
                      <div className="mt-3 h-4 w-2/3 rounded bg-gray-200" />
                      <div className="mt-2 h-3 w-1/3 rounded bg-gray-200" />
                    </div>
                  ))}
                </div>
              ) : filtered.length > 0 ? (
                <>
                  <div
                    className={cn(
                      'grid gap-5',
                      gridCols === 4
                        ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
                        : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
                    )}
                  >
                    {filtered.map((product, i) => (
                      <div
                        key={product.id}
                        className="animate-fade-in"
                        style={{ animationDelay: `${i * 50}ms` }}
                      >
                        <ProductCard
                          product={product}
                          onCompareToggle={handleCompareToggle}
                          isComparing={compareIds.has(product.id)}
                          onOpenVariantModal={setVariantModal}
                        />
                      </div>
                    ))}
                  </div>

                  {/* Load More */}
                  {hasMore && (
                    <div className="mt-8 flex justify-center">
                      <button
                        onClick={loadMore}
                        disabled={loadingMore}
                        className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-6 py-2.5 text-sm font-medium text-gray-700 transition-all hover:border-sari-300 hover:text-sari-700 disabled:opacity-50"
                      >
                        {loadingMore ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Loading...
                          </>
                        ) : (
                          'Load More Products'
                        )}
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
                    <SlidersHorizontal className="w-7 h-7 text-gray-300" />
                  </div>
                  <h3 className="font-display text-xl text-gray-900 mb-1">
                    No products found
                  </h3>
                  <p className="text-sm text-gray-500 max-w-sm">
                    Try adjusting your filters or browse a different category to
                    find what you&apos;re looking for.
                  </p>
                  <button
                    onClick={() => {
                      setActiveCategory('all');
                      setActiveGender('');
                      setPriceRange([0, 10000]);
                    }}
                    className="mt-5 text-sm font-medium text-sari-600 hover:text-sari-700 transition-colors"
                  >
                    Reset all filters &rarr;
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* AI Comparison Modal */}
      {comparisonOpen && compareIds.size >= 2 && (
        <ProductComparisonModal
          products={products.filter((p) => compareIds.has(p.id))}
          onClose={() => setComparisonOpen(false)}
        />
      )}

      {/* Shared variant selector — rendered at page level so it covers all cards */}
      <VariantSelectorModal
        isOpen={variantModal !== null}
        productName={variantModal?.productName ?? ''}
        productImage={variantModal?.productImage ?? null}
        basePrice={variantModal?.basePrice ?? 0}
        variants={variantModal?.variants ?? []}
        onClose={() => setVariantModal(null)}
        onAddToCart={async (variantId) => {
          if (!variantModal) return;
          await addItem(variantModal.productId, 1, variantId);
          addToast({
            type: 'success',
            title: 'Added to cart',
            message: variantModal.productName,
            action: { label: 'View Cart', href: '/cart' },
          });
        }}
      />
    </>
  );
}
