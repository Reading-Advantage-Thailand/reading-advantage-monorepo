import type { RecordHelpEventInput } from "@reading-advantage/domain/primary-help";

/**
 * Sends one help event to `/api/v1/help/events` (track primary_in_app_help_20261023, FR-11).
 * It does not wait, and a failure never blocks the panel or the video.
 * @param event The open or play event.
 */
export function sendHelpEvent(event: RecordHelpEventInput): void {
  try {
    void fetch("/api/v1/help/events", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(event),
      keepalive: true,
    }).catch(() => {});
  } catch {
    // No fetch (old browser or test): the event is lost, the help still works.
  }
}
