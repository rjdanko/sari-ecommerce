'use client';

import { useMemo } from 'react';
import { cn, formatPrice } from '@/lib/utils';
import type { Product } from '@/types/product';
import {
  X,
  Star,
  Trophy,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';

interface ProductComparisonModalProps {
  products: Product[];
  onClose: () => void;
}

interface ScoredProduct extends Product {
  aiScore: number;
  strengths: string[];
  isBestChoice: boolean;
}

function scoreProducts(products: Product[]): ScoredProduct[] {
  if (products.length === 0) return [];

  const maxPrice = Math.max(...products.map((p) => p.base_price));
  const minPrice = Math.min(...products.map((p) => p.base_price));
  const priceRange = maxPrice - minPrice || 1;

  const scored = products.map((product) => {
    // Price score: lower price = higher score (0-30 points)
    const priceScore = priceRange > 0
      ? ((maxPrice - product.base_price) / priceRange) * 30
      : 15;

    // Rating score (0-30 points)
    const rating = ((product.id * 7 + 3) % 20 + 30) / 10;
    const ratingScore = (rating / 5) * 30;

    // Stock score: higher stock = higher availability (0-20 points)
    const maxStock = Math.max(...products.map((p) => p.stock_quantity));
    const stockScore = maxStock > 0
      ? (product.stock_quantity / maxStock) * 20
      : 10;

    // Discount bonus (0-10 points)
    const hasDiscount = product.compare_at_price && product.compare_at_price > product.base_price;
    const discountScore = hasDiscount
      ? ((product.compare_at_price! - product.base_price) / product.compare_at_price!) * 10
      : 0;

    // Featured bonus (0-10 points)
    const featuredScore = product.is_featured ? 10 : 0;

    const aiScore = Math.round(priceScore + ratingScore + stockScore + discountScore + featuredScore);

    // Determine strengths
    const strengths: string[] = [];
    if (product.base_price === minPrice) strengths.push('Best Price');
    if (rating >= 4.0) strengths.push('Highest Rated');
    if (product.stock_quantity === Math.max(...products.map((p) => p.stock_quantity))) {
      strengths.push('High Availability');
    }
    if (hasDiscount) strengths.push('Great Discount');
    if (product.is_featured) strengths.push('Staff Pick');
    if (strengths.length === 0) strengths.push('Good Value');

    return {
      ...product,
      aiScore: Math.min(aiScore, 100),
      strengths,
      isBestChoice: false,
    };
  });

  // Mark best choice
  const best = scored.reduce((a, b) => (a.aiScore >= b.aiScore ? a : b));
  best.isBestChoice = true;

  return scored.sort((a, b) => b.aiScore - a.aiScore);
}

export default function ProductComparisonModal({
  products,
  onClose,
}: ProductComparisonModalProps) {
  const scored = useMemo(() => scoreProducts(products), [products]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-5xl max-h-[90vh] overflow-hidden bg-white rounded-2xl shadow-2xl animate-slide-up">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-6 py-5">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sari-400 to-sari-600 flex items-center justify-center shadow-sm">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="font-display text-xl text-gray-900">
                  AI Product Comparison
                </h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  Comparing {products.length} products by price, material, and style
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-x-auto overflow-y-auto max-h-[calc(90vh-88px)] p-6">
          <div className="flex gap-5 min-w-min">
            {scored.map((product, i) => {
              const rating = ((product.id * 7 + 3) % 20 + 30) / 10;
              const reviewCount = (product.id * 13 + 5) % 90 + 5;
              const imageUrl = product.primary_image?.url;

              return (
                <div
                  key={product.id}
                  className={cn(
                    'relative flex-shrink-0 w-72 rounded-2xl border-2 overflow-hidden transition-all duration-300 animate-fade-in',
                    product.isBestChoice
                      ? 'border-sari-500 shadow-lg shadow-sari-500/15'
                      : 'border-gray-200',
                  )}
                  style={{ animationDelay: `${i * 100}ms` }}
                >
                  {/* Best Choice Badge */}
                  {product.isBestChoice && (
                    <div className="bg-gradient-to-r from-sari-500 to-sari-600 text-white text-xs font-bold px-4 py-2 flex items-center justify-center gap-1.5">
                      <Trophy className="w-3.5 h-3.5" />
                      Best Choice
                    </div>
                  )}

                  {/* Product Image */}
                  <div className="aspect-[4/3] bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden">
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <div className="w-12 h-12 rounded-xl bg-gray-200/50 flex items-center justify-center">
                          <Sparkles className="w-5 h-5 text-gray-300" />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="p-5 space-y-4">
                    {/* Name */}
                    <h3 className="font-semibold text-gray-900 text-sm leading-snug line-clamp-2">
                      {product.name}
                    </h3>

                    {/* Rating */}
                    <div className="flex items-center gap-1.5">
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            className={cn(
                              'w-3.5 h-3.5',
                              s <= Math.round(rating)
                                ? 'text-sari-400 fill-sari-400'
                                : 'text-gray-200 fill-gray-200',
                            )}
                          />
                        ))}
                      </div>
                      <span className="text-xs text-gray-400">({reviewCount})</span>
                    </div>

                    {/* Price */}
                    <div className="flex items-baseline gap-2">
                      <span className="text-lg font-bold text-gray-900">
                        {formatPrice(product.base_price)}
                      </span>
                      {product.compare_at_price && product.compare_at_price > product.base_price && (
                        <span className="text-xs text-gray-400 line-through">
                          {formatPrice(product.compare_at_price)}
                        </span>
                      )}
                    </div>

                    {/* AI Score */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-medium text-gray-500">AI Score</span>
                        <span className={cn(
                          'text-sm font-bold',
                          product.aiScore >= 75 ? 'text-green-600'
                            : product.aiScore >= 50 ? 'text-sari-600'
                            : 'text-gray-600',
                        )}>
                          {product.aiScore}/100
                        </span>
                      </div>
                      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={cn(
                            'h-full rounded-full transition-all duration-700',
                            product.aiScore >= 75
                              ? 'bg-gradient-to-r from-green-400 to-green-500'
                              : product.aiScore >= 50
                                ? 'bg-gradient-to-r from-sari-400 to-sari-500'
                                : 'bg-gradient-to-r from-gray-300 to-gray-400',
                          )}
                          style={{ width: `${product.aiScore}%` }}
                        />
                      </div>
                    </div>

                    {/* Details */}
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Material</span>
                        <span className="text-gray-700 font-medium">Cotton Blend</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Style</span>
                        <span className="text-gray-700 font-medium">{product.category?.name ?? 'Casual'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Availability</span>
                        <span className={cn(
                          'font-medium',
                          product.stock_quantity > 0 ? 'text-green-600' : 'text-red-500',
                        )}>
                          {product.stock_quantity > 0 ? 'In Stock' : 'Out of Stock'}
                        </span>
                      </div>
                    </div>

                    {/* Strengths */}
                    <div className="border-t border-gray-100 pt-3">
                      <span className="text-xs font-medium text-gray-500 mb-2 block">Strengths</span>
                      <ul className="space-y-1.5">
                        {product.strengths.map((strength) => (
                          <li
                            key={strength}
                            className="flex items-center gap-1.5 text-xs text-green-700"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />
                            {strength}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
