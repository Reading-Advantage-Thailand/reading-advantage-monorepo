"use client";

import { useState } from "react";
import type { workbooks } from "@reading-advantage/domain";
import {
  ensureMetadataLevelOption,
  getWorkbookLevelOptions,
} from "../../app/lib/workbook-levels";
import type { DraftSettingsDialogProps } from "./types";

/**
 * Modal that edits a workbook draft's project settings: workbook type, workbook
 * level, series name, and CEFR level. Local state is initialized from the
 * draft's current settings; a save in flight is surfaced through the disabled
 * Save button. The dialog stays open until the parent closes it.
 * @param props Current settings, saving flag, and save/close callbacks; see DraftSettingsDialogProps.
 * @returns The project settings modal overlay.
 */
export function DraftSettingsDialog({
  settings,
  saving,
  onSave,
  onClose,
}: DraftSettingsDialogProps) {
  const [type, setType] = useState<"primary" | "secondary">(
    settings?.type ?? "secondary",
  );
  const [levelNumber, setLevelNumber] = useState(settings?.levelNumber ?? "");
  const [seriesName, setSeriesName] = useState(settings?.seriesName ?? "");
  const [cefrLevel, setCefrLevel] = useState(settings?.cefrLevel ?? "");

  const levelOptions = ensureMetadataLevelOption(
    getWorkbookLevelOptions(type),
    { levelNumber, seriesName, cefrLevel },
  );

  const handleSave = () => {
    const nextSettings: workbooks.WorkbookDraftSettings = {
      ...(type ? { type } : {}),
      ...(levelNumber.trim() ? { levelNumber: levelNumber.trim() } : {}),
      ...(seriesName.trim() ? { seriesName: seriesName.trim() } : {}),
      ...(cefrLevel.trim() ? { cefrLevel: cefrLevel.trim() } : {}),
    };
    onSave(nextSettings);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Project Settings"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        padding: "1rem",
        background: "rgba(0, 0, 0, 0.5)",
      }}
    >
      <div
        style={{
          maxWidth: "425px",
          margin: "0 auto",
          background: "#fff",
          borderRadius: "0.5rem",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <header
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0.75rem 1rem",
            borderBottom: "1px solid #e5e7eb",
          }}
        >
          <h2>Project Settings</h2>
          <button type="button" aria-label="Close settings" onClick={onClose}>
            ×
          </button>
        </header>

        <div style={{ padding: "1rem", display: "grid", gap: "1rem" }}>
          <div style={{ display: "grid", gap: "0.25rem" }}>
            <label htmlFor="settings-type">Type</label>
            <select
              id="settings-type"
              value={type}
              onChange={(event) =>
                setType(event.target.value as "primary" | "secondary")
              }
            >
              <option value="primary">Primary</option>
              <option value="secondary">Secondary</option>
            </select>
          </div>

          <div style={{ display: "grid", gap: "0.25rem" }}>
            <label htmlFor="settings-level">Workbook Level</label>
            <select
              id="settings-level"
              value={levelNumber}
              onChange={(event) => setLevelNumber(event.target.value)}
            >
              {levelOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label} — {option.cefr}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: "grid", gap: "0.25rem" }}>
            <label htmlFor="settings-series">Series Name</label>
            <input
              id="settings-series"
              type="text"
              value={seriesName}
              onChange={(event) => setSeriesName(event.target.value)}
            />
          </div>

          <div style={{ display: "grid", gap: "0.25rem" }}>
            <label htmlFor="settings-cefr">CEFR Level</label>
            <input
              id="settings-cefr"
              type="text"
              value={cefrLevel}
              onChange={(event) => setCefrLevel(event.target.value)}
            />
          </div>
        </div>

        <footer
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: "0.5rem",
            padding: "0.75rem 1rem",
            borderTop: "1px solid #e5e7eb",
          }}
        >
          <button type="button" onClick={onClose}>
            Cancel
          </button>
          <button type="button" onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </button>
        </footer>
      </div>
    </div>
  );
}
