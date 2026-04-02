# Module 11: Next.js Frontend Foundation

> **For agentic workers:** REQUIRED: Implement this plan task-by-task.
> Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Set up the Next.js frontend foundation: API client, TypeScript types,
auth hooks, cart hooks, Tailwind config with SARI brand tokens, and root layout.

**Architecture:** Next.js 15 App Router with client-side hooks for auth and cart.
Axios with `withCredentials` for Sanctum cookie-based auth. Zustand or React
Query for state management.

**Tech Stack:** Next.js 15, TypeScript, Tailwind CSS, Axios

---

## 🔒 Security Context

- **Sanctum CSRF:** The API client fetches a CSRF cookie before auth requests.
  Axios is configured with `withCredentials: true` to send cookies on every request.
- **No Secrets in Frontend:** Only `NEXT_PUBLIC_*` env vars are used.
- **Auth State:** The `useAuth` hook fetches user info from the backend on every
  page load — auth state is server-authoritative, not stored in localStorage.

---

## Files

- Create: `frontend/src/lib/api.ts`
- Create: `frontend/src/lib/utils.ts`
- Create: `frontend/src/types/user.ts`
- Create: `frontend/src/types/product.ts`
- Create: `frontend/src/types/cart.ts`
- Create: `frontend/src/types/order.ts`
- Create: `frontend/src/hooks/useAuth.ts`
- Create: `frontend/src/hooks/useCart.ts`
- Modify: `frontend/tailwind.config.ts`
- Modify: `frontend/src/app/layout.tsx`

---

### Task 11.1: API Client & TypeScript Types

- [x] **Step 1: Create Axios API client**

Create file: `frontend/src/lib/api.ts`

> **🔒 SECURITY:**
> - `withCredentials: true` sends Sanctum session cookies with every request
> - `baseURL` comes from `NEXT_PUBLIC_API_URL` — no secrets exposed
> - CSRF cookie is fetched before auth requests to prevent CSRF attacks

```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// CSRF cookie must be fetched before login/register
export async function getCsrfCookie(): Promise<void> {
  await api.get('/sanctum/csrf-cookie');
}

export default api;
```

- [x] **Step 2: Create utility functions**

Create file: `frontend/src/lib/utils.ts`

```typescript
export function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
  }).format(price);
}

export function cn(...classes: (string | undefined | false)[]): string {
  return classes.filter(Boolean).join(' ');
}
```

- [x] **Step 3: Create TypeScript types**

Create file: `frontend/src/types/user.ts`

```typescript
export interface User {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  default_address: Address | null;
  roles: Role[];
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
```

Create file: `frontend/src/types/product.ts`

```typescript
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
```

Create file: `frontend/src/types/cart.ts`

```typescript
export interface CartItem {
  product_id: number;
  quantity: number;
  variant_id: number | null;
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
```

Create file: `frontend/src/types/order.ts`

```typescript
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
}

export interface OrderItem {
  id: number;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}
```

- [x] **Step 4: Commit**

```bash
git add .
git commit -m "feat: add API client, utility functions, and TypeScript types"
```

---

### Task 11.2: Auth & Cart Hooks

- [x] **Step 1: Create useAuth hook**

Create file: `frontend/src/hooks/useAuth.ts`

> **🔒 SECURITY:**
> - Auth state is fetched from the server — not stored in localStorage (XSS-safe)
> - CSRF cookie is fetched before login/register to prevent CSRF attacks
> - `hasRole()` is for UI rendering only — the backend enforces actual authorization

```typescript
'use client';

import { useState, useEffect, useCallback } from 'react';
import api, { getCsrfCookie } from '@/lib/api';
import { User } from '@/types/user';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = useCallback(async () => {
    try {
      const { data } = await api.get('/api/user');
      setUser(data);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const login = async (email: string, password: string) => {
    await getCsrfCookie();
    await api.post('/api/login', { email, password });
    await fetchUser();
  };

  const register = async (data: {
    first_name: string;
    last_name: string;
    email: string;
    password: string;
    password_confirmation: string;
    role?: 'user' | 'business';
  }) => {
    await getCsrfCookie();
    await api.post('/api/register', data);
    await fetchUser();
  };

  const logout = async () => {
    await api.post('/api/logout');
    setUser(null);
  };

  /**
   * 🔒 NOTE: hasRole is for UI rendering only (show/hide buttons).
   * The backend enforces actual authorization via middleware and policies.
   * Never rely on this for security.
   */
  const hasRole = (role: string): boolean => {
    return user?.roles?.some(r => r.name === role) ?? false;
  };

  return { user, loading, login, register, logout, hasRole };
}
```

- [x] **Step 2: Create useCart hook**

Create file: `frontend/src/hooks/useCart.ts`

```typescript
'use client';

import { useState, useCallback } from 'react';
import api from '@/lib/api';
import { Cart } from '@/types/cart';

export function useCart() {
  const [cart, setCart] = useState<Cart>({ items: [], total: 0, item_count: 0 });
  const [loading, setLoading] = useState(false);

  const fetchCart = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/api/cart');
      setCart(data);
    } catch {
      // user not logged in or cart empty
    } finally {
      setLoading(false);
    }
  }, []);

  const addItem = async (productId: number, quantity: number = 1, variantId?: number) => {
    const { data } = await api.post('/api/cart', {
      product_id: productId,
      quantity,
      variant_id: variantId ?? null,
    });
    setCart(prev => ({ ...prev, items: data.items }));
  };

  const updateQuantity = async (productId: number, quantity: number) => {
    const { data } = await api.put(`/api/cart/${productId}`, { quantity });
    setCart(prev => ({ ...prev, items: data.items }));
  };

  const removeItem = async (productId: number) => {
    const { data } = await api.delete(`/api/cart/${productId}`);
    setCart(prev => ({ ...prev, items: data.items }));
  };

  const clearCart = async () => {
    await api.delete('/api/cart');
    setCart({ items: [], total: 0, item_count: 0 });
  };

  return { cart, loading, fetchCart, addItem, updateQuantity, removeItem, clearCart };
}
```

- [x] **Step 3: Commit**

```bash
git add .
git commit -m "feat: add useAuth and useCart hooks"
```

---

### Task 11.3: Tailwind Config & Root Layout

- [x] **Step 1: Configure Tailwind with SARI brand tokens**

File: `frontend/tailwind.config.ts`

```typescript
import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        sari: {
          50: '#FFFBEB',
          100: '#FEF3C7',
          200: '#FDE68A',
          300: '#FCD34D',
          400: '#FBBF24',
          500: '#F59E0B',   // Primary
          600: '#D97706',   // Primary hover
          700: '#B45309',
          800: '#92400E',
          900: '#78350F',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
```

- [x] **Step 2: Update root layout with Inter font**

File: `frontend/src/app/layout.tsx`

```tsx
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'SARI — Discover Your Perfect Style',
  description: 'Shop the latest fashion trends with AI-powered recommendations and smart comparison tools. GCash & Card payments accepted.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {children}
      </body>
    </html>
  );
}
```

- [x] **Step 3: Commit**

```bash
git add .
git commit -m "feat: add Tailwind brand config and root layout with Inter font"
```
