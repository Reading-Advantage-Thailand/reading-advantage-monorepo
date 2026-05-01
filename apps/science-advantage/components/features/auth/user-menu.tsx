'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Settings, GraduationCap, BookOpen, Shield, Server, LogOut } from 'lucide-react';

interface UserMenuProps {
  user: {
    name: string;
    role: string;
    image?: string | null;
  };
}

// Role hierarchy - higher roles can access lower role routes
const ROLE_HIERARCHY = {
  STUDENT: 1,
  TEACHER: 2,
  ADMIN: 3,
  SYSTEM: 4,
};

type UserRole = keyof typeof ROLE_HIERARCHY;

export function UserMenu({ user }: UserMenuProps) {
  const router = useRouter();
  const userRole = user.role as UserRole;
  const userLevel = ROLE_HIERARCHY[userRole];

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
    router.refresh();
  };

  const initials = user.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  // Define navigation items with their required role level
  const navItems = [
    {
      label: 'Learner Home',
      href: '/student',
      icon: GraduationCap,
      requiredLevel: ROLE_HIERARCHY.STUDENT,
    },
    {
      label: 'Teacher Dashboard',
      href: '/teacher',
      icon: BookOpen,
      requiredLevel: ROLE_HIERARCHY.TEACHER,
    },
    {
      label: 'Admin Dashboard',
      href: '/admin',
      icon: Shield,
      requiredLevel: ROLE_HIERARCHY.ADMIN,
    },
    {
      label: 'System Dashboard',
      href: '/system',
      icon: Server,
      requiredLevel: ROLE_HIERARCHY.SYSTEM,
    },
  ];

  // Filter items based on user's role level
  const availableItems = navItems.filter((item) => userLevel >= item.requiredLevel);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-3 outline-none">
        <Avatar className="cursor-pointer">
          <AvatarImage src={user.image || undefined} alt={user.name} />
          <AvatarFallback className="bg-rose-600 text-white">{initials}</AvatarFallback>
        </Avatar>
        <div className="hidden md:block text-left">
          <div className="font-semibold text-gray-900">{user.name}</div>
          <div className="text-sm text-gray-500">{user.role}</div>
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Navigation</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {availableItems.map((item) => {
          const Icon = item.icon;
          return (
            <DropdownMenuItem key={item.href} asChild>
              <Link href={item.href} className="cursor-pointer">
                <Icon className="mr-2 h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            </DropdownMenuItem>
          );
        })}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/settings" className="cursor-pointer">
            <Settings className="mr-2 h-4 w-4" />
            <span>Settings</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-600">
          <LogOut className="mr-2 h-4 w-4" />
          <span>Logout</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
