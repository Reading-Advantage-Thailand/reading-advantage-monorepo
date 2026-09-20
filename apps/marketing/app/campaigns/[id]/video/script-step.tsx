"use client";

import { getMarketingMessage as t } from "@/lib/i18n";

/** Props accepted by the script generation step. */
export interface ScriptStepProps {
  hasApprovedTopics: boolean;
  activeTopicText: string | null;
  hasScript: boolean;
  generating: boolean;
  saving: boolean;
  selectedProjectId: string | null;
  savedProjectId: string | null;
  projectMessage: string | null;
  onGenerate: () => void;
  onSaveScript: () => void;
  children?: React.ReactNode;
}

/**
 * Renders the Marketing video script step: script generation, script
 * persistence, and the scene editor content.
 * @param props Script step state and callbacks owned by the workflow page.
 * @returns The script step user interface.
 */
export function ScriptStep({
  hasApprovedTopics,
  activeTopicText,
  hasScript,
  generating,
  saving,
  selectedProjectId,
  savedProjectId,
  projectMessage,
  onGenerate,
  onSaveScript,
  children,
}: ScriptStepProps) {
  return (
    <div
      style={{
        marginTop: "24px",
        padding: "24px",
        backgroundColor: "#fff",
        borderRadius: "8px",
        boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
      }}
    >
      <h2>{t("video.stepGenerate")}</h2>
      {hasApprovedTopics ? (
        <>
          <p>{t("video.generateDescription")}</p>
          {activeTopicText && (
            <p data-testid="selected-topic">
              <strong>{t("video.selectedTopic")}</strong> {activeTopicText}
            </p>
          )}
          <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
            <button
              onClick={onGenerate}
              disabled={generating}
              style={{
                padding: "8px 16px",
                backgroundColor: "#1a1a2e",
                color: "#fff",
                border: "none",
                borderRadius: "4px",
                cursor: generating ? "not-allowed" : "pointer",
              }}
            >
              {generating ? t("video.generating") : t("video.generateScript")}
            </button>
            {hasScript && (
              <button
                onClick={onSaveScript}
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
                {saving
                  ? selectedProjectId
                    ? t("video.updating")
                    : t("video.saving")
                  : selectedProjectId
                    ? t("video.updateScript")
                    : t("video.saveScript")}
              </button>
            )}
          </div>
          {savedProjectId && !projectMessage && (
            <p style={{ color: "#4CAF50", marginTop: "8px" }}>
              {t("video.projectReady", { id: savedProjectId })}
            </p>
          )}
          {children}
        </>
      ) : (
        <p>{t("video.approveTopicFirst")}</p>
      )}
    </div>
  );
}
