'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Package,
  Warehouse,
  ShoppingCart,
  Users,
  BarChart3,
  LogOut,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { label: 'Products', href: '/admin/products', icon: Package },
  { label: 'Inventory', href: '/admin/inventory', icon: Warehouse },
  { label: 'Orders', href: '/admin/orders', icon: ShoppingCart },
  { label: 'Users', href: '/admin/users', icon: Users },
  { label: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen bg-gray-50/80">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 flex w-64 flex-col border-r border-gray-200/80 bg-white shadow-[1px_0_12px_-4px_rgba(245,158,11,0.06)]">
        {/* Logo */}
        <div className="flex h-16 items-center gap-2.5 border-b border-gray-100 px-6">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-sari-400 to-sari-600 shadow-sm">
            <span className="text-sm font-bold tracking-tight text-white">S</span>
          </div>
          <div>
            <span className="font-display text-lg tracking-tight text-gray-900">SARI</span>
            <span className="ml-1.5 rounded-full bg-sari-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-sari-700">
              Admin
            </span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
            Menu
          </p>
          {navItems.map((item) => {
            const isActive =
              item.href === '/admin'
                ? pathname === '/admin'
                : pathname.startsWith(item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
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

        {/* Admin Profile Footer */}
        <div className="border-t border-gray-100 p-3">
          <div className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-200 hover:bg-gray-50">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-sari-100 to-sari-200 ring-2 ring-sari-100">
              <span className="text-xs font-bold text-sari-800">JD</span>
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="truncate text-sm font-semibold text-gray-900">Juan Dela Cruz</p>
              <p className="truncate text-xs text-gray-500">Store Admin</p>
            </div>
            <button
              className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
              aria-label="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="ml-64 flex-1">
        <div className="min-h-screen">{children}</div>
      </main>
    </div>
  );
}
