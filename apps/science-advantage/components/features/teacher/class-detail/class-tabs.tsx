'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { cn } from '@/lib/utils';

interface ClassTabsProps {
  classId: string;
}

export function ClassTabs({ classId }: ClassTabsProps) {
  const pathname = usePathname();

  const tabs = [
    {
      name: 'Curriculum',
      href: `/teacher/classes/${classId}`,
    },
    {
      name: 'Roster',
      href: `/teacher/classes/${classId}/roster`,
    },
    {
      name: 'Analytics',
      href: `/teacher/classes/${classId}/analytics`,
    },
  ];

  return (
    <div className="border-b border-gray-200">
      <nav className="-mb-px flex space-x-8" aria-label="Tabs">
        {tabs.map((tab) => {
          const isActive =
            tab.name === 'Curriculum' || tab.name === 'Roster'
              ? pathname === tab.href
              : pathname.startsWith(tab.href);

          return (
            <Link
              key={tab.name}
              href={tab.href}
              className={cn(
                'whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium transition-colors',
                isActive
                  ? 'border-rose-500 text-rose-600'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              )}
              aria-current={isActive ? 'page' : undefined}
            >
              {tab.name}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
