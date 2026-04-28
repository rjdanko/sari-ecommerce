import Link from 'next/link';
import { Mail, Clock, Instagram, Facebook } from 'lucide-react';

export default function ContactPage() {
  return (
    <main className="bg-white min-h-screen">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Get in Touch</h1>
        <p className="text-gray-500 mb-8">
          We&apos;re here to help. Reach out to the SARI team and we&apos;ll get back to you as soon as possible.
        </p>

        <div className="space-y-4">
          {/* Contact card */}
          <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-6 space-y-4">
            <h2 className="text-base font-semibold text-sari-700">Contact Details</h2>
            <div className="flex items-start gap-3">
              <Mail className="w-5 h-5 text-sari-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-gray-900">support@sari.ph</p>
                <p className="text-sm text-gray-500">For order issues, returns, and general inquiries</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-sari-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-gray-900">Response Time</p>
                <p className="text-sm text-gray-500">Within 24 hours on business days (Monday–Friday, 9AM–6PM PHT)</p>
              </div>
            </div>
          </div>

          {/* Social */}
          <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-6 space-y-4">
            <h2 className="text-base font-semibold text-sari-700">Follow Us</h2>
            <div className="flex gap-4">
              <a
                href="https://instagram.com/sarifashionph"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-gray-600 hover:text-sari-700 transition-colors"
              >
                <Instagram className="w-5 h-5" />
                @sarifashionph
              </a>
              <a
                href="https://facebook.com/sarifashionph"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-gray-600 hover:text-sari-700 transition-colors"
              >
                <Facebook className="w-5 h-5" />
                SARI Fashion PH
              </a>
            </div>
          </div>

          {/* FAQ nudge */}
          <div className="rounded-2xl bg-sari-50 border border-sari-100 p-5">
            <p className="text-sm text-sari-800">
              Have a quick question?{' '}
              <Link href="/faq" className="font-semibold underline hover:text-sari-900">
                Check our FAQ page
              </Link>{' '}
              first — you might find your answer there instantly.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
