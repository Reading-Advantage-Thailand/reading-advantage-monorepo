'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  {
    href: '/teacher',
    label: 'Dashboard',
    isActive: (pathname: string) => pathname === '/teacher',
  },
  {
    href: '/teacher/classes',
    label: 'Classes',
    isActive: (pathname: string) =>
      pathname === '/teacher/classes' || pathname.startsWith('/teacher/classes/'),
  },
] satisfies Array<{ href: string; label: string; isActive: (pathname: string) => boolean }>;

export function TeacherNav() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-6">
      {NAV_ITEMS.map(item => {
        const active = item.isActive(pathname);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'text-sm font-medium transition-colors hover:text-rose-600',
              active ? 'text-rose-600' : 'text-gray-600'
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
