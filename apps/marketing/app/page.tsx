"use client";

import { getMarketingMessage as t } from "@/lib/i18n";

/**
 * Renders the Marketing home page.
 * @returns The home page user interface.
 */
export default function HomePage() {
  return (
    <div>
      <h1>{t("home.title")}</h1>
      <p>{t("home.description")}</p>
    </div>
  );
}
