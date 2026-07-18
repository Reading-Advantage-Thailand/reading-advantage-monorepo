import type { Metadata } from "next";
import { IBM_Plex_Mono, Newsreader } from "next/font/google";

import "./globals.css";

const display = Newsreader({ subsets: ["latin"], variable: "--font-display" });
const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "Accounts · Reading Advantage",
  description: "Company employee identity and application access control.",
};

/** Provides the accessible Accounts document shell and deliberate typography. */
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${display.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
