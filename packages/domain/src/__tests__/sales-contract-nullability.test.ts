// @vitest-environment node
import { describe, it, expect } from "vitest";
import {
  roleplayAttemptInputSchema,
  roleplayAttemptOutputSchema as domainOutputSchema,
} from "../sales/schema.js";
import { roleplayAttemptOutputSchema as typesOutputSchema } from "@reading-advantage/types";
import { salesRoleplayAttempts } from "@reading-advantage/db/schema";
import { createRoleplayAttempt } from "../sales/index.js";
import { createMockDb } from "./mock-db.js";
import { createTenantDB } from "../db-contract.js";
import type { DB } from "@reading-advantage/db";

const salesRep = {
  id: "rep-1",
  username: "rep1",
  name: "Rep One",
  role: "SALES_REP" as const,
  schoolId: "school-1",
  xp: 0,
  level: 1,
  cefrLevel: "A1" as const,
};

const tenant = { schoolId: "school-1" };

function wrapDb(db: ReturnType<typeof createMockDb>) {
  return createTenantDB(db as unknown as DB, tenant);
}

const scenario = {
  id: "scenario-1",
  lessonId: "lesson-1",
  personaName: "Director",
  personaRole: "Principal",
  situation: "Budget review",
  objective: "Book a meeting",
  prospectContextJson: {},
  rubricId: "rubric-1",
  order: 1,
  createdAt: new Date(),
};

const moduleRow = {
  id: "module-1",
  slug: "foundation",
  title: "Foundation",
  description: "Foundation",
  phase: "Foundations",
  order: 1,
  createdAt: new Date(),
};

const lesson = {
  id: "lesson-1",
  moduleId: moduleRow.id,
  title: "Roleplay",
  type: "roleplay",
  content: "Practice",
  order: 1,
  reviewStatus: "approved",
  createdAt: new Date(),
};

const rubric = {
  id: "rubric-1",
  name: "Discovery",
  criteriaJson: [],
  reviewStatus: "approved",
  createdAt: new Date(),
};

describe("Sales audioStorageKey nullability contract", () => {
  it("domain input schema accepts null audioStorageKey", () => {
    const result = roleplayAttemptInputSchema.safeParse({
      scenarioId: "d7f0fc0c-0000-0000-0000-000000000001",
      audioStorageKey: null,
      durationMs: 1000,
    });
    expect(result.success, "roleplayAttemptInputSchema must accept null audioStorageKey").toBe(true);
  });

  it("domain output schema accepts null audioStorageKey", () => {
    const result = domainOutputSchema.safeParse({
      id: "attempt-1",
      scenarioId: "scenario-1",
      userId: salesRep.id,
      audioStorageKey: null,
      durationMs: 1000,
      transcriptExcerpt: null,
      llmScoreJson: null,
      overallScore: null,
      passed: null,
      llmFeedback: null,
      attemptNumber: 1,
      createdAt: new Date(),
    });
    expect(result.success, "domain roleplayAttemptOutputSchema must accept null audioStorageKey").toBe(true);
  });

  it("types output schema accepts null audioStorageKey", () => {
    const result = typesOutputSchema.safeParse({
      id: "attempt-1",
      scenarioId: "scenario-1",
      userId: salesRep.id,
      audioStorageKey: null,
      durationMs: 1000,
      transcriptExcerpt: null,
      llmScoreJson: null,
      overallScore: null,
      passed: null,
      llmFeedback: null,
      attemptNumber: 1,
      createdAt: new Date(),
    });
    expect(result.success, "types roleplayAttemptOutputSchema must accept null audioStorageKey").toBe(true);
  });

  it("DB audioStorageKey column is nullable", () => {
    const column = salesRoleplayAttempts.audioStorageKey as unknown as { notNull?: boolean };
    expect(
      column.notNull,
      "salesRoleplayAttempts.audioStorageKey must be nullable in the Drizzle schema",
    ).not.toBe(true);
  });

  it("createRoleplayAttempt returns null audioStorageKey when given null", async () => {
    const row = {
      id: "attempt-1",
      scenarioId: "scenario-1",
      userId: salesRep.id,
      audioStorageKey: null,
      durationMs: 1000,
      transcriptExcerpt: null,
      llmScoreJson: null,
      overallScore: null,
      passed: null,
      llmFeedback: null,
      attemptNumber: 1,
      createdAt: new Date(),
    };
    const db = createMockDb({
      selectSequence: [
        [scenario],
        [lesson],
        [moduleRow],
        [lesson],
        [],
        [rubric],
      ],
      insertReturning: [row],
    });
    const result = await createRoleplayAttempt(
      { db: wrapDb(db), user: salesRep, tenant },
      { scenarioId: "scenario-1", audioStorageKey: null, durationMs: 1000 },
    );
    expect(result.audioStorageKey).toBeNull();
  });

  it("types package exports roleplayAttemptInputSchema for cross-app parity", async () => {
    const typesModule = await import("@reading-advantage/types");
    expect(
      typesModule.roleplayAttemptInputSchema,
      "@reading-advantage/types must export roleplayAttemptInputSchema so callers can validate audioStorageKey nullability at the wire boundary",
    ).toBeDefined();
  });
});
