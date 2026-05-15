import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { Providers } from "@/components/providers";
import { Header } from "@/components/header";
import { getBodyFontClass } from "@/lib/i18n-font";
import "./globals.css";

export const metadata: Metadata = {
  title: "CodeCamp Advantage",
  description: "Learn Next.js and the Reading Advantage monorepo patterns with AI",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale}>
      <body className={getBodyFontClass(locale)}>
        <NextIntlClientProvider messages={messages}>
          <Providers>
            <Header />
            <main className="min-h-screen bg-background">
              {children}
            </main>
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
