import type { Metadata } from "next";
import { AuthProvider } from "@reading-advantage/auth-client";
import { MarketingAppShell } from "@/marketing-app-shell";

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
          <MarketingAppShell>{children}</MarketingAppShell>
        </AuthProvider>
      </body>
    </html>
  );
}
