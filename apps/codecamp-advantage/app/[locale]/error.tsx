"use client";

/**
 * Locale-segment error boundary for CodeCamp Advantage.
 * Catches rendering errors in the /[locale] segment and displays
 * a styled recovery affordance. Logs the error with its digest
 * for server-side observability via Cloud Logging.
 */
export default function LocaleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  console.error(
    JSON.stringify({
      level: "error",
      event: "locale_segment_error",
      message: error.message,
      stack: error.stack,
      digest: error.digest,
    }),
  );

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
      <h2 className="text-2xl font-bold text-destructive">Something went wrong</h2>
      <p className="text-muted-foreground">An unexpected error occurred. Please try again.</p>
      <button
        onClick={reset}
        className="rounded-md bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90"
      >
        Try again
      </button>
    </div>
  );
}
