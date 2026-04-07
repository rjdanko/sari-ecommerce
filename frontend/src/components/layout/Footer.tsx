import Link from 'next/link';
import Image from 'next/image';

const shopLinks = [
  { href: '/', label: 'Home' },
  { href: '/products?category=men', label: 'Men' },
  { href: '/products?category=women', label: 'Women' },
  { href: '/products?category=bottoms', label: 'Bottoms' },
  { href: '/products?category=outerwear', label: 'Outerwear' },
];

const serviceLinks = [
  { href: '/contact', label: 'Contact Us' },
  { href: '/shipping', label: 'Shipping Info' },
  { href: '/returns', label: 'Returns' },
  { href: '/faq', label: 'FAQ' },
];

const socialLinks = [
  { href: '#', label: 'Facebook' },
  { href: '#', label: 'Instagram' },
  { href: '#', label: 'Twitter' },
  { href: '#', label: 'TikTok' },
];

export default function Footer() {
  return (
    <footer className="bg-gray-50 border-t border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-16">
          {/* Brand column */}
          <div className="sm:col-span-2 lg:col-span-1">
            <Link href="/" className="inline-block">
              <Image
                src="/Sari_Logo.png"
                alt="SARI"
                width={110}
                height={36}
                className="h-9 w-auto"
              />
            </Link>
            <p className="mt-4 text-sm leading-relaxed text-gray-500 max-w-xs">
              Your one-stop shop for fashion and style.
            </p>
          </div>

          {/* Shop column */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 tracking-wide">
              Shop
            </h3>
            <ul className="mt-4 space-y-3">
              {shopLinks.map(({ href, label }) => (
                <li key={label}>
                  <Link
                    href={href}
                    className="text-sm text-gray-500 hover:text-sari-600 transition-colors duration-200"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Customer Service column */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 tracking-wide">
              Customer Service
            </h3>
            <ul className="mt-4 space-y-3">
              {serviceLinks.map(({ href, label }) => (
                <li key={label}>
                  <Link
                    href={href}
                    className="text-sm text-gray-500 hover:text-sari-600 transition-colors duration-200"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Follow Us column */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 tracking-wide">
              Follow Us
            </h3>
            <ul className="mt-4 space-y-3">
              {socialLinks.map(({ href, label }) => (
                <li key={label}>
                  <a
                    href={href}
                    className="text-sm text-gray-500 hover:text-sari-600 transition-colors duration-200"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Copyright bar */}
      <div className="border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <p className="text-center text-sm text-gray-400">
            &copy; {new Date().getFullYear()} SARI. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
