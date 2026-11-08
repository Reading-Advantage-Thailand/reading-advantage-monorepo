import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { Sarabun } from "next/font/google";
import localFont from "next/font/local";
import { hasLocale } from "next-intl";
import { routing } from "@/i18n/routing";
import "../globals.css";
import "../look.css";

/**
 * The Thai-first app face (spec section 6). next/font self-hosts every font at build time, so
 * the browser makes no request to a font provider. `--font-sarabun` in `globals.css` reads the
 * variable.
 */
const sarabun = Sarabun({
  subsets: ["thai", "latin"],
  weight: ["400", "600"],
  variable: "--font-sarabun",
  display: "swap",
});

/**
 * The display faces of the look (option 1, Phase 2; the same OFL files that Primary uses):
 * Fredoka draws the Latin display text and Mitr the Thai display text. Sarabun stays the
 * reading face of the sentence, the read-along text, and the lyric lines.
 */
const fredoka = localFont({
  src: "../look/fonts/fredoka-latin.woff2",
  variable: "--font-display-latin",
  display: "swap",
});
const mitr = localFont({
  src: "../look/fonts/mitr-500-thai.woff2",
  variable: "--font-display-thai",
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
    <html
      lang={locale}
      className={`${sarabun.variable} ${fredoka.variable} ${mitr.variable}`}
    >
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
