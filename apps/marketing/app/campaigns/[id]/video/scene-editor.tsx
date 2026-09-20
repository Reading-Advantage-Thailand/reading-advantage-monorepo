"use client";

import { getMarketingMessage as t } from "@/lib/i18n";
import {
  MAX_SCRIPT_SCENES,
  MIN_SCRIPT_SCENES,
  type ScriptScene,
} from "@/lib/script-schema";

/** Props accepted by the scene editor. */
export interface SceneEditorProps {
  script: ScriptScene[];
  sceneIds: string[];
  onSceneChange: (index: number, patch: Partial<ScriptScene>) => void;
  onAddScene: () => void;
  onRemoveScene: (index: number) => void;
  onMoveScene: (fromIndex: number, toIndex: number) => void;
}

/**
 * Renders the Marketing scene editor: one draggable card per script scene
 * with narration, image prompt, and motion controls.
 * @param props Scene editor state and callbacks owned by the workflow page.
 * @returns The scene editor user interface.
 */
export function SceneEditor({
  script,
  sceneIds,
  onSceneChange,
  onAddScene,
  onRemoveScene,
  onMoveScene,
}: SceneEditorProps) {
  return (
    <div style={{ marginTop: "16px", display: "grid", gap: "12px" }}>
      {script.map((scene, index) => (
        <div
          key={sceneIds[index]}
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
            onMoveScene(from, index);
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
            <strong>{t("video.scene", { number: index + 1 })}</strong>
            <div style={{ display: "flex", gap: "4px" }}>
              <button
                onClick={() => onMoveScene(index, index - 1)}
                disabled={index === 0}
                aria-label={t("video.moveSceneUp")}
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
                onClick={() => onMoveScene(index, index + 1)}
                disabled={index === script.length - 1}
                aria-label={t("video.moveSceneDown")}
                style={{
                  padding: "2px 6px",
                  backgroundColor: "#9E9E9E",
                  color: "#fff",
                  border: "none",
                  borderRadius: "4px",
                  cursor:
                    index === script.length - 1 ? "not-allowed" : "pointer",
                }}
              >
                ↓
              </button>
              <button
                onClick={() => onRemoveScene(index)}
                disabled={script.length <= MIN_SCRIPT_SCENES}
                style={{
                  padding: "2px 6px",
                  backgroundColor: "#f44336",
                  color: "#fff",
                  border: "none",
                  borderRadius: "4px",
                  cursor:
                    script.length <= MIN_SCRIPT_SCENES ? "not-allowed" : "pointer",
                }}
              >
                {t("video.delete")}
              </button>
            </div>
          </div>
          <label style={{ display: "block", marginTop: "8px" }}>
            <span style={{ fontSize: "12px", color: "#666" }}>
              {t("video.narration")}
            </span>
            <textarea
              value={scene.narration}
              onChange={(e) =>
                onSceneChange(index, {
                  narration: e.target.value,
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
              {t("video.imagePrompt")}
            </span>
            <textarea
              value={scene.imagePrompt}
              onChange={(e) =>
                onSceneChange(index, {
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
              {t("video.motionDirection")}
            </span>
            <input
              type="text"
              value={scene.motionDirection}
              onChange={(e) =>
                onSceneChange(index, {
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
        onClick={onAddScene}
        disabled={script.length >= MAX_SCRIPT_SCENES}
        style={{
          padding: "8px 16px",
          backgroundColor: "#FF9800",
          color: "#fff",
          border: "none",
          borderRadius: "4px",
          cursor:
            script.length >= MAX_SCRIPT_SCENES ? "not-allowed" : "pointer",
        }}
      >
        {t("video.addScene")}
      </button>
    </div>
  );
}
