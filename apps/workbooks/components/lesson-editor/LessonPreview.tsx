"use client";

import { useEffect, useRef } from "react";
import type { LessonPreviewProps } from "./types";

/**
 * Renders the compiled lesson HTML inside a sandboxed iframe using
 * document.write, so print layout and scripts run in an isolated context.
 * The iframe is re-populated whenever the html content changes.
 *
 * @param props - The lesson HTML and an optional layout class; see LessonPreviewProps.
 * @returns The scrollable iframe preview panel.
 */
export function LessonPreview({ htmlContent, className }: LessonPreviewProps) {
  const previewRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const iframe = previewRef.current;
    if (!iframe) return;
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(htmlContent);
      doc.close();
    }
  }, [htmlContent]);

  return (
    <div className={className} style={{ height: "100%" }}>
      <iframe
        ref={previewRef}
        title="Lesson Preview"
        style={{ width: "100%", height: "100%", border: "none" }}
        sandbox="allow-same-origin allow-scripts allow-modals"
      />
    </div>
  );
}
