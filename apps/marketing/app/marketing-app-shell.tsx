"use client";

import { useAuth } from "@reading-advantage/auth-client";
import Link from "next/link";
import type { ReactNode } from "react";

/** Properties accepted by the Marketing application shell. */
export interface MarketingAppShellProps {
  /** Current route content rendered inside the application shell. */
  children: ReactNode;
}

/**
 * Renders Marketing navigation and the application-level authorization state.
 * @param props The current route content.
 * @returns The accessible Marketing application shell.
 */
export function MarketingAppShell({ children }: MarketingAppShellProps) {
  const { user, isForbidden, isLoading } = useAuth();

  if (isLoading) {
    return (
      <main style={{ padding: "24px" }}>
        <p role="status" aria-live="polite">Checking Marketing access...</p>
      </main>
    );
  }

  if (isForbidden) {
    return (
      <main style={{ padding: "24px", maxWidth: "720px", margin: "0 auto" }}>
        <section
          role="alert"
          aria-labelledby="marketing-access-heading"
          style={{
            backgroundColor: "#fff7ed",
            border: "1px solid #fb923c",
            borderRadius: "8px",
            padding: "24px",
          }}
        >
          <h1 id="marketing-access-heading">Marketing access required</h1>
          <p>
            Your company account is signed in, but it does not currently have a
            Marketing role. Ask an Accounts administrator to grant MEMBER or
            ADMIN access.
          </p>
        </section>
      </main>
    );
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <aside
        style={{
          width: "240px",
          backgroundColor: "#1a1a2e",
          color: "#fff",
          padding: "20px",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
        }}
      >
        <div style={{ fontSize: "18px", fontWeight: "bold", marginBottom: "20px" }}>
          Marketing Platform
        </div>
        <nav aria-label="Marketing" style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {user?.role === "ADMIN" && (
            <Link
              href="/settings"
              style={{
                color: "#fff",
                textDecoration: "none",
                padding: "8px 12px",
                borderRadius: "6px",
                backgroundColor: "rgba(255,255,255,0.1)",
              }}
            >
              Settings
            </Link>
          )}
          <Link
            href="/campaigns"
            style={{
              color: "#fff",
              textDecoration: "none",
              padding: "8px 12px",
              borderRadius: "6px",
              backgroundColor: "rgba(255,255,255,0.1)",
            }}
          >
            Campaigns
          </Link>
        </nav>
      </aside>
      <main style={{ flex: 1, padding: "24px", backgroundColor: "#f5f5f5" }}>
        {children}
      </main>
    </div>
  );
}
