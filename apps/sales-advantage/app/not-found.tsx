import type { JSX } from "react";
import Link from "next/link";

/**
 * Renders the Sales not-found view for unmatched routes.
 * @returns The not-found view.
 */
export default function NotFound(): JSX.Element {
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
      <h1>Page not found</h1>
      <p>We could not find the page you requested.</p>
      <Link href="/">Go home</Link>
    </main>
  );
}
