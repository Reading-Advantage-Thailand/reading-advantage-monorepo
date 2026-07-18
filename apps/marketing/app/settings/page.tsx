"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@reading-advantage/auth-client";
import {
  MARKETING_MASKED_SECRET,
  prepareMarketingSettingsUpdate,
  preservesExistingMarketingSecret,
} from "@/lib/settings-update";

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
  const [mmxPath, setMmxPath] = useState("");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
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
      window.location.href = "/login";
      return;
    }
    if (role !== "ADMIN") return;

    async function loadSettings() {
      try {
        const res = await fetch("/api/settings");
        if (res.status === 401) {
          window.location.href = "/login";
          return;
        }
        if (res.status === 403) {
          setPageError("Administrator access is required to view Marketing settings.");
          return;
        }
        if (!res.ok) {
          setPageError("Failed to load Marketing settings. Please try again.");
          return;
        }
        const data: unknown = await res.json();
        if (!data || typeof data !== "object" || Array.isArray(data)) {
          setPageError("Settings returned an invalid response.");
          return;
        }
        const settingValues = data as Record<string, unknown>;
        if (typeof settingValues["llm.provider"] === "string") setProvider(settingValues["llm.provider"]);
        if (typeof settingValues["llm.model"] === "string") setModelName(settingValues["llm.model"]);
        if (typeof settingValues["llm.apiKey"] === "string") setApiKey(settingValues["llm.apiKey"]);
        if (typeof settingValues["tools.mmxPath"] === "string") setMmxPath(settingValues["tools.mmxPath"]);
      } catch {
        setPageError("Failed to load Marketing settings. Please try again.");
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
      setTestResult("Enter a new API key to test the connection.");
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
        window.location.href = "/login";
        return;
      }
      if (res.status === 403) {
        setTestResult("Error: administrator access is required to test connections.");
        return;
      }
      if (!res.ok) {
        setTestResult("Error: connection test failed. Check the provider settings and try again.");
        return;
      }
      setTestResult("Connection successful!");
    } catch {
      setTestResult("Connection failed");
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    setPageError(null);
    setSaveMessage(null);
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
        window.location.href = "/login";
        return;
      }
      if (res.status === 403) {
        setPageError("Administrator access is required to save Marketing settings.");
        return;
      }
      if (!res.ok) {
        setPageError("Failed to save Marketing settings. Check the values and try again.");
        return;
      }
      setSaveMessage("Settings saved.");
    } catch {
      setPageError("Failed to save Marketing settings. Please try again.");
    }
  };

  if (isAuthLoading) {
    return (
      <main style={{ padding: "24px", textAlign: "center" }}>
        <p role="status" aria-live="polite">Checking administrator access...</p>
      </main>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <main style={{ padding: "24px", textAlign: "center" }}>
        <p role="status" aria-live="polite">Redirecting to sign in...</p>
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
          <h1 id="marketing-settings-access-heading">Settings access required</h1>
          <p>
            Administrator access is required to view or change Marketing
            settings.
          </p>
        </section>
      </main>
    );
  }

  if (loading) {
    return (
      <div style={{ padding: "24px", textAlign: "center" }}>
        <p>Loading settings...</p>
      </div>
    );
  }

  /**
   * When the API returns a masked placeholder for a secret key, the input
   * shows the placeholder and the user must provide a new value to update.
   */
  const isApiKeyMasked = apiKey === MARKETING_MASKED_SECRET;

  return (
    <div>
      <h1>Settings</h1>
      <p>Configure LLM provider, API keys, and tool paths.</p>
      {pageError && (
        <p role="alert" style={{ color: "#b91c1c" }}>{pageError}</p>
      )}
      {saveMessage && (
        <p aria-live="polite" style={{ color: "#15803d" }}>{saveMessage}</p>
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
        <h2>LLM Configuration</h2>

        <div style={{ marginBottom: "16px" }}>
          <label style={{ display: "block", marginBottom: "4px", fontWeight: "500" }}>
            Provider
          </label>
          <select
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
            style={{
              width: "100%",
              padding: "8px",
              borderRadius: "4px",
              border: "1px solid #ccc",
            }}
          >
            <option value="google">Google</option>
            <option value="openai">OpenAI</option>
          </select>
        </div>

        <div style={{ marginBottom: "16px" }}>
          <label style={{ display: "block", marginBottom: "4px", fontWeight: "500" }}>
            Model Name
          </label>
          <input
            type="text"
            value={modelName}
            onChange={(e) => setModelName(e.target.value)}
            placeholder="e.g., gemini-pro, gpt-4"
            style={{
              width: "100%",
              padding: "8px",
              borderRadius: "4px",
              border: "1px solid #ccc",
            }}
          />
        </div>

        <div style={{ marginBottom: "16px" }}>
          <label style={{ display: "block", marginBottom: "4px", fontWeight: "500" }}>
            API Key {isApiKeyMasked && (
              <span style={{ fontSize: "12px", color: "#666", fontWeight: "normal" }}>
                (configured \u2014 enter a new value to change)
              </span>
            )}
          </label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={
              isApiKeyMasked ? MARKETING_MASKED_SECRET : "Enter API key"
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
              Enter a new API key to test the connection.
            </p>
          )}
        </div>

        <div style={{ marginBottom: "16px" }}>
          <label style={{ display: "block", marginBottom: "4px", fontWeight: "500" }}>
            mmx CLI Path
          </label>
          <input
            type="text"
            value={mmxPath}
            onChange={(e) => setMmxPath(e.target.value)}
            placeholder="e.g., /usr/local/bin/mmx"
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
            {testing ? "Testing..." : "Test Connection"}
          </button>
          <button
            onClick={handleSave}
            style={{
              padding: "8px 16px",
              backgroundColor: "#4CAF50",
              color: "#fff",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            Save Settings
          </button>
        </div>

        {testResult && (
          <div
            role={testResult.startsWith("Error") ? "alert" : "status"}
            aria-live="polite"
            style={{
              marginTop: "16px",
              padding: "12px",
              backgroundColor: testResult.includes("Error") ? "#ffebee" : "#e8f5e9",
              borderRadius: "4px",
            }}
          >
            {testResult}
          </div>
        )}
      </div>
    </div>
  );
}
