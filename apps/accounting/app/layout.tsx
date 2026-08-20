import type { Metadata } from "next";
import { AuthProvider } from "@reading-advantage/auth-client";
import "./globals.css";

export const metadata: Metadata = {
  title: "Accounting",
  description: "Reading Advantage accounting workspace",
};

/**
 * Renders the Accounting root layout with the shared session provider.
 * @param children Page content rendered inside the auth provider tree.
 * @returns The root HTML layout for the Accounting app.
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
