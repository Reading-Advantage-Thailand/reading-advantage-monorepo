'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { href: '/student', label: 'Dashboard' },
  { href: '/assignments', label: 'Assignments' },
];

export function StudentNav() {
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
