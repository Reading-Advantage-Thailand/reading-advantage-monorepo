import { NextRequest, NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { db } from '@reading-advantage/db';
import { users, accounts, schools } from '@reading-advantage/db/schema';
import { createSession, ROLE_ROUTES, SESSION_COOKIE_NAME } from '@reading-advantage/auth';
import { env } from '@/lib/env';

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v3/userinfo';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 7 * 24 * 60 * 60,
  path: '/',
};

interface GoogleTokenResponse {
  access_token: string;
  id_token: string;
  expires_in: number;
  token_type: string;
  refresh_token?: string;
}

interface GoogleUserInfo {
  sub: string;
  email: string;
  name: string;
  picture?: string;
}

async function getGoogleTokens(code: string): Promise<GoogleTokenResponse> {
  const redirectUri =
    env.GOOGLE_OAUTH_REDIRECT_URI ||
    (process.env.NODE_ENV === 'production'
      ? 'https://science-advantage.com/api/auth/google/callback'
      : 'http://localhost:3000/api/auth/google/callback');

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_OAUTH_CLIENT_ID!,
      client_secret: env.GOOGLE_OAUTH_CLIENT_SECRET!,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to exchange code for tokens');
  }

  return response.json();
}

async function getGoogleUserInfo(accessToken: string): Promise<GoogleUserInfo> {
  const response = await fetch(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error('Failed to get user info');
  }

  return response.json();
}

async function getOrCreateDevSchool() {
  let [devSchool] = await db
    .select({ id: schools.id })
    .from(schools)
    .where(eq(schools.name, 'Science Dev School'))
    .limit(1);

  if (!devSchool) {
    [devSchool] = await db
      .insert(schools)
      .values({ name: 'Science Dev School' })
      .returning({ id: schools.id });
  }

  return devSchool.id;
}

export async function GET(request: NextRequest) {
  if (!env.GOOGLE_OAUTH_ENABLED) {
    return NextResponse.redirect(
      new URL('/signin?error=oauth_not_configured', request.url)
    );
  }

  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error) {
    return NextResponse.redirect(
      new URL(`/signin?error=${error}`, request.url)
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL('/signin?error=missing_code', request.url)
    );
  }

  try {
    const tokens = await getGoogleTokens(code);
    const userInfo = await getGoogleUserInfo(tokens.access_token);

    // Look up existing user by email
    let [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, userInfo.email))
      .limit(1);

    const schoolId = await getOrCreateDevSchool();

    if (!user) {
      const userId = `google-${userInfo.sub}`;
      const username = userInfo.email.split('@')[0];

      [user] = await db.transaction(async (tx) => {
        const [created] = await tx
          .insert(users)
          .values({
            id: userId,
            email: userInfo.email,
            name: userInfo.name,
            username,
            displayUsername: username,
            role: 'STUDENT',
            image: userInfo.picture,
            schoolId,
          })
          .returning();

        await tx.insert(accounts).values({
          id: `google-account-${userInfo.sub}`,
          userId,
          providerId: 'google',
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          accessTokenExpiresAt: new Date(
            Date.now() + tokens.expires_in * 1000
          ),
        });

        return [created];
      });
    } else {
      // Update existing Google account tokens
      const [existingAccount] = await db
        .select()
        .from(accounts)
        .where(
          and(
            eq(accounts.userId, user.id),
            eq(accounts.providerId, 'google')
          )
        )
        .limit(1);

      if (existingAccount) {
        await db
          .update(accounts)
          .set({
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token,
            accessTokenExpiresAt: new Date(
              Date.now() + tokens.expires_in * 1000
            ),
            updatedAt: new Date(),
          })
          .where(eq(accounts.id, existingAccount.id));
      } else {
        await db.insert(accounts).values({
          id: `google-account-${userInfo.sub}`,
          userId: user.id,
          providerId: 'google',
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          accessTokenExpiresAt: new Date(
            Date.now() + tokens.expires_in * 1000
          ),
        });
      }
    }

    const session = await createSession(db, user.id);

    const response = NextResponse.redirect(
      new URL(ROLE_ROUTES[user.role as keyof typeof ROLE_ROUTES] || '/student', request.url)
    );

    response.cookies.set(SESSION_COOKIE_NAME, session.token, COOKIE_OPTIONS);
    return response;
  } catch (error) {
    console.error('Google OAuth callback error:', error);
    return NextResponse.redirect(
      new URL('/signin?error=oauth_failed', request.url)
    );
  }
}
