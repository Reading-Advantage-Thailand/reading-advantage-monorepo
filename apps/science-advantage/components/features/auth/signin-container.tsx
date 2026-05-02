'use client';

import { useEffect, useState } from 'react';
import { GoogleSigninButton } from './google-signin-button';
import { DevImpersonationPanel } from './dev-impersonation-panel';
import { SigninForm } from './signin-form';
import { Card, CardContent } from '@/components/ui/card';

interface SigninContainerProps {
  isDevAuth: boolean;
}

export function SigninContainer({ isDevAuth }: SigninContainerProps) {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const errorParam = params.get('error');
    if (errorParam) {
      const errorMessages: Record<string, string> = {
        oauth_not_configured: 'Google OAuth is not configured on this server.',
        missing_code: 'Authentication failed: No authorization code received.',
        oauth_failed: 'Authentication failed. Please try again.',
        access_denied: 'Access denied. Please try again.',
      };
      setError(
        errorMessages[errorParam] || `Authentication error: ${errorParam}`
      );
    }
  }, []);

  return (
    <div className="w-full max-w-md space-y-4">
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-4">
            <p className="text-sm text-red-600">{error}</p>
          </CardContent>
        </Card>
      )}

      <SigninForm />

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="px-2 bg-background text-muted-foreground">Or continue with</span>
        </div>
      </div>

      <GoogleSigninButton />

      {isDevAuth && <DevImpersonationPanel />}
    </div>
  );
}
