export interface Voucher {
  id: number;
  code: string;
  name: string;
  description: string | null;
  type: 'daily' | 'special';
  discount_type: 'percentage' | 'fixed' | 'free_shipping';
  discount_value: number;
  min_spend: number;
  max_discount: number | null;
  total_quantity: number | null;
  claimed_count: number;
  max_claims_per_user: number;
  starts_at: string;
  expires_at: string;
  is_active: boolean;
  is_claimed?: boolean;
}

export interface VoucherClaim {
  id: number;
  voucher_id: number;
  user_id: number;
  order_id: number | null;
  status: 'claimed' | 'used' | 'expired';
  voucher: Voucher;
}

export interface ApplyVoucherResponse {
  voucher: Voucher;
  discount: number;
  free_shipping: boolean;
  new_subtotal: number;
}
