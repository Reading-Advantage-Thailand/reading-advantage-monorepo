"use client";

import type { LessonPreviewModalProps } from "./types";
import { LessonPreview } from "./LessonPreview";

/**
 * Full-screen modal that shows the compiled lesson preview inside an iframe.
 * When the preview html is null, an empty-state message is shown instead of
 * the iframe.
 *
 * @param props - The preview html (or null) and a close callback; see LessonPreviewModalProps.
 * @returns The modal overlay, or the empty-state message when there is no html.
 */
export function LessonPreviewModal({
  previewHtml,
  onClose,
}: LessonPreviewModalProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Lesson Preview"
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
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "#fff",
          borderRadius: "0.5rem",
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
          <h2>Lesson Preview</h2>
          <button type="button" aria-label="Close preview" onClick={onClose}>
            ×
          </button>
        </header>
        <div style={{ flex: 1, minHeight: 0, overflow: "auto" }}>
          {previewHtml ? (
            <LessonPreview htmlContent={previewHtml} className="h-full" />
          ) : (
            <p>No preview available.</p>
          )}
        </div>
      </div>
    </div>
  );
}
