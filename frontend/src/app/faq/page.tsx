'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import Link from 'next/link';

const faqs = [
  {
    q: 'How do I create an account?',
    a: 'Click "Login" in the navbar and select "Register". Fill in your name, email, and password, then verify your email address to activate your account.',
  },
  {
    q: 'How do I track my order?',
    a: "Once your order is shipped, you'll receive an email with a tracking number. Visit your assigned carrier's website and enter the tracking number to follow your delivery. You can also check your order status in My Orders.",
  },
  {
    q: 'What payment methods do you accept?',
    a: 'We accept GCash, PayMaya, and major credit/debit cards (Visa and Mastercard). Payment is processed securely at checkout.',
  },
  {
    q: 'Can I change or cancel my order?',
    a: 'Orders can only be changed or cancelled before they are processed by the seller. Email support@sari.ph immediately with your order number. Once processing has begun, cancellations may no longer be possible.',
  },
  {
    q: 'How do I return an item?',
    a: null,
    link: { label: 'Returns page', href: '/returns' },
  },
  {
    q: 'When will I receive my refund?',
    a: 'Refunds are processed within 5–10 banking days after we receive and inspect your returned item. The refund goes back to your original payment method.',
  },
  {
    q: 'How do I become a seller on SARI?',
    a: null,
    link: { label: 'Become a Seller page', href: '/become-seller' },
  },
  {
    q: 'How do I use a discount voucher?',
    a: "At checkout, look for the \"Voucher Code\" field and enter your code before placing your order. Valid vouchers are applied automatically to your total.",
  },
];

export default function FAQPage() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <main className="bg-white min-h-screen">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Frequently Asked Questions</h1>
        <p className="text-gray-500 mb-8">
          Quick answers to common questions about shopping on SARI.
        </p>

        <div className="divide-y divide-gray-100 rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {faqs.map((faq, i) => (
            <div key={i}>
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="flex w-full items-center justify-between px-6 py-4 text-left hover:bg-gray-50 transition-colors"
              >
                <span className="text-sm font-semibold text-gray-900 pr-4">{faq.q}</span>
                <ChevronDown
                  className={`w-4 h-4 text-sari-500 shrink-0 transition-transform duration-200 ${open === i ? 'rotate-180' : ''}`}
                />
              </button>
              {open === i && (
                <div className="px-6 pb-5 text-sm text-gray-600">
                  {faq.a ? (
                    <p>{faq.a}</p>
                  ) : (
                    <p>
                      Please visit our{' '}
                      <Link href={faq.link!.href} className="font-medium text-sari-600 hover:underline">
                        {faq.link!.label}
                      </Link>{' '}
                      for full details.
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        <p className="mt-8 text-sm text-gray-500 text-center">
          Still have questions?{' '}
          <Link href="/contact" className="font-medium text-sari-600 hover:underline">
            Contact our support team
          </Link>
        </p>
      </div>
    </main>
  );
}
