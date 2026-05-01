import { ReactNode } from "react";

export function generateStaticParams() {
  return [{ locale: "en" }];
}

export default function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  return children;
}
