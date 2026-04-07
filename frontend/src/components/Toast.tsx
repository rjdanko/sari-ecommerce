'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, XCircle, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast, type Toast as ToastType } from '@/contexts/ToastContext';

const icons = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
};

const styles = {
  success: {
    bg: 'bg-white',
    border: 'border-green-200',
    icon: 'text-green-500',
    bar: 'bg-green-500',
  },
  error: {
    bg: 'bg-white',
    border: 'border-red-200',
    icon: 'text-red-500',
    bar: 'bg-red-500',
  },
  info: {
    bg: 'bg-white',
    border: 'border-sari-200',
    icon: 'text-sari-500',
    bar: 'bg-sari-500',
  },
};

function ToastItem({ toast, onDismiss }: { toast: ToastType; onDismiss: () => void }) {
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);
  const Icon = icons[toast.type];
  const style = styles[toast.type];

  useEffect(() => {
    // Trigger entrance animation
    requestAnimationFrame(() => setVisible(true));
  }, []);

  const handleDismiss = () => {
    setExiting(true);
    setTimeout(onDismiss, 300);
  };

  // Auto-exit animation before removal
  useEffect(() => {
    const timer = setTimeout(() => setExiting(true), 3700);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl border shadow-lg shadow-gray-200/50 transition-all duration-300 ease-out',
        style.bg,
        style.border,
        visible && !exiting
          ? 'translate-y-0 opacity-100 scale-100'
          : exiting
            ? 'translate-y-2 opacity-0 scale-95'
            : 'translate-y-4 opacity-0 scale-95',
      )}
    >
      {/* Progress bar */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-100">
        <div
          className={cn('h-full rounded-full', style.bar)}
          style={{ animation: 'toast-progress 4s linear forwards' }}
        />
      </div>

      <div className="flex items-start gap-3 px-4 py-3.5">
        <div className={cn('mt-0.5 shrink-0', style.icon)}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900">{toast.title}</p>
          {toast.message && (
            <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{toast.message}</p>
          )}
          {toast.action && (
            <Link
              href={toast.action.href}
              className="inline-flex items-center mt-1.5 text-xs font-semibold text-sari-600 hover:text-sari-700 transition-colors"
            >
              {toast.action.label}
              <span className="ml-0.5">&rarr;</span>
            </Link>
          )}
        </div>
        <button
          onClick={handleDismiss}
          className="shrink-0 p-1 -m-1 text-gray-300 hover:text-gray-500 transition-colors rounded-lg"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

export default function ToastContainer() {
  const { toasts, removeToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <>
      {/* Keyframes for progress bar */}
      <style jsx global>{`
        @keyframes toast-progress {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col-reverse gap-2.5 w-[360px] max-w-[calc(100vw-2rem)]">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={() => removeToast(toast.id)} />
        ))}
      </div>
    </>
  );
}
