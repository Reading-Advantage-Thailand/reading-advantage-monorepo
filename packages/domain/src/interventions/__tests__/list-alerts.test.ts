import type { UserContext } from "@reading-advantage/auth";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createTestDb, type TestDb } from "../../__tests__/helpers/testDb.js";

const holder = vi.hoisted(() => ({ db: null as unknown }));

vi.mock("@reading-advantage/db", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return { ...actual, get db() { return holder.db; } };
});

const { schools, users, scienceClasses, scienceClassStudents, scienceStandards, scienceStandardMastery } = await import("@reading-advantage/db");
const { listAlerts } = await import("../list-alerts.js");

const SCHOOL = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const OTHER_SCHOOL = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const CLASS_ID = "c1c1c1c1-c1c1-4c1c-8c1c-c1c1c1c1c1c1";
const EMPTY_CLASS_ID = "c2c2c2c2-c2c2-4c2c-8c2c-c2c2c2c2c2c2";
const STANDARD_ID = "e1e1e1e1-e1e1-4e1e-8e1e-e1e1e1e1e1e1";

function user(role: UserContext["role"], id: string, schoolId = SCHOOL): UserContext {
  return { id, username: id, name: id, role, schoolId, xp: 0, level: 1, cefrLevel: "A1" };
}

type Alert = { alertSeverity: string; detectedAt: string; cursor: string; studentId?: string };

function alert(cursor: string, alertSeverity: string, detectedAt = "2026-07-10T00:00:00.000Z"): Alert {
  return { cursor, alertSeverity, detectedAt };
}

function makeDeps(overrides: Partial<Parameters<typeof listAlerts>[0]["deps"]> = {}) {
  return {
    masteryFilterLevel: 0.6,
    detectionCap: 50,
    defaultLimit: 2,
    maxLimit: 100,
    freshnessHeaderSeconds: 60,
    cacheGet: vi.fn().mockReturnValue(null),
    cacheSet: vi.fn(),
    detectAlerts: vi.fn().mockImplementation(({ classMeta }: { classMeta: { id: string } }) => ({
      classId: classMeta.id,
      alerts: [alert("a1", "critical"), alert("a2", "warning", "2026-07-12T00:00:00.000Z"), alert("a3", "critical", "2026-07-13T00:00:00.000Z")],
    })),
    ...overrides,
  };
}

describe("listAlerts", () => {
  let harness: TestDb;
  const tenant = { schoolId: SCHOOL };
  const teacher = user("TEACHER", "teacher-1");

  beforeAll(async () => {
    harness = await createTestDb();
    holder.db = harness.db;
    await harness.db.insert(schools).values([{ id: SCHOOL, name: "Science" }, { id: OTHER_SCHOOL, name: "Other" }]);
    await harness.db.insert(users).values([
      { id: "teacher-1", username: "t1", displayUsername: "t1", role: "TEACHER", schoolId: SCHOOL },
      { id: "teacher-2", username: "t2", displayUsername: "t2", role: "TEACHER", schoolId: SCHOOL },
      { id: "student-1", username: "s1", displayUsername: "s1", name: "Student One", role: "STUDENT", schoolId: SCHOOL, gradeLevel: 5 },
      { id: "student-2", username: "s2", displayUsername: "s2", role: "STUDENT", schoolId: SCHOOL },
    ]);
    await harness.db.insert(scienceClasses).values([
      { id: CLASS_ID, name: "Physics", gradeLevel: 5, standardsAlignment: "NGSS", joinCode: "PHYS01", teacherId: "teacher-1", schoolId: SCHOOL },
      { id: EMPTY_CLASS_ID, name: "Empty", gradeLevel: 5, standardsAlignment: "NGSS", joinCode: "EMPTY1", teacherId: "teacher-1", schoolId: SCHOOL },
    ]);
    await harness.db.insert(scienceClassStudents).values([
      { classId: CLASS_ID, studentId: "student-1", schoolId: SCHOOL },
      { classId: CLASS_ID, studentId: "student-2", schoolId: SCHOOL },
    ]);
    await harness.db.insert(scienceStandards).values({ id: STANDARD_ID, framework: "NGSS", code: "PS1", description: "Matter", schoolId: SCHOOL });
    await harness.db.insert(scienceStandardMastery).values([
      { studentId: "student-1", standardId: STANDARD_ID, schoolId: SCHOOL, masteryLevel: "0.40", lastAssessedAt: new Date("2026-07-01T00:00:00Z") },
      { studentId: "student-2", standardId: STANDARD_ID, schoolId: SCHOOL, masteryLevel: "0.90", lastAssessedAt: new Date("2026-07-01T00:00:00Z") },
    ]);
  }, 120_000);
  afterAll(async () => harness.close());
  beforeEach(() => vi.clearAllMocks());

  it("rejects a STUDENT without intervention:read", async () => {
    await expect(listAlerts({ user: user("STUDENT", "student-1"), tenant, input: { classId: CLASS_ID }, deps: makeDeps() })).rejects.toThrow("intervention:read");
  });

  it("returns 404 for a class outside the tenant", async () => {
    const deps = makeDeps();
    await expect(listAlerts({ user: user("TEACHER", "teacher-1", OTHER_SCHOOL), tenant: { schoolId: OTHER_SCHOOL }, input: { classId: CLASS_ID }, deps })).resolves.toEqual({ error: "Class not found", status: 404 });
    expect(deps.detectAlerts).not.toHaveBeenCalled();
  });

  it("returns 403 for a teacher who does not own the class", async () => {
    const deps = makeDeps();
    await expect(listAlerts({ user: user("TEACHER", "teacher-2"), tenant, input: { classId: CLASS_ID }, deps })).resolves.toEqual({ error: "Forbidden", status: 403 });
    expect(deps.detectAlerts).not.toHaveBeenCalled();
  });

  it("returns an empty list for a class without students and skips detection", async () => {
    const deps = makeDeps();
    const result = await listAlerts({ user: teacher, tenant, input: { classId: EMPTY_CLASS_ID }, deps });
    expect(result).toMatchObject({ classId: EMPTY_CLASS_ID, alerts: [], nextCursor: null, totalAlerts: 0 });
    expect(deps.cacheGet).not.toHaveBeenCalled();
  });

  it("detects on a cache miss with only low-mastery rows and caches the payload", async () => {
    const deps = makeDeps();
    const result = await listAlerts({ user: teacher, tenant, input: { classId: CLASS_ID }, deps });
    expect(deps.detectAlerts).toHaveBeenCalledTimes(1);
    const detectInput = deps.detectAlerts.mock.calls[0]![0];
    expect(detectInput.classMeta).toEqual({ id: CLASS_ID, name: "Physics" });
    expect(detectInput.maxAlerts).toBe(50);
    expect(detectInput.students).toEqual(expect.arrayContaining([{ id: "student-1", name: "Student One", gradeLevel: 5 }, { id: "student-2", name: "", gradeLevel: null }]));
    expect(detectInput.masteryRecords).toEqual([{ studentId: "student-1", masteryLevel: "0.40", lastAssessedAt: new Date("2026-07-01T00:00:00Z"), standard: { code: "PS1", description: "Matter" } }]);
    expect(deps.cacheSet).toHaveBeenCalledWith(CLASS_ID, expect.objectContaining({ classId: CLASS_ID, alerts: expect.any(Array) }));
    expect(result).toMatchObject({ cacheStatus: "miss", totalAlerts: 3, nextCursor: "a2" });
    expect((result as { alerts: Alert[] }).alerts.map((item) => item.cursor)).toEqual(["a1", "a2"]);
  });

  it("serves a cache hit for an ADMIN without detection", async () => {
    const cached = { classId: CLASS_ID, generatedAt: "2026-07-01T00:00:00.000Z", alerts: [alert("c1", "moderate")] };
    const deps = makeDeps({ cacheGet: vi.fn().mockReturnValue(cached) });
    const result = await listAlerts({ user: user("ADMIN", "admin-1"), tenant, input: { classId: CLASS_ID }, deps });
    expect(result).toEqual({ classId: CLASS_ID, generatedAt: "2026-07-01T00:00:00.000Z", alerts: [cached.alerts[0]], nextCursor: null, totalAlerts: 1, cacheStatus: "hit" });
    expect(deps.detectAlerts).not.toHaveBeenCalled();
    expect(deps.cacheSet).not.toHaveBeenCalled();
  });

  it("bypasses the cache on refresh", async () => {
    const deps = makeDeps({ cacheGet: vi.fn().mockReturnValue({ classId: CLASS_ID, generatedAt: "x", alerts: [] }) });
    const result = await listAlerts({ user: teacher, tenant, input: { classId: CLASS_ID, refresh: true, limit: 10 }, deps });
    expect(deps.cacheGet).not.toHaveBeenCalled();
    expect(result).toMatchObject({ cacheStatus: "bypass", totalAlerts: 3, nextCursor: null });
  });

  it("filters by severity, since, and cursor before it applies the limit", async () => {
    const deps = makeDeps();
    const bySeverity = await listAlerts({ user: teacher, tenant, input: { classId: CLASS_ID, severity: "critical", limit: 10 }, deps });
    expect((bySeverity as { alerts: Alert[] }).alerts.map((item) => item.cursor)).toEqual(["a1", "a3"]);
    const bySince = await listAlerts({ user: teacher, tenant, input: { classId: CLASS_ID, since: new Date("2026-07-11T00:00:00Z"), limit: 10 }, deps });
    expect((bySince as { alerts: Alert[] }).alerts.map((item) => item.cursor)).toEqual(["a2", "a3"]);
    const afterCursor = await listAlerts({ user: teacher, tenant, input: { classId: CLASS_ID, cursor: "a1", limit: 1 }, deps });
    expect(afterCursor).toMatchObject({ totalAlerts: 2, nextCursor: "a2" });
    expect((afterCursor as { alerts: Alert[] }).alerts.map((item) => item.cursor)).toEqual(["a2"]);
    const unknownCursor = await listAlerts({ user: teacher, tenant, input: { classId: CLASS_ID, cursor: "missing", limit: 10 }, deps });
    expect(unknownCursor).toMatchObject({ totalAlerts: 3 });
  });
});
