export interface Store {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  banner_url: string | null;
  address: string | null;
  phone: string | null;
  latitude: number | null;
  longitude: number | null;
  is_active: boolean;
}

export interface Product {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  short_description: string | null;
  base_price: number;
  compare_at_price: number | null;
  sku: string;
  stock_quantity: number;
  status: 'draft' | 'active' | 'archived';
  brand: string | null;
  gender: 'men' | 'women' | 'unisex' | null;
  is_featured: boolean;
  average_rating: number;
  review_count: number;
  category: Category;
  images: ProductImage[];
  primary_image: ProductImage | null;
  store?: Store | null;
}

export interface Review {
  id: number;
  user_name: string;
  rating: number;
  comment: string | null;
  created_at: string;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  children?: Category[];
}

export interface ProductImage {
  id: number;
  url: string;
  alt_text: string | null;
  is_primary: boolean;
}
