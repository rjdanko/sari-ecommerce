'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Settings,
  LogOut,
  ChevronRight,
  Menu,
  X,
  Store,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

const navItems = [
  { label: 'Dashboard', href: '/business/dashboard', icon: LayoutDashboard },
  { label: 'Products', href: '/business/products', icon: Package },
  { label: 'Orders', href: '/business/orders', icon: ShoppingCart },
  { label: 'Store Settings', href: '/business/store', icon: Settings },
];

export default function BusinessLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    window.location.href = '/login';
  };

  const initials = user
    ? `${user.first_name.charAt(0)}${user.last_name.charAt(0)}`
    : '';

  return (
    <div className="flex min-h-screen bg-gray-50/80">
      {/* Mobile header */}
      <div className="fixed inset-x-0 top-0 z-40 flex h-14 items-center gap-3 border-b border-gray-200 bg-white px-4 lg:hidden">
        <button
          onClick={() => setSidebarOpen(true)}
          className="rounded-lg p-1.5 text-gray-600 hover:bg-gray-100"
          aria-label="Open sidebar"
        >
          <Menu className="h-5 w-5" />
        </button>
        <span className="font-display text-lg tracking-tight text-gray-900">SARI</span>
        <span className="rounded-full bg-sari-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-sari-700">
          My Store
        </span>
      </div>

      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-gray-200/80 bg-white shadow-[1px_0_12px_-4px_rgba(245,158,11,0.06)] transition-transform duration-300 lg:z-30 lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo + Mobile close */}
        <div className="flex h-16 items-center gap-2.5 border-b border-gray-100 px-6">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-sari-400 to-sari-600 shadow-sm">
            <Store className="h-4 w-4 text-white" strokeWidth={2} />
          </div>
          <div className="flex items-center">
            <Image
              src="/Sari_text.png"
              alt="SARI"
              width={180}
              height={60}
              className="h-10 w-auto object-contain"
            />
            <span className="ml-2 rounded-full bg-sari-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-sari-700">
              My Store
            </span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="ml-auto rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 lg:hidden"
            aria-label="Close sidebar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Back to store link */}
        <div className="border-b border-gray-100 px-3 py-2">
          <Link
            href="/"
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-700"
          >
            <span>&larr;</span>
            Back to SARI
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
            Menu
          </p>
          {navItems.map((item) => {
            const isActive =
              item.href === '/business/dashboard'
                ? pathname === '/business/dashboard'
                : pathname.startsWith(item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'bg-gradient-to-r from-sari-500 to-sari-600 text-white shadow-sm shadow-sari-500/20'
                    : 'text-gray-600 hover:bg-sari-50 hover:text-sari-700'
                )}
              >
                <Icon
                  className={cn(
                    'h-[18px] w-[18px] transition-all duration-200',
                    isActive
                      ? 'text-white'
                      : 'text-gray-400 group-hover:text-sari-600'
                  )}
                  strokeWidth={isActive ? 2.2 : 1.8}
                />
                <span className="flex-1">{item.label}</span>
                {isActive && (
                  <ChevronRight className="h-3.5 w-3.5 text-white/60" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* User Footer */}
        <div className="border-t border-gray-100 p-3">
          <div className="flex items-center gap-3 rounded-xl px-3 py-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-sari-100 to-sari-200 ring-2 ring-sari-100">
              <span className="text-xs font-bold text-sari-800">{initials}</span>
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="truncate text-sm font-semibold text-gray-900">
                {user?.first_name} {user?.last_name}
              </p>
              <p className="truncate text-xs text-gray-500">Business Owner</p>
            </div>
            <button
              onClick={handleLogout}
              className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
              aria-label="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 pt-14 lg:ml-64 lg:pt-0">
        <div className="min-h-screen">{children}</div>
      </main>
    </div>
  );
}
