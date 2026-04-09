'use client';

import { useState, useEffect, useCallback } from 'react';
import { Loader2 } from 'lucide-react';

interface CancelOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string, notes: string | null) => Promise<void>;
  orderNumber: string;
}

const reasons = [
  { value: 'changed_mind', label: 'I changed my mind' },
  { value: 'found_better_deal', label: 'I found a better deal' },
  { value: 'ordered_by_mistake', label: 'Ordered by mistake' },
  { value: 'delivery_too_long', label: 'Delivery takes too long' },
  { value: 'want_to_change_order', label: 'I want to change my order' },
  { value: 'other', label: 'Other' },
] as const;

export default function CancelOrderModal({ isOpen, onClose, onConfirm, orderNumber }: CancelOrderModalProps) {
  const [selected, setSelected] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = selected && (selected !== 'other' || notes.trim().length > 0) && !submitting;

  useEffect(() => {
    if (!isOpen) {
      setSelected('');
      setNotes('');
      setSubmitting(false);
    }
  }, [isOpen]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, handleKeyDown]);

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await onConfirm(selected, selected === 'other' ? notes.trim() : null);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl animate-scale-in">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Cancel Order</h2>
          <p className="mt-1 text-sm text-gray-500">
            Order <span className="font-mono font-medium text-gray-700">{orderNumber}</span>
          </p>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          <p className="text-sm font-medium text-gray-700 mb-3">
            Why are you cancelling this order?
          </p>
          <div className="space-y-2">
            {reasons.map((reason) => (
              <label
                key={reason.value}
                className={`flex items-center gap-3 rounded-xl border px-4 py-3 cursor-pointer transition-colors ${
                  selected === reason.value
                    ? 'border-sari-400 bg-sari-50/60'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50/60'
                }`}
              >
                <input
                  type="radio"
                  name="cancel-reason"
                  value={reason.value}
                  checked={selected === reason.value}
                  onChange={() => setSelected(reason.value)}
                  className="h-4 w-4 text-sari-600 border-gray-300 focus:ring-sari-500"
                />
                <span className="text-sm text-gray-700">{reason.label}</span>
              </label>
            ))}
          </div>

          {/* Other reason textarea */}
          {selected === 'other' && (
            <div className="mt-3">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value.slice(0, 500))}
                placeholder="Please tell us why..."
                rows={3}
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-sari-400 focus:outline-none focus:ring-2 focus:ring-sari-100 resize-none"
              />
              <p className="mt-1 text-xs text-gray-400 text-right">{notes.length}/500</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 pb-6 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-xl px-5 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            Go Back
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="rounded-xl px-5 py-2.5 text-sm font-semibold text-white bg-red-500 hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            Cancel Order
          </button>
        </div>
      </div>
    </div>
  );
}
