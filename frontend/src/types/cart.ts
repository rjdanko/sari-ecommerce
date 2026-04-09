export interface CartItem {
  product_id: number;
  quantity: number;
  variant_id: number | null;
  variant?: {
    id: number;
    options: Record<string, string>;
    price_modifier?: number;
  };
  product: {
    id: number;
    name: string;
    slug: string;
    base_price: number;
    image_url: string | null;
    stock_quantity: number;
  };
}

export interface Cart {
  items: CartItem[];
  total: number;
  item_count: number;
}
