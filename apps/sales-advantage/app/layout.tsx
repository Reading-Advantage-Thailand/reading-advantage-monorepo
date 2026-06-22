import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sales Advantage",
  description: "Sales coaching with AI-powered audio roleplay practice",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}