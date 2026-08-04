"use client";

import type { LessonStatusBannersProps } from "./types";

/**
 * Renders the transient status banners for the draft lesson editor: form
 * errors, save success, and optimistic-concurrency revision conflicts. When a
 * newer server lesson is pending after a conflict, a Reload content action
 * replaces the local lesson only on explicit user choice.
 *
 * @param props - The active message flags; see LessonStatusBannersProps.
 * @returns The active banners, or nothing when no messages are active.
 */
export function LessonStatusBanners({
  formError,
  saveSuccess,
  revisionConflict,
  revisionConflictMessage,
  reloadAvailable,
  onReloadContent,
}: LessonStatusBannersProps) {
  return (
    <>
      {formError && (
        <section role="alert">
          <h2>Unable to save</h2>
          <p>{formError}</p>
        </section>
      )}

      {saveSuccess && (
        <section role="status">
          <p>Draft saved successfully!</p>
        </section>
      )}

      {revisionConflict && (
        <section role="alert">
          <h2>Save conflict</h2>
          <p>
            {revisionConflictMessage ??
              "This draft changed in another session. Reload the latest revision before editing again."}
          </p>
          {reloadAvailable && onReloadContent && (
            <button type="button" onClick={onReloadContent}>
              Reload content
            </button>
          )}
        </section>
      )}
    </>
  );
}
