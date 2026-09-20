import type { Metadata } from "next";
import { getMarketingMessage as t } from "@/lib/i18n";

/** Provides the localized metadata for the Marketing video production route. */
export const metadata: Metadata = {
  title: t("metadata.videoTitle"),
};

/**
 * Renders the Marketing video production route layout.
 * @param children Page content rendered inside the layout.
 * @returns The video production route layout.
 */
export default function VideoProductionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
