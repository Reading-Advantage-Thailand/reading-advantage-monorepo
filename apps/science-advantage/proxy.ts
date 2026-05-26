import { NextRequest, NextResponse } from 'next/server';
import { AuthError, SESSION_COOKIE_NAME, getSession, requireRole, type Role } from '@reading-advantage/auth';
import { db } from '@reading-advantage/db';

const DEV_AUTH_ENABLED = process.env.DEV_AUTH_ENABLED === 'true';

// Route -> required role. Hierarchy means STUDENT(1) blocked from TEACHER(2)+,
// but TEACHER/ADMIN can transparently view STUDENT pages.
const ROLE_GATES: Array<{ prefix: string; role: Role }> = [
  { prefix: '/admin', role: 'ADMIN' },
  { prefix: '/system', role: 'ADMIN' },
  { prefix: '/teacher', role: 'TEACHER' },
  { prefix: '/student', role: 'STUDENT' },
];

function matchGate(pathname: string): { prefix: string; role: Role } | undefined {
  return ROLE_GATES.find(
    (g) => pathname === g.prefix || pathname.startsWith(`${g.prefix}/`)
  );
}

function redirect(request: NextRequest, target: string, search?: Record<string, string>) {
  const url = new URL(target, request.url);
  if (search) {
    for (const [k, v] of Object.entries(search)) url.searchParams.set(k, v);
  }
  return NextResponse.redirect(url);
}

function clearSessionCookie(response: NextResponse): NextResponse {
  response.cookies.set(SESSION_COOKIE_NAME, '', {
    path: '/',
    maxAge: 0,
    sameSite: 'lax',
  });
  return response;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  // /signin: redirect-when-authed; clear bad cookies; allow unauthenticated.
  if (pathname === '/signin') {
    if (!sessionToken) {
      return NextResponse.next();
    }
    try {
      const session = await getSession(db, sessionToken);
      if (session) {
        return redirect(request, '/dashboard');
      }
      return clearSessionCookie(NextResponse.next());
    } catch (err) {
      console.error('[proxy] /signin session check failed', err);
      return NextResponse.next();
    }
  }

  // /dashboard: any signed-in user.
  if (pathname === '/dashboard') {
    if (!sessionToken) {
      return redirect(request, '/signin');
    }
    try {
      const session = await getSession(db, sessionToken);
      if (!session) {
        return clearSessionCookie(redirect(request, '/signin'));
      }
      return NextResponse.next();
    } catch (err) {
      console.error('[proxy] /dashboard session check failed', err);
      return redirect(request, '/signin', { error: 'session_check_failed' });
    }
  }

  const gate = matchGate(pathname);
  if (!gate) {
    return NextResponse.next();
  }

  // Dev impersonation: allow unauthenticated access when explicitly enabled,
  // so QA can drive the impersonation panel on /signin without prod risk.
  if (DEV_AUTH_ENABLED && !sessionToken) {
    return NextResponse.next();
  }

  if (!sessionToken) {
    return redirect(request, '/signin');
  }

  try {
    await requireRole(db, sessionToken, gate.role);
    return NextResponse.next();
  } catch (err) {
    if (err instanceof AuthError && err.code === 'FORBIDDEN') {
      return redirect(request, '/dashboard', { error: 'forbidden' });
    }
    if (err instanceof AuthError && err.code === 'UNAUTHORIZED') {
      return clearSessionCookie(redirect(request, '/signin'));
    }
    console.error('[proxy] session check failed', err);
    return redirect(request, '/signin', { error: 'session_check_failed' });
  }
}

export const config = {
  matcher: [
    '/student/:path*',
    '/teacher/:path*',
    '/admin/:path*',
    '/system/:path*',
    '/dashboard',
    '/signin',
  ],
};
