"use client";

import { useState, useEffect } from "react";

/** Placeholder for masked secret values returned by GET /api/settings. */
const MASKED_SECRET = "\u2022\u2022\u2022\u2022";

export default function SettingsPage() {
  const [provider, setProvider] = useState("google");
  const [modelName, setModelName] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [mmxPath, setMmxPath] = useState("");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  /**
   * Load existing settings on mount. Secret keys (llm.apiKey) are returned
   * as a masked placeholder by the API so the page can show "configured"
   * without leaking plaintext. Non-secret keys are returned as-is.
   */
  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch("/api/settings");
        if (res.status === 401) {
          window.location.href = "/login";
          return;
        }
        if (res.ok) {
          const data: Record<string, string> = await res.json();
          if (data["llm.provider"]) setProvider(data["llm.provider"]);
          if (data["llm.model"]) setModelName(data["llm.model"]);
          if (data["llm.apiKey"]) setApiKey(data["llm.apiKey"]);
          if (data["tools.mmxPath"]) setMmxPath(data["tools.mmxPath"]);
        }
      } catch {
        // Settings load is best-effort; form stays at defaults on failure.
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  const handleTestConnection = async () => {
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
      const data = await res.json();
      if (res.ok) {
        setTestResult("Connection successful!");
      } else {
        setTestResult(`Error: ${data.message}`);
      }
    } catch {
      setTestResult("Connection failed");
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          "llm.provider": provider,
          "llm.model": modelName,
          "llm.apiKey": apiKey,
          "tools.mmxPath": mmxPath,
        }),
      });
      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }
      if (res.ok) {
        alert("Settings saved!");
      } else {
        const data = await res.json();
        alert(`Failed to save settings: ${data.message}`);
      }
    } catch {
      alert("Failed to save settings");
    }
  };

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
  const isApiKeyMasked = apiKey === MASKED_SECRET;

  return (
    <div>
      <h1>Settings</h1>
      <p>Configure LLM provider, API keys, and tool paths.</p>

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
            placeholder={isApiKeyMasked ? MASKED_SECRET : "Enter API key"}
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
            disabled={testing}
            style={{
              padding: "8px 16px",
              backgroundColor: "#1a1a2e",
              color: "#fff",
              border: "none",
              borderRadius: "4px",
              cursor: testing ? "not-allowed" : "pointer",
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
