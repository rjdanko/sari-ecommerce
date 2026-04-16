'use client';

import { useEffect, useState } from 'react';
import { useVouchers } from '@/hooks/useVouchers';
import { useToast } from '@/contexts/ToastContext';
import { useAuth } from '@/hooks/useAuth';
import { Ticket, Clock, Loader2, Truck, Tag, Percent, ChevronRight } from 'lucide-react';
import { cn, formatPrice } from '@/lib/utils';
import type { Voucher } from '@/types/voucher';
import Link from 'next/link';

function CountdownTimer({ expiresAt }: { expiresAt: string }) {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const update = () => {
      const diff = new Date(expiresAt).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft('Expired');
        return;
      }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${h}h ${m}m ${s}s`);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-medium tabular-nums">
      <Clock className="w-3 h-3" />
      {timeLeft}
    </span>
  );
}

function VoucherCard({
  voucher,
  onClaim,
  claiming,
}: {
  voucher: Voucher;
  onClaim: (id: number) => void;
  claiming: boolean;
}) {
  const isSpecial = voucher.type === 'special';
  const isFreeShipping = voucher.discount_type === 'free_shipping';
  const isPercentage = voucher.discount_type === 'percentage';

  const discountLabel = isFreeShipping
    ? 'FREE SHIPPING'
    : isPercentage
      ? `${voucher.discount_value}% OFF`
      : `P${voucher.discount_value} OFF`;

  const Icon = isFreeShipping ? Truck : isPercentage ? Percent : Tag;

  return (
    <div
      className={cn(
        'relative flex-shrink-0 w-[260px] rounded-2xl overflow-hidden border transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg group',
        isSpecial
          ? 'bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 border-orange-200/80 hover:shadow-orange-200/40'
          : 'bg-gradient-to-br from-sari-50 via-white to-sari-50/30 border-sari-200/60 hover:shadow-sari-200/40',
      )}
    >
      {/* Decorative dashed divider (coupon tear-off effect) */}
      <div className="absolute right-[72px] top-0 bottom-0 border-r-2 border-dashed border-gray-200/60" />

      <div className="flex">
        {/* Left: voucher info */}
        <div className="flex-1 p-4 pr-2">
          {/* Type badge */}
          <div className="flex items-center gap-1.5 mb-2.5">
            <span
              className={cn(
                'inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full',
                isSpecial
                  ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white'
                  : 'bg-sari-100 text-sari-700',
              )}
            >
              {isSpecial ? 'SPECIAL' : 'DAILY'}
            </span>
            <span
              className={cn(
                'text-[10px]',
                isSpecial ? 'text-orange-500' : 'text-sari-500',
              )}
            >
              <CountdownTimer expiresAt={voucher.expires_at} />
            </span>
          </div>

          {/* Discount value */}
          <div className="flex items-center gap-2 mb-1.5">
            <div
              className={cn(
                'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
                isSpecial
                  ? 'bg-gradient-to-br from-orange-400 to-red-500 text-white'
                  : 'bg-gradient-to-br from-sari-400 to-sari-600 text-white',
              )}
            >
              <Icon className="w-4 h-4" strokeWidth={2} />
            </div>
            <span
              className={cn(
                'text-base font-extrabold tracking-tight leading-tight',
                isSpecial ? 'text-orange-700' : 'text-sari-800',
              )}
            >
              {discountLabel}
            </span>
          </div>

          {/* Description */}
          <p className="text-[11px] text-gray-500 leading-snug line-clamp-2 mb-1">
            {voucher.description}
          </p>

          {/* Min spend */}
          {voucher.min_spend > 0 && (
            <p className="text-[10px] text-gray-400 font-medium">
              Min. spend {formatPrice(voucher.min_spend)}
            </p>
          )}
        </div>

        {/* Right: claim button area */}
        <div className="w-[72px] flex flex-col items-center justify-center p-2">
          {voucher.is_claimed ? (
            <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2.5 py-1.5 rounded-lg border border-green-200 text-center leading-tight">
              Claimed
            </span>
          ) : (
            <button
              onClick={() => onClaim(voucher.id)}
              disabled={claiming}
              className={cn(
                'text-[11px] font-bold px-3 py-2 rounded-lg transition-all duration-200 disabled:opacity-50',
                isSpecial
                  ? 'bg-gradient-to-b from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white shadow-sm shadow-orange-500/20'
                  : 'bg-gradient-to-b from-sari-500 to-sari-600 hover:from-sari-600 hover:to-sari-700 text-white shadow-sm shadow-sari-500/20',
              )}
            >
              {claiming ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin mx-auto" />
              ) : (
                'Claim'
              )}
            </button>
          )}

          {/* Remaining quantity */}
          {voucher.total_quantity && (
            <span className="text-[9px] text-gray-400 mt-1.5 text-center leading-tight">
              {Math.max(0, voucher.total_quantity - voucher.claimed_count)} left
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function VoucherSkeleton() {
  return (
    <div className="flex-shrink-0 w-[260px] h-[130px] rounded-2xl bg-gray-100 animate-pulse" />
  );
}

export default function VoucherBanner() {
  const { user } = useAuth();
  const { vouchers, loading, fetchAvailable, claimVoucher } = useVouchers();
  const { addToast } = useToast();
  const [claimingId, setClaimingId] = useState<number | null>(null);

  useEffect(() => {
    fetchAvailable();
  }, [fetchAvailable]);

  const handleClaim = async (voucherId: number) => {
    if (!user) {
      addToast({ type: 'info', title: 'Please log in to claim vouchers' });
      return;
    }
    setClaimingId(voucherId);
    const result = await claimVoucher(voucherId);
    if (result.success) {
      addToast({ type: 'success', title: 'Voucher claimed!' });
    } else {
      addToast({ type: 'error', title: result.error || 'Failed to claim' });
    }
    setClaimingId(null);
  };

  if (!loading && vouchers.length === 0) return null;

  return (
    <section className="relative overflow-hidden bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sari-400 to-sari-600 flex items-center justify-center shadow-sm shadow-sari-500/20">
              <Ticket className="w-5 h-5 text-white" strokeWidth={2} />
            </div>
            <div>
              <h2 className="font-display text-xl md:text-2xl text-gray-900 tracking-tight">
                Voucher Center
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Claim vouchers and save on your next order
              </p>
            </div>
          </div>
          <Link
            href="/products"
            className="hidden sm:inline-flex items-center gap-1 text-sm font-medium text-sari-600 hover:text-sari-700 transition-colors"
          >
            View all
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Scrollable voucher cards */}
        <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 scrollbar-hide snap-x snap-mandatory">
          {loading ? (
            <>
              <VoucherSkeleton />
              <VoucherSkeleton />
              <VoucherSkeleton />
              <VoucherSkeleton />
            </>
          ) : (
            vouchers.map((voucher) => (
              <div key={voucher.id} className="snap-start">
                <VoucherCard
                  voucher={voucher}
                  onClaim={handleClaim}
                  claiming={claimingId === voucher.id}
                />
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
