"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  getMarketingAppName,
  getMarketingMessage as t,
  getMarketingStatusLabel,
} from "@/lib/i18n";
import { redirectToLogin } from "@/lib/login-redirect";
import { nextCampaignStatuses } from "@/lib/campaign-status";

interface Campaign {
  id: string;
  type: "video" | "infocard";
  app: string;
  name: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Renders the detail view for one Marketing campaign.
 * @returns The campaign detail and status-management interface.
 */
export default function CampaignDetailPage() {
  const params = useParams();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    if (params?.id) {
      void fetchCampaign(params.id as string, controller.signal);
    }
    return () => controller.abort();
  }, [params?.id]);

  const fetchCampaign = async (id: string, signal?: AbortSignal) => {
    setError(null);
    try {
      const res = await fetch(`/api/campaigns/${id}`, signal ? { signal } : undefined);
      if (res.status === 401) {
        window.location.href = redirectToLogin(
          `${window.location.pathname}${window.location.search}`,
        );
        return;
      }
      if (res.status === 403) {
        setError(t("campaigns.detailAccess"));
        return;
      }
      if (!res.ok) {
        setError(t("campaigns.detailLoadFailed"));
        return;
      }
      const data: unknown = await res.json();
      if (
        !data ||
        typeof data !== "object" ||
        typeof (data as { id?: unknown }).id !== "string"
      ) {
        setError(t("campaigns.detailInvalidResponse"));
        return;
      }
      setCampaign(data as Campaign);
    } catch {
      if (signal?.aborted) return;
      setError(t("campaigns.detailLoadFailed"));
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!campaign) return;
    setError(null);
    setMessage(null);
    const controller = new AbortController();
    setUpdatingStatus(true);
    try {
      const res = await fetch(`/api/campaigns/${campaign.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
        signal: controller.signal,
      });
      if (res.status === 401) {
        window.location.href = redirectToLogin(
          `${window.location.pathname}${window.location.search}`,
        );
        return;
      }
      if (res.status === 403) {
        setError(t("campaigns.updateForbidden"));
        return;
      }
      if (!res.ok) {
        setError(t("campaigns.updateFailed"));
        return;
      }
      const data: unknown = await res.json();
      if (
        !data ||
        typeof data !== "object" ||
        typeof (data as { id?: unknown }).id !== "string"
      ) {
        setError(t("campaigns.updateInvalidResponse"));
        return;
      }
      setCampaign(data as Campaign);
      setMessage(
        t("campaigns.moved", { status: getMarketingStatusLabel(newStatus) }),
      );
    } catch {
      if (controller.signal.aborted) return;
      setError(t("campaigns.updateFailed"));
    } finally {
      if (!controller.signal.aborted) setUpdatingStatus(false);
    }
  };

  if (!campaign) {
    return error ? (
      <p role="alert">{error}</p>
    ) : (
      <p role="status">{t("campaigns.loading")}</p>
    );
  }

  const availableTransitions = nextCampaignStatuses(campaign.status);

  return (
    <div>
      <Link
        href="/campaigns"
        style={{ color: "#1a1a2e", textDecoration: "none" }}
      >
        {t("campaigns.back")}
      </Link>

      <div
        style={{
          marginTop: "24px",
          padding: "24px",
          backgroundColor: "#fff",
          borderRadius: "8px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
        }}
      >
        <h1>{campaign.name}</h1>
        {error && (
          <p role="alert" style={{ color: "#b91c1c" }}>
            {error}
          </p>
        )}
        {message && (
          <p aria-live="polite" style={{ color: "#15803d" }}>
            {message}
          </p>
        )}
        <div style={{ color: "#666", marginTop: "8px" }}>
          {t("campaigns.type")}:{" "}
          {campaign.type === "video"
            ? t("campaigns.video")
            : t("campaigns.infocard")}{" "}
          • {t("campaigns.app")}: {getMarketingAppName(campaign.app)}
        </div>
        <div style={{ marginTop: "16px" }}>
          <span
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
            }}
          >
            {getMarketingStatusLabel(campaign.status)}
          </span>
        </div>

        {availableTransitions.length > 0 && (
          <div style={{ marginTop: "24px" }}>
            <h3>{t("campaigns.statusTransitions")}</h3>
            <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
              {availableTransitions.map((status) => (
                <button
                  key={status}
                  onClick={() => handleStatusChange(status)}
                  disabled={updatingStatus}
                  style={{
                    padding: "8px 16px",
                    backgroundColor: "#1a1a2e",
                    color: "#fff",
                    border: "none",
                    borderRadius: "4px",
                    cursor: updatingStatus ? "not-allowed" : "pointer",
                  }}
                >
                  {updatingStatus
                    ? t("campaigns.updating")
                    : t("campaigns.moveTo", {
                        status: getMarketingStatusLabel(status),
                      })}
                </button>
              ))}
            </div>
          </div>
        )}

        {campaign.type === "video" && (
          <div style={{ marginTop: "24px" }}>
            <Link
              href={`/campaigns/${campaign.id}/video`}
              style={{
                display: "inline-block",
                padding: "12px 24px",
                backgroundColor: "#4CAF50",
                color: "#fff",
                borderRadius: "8px",
                textDecoration: "none",
              }}
            >
              {t("campaigns.startVideo")}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
