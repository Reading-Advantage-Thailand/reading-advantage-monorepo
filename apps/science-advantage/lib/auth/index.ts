/**
 * Reusable Auth Module - Main Exports
 * Copy this entire auth/ folder to any Next.js project
 *
 * Usage:
 * - Server-side: import { requireAuth, requireRole } from '@/lib/auth/server'
 * - Password: import { hashPassword, verifyPassword } from '@/lib/auth/password'
 * - Session: import { createSession, validateSession } from '@/lib/auth/session'
 */

export * from './types';
export * from './password';
export * from './session';
export * from './server';
