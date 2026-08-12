import type { Metadata } from "next";
import { AuthProvider } from "@reading-advantage/auth-client";
import { MarketingAppShell } from "@/marketing-app-shell";
import { defaultLocale, getMarketingMessage as t } from "@/lib/i18n";

/** Provides the localized document metadata for the Marketing app. */
export const metadata: Metadata = {
  title: t("metadata.title"),
  description: t("metadata.description"),
};

/**
 * Renders the Marketing root layout and application shell.
 * @param children Page content rendered inside the application shell.
 * @returns The root HTML layout for the Marketing app.
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang={defaultLocale}>
      <body>
        <AuthProvider>
          <MarketingAppShell>{children}</MarketingAppShell>
        </AuthProvider>
      </body>
    </html>
  );
}
