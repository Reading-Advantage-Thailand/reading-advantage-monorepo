import { getTableConfig } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import { activitySessionEvents, activitySessions } from "../schema/activity.js";

describe("activity persistence schema", () => {
  it("stores tenant ownership, retention, idempotency, and projection columns", () => {
    const sessionColumns = getTableConfig(activitySessions).columns.map((column) => column.name);
    const eventColumns = getTableConfig(activitySessionEvents).columns.map((column) => column.name);
    expect(sessionColumns).toEqual(expect.arrayContaining([
      "school_id",
      "tenant_key",
      "learner_id",
      "processed_batch_ids_json",
      "device_high_watermarks_json",
      "retain_until",
    ]));
    expect(eventColumns).toEqual(expect.arrayContaining([
      "event_id",
      "batch_id",
      "device_id",
      "client_sequence",
      "server_sequence",
      "is_assessed",
      "submission_id",
      "submission_json",
      "mastery_projection_status",
      "mastery_projection_attempts",
      "mastery_commit_id",
    ]));
  });

  it("declares unique constraints for event and sequence replay protection", () => {
    const uniqueNames = getTableConfig(activitySessionEvents).uniqueConstraints.map((constraint) => constraint.name);
    expect(uniqueNames).toEqual(expect.arrayContaining([
      "activity_session_events_session_event_unique",
      "activity_session_events_session_server_sequence_unique",
      "activity_session_events_session_device_client_unique",
      "activity_session_events_session_submission_unique",
    ]));
  });
});
