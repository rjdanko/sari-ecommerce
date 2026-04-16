export interface Order {
  id: number;
  order_number: string;
  status: string;
  subtotal: number;
  shipping_fee: number;
  tax: number;
  discount: number;
  total: number;
  payment_method: string | null;
  payment_status: string;
  shipping_address: Record<string, string>;
  notes: string | null;
  items: OrderItem[];
  created_at: string;
  confirmed_at: string | null;
  paid_at: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  cancellation_reason: string | null;
  cancellation_notes: string | null;
}

export interface OrderItem {
  id: number;
  product_id: number;
  product_name: string;
  product_slug: string | null;
  product_image_url: string | null;
  variant_id: number | null;
  variant_name: string | null;
  variant_options: Record<string, string> | null;
  quantity: number;
  unit_price: number;
  total_price: number;
}
