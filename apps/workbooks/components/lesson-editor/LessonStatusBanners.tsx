"use client";

import type { LessonStatusBannersProps } from "./types";

/**
 * Renders the transient status banners for the draft lesson editor: form
 * errors, save success, and optimistic-concurrency revision conflicts. The
 * legacy augment/image-generation banners are excluded because those features
 * are out of S4b scope.
 *
 * @param props - The active message flags; see LessonStatusBannersProps.
 * @returns The active banners, or nothing when no messages are active.
 */
export function LessonStatusBanners({
  formError,
  saveSuccess,
  revisionConflict,
  revisionConflictMessage,
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
        </section>
      )}
    </>
  );
}
