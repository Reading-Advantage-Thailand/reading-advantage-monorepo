import { createHash } from "node:crypto";

import { describe, expect, it, vi } from "vitest";

import { routedSql, type SqlRoute } from "../../__tests__/support/scripted-sql.js";
import { createDurableJobQueuePort } from "../adapters/postgres/index.js";

const JOB_ID = "60000000-0000-4000-8000-000000000001";
const NOW = "2030-01-01T00:00:00.000Z";
const LATER = "2030-01-01T00:05:00.000Z";
const EARLIER = "2029-12-31T23:55:00.000Z";
const QUEUE = "review.queue";
const JOB_NAME = "review.process";
const TOKEN = "lease-token-0123456789";
const TENANT = { mode: "tenant" as const, tenantId: "school-1" };
const evidence = { subjectId: "admin-1", permission: "admin:dashboard" as const, decisionId: "decision-1", authorizedAt: NOW };

/**
 * Builds a durable job row.
 * @param overrides Columns that replace the defaults.
 * @returns A running tenant job row.
 */
function jobRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: JOB_ID, job_name: JOB_NAME, queue_name: QUEUE, tenant_mode: "tenant", tenant_id: "school-1",
    idempotency_key: "key-1", payload_json: { version: 1 }, payload_fingerprint: "fp", state: "running",
    attempt: 1, max_attempts: 3, available_at: NOW, lease_token_hash: "h", lease_owner: "worker-1",
    lease_expires_at: LATER, redeliver_current_attempt: false, rerun_requested: false, rerun_queue_name: null,
    rerun_payload_json: null, rerun_payload_fingerprint: null, rerun_max_attempts: null, rerun_available_at: null,
    result_json: null, last_error_code: null, last_error_summary: null, completed_at: null, generation: 1,
    created_at: new Date(NOW), updated_at: NOW, ...overrides,
  };
}

/**
 * Creates a port over a routed database.
 * @param routes Statement routes.
 * @param verify Optional replay verifier.
 * @returns The port and the double.
 */
function setup(routes: readonly SqlRoute[], verify?: () => Promise<unknown>) {
  const db = routedSql(routes);
  const port = createDurableJobQueuePort({
    sql: db.sql,
    ...(verify === undefined ? {} : { replayAuthorizationVerifier: { verify: vi.fn(verify) } as never }),
  });
  return { db, port };
}

const lease = { jobId: JOB_ID, tenant: TENANT, leaseToken: TOKEN, now: NOW };
const SELECT_STATE = 'SELECT "state"';

describe("PostgreSQL durable job claim", () => {
  it("returns empty when no job is ready", async () => {
    const { port, db } = setup([]);

    await expect(port.claim({ queueName: QUEUE, tenant: TENANT, workerId: "worker-1", limit: 5, leaseSeconds: 30, now: NOW })).resolves.toEqual({ outcome: "empty" });
    expect(db.bindings[0]).toEqual([QUEUE, "tenant", "school-1", NOW, 5]);
    expect(db.statements[0]).toContain("FOR UPDATE SKIP LOCKED");
  });

  it("leases each candidate, stores only the token hash, and returns the raw token", async () => {
    const updates: (readonly unknown[])[] = [];
    const { port } = setup([
      { match: 'AND "state" = \'pending\'', rows: [jobRow({ state: "pending", attempt: 0 }), jobRow({ id: "60000000-0000-4000-8000-000000000002", state: "pending", attempt: 2, redeliver_current_attempt: true })] },
      { match: "RETURNING *", rows: (values) => { updates.push(values); return [jobRow({ id: values[4], attempt: values[0], lease_owner: values[2], lease_expires_at: values[3], last_error_code: "BOOM", last_error_summary: "It failed." })]; } },
    ]);

    const result = await port.claim({ queueName: QUEUE, tenant: TENANT, workerId: "worker-1", limit: 5, leaseSeconds: 30, now: NOW });
    if (result.outcome !== "claimed") throw new Error("Expected a claim.");
    expect(result.jobs).toHaveLength(2);
    expect(updates.map((values) => values[0])).toEqual([1, 2]);
    const [first] = result.jobs;
    expect(first?.lease.workerId).toBe("worker-1");
    expect(first?.lease.expiresAt).toBe("2030-01-01T00:00:30.000Z");
    expect(first?.lease.token).toMatch(/^[A-Za-z0-9_-]{32}$/);
    expect(updates[0]?.[1]).toBe(createHash("sha256").update(first!.lease.token).digest("hex"));
    expect(first).toMatchObject({ state: "running", tenant: TENANT, createdAt: NOW, lastError: { code: "BOOM", safeSummary: "It failed." } });
    expect(result.jobs[0]?.lease.token).not.toBe(result.jobs[1]?.lease.token);
  });

  it("omits lastError when the row has none and maps global rows", async () => {
    const { port } = setup([
      { match: 'AND "state" = \'pending\'', rows: [jobRow({ state: "pending", tenant_mode: "global", tenant_id: null })] },
      { match: "RETURNING *", rows: [jobRow({ tenant_mode: "global", tenant_id: null })] },
    ]);

    const result = await port.claim({ queueName: QUEUE, tenant: { mode: "global" }, workerId: "worker-1", limit: 1, leaseSeconds: 30, now: NOW });
    if (result.outcome !== "claimed") throw new Error("Expected a claim.");
    expect(result.jobs[0]?.tenant).toEqual({ mode: "global" });
    expect(result.jobs[0]).not.toHaveProperty("lastError");
  });

  it.each([
    ["no updated row", []],
    ["a row without a lease", [jobRow({ lease_owner: null })]],
    ["a tenant row without tenant_id", [jobRow({ tenant_id: null })]],
  ])("throws on %s", async (_label, rows) => {
    const { port } = setup([
      { match: 'AND "state" = \'pending\'', rows: [jobRow({ state: "pending" })] },
      { match: "RETURNING *", rows },
    ]);

    await expect(port.claim({ queueName: QUEUE, tenant: TENANT, workerId: "worker-1", limit: 1, leaseSeconds: 30, now: NOW })).rejects.toThrow();
  });

  it("rejects an invalid claim before any SQL runs", async () => {
    const { port, db } = setup([]);

    await expect(port.claim({ queueName: QUEUE, tenant: TENANT, workerId: "worker-1", limit: 0, leaseSeconds: 30, now: NOW })).rejects.toThrow();
    expect(db.statements).toHaveLength(0);
  });
});

describe("PostgreSQL durable job heartbeat and lease mismatch", () => {
  it("extends a live lease that matches the token hash", async () => {
    const { port, db } = setup([{ match: 'RETURNING "lease_expires_at"', rows: [{ lease_expires_at: new Date("2030-01-01T00:01:00.000Z") }] }]);

    await expect(port.heartbeat({ ...lease, extendBySeconds: 60 })).resolves.toEqual({ outcome: "extended", expiresAt: "2030-01-01T00:01:00.000Z" });
    expect(db.bindings[0]).toEqual(["2030-01-01T00:01:00.000Z", NOW, JOB_ID, "tenant", "school-1", createHash("sha256").update(TOKEN).digest("hex"), NOW]);
    expect(db.bindings[0]).not.toContain(TOKEN);
  });

  it.each([
    ["stale-lease", [{ state: "running" }]],
    ["not-running", [{ state: "succeeded" }]],
    ["missing", []],
  ])("reports %s when the lease does not match", async (outcome, rows) => {
    const { port, db } = setup([{ match: SELECT_STATE, rows }]);

    await expect(port.heartbeat({ ...lease, extendBySeconds: 60 })).resolves.toEqual({ outcome });
    expect(db.bindings[1]).toEqual([JOB_ID, "tenant", "school-1"]);
  });

  it("reports a mismatch when the update returns a null expiry", async () => {
    const { port } = setup([
      { match: 'RETURNING "lease_expires_at"', rows: [{ lease_expires_at: null }] },
      { match: SELECT_STATE, rows: [{ state: "running" }] },
    ]);

    await expect(port.heartbeat({ ...lease, extendBySeconds: 60 })).resolves.toEqual({ outcome: "stale-lease" });
  });
});

describe("PostgreSQL durable job settle and fail", () => {
  it("settles a matching lease", async () => {
    const { port } = setup([{ match: 'RETURNING "state"', rows: [{ state: "succeeded" }] }]);

    await expect(port.settle({ ...lease, result: { ok: true } })).resolves.toEqual({ outcome: "settled", state: "succeeded" });
  });

  it("reports a stale lease on settle", async () => {
    const { port } = setup([{ match: SELECT_STATE, rows: [{ state: "running" }] }]);

    await expect(port.settle({ ...lease, result: null })).resolves.toEqual({ outcome: "stale-lease" });
  });

  it.each([
    ["a missing job", [], "missing"],
    ["a pending job", [{ attempt: 1, job_name: JOB_NAME, queue_name: QUEUE, state: "pending", lease_expires_at: null }], "not-running"],
    ["a running job without a lease", [{ attempt: 1, job_name: JOB_NAME, queue_name: QUEUE, state: "running", lease_expires_at: null }], "stale-lease"],
    ["an expired lease", [{ attempt: 1, job_name: JOB_NAME, queue_name: QUEUE, state: "running", lease_expires_at: NOW }], "stale-lease"],
  ])("does not fail %s", async (_label, current, outcome) => {
    const state = (current[0] as { state?: string } | undefined)?.state;
    const { port, db } = setup([
      { match: '"lease_expires_at"\n        FROM "durable_jobs"', rows: current },
      { match: SELECT_STATE, rows: state === undefined ? [] : [{ state }] },
    ]);

    await expect(port.fail({ ...lease, error: { code: "BOOM", safeSummary: "Failed." } })).resolves.toEqual({ outcome });
    expect(db.statements.some((text) => text.includes('RETURNING "state", "available_at"'))).toBe(false);
  });

  it("schedules a retry with bounded backoff", async () => {
    const { port, db } = setup([
      { match: '"lease_expires_at"\n        FROM "durable_jobs"', rows: [{ attempt: 2, job_name: JOB_NAME, queue_name: QUEUE, state: "running", lease_expires_at: LATER }] },
      { match: 'RETURNING "state", "available_at"', rows: (values) => [{ state: "pending", available_at: new Date(String(values[0])) }] },
    ]);

    const result = await port.fail({ ...lease, error: { code: "BOOM", safeSummary: "Failed." } });
    if (result.outcome !== "retry-scheduled") throw new Error("Expected a retry.");
    const delay = Date.parse(result.availableAt) - Date.parse(NOW);
    expect(delay).toBeGreaterThanOrEqual(2_000);
    expect(delay).toBeLessThanOrEqual(2_250);
    const update = db.bindings[1]!;
    expect(update).toContain("BOOM");
    expect(update).toContain("Failed.");
  });

  it("caps the retry delay at 60 seconds", async () => {
    const { port } = setup([
      { match: '"lease_expires_at"\n        FROM "durable_jobs"', rows: [{ attempt: 20, job_name: JOB_NAME, queue_name: QUEUE, state: "running", lease_expires_at: LATER }] },
      { match: 'RETURNING "state", "available_at"', rows: (values) => [{ state: "pending", available_at: String(values[0]) }] },
    ]);

    const result = await port.fail({ ...lease, error: { code: "BOOM", safeSummary: "Failed." } });
    if (result.outcome !== "retry-scheduled") throw new Error("Expected a retry.");
    expect(Date.parse(result.availableAt) - Date.parse(NOW)).toBe(60_000);
  });

  it("reports a dead job after the last attempt", async () => {
    const { port } = setup([
      { match: '"lease_expires_at"\n        FROM "durable_jobs"', rows: [{ attempt: 3, job_name: JOB_NAME, queue_name: QUEUE, state: "running", lease_expires_at: LATER }] },
      { match: 'RETURNING "state", "available_at"', rows: [{ state: "dead", available_at: NOW }] },
    ]);

    await expect(port.fail({ ...lease, error: { code: "BOOM", safeSummary: "Failed." } })).resolves.toEqual({ outcome: "dead" });
  });

  it("reports a mismatch when the token does not match on fail", async () => {
    const { port } = setup([
      { match: '"lease_expires_at"\n        FROM "durable_jobs"', rows: [{ attempt: 1, job_name: JOB_NAME, queue_name: QUEUE, state: "running", lease_expires_at: LATER }] },
      { match: SELECT_STATE, rows: [{ state: "running" }] },
    ]);

    await expect(port.fail({ ...lease, error: { code: "BOOM", safeSummary: "Failed." } })).resolves.toEqual({ outcome: "stale-lease" });
  });

  it("rejects an unsafe error code before any SQL runs", async () => {
    const { port, db } = setup([]);

    await expect(port.fail({ ...lease, error: { code: "boom", safeSummary: "Failed." } })).rejects.toThrow();
    expect(db.statements).toHaveLength(0);
  });
});

describe("PostgreSQL durable job reclaim", () => {
  it("returns no-op when no lease has expired", async () => {
    const { port, db } = setup([]);

    await expect(port.reclaimExpired({ tenant: TENANT, limit: 10, now: NOW })).resolves.toEqual({ outcome: "no-op" });
    expect(db.statements[0]).not.toContain('"queue_name" =');
  });

  it("redelivers plain jobs and promotes follow-up reruns", async () => {
    const { port, db } = setup([{ match: 'AND "state" = \'running\'', rows: [jobRow({ id: "a" }), jobRow({ id: "b", rerun_requested: true })] }]);

    await expect(port.reclaimExpired({ queueName: QUEUE, tenant: TENANT, limit: 10, now: NOW })).resolves.toEqual({ outcome: "reclaimed", count: 2 });
    expect(db.bindings[0]).toEqual([QUEUE, "tenant", "school-1", NOW, 10]);
    expect(db.statements[1]).toContain('"redeliver_current_attempt" = true');
    expect(db.bindings[1]).toEqual([NOW, "a"]);
    expect(db.statements[2]).toContain('"generation" = "generation" + 1');
    expect(db.bindings[2]).toEqual([NOW, "b"]);
  });
});

describe("PostgreSQL durable job dead letters", () => {
  const dead = (id: string, updated: string) => ({
    id, job_name: JOB_NAME, queue_name: QUEUE, tenant_mode: "tenant", tenant_id: null, attempt: 3, max_attempts: 3,
    last_error_code: "BOOM", last_error_summary: "Failed.", created_at: EARLIER, updated_at: new Date(updated), completed_at: updated,
  });

  it("maps dead jobs and omits the cursor on the last page", async () => {
    const { port } = setup([{ match: "\"state\" = 'dead'", rows: [dead(JOB_ID, NOW)] }]);

    const page = await port.listDead({ queueName: QUEUE, tenant: TENANT, limit: 5 });
    expect(page.nextCursor).toBeUndefined();
    expect(page.jobs[0]).toEqual({
      id: JOB_ID, jobName: JOB_NAME, queueName: QUEUE, tenant: { mode: "tenant", tenantId: "" }, attempt: 3, maxAttempts: 3,
      lastError: { code: "BOOM", safeSummary: "Failed." }, createdAt: EARLIER, updatedAt: NOW, completedAt: NOW,
    });
  });

  it("rejects malformed cursors before any SQL runs", async () => {
    const { port, db } = setup([]);
    const encode = (value: unknown) => Buffer.from(JSON.stringify(value), "utf8").toString("base64url");

    for (const cursor of ["!!!", Buffer.from("not json").toString("base64url"), encode(null), encode({ id: "x", updatedAt: NOW }), encode({ id: JOB_ID, updatedAt: "yesterday" }), encode({ id: JOB_ID })]) {
      await expect(port.listDead({ queueName: QUEUE, tenant: TENANT, limit: 5, cursor })).rejects.toThrow("The dead-letter cursor is invalid.");
    }
    expect(db.statements).toHaveLength(0);
  });
});

describe("PostgreSQL durable job replay", () => {
  const replay = { jobId: JOB_ID, tenant: TENANT, authorization: evidence, reason: "Operator replay.", correlationId: "corr-1", now: NOW };

  it("refuses replay without a verifier", async () => {
    const { port, db } = setup([]);

    await expect(port.replay(replay)).rejects.toThrow("Replay requires a configured authorization verifier.");
    expect(db.transactions()).toBe(0);
  });

  it.each([
    ["missing", []],
    ["already-pending", [jobRow({ state: "pending" })]],
    ["active-lease-rejected", [jobRow({ state: "running", lease_expires_at: LATER })]],
  ])("returns %s without writing", async (outcome, rows) => {
    const { port, db } = setup([{ match: "FOR UPDATE", rows }], async () => evidence);

    await expect(port.replay(replay)).resolves.toEqual({ outcome });
    expect(db.statements).toHaveLength(1);
  });

  it("replays an expired running job and audits the verified decision", async () => {
    const { port, db } = setup([{ match: "FOR UPDATE", rows: [jobRow({ state: "running", lease_expires_at: EARLIER })] }], async () => evidence);

    await expect(port.replay(replay)).resolves.toEqual({ outcome: "replayed", priorState: "expired-running" });
    expect(db.statements[1]).toContain('"generation" = "generation" + 1');
    expect(db.bindings[2]).toEqual([JOB_ID, "tenant", "school-1", "running", "admin-1", "decision-1", NOW, "Operator replay.", "corr-1"]);
  });

  it("replays a dead job", async () => {
    const { port } = setup([{ match: "FOR UPDATE", rows: [jobRow({ state: "dead", lease_expires_at: null })] }], async () => evidence);

    await expect(port.replay(replay)).resolves.toEqual({ outcome: "replayed", priorState: "dead" });
  });
});

describe("PostgreSQL durable job enqueue", () => {
  const request = { jobName: JOB_NAME, queueName: QUEUE, tenant: TENANT, idempotencyKey: "key-1", payload: { version: 1 }, maxAttempts: 3, availableAt: NOW };

  it("enqueues a new job", async () => {
    const { port } = setup([{ match: "ON CONFLICT DO NOTHING", rows: [{ id: JOB_ID }] }]);

    await expect(port.enqueue(request)).resolves.toEqual({ outcome: "enqueued", jobId: JOB_ID });
  });

  it("throws when the conflicting identity row is missing", async () => {
    const { port } = setup([]);

    await expect(port.enqueue(request)).rejects.toThrow("Durable job identity conflict returned no row.");
  });
});
