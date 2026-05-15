import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "CodeCamp Advantage",
  description:
    "Learn Next.js and the Reading Advantage monorepo patterns with AI",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
