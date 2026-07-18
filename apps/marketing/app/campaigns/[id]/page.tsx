"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface Campaign {
  id: string;
  type: "video" | "infocard";
  app: string;
  name: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

const statusTransitions: Record<string, string[]> = {
  draft: ["in-progress"],
  "in-progress": ["complete"],
  complete: ["archived"],
  archived: [],
};

export default function CampaignDetailPage() {
  const params = useParams();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (params?.id) {
      fetchCampaign(params.id as string);
    }
  }, [params?.id]);

  const fetchCampaign = async (id: string) => {
    setError(null);
    try {
      const res = await fetch(`/api/campaigns/${id}`);
      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }
      if (res.status === 403) {
        setError("You do not have access to this campaign.");
        return;
      }
      if (!res.ok) {
        setError("Failed to load campaign. Please return to Campaigns and try again.");
        return;
      }
      const data: unknown = await res.json();
      if (!data || typeof data !== "object" || typeof (data as { id?: unknown }).id !== "string") {
        setError("Campaign returned an invalid response.");
        return;
      }
      setCampaign(data as Campaign);
    } catch {
      setError("Failed to load campaign. Please return to Campaigns and try again.");
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!campaign) return;
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/campaigns/${campaign.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }
      if (res.status === 403) {
        setError("You do not have permission to update this campaign.");
        return;
      }
      if (!res.ok) {
        setError("Failed to update campaign status. Please try again.");
        return;
      }
      const data: unknown = await res.json();
      if (!data || typeof data !== "object" || typeof (data as { id?: unknown }).id !== "string") {
        setError("Campaign update returned an invalid response.");
        return;
      }
      setCampaign(data as Campaign);
      setMessage(`Campaign moved to ${newStatus}.`);
    } catch {
      setError("Failed to update campaign status. Please try again.");
    }
  };

  if (!campaign) {
    return error ? <p role="alert">{error}</p> : <p role="status">Loading...</p>;
  }

  const availableTransitions = statusTransitions[campaign.status] || [];

  return (
    <div>
      <Link href="/campaigns" style={{ color: "#1a1a2e", textDecoration: "none" }}>
        ← Back to Campaigns
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
        {error && <p role="alert" style={{ color: "#b91c1c" }}>{error}</p>}
        {message && <p aria-live="polite" style={{ color: "#15803d" }}>{message}</p>}
        <div style={{ color: "#666", marginTop: "8px" }}>
          Type: {campaign.type} • App: {campaign.app.replace(/-/g, " ")}
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
            {campaign.status}
          </span>
        </div>

        {availableTransitions.length > 0 && (
          <div style={{ marginTop: "24px" }}>
            <h3>Status Transitions</h3>
            <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
              {availableTransitions.map((status) => (
                <button
                  key={status}
                  onClick={() => handleStatusChange(status)}
                  style={{
                    padding: "8px 16px",
                    backgroundColor: "#1a1a2e",
                    color: "#fff",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                  }}
                >
                  Move to {status}
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
              Start Video Production
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
