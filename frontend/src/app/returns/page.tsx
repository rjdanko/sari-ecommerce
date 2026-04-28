import { CheckCircle, XCircle, RotateCcw, CreditCard } from 'lucide-react';

export default function ReturnsPage() {
  return (
    <main className="bg-white min-h-screen">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Returns &amp; Refunds</h1>
        <p className="text-gray-500 mb-8">
          Not satisfied with your order? We make returns easy. Here&apos;s our policy.
        </p>

        <div className="space-y-4">
          {/* Return window */}
          <div className="rounded-2xl bg-sari-50 border border-sari-100 p-6">
            <p className="text-sari-800 font-semibold text-lg">7-Day Return Window</p>
            <p className="text-sari-700 text-sm mt-1">
              You have 7 days from the date of delivery to request a return.
            </p>
          </div>

          {/* Eligible items */}
          <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-6 space-y-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-500" />
              <h2 className="text-base font-semibold text-gray-900">Eligible for Return</h2>
            </div>
            <ul className="space-y-2 text-sm text-gray-600">
              {[
                'Unworn and unwashed items',
                'Items with original tags still attached',
                'Items in original packaging',
                'Items received damaged or defective',
              ].map(item => (
                <li key={item} className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Ineligible items */}
          <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-6 space-y-3">
            <div className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-400" />
              <h2 className="text-base font-semibold text-gray-900">Not Eligible for Return</h2>
            </div>
            <ul className="space-y-2 text-sm text-gray-600">
              {[
                'Sale and clearance items',
                'Intimate apparel and undergarments',
                'Items marked as final sale',
                'Items that have been worn, washed, or altered',
              ].map(item => (
                <li key={item} className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-300 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Return process */}
          <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-6 space-y-4">
            <div className="flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-sari-500" />
              <h2 className="text-base font-semibold text-sari-700">How to Return</h2>
            </div>
            <ol className="space-y-4">
              {[
                { step: '1', title: 'Email us', desc: 'Send your order number and reason for return to support@sari.ph within 7 days of delivery.' },
                { step: '2', title: 'Wait for approval', desc: 'Our team will review your request and respond within 1–2 business days.' },
                { step: '3', title: 'Ship the item back', desc: 'Pack the item securely and ship it using the return label we provide.' },
                { step: '4', title: 'Receive your refund', desc: 'Once we receive and inspect the item, your refund will be processed within 5–10 banking days.' },
              ].map(({ step, title, desc }) => (
                <li key={step} className="flex gap-4">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sari-100 text-sm font-bold text-sari-700">
                    {step}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{title}</p>
                    <p className="text-sm text-gray-500 mt-0.5">{desc}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          {/* Refund method */}
          <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-6 space-y-3">
            <div className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-sari-500" />
              <h2 className="text-base font-semibold text-sari-700">Refund Method</h2>
            </div>
            <p className="text-sm text-gray-600">
              Refunds are returned to your original payment method — GCash, credit/debit card, or PayMaya. Allow 5–10 banking days for the amount to reflect in your account.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
