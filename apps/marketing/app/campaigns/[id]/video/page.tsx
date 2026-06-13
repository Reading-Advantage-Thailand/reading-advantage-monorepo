"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";

interface Topic {
  id: string;
  text: string;
  approved: boolean;
  editing: boolean;
}

const appNames: Record<string, string> = {
  "reading-advantage": "Reading Advantage",
  "primary-advantage": "Primary Advantage",
  storytime: "Storytime",
  "math-advantage": "Math Advantage",
  "science-advantage": "Science Advantage",
  "stem-advantage": "STEM Advantage",
  "zhongwen-advantage": "Zhongwen Advantage",
  "tutor-advantage": "Tutor Advantage",
};

export default function VideoProductionPage() {
  const params = useParams();
  const [campaign, setCampaign] = useState<any>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedApp, setSelectedApp] = useState("reading-advantage");

  useEffect(() => {
    if (params?.id) {
      fetchCampaign(params.id as string);
    }
  }, [params?.id]);

  const fetchCampaign = async (id: string) => {
    try {
      const res = await fetch(`/api/campaigns/${id}`);
      const data = await res.json();
      setCampaign(data);
      setSelectedApp(data.app);
    } catch {
      console.error("Failed to load campaign");
    }
  };

  const handleResearchTopics = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/video/research-topics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ app: selectedApp }),
      });
      const data = await res.json();
      setTopics(
        data.topics.map((text: string, i: number) => ({
          id: `topic-${i}`,
          text,
          approved: false,
          editing: false,
        }))
      );
    } catch {
      console.error("Failed to research topics");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = (id: string) => {
    setTopics(
      topics.map((t) => (t.id === id ? { ...t, approved: true } : t))
    );
  };

  const handleReject = (id: string) => {
    setTopics(topics.filter((t) => t.id !== id));
  };

  const handleEdit = (id: string) => {
    setTopics(
      topics.map((t) => (t.id === id ? { ...t, editing: true } : t))
    );
  };

  const handleSaveEdit = (id: string, newText: string) => {
    setTopics(
      topics.map((t) =>
        t.id === id ? { ...t, text: newText, editing: false } : t
      )
    );
  };

  const handleSaveTopics = async () => {
    try {
      const approvedTopics = topics.filter((t) => t.approved);
      await fetch("/api/video/save-topics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          app: selectedApp,
          topics: approvedTopics.map((t) => t.text),
        }),
      });
      alert("Topics saved!");
    } catch {
      console.error("Failed to save topics");
    }
  };

  if (!campaign) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h1>Video Production: {campaign.name}</h1>

      <div
        style={{
          marginTop: "24px",
          padding: "24px",
          backgroundColor: "#fff",
          borderRadius: "8px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
        }}
      >
        <h2>Step 1: Select App</h2>
        <select
          value={selectedApp}
          onChange={(e) => setSelectedApp(e.target.value)}
          style={{
            padding: "8px",
            borderRadius: "4px",
            border: "1px solid #ccc",
            marginTop: "8px",
          }}
        >
          {Object.entries(appNames).map(([key, name]) => (
            <option key={key} value={key}>
              {name}
            </option>
          ))}
        </select>
      </div>

      <div
        style={{
          marginTop: "24px",
          padding: "24px",
          backgroundColor: "#fff",
          borderRadius: "8px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
        }}
      >
        <h2>Step 2: Research Topics</h2>
        <p>LLM will propose 5 topics relevant to {appNames[selectedApp]}.</p>
        <button
          onClick={handleResearchTopics}
          disabled={loading}
          style={{
            padding: "8px 16px",
            backgroundColor: "#1a1a2e",
            color: "#fff",
            border: "none",
            borderRadius: "4px",
            cursor: loading ? "not-allowed" : "pointer",
            marginTop: "8px",
          }}
        >
          {loading ? "Researching..." : "Research Topics"}
        </button>

        {topics.length > 0 && (
          <div style={{ marginTop: "16px" }}>
            <h3>Proposed Topics</h3>
            <div style={{ display: "grid", gap: "12px", marginTop: "8px" }}>
              {topics.map((topic) => (
                <div
                  key={topic.id}
                  style={{
                    padding: "16px",
                    backgroundColor: topic.approved ? "#e8f5e9" : "#f5f5f5",
                    borderRadius: "8px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  {topic.editing ? (
                    <input
                      type="text"
                      defaultValue={topic.text}
                      onBlur={(e) => handleSaveEdit(topic.id, e.target.value)}
                      style={{
                        flex: 1,
                        padding: "8px",
                        borderRadius: "4px",
                        border: "1px solid #ccc",
                      }}
                    />
                  ) : (
                    <span>{topic.text}</span>
                  )}
                  <div style={{ display: "flex", gap: "8px", marginLeft: "16px" }}>
                    {!topic.approved && (
                      <>
                        <button
                          onClick={() => handleApprove(topic.id)}
                          style={{
                            padding: "4px 8px",
                            backgroundColor: "#4CAF50",
                            color: "#fff",
                            border: "none",
                            borderRadius: "4px",
                            cursor: "pointer",
                          }}
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleEdit(topic.id)}
                          style={{
                            padding: "4px 8px",
                            backgroundColor: "#FF9800",
                            color: "#fff",
                            border: "none",
                            borderRadius: "4px",
                            cursor: "pointer",
                          }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleReject(topic.id)}
                          style={{
                            padding: "4px 8px",
                            backgroundColor: "#f44336",
                            color: "#fff",
                            border: "none",
                            borderRadius: "4px",
                            cursor: "pointer",
                          }}
                        >
                          Reject
                        </button>
                      </>
                    )}
                    {topic.approved && <span style={{ color: "#4CAF50" }}>✓ Approved</span>}
                  </div>
                </div>
              ))}
            </div>
            {topics.some((t) => t.approved) && (
              <button
                onClick={handleSaveTopics}
                style={{
                  marginTop: "16px",
                  padding: "8px 16px",
                  backgroundColor: "#4CAF50",
                  color: "#fff",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                Save Approved Topics
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
