'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useCartContext } from '@/contexts/CartContext';
import { useToast } from '@/contexts/ToastContext';
import { cn, formatPrice } from '@/lib/utils';
import api from '@/lib/api';
import {
  MapPin,
  CreditCard,
  QrCode,
  ShieldCheck,
  ChevronRight,
  Package,
  Loader2,
  ShoppingBag,
  Minus,
  Plus,
  Trash2,
  Ticket,
  X,
} from 'lucide-react';
import { useVouchers } from '@/hooks/useVouchers';
import type { ApplyVoucherResponse } from '@/types/voucher';

type PaymentMethod = 'cod' | 'qrph' | 'card';

type ShippingForm = {
  fullName: string;
  phone: string;
  address1: string;
  address2: string;
  city: string;
  province: string;
  zip: string;
};

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <Loader2 className="w-8 h-8 text-sari-500 animate-spin" />
        </div>
      </>
    }>
      <CheckoutContent />
    </Suspense>
  );
}

function CheckoutContent() {
  const searchParams = useSearchParams();
  const isDirect = searchParams.get('direct') === '1';
  const directProductId = searchParams.get('product_id');
  const directSlug = searchParams.get('slug');
  const directQuantity = parseInt(searchParams.get('quantity') || '1', 10);
  const directVariantId = searchParams.get('variant_id');

  const { cart, loading: cartLoading, fetchCart, updateQuantity, removeItem } = useCartContext();
  const { addToast } = useToast();
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(() => {
    if (typeof window === 'undefined') return 'cod';
    try {
      const raw = sessionStorage.getItem('checkout_shipping_draft');
      if (!raw) return 'cod';
      const draft = JSON.parse(raw);
      if (draft?.paymentMethod === 'qrph' || draft?.paymentMethod === 'card' || draft?.paymentMethod === 'cod') {
        return draft.paymentMethod as PaymentMethod;
      }
    } catch {
      // ignore
    }
    return 'cod';
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [directProduct, setDirectProduct] = useState<any>(null);
  const [directLoading, setDirectLoading] = useState(false);
  const [deliveryFee, setDeliveryFee] = useState<number | null>(null);
  const [deliveryBreakdown, setDeliveryBreakdown] = useState<any>(null);
  const [estimatingFee, setEstimatingFee] = useState(false);
  const [voucherCode, setVoucherCode] = useState('');
  const [appliedVoucher, setAppliedVoucher] = useState<ApplyVoucherResponse | null>(null);
  const [applyingVoucher, setApplyingVoucher] = useState(false);
  const [voucherError, setVoucherError] = useState('');
  const { applyVoucher, claimedVouchers, fetchMyClaimed } = useVouchers();
  const [form, setForm] = useState<ShippingForm>(() => {
    const initial: ShippingForm = { fullName: '', phone: '', address1: '', address2: '', city: '', province: '', zip: '' };
    if (typeof window === 'undefined') return initial;
    try {
      const raw = sessionStorage.getItem('checkout_shipping_draft');
      if (!raw) return initial;
      const draft = JSON.parse(raw);
      if (draft?.form && typeof draft.form === 'object') {
        return { ...initial, ...draft.form };
      }
    } catch {
      // ignore
    }
    return initial;
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!form.fullName.trim()) errors.fullName = 'Full name is required';
    if (!form.phone.trim()) errors.phone = 'Phone number is required';
    if (!form.address1.trim()) errors.address1 = 'Address is required';
    if (!form.city.trim()) errors.city = 'City is required';
    if (!form.province.trim()) errors.province = 'Province / State is required';
    if (!form.zip.trim()) errors.zip = 'Zip / Postal code is required';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  useEffect(() => {
    fetchMyClaimed();
  }, [fetchMyClaimed]);

  useEffect(() => {
    if (isDirect && (directSlug || directProductId)) {
      setDirectLoading(true);
      const identifier = directSlug || directProductId;
      api.get(`/api/products/${identifier}`).then(({ data }) => {
        setDirectProduct(data.data ?? data);
      }).catch(() => {
        // product fetch failed
      }).finally(() => {
        setDirectLoading(false);
      });
    } else {
      fetchCart();
    }
  }, [isDirect, directSlug, directProductId, fetchCart]);

  // Build display items — either direct product or cart items
  const directVariant = isDirect && directProduct && directVariantId
    ? directProduct.variants?.find((v: any) => v.id === parseInt(directVariantId))
    : null;

  const displayItems = isDirect && directProduct
    ? [{
        product_id: directProduct.id,
        quantity: directQuantity,
        variant_id: directVariantId ? parseInt(directVariantId) : null,
        variant: directVariant
          ? { id: directVariant.id, options: directVariant.options ?? {}, price_modifier: undefined }
          : undefined,
        product: {
          id: directProduct.id,
          name: directProduct.name,
          slug: directProduct.slug,
          base_price: directProduct.base_price,
          image_url: directProduct.primary_image?.url ?? null,
          stock_quantity: directProduct.stock_quantity,
        },
      }]
    : cart.items;

  const subtotal = displayItems.reduce(
    (sum, item) => sum + item.product.base_price * item.quantity,
    0,
  );
  const discount = appliedVoucher?.discount ?? 0;
  const effectiveShipping = appliedVoucher?.free_shipping ? 0 : (deliveryFee ?? 0);
  const total = subtotal + effectiveShipping - discount;

  const updateForm = (field: keyof ShippingForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  // Estimate delivery fee when address fields are filled
  const estimateDeliveryFee = async () => {
    if (!form.address1 || !form.city) return;
    const productId = isDirect && directProductId
      ? parseInt(directProductId)
      : displayItems[0]?.product_id;
    if (!productId) return;

    setEstimatingFee(true);
    try {
      const { data } = await api.post('/api/delivery-fee/estimate', {
        product_id: productId,
        shipping_address: {
          line1: form.address1,
          city: form.city,
          state: form.province,
          postal_code: form.zip,
          country: 'PH',
        },
      });
      setDeliveryFee(data.delivery_fee);
      setDeliveryBreakdown(data.breakdown);
    } catch {
      setDeliveryFee(100);
      setDeliveryBreakdown(null);
    } finally {
      setEstimatingFee(false);
    }
  };

  const handleQuantityChange = async (productId: number, newQty: number) => {
    if (newQty < 1) return;
    try {
      await updateQuantity(productId, newQty);
    } catch {
      addToast({ type: 'error', title: 'Failed to update quantity' });
    }
  };

  const handleRemoveItem = async (productId: number, productName: string) => {
    try {
      await removeItem(productId);
      addToast({ type: 'info', title: 'Removed from cart', message: productName });
    } catch {
      addToast({ type: 'error', title: 'Failed to remove item' });
    }
  };

  const handleApplyVoucher = async (code: string) => {
    if (!code.trim()) return;
    setApplyingVoucher(true);
    setVoucherError('');
    const result = await applyVoucher(code);
    if (result.success && result.data) {
      setAppliedVoucher(result.data);
      setVoucherCode(result.data.voucher.code);
    } else {
      setVoucherError(result.error || 'Invalid voucher code');
    }
    setApplyingVoucher(false);
  };

  const handleRemoveVoucher = () => {
    setAppliedVoucher(null);
    setVoucherCode('');
    setVoucherError('');
  };

  const handlePlaceOrder = async () => {
    if (!validateForm()) {
      const firstErrorEl = document.querySelector('[data-field-error]');
      firstErrorEl?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      const payload: any = {
        payment_method: paymentMethod,
        shipping_address: {
          full_name: form.fullName,
          phone: form.phone,
          line1: form.address1,
          line2: form.address2,
          city: form.city,
          state: form.province,
          postal_code: form.zip,
          country: 'PH',
        },
      };

      if (appliedVoucher) {
        payload.voucher_code = appliedVoucher.voucher.code;
      }

      if (isDirect && directProductId) {
        payload.direct_buy = {
          product_id: parseInt(directProductId),
          quantity: directQuantity,
          variant_id: directVariantId ? parseInt(directVariantId) : null,
        };
      }

      const { data } = await api.post('/api/checkout', payload);

      // Save draft so form can be restored if payment is cancelled
      const draft = { form, paymentMethod };
      try {
        sessionStorage.setItem('checkout_shipping_draft', JSON.stringify(draft));
      } catch {
        // sessionStorage unavailable — proceed without saving
      }

      if (data.checkout_url) {
        // Online payment — redirect to PayMongo; draft will be restored on cancel/retry
        window.location.href = data.checkout_url;
      } else {
        // COD — order is confirmed, clear the draft immediately
        try {
          sessionStorage.removeItem('checkout_shipping_draft');
        } catch {
          // ignore
        }
        window.location.href = data.redirect_url || '/checkout/success';
      }
    } catch (err: any) {
      const message = err.response?.data?.message || err.response?.data?.error || 'Failed to place order. Please try again.';
      setError(message);
      setTimeout(() => {
        document.querySelector('[data-checkout-error]')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 50);
    } finally {
      setSubmitting(false);
    }
  };

  const FieldError = ({ field }: { field: string }) =>
    formErrors[field] ? (
      <p data-field-error className="mt-1 text-xs text-red-500">
        {formErrors[field]}
      </p>
    ) : null;

  if (cartLoading || directLoading) {
    return (
      <>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <Loader2 className="w-8 h-8 text-sari-500 animate-spin" />
        </div>
      </>
    );
  }

  if (displayItems.length === 0) {
    return (
      <>
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
          <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-5">
            <ShoppingBag className="w-8 h-8 text-gray-300" />
          </div>
          <h2 className="font-display text-2xl text-gray-900 mb-2">Your Cart is Empty</h2>
          <p className="text-gray-500 text-sm mb-6">Add some items to your cart before checking out.</p>
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
      <main className="min-h-screen bg-gradient-to-b from-gray-50/80 to-white">
        {/* Page Header */}
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
            <div className="flex items-center gap-1.5 text-sm text-gray-400 mb-4">
              <Link href="/cart" className="hover:text-sari-600 transition-colors">Cart</Link>
              <ChevronRight className="w-3.5 h-3.5" />
              <span className="text-gray-700 font-medium">Checkout</span>
              <ChevronRight className="w-3.5 h-3.5" />
              <span className="text-gray-400">Confirmation</span>
            </div>
            <h1 className="font-display text-3xl md:text-4xl text-gray-900 tracking-tight">
              Checkout
            </h1>
            <p className="mt-2 text-gray-500 text-sm md:text-base max-w-lg">
              Complete your order details below and place your order.
            </p>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
          {error && (
            <div
              data-checkout-error
              className="mb-6 bg-red-50 text-red-600 text-sm rounded-xl p-4 border border-red-100 animate-fade-in"
            >
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-10">
            {/* Left Column — Forms */}
            <div className="lg:col-span-2 space-y-6">
              {/* Shipping Information */}
              <section
                className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 animate-slide-up"
                style={{ animationDelay: '0.05s' }}
              >
                <h2 className="font-display text-lg text-gray-900 mb-4 flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-sari-100 text-sari-700 text-xs font-bold">
                    1
                  </span>
                  Shipping Information
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={form.fullName}
                      onChange={(e) => updateForm('fullName', e.target.value)}
                      placeholder="Juan Dela Cruz"
                      className={cn(
                        'w-full px-4 py-3 rounded-xl border text-sm text-gray-900 placeholder:text-gray-300 focus:ring-2 focus:ring-sari-500/20 focus:border-sari-500 outline-none transition-all duration-200',
                        formErrors.fullName ? 'border-red-400 bg-red-50/30' : 'border-gray-200',
                      )}
                    />
                    <FieldError field="fullName" />
                  </div>

                  <div className="sm:col-span-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      inputMode="numeric"
                      pattern="[0-9+]*"
                      value={form.phone}
                      onChange={(e) => {
                        const numericOnly = e.target.value.replace(/[^0-9+]/g, '');
                        updateForm('phone', numericOnly);
                      }}
                      placeholder="09123456789"
                      className={cn(
                        'w-full px-4 py-3 rounded-xl border text-sm text-gray-900 placeholder:text-gray-300 focus:ring-2 focus:ring-sari-500/20 focus:border-sari-500 outline-none transition-all duration-200',
                        formErrors.phone ? 'border-red-400 bg-red-50/30' : 'border-gray-200',
                      )}
                    />
                    <FieldError field="phone" />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Address Line 1
                    </label>
                    <div className="relative">
                      <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                      <input
                        type="text"
                        value={form.address1}
                        onChange={(e) => updateForm('address1', e.target.value)}
                        placeholder="House/Unit No., Street, Barangay"
                        className={cn(
                          'w-full pl-10 pr-4 py-3 rounded-xl border text-sm text-gray-900 placeholder:text-gray-300 focus:ring-2 focus:ring-sari-500/20 focus:border-sari-500 outline-none transition-all duration-200',
                          formErrors.address1 ? 'border-red-400 bg-red-50/30' : 'border-gray-200',
                        )}
                      />
                    </div>
                    <FieldError field="address1" />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Address Line 2{' '}
                      <span className="text-gray-300 font-normal">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      value={form.address2}
                      onChange={(e) => updateForm('address2', e.target.value)}
                      placeholder="Building, Floor, Landmark"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder:text-gray-300 focus:ring-2 focus:ring-sari-500/20 focus:border-sari-500 outline-none transition-all duration-200"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      City
                    </label>
                    <input
                      type="text"
                      value={form.city}
                      onChange={(e) => updateForm('city', e.target.value)}
                      placeholder="Quezon City"
                      className={cn(
                        'w-full px-4 py-3 rounded-xl border text-sm text-gray-900 placeholder:text-gray-300 focus:ring-2 focus:ring-sari-500/20 focus:border-sari-500 outline-none transition-all duration-200',
                        formErrors.city ? 'border-red-400 bg-red-50/30' : 'border-gray-200',
                      )}
                    />
                    <FieldError field="city" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Province
                    </label>
                    <input
                      type="text"
                      value={form.province}
                      onChange={(e) => updateForm('province', e.target.value)}
                      placeholder="Metro Manila"
                      className={cn(
                        'w-full px-4 py-3 rounded-xl border text-sm text-gray-900 placeholder:text-gray-300 focus:ring-2 focus:ring-sari-500/20 focus:border-sari-500 outline-none transition-all duration-200',
                        formErrors.province ? 'border-red-400 bg-red-50/30' : 'border-gray-200',
                      )}
                    />
                    <FieldError field="province" />
                  </div>

                  <div className="sm:col-span-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Zip Code
                    </label>
                    <input
                      type="text"
                      value={form.zip}
                      onChange={(e) => updateForm('zip', e.target.value)}
                      placeholder="1100"
                      className={cn(
                        'w-full px-4 py-3 rounded-xl border text-sm text-gray-900 placeholder:text-gray-300 focus:ring-2 focus:ring-sari-500/20 focus:border-sari-500 outline-none transition-all duration-200',
                        formErrors.zip ? 'border-red-400 bg-red-50/30' : 'border-gray-200',
                      )}
                    />
                    <FieldError field="zip" />
                  </div>

                  <div className="sm:col-span-2">
                    <button
                      type="button"
                      onClick={estimateDeliveryFee}
                      disabled={!form.address1 || !form.city || estimatingFee}
                      className="inline-flex items-center gap-2 text-sm font-medium text-sari-700 hover:text-sari-800 bg-sari-50 hover:bg-sari-100 px-4 py-2.5 rounded-xl border border-sari-200 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {estimatingFee ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          Estimating...
                        </>
                      ) : (
                        <>
                          <MapPin className="w-3.5 h-3.5" />
                          Estimate Delivery Fee
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </section>

              {/* Payment Method */}
              <section
                className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 animate-slide-up"
                style={{ animationDelay: '0.1s' }}
              >
                <h2 className="font-display text-lg text-gray-900 mb-4 flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-sari-100 text-sari-700 text-xs font-bold">
                    2
                  </span>
                  Payment Method
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    onClick={() => setPaymentMethod('cod')}
                    className={cn(
                      'flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all duration-200 cursor-pointer',
                      paymentMethod === 'cod'
                        ? 'border-sari-500 bg-sari-50/60 shadow-sm shadow-sari-500/10'
                        : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/50',
                    )}
                  >
                    <div
                      className={cn(
                        'w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors duration-200',
                        paymentMethod === 'cod'
                          ? 'bg-gradient-to-br from-sari-400 to-sari-600 text-white'
                          : 'bg-gray-100 text-gray-400',
                      )}
                    >
                      <CreditCard className="w-5 h-5" strokeWidth={1.8} />
                    </div>
                    <div>
                      <span
                        className={cn(
                          'font-medium text-sm block transition-colors',
                          paymentMethod === 'cod' ? 'text-sari-800' : 'text-gray-700',
                        )}
                      >
                        Cash on Delivery
                      </span>
                      <span className="text-xs text-gray-400">Pay when you receive</span>
                    </div>
                  </button>

                  <button
                    onClick={() => setPaymentMethod('qrph')}
                    className={cn(
                      'flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all duration-200 cursor-pointer',
                      paymentMethod === 'qrph'
                        ? 'border-sari-500 bg-sari-50/60 shadow-sm shadow-sari-500/10'
                        : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/50',
                    )}
                  >
                    <div
                      className={cn(
                        'w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors duration-200',
                        paymentMethod === 'qrph'
                          ? 'bg-gradient-to-br from-sari-400 to-sari-600 text-white'
                          : 'bg-gray-100 text-gray-400',
                      )}
                    >
                      <QrCode className="w-5 h-5" strokeWidth={1.8} />
                    </div>
                    <div>
                      <span
                        className={cn(
                          'font-medium text-sm block transition-colors',
                          paymentMethod === 'qrph' ? 'text-sari-800' : 'text-gray-700',
                        )}
                      >
                        QR PH
                      </span>
                      <span className="text-xs text-gray-400">Scan to pay instantly</span>
                    </div>
                  </button>

                  <button
                    onClick={() => setPaymentMethod('card')}
                    className={cn(
                      'flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all duration-200 cursor-pointer',
                      paymentMethod === 'card'
                        ? 'border-sari-500 bg-sari-50/60 shadow-sm shadow-sari-500/10'
                        : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/50',
                    )}
                  >
                    <div
                      className={cn(
                        'w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors duration-200',
                        paymentMethod === 'card'
                          ? 'bg-gradient-to-br from-sari-400 to-sari-600 text-white'
                          : 'bg-gray-100 text-gray-400',
                      )}
                    >
                      <CreditCard className="w-5 h-5" strokeWidth={1.8} />
                    </div>
                    <div>
                      <span
                        className={cn(
                          'font-medium text-sm block transition-colors',
                          paymentMethod === 'card' ? 'text-sari-800' : 'text-gray-700',
                        )}
                      >
                        Card Payment
                      </span>
                      <span className="text-xs text-gray-400">Visa / Mastercard</span>
                    </div>
                  </button>
                </div>
              </section>

              {/* Voucher Code */}
              <section
                className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 animate-slide-up"
                style={{ animationDelay: '0.15s' }}
              >
                <h2 className="font-display text-lg text-gray-900 mb-4 flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-sari-100 text-sari-700 text-xs font-bold">
                    3
                  </span>
                  Voucher Code
                </h2>

                {appliedVoucher ? (
                  <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                        <Ticket className="w-4 h-4 text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-green-800">
                          {appliedVoucher.voucher.name}
                        </p>
                        <p className="text-xs text-green-600">
                          {appliedVoucher.voucher.code}
                          {appliedVoucher.free_shipping && ' — Free Shipping'}
                          {appliedVoucher.discount > 0 && ` — Save ${formatPrice(appliedVoucher.discount)}`}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={handleRemoveVoucher}
                      className="p-1.5 text-green-600 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      aria-label="Remove voucher"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Ticket className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                        <input
                          type="text"
                          value={voucherCode}
                          onChange={(e) => {
                            setVoucherCode(e.target.value.toUpperCase());
                            setVoucherError('');
                          }}
                          placeholder="Enter voucher code"
                          maxLength={50}
                          className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder:text-gray-300 focus:ring-2 focus:ring-sari-500/20 focus:border-sari-500 outline-none transition-all duration-200 uppercase"
                        />
                      </div>
                      <button
                        onClick={() => handleApplyVoucher(voucherCode)}
                        disabled={!voucherCode.trim() || applyingVoucher}
                        className="px-5 py-3 rounded-xl bg-gradient-to-r from-sari-500 to-sari-600 text-white text-sm font-medium hover:from-sari-600 hover:to-sari-700 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
                      >
                        {applyingVoucher ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          'Apply'
                        )}
                      </button>
                    </div>
                    {voucherError && (
                      <p className="mt-2 text-xs text-red-500">{voucherError}</p>
                    )}

                    {/* Quick select from claimed vouchers */}
                    {claimedVouchers.length > 0 && (
                      <div className="mt-3">
                        <p className="text-xs text-gray-400 mb-2">Your claimed vouchers:</p>
                        <div className="flex flex-wrap gap-2">
                          {claimedVouchers.map((claim) => (
                            <button
                              key={claim.id}
                              onClick={() => handleApplyVoucher(claim.voucher.code)}
                              disabled={applyingVoucher}
                              className="inline-flex items-center gap-1.5 text-[11px] font-medium text-sari-700 bg-sari-50 hover:bg-sari-100 border border-sari-200 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                            >
                              <Ticket className="w-3 h-3" />
                              {claim.voucher.code}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </section>
            </div>

            {/* Right Column — Order Summary */}
            <div className="lg:col-span-1">
              <div
                className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 lg:sticky lg:top-24 animate-slide-up"
                style={{ animationDelay: '0.15s' }}
              >
                <h2 className="font-display text-lg text-gray-900 mb-5 flex items-center gap-2">
                  <Package className="w-5 h-5 text-sari-500" strokeWidth={1.8} />
                  Order Summary
                </h2>

                {/* Item List */}
                <div className="space-y-4 mb-6">
                  {displayItems.map((item) => (
                    <div key={item.product_id} className="flex gap-3">
                      <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-gray-100 to-gray-50 border border-gray-200/60 flex items-center justify-center shrink-0 overflow-hidden">
                        {item.product.image_url ? (
                          <img
                            src={item.product.image_url}
                            alt={item.product.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Package className="w-6 h-6 text-gray-300" strokeWidth={1.5} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {item.product.name}
                        </p>
                        {item.variant?.options && Object.keys(item.variant.options).length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-0.5">
                            {Object.entries(item.variant.options).map(([key, value]) => (
                              <span
                                key={key}
                                className="inline-flex items-center text-[10px] font-medium text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded"
                              >
                                {key}: {String(value)}
                              </span>
                            ))}
                          </div>
                        )}
                        {/* Quantity controls */}
                        <div className="flex items-center gap-1.5 mt-1.5">
                          {!isDirect && (
                            <>
                              <button
                                onClick={() => handleQuantityChange(item.product_id, item.quantity - 1)}
                                disabled={item.quantity <= 1}
                                className="w-6 h-6 flex items-center justify-center rounded-md border border-gray-200 text-gray-400 hover:text-gray-600 hover:border-gray-300 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                            </>
                          )}
                          <span className="w-7 text-center text-xs font-semibold text-gray-700">
                            {isDirect ? `Qty: ${item.quantity}` : item.quantity}
                          </span>
                          {!isDirect && (
                            <>
                              <button
                                onClick={() => handleQuantityChange(item.product_id, item.quantity + 1)}
                                disabled={item.quantity >= item.product.stock_quantity}
                                className="w-6 h-6 flex items-center justify-center rounded-md border border-gray-200 text-gray-400 hover:text-gray-600 hover:border-gray-300 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => handleRemoveItem(item.product_id, item.product.name)}
                                className="ml-auto w-6 h-6 flex items-center justify-center rounded-md text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                                aria-label="Remove item"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-sm font-semibold text-gray-800">
                            {formatPrice(item.product.base_price * item.quantity)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t border-dashed border-gray-200 my-4" />

                {/* Totals */}
                <div className="space-y-2.5 text-sm">
                  <div className="flex justify-between text-gray-500">
                    <span>Subtotal</span>
                    <span className="font-medium text-gray-700">{formatPrice(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-gray-500">
                    <span className="flex items-center gap-1">
                      Delivery Fee
                      {deliveryBreakdown && (
                        <span
                          className="text-[10px] text-gray-400 cursor-help"
                          title={`Base ₱${deliveryBreakdown.base_fee} (first ${deliveryBreakdown.base_km}km) + ₱${deliveryBreakdown.additional_fee} (${deliveryBreakdown.additional_km}km × ₱${deliveryBreakdown.per_km_rate}/km)`}
                        >
                          ⓘ
                        </span>
                      )}
                    </span>
                    <span className="font-medium text-gray-700">
                      {appliedVoucher?.free_shipping ? (
                        <span className="text-green-600 font-semibold">FREE</span>
                      ) : estimatingFee ? (
                        '...'
                      ) : deliveryFee !== null ? (
                        formatPrice(deliveryFee)
                      ) : (
                        '—'
                      )}
                    </span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span className="flex items-center gap-1">
                        <Ticket className="w-3.5 h-3.5" />
                        Voucher Discount
                      </span>
                      <span className="font-semibold">-{formatPrice(discount)}</span>
                    </div>
                  )}
                </div>

                <div className="border-t border-gray-200 mt-4 pt-4">
                  <div className="flex justify-between items-baseline">
                    <span className="text-base font-medium text-gray-700">Total</span>
                    <span className="font-display text-2xl text-gray-900 tracking-tight">
                      {formatPrice(total)}
                    </span>
                  </div>
                </div>

                {/* Place Order Button */}
                <button
                  onClick={handlePlaceOrder}
                  disabled={submitting}
                  className="group w-full mt-6 bg-gradient-to-r from-sari-500 to-sari-600 hover:from-sari-600 hover:to-sari-700 text-white font-medium py-3.5 rounded-xl shadow-md shadow-sari-500/20 hover:shadow-lg hover:shadow-sari-500/30 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {paymentMethod === 'card' || paymentMethod === 'qrph' ? 'Redirecting...' : 'Placing Order...'}
                    </span>
                  ) : (
                    <>
                      {paymentMethod === 'card' ? 'Pay with Card' : paymentMethod === 'qrph' ? 'Pay with QR PH' : 'Place Order'}
                      <span className="inline-block transition-transform duration-200 group-hover:translate-x-0.5">
                        &rarr;
                      </span>
                    </>
                  )}
                </button>

                {/* Trust Badge */}
                <div className="mt-4 flex items-center justify-center gap-1.5 text-xs text-gray-400">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Secure checkout &middot; 100% buyer protection</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
