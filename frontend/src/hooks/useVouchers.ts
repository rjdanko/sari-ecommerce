'use client';

import { useState, useCallback } from 'react';
import api from '@/lib/api';
import type { Voucher, VoucherClaim, ApplyVoucherResponse } from '@/types/voucher';

export function useVouchers() {
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [claimedVouchers, setClaimedVouchers] = useState<VoucherClaim[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchAvailable = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/api/vouchers');
      setVouchers(data.data);
    } catch {
      // not logged in or error
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMyClaimed = useCallback(async () => {
    try {
      const { data } = await api.get('/api/vouchers/my-claimed');
      setClaimedVouchers(data.data);
    } catch {
      // ignore
    }
  }, []);

  const claimVoucher = async (voucherId: number): Promise<{ success: boolean; error?: string }> => {
    try {
      await api.post('/api/vouchers/claim', { voucher_id: voucherId });
      await fetchAvailable();
      await fetchMyClaimed();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.response?.data?.error || 'Failed to claim voucher' };
    }
  };

  const applyVoucher = async (code: string): Promise<{ success: boolean; data?: ApplyVoucherResponse; error?: string }> => {
    try {
      const { data } = await api.post('/api/vouchers/apply', { code });
      return { success: true, data };
    } catch (err: any) {
      return { success: false, error: err.response?.data?.error || 'Invalid voucher code' };
    }
  };

  return {
    vouchers,
    claimedVouchers,
    loading,
    fetchAvailable,
    fetchMyClaimed,
    claimVoucher,
    applyVoucher,
  };
}
