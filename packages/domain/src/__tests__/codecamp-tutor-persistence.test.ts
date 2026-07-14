import { describe, expect, it, vi } from "vitest";
import type { DB } from "@reading-advantage/db";
import { createTenantDB } from "../db-contract.js";
import {
  buildCodecampTutorContext,
  joinTutorInterventionToVerifiedEvidence,
  persistTutorIntervention,
  recordTutorResourceUse,
} from "../codecamp/tutor.js";

const globalTenant = { schoolId: null };
const learner = {
  id: "learner-1",
  username: "learner-1",
  name: "Learner One",
  role: "INTERN" as const,
  schoolId: null,
  xp: 0,
  level: 1,
  cefrLevel: "A1" as const,
};
const interventionId = "11111111-1111-4111-8111-111111111111";
const sessionId = "22222222-2222-4222-8222-222222222222";

/** Creates the minimal raw Drizzle shape used by the tutor's manual-scope commands. */
function createTutorPersistenceDb(selectRows: unknown[][], insertedRow: unknown = { id: "saved" }) {
  let selectIndex = 0;
  const returning = vi.fn().mockResolvedValue([insertedRow]);
  const insertValues = vi.fn().mockReturnValue({
    returning,
    onConflictDoNothing: vi.fn().mockReturnValue({ returning }),
  });
  const db = {
    select: vi.fn().mockImplementation(() => {
      const rows = selectRows[selectIndex++] ?? [];
      return {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue(rows),
            orderBy: vi.fn().mockResolvedValue(rows),
          }),
        }),
      };
    }),
    insert: vi.fn().mockReturnValue({ values: insertValues }),
    transaction: vi.fn().mockImplementation((operation: (transaction: typeof db) => Promise<unknown>) => operation(db)),
  };
  return { db, insertValues };
}

function tutorContext() {
  return {
    objective: { id: "codecamp.game-development.skill.apk-contract", title: "Manifest", description: "Verify the manifest." },
    activity: { id: "codecamp.activity.apk.wedo", version: "1.0.0", mode: "guided" as const, graphVersion: "apk-graph.v1", stepId: "wedo.apk.manifest" },
    locale: "en" as const,
    attempts: [],
    scaffoldHistory: [],
    resources: [{ id: "diagram:apk.boundaries", kind: "diagram" as const, title: "Boundary", action: { type: "highlight" as const, target: "diagram.apk.boundaries" } }],
    versions: { promptPolicy: "codecamp-tutor-policy.v1", schema: "codecamp-tutor-response.v1", resources: "apk-resources.v1" },
  };
}

describe("Codecamp tutor persistence boundaries", () => {
  it("builds compact context only from the learner-owned durable tutorial session and persisted support history", async () => {
    const { db } = createTutorPersistenceDb([
      [{
        id: sessionId,
        activityId: "codecamp.activity.apk.wedo",
        activityVersion: "1.0.0",
        stateJson: { assessedCheckpointResults: {}, assessedTutorialResults: { "wedo.apk.manifest": { isCorrect: false } } },
      }],
      [{ interventionLevel: 2 }],
    ]);

    await expect(buildCodecampTutorContext({
      db: createTenantDB(db as unknown as DB, globalTenant),
      user: learner,
      tenant: globalTenant,
      input: { activitySessionId: sessionId, locale: "en", stepId: "wedo.apk.manifest" },
    })).resolves.toMatchObject({
      activity: { id: "codecamp.activity.apk.wedo", stepId: "wedo.apk.manifest", mode: "guided" },
      scaffoldHistory: ["location_hint"],
      attempts: expect.arrayContaining([{ checkId: "wedo.apk.manifest", status: "failed" }]),
    });
  });

  it("returns an existing owned intervention for a replayed request without inserting a second record", async () => {
    const existing = { id: interventionId, requestId: "33333333-3333-4333-8333-333333333333" };
    const { db, insertValues } = createTutorPersistenceDb([[existing]]);

    await expect(persistTutorIntervention({
      db: createTenantDB(db as unknown as DB, globalTenant),
      user: learner,
      tenant: globalTenant,
      input: {
        requestId: existing.requestId,
        activitySessionId: sessionId,
        context: tutorContext(),
        intervention: { message: "Try the boundary diagram.", level: "conceptual_hint", diagnosticQuestion: "Which side persists?", misconceptionTags: [], resource: null },
        provenance: { modelAlias: "xiaomi/mimo-v2.5", resolvedModel: "xiaomi/mimo-v2.5" },
      },
    })).resolves.toEqual(existing);
    expect(insertValues).not.toHaveBeenCalled();
  });

  it("persists a first intervention only after the owned session matches the server-derived activity context", async () => {
    const saved = { id: interventionId, requestId: "44444444-4444-4444-8444-444444444444" };
    const { db, insertValues } = createTutorPersistenceDb([[], [{ id: sessionId }]], saved);

    await expect(persistTutorIntervention({
      db: createTenantDB(db as unknown as DB, globalTenant), user: learner, tenant: globalTenant,
      input: {
        requestId: saved.requestId, activitySessionId: sessionId, context: tutorContext(),
        intervention: { message: "Use the trusted boundary diagram.", level: "location_hint", diagnosticQuestion: "Where is the host boundary?", misconceptionTags: ["host-cartridge-boundary"], resource: { resourceId: "diagram:apk.boundaries" } },
        provenance: { modelAlias: "xiaomi/mimo-v2.5", resolvedModel: "xiaomi/mimo-v2.5", provider: "openrouter", latencyMs: 42 },
      },
    })).resolves.toEqual(saved);
    expect(insertValues).toHaveBeenCalledWith(expect.objectContaining({
      tenantKey: "codecamp",
      userId: learner.id,
      activitySessionId: sessionId,
      recommendedResourceId: "diagram:apk.boundaries",
      interventionLevel: 2,
    }));
  });

  it("records a resource use only when it matches the learner-owned recommendation", async () => {
    const { db, insertValues } = createTutorPersistenceDb([[{ id: interventionId, recommendedResourceId: "diagram:apk.boundaries" }]], { id: "resource-use" });

    await expect(recordTutorResourceUse({
      db: createTenantDB(db as unknown as DB, globalTenant), user: learner, tenant: globalTenant,
      input: { interventionId, resourceId: "diagram:apk.boundaries", actionType: "highlight" },
    })).resolves.toEqual({ id: "resource-use" });
    expect(insertValues).toHaveBeenCalledWith({ interventionId, resourceId: "diagram:apk.boundaries", actionType: "highlight" });

    const rejected = createTutorPersistenceDb([[{ id: interventionId, recommendedResourceId: "diagram:apk.boundaries" }]]);
    await expect(recordTutorResourceUse({
      db: createTenantDB(rejected.db as unknown as DB, globalTenant), user: learner, tenant: globalTenant,
      input: { interventionId, resourceId: "diagram:invented", actionType: "highlight" },
    })).rejects.toThrow("not available");
  });

  it("joins support to a verified owned tutorial event without creating correctness on its own", async () => {
    const { db, insertValues } = createTutorPersistenceDb([
      [{ id: interventionId }],
      [{ id: "event-1", isAssessed: true, submissionId: "submission-1" }],
    ], { id: "join-1" });

    await expect(joinTutorInterventionToVerifiedEvidence({
      db: createTenantDB(db as unknown as DB, globalTenant), user: learner, tenant: globalTenant,
      input: { interventionId, activitySessionId: sessionId, verifiedSubmissionId: "submission-1" },
    })).resolves.toEqual({ id: "join-1" });
    expect(insertValues).toHaveBeenCalledWith({
      interventionId,
      activitySessionId: sessionId,
      verifiedSubmissionId: "submission-1",
      verifiedEventId: "tutorial:submission-1",
    });

    const missingVerifiedEvent = createTutorPersistenceDb([[{ id: interventionId }], []]);
    await expect(joinTutorInterventionToVerifiedEvidence({
      db: createTenantDB(missingVerifiedEvent.db as unknown as DB, globalTenant), user: learner, tenant: globalTenant,
      input: { interventionId, activitySessionId: sessionId, verifiedSubmissionId: "submission-1" },
    })).rejects.toThrow("Verified activity evidence not found");
    expect(missingVerifiedEvent.insertValues).not.toHaveBeenCalled();
  });
});
