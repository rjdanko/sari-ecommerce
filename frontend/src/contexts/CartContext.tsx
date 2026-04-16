'use client';

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import api from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import type { Cart } from '@/types/cart';

interface CartContextType {
  cart: Cart;
  loading: boolean;
  fetchCart: () => Promise<void>;
  addItem: (productId: number, quantity?: number, variantId?: number) => Promise<void>;
  updateQuantity: (productId: number, quantity: number) => Promise<void>;
  updateVariant: (productId: number, variantId: number) => Promise<void>;
  removeItem: (productId: number) => Promise<void>;
  clearCart: () => Promise<void>;
}

const CartContext = createContext<CartContextType | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
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

  // Auto-fetch cart when user logs in
  useEffect(() => {
    if (user) {
      fetchCart();
    } else {
      setCart({ items: [], total: 0, item_count: 0 });
    }
  }, [user, fetchCart]);

  const addItem = useCallback(async (productId: number, quantity: number = 1, variantId?: number) => {
    const { data } = await api.post('/api/cart', {
      product_id: productId,
      quantity,
      variant_id: variantId ?? null,
    });
    setCart(data);
  }, []);

  const updateQuantity = useCallback(async (productId: number, quantity: number) => {
    const { data } = await api.put(`/api/cart/${productId}`, { quantity });
    setCart(data);
  }, []);

  const updateVariant = useCallback(async (productId: number, variantId: number) => {
    const { data } = await api.put(`/api/cart/${productId}/variant`, { variant_id: variantId });
    setCart(data);
  }, []);

  const removeItem = useCallback(async (productId: number) => {
    const { data } = await api.delete(`/api/cart/${productId}`);
    setCart(data);
  }, []);

  const clearCart = useCallback(async () => {
    await api.delete('/api/cart');
    setCart({ items: [], total: 0, item_count: 0 });
  }, []);

  return (
    <CartContext.Provider value={{ cart, loading, fetchCart, addItem, updateQuantity, updateVariant, removeItem, clearCart }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCartContext() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCartContext must be used within CartProvider');
  return ctx;
}
