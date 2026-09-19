"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@reading-advantage/auth-client";
import {
  MARKETING_MASKED_SECRET,
  prepareMarketingSettingsUpdate,
  preservesExistingMarketingSecret,
} from "@/lib/settings-update";
import { getMarketingMessage as t } from "@/lib/i18n";
import { redirectToLogin } from "@/lib/login-redirect";

const OPENROUTER_DEFAULT_MODEL = "nvidia/nemotron-3-ultra-550b-a55b:free";

type TestConnectionStatus = "success" | "error";
type TestConnectionResult = {
  status: TestConnectionStatus;
  message: string;
};

/**
 * Renders the authenticated Marketing settings editor.
 * @returns The settings form and connection status controls.
 */
export default function SettingsPage() {
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const role = user?.role ?? null;
  const [provider, setProvider] = useState("google");
  const [modelName, setModelName] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [apiKeyConfigured, setApiKeyConfigured] = useState(false);
  const [mmxPath, setMmxPath] = useState("");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestConnectionResult | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  /**
   * Load existing settings on mount. Secret keys (llm.apiKey) are returned
   * as a masked placeholder by the API so the page can show "configured"
   * without leaking plaintext. Non-secret keys are returned as-is.
   */
  useEffect(() => {
    if (isAuthLoading) return;
    if (!isAuthenticated) {
      window.location.href = redirectToLogin(
        `${window.location.pathname}${window.location.search}`,
      );
      return;
    }
    if (role !== "ADMIN") {
      setLoading(false);
      return;
    }

    async function loadSettings() {
      try {
        const res = await fetch("/api/settings");
        if (res.status === 401) {
          window.location.href = redirectToLogin(
            `${window.location.pathname}${window.location.search}`,
          );
          return;
        }
        if (res.status === 403) {
          setPageError(t("settings.adminView"));
          return;
        }
        if (!res.ok) {
          setPageError(t("settings.loadFailed"));
          return;
        }
        const data: unknown = await res.json();
        if (!data || typeof data !== "object" || Array.isArray(data)) {
          setPageError(t("settings.invalidResponse"));
          return;
        }
        const settingValues = data as Record<string, unknown>;
        const storedProvider = settingValues["llm.provider"];
        const storedModel = settingValues["llm.model"];
        if (typeof storedProvider === "string") setProvider(storedProvider);
        if (typeof storedModel === "string" && storedModel.trim()) {
          setModelName(storedModel);
        } else if (storedProvider === "openrouter") {
          setModelName(OPENROUTER_DEFAULT_MODEL);
        }
        const storedApiKey = settingValues["llm.apiKey"];
        if (typeof storedApiKey === "string") {
          if (storedApiKey === MARKETING_MASKED_SECRET) {
            setApiKeyConfigured(true);
          } else {
            setApiKey(storedApiKey);
          }
        }
        if (typeof settingValues["tools.mmxPath"] === "string")
          setMmxPath(settingValues["tools.mmxPath"]);
      } catch {
        setPageError(t("settings.loadFailed"));
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, [isAuthenticated, isAuthLoading, role]);

  const requiresExplicitApiKey = preservesExistingMarketingSecret(
    "llm.apiKey",
    apiKey,
  );

  const handleTestConnection = async () => {
    if (requiresExplicitApiKey) {
      setTestResult({
        status: "error",
        message: t("settings.enterNewApiKey"),
      });
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/settings/test-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, modelName, apiKey }),
      });
      if (res.status === 401) {
        window.location.href = redirectToLogin(
          `${window.location.pathname}${window.location.search}`,
        );
        return;
      }
      if (res.status === 403) {
        setTestResult({
          status: "error",
          message: t("settings.testForbidden"),
        });
        return;
      }
      if (!res.ok) {
        setTestResult({
          status: "error",
          message: t("settings.testFailed"),
        });
        return;
      }
      setTestResult({
        status: "success",
        message: t("settings.testSuccessful"),
      });
    } catch {
      setTestResult({
        status: "error",
        message: t("settings.connectionFailed"),
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    setPageError(null);
    setSaveMessage(null);
    setSaving(true);
    try {
      const settingsUpdate = prepareMarketingSettingsUpdate({
        "llm.provider": provider,
        "llm.model": modelName,
        "llm.apiKey": apiKey,
        "tools.mmxPath": mmxPath,
      });
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settingsUpdate),
      });
      if (res.status === 401) {
        window.location.href = redirectToLogin(
          `${window.location.pathname}${window.location.search}`,
        );
        return;
      }
      if (res.status === 403) {
        setPageError(t("settings.adminSave"));
        return;
      }
      if (!res.ok) {
        setPageError(t("settings.saveCheckFailed"));
        return;
      }
      setSaveMessage(t("settings.saved"));
    } catch {
      setPageError(t("settings.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  if (isAuthLoading) {
    return (
      <main style={{ padding: "24px", textAlign: "center" }}>
        <p role="status" aria-live="polite">
          {t("settings.checkingAccess")}
        </p>
      </main>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <main style={{ padding: "24px", textAlign: "center" }}>
        <p role="status" aria-live="polite">
          {t("settings.redirecting")}
        </p>
      </main>
    );
  }

  if (role !== "ADMIN") {
    return (
      <main style={{ padding: "24px", maxWidth: "720px", margin: "0 auto" }}>
        <section
          role="alert"
          aria-labelledby="marketing-settings-access-heading"
          style={{
            backgroundColor: "#fff7ed",
            border: "1px solid #fb923c",
            borderRadius: "8px",
            padding: "24px",
          }}
        >
          <h1 id="marketing-settings-access-heading">
            {t("settings.accessRequired")}
          </h1>
          <p>{t("settings.accessDescription")}</p>
        </section>
      </main>
    );
  }

  if (loading) {
    return (
      <div style={{ padding: "24px", textAlign: "center" }}>
        <p>{t("settings.loading")}</p>
      </div>
    );
  }

  /**
   * When the API returns a masked placeholder for a secret key, the input
   * shows the placeholder and the user must provide a new value to update.
   */
  const isApiKeyMasked = apiKeyConfigured;

  return (
    <div>
      <h1>{t("settings.title")}</h1>
      <p>{t("settings.description")}</p>
      {pageError && (
        <p role="alert" style={{ color: "#b91c1c" }}>
          {pageError}
        </p>
      )}
      {saveMessage && (
        <p aria-live="polite" style={{ color: "#15803d" }}>
          {saveMessage}
        </p>
      )}

      <div
        style={{
          marginTop: "24px",
          padding: "24px",
          backgroundColor: "#fff",
          borderRadius: "8px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          maxWidth: "600px",
        }}
      >
        <h2>{t("settings.configuration")}</h2>

        <div style={{ marginBottom: "16px" }}>
          <label
            htmlFor="marketing-settings-provider"
            style={{ display: "block", marginBottom: "4px", fontWeight: "500" }}
          >
            {t("settings.provider")}
          </label>
          <select
            id="marketing-settings-provider"
            value={provider}
            onChange={(e) => {
              const nextProvider = e.target.value;
              setProvider(nextProvider);
              if (nextProvider === "openrouter") {
                setModelName(OPENROUTER_DEFAULT_MODEL);
              }
            }}
            style={{
              width: "100%",
              padding: "8px",
              borderRadius: "4px",
              border: "1px solid #ccc",
            }}
          >
            <option value="google">{t("settings.google")}</option>
            <option value="openai">{t("settings.openai")}</option>
            <option value="openrouter">{t("settings.openrouter")}</option>
          </select>
        </div>

        <div style={{ marginBottom: "16px" }}>
          <label
            htmlFor="marketing-settings-model"
            style={{ display: "block", marginBottom: "4px", fontWeight: "500" }}
          >
            {t("settings.modelName")}
          </label>
          <input
            id="marketing-settings-model"
            type="text"
            value={modelName}
            onChange={(e) => setModelName(e.target.value)}
            placeholder={t("settings.modelPlaceholder")}
            style={{
              width: "100%",
              padding: "8px",
              borderRadius: "4px",
              border: "1px solid #ccc",
            }}
          />
        </div>

        <div style={{ marginBottom: "16px" }}>
          <label
            htmlFor="marketing-settings-api-key"
            style={{ display: "block", marginBottom: "4px", fontWeight: "500" }}
          >
            {t("settings.apiKey")}{" "}
            {isApiKeyMasked && (
              <span
                style={{
                  fontSize: "12px",
                  color: "#666",
                  fontWeight: "normal",
                }}
              >
                {t("settings.configured")}
              </span>
            )}
          </label>
          <input
            id="marketing-settings-api-key"
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={
              isApiKeyMasked
                ? MARKETING_MASKED_SECRET
                : t("settings.enterApiKey")
            }
            style={{
              width: "100%",
              padding: "8px",
              borderRadius: "4px",
              border: "1px solid #ccc",
            }}
          />
          {requiresExplicitApiKey && (
            <p style={{ margin: "6px 0 0", fontSize: "12px", color: "#666" }}>
              {t("settings.enterNewApiKey")}
            </p>
          )}
        </div>

        <div style={{ marginBottom: "16px" }}>
          <label
            htmlFor="marketing-settings-mmx-path"
            style={{ display: "block", marginBottom: "4px", fontWeight: "500" }}
          >
            {t("settings.mmxPath")}
          </label>
          <input
            id="marketing-settings-mmx-path"
            type="text"
            value={mmxPath}
            onChange={(e) => setMmxPath(e.target.value)}
            placeholder={t("settings.mmxPlaceholder")}
            style={{
              width: "100%",
              padding: "8px",
              borderRadius: "4px",
              border: "1px solid #ccc",
            }}
          />
        </div>

        <div style={{ display: "flex", gap: "12px" }}>
          <button
            onClick={handleTestConnection}
            disabled={testing || requiresExplicitApiKey}
            style={{
              padding: "8px 16px",
              backgroundColor: "#1a1a2e",
              color: "#fff",
              border: "none",
              borderRadius: "4px",
              cursor:
                testing || requiresExplicitApiKey ? "not-allowed" : "pointer",
            }}
          >
            {testing ? t("settings.testing") : t("settings.testConnection")}
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: "8px 16px",
              backgroundColor: "#4CAF50",
              color: "#fff",
              border: "none",
              borderRadius: "4px",
              cursor: saving ? "not-allowed" : "pointer",
            }}
          >
            {saving ? t("settings.saving") : t("settings.save")}
          </button>
        </div>

        {testResult && (
          <div
            role={testResult.status === "error" ? "alert" : "status"}
            aria-live="polite"
            style={{
              marginTop: "16px",
              padding: "12px",
              backgroundColor:
                testResult.status === "error" ? "#ffebee" : "#e8f5e9",
              borderRadius: "4px",
            }}
          >
            {testResult.message}
          </div>
        )}
      </div>
    </div>
  );
}
