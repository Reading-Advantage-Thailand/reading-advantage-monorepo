/**
 * Reusable Auth Module - Types
 * Copy this entire auth/ folder to any Next.js project
 */

export type UserRole = 'STUDENT' | 'TEACHER' | 'ADMIN' | 'SYSTEM';

export interface User {
  id: string;
  name: string;
  username: string;
  email: string | null;
  role: UserRole;
  image: string | null;
}

export interface Session {
  id: string;
  token?: string;
  userId: string;
  expiresAt: Date;
  user: User;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface AuthResult {
  success: boolean;
  session?: Session;
  error?: string;
}
