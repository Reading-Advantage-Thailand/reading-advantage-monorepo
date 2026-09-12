"use client";

import type { PublishEditionDialogProps } from "./types";

/**
 * Modal that confirms the immutable release of an in-review workbook draft.
 * The warning states that the published edition can never be edited and that
 * changing a released edition requires a new draft version; a structured
 * publication failure is rendered inside the dialog so the user can read it
 * before retrying or cancelling.
 * @param props In-flight flag, structured failure, and confirm/close callbacks;
 * see PublishEditionDialogProps.
 * @returns The immutable-release confirmation modal overlay.
 */
export function PublishEditionDialog({
  publishing,
  error,
  onConfirm,
  onClose,
}: PublishEditionDialogProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Publish Edition"
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
          <h2>Publish Edition</h2>
          <button
            type="button"
            aria-label="Close publish dialog"
            onClick={onClose}
          >
            ×
          </button>
        </header>

        <div style={{ padding: "1rem", display: "grid", gap: "1rem" }}>
          <p>
            Publishing creates an immutable edition that cannot be edited.
            Changing a released edition requires a new draft version.
          </p>
          {error && (
            <p role="alert" style={{ color: "#b91c1c" }}>
              {error}
            </p>
          )}
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
          <button type="button" onClick={onConfirm} disabled={publishing}>
            {publishing ? "Publishing..." : "Confirm Publish"}
          </button>
        </footer>
      </div>
    </div>
  );
}
