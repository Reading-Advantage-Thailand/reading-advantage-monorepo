import type { Metadata } from "next";
import { getMarketingMessage as t } from "@/lib/i18n";

/** Provides the localized metadata for the Marketing campaign detail route. */
export const metadata: Metadata = {
  title: t("metadata.campaignDetailTitle"),
};

/**
 * Renders the Marketing campaign detail route layout.
 * @param children Page content rendered inside the layout.
 * @returns The campaign detail route layout.
 */
export default function CampaignDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
