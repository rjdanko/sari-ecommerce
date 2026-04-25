'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Suspense, useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useCartContext } from '@/contexts/CartContext';
import { Heart, ShoppingCart, Search, Menu, X } from 'lucide-react';

export default function Navbar() {
  return (
    <Suspense>
      <NavbarInner />
    </Suspense>
  );
}

function NavbarInner() {
  const { user, loading, logout, hasRole } = useAuth();
  const { cart } = useCartContext();
  const itemCount = cart.item_count || cart.items.length;
  const [mobileOpen, setMobileOpen] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');

  useEffect(() => {
    setSearchQuery(searchParams.get('q') || '');
  }, [searchParams]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/products?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <nav className="sticky top-0 z-50 bg-amber-50/90 backdrop-blur-xl border-b border-amber-100/60 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center group">
            <Image
              src="/Sari_Logo.png"
              alt="SARI"
              width={180}
              height={60}
              className="h-16 w-auto group-hover:scale-105 transition-transform duration-200"
              priority
            />
          </Link>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center gap-8">
            {[
              { href: '/', label: 'Home' },
              { href: '/products?category=men', label: 'Men' },
              { href: '/products?category=women', label: 'Women' },
              { href: '/products', label: 'All Products' },
            ].map(({ href, label }) => (
              <Link
                key={label}
                href={href}
                className="relative text-sm font-medium text-gray-600 hover:text-sari-700 transition-colors duration-200 after:absolute after:bottom-[-4px] after:left-0 after:w-0 after:h-[2px] after:bg-sari-500 after:rounded-full after:transition-all after:duration-300 hover:after:w-full"
              >
                {label}
              </Link>
            ))}
          </div>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="hidden md:flex items-center relative">
            <Search className="absolute left-3.5 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              maxLength={255}
              className="pl-10 pr-4 py-2 w-56 lg:w-64 bg-gray-50 border border-gray-200/80 rounded-full text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-sari-500/20 focus:border-sari-400 transition-all duration-200"
            />
          </form>

          {/* Right section: icons + auth */}
          <div className="flex items-center gap-3">
            {user && (
              <>
                <Link
                  href="/wishlist"
                  className="p-2 text-gray-500 hover:text-sari-600 hover:bg-sari-50 rounded-full transition-all duration-200"
                >
                  <Heart className="w-5 h-5" />
                </Link>
                <Link
                  href="/cart"
                  className="p-2 text-gray-500 hover:text-sari-600 hover:bg-sari-50 rounded-full transition-all duration-200 relative"
                >
                  <ShoppingCart className="w-5 h-5" />
                  {itemCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-sari-500 rounded-full shadow-sm shadow-sari-500/30 animate-fade-in">
                      {itemCount > 99 ? '99+' : itemCount}
                    </span>
                  )}
                </Link>
              </>
            )}

            {loading ? (
              <div className="w-20 h-9 bg-gray-100 animate-pulse rounded-full" />
            ) : user ? (
              <div className="relative group">
                <button className="flex items-center gap-2 text-sm font-medium text-gray-700 px-3 py-1.5 rounded-full hover:bg-gray-50 transition-colors duration-200">
                  <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-sari-100 text-sari-700 text-xs font-semibold">
                    {user.first_name.charAt(0)}
                  </span>
                  {user.first_name}
                </button>
                <div className="invisible group-hover:visible opacity-0 group-hover:opacity-100 absolute right-0 mt-1 w-52 bg-white rounded-xl shadow-lg shadow-gray-200/50 border border-gray-100 py-2 z-50 transition-all duration-200 translate-y-1 group-hover:translate-y-0">
                  <Link href="/profile" className="flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                    Profile
                  </Link>
                  <Link href="/orders" className="flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                    My Orders
                  </Link>
                  {/* UI-only role check — backend enforces actual access */}
                  {hasRole('user') && !hasRole('business') && !hasRole('admin') && (
                    <Link href="/become-seller" className="flex items-center px-4 py-2.5 text-sm text-sari-700 hover:bg-sari-50 font-medium transition-colors">
                      Sell on SARI
                    </Link>
                  )}
                  {hasRole('admin') && (
                    <Link href="/admin/dashboard" className="flex items-center px-4 py-2.5 text-sm text-red-700 hover:bg-red-50 font-medium transition-colors">
                      Admin Panel
                    </Link>
                  )}
                  {hasRole('business') && (
                    <Link href="/business/dashboard" className="flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                      Business Dashboard
                    </Link>
                  )}
                  <div className="my-1 border-t border-gray-100" />
                  <button
                    onClick={async () => { await logout(); window.location.href = '/login'; }}
                    className="flex items-center w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    Logout
                  </button>
                </div>
              </div>
            ) : (
              <Link
                href="/login"
                className="bg-gradient-to-r from-sari-500 to-sari-600 hover:from-sari-600 hover:to-sari-700 text-white text-sm font-medium px-5 py-2 rounded-full shadow-sm hover:shadow-md transition-all duration-200"
              >
                Login
              </Link>
            )}

            {/* Mobile menu button */}
            <button
              className="md:hidden p-2 text-gray-600 hover:bg-gray-50 rounded-full transition-colors"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Nav */}
      {mobileOpen && (
        <div className="md:hidden border-t border-amber-100 bg-amber-50/95 backdrop-blur-lg px-4 py-4 space-y-1 animate-slide-down">
          {/* Mobile Search */}
          <form onSubmit={handleSearch} className="relative mb-3">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              maxLength={255}
              className="pl-10 pr-4 py-2.5 w-full bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sari-500/20 focus:border-sari-400"
            />
          </form>
          {[
            { href: '/', label: 'Home' },
            { href: '/products?category=men', label: 'Men' },
            { href: '/products?category=women', label: 'Women' },
            { href: '/products', label: 'All Products' },
          ].map(({ href, label }) => (
            <Link
              key={label}
              href={href}
              className="block text-sm font-medium text-gray-700 px-3 py-2.5 rounded-lg hover:bg-gray-50 transition-colors"
              onClick={() => setMobileOpen(false)}
            >
              {label}
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
}
