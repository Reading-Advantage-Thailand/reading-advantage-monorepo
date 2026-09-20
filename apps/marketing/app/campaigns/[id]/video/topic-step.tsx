"use client";

import { APPS } from "@/lib/apps";
import { getMarketingAppName, getMarketingMessage as t } from "@/lib/i18n";

/** One researched topic shown in the topic review step. */
export interface Topic {
  id: string;
  text: string;
  approved: boolean;
  editing: boolean;
}

/** Props accepted by the topic review step. */
export interface TopicStepProps {
  selectedApp: string;
  onSelectApp: (app: string) => void;
  researching: boolean;
  topics: Topic[];
  activeTopicId: string | null;
  savingTopics: boolean;
  hasApprovedTopics: boolean;
  onResearch: () => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onEdit: (id: string) => void;
  onTopicChange: (id: string, text: string) => void;
  onSaveEdit: (id: string) => void;
  onSaveTopics: () => void;
  onSelectTopic: (id: string) => void;
}

/**
 * Renders the Marketing video topic step: product selection, topic
 * research, and topic review.
 * @param props Topic step state and callbacks owned by the workflow page.
 * @returns The topic step user interface.
 */
export function TopicStep({
  selectedApp,
  onSelectApp,
  researching,
  topics,
  activeTopicId,
  savingTopics,
  hasApprovedTopics,
  onResearch,
  onApprove,
  onReject,
  onEdit,
  onTopicChange,
  onSaveEdit,
  onSaveTopics,
  onSelectTopic,
}: TopicStepProps) {
  return (
    <>
      <div
        style={{
          marginTop: "24px",
          padding: "24px",
          backgroundColor: "#fff",
          borderRadius: "8px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
        }}
      >
        <h2>{t("video.stepSelectApp")}</h2>
        <select
          value={selectedApp}
          onChange={(e) => onSelectApp(e.target.value)}
          style={{
            padding: "8px",
            borderRadius: "4px",
            border: "1px solid #ccc",
            marginTop: "8px",
          }}
        >
          {APPS.map((key) => (
            <option key={key} value={key}>
              {getMarketingAppName(key)}
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
        <h2>{t("video.stepResearch")}</h2>
        <p>
          {t("video.researchDescription", {
            app: getMarketingAppName(selectedApp),
          })}
        </p>
        <button
          onClick={onResearch}
          disabled={researching}
          style={{
            padding: "8px 16px",
            backgroundColor: "#1a1a2e",
            color: "#fff",
            border: "none",
            borderRadius: "4px",
            cursor: researching ? "not-allowed" : "pointer",
            marginTop: "8px",
          }}
        >
          {researching ? t("video.researching") : t("video.researchTopics")}
        </button>

        {topics.length > 0 && (
          <div style={{ marginTop: "16px" }}>
            <h3>{t("video.proposedTopics")}</h3>
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
                    <>
                      <input
                        type="text"
                        value={topic.text}
                        onChange={(e) => onTopicChange(topic.id, e.target.value)}
                        style={{
                          flex: 1,
                          padding: "8px",
                          borderRadius: "4px",
                          border: "1px solid #ccc",
                        }}
                      />
                      <button
                        onClick={() => onSaveEdit(topic.id)}
                        style={{
                          padding: "4px 8px",
                          backgroundColor: "#4CAF50",
                          color: "#fff",
                          border: "none",
                          borderRadius: "4px",
                          cursor: "pointer",
                        }}
                      >
                        {t("video.saveScript")}
                      </button>
                    </>
                  ) : (
                    <span>{topic.text}</span>
                  )}
                  <div
                    style={{ display: "flex", gap: "8px", marginLeft: "16px" }}
                  >
                    {!topic.approved && (
                      <>
                        <button
                          onClick={() => onApprove(topic.id)}
                          style={{
                            padding: "4px 8px",
                            backgroundColor: "#4CAF50",
                            color: "#fff",
                            border: "none",
                            borderRadius: "4px",
                            cursor: "pointer",
                          }}
                        >
                          {t("video.approve")}
                        </button>
                        <button
                          onClick={() => onEdit(topic.id)}
                          style={{
                            padding: "4px 8px",
                            backgroundColor: "#FF9800",
                            color: "#fff",
                            border: "none",
                            borderRadius: "4px",
                            cursor: "pointer",
                          }}
                        >
                          {t("video.edit")}
                        </button>
                        <button
                          onClick={() => onReject(topic.id)}
                          style={{
                            padding: "4px 8px",
                            backgroundColor: "#f44336",
                            color: "#fff",
                            border: "none",
                            borderRadius: "4px",
                            cursor: "pointer",
                          }}
                        >
                          {t("video.reject")}
                        </button>
                      </>
                    )}
                    {topic.approved && (
                      <>
                        <span style={{ color: "#4CAF50" }}>
                          {t("video.approved")}
                        </span>
                        <button
                          onClick={() => onSelectTopic(topic.id)}
                          style={{
                            padding: "4px 8px",
                            backgroundColor:
                              activeTopicId === topic.id
                                ? "#1a1a2e"
                                : "#9E9E9E",
                            color: "#fff",
                            border: "none",
                            borderRadius: "4px",
                            cursor: "pointer",
                          }}
                        >
                          {activeTopicId === topic.id
                            ? t("video.selectedForScript")
                            : t("video.useForScript")}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {hasApprovedTopics && (
              <button
                onClick={onSaveTopics}
                disabled={savingTopics}
                style={{
                  marginTop: "16px",
                  padding: "8px 16px",
                  backgroundColor: "#4CAF50",
                  color: "#fff",
                  border: "none",
                  borderRadius: "4px",
                  cursor: savingTopics ? "not-allowed" : "pointer",
                }}
              >
                {savingTopics
                  ? t("video.saving")
                  : t("video.saveApprovedTopics")}
              </button>
            )}
          </div>
        )}
      </div>
    </>
  );
}
