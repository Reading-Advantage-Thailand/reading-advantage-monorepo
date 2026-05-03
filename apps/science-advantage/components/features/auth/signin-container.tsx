'use client';

import { useEffect, useState } from 'react';
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

      {isDevAuth && <DevImpersonationPanel />}
    </div>
  );
}
