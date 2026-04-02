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
  is_featured: boolean;
  category: Category;
  images: ProductImage[];
  primary_image: ProductImage | null;
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
