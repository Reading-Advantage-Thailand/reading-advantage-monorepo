import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { env } from '@/lib/env';
import prisma from '@/lib/prisma';
import { verifyPassword } from '@/lib/auth/password';
import { createSession, setSessionCookie } from '@/lib/auth/session';
import { LoginRateLimiter } from '@/lib/auth/rate-limit';

const loginSchema = z.object({
  username: z
    .string()
    .min(1, 'Username is required')
    .max(100, 'Username too long'),
  password: z
    .string()
    .min(1, 'Password is required')
    .max(128, 'Password too long'),
});

const rateLimiter = new LoginRateLimiter({
  maxAttempts: 5,
  windowMs: 15 * 60 * 1000, // 15 minutes
});

export async function POST(request: NextRequest) {
  if (env.NODE_ENV === 'production') {
    return new NextResponse(null, { status: 405 });
  }

  try {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { username, password } = parsed.data;
    const normalizedUsername = username.toLowerCase();

    // Check rate limit before any DB/bcrypt work
    const limitCheck = rateLimiter.checkLimit(normalizedUsername);
    if (!limitCheck.allowed) {
      return NextResponse.json(
        { error: 'Too many failed login attempts. Please try again later.' },
        {
          status: 429,
          headers: { 'Retry-After': String(limitCheck.retryAfterSeconds) },
        }
      );
    }

    // Find user by username
    const user = await prisma.user.findUnique({
      where: { username: normalizedUsername },
      include: {
        account: {
          where: { providerId: 'credential' },
          take: 1,
        },
      },
    });

    if (!user || user.account.length === 0 || !user.account[0].password) {
      rateLimiter.recordFailure(normalizedUsername);
      return NextResponse.json(
        { error: 'Invalid username or password' },
        { status: 401 }
      );
    }

    // Verify password
    const isValidPassword = await verifyPassword(
      password,
      user.account[0].password
    );

    if (!isValidPassword) {
      rateLimiter.recordFailure(normalizedUsername);
      return NextResponse.json(
        { error: 'Invalid username or password' },
        { status: 401 }
      );
    }

    // Successful login - reset rate limit counter
    rateLimiter.recordSuccess(normalizedUsername);

    // Create session
    const session = await createSession(user.id);

    // Set session cookie using the token (not the id)
    await setSessionCookie(session.token!);

    return NextResponse.json({
      success: true,
      user: session.user,
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'An error occurred during login' },
      { status: 500 }
    );
  }
}

export const _testkit = {
  resetRateLimiter() {
    // Recreate the rate limiter to clear state between tests
    Object.assign(
      rateLimiter,
      new LoginRateLimiter({
        maxAttempts: 5,
        windowMs: 15 * 60 * 1000,
      })
    );
  },
};
