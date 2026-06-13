import type { Metadata } from "next";
import Link from "next/link";
import { AuthProvider } from "@reading-advantage/auth-client";

export const metadata: Metadata = {
  title: "Marketing Production Platform",
  description: "Human-in-the-loop marketing production for Reading Advantage",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th">
      <body>
        <AuthProvider>
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
              <nav style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
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
        </AuthProvider>
      </body>
    </html>
  );
}
