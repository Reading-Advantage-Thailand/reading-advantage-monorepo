"use client";

import type { JSX } from "react";

/**
 * Renders the Marketing root error recovery view.
 * @param reset Retries rendering the failed root route.
 * @returns The root error recovery document.
 */
export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}): JSX.Element {
  return (
    <html lang="en">
      <body>
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
          <div style={{ display: "flex", gap: "16px" }}>
            <button type="button" onClick={reset}>
              Try again
            </button>
            <a href="/">Go home</a>
          </div>
        </main>
      </body>
    </html>
  );
}
