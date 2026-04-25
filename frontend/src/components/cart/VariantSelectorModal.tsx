'use client';

import { useState } from 'react';
import { X, ShoppingCart, Loader2 } from 'lucide-react';
import { cn, formatPrice } from '@/lib/utils';

interface Variant {
  id: number;
  name: string;
  price: number;
  stock_quantity: number;
  options: Record<string, string> | null;
  is_active: boolean;
}

interface VariantSelectorModalProps {
  isOpen: boolean;
  productName: string;
  productImage: string | null;
  basePrice: number;
  variants: Variant[];
  onClose: () => void;
  onAddToCart: (variantId: number) => Promise<void>;
}

export default function VariantSelectorModal({
  isOpen,
  productName,
  productImage,
  basePrice,
  variants,
  onClose,
  onAddToCart,
}: VariantSelectorModalProps) {
  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);

  const activeVariants = variants.filter((v) => v.is_active && v.stock_quantity > 0);
  const selectedVariant = activeVariants.find((v) => v.id === selectedVariantId) ?? null;

  const handleAdd = async () => {
    if (!selectedVariantId || adding) return;
    setAdding(true);
    try {
      await onAddToCart(selectedVariantId);
      onClose();
      setSelectedVariantId(null);
    } finally {
      setAdding(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Sheet / modal */}
      <div className="relative bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl shadow-2xl animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200">
        {/* Handle (mobile) */}
        <div className="sm:hidden flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-gray-200" />
        </div>

        {/* Header */}
        <div className="flex items-start gap-3 px-5 pt-4 pb-4 border-b border-gray-100">
          {productImage && (
            <div className="shrink-0 w-14 h-14 rounded-xl overflow-hidden bg-gray-50 border border-gray-100">
              <img
                src={productImage}
                alt={productName}
                className="w-full h-full object-cover"
                onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/placeholder-product.svg'; }}
              />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 text-sm leading-snug line-clamp-2">{productName}</p>
            <p className="text-sari-600 font-bold text-base mt-0.5">
              {selectedVariant ? formatPrice(selectedVariant.price) : formatPrice(basePrice)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Variants */}
        <div className="px-5 py-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Select Variant
          </p>
          <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto pr-1">
            {activeVariants.map((variant) => {
              const isSelected = selectedVariantId === variant.id;
              return (
                <button
                  key={variant.id}
                  onClick={() => setSelectedVariantId(variant.id)}
                  className={cn(
                    'w-full flex items-center justify-between px-3.5 py-3 rounded-xl border-2 text-left transition-all duration-150',
                    isSelected
                      ? 'border-sari-400 bg-sari-50 text-sari-800'
                      : 'border-gray-100 bg-white text-gray-700 hover:border-gray-200 hover:bg-gray-50',
                  )}
                >
                  <div>
                    <p className="font-medium text-sm">{variant.name}</p>
                    {variant.options && Object.keys(variant.options).length > 0 && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        {Object.entries(variant.options).map(([k, v]) => `${k}: ${v}`).join(' · ')}
                      </p>
                    )}
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    <p className={cn('font-semibold text-sm', isSelected ? 'text-sari-700' : 'text-gray-900')}>
                      {formatPrice(variant.price)}
                    </p>
                    {variant.stock_quantity <= 5 && (
                      <p className="text-[10px] text-amber-500 font-medium mt-0.5">
                        Only {variant.stock_quantity} left
                      </p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
          {activeVariants.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-4">No variants available.</p>
          )}
        </div>

        {/* Footer CTA */}
        <div className="px-5 pb-6 pt-2">
          <button
            onClick={handleAdd}
            disabled={!selectedVariantId || adding}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-sari-400 to-sari-600 text-white py-3 text-sm font-semibold shadow-sm hover:shadow-md hover:from-sari-500 hover:to-sari-700 active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {adding ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <ShoppingCart className="w-4 h-4" />
            )}
            {selectedVariantId ? 'Add to Cart' : 'Select a Variant'}
          </button>
        </div>
      </div>
    </div>
  );
}
