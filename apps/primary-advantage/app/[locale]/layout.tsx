import type { Metadata, Viewport } from "next";
import "@/styles/globals.css";
import { NextIntlClientProvider, hasLocale, Locale } from "next-intl";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { SCHOOL_TIME_ZONE } from "@reading-advantage/domain/calendar-day";
import { siteConfig } from "@/configs/site-config";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { Cabin_Sketch, Inter, Noto_Sans_Thai, Quicksand } from "next/font/google";
import localFont from "next/font/local";
import { Toaster } from "@/components/ui/sonner";
import AuthProvider from "@/components/providers/session-provider";
import { LayoutProvider } from "@/hooks/use-layout";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import QueryProvider from "@/components/providers/query-provider";

// Thai-first stack (see --font-sans in styles/globals.css): Noto Sans Thai first, then Inter
// (owner decision 2026-10-05). The Thai face loads only the Thai subset and has no metric
// fallback, so Latin text falls through to Inter.
const fontThai = Noto_Sans_Thai({
  subsets: ["thai"],
  variable: "--font-noto-thai",
  adjustFontFallback: false,
});
const fontLatin = Inter({
  subsets: ["latin", "latin-ext", "vietnamese"],
  variable: "--font-inter",
});
const fontArticle = Quicksand({
  subsets: ["latin", "vietnamese"],
  variable: "--font-quicksand",
  preload: false,
});
const fontLogo = Cabin_Sketch({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-cabin-sketch",
  preload: false,
});
// The Chibi Quest skin fonts (the Forge showcase fonts, OFL): Fredoka for Latin, Mitr for Thai.
const fontFredoka = localFont({
  src: "../../public/rpg/fonts/fredoka-latin.woff2",
  variable: "--font-fredoka",
  display: "swap",
});
const fontMitr = localFont({
  src: "../../public/rpg/fonts/mitr-500-thai.woff2",
  variable: "--font-mitr",
  display: "swap",
});
const fontVariables = [fontThai, fontLatin, fontArticle, fontLogo, fontFredoka, fontMitr]
  .map((font) => font.variable)
  .join(" ");

export const metadata: Metadata = {
  title: {
    default: siteConfig.name,
    template: "%s | " + siteConfig.name,
  },
  description: siteConfig.description,
  keywords: [
    "primary advantage",
    "primary",
    "advantage",
    "primary advantage app",
    "primary advantage web",
  ],
  // openGraph: {
  //   type: "website",
  //   locale: "en_US",
  //   url: siteConfig.url,
  //   title: siteConfig.name,
  //   description: siteConfig.description,
  //   siteName: siteConfig.name,
  // },
  icons: {
    icon: "/primary-advantage.png",
  },
  // manifest: `${siteConfig.url}/site.webmanifest`,
  // manifest: `http://localhost:3000/site.webmanifest`,
};

/** Lets the page draw under the notch and home bar, so the safe-area insets get values. */
export const viewport: Viewport = {
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{
    locale: Locale;
  }>;
}>) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  return (
    <AuthProvider>
      <html
        lang={locale}
        suppressHydrationWarning
        className={`${fontVariables} overscroll-none`}
      >
        <body className="bg-background min-h-screen font-sans antialiased [--header-height:calc(var(--spacing)*14)]">
          <NextIntlClientProvider timeZone={SCHOOL_TIME_ZONE}>
            <ThemeProvider
              attribute="class"
              defaultTheme="system"
              enableSystem
              disableTransitionOnChange
              enableColorScheme
            >
              <QueryProvider>
                <NuqsAdapter>{children}</NuqsAdapter>
                <Toaster />
              </QueryProvider>
            </ThemeProvider>
          </NextIntlClientProvider>
        </body>
      </html>
    </AuthProvider>
  );
}
