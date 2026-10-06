import { describe, expect, it } from "vitest";
import type { DB } from "@reading-advantage/db";
import type { UserContext } from "@reading-advantage/auth";
import { createMockDb } from "../../__tests__/mock-db.js";
import { getClassVoiceUsage, getSchoolVoiceCosts, safetyEventCount, summarizeVoiceOperations, type VoiceOperationRow } from "../views.js";

const SCHOOL = "11111111-1111-4111-8111-111111111111";
const CLASS = "44444444-4444-4444-8444-444444444444";
const now = new Date("2026-10-05T03:00:00.000Z");
const teacher: UserContext = { id: "t1", username: "t1", name: "Kru Ann", role: "TEACHER", schoolId: SCHOOL, xp: 0, level: 1, cefrLevel: "A1" };
const admin: UserContext = { ...teacher, id: "a1", role: "ADMIN" };
const student: UserContext = { ...teacher, id: "s1", role: "STUDENT" };

const op = (extra: Partial<VoiceOperationRow> = {}): VoiceOperationRow => ({
  voiceSessionId: "v1",
  createdAt: now,
  startedAt: now,
  status: "ENDED",
  endReason: "USER_ENDED",
  consumedSeconds: 120,
  summary: { summaryTh: "x" },
  providerUsage: { measuredRealtimeCostUsd: 0.1, measuredTranscriptionCostUsd: 0.02, safetyEvents: { PROFANITY: 1 } },
  ...extra,
});

describe("summarizeVoiceOperations (Tutor port)", () => {
  it("counts starts, failed starts, disconnects, summary failures, and measured cost", () => {
    const rows = [
      op(),
      op({ voiceSessionId: "v2", endReason: "CONNECTION_LOST", summary: null, providerUsage: { measuredRealtimeCostUsd: 0.2 } }),
      op({ voiceSessionId: "v3", startedAt: null, status: "PROVIDER_FAILED", endReason: "PROVIDER_FAILED" }),
      op({ voiceSessionId: "v4", startedAt: null, status: "ENDED", endReason: "LEASE_EXPIRED" }),
      op({ voiceSessionId: "v5", providerUsage: { usageComplete: false } }),
    ];
    const s = summarizeVoiceOperations(rows);
    expect(s).toMatchObject({ attempts: 5, started: 3, failedStarts: 2, finished: 3, disconnected: 1, summaryFailures: 1, measuredCostSessions: 2, missingCostSessions: 1, missingTranscriptionCostSessions: 1 });
    expect(s.failedStartRate).toBeCloseTo(0.4);
    expect(s.disconnectRate).toBeCloseTo(1 / 3);
    expect(s.totalMeasuredCostUsd).toBeCloseTo(0.32);
    expect(s.averageMeasuredCostUsd).toBeCloseTo(0.16);
    expect(s.recentSessions[0]).toMatchObject({ sessionId: "v1", summaryAvailable: true });
    expect(s.recentSessions[0]!.measuredCostUsd).toBeCloseTo(0.12);
    expect(summarizeVoiceOperations([]).averageMeasuredCostUsd).toBeNull();
  });

  it("counts safety events without content", () => {
    expect(safetyEventCount({ safetyEvents: { PROFANITY: 2, NO_SPEECH: 1 } })).toBe(3);
    expect(safetyEventCount({ safetyEvents: "bad" })).toBe(0);
    expect(safetyEventCount(null)).toBe(0);
  });
});

describe("getClassVoiceUsage (FR-13)", () => {
  const classRow = { id: CLASS, schoolId: SCHOOL, teacherId: "t1" };
  const members = [
    { userId: "s1", name: "Ann", username: "ann" },
    { userId: "s2", name: null, username: "bo" },
    { userId: "s3", name: "Chai", username: "chai" },
  ];
  const usage = [
    { userId: "s1", secondsUsed: 300, sessionCount: 2 },
    { userId: "s2", secondsUsed: 60, sessionCount: 1 },
  ];
  const sessions = [
    { userId: "s1", endedAt: new Date("2026-10-03T04:00:00.000Z"), scores: { fluency: 4, grammar: 3, vocabulary: 5, pronunciation: 4 }, providerUsage: { safetyEvents: {} } },
    { userId: "s1", endedAt: new Date("2026-10-04T04:00:00.000Z"), scores: { fluency: 3, grammar: 4, vocabulary: 4, pronunciation: 4 }, providerUsage: { safetyEvents: { PROFANITY: 1 } } },
    { userId: "s2", endedAt: new Date("2026-10-02T04:00:00.000Z"), scores: null, providerUsage: null },
  ];

  it("rolls up minutes, sessions, last use, average scores, and the students with no use", async () => {
    const db = createMockDb({ selectSequence: [[classRow], members, usage, sessions] });
    const view = await getClassVoiceUsage({ db: db as unknown as DB, user: teacher, classroomId: CLASS, now });
    expect(view).toMatchObject({ classroomId: CLASS, month: "2026-10", budgetSeconds: 480, totalSeconds: 360, totalSessions: 3, studentCount: 3, studentsWithUse: 2, safetyEvents: 1 });
    expect(view.students.map((s) => s.name)).toEqual(["Ann", "bo", "Chai"]);
    expect(view.students[0]).toMatchObject({ secondsUsed: 300, sessionCount: 2, lastUseAt: new Date("2026-10-04T04:00:00.000Z"), averageScores: { fluency: 3.5, grammar: 3.5, vocabulary: 4.5, pronunciation: 4 }, safetyEvents: 1 });
    expect(view.students[1]).toMatchObject({ secondsUsed: 60, sessionCount: 1, averageScores: null, safetyEvents: 0 });
    expect(view.students[2]).toMatchObject({ secondsUsed: 0, sessionCount: 0, lastUseAt: null, averageScores: null });
    expect(JSON.stringify(view)).not.toContain("summaryTh");
  });

  it("refuses a teacher of another class and a student", async () => {
    const other = createMockDb({ selectSequence: [[{ ...classRow, teacherId: "t9" }], []] });
    await expect(getClassVoiceUsage({ db: other as unknown as DB, user: teacher, classroomId: CLASS, now })).rejects.toMatchObject({ code: "FORBIDDEN" });
    const asStudent = createMockDb({ selectSequence: [[classRow]] });
    await expect(getClassVoiceUsage({ db: asStudent as unknown as DB, user: student, classroomId: CLASS, now })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("returns an empty roll-up for a class with no students", async () => {
    const db = createMockDb({ selectSequence: [[classRow], []] });
    const view = await getClassVoiceUsage({ db: db as unknown as DB, user: teacher, classroomId: CLASS, now });
    expect(view).toMatchObject({ studentCount: 0, studentsWithUse: 0, totalSeconds: 0, students: [] });
  });
});

describe("getSchoolVoiceCosts (FR-14)", () => {
  const usageRows = [
    { schoolId: SCHOOL, schoolName: "QA School A", month: "2026-10", secondsUsed: 360, sessionCount: 3, costThb: 3.004 },
    { schoolId: SCHOOL, schoolName: "QA School A", month: "2026-09", secondsUsed: 100, sessionCount: 1, costThb: 0.8 },
  ];
  const sessionRows = [
    { id: "v1", schoolId: SCHOOL, month: "2026-10", createdAt: now, startedAt: now, status: "ENDED", endReason: "USER_ENDED", consumedSeconds: 120, hasSummary: true, providerUsage: { measuredRealtimeCostUsd: 0.1, safetyEvents: { PROFANITY: 1 } } },
    { id: "v2", schoolId: SCHOOL, month: "2026-10", createdAt: now, startedAt: now, status: "ENDED", endReason: "CONNECTION_LOST", consumedSeconds: 40, hasSummary: false, providerUsage: { measuredRealtimeCostUsd: 0.05 } },
    { id: "v3", schoolId: SCHOOL, month: "2026-10", createdAt: now, startedAt: null, status: "PROVIDER_FAILED", endReason: "PROVIDER_FAILED", consumedSeconds: 0, hasSummary: false, providerUsage: null },
  ];

  it("lists school-months with cost, failures, and disconnects, newest month first", async () => {
    const db = createMockDb({ selectSequence: [usageRows, sessionRows] });
    const view = await getSchoolVoiceCosts({ db: db as unknown as DB, user: admin, now });
    expect(view.months.map((m) => m.month)).toEqual(["2026-10", "2026-09"]);
    expect(view.months[0]).toMatchObject({ schoolName: "QA School A", secondsUsed: 360, sessionCount: 3, costThb: 3, attempts: 3, failedStarts: 1, disconnected: 1, summaryFailures: 1, safetyEvents: 1 });
    expect(view.months[1]).toMatchObject({ attempts: 0, failedStarts: 0 });
    expect(view.operations).toMatchObject({ attempts: 3, started: 2, finished: 2, failedStarts: 1, disconnected: 1 });
  });

  it("refuses teachers and students", async () => {
    const db = createMockDb({ selectSequence: [] });
    await expect(getSchoolVoiceCosts({ db: db as unknown as DB, user: teacher, now })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(getSchoolVoiceCosts({ db: db as unknown as DB, user: student, now })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
