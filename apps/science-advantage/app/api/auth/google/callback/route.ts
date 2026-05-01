import { NextRequest, NextResponse } from 'next/server';
import { env } from '@/lib/env';
import { createSession, setSessionCookie } from '@/lib/auth/session';
import { ROLE_ROUTES } from '@/lib/auth/constants';
import prisma from '@/lib/prisma';

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v3/userinfo';

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

    let user = await prisma.user.findUnique({
      where: { email: userInfo.email },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          id: `google-${userInfo.sub}`,
          email: userInfo.email,
          name: userInfo.name,
          username: userInfo.email.split('@')[0],
          displayUsername: userInfo.email.split('@')[0],
          role: 'STUDENT',
          image: userInfo.picture,
          createdAt: new Date(),
          updatedAt: new Date(),
          account: {
            create: {
              id: `google-account-${userInfo.sub}`,
              accountId: userInfo.sub,
              providerId: 'google',
              accessToken: tokens.access_token,
              refreshToken: tokens.refresh_token,
              idToken: tokens.id_token,
              accessTokenExpiresAt: new Date(
                Date.now() + tokens.expires_in * 1000
              ),
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          },
        },
      });
    } else {
      const existingAccount = await prisma.account.findFirst({
        where: {
          userId: user.id,
          providerId: 'google',
        },
      });

      if (existingAccount) {
        await prisma.account.update({
          where: { id: existingAccount.id },
          data: {
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token,
            idToken: tokens.id_token,
            accessTokenExpiresAt: new Date(
              Date.now() + tokens.expires_in * 1000
            ),
          },
        });
      } else {
        await prisma.account.create({
          data: {
            id: `google-account-${userInfo.sub}`,
            accountId: userInfo.sub,
            userId: user.id,
            providerId: 'google',
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token,
            idToken: tokens.id_token,
            accessTokenExpiresAt: new Date(
              Date.now() + tokens.expires_in * 1000
            ),
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        });
      }
    }

    const session = await createSession(user.id);
    await setSessionCookie(session.token!);

    const redirectTo = ROLE_ROUTES[user.role] || '/student';
    return NextResponse.redirect(new URL(redirectTo, request.url));
  } catch (error) {
    console.error('Google OAuth callback error:', error);
    return NextResponse.redirect(
      new URL('/signin?error=oauth_failed', request.url)
    );
  }
}
