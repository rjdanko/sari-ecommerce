'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import BecomeSellerWizard from '@/components/seller/BecomeSellerWizard';
import { useAuth } from '@/hooks/useAuth';

export default function BecomeSellerPage() {
  const { user, loading, hasRole } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    if (hasRole('business') || hasRole('admin')) {
      router.replace('/business/dashboard');
    }
  }, [user, loading, hasRole, router]);

  if (loading || !user || hasRole('business') || hasRole('admin')) {
    return (
      <>
        <main className="min-h-screen flex items-center justify-center bg-[#f8f9fb]">
          <Loader2 className="w-8 h-8 animate-spin text-sari-500" />
        </main>
      </>
    );
  }

  return (
    <>
      <main className="min-h-screen bg-[#f8f9fb]">
        <div className="relative overflow-hidden bg-gradient-to-r from-sari-50 via-white to-sari-50 border-b border-gray-100">
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-10">
            <h1 className="font-display text-3xl md:text-4xl font-bold text-gray-900 tracking-tight">
              Become a Seller
            </h1>
            <p className="mt-2 text-gray-500 text-sm md:text-base max-w-lg">
              Turn your account into a shop in three quick steps.
            </p>
          </div>
        </div>

        <BecomeSellerWizard />
      </main>
    </>
  );
}
