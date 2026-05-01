import { UserRole } from './types';

export const ROLE_HIERARCHY: Record<UserRole, number> = {
  STUDENT: 1,
  TEACHER: 2,
  ADMIN: 3,
  SYSTEM: 4,
};

export const ROLE_ROUTES: Record<UserRole, string> = {
  STUDENT: '/student',
  TEACHER: '/teacher',
  ADMIN: '/admin',
  SYSTEM: '/system',
};

export type { UserRole };
