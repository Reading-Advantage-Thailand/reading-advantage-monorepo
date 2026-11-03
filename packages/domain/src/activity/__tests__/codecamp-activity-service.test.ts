import { createCodecampAPKActivity, createCodecampAPKIndependentActivity, createCodecampAPKTutorialActivity } from "@reading-advantage/codecamp-knowledge";
import { activitySessions, schools, users } from "@reading-advantage/db";
import { eq } from "drizzle-orm";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { createTestDb, type TestDb } from "../../__tests__/helpers/testDb.js";
import { createCodecampActivityHandlers } from "../codecamp-activity-service.js";

const SCHOOL = "c0de0000-0000-4000-8000-000000000001";
const platformActor = { learnerId: "cc-learner", schoolId: null, tenantKey: "codecamp" } as const;
const schoolActor = { learnerId: "cc-student", schoolId: SCHOOL } as const;

describe("createCodecampActivityHandlers", () => {
  let harness: TestDb;

  beforeAll(async () => {
    harness = await createTestDb();
    await harness.db.insert(schools).values({ id: SCHOOL, name: "Codecamp School" });
    await harness.db.insert(users).values([
      { id: "cc-learner", username: "cc-learner", displayUsername: "cc-learner", role: "INTERN", schoolId: null },
      { id: "cc-student", username: "cc-student", displayUsername: "cc-student", role: "STUDENT", schoolId: SCHOOL },
    ]);
  }, 120_000);
  afterAll(async () => harness.close());
  afterEach(() => vi.unstubAllEnvs());

  it("starts a session for each of the three authored Codecamp activities", async () => {
    const handlers = createCodecampActivityHandlers(harness.tenantDb({ schoolId: null }));
    for (const activity of [createCodecampAPKActivity("en"), createCodecampAPKTutorialActivity("en"), createCodecampAPKIndependentActivity("en")]) {
      const summary = await handlers.start(platformActor, { activityId: activity.activityId, activityVersion: activity.activityVersion });
      expect(summary).toMatchObject({ activityId: activity.activityId, completed: false });
      const [row] = await harness.db.select().from(activitySessions).where(eq(activitySessions.id, summary.sessionId));
      expect(row).toMatchObject({ tenantKey: "codecamp", schoolId: null, learnerId: "cc-learner", activityVersion: activity.activityVersion });
    }
  });

  it("rejects an unknown activity id or version", async () => {
    const handlers = createCodecampActivityHandlers(harness.tenantDb({ schoolId: null }));
    const pilot = createCodecampAPKActivity("en");
    await expect(handlers.start(platformActor, { activityId: "activity.unknown", activityVersion: pilot.activityVersion })).rejects.toThrow("Activity not found: activity.unknown");
    await expect(handlers.start(platformActor, { activityId: pilot.activityId, activityVersion: "0.0.0-missing" })).rejects.toThrow("Activity not found");
  });

  it("lists every pilot checkpoint as unresolved in a new school teacher summary", async () => {
    const handlers = createCodecampActivityHandlers(harness.tenantDb({ schoolId: SCHOOL }));
    const pilot = createCodecampAPKActivity("en");
    const started = await handlers.start(schoolActor, { activityId: pilot.activityId, activityVersion: pilot.activityVersion });
    const summary = await handlers.getTeacherSummary(SCHOOL, "cc-student", started.sessionId);
    expect(summary).toMatchObject({ sessionId: started.sessionId, unresolvedCheckpointIds: pilot.checkpoints.map(({ checkpointId }) => checkpointId) });
    await expect(handlers.getCodecampTeacherSummary("cc-student", started.sessionId)).resolves.toBeNull();
  });

  it("returns a platform session through the Codecamp teacher summary only", async () => {
    const handlers = createCodecampActivityHandlers(harness.tenantDb({ schoolId: null }));
    const pilot = createCodecampAPKActivity("en");
    const started = await handlers.start(platformActor, { activityId: pilot.activityId, activityVersion: pilot.activityVersion });
    await expect(handlers.getCodecampTeacherSummary("cc-learner", started.sessionId)).resolves.toMatchObject({ sessionId: started.sessionId });
    await expect(handlers.getTeacherSummary(SCHOOL, "cc-learner", started.sessionId)).resolves.toBeNull();
    await expect(handlers.get(platformActor, { sessionId: started.sessionId })).resolves.toMatchObject({ sessionId: started.sessionId });
  });

  it("requires the report secret before any tutorial report work", () => {
    vi.stubEnv("TUTORIAL_REPORT_SECRET", "   ");
    const handlers = createCodecampActivityHandlers(harness.tenantDb({ schoolId: null }));
    expect(() => handlers.reportTutorial(platformActor, {})).toThrow("TUTORIAL_REPORT_SECRET is required for tutorial reporting");
    expect(() => handlers.reissueTutorialCredential(platformActor, {})).toThrow("TUTORIAL_REPORT_SECRET is required for tutorial reporting");
    expect(() => handlers.prepareTutorial(platformActor, {})).toThrow("TUTORIAL_REPORT_SECRET is required for tutorial reporting");
  });

  it("requires the worker URL and token before it prepares a tutorial report", () => {
    vi.stubEnv("TUTORIAL_REPORT_SECRET", "secret-value-that-is-long-enough-123");
    vi.stubEnv("TUTORIAL_REPOSITORY_WORKER_URL", "");
    const handlers = createCodecampActivityHandlers(harness.tenantDb({ schoolId: null }));
    expect(() => handlers.prepareTutorial(platformActor, {})).toThrow("TUTORIAL_REPOSITORY_WORKER_URL is required for tutorial reporting");
    vi.stubEnv("TUTORIAL_REPOSITORY_WORKER_URL", "https://worker.example.test");
    vi.stubEnv("TUTORIAL_REPOSITORY_WORKER_TOKEN", "");
    expect(() => handlers.prepareTutorial(platformActor, {})).toThrow("TUTORIAL_REPOSITORY_WORKER_TOKEN is required for tutorial reporting");
  });
});
