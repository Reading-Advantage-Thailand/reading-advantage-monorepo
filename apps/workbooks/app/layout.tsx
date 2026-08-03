import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Workbook Publishing",
  description: "Internal curriculum workbook publishing platform.",
};

/**
 * Root layout for the workbook publishing application.
 * @param props Children rendered inside the document body.
 * @returns The application document shell.
 */
export default function RootLayout({
  children,
}: {
  children: ReactNode;
}): ReactNode {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
