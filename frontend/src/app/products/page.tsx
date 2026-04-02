'use client';

import { useState } from 'react';
import Navbar from '@/components/layout/Navbar';
import ProductCard from '@/components/ProductCard';
import SidebarFilter from '@/components/SidebarFilter';
import { SlidersHorizontal, LayoutGrid, Rows3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Product } from '@/types/product';

// ── Mock data ───────────────────────────────────────────────
const mockProducts: Product[] = [
  {
    id: 1,
    name: 'Classic Cotton Crew Neck T-Shirt',
    slug: 'classic-cotton-crew-neck',
    description: 'Soft breathable cotton tee for everyday comfort.',
    short_description: 'Everyday cotton tee.',
    base_price: 599,
    compare_at_price: 899,
    sku: 'TSH-001',
    stock_quantity: 45,
    status: 'active',
    brand: 'SARI Basics',
    is_featured: true,
    category: { id: 1, name: 'T-Shirts', slug: 't-shirts', description: null, image_url: null },
    images: [],
    primary_image: null,
  },
  {
    id: 2,
    name: 'Slim Fit Stretch Denim Jeans',
    slug: 'slim-fit-stretch-denim',
    description: 'Modern slim fit with comfortable stretch.',
    short_description: 'Slim stretch denim.',
    base_price: 1899,
    compare_at_price: 2499,
    sku: 'JNS-001',
    stock_quantity: 30,
    status: 'active',
    brand: 'SARI Denim',
    is_featured: true,
    category: { id: 2, name: 'Jeans', slug: 'jeans', description: null, image_url: null },
    images: [],
    primary_image: null,
  },
  {
    id: 3,
    name: 'Floral Wrap Midi Dress',
    slug: 'floral-wrap-midi-dress',
    description: 'Elegant floral wrap dress perfect for any occasion.',
    short_description: 'Floral wrap dress.',
    base_price: 2299,
    compare_at_price: null,
    sku: 'DRS-001',
    stock_quantity: 18,
    status: 'active',
    brand: 'SARI Collection',
    is_featured: false,
    category: { id: 3, name: 'Dresses', slug: 'dresses', description: null, image_url: null },
    images: [],
    primary_image: null,
  },
  {
    id: 4,
    name: 'Leather Biker Jacket',
    slug: 'leather-biker-jacket',
    description: 'Classic biker jacket crafted from genuine leather.',
    short_description: 'Classic leather jacket.',
    base_price: 5499,
    compare_at_price: 6999,
    sku: 'JKT-001',
    stock_quantity: 8,
    status: 'active',
    brand: 'SARI Premium',
    is_featured: true,
    category: { id: 4, name: 'Jackets', slug: 'jackets', description: null, image_url: null },
    images: [],
    primary_image: null,
  },
  {
    id: 5,
    name: 'Oversized Graphic Print Tee',
    slug: 'oversized-graphic-print-tee',
    description: 'Bold graphic print on relaxed oversized silhouette.',
    short_description: 'Oversized graphic tee.',
    base_price: 799,
    compare_at_price: null,
    sku: 'TSH-002',
    stock_quantity: 62,
    status: 'active',
    brand: 'SARI Street',
    is_featured: false,
    category: { id: 1, name: 'T-Shirts', slug: 't-shirts', description: null, image_url: null },
    images: [],
    primary_image: null,
  },
  {
    id: 6,
    name: 'Wide Leg High-Waist Trousers',
    slug: 'wide-leg-high-waist-trousers',
    description: 'Flowing wide-leg trousers with flattering high waist.',
    short_description: 'Wide-leg trousers.',
    base_price: 1599,
    compare_at_price: 1999,
    sku: 'JNS-002',
    stock_quantity: 22,
    status: 'active',
    brand: 'SARI Collection',
    is_featured: false,
    category: { id: 2, name: 'Jeans', slug: 'jeans', description: null, image_url: null },
    images: [],
    primary_image: null,
  },
  {
    id: 7,
    name: 'Satin Slip Evening Dress',
    slug: 'satin-slip-evening-dress',
    description: 'Luxurious satin slip dress for evening occasions.',
    short_description: 'Satin evening dress.',
    base_price: 3499,
    compare_at_price: null,
    sku: 'DRS-002',
    stock_quantity: 12,
    status: 'active',
    brand: 'SARI Premium',
    is_featured: true,
    category: { id: 3, name: 'Dresses', slug: 'dresses', description: null, image_url: null },
    images: [],
    primary_image: null,
  },
  {
    id: 8,
    name: 'Quilted Puffer Jacket',
    slug: 'quilted-puffer-jacket',
    description: 'Warm quilted puffer with water-resistant finish.',
    short_description: 'Quilted puffer jacket.',
    base_price: 3299,
    compare_at_price: 4199,
    sku: 'JKT-002',
    stock_quantity: 15,
    status: 'active',
    brand: 'SARI Outdoors',
    is_featured: false,
    category: { id: 4, name: 'Jackets', slug: 'jackets', description: null, image_url: null },
    images: [],
    primary_image: null,
  },
  {
    id: 9,
    name: 'Ribbed Tank Top',
    slug: 'ribbed-tank-top',
    description: 'Versatile ribbed tank for layering or solo wear.',
    short_description: 'Ribbed tank top.',
    base_price: 449,
    compare_at_price: null,
    sku: 'TSH-003',
    stock_quantity: 80,
    status: 'active',
    brand: 'SARI Basics',
    is_featured: false,
    category: { id: 1, name: 'T-Shirts', slug: 't-shirts', description: null, image_url: null },
    images: [],
    primary_image: null,
  },
  {
    id: 10,
    name: 'Embroidered Boho Maxi Dress',
    slug: 'embroidered-boho-maxi-dress',
    description: 'Flowing maxi dress with intricate embroidery details.',
    short_description: 'Embroidered maxi dress.',
    base_price: 2799,
    compare_at_price: 3299,
    sku: 'DRS-003',
    stock_quantity: 9,
    status: 'active',
    brand: 'SARI Collection',
    is_featured: true,
    category: { id: 3, name: 'Dresses', slug: 'dresses', description: null, image_url: null },
    images: [],
    primary_image: null,
  },
  {
    id: 11,
    name: 'Canvas Sneaker Low-Top',
    slug: 'canvas-sneaker-low-top',
    description: 'Casual canvas sneakers for everyday style.',
    short_description: 'Canvas low-top sneakers.',
    base_price: 1299,
    compare_at_price: null,
    sku: 'ACC-001',
    stock_quantity: 40,
    status: 'active',
    brand: 'SARI Street',
    is_featured: false,
    category: { id: 5, name: 'Accessories', slug: 'accessories', description: null, image_url: null },
    images: [],
    primary_image: null,
  },
  {
    id: 12,
    name: 'Woven Leather Belt',
    slug: 'woven-leather-belt',
    description: 'Hand-woven leather belt with brushed metal buckle.',
    short_description: 'Woven leather belt.',
    base_price: 899,
    compare_at_price: 1199,
    sku: 'ACC-002',
    stock_quantity: 35,
    status: 'active',
    brand: 'SARI Premium',
    is_featured: false,
    category: { id: 5, name: 'Accessories', slug: 'accessories', description: null, image_url: null },
    images: [],
    primary_image: null,
  },
];

// ── Page Component ──────────────────────────────────────────
export default function ProductsPage() {
  const [activeCategory, setActiveCategory] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 10000]);
  const [compareIds, setCompareIds] = useState<Set<number>>(new Set());
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [gridCols, setGridCols] = useState<3 | 4>(3);

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

  // Filter products
  const filtered = mockProducts.filter((p) => {
    if (activeCategory !== 'all' && p.category.slug !== activeCategory)
      return false;
    if (p.base_price < priceRange[0] || p.base_price > priceRange[1])
      return false;
    return true;
  });

  // Sort products
  const sorted = [...filtered].sort((a, b) => {
    switch (sortBy) {
      case 'price_asc':
        return a.base_price - b.base_price;
      case 'price_desc':
        return b.base_price - a.base_price;
      case 'popular':
        return b.stock_quantity - a.stock_quantity;
      default:
        return b.id - a.id;
    }
  });

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-gradient-to-b from-gray-50/80 to-white">
        {/* Page header */}
        <div className="relative overflow-hidden bg-gradient-to-r from-sari-50 via-white to-sari-50 border-b border-gray-100">
          {/* Subtle decorative dot pattern */}
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
              All Products
            </h1>
            <p className="mt-2 text-gray-500 text-sm md:text-base max-w-lg">
              Browse our curated collection of fashion essentials, from everyday
              basics to statement pieces.
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
            <span className="text-sm text-gray-400">
              {sorted.length} product{sorted.length !== 1 ? 's' : ''}
            </span>
          </div>

          <div className="flex gap-8">
            {/* Sidebar */}
            <SidebarFilter
              activeCategory={activeCategory}
              onCategoryChange={setActiveCategory}
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
                <p className="text-sm text-gray-500">
                  Showing{' '}
                  <span className="font-medium text-gray-900">
                    {sorted.length}
                  </span>{' '}
                  product{sorted.length !== 1 ? 's' : ''}
                </p>
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
                    <button className="px-4 py-1.5 bg-gradient-to-r from-sari-500 to-sari-600 text-white text-sm font-medium rounded-full hover:from-sari-600 hover:to-sari-700 shadow-sm hover:shadow-md transition-all duration-200">
                      Compare Now
                    </button>
                  </div>
                </div>
              )}

              {/* Product grid */}
              {sorted.length > 0 ? (
                <div
                  className={cn(
                    'grid gap-5',
                    gridCols === 4
                      ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
                      : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
                  )}
                >
                  {sorted.map((product, i) => (
                    <div
                      key={product.id}
                      className="animate-fade-in"
                      style={{ animationDelay: `${i * 50}ms` }}
                    >
                      <ProductCard
                        product={product}
                        onCompareToggle={handleCompareToggle}
                        isComparing={compareIds.has(product.id)}
                      />
                    </div>
                  ))}
                </div>
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
    </>
  );
}
