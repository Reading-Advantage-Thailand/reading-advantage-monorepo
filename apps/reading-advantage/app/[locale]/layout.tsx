import { ReactNode } from "react";
import "@/styles/globals.css";
import { siteConfig } from "@/configs/site-config";
import { Metadata } from "next";
import { Inter as FontSans } from "next/font/google";
import { cn } from "@/lib/utils";
import localFont from "next/font/local";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { Toaster } from "@/components/ui/toaster";
import { TailwindIndicator } from "@/components/helpers/tailwind-indicator";
import { Viewport } from "next";
import { NextAuthSessionProvider } from "@/components/providers/nextauth-session-provider";
import { getCurrentUser } from "@/lib/session";
import { LocaleProvider } from "@/components/providers/locale-provider";
// Onborda disabled to prevent crash
// import { Onborda, OnbordaProvider } from "onborda";
// import { steps } from "@/lib/steps";
// import CustomCard from "@/components/tour/CustomCard";
// import AuthRedirectHandler from "@/components/auth-redirect-handler";
import { ThemeWrapper } from "@/components/theme-warpper";

const cabinSketch = localFont({
  src: "../../assets/fonts/CabinSketch-Regular.ttf",
  variable: "--font-cabin-sketch",
  weight: "400",
});

const cabinSketchBold = localFont({
  src: "../../assets/fonts/CabinSketch-Bold.ttf",
  variable: "--font-cabin-sketch-bold",
  weight: "700",
});

const fontSans = FontSans({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: {
    default: siteConfig.name,
    template: "%s | " + siteConfig.name,
  },
  description: siteConfig.description,
  keywords: [
    "reading advantage",
    "reading",
    "advantage",
    "reading advantage app",
    "reading advantage web",
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
    icon: "/favicon.ico",
    shortcut: "/favicon-16x16.png",
    apple: "/apple-touch-icon.png",
  },
  manifest: `${siteConfig.url}/site.webmanifest`,
  // manifest: `http://localhost:3000/site.webmanifest`,
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "white" },
    { media: "(prefers-color-scheme: dark)", color: "black" },
  ],
};

export default async function RootLayout({
  params,
  children,
}: {
  params: Promise<{ locale: string }>;
  children: ReactNode;
}) {
  const { locale } = await params;
  const user = getCurrentUser();
  return (
    <html lang={locale} suppressHydrationWarning={true}>
      <body
        className={cn(
          "min-h-screen bg-background font-sans antialiased",
          cabinSketch.variable,
          fontSans.variable,
          cabinSketchBold.variable,
        )}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <NextAuthSessionProvider session={user}>
            <LocaleProvider locale={locale}>
              <ThemeWrapper>{children}</ThemeWrapper>
            </LocaleProvider>
          </NextAuthSessionProvider>
          <Toaster />
          <TailwindIndicator />
        </ThemeProvider>
      </body>
    </html>
  );
}
