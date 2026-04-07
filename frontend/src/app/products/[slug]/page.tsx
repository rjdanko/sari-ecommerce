'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import ProductCard from '@/components/ProductCard';
import { cn, formatPrice } from '@/lib/utils';
import api from '@/lib/api';
import type { Product } from '@/types/product';
import { useCartContext } from '@/contexts/CartContext';
import { useToast } from '@/contexts/ToastContext';
import {
  ChevronRight,
  Star,
  Heart,
  ShoppingCart,
  Minus,
  Plus,
  Truck,
  ShieldCheck,
  RotateCcw,
  CheckCircle2,
  Loader2,
} from 'lucide-react';

interface Review {
  id: number;
  user_name: string;
  rating: number;
  comment: string;
  created_at: string;
}

interface ProductVariant {
  id: number;
  name: string;
  sku: string;
  price: number;
  stock_quantity: number;
  options: Record<string, string>;
  is_active: boolean;
}

interface ProductDetail extends Product {
  reviews?: Review[];
  material?: string;
  style?: string;
  variants?: ProductVariant[];
}

export default function ProductDetailPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [wishlisted, setWishlisted] = useState(false);
  const [activeImage, setActiveImage] = useState(0);
  const { addItem } = useCartContext();
  const { addToast } = useToast();
  const [addingToCart, setAddingToCart] = useState(false);

  const fetchProduct = useCallback(async () => {
    try {
      const { data } = await api.get(`/api/products/${slug}`);
      const p = data.data ?? data;
      setProduct(p);

      // Fetch related products from same category
      if (p.category?.slug) {
        try {
          const { data: relData } = await api.get(
            `/api/products?category=${p.category.slug}&limit=4`,
          );
          const items = relData.data ?? relData;
          setRelated(
            (Array.isArray(items) ? items : []).filter(
              (r: Product) => r.id !== p.id,
            ).slice(0, 4),
          );
        } catch {
          // ignore
        }
      }
    } catch {
      // 404 or error
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    fetchProduct();
  }, [fetchProduct]);

  // Deterministic rating from product id (same formula as ProductCard)
  const rating = product ? ((product.id * 7 + 3) % 20 + 30) / 10 : 0;
  const reviewCount = product ? (product.id * 13 + 5) % 90 + 5 : 0;

  // Extract unique option values from actual variant data
  const optionMap = new Map<string, string[]>();
  if (product?.variants && Array.isArray(product.variants)) {
    for (const variant of product.variants) {
      if (variant.options && typeof variant.options === 'object') {
        for (const [key, value] of Object.entries(variant.options)) {
          if (!optionMap.has(key)) optionMap.set(key, []);
          const values = optionMap.get(key)!;
          if (!values.includes(value as string)) values.push(value as string);
        }
      }
    }
  }
  const sizes = optionMap.get('size') ?? [];
  const colors = optionMap.get('color') ?? [];

  const handleAddToCart = async () => {
    if (!product) return;
    setAddingToCart(true);
    try {
      await addItem(product.id, quantity);
      addToast({
        type: 'success',
        title: 'Added to cart',
        message: `${product.name} (x${quantity})`,
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
  };

  const handleBuyNow = () => {
    if (!product) return;
    const params = new URLSearchParams({
      direct: '1',
      product_id: product.id.toString(),
      slug: product.slug,
      quantity: quantity.toString(),
    });
    window.location.href = `/checkout?${params.toString()}`;
  };

  const toggleWishlist = async () => {
    if (!product) return;
    try {
      await api.post(`/api/wishlist/${product.id}`);
      setWishlisted(!wishlisted);
    } catch {
      // not logged in
    }
  };

  const images = product?.images?.length
    ? product.images
    : product?.primary_image
      ? [product.primary_image]
      : [];

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <Loader2 className="w-8 h-8 text-sari-500 animate-spin" />
        </div>
      </>
    );
  }

  if (!product) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
          <h2 className="font-display text-2xl text-gray-900 mb-2">Product Not Found</h2>
          <p className="text-gray-500 mb-6">The product you&apos;re looking for doesn&apos;t exist.</p>
          <Link
            href="/products"
            className="bg-gradient-to-r from-sari-500 to-sari-600 text-white font-medium px-6 py-3 rounded-full"
          >
            Browse Products
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-gradient-to-b from-gray-50/80 to-white">
        {/* Breadcrumb */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-2">
          <nav className="flex items-center gap-1.5 text-sm text-gray-400">
            <Link href="/" className="hover:text-sari-600 transition-colors">Home</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <Link href="/products" className="hover:text-sari-600 transition-colors">Shop</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-gray-700 font-medium truncate max-w-[200px]">{product.name}</span>
          </nav>
        </div>

        {/* Product Section */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
            {/* Image Gallery */}
            <div className="animate-fade-in">
              <div className="relative aspect-[4/5] bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl overflow-hidden border border-gray-100">
                {images.length > 0 ? (
                  <img
                    src={images[activeImage]?.url}
                    alt={images[activeImage]?.alt_text ?? product.name}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="w-20 h-20 mx-auto mb-3 rounded-2xl bg-gray-200/50 flex items-center justify-center">
                        <ShoppingCart className="w-8 h-8 text-gray-300" />
                      </div>
                      <p className="text-sm text-gray-400">No image available</p>
                    </div>
                  </div>
                )}
              </div>
              {/* Thumbnails */}
              {images.length > 1 && (
                <div className="flex gap-3 mt-4">
                  {images.map((img, i) => (
                    <button
                      key={img.id}
                      onClick={() => setActiveImage(i)}
                      className={cn(
                        'w-20 h-20 rounded-xl overflow-hidden border-2 transition-all duration-200',
                        activeImage === i
                          ? 'border-sari-500 shadow-md shadow-sari-500/20'
                          : 'border-gray-200 hover:border-gray-300',
                      )}
                    >
                      <img
                        src={img.url}
                        alt={img.alt_text ?? ''}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Product Info */}
            <div className="animate-slide-up">
              {/* Category */}
              <span className="text-xs font-semibold text-sari-600 tracking-wide uppercase">
                {product.category?.name ?? 'Uncategorized'}
              </span>

              {/* Name */}
              <h1 className="font-display text-3xl md:text-4xl text-gray-900 tracking-tight mt-2">
                {product.name}
              </h1>

              {/* Sold by */}
              {product.store && (
                <Link
                  href={`/store/${product.store.slug}`}
                  className="inline-flex items-center gap-1.5 mt-2 text-xs font-medium text-gray-500 hover:text-sari-600 transition-colors"
                >
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-gray-100">
                    {product.store.logo_url ? (
                      <img src={product.store.logo_url} alt={product.store.name} className="h-full w-full rounded-md object-cover" />
                    ) : (
                      <span className="text-[9px] font-bold text-gray-400">S</span>
                    )}
                  </span>
                  Sold by {product.store.name}
                </Link>
              )}

              {/* Rating */}
              <div className="flex items-center gap-2 mt-3">
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={cn(
                        'w-4 h-4',
                        star <= Math.round(rating)
                          ? 'text-sari-400 fill-sari-400'
                          : 'text-gray-200 fill-gray-200',
                      )}
                    />
                  ))}
                </div>
                <span className="text-sm text-gray-500">
                  {rating.toFixed(1)} ({reviewCount} reviews)
                </span>
              </div>

              {/* Price */}
              <div className="flex items-baseline gap-3 mt-4">
                <span className="font-display text-3xl text-gray-900 tracking-tight">
                  {formatPrice(product.base_price)}
                </span>
                {product.compare_at_price && product.compare_at_price > product.base_price && (
                  <span className="text-lg text-gray-400 line-through">
                    {formatPrice(product.compare_at_price)}
                  </span>
                )}
              </div>

              {/* Description */}
              {product.short_description && (
                <p className="text-gray-600 text-sm leading-relaxed mt-4">
                  {product.short_description}
                </p>
              )}

              {/* Stock Status */}
              <div className="mt-4">
                {product.stock_quantity > 0 ? (
                  <span className="inline-flex items-center gap-1.5 text-sm font-medium text-green-700 bg-green-50 px-3 py-1 rounded-full">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    In Stock
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-sm font-medium text-red-700 bg-red-50 px-3 py-1 rounded-full">
                    Out of Stock
                  </span>
                )}
              </div>

              {/* Divider */}
              <div className="border-t border-gray-100 my-6" />

              {/* Size Selector */}
              {sizes.length > 0 && (
                <div className="mb-5">
                  <span className="block text-sm font-medium text-gray-700 mb-2.5">Size</span>
                  <div className="flex flex-wrap gap-2">
                    {sizes.map((size) => (
                      <button
                        key={size}
                        onClick={() => setSelectedSize(size)}
                        className={cn(
                          'px-4 py-2 rounded-full text-sm font-medium border-2 transition-all duration-200',
                          selectedSize === size
                            ? 'border-sari-500 bg-sari-50 text-sari-800 shadow-sm'
                            : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50',
                        )}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Color Selector */}
              {colors.length > 0 && (
                <div className="mb-5">
                  <span className="block text-sm font-medium text-gray-700 mb-2.5">Color</span>
                  <div className="flex flex-wrap gap-2">
                    {colors.map((color) => (
                      <button
                        key={color}
                        onClick={() => setSelectedColor(color)}
                        className={cn(
                          'px-4 py-2 rounded-full text-sm font-medium border-2 transition-all duration-200',
                          selectedColor === color
                            ? 'border-sari-500 bg-sari-50 text-sari-800 shadow-sm'
                            : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50',
                        )}
                      >
                        {color}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Quantity Picker */}
              <div className="mb-6">
                <span className="block text-sm font-medium text-gray-700 mb-2.5">Quantity</span>
                <div className="flex items-center gap-3">
                  <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="p-3 text-gray-500 hover:bg-gray-50 transition-colors"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-12 text-center text-sm font-semibold text-gray-900">
                      {quantity}
                    </span>
                    <button
                      onClick={() => setQuantity(Math.min(product.stock_quantity, quantity + 1))}
                      className="p-3 text-gray-500 hover:bg-gray-50 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  <span className="text-sm text-gray-400">
                    {product.stock_quantity} available
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3">
                <button
                  onClick={handleAddToCart}
                  disabled={addingToCart || product.stock_quantity === 0}
                  className="flex-1 inline-flex items-center justify-center gap-2 border-2 border-sari-500 text-sari-700 hover:bg-sari-50 font-medium py-3.5 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ShoppingCart className="w-4 h-4" />
                  Add to Cart
                </button>
                <button
                  onClick={handleBuyNow}
                  disabled={addingToCart || product.stock_quantity === 0}
                  className="flex-1 bg-gradient-to-r from-sari-500 to-sari-600 hover:from-sari-600 hover:to-sari-700 text-white font-medium py-3.5 rounded-xl shadow-md shadow-sari-500/20 hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Buy Now
                </button>
                <button
                  onClick={toggleWishlist}
                  className={cn(
                    'p-3.5 rounded-xl border-2 transition-all duration-200',
                    wishlisted
                      ? 'border-red-200 bg-red-50 text-red-500'
                      : 'border-gray-200 text-gray-400 hover:border-gray-300 hover:text-red-400',
                  )}
                  aria-label="Add to wishlist"
                >
                  <Heart className={cn('w-5 h-5', wishlisted && 'fill-current')} />
                </button>
              </div>

              {/* Trust Badges */}
              <div className="grid grid-cols-3 gap-3 mt-8">
                {[
                  { icon: Truck, label: 'Fast Delivery', sub: '2-5 days' },
                  { icon: ShieldCheck, label: 'Secure Payment', sub: '100% safe' },
                  { icon: RotateCcw, label: 'Easy Returns', sub: '7-day policy' },
                ].map(({ icon: Icon, label, sub }) => (
                  <div
                    key={label}
                    className="flex flex-col items-center text-center p-3 rounded-xl bg-gray-50 border border-gray-100"
                  >
                    <Icon className="w-5 h-5 text-sari-500 mb-1.5" strokeWidth={1.8} />
                    <span className="text-xs font-medium text-gray-700">{label}</span>
                    <span className="text-[10px] text-gray-400">{sub}</span>
                  </div>
                ))}
              </div>

              {/* Product Details Table */}
              <div className="mt-8">
                <h3 className="font-display text-lg text-gray-900 mb-3">Product Details</h3>
                <div className="rounded-xl border border-gray-100 overflow-hidden">
                  {[
                    { label: 'Material', value: product.material ?? 'Cotton Blend' },
                    { label: 'Style', value: product.style ?? 'Casual' },
                    { label: 'Category', value: product.category?.name ?? 'N/A' },
                    { label: 'Brand', value: product.brand ?? 'SARI' },
                    { label: 'SKU', value: product.sku },
                  ].map(({ label, value }, i) => (
                    <div
                      key={label}
                      className={cn(
                        'flex items-center px-4 py-3 text-sm',
                        i % 2 === 0 ? 'bg-gray-50/50' : 'bg-white',
                      )}
                    >
                      <span className="w-28 text-gray-500 font-medium">{label}</span>
                      <span className="text-gray-900">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Customer Reviews */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 border-t border-gray-100">
          <h2 className="font-display text-2xl text-gray-900 mb-6">
            Customer Reviews
          </h2>
          {product.reviews && product.reviews.length > 0 ? (
            <div className="space-y-5">
              {product.reviews.map((review) => (
                <div
                  key={review.id}
                  className="bg-white rounded-xl border border-gray-100 p-5"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-sari-100 flex items-center justify-center">
                        <span className="text-sm font-semibold text-sari-700">
                          {review.user_name.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{review.user_name}</p>
                        <div className="flex items-center gap-0.5 mt-0.5">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star
                              key={s}
                              className={cn(
                                'w-3 h-3',
                                s <= review.rating
                                  ? 'text-sari-400 fill-sari-400'
                                  : 'text-gray-200 fill-gray-200',
                              )}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                    <span className="text-xs text-gray-400">
                      {new Date(review.created_at).toLocaleDateString('en-PH', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed">{review.comment}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-gray-50/50 rounded-xl border border-gray-100">
              <Star className="w-8 h-8 text-gray-200 mx-auto mb-3" />
              <p className="text-sm text-gray-500">No reviews yet. Be the first to review this product!</p>
            </div>
          )}
        </section>

        {/* You May Also Like */}
        {related.length > 0 && (
          <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 border-t border-gray-100">
            <h2 className="font-display text-2xl text-gray-900 mb-6">
              You May Also Like
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {related.map((p, i) => (
                <div
                  key={p.id}
                  className="animate-fade-in"
                  style={{ animationDelay: `${i * 80}ms` }}
                >
                  <ProductCard product={p} />
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </>
  );
}
