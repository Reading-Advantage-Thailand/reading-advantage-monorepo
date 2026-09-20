import type { Metadata } from "next";
import { getMarketingMessage as t } from "@/lib/i18n";

/** Provides the localized metadata for the Marketing login route. */
export const metadata: Metadata = {
  title: t("metadata.loginTitle"),
};

/**
 * Renders the Marketing login route layout.
 * @param children Page content rendered inside the layout.
 * @returns The login route layout.
 */
export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
