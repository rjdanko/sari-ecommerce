'use client';

import { CheckCircle, X } from 'lucide-react';

interface ConfirmOrderModalProps {
  isOpen: boolean;
  orderNumber: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export default function ConfirmOrderModal({
  isOpen,
  orderNumber,
  onConfirm,
  onCancel,
  loading = false,
}: ConfirmOrderModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onCancel}
      />
      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-200">
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center justify-center w-14 h-14 rounded-full bg-emerald-50 mx-auto mb-4">
          <CheckCircle className="w-7 h-7 text-emerald-500" strokeWidth={1.5} />
        </div>

        <h2 className="text-center font-display text-lg font-semibold text-gray-900 mb-1">
          Confirm Order
        </h2>
        <p className="text-center text-sm text-gray-500 mb-6">
          Are you sure you want to confirm order{' '}
          <span className="font-mono font-semibold text-gray-700">{orderNumber}</span>?
          This action cannot be undone.
        </p>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-600 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            ) : (
              <CheckCircle className="w-4 h-4" />
            )}
            Confirm Order
          </button>
        </div>
      </div>
    </div>
  );
}
