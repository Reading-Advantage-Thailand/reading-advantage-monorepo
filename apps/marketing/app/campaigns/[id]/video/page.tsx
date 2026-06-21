"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  addScene as addSceneFn,
  removeScene as removeSceneFn,
  reorderScenes as reorderScenesFn,
  type Scene,
} from "@/lib/scene-editor";

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

const emptyScene: Scene = {
  narration: "",
  imagePrompt: "",
  motionDirection: "Static",
};

export default function VideoProductionPage() {
  const params = useParams();
  const [campaign, setCampaign] = useState<any>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedApp, setSelectedApp] = useState("reading-advantage");

  const [activeTopicId, setActiveTopicId] = useState<string | null>(null);
  const [script, setScript] = useState<Scene[]>([]);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedProjectId, setSavedProjectId] = useState<string | null>(null);

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

  const handleGenerateScript = async () => {
    const topic = topics.find((t) => t.id === activeTopicId);
    if (!topic) return;
    setGenerating(true);
    setSavedProjectId(null);
    try {
      const res = await fetch("/api/video/generate-script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ app: selectedApp, topic: topic.text }),
      });
      const data = await res.json();
      if (Array.isArray(data.script)) {
        setScript(data.script);
      }
    } catch {
      console.error("Failed to generate script");
    } finally {
      setGenerating(false);
    }
  };

  const handleSceneChange = (index: number, patch: Partial<Scene>) => {
    setScript((prev) =>
      prev.map((scene, i) => (i === index ? { ...scene, ...patch } : scene))
    );
  };

  const handleAddScene = () => {
    setScript((prev) => addSceneFn(prev, { ...emptyScene }));
  };

  const handleRemoveScene = (index: number) => {
    setScript((prev) => removeSceneFn(prev, index));
  };

  const handleMoveScene = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= script.length) return;
    setScript((prev) => reorderScenesFn(prev, fromIndex, toIndex));
  };

  const handleSaveScript = async () => {
    if (!campaign?.id || !activeTopicId) return;
    const topic = topics.find((t) => t.id === activeTopicId);
    if (!topic) return;
    setSaving(true);
    try {
      const res = await fetch("/api/video/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId: campaign.id,
          topic: topic.text,
          script,
        }),
      });
      const data = await res.json();
      if (data?.id) {
        setSavedProjectId(data.id);
      }
    } catch {
      console.error("Failed to save script");
    } finally {
      setSaving(false);
    }
  };

  if (!campaign) {
    return <div>Loading...</div>;
  }

  const approvedTopics = topics.filter((t) => t.approved);

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
                    {topic.approved && (
                      <>
                        <span style={{ color: "#4CAF50" }}>✓ Approved</span>
                        <button
                          onClick={() => setActiveTopicId(topic.id)}
                          style={{
                            padding: "4px 8px",
                            backgroundColor:
                              activeTopicId === topic.id ? "#1a1a2e" : "#9E9E9E",
                            color: "#fff",
                            border: "none",
                            borderRadius: "4px",
                            cursor: "pointer",
                          }}
                        >
                          {activeTopicId === topic.id
                            ? "Selected for Script"
                            : "Use for Script"}
                        </button>
                      </>
                    )}
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

      <div
        style={{
          marginTop: "24px",
          padding: "24px",
          backgroundColor: "#fff",
          borderRadius: "8px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
        }}
      >
        <h2>Step 3: Generate Script</h2>
        {approvedTopics.length === 0 ? (
          <p>Approve a topic in Step 2 first.</p>
        ) : (
          <>
            <p>
              Generating a Thai marketing script (5–7 scenes) for the selected
              approved topic.
            </p>
            <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
              <button
                onClick={handleGenerateScript}
                disabled={generating || !activeTopicId}
                style={{
                  padding: "8px 16px",
                  backgroundColor: "#1a1a2e",
                  color: "#fff",
                  border: "none",
                  borderRadius: "4px",
                  cursor: generating ? "not-allowed" : "pointer",
                }}
              >
                {generating ? "Generating..." : "Generate Script"}
              </button>
              {script.length > 0 && (
                <button
                  onClick={handleSaveScript}
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
                  {saving ? "Saving..." : "Save Script"}
                </button>
              )}
            </div>
            {savedProjectId && (
              <p style={{ color: "#4CAF50", marginTop: "8px" }}>
                Saved as project {savedProjectId}
              </p>
            )}

            {script.length > 0 && (
              <div style={{ marginTop: "16px", display: "grid", gap: "12px" }}>
                {script.map((scene, index) => (
                  <div
                    key={index}
                    style={{
                      padding: "16px",
                      backgroundColor: "#f9f9f9",
                      borderRadius: "8px",
                      border: "1px solid #eee",
                    }}
                    draggable
                    onDragStart={(e) =>
                      e.dataTransfer.setData("text/plain", String(index))
                    }
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      const from = Number(e.dataTransfer.getData("text/plain"));
                      handleMoveScene(from, index);
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "8px",
                      }}
                    >
                      <strong>Scene {index + 1}</strong>
                      <div style={{ display: "flex", gap: "4px" }}>
                        <button
                          onClick={() => handleMoveScene(index, index - 1)}
                          disabled={index === 0}
                          style={{
                            padding: "2px 6px",
                            backgroundColor: "#9E9E9E",
                            color: "#fff",
                            border: "none",
                            borderRadius: "4px",
                            cursor: index === 0 ? "not-allowed" : "pointer",
                          }}
                        >
                          ↑
                        </button>
                        <button
                          onClick={() => handleMoveScene(index, index + 1)}
                          disabled={index === script.length - 1}
                          style={{
                            padding: "2px 6px",
                            backgroundColor: "#9E9E9E",
                            color: "#fff",
                            border: "none",
                            borderRadius: "4px",
                            cursor:
                              index === script.length - 1
                                ? "not-allowed"
                                : "pointer",
                          }}
                        >
                          ↓
                        </button>
                        <button
                          onClick={() => handleRemoveScene(index)}
                          style={{
                            padding: "2px 6px",
                            backgroundColor: "#f44336",
                            color: "#fff",
                            border: "none",
                            borderRadius: "4px",
                            cursor: "pointer",
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    <label style={{ display: "block", marginTop: "8px" }}>
                      <span style={{ fontSize: "12px", color: "#666" }}>
                        Narration (Thai)
                      </span>
                      <textarea
                        value={scene.narration}
                        onChange={(e) =>
                          handleSceneChange(index, { narration: e.target.value })
                        }
                        rows={2}
                        style={{
                          width: "100%",
                          padding: "6px",
                          borderRadius: "4px",
                          border: "1px solid #ccc",
                        }}
                      />
                    </label>
                    <label style={{ display: "block", marginTop: "8px" }}>
                      <span style={{ fontSize: "12px", color: "#666" }}>
                        Image Prompt (English)
                      </span>
                      <textarea
                        value={scene.imagePrompt}
                        onChange={(e) =>
                          handleSceneChange(index, {
                            imagePrompt: e.target.value,
                          })
                        }
                        rows={2}
                        style={{
                          width: "100%",
                          padding: "6px",
                          borderRadius: "4px",
                          border: "1px solid #ccc",
                        }}
                      />
                    </label>
                    <label style={{ display: "block", marginTop: "8px" }}>
                      <span style={{ fontSize: "12px", color: "#666" }}>
                        Motion Direction
                      </span>
                      <input
                        type="text"
                        value={scene.motionDirection}
                        onChange={(e) =>
                          handleSceneChange(index, {
                            motionDirection: e.target.value,
                          })
                        }
                        style={{
                          width: "100%",
                          padding: "6px",
                          borderRadius: "4px",
                          border: "1px solid #ccc",
                        }}
                      />
                    </label>
                  </div>
                ))}
                <button
                  onClick={handleAddScene}
                  style={{
                    padding: "8px 16px",
                    backgroundColor: "#FF9800",
                    color: "#fff",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                  }}
                >
                  Add Scene
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
