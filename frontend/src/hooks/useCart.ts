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
