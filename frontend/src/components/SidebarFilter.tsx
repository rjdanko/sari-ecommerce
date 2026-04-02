'use client';

import { useState } from 'react';
import { ChevronDown, SlidersHorizontal, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatPrice } from '@/lib/utils';

const categories = [
  { name: 'All Products', slug: 'all' },
  { name: 'T-Shirts', slug: 't-shirts' },
  { name: 'Jeans', slug: 'jeans' },
  { name: 'Dresses', slug: 'dresses' },
  { name: 'Jackets', slug: 'jackets' },
  { name: 'Accessories', slug: 'accessories' },
];

const sortOptions = [
  { label: 'Newest', value: 'newest' },
  { label: 'Price: Low to High', value: 'price_asc' },
  { label: 'Price: High to Low', value: 'price_desc' },
  { label: 'Most Popular', value: 'popular' },
  { label: 'Top Rated', value: 'rating' },
];

interface SidebarFilterProps {
  activeCategory: string;
  onCategoryChange: (slug: string) => void;
  sortBy: string;
  onSortChange: (value: string) => void;
  priceRange: [number, number];
  onPriceRangeChange: (range: [number, number]) => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export default function SidebarFilter({
  activeCategory,
  onCategoryChange,
  sortBy,
  onSortChange,
  priceRange,
  onPriceRangeChange,
  mobileOpen = false,
  onMobileClose,
}: SidebarFilterProps) {
  const [expandedSections, setExpandedSections] = useState({
    category: true,
    price: true,
    sort: true,
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const handleMinChange = (value: string) => {
    const num = Math.max(0, parseInt(value) || 0);
    onPriceRangeChange([num, priceRange[1]]);
  };

  const handleMaxChange = (value: string) => {
    const num = Math.max(0, parseInt(value) || 0);
    onPriceRangeChange([priceRange[0], num]);
  };

  const sliderPercent = ((priceRange[1] - priceRange[0]) / 10000) * 100;

  const filterContent = (
    <div className="space-y-1">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-sari-600" />
          <h2 className="font-display text-lg text-gray-900">Filters</h2>
        </div>
        {/* Mobile close button */}
        {onMobileClose && (
          <button
            onClick={onMobileClose}
            className="lg:hidden p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Category Section */}
      <div className="pt-4">
        <button
          onClick={() => toggleSection('category')}
          className="flex items-center justify-between w-full text-left group"
        >
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Category
          </span>
          <ChevronDown
            className={cn(
              'w-4 h-4 text-gray-400 transition-transform duration-200',
              expandedSections.category && 'rotate-180',
            )}
          />
        </button>
        {expandedSections.category && (
          <ul className="mt-3 space-y-0.5">
            {categories.map((cat) => (
              <li key={cat.slug}>
                <button
                  onClick={() => onCategoryChange(cat.slug)}
                  className={cn(
                    'flex items-center justify-between w-full px-3 py-2 rounded-lg text-sm transition-all duration-150',
                    activeCategory === cat.slug
                      ? 'bg-sari-50 text-sari-700 font-medium'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                  )}
                >
                  <span className="flex items-center gap-2">
                    {activeCategory === cat.slug && (
                      <span className="w-1.5 h-1.5 rounded-full bg-sari-500" />
                    )}
                    {cat.name}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Price Range Section */}
      <div className="pt-5">
        <button
          onClick={() => toggleSection('price')}
          className="flex items-center justify-between w-full text-left"
        >
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Price Range
          </span>
          <ChevronDown
            className={cn(
              'w-4 h-4 text-gray-400 transition-transform duration-200',
              expandedSections.price && 'rotate-180',
            )}
          />
        </button>
        {expandedSections.price && (
          <div className="mt-4 space-y-4">
            {/* Range slider track */}
            <div className="relative h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="absolute h-full bg-gradient-to-r from-sari-400 to-sari-500 rounded-full"
                style={{
                  left: `${(priceRange[0] / 10000) * 100}%`,
                  width: `${sliderPercent}%`,
                }}
              />
              <input
                type="range"
                min={0}
                max={10000}
                step={100}
                value={priceRange[1]}
                onChange={(e) =>
                  onPriceRangeChange([priceRange[0], parseInt(e.target.value)])
                }
                className="absolute inset-0 w-full opacity-0 cursor-pointer"
                aria-label="Maximum price"
              />
            </div>

            {/* Min / Max inputs */}
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <label className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">
                  Min
                </label>
                <div className="relative mt-1">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                    ₱
                  </span>
                  <input
                    type="number"
                    value={priceRange[0]}
                    onChange={(e) => handleMinChange(e.target.value)}
                    className="w-full pl-7 pr-2 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-sari-500/20 focus:border-sari-400 transition-all"
                  />
                </div>
              </div>
              <span className="text-gray-300 mt-5">—</span>
              <div className="flex-1">
                <label className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">
                  Max
                </label>
                <div className="relative mt-1">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                    ₱
                  </span>
                  <input
                    type="number"
                    value={priceRange[1]}
                    onChange={(e) => handleMaxChange(e.target.value)}
                    className="w-full pl-7 pr-2 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-sari-500/20 focus:border-sari-400 transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Quick price tags */}
            <div className="flex flex-wrap gap-1.5">
              {[1000, 2500, 5000].map((price) => (
                <button
                  key={price}
                  onClick={() => onPriceRangeChange([0, price])}
                  className={cn(
                    'px-2.5 py-1 rounded-full text-xs font-medium transition-all duration-150',
                    priceRange[1] === price && priceRange[0] === 0
                      ? 'bg-sari-100 text-sari-700 border border-sari-200'
                      : 'bg-gray-50 text-gray-500 border border-gray-200 hover:border-sari-300 hover:text-sari-600',
                  )}
                >
                  Under {formatPrice(price)}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Sort By Section */}
      <div className="pt-5">
        <button
          onClick={() => toggleSection('sort')}
          className="flex items-center justify-between w-full text-left"
        >
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Sort By
          </span>
          <ChevronDown
            className={cn(
              'w-4 h-4 text-gray-400 transition-transform duration-200',
              expandedSections.sort && 'rotate-180',
            )}
          />
        </button>
        {expandedSections.sort && (
          <div className="mt-3 space-y-0.5">
            {sortOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => onSortChange(option.value)}
                className={cn(
                  'flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm transition-all duration-150',
                  sortBy === option.value
                    ? 'bg-sari-50 text-sari-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                )}
              >
                <span
                  className={cn(
                    'w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors duration-150',
                    sortBy === option.value
                      ? 'border-sari-500'
                      : 'border-gray-300',
                  )}
                >
                  {sortBy === option.value && (
                    <span className="w-2 h-2 rounded-full bg-sari-500" />
                  )}
                </span>
                {option.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:block w-64 flex-shrink-0">
        <div className="sticky top-24 bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          {filterContent}
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm lg:hidden"
            onClick={onMobileClose}
          />
          <aside className="fixed inset-y-0 left-0 z-50 w-80 max-w-[85vw] bg-white p-5 overflow-y-auto shadow-2xl lg:hidden animate-slide-in-left">
            {filterContent}
          </aside>
        </>
      )}
    </>
  );
}
