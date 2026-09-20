"use client";

import type { JSX } from "react";

/**
 * Renders the Marketing route error recovery view.
 * @param reset Retries rendering the failed route.
 * @returns The route error recovery view.
 */
export default function RootError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}): JSX.Element {
  return (
    <main
      style={{
        display: "flex",
        minHeight: "100vh",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "16px",
        padding: "32px",
        textAlign: "center",
      }}
    >
      <h1>Something went wrong</h1>
      <p>An unexpected error occurred. Please try again.</p>
      <button type="button" onClick={reset}>
        Try again
      </button>
    </main>
  );
}
