'use client';

import { type ReactNode } from 'react';
import { CartProvider } from '@/contexts/CartContext';
import { ToastProvider } from '@/contexts/ToastContext';
import ToastContainer from '@/components/Toast';

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <CartProvider>
        {children}
        <ToastContainer />
      </CartProvider>
    </ToastProvider>
  );
}
