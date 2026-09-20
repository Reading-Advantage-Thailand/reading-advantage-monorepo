import type { Metadata } from "next";
import { getMarketingMessage as t } from "@/lib/i18n";

/** Provides the localized metadata for the Marketing campaigns route. */
export const metadata: Metadata = {
  title: t("metadata.campaignsTitle"),
};

/**
 * Renders the Marketing campaigns route layout.
 * @param children Page content rendered inside the layout.
 * @returns The campaigns route layout.
 */
export default function CampaignsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
