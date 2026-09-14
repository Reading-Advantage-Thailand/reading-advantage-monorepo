"use client";

import { useEffect } from "react";

/**
 * Root error boundary. Replaces the root layout, so it renders its own
 * document shell and uses no locale providers or app components.
 * @param error The thrown error.
 * @param reset Retries rendering the failed segment.
 * @returns The root error fallback with retry and home actions.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <div
          style={{
            display: "flex",
            minHeight: "100vh",
            alignItems: "center",
            justifyContent: "center",
            padding: "3rem 1rem",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          <div style={{ textAlign: "center" }}>
            <h1>Something went wrong</h1>
            <p>Sorry, an unexpected error occurred. Please try again.</p>
            <div
              style={{
                display: "flex",
                gap: "1rem",
                justifyContent: "center",
                marginTop: "1.5rem",
              }}
            >
              <button type="button" onClick={() => reset()}>
                Try again
              </button>
              <a href="/">Go home</a>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
