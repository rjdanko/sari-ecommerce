'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Heart, ShoppingCart, Star, Loader2 } from 'lucide-react';
import { cn, formatPrice } from '@/lib/utils';
import { useCartContext } from '@/contexts/CartContext';
import { useToast } from '@/contexts/ToastContext';
import type { Product } from '@/types/product';

interface ProductCardProps {
  product: Product;
  onCompareToggle?: (productId: number, checked: boolean) => void;
  isComparing?: boolean;
}

export default function ProductCard({
  product,
  onCompareToggle,
  isComparing = false,
}: ProductCardProps) {
  const { addItem } = useCartContext();
  const { addToast } = useToast();
  const [wishlisted, setWishlisted] = useState(false);
  const [addingToCart, setAddingToCart] = useState(false);

  const hasRealImage = !!product.primary_image?.url;
  const imageUrl = product.primary_image?.url ?? '/placeholder-product.png';
  const [imageLoaded, setImageLoaded] = useState(!hasRealImage);
  const [imageFailed, setImageFailed] = useState(false);
  const rating = product.average_rating ?? 0;
  const reviewCount = product.review_count ?? 0;

  const discount =
    product.compare_at_price && product.compare_at_price > product.base_price
      ? Math.round(
          ((product.compare_at_price - product.base_price) /
            product.compare_at_price) *
            100,
        )
      : null;

  return (
    <div className="group relative bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-lg hover:shadow-sari-200/30 hover:border-sari-200/60 transition-all duration-300">
      {/* Image container */}
      <div className="relative aspect-[4/5] bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden">
        {/* Product image */}
        <img
          src={imageFailed ? '/placeholder-product.png' : imageUrl}
          alt={product.primary_image?.alt_text ?? product.name}
          className={cn(
            'absolute inset-0 w-full h-full object-cover transition-all duration-500 group-hover:scale-105',
            imageLoaded || imageFailed ? 'opacity-100' : 'opacity-0',
          )}
          onLoad={() => setImageLoaded(true)}
          onError={() => setImageFailed(true)}
        />

        {/* Subtle gradient overlay on hover for contrast */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* Compare pill — top left */}
        <label
          className={cn(
            'absolute top-3 left-3 z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium cursor-pointer transition-all duration-200 select-none',
            isComparing
              ? 'bg-sari-500 text-white shadow-md shadow-sari-500/30'
              : 'bg-white/85 backdrop-blur-sm text-gray-600 hover:bg-white hover:shadow-md',
          )}
        >
          <input
            type="checkbox"
            checked={isComparing}
            onChange={(e) => onCompareToggle?.(product.id, e.target.checked)}
            className="sr-only"
          />
          <span
            className={cn(
              'flex items-center justify-center w-3.5 h-3.5 rounded border transition-colors duration-150',
              isComparing
                ? 'bg-white border-white'
                : 'border-gray-400 group-hover:border-sari-500',
            )}
          >
            {isComparing && (
              <svg
                className="w-2.5 h-2.5 text-sari-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={3}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            )}
          </span>
          Compare
        </label>

        {/* Heart icon — top right */}
        <button
          onClick={() => setWishlisted(!wishlisted)}
          className={cn(
            'absolute top-3 right-3 z-10 p-2 rounded-full transition-all duration-200',
            wishlisted
              ? 'bg-red-50 text-red-500 shadow-md'
              : 'bg-white/85 backdrop-blur-sm text-gray-400 hover:text-red-400 hover:bg-white hover:shadow-md',
          )}
          aria-label={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
        >
          <Heart
            className={cn('w-4 h-4 transition-transform duration-200', wishlisted && 'fill-current scale-110')}
          />
        </button>

        {/* Discount badge */}
        {discount && (
          <span className="absolute bottom-3 left-3 z-10 bg-red-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-full tracking-wide shadow-sm">
            -{discount}%
          </span>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Category tag */}
        <span className="text-[11px] font-medium text-sari-600 tracking-wide uppercase">
          {product.category?.name ?? 'Uncategorized'}
        </span>

        {/* Product name */}
        <Link href={`/products/${product.slug}`} className="block mt-1">
          <h3 className="text-sm font-semibold text-gray-900 leading-snug line-clamp-2 group-hover:text-sari-700 transition-colors duration-200">
            {product.name}
          </h3>
        </Link>

        {/* Star rating */}
        <div className="flex items-center gap-1.5 mt-2">
          <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={cn(
                  'w-3.5 h-3.5',
                  star <= Math.round(rating)
                    ? 'text-sari-400 fill-sari-400'
                    : 'text-gray-200 fill-gray-200',
                )}
              />
            ))}
          </div>
          <span className="text-xs text-gray-400">
            {reviewCount > 0 ? `(${reviewCount})` : 'No reviews'}
          </span>
        </div>

        {/* Price + Cart button */}
        <div className="flex items-end justify-between mt-3">
          <div className="flex flex-col">
            <span className="text-lg font-bold text-gray-900 tracking-tight">
              {formatPrice(product.base_price)}
            </span>
            {product.compare_at_price &&
              product.compare_at_price > product.base_price && (
                <span className="text-xs text-gray-400 line-through">
                  {formatPrice(product.compare_at_price)}
                </span>
              )}
          </div>
          <button
            onClick={async (e) => {
              e.preventDefault();
              if (addingToCart) return;
              setAddingToCart(true);
              try {
                await addItem(product.id);
                addToast({
                  type: 'success',
                  title: 'Added to cart',
                  message: product.name,
                  action: { label: 'View Cart', href: '/cart' },
                });
              } catch {
                addToast({
                  type: 'error',
                  title: 'Could not add to cart',
                  message: 'Please log in or try again.',
                });
              } finally {
                setAddingToCart(false);
              }
            }}
            disabled={addingToCart}
            className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-sari-400 to-sari-600 text-white shadow-sm hover:shadow-md hover:shadow-sari-400/30 hover:from-sari-500 hover:to-sari-700 active:scale-95 transition-all duration-200 disabled:opacity-60"
            aria-label="Add to cart"
          >
            {addingToCart ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <ShoppingCart className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
