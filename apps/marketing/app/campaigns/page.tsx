"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Campaign {
  id: string;
  type: "video" | "infocard";
  app: string;
  name: string;
  status: string;
  createdAt: string;
}

const appColors: Record<string, string> = {
  "reading-advantage": "#4CAF50",
  "primary-advantage": "#2196F3",
  storytime: "#9C27B0",
  "math-advantage": "#FF9800",
  "science-advantage": "#00BCD4",
  "stem-advantage": "#E91E63",
  "zhongwen-advantage": "#F44336",
  "tutor-advantage": "#607D8B",
};

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
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
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    setError(null);
    try {
      const res = await fetch("/api/campaigns");
      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }
      if (res.status === 403) {
        setError("You do not have access to Marketing campaigns.");
        return;
      }
      if (!res.ok) {
        setError("Failed to load campaigns. Please try again.");
        return;
      }
      const data: unknown = await res.json();
      if (!Array.isArray(data)) {
        setError("Campaigns returned an invalid response.");
        return;
      }
      setCampaigns(data as Campaign[]);
    } catch {
      setError("Failed to load campaigns. Please try again.");
    }
  };

  const handleCreate = async () => {
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newCampaign),
      });
      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }
      if (res.status === 403) {
        setError("You do not have permission to create campaigns.");
        return;
      }
      if (!res.ok) {
        setError("Failed to create campaign. Check the form and try again.");
        return;
      }
      setShowCreate(false);
      setNewCampaign({ type: "video", app: "reading-advantage", name: "" });
      setMessage("Campaign created.");
      await fetchCampaigns();
    } catch {
      setError("Failed to create campaign. Please try again.");
    }
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>Campaigns</h1>
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
          Create Campaign
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
          <h2>New Campaign</h2>
          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", marginBottom: "4px" }}>Type</label>
            <select
              value={newCampaign.type}
              onChange={(e) =>
                setNewCampaign({ ...newCampaign, type: e.target.value as "video" | "infocard" })
              }
              style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #ccc" }}
            >
              <option value="video">Video</option>
              <option value="infocard">Infocard</option>
            </select>
          </div>
          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", marginBottom: "4px" }}>App</label>
            <select
              value={newCampaign.app}
              onChange={(e) => setNewCampaign({ ...newCampaign, app: e.target.value })}
              style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #ccc" }}
            >
              {Object.keys(appColors).map((app) => (
                <option key={app} value={app}>
                  {app.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                </option>
              ))}
            </select>
          </div>
          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", marginBottom: "4px" }}>Name</label>
            <input
              type="text"
              value={newCampaign.name}
              onChange={(e) => setNewCampaign({ ...newCampaign, name: e.target.value })}
              placeholder="Campaign name"
              style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #ccc" }}
            />
          </div>
          <div style={{ display: "flex", gap: "12px" }}>
            <button
              onClick={handleCreate}
              style={{
                padding: "8px 16px",
                backgroundColor: "#4CAF50",
                color: "#fff",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              Create
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
              Cancel
            </button>
          </div>
        </div>
      )}

      <div style={{ marginTop: "24px", display: "grid", gap: "16px" }}>
        {campaigns.map((campaign) => (
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
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span
                    style={{
                      width: "12px",
                      height: "12px",
                      borderRadius: "50%",
                      backgroundColor: appColors[campaign.app] || "#ccc",
                      display: "inline-block",
                    }}
                  />
                  <strong>{campaign.name}</strong>
                </div>
                <div style={{ color: "#666", marginTop: "4px" }}>
                  {campaign.type} • {campaign.app.replace(/-/g, " ")}
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
                {campaign.status}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
