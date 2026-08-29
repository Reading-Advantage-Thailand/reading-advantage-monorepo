"use client";

import { getMarketingMessage as t } from "@/lib/i18n";
import { useSearchParams } from "next/navigation";

/**
 * Renders the single company-account handoff for Marketing.
 * @returns The company-account handoff interface.
 */
export default function LoginPage() {
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("returnTo") ?? "/";
  const error = searchParams.get("error");
  const startHref = `/api/auth/company/start?${new URLSearchParams({ returnTo }).toString()}`;
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "80vh",
      }}
    >
      <section
        style={{
          width: "100%",
          maxWidth: "400px",
          padding: "32px",
          backgroundColor: "#fff",
          borderRadius: "8px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
        }}
      >
        <p
          style={{ marginBottom: "8px", color: "#6b7280", textAlign: "center" }}
        >
          {t("login.companyAccess")}
        </p>
        <h1 style={{ marginBottom: "12px", textAlign: "center" }}>
          {t("login.title")}
        </h1>
        <p style={{ marginBottom: "24px", textAlign: "center" }}>
          {t("login.description")}
        </p>
        {error === "sso" ? (
          <p role="alert" style={{ marginBottom: "16px", color: "#b91c1c" }}>
            {t("login.errorSso")}
          </p>
        ) : null}
        <a
          href={startHref}
          style={{
            width: "100%",
            padding: "12px",
            backgroundColor: "#1a1a2e",
            color: "#fff",
            border: "none",
            borderRadius: "6px",
            fontSize: "16px",
            fontWeight: 600,
            display: "block",
            textAlign: "center",
            textDecoration: "none",
          }}
        >
          {t("login.continue")}
        </a>
      </section>
    </div>
  );
}
