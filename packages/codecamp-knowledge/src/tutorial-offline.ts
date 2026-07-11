/** Client-safe exports for durable Codecamp tutorial report delivery. */
export { createStorageTutorialReportQueue, enqueueTutorialReport, flushTutorialReportQueue } from "@reading-advantage/activity-tutorial/offline";
export type { QueuedTutorialReport, TutorialReportQueue } from "@reading-advantage/activity-tutorial/offline";
