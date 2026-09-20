import type { Metadata } from "next";
import { getMarketingMessage as t } from "@/lib/i18n";

/** Provides the localized metadata for the Marketing settings route. */
export const metadata: Metadata = {
  title: t("metadata.settingsTitle"),
};

/**
 * Renders the Marketing settings route layout.
 * @param children Page content rendered inside the layout.
 * @returns The settings route layout.
 */
export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
