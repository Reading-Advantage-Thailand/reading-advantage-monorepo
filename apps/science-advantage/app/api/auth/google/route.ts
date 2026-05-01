import { NextResponse } from 'next/server';
import { env } from '@/lib/env';
import { randomBytes } from 'crypto';

const GOOGLE_OAUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const SCOPE = 'openid email profile';

function generateState(): string {
  return randomBytes(16).toString('hex');
}

export async function GET() {
  if (!env.GOOGLE_OAUTH_ENABLED) {
    return NextResponse.json(
      { error: 'Google OAuth is not configured' },
      { status: 503 }
    );
  }

  const state = generateState();
  const redirectUri =
    env.GOOGLE_OAUTH_REDIRECT_URI ||
    (process.env.NODE_ENV === 'production'
      ? 'https://science-advantage.com/api/auth/google/callback'
      : 'http://localhost:3000/api/auth/google/callback');

  const params = new URLSearchParams({
    client_id: env.GOOGLE_OAUTH_CLIENT_ID!,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: SCOPE,
    state,
    access_type: 'offline',
    prompt: 'select_account',
  });

  const authUrl = `${GOOGLE_OAUTH_URL}?${params.toString()}`;

  return NextResponse.redirect(authUrl);
}
