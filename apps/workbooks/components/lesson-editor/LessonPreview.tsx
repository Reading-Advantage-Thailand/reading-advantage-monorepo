"use client";

import type { LessonPreviewProps } from "./types";

/**
 * Renders the compiled lesson HTML inside a sandboxed iframe using the
 * srcdoc attribute, so print layout and scripts run in an isolated context
 * without same-origin access to the parent document.
 *
 * @param props - The lesson HTML and an optional layout class; see LessonPreviewProps.
 * @returns The scrollable iframe preview panel.
 */
export function LessonPreview({ htmlContent, className }: LessonPreviewProps) {
  return (
    <div className={className} style={{ height: "100%" }}>
      <iframe
        title="Lesson Preview"
        srcDoc={htmlContent}
        style={{ width: "100%", height: "100%", border: "none" }}
        sandbox="allow-scripts allow-modals"
      />
    </div>
  );
}
