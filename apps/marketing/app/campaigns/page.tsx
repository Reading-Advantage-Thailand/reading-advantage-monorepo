"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { APPS, APP_COLORS } from "@/lib/apps";
import {
  getMarketingAppName,
  getMarketingMessage as t,
  getMarketingStatusLabel,
} from "@/lib/i18n";
import { redirectToLogin } from "@/lib/login-redirect";

interface Campaign {
  id: string;
  type: "video" | "infocard";
  app: string;
  name: string;
  status: string;
  createdAt: string;
}

/**
 * Renders the Marketing campaigns page.
 * @returns The campaigns list and creation interface.
 */
export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newCampaign, setNewCampaign] = useState<{
    type: "video" | "infocard";
    app: string;
    name: string;
  }>({
    type: "video",
    app: "reading-advantage",
    name: "",
  });

  useEffect(() => {
    const controller = new AbortController();
    fetchCampaigns(controller.signal);
    return () => controller.abort();
  }, []);

  const fetchCampaigns = async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/campaigns", signal ? { signal } : undefined);
      if (res.status === 401) {
        window.location.href = redirectToLogin(
          `${window.location.pathname}${window.location.search}`,
        );
        return;
      }
      if (res.status === 403) {
        setError(t("campaigns.access"));
        return;
      }
      if (!res.ok) {
        setError(t("campaigns.loadFailed"));
        return;
      }
      const data: unknown = await res.json();
      if (!Array.isArray(data)) {
        setError(t("campaigns.invalidResponse"));
        return;
      }
      setCampaigns(data as Campaign[]);
    } catch {
      if (signal?.aborted) return;
      setError(t("campaigns.loadFailed"));
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  };

  const handleCreate = async () => {
    setError(null);
    setMessage(null);
    const controller = new AbortController();
    setCreating(true);
    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newCampaign),
        signal: controller.signal,
      });
      if (res.status === 401) {
        window.location.href = redirectToLogin(
          `${window.location.pathname}${window.location.search}`,
        );
        return;
      }
      if (res.status === 403) {
        setError(t("campaigns.createForbidden"));
        return;
      }
      if (!res.ok) {
        setError(t("campaigns.createCheckFailed"));
        return;
      }
      setShowCreate(false);
      setNewCampaign({ type: "video", app: "reading-advantage", name: "" });
      setMessage(t("campaigns.created"));
      await fetchCampaigns(controller.signal);
    } catch {
      if (controller.signal.aborted) return;
      setError(t("campaigns.createFailed"));
    } finally {
      if (!controller.signal.aborted) setCreating(false);
    }
  };

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h1>{t("campaigns.title")}</h1>
        <button
          onClick={() => setShowCreate(true)}
          style={{
            padding: "8px 16px",
            backgroundColor: "#1a1a2e",
            color: "#fff",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          {t("campaigns.createCampaign")}
        </button>
      </div>

      {error && (
        <p role="alert" style={{ color: "#b91c1c", marginTop: "16px" }}>
          {error}
        </p>
      )}
      {message && (
        <p aria-live="polite" style={{ color: "#15803d", marginTop: "16px" }}>
          {message}
        </p>
      )}

      {showCreate && (
        <div
          style={{
            marginTop: "24px",
            padding: "24px",
            backgroundColor: "#fff",
            borderRadius: "8px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          }}
        >
          <h2>{t("campaigns.newCampaign")}</h2>
          <div style={{ marginBottom: "16px" }}>
            <label
              htmlFor="marketing-campaign-type"
              style={{ display: "block", marginBottom: "4px" }}
            >
              {t("campaigns.type")}
            </label>
            <select
              id="marketing-campaign-type"
              value={newCampaign.type}
              onChange={(e) =>
                setNewCampaign({
                  ...newCampaign,
                  type: e.target.value as "video" | "infocard",
                })
              }
              style={{
                width: "100%",
                padding: "8px",
                borderRadius: "4px",
                border: "1px solid #ccc",
              }}
            >
              <option value="video">{t("campaigns.video")}</option>
              <option value="infocard">{t("campaigns.infocard")}</option>
            </select>
          </div>
          <div style={{ marginBottom: "16px" }}>
            <label
              htmlFor="marketing-campaign-app"
              style={{ display: "block", marginBottom: "4px" }}
            >
              {t("campaigns.app")}
            </label>
            <select
              id="marketing-campaign-app"
              value={newCampaign.app}
              onChange={(e) =>
                setNewCampaign({ ...newCampaign, app: e.target.value })
              }
              style={{
                width: "100%",
                padding: "8px",
                borderRadius: "4px",
                border: "1px solid #ccc",
              }}
            >
              {APPS.map((app) => (
                <option key={app} value={app}>
                  {getMarketingAppName(app)}
                </option>
              ))}
            </select>
          </div>
          <div style={{ marginBottom: "16px" }}>
            <label
              htmlFor="marketing-campaign-name"
              style={{ display: "block", marginBottom: "4px" }}
            >
              {t("campaigns.name")}
            </label>
            <input
              id="marketing-campaign-name"
              type="text"
              value={newCampaign.name}
              onChange={(e) =>
                setNewCampaign({ ...newCampaign, name: e.target.value })
              }
              placeholder={t("campaigns.namePlaceholder")}
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
              onClick={handleCreate}
              disabled={creating}
              style={{
                padding: "8px 16px",
                backgroundColor: "#4CAF50",
                color: "#fff",
                border: "none",
                borderRadius: "4px",
                cursor: creating ? "not-allowed" : "pointer",
              }}
            >
              {creating ? t("campaigns.creating") : t("campaigns.create")}
            </button>
            <button
              onClick={() => setShowCreate(false)}
              style={{
                padding: "8px 16px",
                backgroundColor: "#ccc",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              {t("campaigns.cancel")}
            </button>
          </div>
        </div>
      )}

      <div style={{ marginTop: "24px", display: "grid", gap: "16px" }}>
        {loading ? (
          <p role="status">{t("campaigns.loading")}</p>
        ) : !error && campaigns.length === 0 ? (
          <p>{t("campaigns.empty")}</p>
        ) : (
          campaigns.map((campaign) => (
          <Link
            key={campaign.id}
            href={`/campaigns/${campaign.id}`}
            style={{ textDecoration: "none", color: "inherit" }}
          >
            <div
              style={{
                padding: "16px",
                backgroundColor: "#fff",
                borderRadius: "8px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <div
                  style={{ display: "flex", alignItems: "center", gap: "8px" }}
                >
                  <span
                    style={{
                      width: "12px",
                      height: "12px",
                      borderRadius: "50%",
                      backgroundColor:
                        APP_COLORS[campaign.app as keyof typeof APP_COLORS] ||
                        "#ccc",
                      display: "inline-block",
                    }}
                  />
                  <strong>{campaign.name}</strong>
                </div>
                <div style={{ color: "#666", marginTop: "4px" }}>
                  {campaign.type === "video"
                    ? t("campaigns.video")
                    : t("campaigns.infocard")}{" "}
                  • {getMarketingAppName(campaign.app)}
                </div>
              </div>
              <div
                style={{
                  padding: "4px 8px",
                  backgroundColor:
                    campaign.status === "draft"
                      ? "#e0e0e0"
                      : campaign.status === "in-progress"
                        ? "#fff3e0"
                        : campaign.status === "complete"
                          ? "#e8f5e9"
                          : "#f3e5f5",
                  borderRadius: "4px",
                  fontSize: "12px",
                }}
              >
                {getMarketingStatusLabel(campaign.status)}
              </div>
            </div>
          </Link>
          ))
        )}
      </div>
    </div>
  );
}
