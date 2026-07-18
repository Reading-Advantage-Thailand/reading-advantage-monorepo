"use client";

import { useAuth } from "@reading-advantage/auth-client";

export default function HomePage() {
  const { user } = useAuth();

  return (
    <div>
      <h1>Marketing Production Platform</h1>
      <p>Welcome to the Reading Advantage marketing production system.</p>
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
            Settings
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
          Campaigns
        </a>
      </div>
    </div>
  );
}
