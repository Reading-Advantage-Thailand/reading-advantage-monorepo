"use client";

import { useEffect } from 'react';

import { Button } from '@/components/ui/button';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Class detail page error:', error);
  }, [error]);

  return (
    <div className="flex flex-col items-center gap-4 rounded-lg border border-red-200 bg-red-50 p-8 text-center">
      <div>
        <h2 className="text-xl font-semibold text-red-800">Unable to load class curriculum</h2>
        <p className="mt-2 text-sm text-red-700">
          Something went wrong while loading this class. Please try again or contact support if the
          issue persists.
        </p>
      </div>
      <Button variant="outline" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
