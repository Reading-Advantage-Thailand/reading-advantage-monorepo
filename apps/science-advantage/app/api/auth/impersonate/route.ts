import { NextRequest, NextResponse } from 'next/server';
import { env } from '@/lib/env';
import { createSession, setSessionCookie } from '@/lib/auth/session';
import prisma from '@/lib/prisma';
import type { UserRole } from '@prisma/client';

const DEMO_USERS: Array<{ id: string; role: UserRole }> = [
  { id: 'student-1', role: 'STUDENT' },
  { id: 'teacher-1', role: 'TEACHER' },
  { id: 'admin-1', role: 'ADMIN' },
  { id: 'system-1', role: 'SYSTEM' },
];

export async function POST(request: NextRequest) {
  if (env.NODE_ENV === 'production' && !env.DEV_AUTH_ENABLED) {
    return NextResponse.json(
      { error: 'Impersonation is only available in development mode' },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const demoUser = DEMO_USERS.find((u) => u.id === userId);
    if (!demoUser) {
      return NextResponse.json(
        { error: 'Invalid demo user ID' },
        { status: 400 }
      );
    }

    let user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      const email = `demo_${userId}@dev.local`;
      user = await prisma.user.create({
        data: {
          id: userId,
          name:
            demoUser.role.charAt(0) +
            demoUser.role.slice(1).toLowerCase() +
            ' Demo',
          username: userId,
          displayUsername: userId,
          email,
          role: demoUser.role,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
    }

    const session = await createSession(user.id);
    await setSessionCookie(session.token!);

    return NextResponse.json({
      success: true,
      user: session.user,
    });
  } catch (error) {
    console.error('Impersonation error:', error);
    return NextResponse.json(
      { error: 'An error occurred during impersonation' },
      { status: 500 }
    );
  }
}
