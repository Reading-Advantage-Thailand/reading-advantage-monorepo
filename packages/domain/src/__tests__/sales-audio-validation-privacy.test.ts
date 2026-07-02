// @vitest-environment node
import { describe, it, expect, vi } from "vitest";
import { submitRoleplayAttempt } from "../sales/index.js";
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

const MAX_AUDIO_BYTES = 10 * 1024 * 1024;
const MAX_AUDIO_DURATION_MS = 5 * 60 * 1000;

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

const rubric = {
  id: "rubric-1",
  name: "Discovery Rubric",
  criteriaJson: [],
  reviewStatus: "approved" as const,
  createdAt: new Date(),
};

const evaluation = {
  overallScore: 85,
  passed: false,
  criteria: [],
  summary: "Good effort",
  strengths: ["clear opener"],
  weaknesses: ["rushed close"],
  suggestedNextAction: "Slow down",
  transcriptExcerpt: "Hello director...",
};

function makeMockDb() {
  const attempt = {
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
  return createMockDb({
    selectSequence: [[scenario], [], [scenario], [rubric]],
    insertReturning: [attempt],
    updateReturning: [attempt],
  });
}

const validAudio = {
  buffer: Buffer.from("valid-webm-payload"),
  mimeType: "audio/webm",
};

describe("Sales audio validation and privacy gates", () => {
  it("rejects unsupported MIME type before any provider call", async () => {
    const evaluate = vi.fn().mockResolvedValue(evaluation);
    const db = makeMockDb();
    const invalidAudio = {
      buffer: Buffer.from("not-an-audio"),
      mimeType: "video/mp4",
    };

    let threw = false;
    let providerCallCount = 0;
    try {
      await submitRoleplayAttempt(
        { db: wrapDb(db), user: salesRep, tenant },
        {
          scenarioId: "scenario-1",
          audioStorageKey: null,
          durationMs: 1000,
          audio: invalidAudio,
          consentGiven: true,
          retentionDays: 30,
          evaluate,
        },
      );
    } catch {
      threw = true;
    }
    providerCallCount = evaluate.mock.calls.length;

    expect(
      threw,
      "unsupported MIME must be rejected before provider call",
    ).toBe(true);
    expect(
      providerCallCount,
      `provider call count on rejected media: ${providerCallCount} (expected 0)`,
    ).toBe(0);
  });

  it("rejects oversized audio before any provider call", async () => {
    const evaluate = vi.fn().mockResolvedValue(evaluation);
    const db = makeMockDb();
    const oversizedAudio = {
      buffer: Buffer.alloc(MAX_AUDIO_BYTES + 1, "x"),
      mimeType: "audio/webm",
    };

    let threw = false;
    let providerCallCount = 0;
    try {
      await submitRoleplayAttempt(
        { db: wrapDb(db), user: salesRep, tenant },
        {
          scenarioId: "scenario-1",
          audioStorageKey: null,
          durationMs: 1000,
          audio: oversizedAudio,
          consentGiven: true,
          retentionDays: 30,
          evaluate,
        },
      );
    } catch {
      threw = true;
    }
    providerCallCount = evaluate.mock.calls.length;

    expect(
      threw,
      "oversized audio must be rejected before provider call",
    ).toBe(true);
    expect(
      providerCallCount,
      `provider call count on rejected media: ${providerCallCount} (expected 0)`,
    ).toBe(0);
  });

  it("rejects excessive duration before any provider call", async () => {
    const evaluate = vi.fn().mockResolvedValue(evaluation);
    const db = makeMockDb();

    let threw = false;
    let providerCallCount = 0;
    try {
      await submitRoleplayAttempt(
        { db: wrapDb(db), user: salesRep, tenant },
        {
          scenarioId: "scenario-1",
          audioStorageKey: null,
          durationMs: MAX_AUDIO_DURATION_MS + 1,
          audio: validAudio,
          consentGiven: true,
          retentionDays: 30,
          evaluate,
        },
      );
    } catch {
      threw = true;
    }
    providerCallCount = evaluate.mock.calls.length;

    expect(
      threw,
      "excessive duration must be rejected before provider call",
    ).toBe(true);
    expect(
      providerCallCount,
      `provider call count on rejected media: ${providerCallCount} (expected 0)`,
    ).toBe(0);
  });

  it("rejects audio submission without consent/retention metadata", async () => {
    const evaluate = vi.fn().mockResolvedValue(evaluation);
    const db = makeMockDb();

    let threw = false;
    let providerCallCount = 0;
    try {
      await submitRoleplayAttempt(
        { db: wrapDb(db), user: salesRep, tenant },
        {
          scenarioId: "scenario-1",
          audioStorageKey: null,
          durationMs: 1000,
          audio: validAudio,
          evaluate,
          consentGiven: false,
          retentionDays: undefined,
        } as unknown as Parameters<typeof submitRoleplayAttempt>[1],
      );
    } catch {
      threw = true;
    }
    providerCallCount = evaluate.mock.calls.length;

    expect(
      threw,
      "audio submission must require consent/retention metadata (A2 consent gate)",
    ).toBe(true);
    expect(
      providerCallCount,
      `provider call count on rejected media: ${providerCallCount} (expected 0)`,
    ).toBe(0);
  });
});
