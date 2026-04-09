export interface Order {
  id: number;
  order_number: string;
  status: string;
  subtotal: number;
  shipping_fee: number;
  tax: number;
  total: number;
  payment_method: string | null;
  payment_status: string;
  shipping_address: Record<string, string>;
  items: OrderItem[];
  created_at: string;
  paid_at: string | null;
  cancellation_reason: string | null;
  cancellation_notes: string | null;
}

export interface OrderItem {
  id: number;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}
