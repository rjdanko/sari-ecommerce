'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useCartContext } from '@/contexts/CartContext';
import { useToast } from '@/contexts/ToastContext';
import { formatPrice } from '@/lib/utils';
import api from '@/lib/api';
import {
  ShoppingBag,
  Minus,
  Plus,
  Trash2,
  Package,
  Loader2,
  ChevronRight,
} from 'lucide-react';

function CartSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="flex gap-4 p-4 rounded-2xl border border-gray-100 bg-white animate-pulse"
        >
          <div className="w-24 h-24 rounded-xl bg-gray-200 shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-48 bg-gray-200 rounded" />
            <div className="h-3 w-24 bg-gray-100 rounded" />
            <div className="h-4 w-20 bg-gray-200 rounded mt-3" />
          </div>
        </div>
      ))}
    </div>
  );
}

function VariantSelector({
  currentVariant,
  variants,
  onVariantChange,
}: {
  currentVariant: { id: number; options: Record<string, string> };
  variants: Array<{ id: number; options: Record<string, string>; is_active: boolean }>;
  onVariantChange: (variantId: number) => void;
}) {
  const [selected, setSelected] = useState<Record<string, string>>(currentVariant.options);
  const [updating, setUpdating] = useState(false);

  const optionKeys = Array.from(
    new Set(variants.flatMap((v) => Object.keys(v.options)))
  );

  const handleChange = async (key: string, value: string) => {
    const newSelected = { ...selected, [key]: value };
    setSelected(newSelected);

    const match = variants.find((v) =>
      optionKeys.every((k) => v.options[k] === newSelected[k])
    );

    if (match && match.id !== currentVariant.id) {
      setUpdating(true);
      onVariantChange(match.id);
    }
  };

  // Reset updating when currentVariant changes (cart refreshed)
  useEffect(() => {
    setUpdating(false);
    setSelected(currentVariant.options);
  }, [currentVariant.id, currentVariant.options]);

  return (
    <div className="flex flex-wrap gap-2 mt-1.5">
      {optionKeys.map((key) => {
        const uniqueValues = Array.from(new Set(variants.map((v) => v.options[key]).filter(Boolean)));
        return (
          <label key={key} className="flex items-center gap-1.5 text-[11px]">
            <span className="font-medium text-gray-500">{key}:</span>
            <select
              value={selected[key] || ''}
              onChange={(e) => handleChange(key, e.target.value)}
              disabled={updating}
              className="text-[11px] font-medium text-gray-700 bg-gray-50 border border-gray-200 rounded-md px-1.5 py-0.5 focus:ring-1 focus:ring-sari-500/30 focus:border-sari-400 outline-none transition-all disabled:opacity-50"
            >
              {uniqueValues.map((val) => (
                <option key={val} value={val}>{val}</option>
              ))}
            </select>
          </label>
        );
      })}
      {updating && <Loader2 className="w-3 h-3 animate-spin text-sari-500" />}
    </div>
  );
}

export default function CartPage() {
  const { cart, loading, fetchCart, updateQuantity, updateVariant, removeItem } =
    useCartContext();
  const { addToast } = useToast();
  const [productVariants, setProductVariants] = useState<Record<number, any[]>>({});

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  // Fetch variants for products in cart that have a variant selected
  useEffect(() => {
    cart.items.forEach(async (item) => {
      if (item.variant_id && !productVariants[item.product_id]) {
        try {
          const { data } = await api.get(`/api/products/${item.product.slug}`);
          const product = data.data ?? data;
          if (product.variants?.length > 0) {
            setProductVariants((prev) => ({
              ...prev,
              [item.product_id]: product.variants.filter((v: any) => v.is_active),
            }));
          }
        } catch {
          // ignore
        }
      }
    });
  }, [cart.items]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleVariantChange = async (productId: number, variantId: number) => {
    try {
      await updateVariant(productId, variantId);
      addToast({ type: 'success', title: 'Variant updated' });
    } catch {
      addToast({ type: 'error', title: 'Failed to update variant' });
    }
  };

  const handleQuantityChange = async (
    productId: number,
    newQty: number,
    maxQty: number,
  ) => {
    if (newQty < 1 || newQty > maxQty) return;
    try {
      await updateQuantity(productId, newQty);
    } catch {
      addToast({ type: 'error', title: 'Failed to update quantity' });
    }
  };

  const handleRemoveItem = async (productId: number, productName: string) => {
    try {
      await removeItem(productId);
      addToast({
        type: 'info',
        title: 'Removed from cart',
        message: productName,
      });
    } catch {
      addToast({ type: 'error', title: 'Failed to remove item' });
    }
  };

  const subtotal = cart.items.reduce(
    (sum, item) => sum + item.product.base_price * item.quantity,
    0,
  );

  return (
    <>
      <main className="min-h-screen bg-gradient-to-b from-gray-50/80 to-white">
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
              Shopping Cart
            </h1>
            <p className="mt-2 text-gray-500 text-sm md:text-base max-w-lg">
              Review your items and proceed to checkout when you&apos;re ready.
            </p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
          {/* Loading state */}
          {loading && <CartSkeleton />}

          {/* Empty cart state */}
          {!loading && cart.items.length === 0 && (
            <div className="flex flex-col items-center justify-center text-center py-16 sm:py-24">
              <div className="relative mb-8">
                <div className="absolute inset-0 scale-150 bg-gradient-to-b from-sari-100/40 to-transparent rounded-full blur-2xl" />
                <div className="relative w-28 h-28 rounded-3xl bg-gradient-to-br from-gray-100 to-gray-50 border border-gray-200/60 flex items-center justify-center shadow-sm">
                  <ShoppingBag
                    className="w-12 h-12 text-gray-300"
                    strokeWidth={1.5}
                  />
                </div>
              </div>

              <h2 className="font-display text-2xl md:text-3xl text-gray-900 tracking-tight">
                Your Cart is Empty
              </h2>
              <p className="mt-3 text-gray-500 text-base max-w-sm">
                Add some products to get started!
              </p>

              <Link
                href="/products"
                className="group mt-8 inline-flex items-center gap-2 bg-gradient-to-r from-sari-500 to-sari-600 hover:from-sari-600 hover:to-sari-700 text-white font-medium px-8 py-3.5 rounded-full shadow-md shadow-sari-500/20 hover:shadow-lg hover:shadow-sari-500/30 transition-all duration-200"
              >
                Continue Shopping
                <span className="inline-block transition-transform duration-200 group-hover:translate-x-0.5">
                  &rarr;
                </span>
              </Link>
            </div>
          )}

          {/* Cart items */}
          {!loading && cart.items.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-10">
              {/* Item list */}
              <div className="lg:col-span-2 space-y-4">
                {cart.items.map((item) => (
                  <div
                    key={item.product_id}
                    className="flex gap-4 p-4 rounded-2xl border border-gray-100 bg-white shadow-sm hover:shadow-md transition-shadow duration-200"
                  >
                    {/* Product image */}
                    <Link
                      href={`/products/${item.product.slug}`}
                      className="w-24 h-24 sm:w-28 sm:h-28 rounded-xl bg-gradient-to-br from-gray-100 to-gray-50 border border-gray-200/60 flex items-center justify-center shrink-0 overflow-hidden"
                    >
                      {item.product.image_url ? (
                        <img
                          src={item.product.image_url}
                          alt={item.product.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            if (!target.dataset.fallback) {
                              target.dataset.fallback = '1';
                              target.src = '/placeholder-product.svg';
                            }
                          }}
                        />
                      ) : (
                        <Package
                          className="w-8 h-8 text-gray-300"
                          strokeWidth={1.5}
                        />
                      )}
                    </Link>

                    {/* Product info */}
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/products/${item.product.slug}`}
                        className="text-sm font-semibold text-gray-900 hover:text-sari-700 transition-colors line-clamp-2"
                      >
                        {item.product.name}
                      </Link>

                      {item.variant && productVariants[item.product_id] ? (
                        <VariantSelector
                          currentVariant={item.variant}
                          variants={productVariants[item.product_id]}
                          onVariantChange={(variantId) => handleVariantChange(item.product_id, variantId)}
                        />
                      ) : item.variant?.options && Object.keys(item.variant.options).length > 0 ? (
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {Object.entries(item.variant.options).map(([key, value]) => (
                            <span
                              key={key}
                              className="inline-flex items-center text-[11px] font-medium text-gray-600 bg-gray-100 px-2 py-0.5 rounded-md"
                            >
                              {key}: {value}
                            </span>
                          ))}
                        </div>
                      ) : null}

                      <p className="text-sm text-gray-500 mt-0.5">
                        {formatPrice(item.product.base_price)} each
                      </p>

                      {/* Quantity controls */}
                      <div className="flex items-center gap-2 mt-3">
                        <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
                          <button
                            onClick={() =>
                              handleQuantityChange(
                                item.product_id,
                                item.quantity - 1,
                                item.product.stock_quantity,
                              )
                            }
                            disabled={item.quantity <= 1}
                            className="w-8 h-8 flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="w-10 text-center text-sm font-semibold text-gray-900">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() =>
                              handleQuantityChange(
                                item.product_id,
                                item.quantity + 1,
                                item.product.stock_quantity,
                              )
                            }
                            disabled={
                              item.quantity >= item.product.stock_quantity
                            }
                            className="w-8 h-8 flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <button
                          onClick={() =>
                            handleRemoveItem(
                              item.product_id,
                              item.product.name,
                            )
                          }
                          className="ml-2 w-8 h-8 flex items-center justify-center rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                          aria-label="Remove item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Line total */}
                    <div className="text-right shrink-0">
                      <span className="text-base font-bold text-gray-900">
                        {formatPrice(item.product.base_price * item.quantity)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Order summary sidebar */}
              <div className="lg:col-span-1">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 lg:sticky lg:top-24">
                  <h2 className="font-display text-lg text-gray-900 mb-5">
                    Order Summary
                  </h2>

                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between text-gray-500">
                      <span>
                        Subtotal ({cart.items.length}{' '}
                        {cart.items.length === 1 ? 'item' : 'items'})
                      </span>
                      <span className="font-medium text-gray-700">
                        {formatPrice(subtotal)}
                      </span>
                    </div>
                    <div className="flex justify-between text-gray-500">
                      <span>Shipping</span>
                      <span className="font-medium text-gray-700">Free</span>
                    </div>
                  </div>

                  <div className="border-t border-gray-200 mt-4 pt-4">
                    <div className="flex justify-between items-baseline">
                      <span className="text-base font-medium text-gray-700">
                        Total
                      </span>
                      <span className="font-display text-2xl text-gray-900 tracking-tight">
                        {formatPrice(subtotal)}
                      </span>
                    </div>
                  </div>

                  <Link
                    href="/checkout"
                    className="group w-full mt-6 bg-gradient-to-r from-sari-500 to-sari-600 hover:from-sari-600 hover:to-sari-700 text-white font-medium py-3.5 rounded-xl shadow-md shadow-sari-500/20 hover:shadow-lg hover:shadow-sari-500/30 transition-all duration-200 flex items-center justify-center gap-2"
                  >
                    Proceed to Checkout
                    <ChevronRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                  </Link>

                  <Link
                    href="/products"
                    className="block mt-3 text-center text-sm text-gray-500 hover:text-sari-600 transition-colors"
                  >
                    Continue Shopping
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
