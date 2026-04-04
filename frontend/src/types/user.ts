export interface User {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  default_address: Address | null;
  roles: Role[];
  created_at: string;
}

export interface Role {
  id: number;
  name: 'user' | 'business' | 'admin';
}

export interface Address {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
}
