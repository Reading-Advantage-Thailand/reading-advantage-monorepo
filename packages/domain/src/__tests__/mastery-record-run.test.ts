import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockDb } from "./mock-db.js";
import {
  recordRun,
  recordRunFailure,
  resetRateLimitStore,
  RateLimitError,
} from "../mastery/record-run.js";
import * as legacy from "../mastery/legacy.js";

let masteryMockDb = createMockDb();

vi.mock("@reading-advantage/db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@reading-advantage/db")>();
  return {
    ...actual,
    get db() {
      return masteryMockDb;
    },
  };
});

const student = { id: "stu-1", role: "STUDENT" as const, schoolId: "school-1" };
const tenant = { schoolId: "school-1" };
const completedAt = new Date("2026-01-01T00:00:00.000Z");
const attempt = { id: "att-1", studentId: "stu-1", schoolId: "school-1", completedAt };
const responses = [{ questionId: "q1", isCorrect: true, answeredAt: completedAt }];
const questions = [{ id: "q1", points: 2 }];
const links = [{ questionId: "q1", standardId: "std-1" }];
const masteryRow = {
  id: "m1", studentId: "stu-1", standardId: "std-1", masteryLevel: "0.75",
  evidenceCount: 3, lastAssessedAt: completedAt, createdAt: completedAt, updatedAt: completedAt,
};

function request(body: unknown = { attemptId: "att-1" }) {
  return new Request("http://localhost/api", { method: "POST", body: JSON.stringify(body) });
}

function deps(overrides: Partial<{ enableMasteryPipeline: boolean }> = {}) {
  return {
    calculateMasteryUpdates: vi.fn(() => ({
      updates: [{ standardId: "std-1", masteryLevel: 0.75, evidenceCount: 3, lastAssessedAt: completedAt }],
      skipped: 1,
    })),
    buildResponseInput: vi.fn((p: { standardIds: string[]; isCorrect: boolean; weight?: number | null; answeredAt?: Date | null }) => ({
      standardIds: p.standardIds, isCorrect: p.isCorrect, weight: p.weight ?? 1, answeredAt: p.answeredAt ?? completedAt,
    })),
    enableMasteryPipeline: overrides.enableMasteryPipeline ?? true,
    log: vi.fn(),
    metric: { increment: vi.fn(), observe: vi.fn() },
  };
}

/** A thenable that rejects; a real Promise breaks inside the TenantDB proxy. */
function rejecting(error: Error) {
  return { then: (_ok: unknown, fail: (e: Error) => unknown) => fail(error) };
}

/** Select order: attempt, responses, questions, links, run (load), run (tx), mastery (tx). */
function loadSequence(run: unknown[] = [], txRun: unknown[] = [], txMastery: unknown[] = []) {
  return [[attempt], responses, questions, links, run, txRun, txMastery];
}

beforeEach(() => {
  resetRateLimitStore();
});

describe("recordRun", () => {
  it("throws for a role without mastery:write:own", async () => {
    masteryMockDb = createMockDb();
    await expect(recordRun({
      user: { id: "t1", role: "TEACHER", schoolId: "school-1" }, tenant, request: request(), deps: deps(),
    })).rejects.toThrow();
    expect(masteryMockDb.select).not.toHaveBeenCalled();
  });

  it("rejects a body without attemptId", async () => {
    masteryMockDb = createMockDb();
    await expect(recordRun({ user: student, tenant, request: request({}), deps: deps() })).rejects.toThrow();
  });

  it("returns 404 when the attempt does not exist", async () => {
    masteryMockDb = createMockDb({ selectSequence: [[]] });
    const res = await recordRun({ user: student, tenant, request: request(), deps: deps() });
    expect(res).toEqual({ status: 404, body: { success: false, error: "Attempt not found" } });
  });

  it("returns 403 when a student records another student's attempt", async () => {
    masteryMockDb = createMockDb({ selectSequence: [[{ ...attempt, studentId: "other" }], [], []] });
    const res = await recordRun({ user: student, tenant, request: request(), deps: deps() });
    expect(res.status).toBe(403);
    expect(masteryMockDb.transaction).not.toHaveBeenCalled();
  });

  it("returns 409 while the attempt is still grading", async () => {
    masteryMockDb = createMockDb({ selectSequence: [[{ ...attempt, completedAt: null }], [], []] });
    const res = await recordRun({ user: student, tenant, request: request(), deps: deps() });
    expect(res.status).toBe(409);
  });

  it("returns 202 DISABLED when the pipeline flag is off", async () => {
    masteryMockDb = createMockDb({ selectSequence: loadSequence() });
    const d = deps({ enableMasteryPipeline: false });
    const res = await recordRun({ user: student, tenant, request: request(), deps: d });
    expect(res).toEqual({ status: 202, body: { success: false, reason: "DISABLED" }, headers: { "retry-after": "60" } });
    expect(d.log).toHaveBeenCalledWith("mastery.update.disabled", { attemptId: "att-1" });
    expect(masteryMockDb.transaction).not.toHaveBeenCalled();
  });

  it("returns 200 with no writes when no question links a standard", async () => {
    masteryMockDb = createMockDb({ selectSequence: [[attempt], responses, questions, [], []] });
    const res = await recordRun({ user: student, tenant, request: request(), deps: deps() });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ success: true, updated: 0, records: [] });
    expect(masteryMockDb.transaction).not.toHaveBeenCalled();
  });

  it("writes mastery rows, completes the run, and reports metrics", async () => {
    masteryMockDb = createMockDb({ selectSequence: loadSequence(), insertReturning: [masteryRow] });
    const d = deps();
    const res = await recordRun({ user: student, tenant, request: request(), deps: d });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      success: true,
      updated: 1,
      records: [{ id: "m1", standardId: "std-1", masteryLevel: 0.75, evidenceCount: 3, lastAssessedAt: completedAt.toISOString() }],
    });
    expect(d.buildResponseInput).toHaveBeenCalledWith({ standardIds: ["std-1"], isCorrect: true, weight: 2, answeredAt: completedAt });
    expect(masteryMockDb.transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: "serializable" });
    // insert of the PROCESSING run plus one upsert of the mastery row
    expect(masteryMockDb.insert).toHaveBeenCalledTimes(2);
    const valuesSpy = masteryMockDb.insert.mock.results[0].value.values;
    const runValues = valuesSpy.mock.calls[0][0];
    expect(runValues).toMatchObject({ attemptId: "att-1", studentId: "stu-1", schoolId: "school-1", status: "PROCESSING" });
    const masteryValues = valuesSpy.mock.calls[1][0];
    expect(masteryValues).toMatchObject({ studentId: "stu-1", standardId: "std-1", masteryLevel: "0.75", schoolId: "school-1" });
    const completeSet = masteryMockDb.update.mock.results.at(-1)!.value.set.mock.calls[0][0];
    expect(completeSet).toMatchObject({ status: "COMPLETED", updatedCount: 1, lastError: null });
    expect(d.metric.increment).toHaveBeenCalledWith("mastery_updates_total", 1, { attemptId: "att-1" });
    expect(d.metric.increment).toHaveBeenCalledWith("mastery_updates_skipped_total", 1, { attemptId: "att-1" });
    expect(d.metric.observe).toHaveBeenCalledWith("mastery_updates_latency_ms", expect.any(Number), { attemptId: "att-1" });
  });

  it("restarts a failed run by setting it back to PROCESSING", async () => {
    const failedRun = { attemptId: "att-1", studentId: "stu-1", status: "FAILED" };
    masteryMockDb = createMockDb({ selectSequence: loadSequence([failedRun], [failedRun]), insertReturning: [masteryRow] });
    const res = await recordRun({ user: student, tenant, request: request(), deps: deps() });
    expect(res.status).toBe(200);
    const firstSet = masteryMockDb.update.mock.results[0].value.set.mock.calls[0][0];
    expect(firstSet).toMatchObject({ status: "PROCESSING", lastError: null });
    // only the mastery upsert, not a new run row
    expect(masteryMockDb.insert).toHaveBeenCalledTimes(1);
  });

  it("returns 202 QUEUED when the run is already processing", async () => {
    const run = { attemptId: "att-1", studentId: "stu-1", status: "PROCESSING" };
    masteryMockDb = createMockDb({ selectSequence: loadSequence([run], [run]) });
    const d = deps();
    const res = await recordRun({ user: student, tenant, request: request(), deps: d });
    expect(res).toEqual({ status: 202, body: { success: false, reason: "QUEUED" }, headers: { "retry-after": "30" } });
    expect(d.calculateMasteryUpdates).not.toHaveBeenCalled();
    expect(masteryMockDb.insert).not.toHaveBeenCalled();
  });

  it("returns stored records without recalculating when the run is complete", async () => {
    const run = { attemptId: "att-1", studentId: "stu-1", status: "COMPLETED" };
    masteryMockDb = createMockDb({ selectSequence: loadSequence([run], [run], [masteryRow]) });
    const d = deps();
    const res = await recordRun({ user: student, tenant, request: request(), deps: d });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ success: true, updated: 0, records: [{ id: "m1", masteryLevel: 0.75 }] });
    expect(d.calculateMasteryUpdates).not.toHaveBeenCalled();
    expect(d.metric.increment).not.toHaveBeenCalled();
  });

  it("returns 202 QUEUED when a concurrent insert hits the unique constraint", async () => {
    masteryMockDb = createMockDb({ selectSequence: loadSequence() });
    masteryMockDb.insert.mockReturnValueOnce({
      values: vi.fn(() => rejecting(Object.assign(new Error("dup"), { cause: { code: "23505" } }))),
    });
    const res = await recordRun({ user: student, tenant, request: request(), deps: deps() });
    expect(res.status).toBe(202);
    expect(res.body).toEqual({ success: false, reason: "QUEUED" });
  });

  it("rethrows other insert errors", async () => {
    masteryMockDb = createMockDb({ selectSequence: loadSequence() });
    masteryMockDb.insert.mockReturnValueOnce({
      values: vi.fn(() => rejecting(Object.assign(new Error("boom"), { code: "40001" }))),
    });
    await expect(recordRun({ user: student, tenant, request: request(), deps: deps() })).rejects.toThrow("boom");
  });

  it("rate-limits a student after three runs inside one minute", async () => {
    const run = { attemptId: "att-1", studentId: "stu-1", status: "PROCESSING" };
    for (let i = 0; i < 3; i++) {
      masteryMockDb = createMockDb({ selectSequence: loadSequence([run], [run]) });
      const res = await recordRun({ user: student, tenant, request: request(), deps: deps() });
      expect(res.status).toBe(202);
    }
    masteryMockDb = createMockDb({ selectSequence: loadSequence([run], [run]) });
    const err = await recordRun({ user: student, tenant, request: request(), deps: deps() }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(RateLimitError);
    expect((err as RateLimitError).retryAfter).toBeGreaterThanOrEqual(1);
    expect((err as RateLimitError).retryAfter).toBeLessThanOrEqual(60);
  });

  it("opens a new rate-limit window after the old one expires", async () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
      const run = { attemptId: "att-1", studentId: "stu-1", status: "PROCESSING" };
      for (let i = 0; i < 3; i++) {
        masteryMockDb = createMockDb({ selectSequence: loadSequence([run], [run]) });
        await recordRun({ user: student, tenant, request: request(), deps: deps() });
      }
      vi.setSystemTime(new Date("2026-01-01T00:01:01Z"));
      masteryMockDb = createMockDb({ selectSequence: loadSequence([run], [run]) });
      const res = await recordRun({ user: student, tenant, request: request(), deps: deps() });
      expect(res.status).toBe(202);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("RateLimitError", () => {
  it("rounds retryAfter up to whole seconds with a floor of one", () => {
    expect(new RateLimitError(1500).retryAfter).toBe(2);
    expect(new RateLimitError(0).retryAfter).toBe(1);
    expect(new RateLimitError(1500).message).toBe("rate-limit");
  });
});

describe("recordRunFailure", () => {
  it("upserts a FAILED run with the error message", async () => {
    masteryMockDb = createMockDb();
    await recordRunFailure({ attemptId: "att-1", studentId: "stu-1", schoolId: "school-1", errorMessage: "bad" });
    const values = masteryMockDb.insert.mock.results[0].value.values;
    expect(values).toHaveBeenCalledWith({
      attemptId: "att-1", studentId: "stu-1", schoolId: "school-1", status: "FAILED", updatedCount: 0, lastError: "bad",
    });
    const conflict = values.mock.results[0].value.onConflictDoUpdate.mock.calls[0][0];
    expect(conflict.set).toMatchObject({ status: "FAILED", lastError: "bad" });
  });
});

describe("mastery legacy transport", () => {
  it("delegates recordRun and maps the rate-limit error", async () => {
    const run = { attemptId: "att-1", studentId: "stu-1", status: "PROCESSING" };
    for (let i = 0; i < 3; i++) {
      masteryMockDb = createMockDb({ selectSequence: loadSequence([run], [run]) });
      const res = await legacy.recordRun({ user: student, tenant, request: request(), deps: deps() });
      expect(res.status).toBe(202);
    }
    masteryMockDb = createMockDb({ selectSequence: loadSequence([run], [run]) });
    const err = await legacy.recordRun({ user: student, tenant, request: request(), deps: deps() }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(legacy.RateLimitError);
    expect((err as legacy.RateLimitError).name).toBe("RateLimitError");
    expect((err as legacy.RateLimitError).retryAfter).toBeGreaterThanOrEqual(1);
  });

  it("rethrows errors that are not rate limits", async () => {
    masteryMockDb = createMockDb();
    await expect(legacy.recordRun({ user: student, tenant, request: request({}), deps: deps() })).rejects.toThrow();
  });

  it("delegates recordRunFailure and resetRateLimitStore", async () => {
    masteryMockDb = createMockDb();
    await legacy.recordRunFailure({ attemptId: "a", studentId: "s", schoolId: "school-1", errorMessage: "e" });
    expect(masteryMockDb.insert).toHaveBeenCalledTimes(1);
    legacy.resetRateLimitStore();
    await vi.waitFor(async () => {
      const run = { attemptId: "att-1", studentId: "stu-1", status: "PROCESSING" };
      masteryMockDb = createMockDb({ selectSequence: loadSequence([run], [run]) });
      expect((await recordRun({ user: student, tenant, request: request(), deps: deps() })).status).toBe(202);
    });
  });
});
