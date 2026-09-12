import { beforeEach, describe, expect, it, vi } from "vitest";
import { assertCan } from "@reading-advantage/auth";

import type { TenantDB } from "../db-contract.js";
import { createClassChallenge, startClassChallengeRun } from "../challenges/mutations.js";
import { listClassChallenges, listStudentChallengeClasses } from "../challenges/queries.js";
import { recordChallengeContribution } from "../challenges/contributions.js";
import { createMockDb } from "./mock-db.js";

vi.mock("@reading-advantage/auth", () => ({
  assertCan: vi.fn(),
  ROLES: { STUDENT: "STUDENT", TEACHER: "TEACHER", ADMIN: "ADMIN", SYSTEM: "SYSTEM" },
  registerDomainModulePermissions: vi.fn(),
}));

const schoolId = "10000000-0000-4000-8000-000000000001";
const classId = "20000000-0000-4000-8000-000000000002";
const challengeId = "30000000-0000-4000-8000-000000000003";
const teacher = { id: "teacher-1", role: "TEACHER" as const, schoolId };
const student = { id: "student-1", role: "STUDENT" as const, schoolId };
const tenant = { schoolId };
const modality = {
  modality: "reading" as const,
  promptLocale: "th-TH" as const,
  answerLocale: "en-US" as const,
  promptField: "translation" as const,
  answerField: "term" as const,
  scored: true as const,
};
const input = {
  classId,
  title: "River flight",
  gameId: "dragon-flight" as const,
  gameVersion: "1",
  contentLocale: "th" as const,
  content: { mode: "vocabulary" as const, items: [{ term: "river", translation: "แม่น้ำ" }] },
  seed: 42,
  difficulty: "medium" as const,
  modality,
  startsAt: "2026-09-09T08:00:00.000Z",
  expiresAt: "2026-09-10T08:00:00.000Z",
  target: 20,
  teacherParticipationEnabled: false,
};
const saved = {
  id: challengeId,
  schoolId,
  createdByUserId: teacher.id,
  ...input,
  contentMode: input.content.mode,
  contentJson: input.content,
  modalityJson: modality,
  startsAt: new Date(input.startsAt),
  expiresAt: new Date(input.expiresAt),
};
const runId = "40000000-0000-4000-8000-000000000004";
const resolveGameCapability = vi.fn(() => ({
  version: input.gameVersion,
  inputMode: input.content.mode,
  modalities: ["reading" as const],
}));

function runDb(overrides: { stored?: unknown[]; classroom?: unknown[]; membership?: unknown[] } = {}) {
  const db = createMockDb({
    selectSequence: [
      overrides.stored ?? [saved],
      overrides.classroom ?? [{ teacherId: teacher.id }],
      overrides.membership ?? [{ studentId: student.id }],
      [{ contributionCount: 2 }],
    ],
    insertReturning: [{ id: runId, expiresAt: new Date(input.expiresAt) }],
  });
  Object.assign(db, { unscoped: vi.fn(() => db) });
  return db;
}

const challengeRun = {
  id: runId,
  schoolId,
  challengeId,
  userId: student.id,
  expiresAt: new Date(input.expiresAt),
  createdAt: new Date("2026-09-09T08:30:00.000Z"),
};
const completion = {
  id: "50000000-0000-4000-8000-000000000005",
  schoolId,
  userId: student.id,
  gameType: input.gameId,
  difficulty: input.difficulty,
  victory: true,
  correctAnswers: 1,
  totalAttempts: 1,
  createdAt: new Date("2026-09-09T08:59:00.000Z"),
};
const answerAudioEvidence = {
  schemaVersion: 1 as const,
  declaredModality: "read-to-select-audio" as const,
  effectiveModality: "read-to-select-audio" as const,
  promptLocale: "th-TH" as const,
  answerLocale: "en-US" as const,
  promptField: "translation" as const,
  answerField: "term" as const,
  itemCount: 1,
  questions: [{
    questionPosition: 0,
    promptItemPosition: 0,
    selectionAttempts: [{
      attemptIndex: 0,
      clipItemPosition: 0,
      playbackResult: "completed" as const,
      submitted: true,
      completedQuestion: true,
    }],
  }],
  replayCounts: [],
  audioFailures: [],
};

function contributionDb(options: {
  run?: unknown;
  definition?: unknown;
  membership?: unknown[];
  inserted?: unknown[];
} = {}) {
  const db = createMockDb({
    selectSequence: [
      [options.run ?? challengeRun],
      [options.definition ?? saved],
      [{ teacherId: teacher.id }],
      options.membership ?? [{ studentId: student.id }],
    ],
    conflictInsertReturning: options.inserted ?? [{ id: "60000000-0000-4000-8000-000000000006" }],
  });
  Object.assign(db, { unscoped: vi.fn(() => db) });
  return db;
}

describe("class challenge teacher and member boundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists one bounded page of active student classes", async () => {
    const rows = [
      { id: "21000000-0000-4000-8000-000000000001", name: "Alpha" },
      { id: "21000000-0000-4000-8000-000000000002", name: "Beta" },
      { id: "21000000-0000-4000-8000-000000000003", name: "Gamma" },
    ];
    const db = createMockDb({ selectResults: rows });
    Object.assign(db, { unscoped: vi.fn(() => db) });

    await expect(listStudentChallengeClasses({
      db: db as unknown as TenantDB,
      user: student as never,
      tenant,
      input: { limit: 2, offset: 0 },
    })).resolves.toEqual({ classes: rows.slice(0, 2), hasMore: true });
    expect(db.unscoped).toHaveBeenCalledWith(expect.stringContaining("classroomStudents is REFERENTIAL"));
    expect(assertCan).toHaveBeenCalledWith(student, "challenges:read", tenant);
  });

  it("creates a public summary for a teacher-owned tenant class", async () => {
    const db = createMockDb({
      selectResults: [{ teacherId: teacher.id }],
      insertReturning: [saved],
    });
    const result = await createClassChallenge({
      db: db as unknown as TenantDB,
      user: teacher as never,
      tenant,
      input,
    });

    expect(result).toMatchObject({ id: challengeId, classId, contributionCount: 0 });
    expect(result).not.toHaveProperty("content");
    expect(assertCan).toHaveBeenCalledWith(teacher, "challenges:create", tenant);
  });

  it("returns the stored challenge for an equivalent creation-key retry", async () => {
    const creationKey = "70000000-0000-4000-8000-000000000007";
    const stored = { ...saved, creationKey };
    const firstDb = createMockDb({
      selectResults: [{ teacherId: teacher.id }],
      conflictInsertReturning: [stored],
    });
    const retryDb = createMockDb({
      selectSequence: [[{ teacherId: teacher.id }], [stored]],
      conflictInsertReturning: [],
    });
    const normalizedInput = {
      ...input,
      creationKey,
      startsAt: "2026-09-09T15:00:00.000+07:00",
      expiresAt: "2026-09-10T15:00:00.000+07:00",
    };
    const first = await createClassChallenge({
      db: firstDb as unknown as TenantDB,
      user: teacher as never,
      tenant,
      input: normalizedInput,
    });
    const retry = await createClassChallenge({
      db: retryDb as unknown as TenantDB,
      user: teacher as never,
      tenant,
      input: normalizedInput,
    });

    expect(retry).toEqual(first);
    expect(retry).toMatchObject({ id: challengeId, title: input.title });
    expect(retryDb.insert).toHaveBeenCalledTimes(1);
    expect(retryDb.select).toHaveBeenCalledTimes(2);
  });

  it("rejects different settings for the same creation key", async () => {
    const creationKey = "70000000-0000-4000-8000-000000000007";
    const db = createMockDb({
      selectSequence: [[{ teacherId: teacher.id }], [{ ...saved, creationKey }]],
      conflictInsertReturning: [],
    });

    await expect(createClassChallenge({
      db: db as unknown as TenantDB,
      user: teacher as never,
      tenant,
      input: { ...input, creationKey, title: "Different challenge" },
    })).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("rejects creation for a nonowner or cross-school class", async () => {
    const nonownerDb = createMockDb({ selectResults: [{ teacherId: "teacher-2" }] });
    await expect(createClassChallenge({
      db: nonownerDb as unknown as TenantDB,
      user: teacher as never,
      tenant,
      input,
    })).rejects.toThrow("Forbidden");
    expect(nonownerDb.insert).not.toHaveBeenCalled();
    const crossSchoolDb = createMockDb({ selectResults: [] });
    await expect(createClassChallenge({
      db: crossSchoolDb as unknown as TenantDB,
      user: teacher as never,
      tenant,
      input,
    })).rejects.toThrow("Class not found");
    expect(crossSchoolDb.insert).not.toHaveBeenCalled();
  });

  it("denies creation before database writes when permission fails", async () => {
    vi.mocked(assertCan).mockImplementationOnce(() => {
      throw new Error("Permission denied");
    });
    const db = createMockDb({ selectResults: [{ teacherId: teacher.id }] });
    await expect(createClassChallenge({
      db: db as unknown as TenantDB,
      user: teacher as never,
      tenant,
      input,
    })).rejects.toThrow("Permission denied");
    expect(db.select).not.toHaveBeenCalled();
    expect(db.insert).not.toHaveBeenCalled();
  });

  it("returns summaries without stored answers for an enrolled student", async () => {
    const definition = {
      id: challengeId,
      classId,
      title: input.title,
      gameId: input.gameId,
      gameVersion: input.gameVersion,
      contentMode: input.content.mode,
      contentLocale: input.contentLocale,
      contentItemCount: 1,
      seed: input.seed,
      difficulty: input.difficulty,
      modalityJson: modality,
      startsAt: new Date(input.startsAt),
      expiresAt: new Date(input.expiresAt),
      target: input.target,
      contributionCount: 2,
    };
    const db = createMockDb({
      selectSequence: [
        [{ teacherId: teacher.id }],
        [{ studentId: student.id }],
        [definition],
      ],
    });
    Object.assign(db, { unscoped: vi.fn(() => db) });
    const result = await listClassChallenges({
      db: db as unknown as TenantDB,
      user: student as never,
      tenant,
      input: { classId },
    });

    expect(result).toEqual([expect.objectContaining({ id: challengeId, contributionCount: 2 })]);
    expect(result[0]).not.toHaveProperty("content");
    expect(JSON.stringify(result)).not.toContain("river");
    expect(JSON.stringify(result)).not.toContain("แม่น้ำ");
    expect(assertCan).toHaveBeenCalledWith(student, "challenges:read", tenant);
  });

  it("rejects a student who is not a tenant-bound class member", async () => {
    const db = createMockDb({ selectSequence: [[{ teacherId: teacher.id }], []] });
    Object.assign(db, { unscoped: vi.fn(() => db) });
    await expect(listClassChallenges({
      db: db as unknown as TenantDB,
      user: student as never,
      tenant,
      input: { classId },
    })).rejects.toThrow("Forbidden");
  });

  it("starts an active run with stored content and installed game facts", async () => {
    const db = runDb();
    const result = await startClassChallengeRun({
      db: db as unknown as TenantDB,
      user: student as never,
      tenant,
      input: { challengeId },
      now: () => new Date("2026-09-09T09:00:00.000Z"),
      resolveGameCapability,
    });

    expect(result).toMatchObject({
      runId,
      challengeId,
      userId: student.id,
      content: input.content,
      challenge: { seed: input.seed, gameVersion: input.gameVersion, contributionCount: 2 },
    });
    expect(assertCan).toHaveBeenCalledWith(student, "challenges:start", tenant);
  });

  it.each([
    ["early", "2026-09-09T07:59:59.000Z", "not started"],
    ["expired", "2026-09-10T08:00:00.000Z", "expired"],
  ])("rejects an %s challenge run", async (_label, timestamp, message) => {
    const db = runDb();
    await expect(startClassChallengeRun({
      db: db as unknown as TenantDB,
      user: student as never,
      tenant,
      input: { challengeId },
      now: () => new Date(timestamp),
      resolveGameCapability,
    })).rejects.toThrow(message);
    expect(db.insert).not.toHaveBeenCalled();
  });

  it("rejects a cross-school or nonmember run", async () => {
    const crossSchoolDb = runDb({ stored: [] });
    await expect(startClassChallengeRun({
      db: crossSchoolDb as unknown as TenantDB,
      user: student as never,
      tenant,
      input: { challengeId },
      resolveGameCapability,
    })).rejects.toThrow("Challenge not found");
    const nonmemberDb = runDb({ membership: [] });
    await expect(startClassChallengeRun({
      db: nonmemberDb as unknown as TenantDB,
      user: student as never,
      tenant,
      input: { challengeId },
      resolveGameCapability,
    })).rejects.toThrow("Forbidden");
    expect(nonmemberDb.insert).not.toHaveBeenCalled();
  });

  it("rejects a teacher run when participation is disabled", async () => {
    const db = runDb();
    await expect(startClassChallengeRun({
      db: db as unknown as TenantDB,
      user: teacher as never,
      tenant,
      input: { challengeId },
      resolveGameCapability,
    })).rejects.toThrow("Teacher participation is disabled");
    expect(db.insert).not.toHaveBeenCalled();
  });

  it("rejects malformed persisted or unavailable game definitions", async () => {
    const malformedDb = runDb({ stored: [{ ...saved, contentJson: { mode: "vocabulary", items: [] } }] });
    await expect(startClassChallengeRun({
      db: malformedDb as unknown as TenantDB,
      user: student as never,
      tenant,
      input: { challengeId },
      resolveGameCapability,
    })).rejects.toThrow();
    expect(malformedDb.insert).not.toHaveBeenCalled();
    const unavailableDb = runDb();
    await expect(startClassChallengeRun({
      db: unavailableDb as unknown as TenantDB,
      user: student as never,
      tenant,
      input: { challengeId },
      resolveGameCapability: () => ({ ...resolveGameCapability(), version: "different" }),
    })).rejects.toThrow("configuration is unavailable");
    expect(unavailableDb.insert).not.toHaveBeenCalled();
  });

  it("records one eligible victorious language contribution", async () => {
    const db = contributionDb();
    await expect(recordChallengeContribution({
      tx: db as unknown as TenantDB,
      user: student as never,
      tenant,
      completion,
      runId,
      now: () => new Date("2026-09-09T09:00:00.000Z"),
    })).resolves.toEqual({ status: "contributed", challengeId });
  });

  it("ignores a replay after the unique contribution insert wins", async () => {
    const db = contributionDb({ inserted: [] });
    await expect(recordChallengeContribution({
      tx: db as unknown as TenantDB,
      user: student as never,
      tenant,
      completion,
      runId,
      now: () => new Date("2026-09-09T09:00:00.000Z"),
    })).resolves.toEqual({ status: "ignored", reason: "duplicate" });
  });

  it("ignores a run or completion owned by another learner", async () => {
    const db = contributionDb({ run: { ...challengeRun, userId: "student-2" } });
    await expect(recordChallengeContribution({
      tx: db as unknown as TenantDB,
      user: student as never,
      tenant,
      completion,
      runId,
    })).resolves.toEqual({ status: "ignored", reason: "wrong-owner" });
    expect(db.insert).not.toHaveBeenCalled();
  });

  it("ignores mismatched, defeated, and zero-attempt completions", async () => {
    for (const [patch, reason] of [
      [{ gameType: "wizard-vs-zombie" }, "completion-mismatch"],
      [{ difficulty: "hard" }, "completion-mismatch"],
      [{ victory: false }, "unsuccessful-completion"],
      [{ totalAttempts: 0, correctAnswers: 0 }, "unsuccessful-completion"],
      [{ metadata: { learningEvidence: { effectiveModality: "reading" } } }, "modality-mismatch"],
    ] as const) {
      const db = contributionDb();
      await expect(recordChallengeContribution({
        tx: db as unknown as TenantDB,
        user: student as never,
        tenant,
        completion: { ...completion, ...patch },
        runId,
        now: () => new Date("2026-09-09T09:00:00.000Z"),
      })).resolves.toEqual({ status: "ignored", reason });
      expect(db.insert).not.toHaveBeenCalled();
    }
  });

  it("ignores an expired run without rejecting the saved completion", async () => {
    const db = contributionDb();
    await expect(recordChallengeContribution({
      tx: db as unknown as TenantDB,
      user: student as never,
      tenant,
      completion,
      runId,
      now: () => new Date(input.expiresAt),
    })).resolves.toEqual({ status: "ignored", reason: "not-active" });
    expect(db.insert).not.toHaveBeenCalled();
  });

  it("ignores a completion saved before the server issued its run", async () => {
    const db = contributionDb();
    await expect(recordChallengeContribution({
      tx: db as unknown as TenantDB,
      user: student as never,
      tenant,
      completion: { ...completion, createdAt: new Date("2026-09-09T08:29:59.000Z") },
      runId,
      now: () => new Date("2026-09-09T09:00:00.000Z"),
    })).resolves.toEqual({ status: "ignored", reason: "not-active" });
    expect(db.insert).not.toHaveBeenCalled();
  });

  it("ignores an invalid definition or removed class membership", async () => {
    const invalidDb = contributionDb({ definition: { ...saved, contentJson: { mode: "vocabulary", items: [] } } });
    await expect(recordChallengeContribution({
      tx: invalidDb as unknown as TenantDB,
      user: student as never,
      tenant,
      completion,
      runId,
    })).resolves.toEqual({ status: "ignored", reason: "invalid-definition" });
    const invalidDateDb = contributionDb({ definition: { ...saved, startsAt: new Date("invalid") } });
    await expect(recordChallengeContribution({
      tx: invalidDateDb as unknown as TenantDB,
      user: student as never,
      tenant,
      completion,
      runId,
    })).resolves.toEqual({ status: "ignored", reason: "invalid-definition" });
    const nonmemberDb = contributionDb({ membership: [] });
    await expect(recordChallengeContribution({
      tx: nonmemberDb as unknown as TenantDB,
      user: student as never,
      tenant,
      completion,
      runId,
    })).resolves.toEqual({ status: "ignored", reason: "ineligible-member" });
    expect(invalidDb.insert).not.toHaveBeenCalled();
    expect(invalidDateDb.insert).not.toHaveBeenCalled();
    expect(nonmemberDb.insert).not.toHaveBeenCalled();
  });

  it("records complete answer-audio evidence for pinned content", async () => {
    const db = contributionDb({ definition: { ...saved, modalityJson: {
      modality: "read-to-select-audio", promptLocale: "th-TH", answerLocale: "en-US",
      promptField: "translation", answerField: "term", scored: true,
    } } });
    await expect(recordChallengeContribution({
      tx: db as unknown as TenantDB,
      user: student as never,
      tenant,
      completion: { ...completion, metadata: { learningEvidence: answerAudioEvidence } },
      runId,
      now: () => new Date("2026-09-09T09:00:00.000Z"),
    })).resolves.toEqual({ status: "contributed", challengeId });
  });

  it("ignores answer-audio evidence with a different pinned item count", async () => {
    const db = contributionDb({ definition: { ...saved, modalityJson: {
      modality: "read-to-select-audio", promptLocale: "th-TH", answerLocale: "en-US",
      promptField: "translation", answerField: "term", scored: true,
    } } });
    await expect(recordChallengeContribution({
      tx: db as unknown as TenantDB,
      user: student as never,
      tenant,
      completion: { ...completion, metadata: { learningEvidence: { ...answerAudioEvidence, itemCount: 2 } } },
      runId,
      now: () => new Date("2026-09-09T09:00:00.000Z"),
    })).resolves.toEqual({ status: "ignored", reason: "modality-mismatch" });
    expect(db.insert).not.toHaveBeenCalled();
  });
});
