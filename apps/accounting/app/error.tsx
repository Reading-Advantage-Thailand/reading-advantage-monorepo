"use client";

import type { JSX } from "react";

type RootErrorProps = {
  readonly error: Error & { digest?: string };
  readonly reset: () => void;
};

/**
 * Renders a recovery view for an accounting workspace error.
 * @param props Error boundary properties.
 * @returns The error recovery view.
 */
export default function RootError({ reset }: RootErrorProps): JSX.Element {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-2xl font-bold text-destructive">Something went wrong</h1>
      <p className="text-muted-foreground">An unexpected error occurred. Please try again.</p>
      <button
        type="button"
        onClick={reset}
        className="rounded-md bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90"
      >
        Try again
      </button>
    </main>
  );
}
