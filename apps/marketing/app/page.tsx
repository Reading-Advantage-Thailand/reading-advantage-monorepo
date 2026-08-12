"use client";

import { useAuth } from "@reading-advantage/auth-client";
import { getMarketingMessage as t } from "@/lib/i18n";

/**
 * Renders the Marketing home page.
 * @returns The home page user interface.
 */
export default function HomePage() {
  const { user } = useAuth();

  return (
    <div>
      <h1>{t("home.title")}</h1>
      <p>{t("home.description")}</p>
      <div style={{ display: "flex", gap: "16px", marginTop: "24px" }}>
        {user?.role === "ADMIN" && (
          <a
            href="/settings"
            style={{
              padding: "16px 24px",
              backgroundColor: "#1a1a2e",
              color: "#fff",
              borderRadius: "8px",
              textDecoration: "none",
            }}
          >
            {t("shell.settings")}
          </a>
        )}
        <a
          href="/campaigns"
          style={{
            padding: "16px 24px",
            backgroundColor: "#1a1a2e",
            color: "#fff",
            borderRadius: "8px",
            textDecoration: "none",
          }}
        >
          {t("shell.campaigns")}
        </a>
      </div>
    </div>
  );
}
