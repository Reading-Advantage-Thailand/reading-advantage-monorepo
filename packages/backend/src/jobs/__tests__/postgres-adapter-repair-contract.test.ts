import { createHash } from "node:crypto";

import { describe, expect, it, vi } from "vitest";

vi.mock("node:crypto", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:crypto")>();
  return {
    ...actual,
    randomInt: (minimum: number, maximum: number) =>
      Math.min(maximum - 1, minimum + 1),
  };
});

import type { DurableJobQueuePort } from "../index.js";
import { createDurableJobQueuePort } from "../adapters/postgres/index.js";

type DurableJobSql = Parameters<typeof createDurableJobQueuePort>[0]["sql"];
type Query = (
  strings: TemplateStringsArray,
  ...values: unknown[]
) => Promise<readonly unknown[]>;
type TransactionCallback<TResult> = (transaction: Query) => Promise<TResult>;

interface FakeSql extends Query {
  begin<TResult>(callback: TransactionCallback<TResult>): Promise<TResult>;
  json(value: unknown): string;
}

interface FakeJobRow {
  id: string;
  job_name: string;
  queue_name: string;
  tenant_mode: "global" | "tenant";
  tenant_id: string | null;
  idempotency_key: string;
  payload_json: unknown;
  payload_fingerprint: string;
  state: "pending" | "running" | "succeeded" | "dead";
  attempt: number;
  max_attempts: number;
  available_at: string;
  lease_token_hash: string | null;
  lease_owner: string | null;
  lease_expires_at: string | null;
  redeliver_current_attempt: boolean;
  rerun_requested: boolean;
  rerun_queue_name: string | null;
  rerun_payload_json: unknown | null;
  rerun_payload_fingerprint: string | null;
  rerun_max_attempts: number | null;
  rerun_available_at: string | null;
  result_json: unknown | null;
  last_error_code: string | null;
  last_error_summary: string | null;
  completed_at: string | null;
  generation: number;
  created_at: string;
  updated_at: string;
}

interface FakeCall {
  readonly text: string;
  readonly values: readonly unknown[];
}

interface FakePostgresOptions {
  readonly simulateFirstInsertConflict?: boolean;
}

const NOW = "2030-01-01T00:00:00.000Z";
const RETRY_NOW = "2030-01-01T01:00:00.000Z";
const FUTURE = "2030-01-01T00:05:00.000Z";
const EXPIRED = "2029-12-31T23:55:00.000Z";
const RERUN_AT = "2030-01-01T00:10:00.000Z";
const JOB_ID = "00000000-0000-4000-8000-000000000001";
const SECOND_JOB_ID = "00000000-0000-4000-8000-000000000002";
const THIRD_JOB_ID = "00000000-0000-4000-8000-000000000003";
const RACE_JOB_ID = "00000000-0000-4000-8000-000000000004";
const LEASE_TOKEN = "lease-token-123456789";
const QUEUE = "review.queue";
const JOB_NAME = "review.process";

function fingerprint(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function leaseHash(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function requireSqlFragments(text: string, fragments: readonly string[]): void {
  const missing = fragments.filter((fragment) => !text.includes(fragment));
  if (missing.length > 0) {
    throw new Error(
      `Fake database rejected SQL fragments: ${missing.join("; ")}`,
    );
  }
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

function makeRow(overrides: Partial<FakeJobRow> = {}): FakeJobRow {
  const payload = { version: 1 };
  return {
    id: JOB_ID,
    job_name: JOB_NAME,
    queue_name: QUEUE,
    tenant_mode: "global",
    tenant_id: null,
    idempotency_key: "identity-1",
    payload_json: payload,
    payload_fingerprint: fingerprint(payload),
    state: "running",
    attempt: 1,
    max_attempts: 3,
    available_at: NOW,
    lease_token_hash: leaseHash(LEASE_TOKEN),
    lease_owner: "worker-1",
    lease_expires_at: FUTURE,
    redeliver_current_attempt: false,
    rerun_requested: false,
    rerun_queue_name: null,
    rerun_payload_json: null,
    rerun_payload_fingerprint: null,
    rerun_max_attempts: null,
    rerun_available_at: null,
    result_json: null,
    last_error_code: null,
    last_error_summary: null,
    completed_at: null,
    generation: 1,
    created_at: NOW,
    updated_at: NOW,
    ...overrides,
  };
}

function makeRerunRow(overrides: Partial<FakeJobRow> = {}): FakeJobRow {
  const rerunPayload = { version: 2, followUp: true };
  return makeRow({
    rerun_requested: true,
    rerun_queue_name: "review.follow-up",
    rerun_payload_json: rerunPayload,
    rerun_payload_fingerprint: fingerprint(rerunPayload),
    rerun_max_attempts: 2,
    rerun_available_at: RERUN_AT,
    ...overrides,
  });
}

class FakePostgres {
  readonly calls: FakeCall[] = [];
  private readonly rows = new Map<string, FakeJobRow>();
  private readonly options: FakePostgresOptions;
  private firstInsertHandled = false;

  constructor(options: FakePostgresOptions = {}) {
    this.options = options;
  }

  seed(row: FakeJobRow): void {
    this.rows.set(row.id, clone(row));
  }

  row(id = JOB_ID): FakeJobRow {
    const row = this.rows.get(id);
    if (row === undefined) {
      throw new Error(`Fake row ${id} was not found.`);
    }
    return clone(row);
  }

  sql(): DurableJobSql {
    const query: Query = async (strings, ...values) => {
      const text = strings.reduce(
        (result, part, index) =>
          `${result}${part}${index < values.length ? `$${index + 1}` : ""}`,
        "",
      );
      this.calls.push({ text, values: [...values] });
      return this.execute(text, values);
    };
    const sql = query as FakeSql;
    // postgres.js json() is required to preserve JSONB primitives after Task 9.
    sql.json = (value) => JSON.stringify(value);
    sql.begin = async <TResult>(callback: TransactionCallback<TResult>) => {
      const snapshot = clone(this.rows);
      try {
        return await callback(query);
      } catch (error) {
        this.rows.clear();
        for (const [id, row] of snapshot) {
          this.rows.set(id, row);
        }
        throw error;
      }
    };
    return sql as unknown as DurableJobSql;
  }

  private async execute(
    rawText: string,
    values: readonly unknown[],
  ): Promise<readonly unknown[]> {
    const text = rawText.replace(/\s+/g, " ").trim();

    if (
      text.startsWith('INSERT INTO "durable_jobs"') &&
      text.includes("ON CONFLICT DO NOTHING")
    ) {
      return this.insert(values);
    }
    if (
      text.startsWith('SELECT * FROM "durable_jobs"') &&
      text.includes('"job_name"') &&
      text.includes('"idempotency_key"') &&
      text.includes("FOR UPDATE")
    ) {
      return this.selectIdentity(values);
    }
    if (
      text.startsWith('UPDATE "durable_jobs" SET "job_name"') &&
      text.includes('"generation" =')
    ) {
      return this.refresh(values);
    }
    if (text.includes('SET "rerun_requested" = true')) {
      return this.requestRerun(values);
    }
    if (
      text.includes(
        'SELECT "attempt", "job_name", "queue_name", "state", "lease_expires_at"',
      )
    ) {
      return this.selectLease(values);
    }
    if (
      text.includes('RETURNING "state"') &&
      !text.includes('RETURNING "state", "available_at"')
    ) {
      return this.settle(values, text);
    }
    if (text.includes('RETURNING "state", "available_at"')) {
      return this.fail(values, text);
    }
    if (
      text.startsWith('SELECT * FROM "durable_jobs"') &&
      text.includes('"lease_expires_at" <=') &&
      text.includes("FOR UPDATE SKIP LOCKED")
    ) {
      return this.selectExpired(values, text.includes('"queue_name" ='));
    }
    if (text.includes('SET "queue_name" = "rerun_queue_name"')) {
      return this.promoteReclaimed(values, text);
    }
    if (
      text.includes("SET \"state\" = 'pending'") &&
      text.includes('"redeliver_current_attempt" = true')
    ) {
      return this.redeliver(values);
    }
    if (text.startsWith('SELECT "id", "job_name"')) {
      return this.listDead(values, text.includes('AND ("updated_at", "id") >'));
    }
    if (text.startsWith('SELECT "state" FROM "durable_jobs"')) {
      return this.leaseState(values);
    }

    throw new Error(`Fake database does not support query: ${text}`);
  }

  private insert(values: readonly unknown[]): readonly unknown[] {
    const identity = {
      jobName: String(values[0]),
      mode: String(values[2]),
      tenantId: (values[3] as string | null) ?? null,
      idempotencyKey: String(values[4]),
    };
    const existing = this.findIdentity(identity);
    if (existing !== undefined) {
      return [];
    }
    const row = makeRow({
      id:
        this.options.simulateFirstInsertConflict && !this.firstInsertHandled
          ? RACE_JOB_ID
          : JOB_ID,
      job_name: identity.jobName,
      queue_name: String(values[1]),
      tenant_mode: identity.mode === "tenant" ? "tenant" : "global",
      tenant_id: identity.tenantId,
      idempotency_key: identity.idempotencyKey,
      payload_json: JSON.parse(String(values[5])),
      payload_fingerprint: String(values[6]),
      state: "pending",
      attempt: 0,
      max_attempts: Number(values[7]),
      available_at: String(values[8]),
      lease_token_hash: null,
      lease_owner: null,
      lease_expires_at: null,
      created_at: String(values[9]),
      updated_at: String(values[10]),
    });
    this.firstInsertHandled = true;
    this.rows.set(row.id, row);
    if (this.options.simulateFirstInsertConflict) {
      return [];
    }
    return [{ id: row.id }];
  }

  private selectIdentity(values: readonly unknown[]): readonly FakeJobRow[] {
    const row = this.findIdentity({
      jobName: String(values[0]),
      mode: String(values[1]),
      tenantId: (values[2] as string | null) ?? null,
      idempotencyKey: String(values[3]),
    });
    return row === undefined ? [] : [clone(row)];
  }

  private refresh(values: readonly unknown[]): readonly unknown[] {
    const row = this.requireRow(String(values[10]));
    row.job_name = String(values[0]);
    row.queue_name = String(values[1]);
    row.tenant_mode = String(values[2]) === "tenant" ? "tenant" : "global";
    row.tenant_id = (values[3] as string | null) ?? null;
    row.payload_json = JSON.parse(String(values[4]));
    row.payload_fingerprint = String(values[5]);
    row.state = "pending";
    row.attempt = 0;
    row.max_attempts = Number(values[6]);
    row.available_at = String(values[7]);
    row.lease_token_hash = null;
    row.lease_owner = null;
    row.lease_expires_at = null;
    row.redeliver_current_attempt = false;
    row.rerun_requested = false;
    row.rerun_queue_name = null;
    row.rerun_payload_json = null;
    row.rerun_payload_fingerprint = null;
    row.rerun_max_attempts = null;
    row.rerun_available_at = null;
    row.result_json = null;
    row.last_error_code = null;
    row.last_error_summary = null;
    row.completed_at = null;
    row.generation = Number(values[8]);
    row.updated_at = String(values[9]);
    this.rows.set(row.id, row);
    return [];
  }

  private requestRerun(values: readonly unknown[]): readonly unknown[] {
    const row = this.requireRow(String(values[5]));
    row.rerun_requested = true;
    row.rerun_queue_name = String(values[0]);
    row.rerun_payload_json = JSON.parse(String(values[1]));
    row.rerun_payload_fingerprint = String(values[2]);
    row.rerun_max_attempts = Number(values[3]);
    row.rerun_available_at = String(values[4]);
    this.rows.set(row.id, row);
    return [];
  }

  private selectLease(values: readonly unknown[]): readonly unknown[] {
    const row = this.requireRow(String(values[0]));
    return [
      {
        attempt: row.attempt,
        job_name: row.job_name,
        queue_name: row.queue_name,
        state: row.state,
        lease_expires_at: row.lease_expires_at,
      },
    ];
  }

  private leaseState(values: readonly unknown[]): readonly unknown[] {
    const row = this.rows.get(String(values[0]));
    return row === undefined ? [] : [{ state: row.state }];
  }

  private settle(values: readonly unknown[], text: string): readonly unknown[] {
    requireSqlFragments(text, [
      '"queue_name" = CASE',
      'WHEN "rerun_requested" THEN "rerun_queue_name"',
      '"state" = CASE',
      // The adapter casts enum CASE arms for PostgreSQL type resolution.
      'WHEN "rerun_requested" THEN CAST(\'pending\' AS "durable_job_state")',
      '"attempt" = CASE WHEN "rerun_requested" THEN 0',
      '"lease_token_hash" = NULL',
      '"lease_owner" = NULL',
      '"lease_expires_at" = NULL',
      '"redeliver_current_attempt" = false',
      '"rerun_requested" = false',
      '"rerun_queue_name" = NULL',
      '"rerun_payload_json" = NULL',
      '"rerun_payload_fingerprint" = NULL',
      '"rerun_max_attempts" = NULL',
      '"rerun_available_at" = NULL',
      '"result_json" = CASE',
      '"last_error_code" = NULL',
      '"last_error_summary" = NULL',
      '"completed_at" = CASE',
      '"generation" = CASE',
    ]);
    const row = this.requireRow(String(values[3]));
    if (
      !this.matchesLease(
        row,
        values[3],
        values[4],
        values[5],
        values[6],
        values[7],
      )
    ) {
      return [];
    }
    if (row.rerun_requested) {
      this.promoteRerun(row, String(values[2]));
    } else {
      row.state = "succeeded";
      row.result_json = JSON.parse(String(values[0]));
      row.completed_at = String(values[1]);
      row.updated_at = String(values[2]);
      row.lease_token_hash = null;
      row.lease_owner = null;
      row.lease_expires_at = null;
    }
    this.rows.set(row.id, row);
    return [{ state: row.state }];
  }

  private fail(values: readonly unknown[], text: string): readonly unknown[] {
    requireSqlFragments(text, [
      '"queue_name" = CASE',
      'WHEN "rerun_requested" THEN "rerun_queue_name"',
      '"state" = CASE',
      // The adapter casts enum CASE arms for PostgreSQL type resolution.
      'WHEN "rerun_requested" THEN CAST(\'pending\' AS "durable_job_state")',
      '"attempt" = CASE WHEN "rerun_requested" THEN 0',
      '"available_at" = CASE',
      'WHEN "rerun_requested" THEN "rerun_available_at"',
      'WHEN "attempt" >= "max_attempts" THEN "available_at"',
      '"lease_token_hash" = NULL',
      '"lease_owner" = NULL',
      '"lease_expires_at" = NULL',
      '"redeliver_current_attempt" = false',
      '"rerun_requested" = false',
      '"rerun_queue_name" = NULL',
      '"rerun_payload_json" = NULL',
      '"rerun_payload_fingerprint" = NULL',
      '"rerun_max_attempts" = NULL',
      '"rerun_available_at" = NULL',
      '"result_json" = NULL',
      '"last_error_code" = CASE',
      '"last_error_summary" = CASE',
      '"completed_at" = CASE',
      '"generation" = CASE',
    ]);
    const row = this.requireRow(String(values[5]));
    if (
      !this.matchesLease(
        row,
        values[5],
        values[6],
        values[7],
        values[8],
        values[9],
      )
    ) {
      return [];
    }
    if (row.rerun_requested) {
      this.promoteRerun(row, String(values[4]));
    } else {
      row.state = row.attempt >= row.max_attempts ? "dead" : "pending";
      row.available_at =
        row.state === "dead" ? row.available_at : String(values[0]);
      row.last_error_code = String(values[1]);
      row.last_error_summary = String(values[2]);
      row.completed_at = row.state === "dead" ? String(values[3]) : null;
      row.lease_token_hash = null;
      row.lease_owner = null;
      row.lease_expires_at = null;
      row.updated_at = String(values[4]);
    }
    this.rows.set(row.id, row);
    return [{ state: row.state, available_at: row.available_at }];
  }

  private selectExpired(
    values: readonly unknown[],
    hasQueue: boolean,
  ): readonly FakeJobRow[] {
    const offset = hasQueue ? 1 : 0;
    const queue = hasQueue ? String(values[0]) : undefined;
    const mode = String(values[offset]);
    const tenantId = (values[offset + 1] as string | null) ?? null;
    const now = String(values[offset + 2]);
    const limit = Number(values[offset + 3]);
    return [...this.rows.values()]
      .filter(
        (row) =>
          row.state === "running" &&
          row.tenant_mode === mode &&
          row.tenant_id === tenantId &&
          (queue === undefined || row.queue_name === queue) &&
          row.lease_expires_at !== null &&
          Date.parse(row.lease_expires_at) <= Date.parse(now),
      )
      .slice(0, limit)
      .map(clone);
  }

  private promoteReclaimed(
    values: readonly unknown[],
    text: string,
  ): readonly unknown[] {
    requireSqlFragments(text, [
      '"queue_name" = "rerun_queue_name"',
      '"payload_json" = "rerun_payload_json"',
      '"payload_fingerprint" = "rerun_payload_fingerprint"',
      "\"state\" = 'pending'",
      '"attempt" = 0',
      '"max_attempts" = "rerun_max_attempts"',
      '"available_at" = "rerun_available_at"',
      '"lease_token_hash" = NULL',
      '"lease_owner" = NULL',
      '"lease_expires_at" = NULL',
      '"redeliver_current_attempt" = false',
      '"rerun_requested" = false',
      '"rerun_queue_name" = NULL',
      '"rerun_payload_json" = NULL',
      '"rerun_payload_fingerprint" = NULL',
      '"rerun_max_attempts" = NULL',
      '"rerun_available_at" = NULL',
      '"result_json" = NULL',
      '"last_error_code" = NULL',
      '"last_error_summary" = NULL',
      '"completed_at" = NULL',
      '"generation" = "generation" + 1',
    ]);
    const row = this.requireRow(String(values.at(-1)));
    this.promoteRerun(row, String(values[0]));
    this.rows.set(row.id, row);
    return [];
  }

  private redeliver(values: readonly unknown[]): readonly unknown[] {
    const row = this.requireRow(String(values[0]));
    row.state = "pending";
    row.lease_token_hash = null;
    row.lease_owner = null;
    row.lease_expires_at = null;
    row.redeliver_current_attempt = true;
    this.rows.set(row.id, row);
    return [];
  }

  private listDead(
    values: readonly unknown[],
    hasCursor: boolean,
  ): readonly FakeJobRow[] {
    const queue = String(values[0]);
    const mode = String(values[1]);
    const tenantId = (values[2] as string | null) ?? null;
    const cursorUpdatedAt = hasCursor ? String(values[3]) : undefined;
    const cursorId = hasCursor ? String(values[4]) : undefined;
    const limit = Number(values[hasCursor ? 5 : 3]);
    return [...this.rows.values()]
      .filter(
        (row) =>
          row.state === "dead" &&
          row.queue_name === queue &&
          row.tenant_mode === mode &&
          row.tenant_id === tenantId &&
          (cursorUpdatedAt === undefined ||
            row.updated_at > cursorUpdatedAt ||
            (row.updated_at === cursorUpdatedAt && row.id > cursorId!)),
      )
      .sort((left, right) =>
        `${left.updated_at}:${left.id}`.localeCompare(
          `${right.updated_at}:${right.id}`,
        ),
      )
      .slice(0, limit)
      .map(clone);
  }

  private promoteRerun(row: FakeJobRow, updatedAt: string): void {
    row.queue_name = row.rerun_queue_name!;
    row.payload_json = row.rerun_payload_json;
    row.payload_fingerprint = row.rerun_payload_fingerprint!;
    row.state = "pending";
    row.attempt = 0;
    row.max_attempts = row.rerun_max_attempts!;
    row.available_at = row.rerun_available_at!;
    row.lease_token_hash = null;
    row.lease_owner = null;
    row.lease_expires_at = null;
    row.redeliver_current_attempt = false;
    row.rerun_requested = false;
    row.rerun_queue_name = null;
    row.rerun_payload_json = null;
    row.rerun_payload_fingerprint = null;
    row.rerun_max_attempts = null;
    row.rerun_available_at = null;
    row.result_json = null;
    row.last_error_code = null;
    row.last_error_summary = null;
    row.completed_at = null;
    row.generation += 1;
    row.updated_at = updatedAt;
  }

  private matchesLease(
    row: FakeJobRow,
    jobId: unknown,
    mode: unknown,
    tenantId: unknown,
    leaseHash: unknown,
    now: unknown,
  ): boolean {
    return (
      row.id === jobId &&
      row.tenant_mode === mode &&
      row.tenant_id === ((tenantId as string | null) ?? null) &&
      row.state === "running" &&
      row.lease_token_hash === leaseHash &&
      row.lease_expires_at !== null &&
      Date.parse(row.lease_expires_at) > Date.parse(String(now))
    );
  }

  private findIdentity(identity: {
    readonly jobName: string;
    readonly mode: string;
    readonly tenantId: string | null;
    readonly idempotencyKey: string;
  }): FakeJobRow | undefined {
    return [...this.rows.values()].find(
      (row) =>
        row.job_name === identity.jobName &&
        row.tenant_mode === identity.mode &&
        row.tenant_id === identity.tenantId &&
        row.idempotency_key === identity.idempotencyKey,
    );
  }

  private requireRow(id: string): FakeJobRow {
    const row = this.rows.get(id);
    if (row === undefined) {
      throw new Error(`Fake row ${id} was not found.`);
    }
    return clone(row);
  }
}

function makePort(database: FakePostgres): DurableJobQueuePort {
  return createDurableJobQueuePort({ sql: database.sql() });
}

function enqueueRequest(
  idempotencyKey = "identity-1",
): Parameters<DurableJobQueuePort["enqueue"]>[0] {
  return {
    jobName: JOB_NAME,
    queueName: QUEUE,
    tenant: { mode: "global" },
    idempotencyKey,
    payload: { version: 1 },
    maxAttempts: 3,
    availableAt: NOW,
  };
}

function leaseRequest(): Parameters<DurableJobQueuePort["settle"]>[0] {
  return {
    jobId: JOB_ID,
    tenant: { mode: "global" },
    leaseToken: LEASE_TOKEN,
    now: NOW,
    result: { ok: true },
  };
}

function failRequest(now = NOW): Parameters<DurableJobQueuePort["fail"]>[0] {
  return {
    jobId: JOB_ID,
    tenant: { mode: "global" },
    leaseToken: LEASE_TOKEN,
    now,
    error: { code: "RETRYABLE_FAILURE", safeSummary: "Safe failure" },
  };
}

function expectPromoted(row: FakeJobRow): void {
  expect(row.state).toBe("pending");
  expect(row.queue_name).toBe("review.follow-up");
  expect(row.payload_json).toEqual({ version: 2, followUp: true });
  expect(row.payload_fingerprint).toBe(
    fingerprint({ version: 2, followUp: true }),
  );
  expect(row.max_attempts).toBe(2);
  expect(row.available_at).toBe(RERUN_AT);
  expect(row.generation).toBe(2);
  expect(row.lease_token_hash).toBeNull();
  expect(row.lease_owner).toBeNull();
  expect(row.lease_expires_at).toBeNull();
  expect(row.redeliver_current_attempt).toBe(false);
  expect(row.rerun_requested).toBe(false);
  expect(row.rerun_queue_name).toBeNull();
  expect(row.rerun_payload_json).toBeNull();
  expect(row.rerun_payload_fingerprint).toBeNull();
  expect(row.rerun_max_attempts).toBeNull();
  expect(row.rerun_available_at).toBeNull();
  expect(row.result_json).toBeNull();
  expect(row.last_error_code).toBeNull();
  expect(row.last_error_summary).toBeNull();
  expect(row.completed_at).toBeNull();
}

describe("Task 8 PostgreSQL adapter repair contract", () => {
  it("handles two absent-identity enqueues through a conflict-safe insert", async () => {
    const database = new FakePostgres({ simulateFirstInsertConflict: true });
    const port = makePort(database);

    const results = await Promise.all([
      port.enqueue(enqueueRequest()),
      port.enqueue(enqueueRequest()),
    ]);

    expect(results.map((result) => result.outcome)).toEqual([
      "refreshed",
      "refreshed",
    ]);
    expect(
      database.calls.findIndex((call) =>
        call.text.includes("ON CONFLICT DO NOTHING"),
      ),
    ).toBe(0);
    expect(
      database.calls.findIndex(
        (call) =>
          call.text.includes("SELECT *") &&
          call.text.includes('FROM "durable_jobs"'),
      ),
    ).toBeGreaterThan(0);
    expect(database.row(RACE_JOB_ID).state).toBe("pending");
  });

  it("promotes and clears rerun data when settle, fail, or reclaim ends a lease", async () => {
    const settleDatabase = new FakePostgres();
    settleDatabase.seed(makeRerunRow());
    const settleResult = await makePort(settleDatabase).settle(leaseRequest());
    expect(settleResult).toEqual({ outcome: "settled", state: "succeeded" });
    expectPromoted(settleDatabase.row());

    const failDatabase = new FakePostgres();
    failDatabase.seed(makeRerunRow());
    const failResult = await makePort(failDatabase).fail(failRequest());
    expect(failResult).toEqual({
      outcome: "retry-scheduled",
      availableAt: RERUN_AT,
    });
    expectPromoted(failDatabase.row());

    const reclaimDatabase = new FakePostgres();
    reclaimDatabase.seed(
      makeRerunRow({ lease_expires_at: EXPIRED, updated_at: EXPIRED }),
    );
    const reclaimResult = await makePort(reclaimDatabase).reclaimExpired({
      tenant: { mode: "global" },
      limit: 1,
      now: NOW,
    });
    expect(reclaimResult).toEqual({ outcome: "reclaimed", count: 1 });
    expectPromoted(reclaimDatabase.row());
  });

  it("uses attempt-based jittered retry delays within a bounded exponential range", async () => {
    const attemptOneDatabase = new FakePostgres();
    attemptOneDatabase.seed(
      makeRow({
        attempt: 1,
        lease_expires_at: "2030-01-01T01:05:00.000Z",
      }),
    );
    const attemptOne = await makePort(attemptOneDatabase).fail(
      failRequest(RETRY_NOW),
    );
    if (attemptOne.outcome !== "retry-scheduled") {
      throw new Error("Attempt one did not schedule a retry.");
    }
    const attemptOneDelay =
      Date.parse(attemptOne.availableAt) - Date.parse(RETRY_NOW);
    expect(attemptOneDelay).toBeGreaterThan(1_000);
    expect(attemptOneDelay).toBeLessThanOrEqual(1_250);

    const attemptTwoDatabase = new FakePostgres();
    attemptTwoDatabase.seed(
      makeRow({
        attempt: 2,
        lease_expires_at: "2030-01-01T01:05:00.000Z",
      }),
    );
    const attemptTwo = await makePort(attemptTwoDatabase).fail(
      failRequest(RETRY_NOW),
    );
    if (attemptTwo.outcome !== "retry-scheduled") {
      throw new Error("Attempt two did not schedule a retry.");
    }
    const attemptTwoDelay =
      Date.parse(attemptTwo.availableAt) - Date.parse(RETRY_NOW);
    expect(attemptTwoDelay).toBeGreaterThan(2_000);
    expect(attemptTwoDelay).toBeLessThanOrEqual(2_250);

    const cappedDatabase = new FakePostgres();
    cappedDatabase.seed(
      makeRow({
        attempt: 20,
        max_attempts: 100,
        lease_expires_at: "2030-01-01T01:05:00.000Z",
      }),
    );
    const capped = await makePort(cappedDatabase).fail(failRequest(RETRY_NOW));
    if (capped.outcome !== "retry-scheduled") {
      throw new Error("Capped retry did not schedule a retry.");
    }
    expect(Date.parse(capped.availableAt) - Date.parse(RETRY_NOW)).toBe(60_000);
  });

  it("uses the returned keyset cursor for the next dead-letter page", async () => {
    const database = new FakePostgres();
    database.seed(
      makeRow({
        id: JOB_ID,
        state: "dead",
        attempt: 3,
        completed_at: NOW,
        updated_at: "2030-01-01T00:01:00.000Z",
        lease_token_hash: null,
        lease_owner: null,
        lease_expires_at: null,
        last_error_code: "DEAD_FAILURE",
        last_error_summary: "First failure",
      }),
    );
    database.seed(
      makeRow({
        id: SECOND_JOB_ID,
        state: "dead",
        attempt: 3,
        completed_at: NOW,
        updated_at: "2030-01-01T00:02:00.000Z",
        lease_token_hash: null,
        lease_owner: null,
        lease_expires_at: null,
        last_error_code: "DEAD_FAILURE",
        last_error_summary: "Second failure",
      }),
    );
    database.seed(
      makeRow({
        id: THIRD_JOB_ID,
        state: "dead",
        attempt: 3,
        completed_at: NOW,
        updated_at: "2030-01-01T00:03:00.000Z",
        lease_token_hash: null,
        lease_owner: null,
        lease_expires_at: null,
        last_error_code: "DEAD_FAILURE",
        last_error_summary: "Third failure",
      }),
    );
    const port = makePort(database);
    const firstPage = await port.listDead({
      queueName: QUEUE,
      tenant: { mode: "global" },
      limit: 1,
    });
    expect(firstPage.jobs.map((job) => job.id)).toEqual([JOB_ID]);
    expect(firstPage.nextCursor).toBeDefined();

    const secondPage = await port.listDead({
      queueName: QUEUE,
      tenant: { mode: "global" },
      limit: 1,
      cursor: firstPage.nextCursor,
    });
    expect(secondPage.jobs.map((job) => job.id)).toEqual([SECOND_JOB_ID]);
    expect(secondPage.nextCursor).toBeDefined();
    expect(database.calls.at(-1)?.text).toContain('("updated_at", "id") >');

    const thirdPage = await port.listDead({
      queueName: QUEUE,
      tenant: { mode: "global" },
      limit: 1,
      cursor: secondPage.nextCursor,
    });
    expect(thirdPage.jobs.map((job) => job.id)).toEqual([THIRD_JOB_ID]);
    expect(thirdPage.nextCursor).toBeUndefined();
  });
});
