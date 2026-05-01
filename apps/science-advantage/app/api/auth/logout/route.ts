import { NextResponse } from 'next/server';
import {
  getSessionToken,
  deleteSession,
  deleteSessionCookie,
} from '@/lib/auth/session';

export async function POST() {
  let sessionDeletionError: Error | null = null;
  try {
    const token = await getSessionToken();

    if (token) {
      await deleteSession(token);
    }
  } catch (error) {
    console.error('Logout error:', error);
    sessionDeletionError = error as Error;
  }

  await deleteSessionCookie();

  if (sessionDeletionError) {
    return NextResponse.json(
      { error: 'An error occurred during logout' },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
