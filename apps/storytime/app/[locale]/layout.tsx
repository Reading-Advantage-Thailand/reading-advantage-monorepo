import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { Sarabun } from "next/font/google";
import { hasLocale } from "next-intl";
import { routing } from "@/i18n/routing";
import "../globals.css";

/**
 * The Thai-first app face (spec section 6). next/font self-hosts the font at build time, so the
 * browser makes no request to a font provider. `--font-sans` in `globals.css` reads the variable.
 */
const sarabun = Sarabun({
  subsets: ["thai", "latin"],
  weight: ["400", "600"],
  variable: "--font-sarabun",
  display: "swap",
});

/**
 * The root layout of the locale routes: it sets the document language and answers 404 for a
 * locale outside the routing config.
 * @param props.children The route content.
 * @param props.params The locale segment of the route.
 * @returns The document shell.
 */
export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  return (
    <html lang={locale} className={sarabun.variable}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
