'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { href: '/system', label: 'Dashboard' },
  { href: '/schools', label: 'Schools' },
];

export function SystemNav() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-6">
      {NAV_ITEMS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            'text-sm font-medium transition-colors hover:text-rose-600',
            pathname === item.href
              ? 'text-rose-600'
              : 'text-gray-600'
          )}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
