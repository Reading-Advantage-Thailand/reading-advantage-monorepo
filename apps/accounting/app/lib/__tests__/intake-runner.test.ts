// @vitest-environment node
/**
 * Red tests for the intake runner, the lease, and the dry start of the track
 * `accounting_drive_intake_20261109` (plan task 3.3).
 *
 * The runner module `apps/accounting/app/lib/intake-runner.ts` does not exist
 * yet, so every row loads it through a soft loader and fails on the assertion
 * `The runner module apps/accounting/app/lib/intake-runner.ts is missing` or
 * on the missing export of the poll entry. The file loads without any other
 * error.
 *
 * This file pins the contract of the runner:
 *
 * - the runner exports one poll entry. The accepted names are `runIntakePoll`,
 *   `runIntake`, `main`, `run`, `runIntakePollJob`, and `default`.
 * - the entry takes the argv array and returns a promise. It prints the usage
 *   and exits 0 when the argv holds `--help`.
 * - the lease claim lives in the intake module or in the runner module. The
 *   accepted export names are `claimIntakeLease`, `claimLease`,
 *   `acquireIntakeLease`, `acquireLease`, and `claimAccountingIntakeLease`.
 * - the lease claim takes a lease repository port and a request that names the
 *   queue, the worker, the lease token, and the lease expiry.
 *
 * Every port is a fake. No test opens a database connection, calls Drive, or
 * reaches the network. The queue name, the worker id, the lease token, and the
 * folder id are fakes.
 *
 * Remediation r1 (plan task 3.10) pins three more exports of the runner:
 * `readIntakePollActor(env)`, `createPostgresIntakeLeaseRepository(sql)`, and
 * `runIntakePollEntry(argv, dependencies?)`. It also pins the folder id read
 * (`readIntakeFolderId` before the database client), the lease release on a
 * trap, the lease SQL, the safe entry log, the one lease-call shape of
 * `claimIntakeLease`, and the one `haveSameBytes` definition of the app.
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it, vi } from "vitest";

/** Fake company id of every fixture. */
const COMPANY_ID = "33333333-3333-4333-8333-333333333333";
/** Fake queue name of the intake lease. */
const QUEUE_NAME = "accounting-intake-poll";
/** Fake lease token of the intake lease. */
const LEASE_TOKEN = "fake-lease-token";
/** Fake second lease token of the intake lease. */
const OTHER_LEASE_TOKEN = "fake-lease-token-two";
/** Fake worker id of the intake lease. */
const WORKER_ID = "fake-worker-1";
/** Fake second worker id of the intake lease. */
const OTHER_WORKER_ID = "fake-worker-2";
/** The accepted names of the poll entry of the runner. */
const ENTRY_NAMES = [
  "runIntakePoll",
  "runIntake",
  "main",
  "run",
  "runIntakePollJob",
  "default",
] as const;
/** The accepted names of the lease claim of the runner or the intake module. */
const LEASE_NAMES = [
  "claimIntakeLease",
  "claimLease",
  "acquireIntakeLease",
  "acquireLease",
  "claimAccountingIntakeLease",
] as const;
/** The names of the lease rows of this file. */
const LEASE_CASES = [
  "claims the lease row of FR-6 for the intake queue",
  "refuses a second concurrent claim for the same queue",
  "reclaims an expired lease",
  "leaves the lease row reclaimable when a run traps",
] as const;
/** The names of the lease SQL rows of this file. */
const LEASE_SQL_CASES = [
  "binds the claim statement with the conflict update, the expiry guard, and returning",
  "returns undefined for an empty claim response",
  "binds the release statement with the scope, the queue, and the token",
] as const;
/** Fake account id of the poll actor. */
const ACCOUNT_ID = "99999999-9999-4999-8999-999999999999";
/** Fake Drive folder id of the entry row; no real id enters this file. */
const FAKE_FOLDER_ID = "fake-folder-id-0001";
/** The message of `readIntakeFolderId` for a blank folder id. */
const FOLDER_ID_MESSAGE = "The intake folder id is not configured";
/** The environment names the runner reads. */
const RUNNER_ENV_NAMES = [
  "ACCOUNTING_DATABASE_URL",
  "ACCOUNTING_DRIVE_FOLDER_ID",
  "ACCOUNTING_INTAKE_ACTOR_ID",
  "ACCOUNTING_INTAKE_COMPANY_ID",
  "ACCOUNTING_DUPLICATE_SCAN_CAP",
  "ACCOUNTING_EXTRACTION_MODEL",
] as const;
/** The names of the dry-start rows of this file. */
const DRY_START_CASES = [
  "prints the usage and exits 0 on a dry start with no Drive call, no database call, and no network call",
] as const;

console.log(`lease_cases=${LEASE_CASES.length}`);
if (LEASE_CASES.length < 4) {
  throw new Error(`lease_cases=${LEASE_CASES.length} is below the floor of 4.`);
}
console.log(`dry_start_cases=${DRY_START_CASES.length}`);
console.log(`lease_sql_cases_defined=${LEASE_SQL_CASES.length}`);

/** One recorded call of a fake port. */
interface RecordedCall {
  /** The method name the domain called. */
  readonly method: string;
  /** The arguments the domain passed. */
  readonly args: readonly unknown[];
}

/** One fake row of `accounting_intake_leases`. */
interface FakeLeaseRow {
  /** Queue name of the lease. */
  queueName: string;
  /** Lease token of the lease. */
  leaseToken: string;
  /** Worker that holds the lease. */
  workerId: string;
  /** Instant the lease expires. */
  leaseExpiresAt: number;
  /** Instant the lease was claimed. */
  claimedAt: number;
}

/**
 * Collects every number value inside one value tree.
 * @param value Value to walk.
 * @param found Collected numbers.
 * @returns The collected numbers.
 */
function collectNumbers(value: unknown, found: number[] = []): number[] {
  if (typeof value === "number") {
    found.push(value);
    return found;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectNumbers(item, found);
    return found;
  }
  if (value !== null && typeof value === "object") {
    for (const item of Object.values(value as Record<string, unknown>)) {
      collectNumbers(item, found);
    }
  }
  return found;
}

/**
 * Finds the first property value whose key is one of the given names.
 * @param args Arguments of one call.
 * @param names Accepted property names.
 * @returns The first matching value, or undefined.
 */
function findNamed(args: readonly unknown[], names: readonly string[]): unknown {
  for (const arg of args) {
    const found = findNamedIn(arg, names);
    if (found !== undefined) return found;
  }
  return undefined;
}

/**
 * Finds the first property value whose key is one of the given names.
 * @param value Value to walk.
 * @param names Accepted property names.
 * @returns The first matching value, or undefined.
 */
function findNamedIn(value: unknown, names: readonly string[]): unknown {
  if (value === null || typeof value !== "object") return undefined;
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findNamedIn(item, names);
      if (found !== undefined) return found;
    }
    return undefined;
  }
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    if (names.includes(key) && item !== undefined) return item;
  }
  for (const item of Object.values(value as Record<string, unknown>)) {
    const found = findNamedIn(item, names);
    if (found !== undefined) return found;
  }
  return undefined;
}

/**
 * Builds a recording proxy for one fake port.
 * @param handlers Method implementations keyed by method name.
 * @param fallback Implementation for a method without its own handler.
 * @returns The proxy and its recorded calls.
 */
function createRecordingPort(
  handlers: Record<string, (args: readonly unknown[]) => unknown>,
  fallback?: (args: readonly unknown[]) => unknown,
): { readonly port: Record<string, unknown>; readonly calls: RecordedCall[] } {
  const calls: RecordedCall[] = [];
  const port = new Proxy({} as Record<string, unknown>, {
    get(_target, property) {
      if (typeof property !== "string" || property === "then") {
        return undefined;
      }
      return (...args: unknown[]) => {
        calls.push({ method: property, args });
        const handler = handlers[property] ?? fallback;
        return handler === undefined ? undefined : handler(args);
      };
    },
  });
  return { port, calls };
}

/**
 * Builds the fake lease repository. The fake holds the compare-and-swap of the
 * lease: a live lease of another worker is not taken.
 * @param seed The lease rows the repository holds before the claim.
 * @returns The port, its recorded calls, and its rows.
 */
function createFakeLeaseRepository(
  seed: readonly FakeLeaseRow[] = [],
): {
  readonly port: Record<string, unknown>;
  readonly calls: RecordedCall[];
  readonly rows: Map<string, FakeLeaseRow>;
} {
  const rows = new Map<string, FakeLeaseRow>(
    seed.map((row) => [row.queueName, { ...row }]),
  );
  const { port, calls } = createRecordingPort({
    claim: (args) => {
      const queueName = String(
        findNamed(args, ["queueName", "queue_name"]) ?? QUEUE_NAME,
      );
      const leaseToken = String(
        findNamed(args, ["leaseToken", "lease_token", "token"]) ?? LEASE_TOKEN,
      );
      const workerId = String(
        findNamed(args, ["workerId", "worker_id"]) ?? WORKER_ID,
      );
      const expiresAt = Number(
        findNamed(args, ["leaseExpiresAt", "lease_expires_at"]) ??
          Date.now() + 60_000,
      );
      const now = Number(findNamed(args, ["now"]) ?? Date.now());
      const existing = rows.get(queueName);
      if (
        existing !== undefined &&
        existing.leaseToken !== leaseToken &&
        existing.leaseExpiresAt > now
      ) {
        return undefined;
      }
      const row: FakeLeaseRow = {
        queueName,
        leaseToken,
        workerId,
        leaseExpiresAt: expiresAt,
        claimedAt: now,
      };
      rows.set(queueName, row);
      return row;
    },
    release: (args) => {
      const queueName = String(
        findNamed(args, ["queueName", "queue_name"]) ?? QUEUE_NAME,
      );
      const row = rows.get(queueName);
      if (row !== undefined) row.leaseExpiresAt = Date.now() - 1;
      return row;
    },
    findByQueue: (args) => {
      const queueName = String(
        findNamed(args, ["queueName", "queue_name"]) ?? QUEUE_NAME,
      );
      return rows.get(queueName);
    },
  });
  return { port, calls, rows };
}

/**
 * Loads the runner module without a static import, so a missing module fails
 * an assertion instead of the whole file load.
 * @returns The module, or null when the module is missing.
 */
async function loadRunnerModule(): Promise<Record<string, unknown> | null> {
  const href = new URL("../intake-runner.ts", import.meta.url).href;
  try {
    return (await import(/* @vite-ignore */ href)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * Loads the intake domain module without a static import.
 * @returns The module, or null when the module is missing.
 */
async function loadIntakeModule(): Promise<Record<string, unknown> | null> {
  const href = new URL(
    "../../../../../packages/backend/src/modules/accounting/intake.ts",
    import.meta.url,
  ).href;
  try {
    return (await import(/* @vite-ignore */ href)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * Resolves the lease claim of the runner or of the intake module.
 * @returns The lease claim, or null after a failed assertion.
 */
async function requireLeaseClaim(): Promise<
  ((...args: unknown[]) => Promise<unknown>) | null
> {
  const runner = await loadRunnerModule();
  const intake = await loadIntakeModule();
  for (const module of [runner, intake]) {
    if (module === null) continue;
    for (const name of LEASE_NAMES) {
      const candidate = module[name];
      if (typeof candidate === "function") {
        return candidate as (...args: unknown[]) => Promise<unknown>;
      }
    }
  }
  expect(
    true,
    `The lease claim export is missing; the accepted names are ${LEASE_NAMES.join(", ")}`,
  ).toBe(false);
  return null;
}

/**
 * Resolves the poll entry of the runner module.
 * @returns The poll entry, or null after a failed assertion.
 */
async function requireRunnerEntry(): Promise<
  ((args: readonly string[]) => Promise<unknown>) | null
> {
  const module = await loadRunnerModule();
  expect(
    module,
    "The runner module apps/accounting/app/lib/intake-runner.ts is missing",
  ).not.toBeNull();
  if (module === null) return null;
  for (const name of ENTRY_NAMES) {
    const candidate = module[name];
    if (typeof candidate === "function") {
      return candidate as (args: readonly string[]) => Promise<unknown>;
    }
  }
  expect(
    true,
    `The runner module does not export a poll entry; the accepted names are ${ENTRY_NAMES.join(", ")}`,
  ).toBe(false);
  return null;
}

/**
 * Builds the request of one lease claim.
 * @param leaseRepository The fake lease repository.
 * @param leaseToken The lease token of the claim.
 * @param workerId The worker of the claim.
 * @param leaseExpiresAt The expiry of the claim.
 * @returns The request of the claim.
 */
function buildLeaseRequest(
  leaseRepository: Record<string, unknown>,
  leaseToken: string,
  workerId: string,
  leaseExpiresAt: number,
): Record<string, unknown> {
  return {
    repository: leaseRepository,
    leaseRepository,
    intakeLeaseRepository: leaseRepository,
    scope: { companyId: COMPANY_ID },
    companyId: COMPANY_ID,
    queueName: QUEUE_NAME,
    workerId,
    leaseToken,
    leaseExpiresAt,
  };
}

/**
 * Reads the runner source of the app.
 * @returns The source text, or an empty string when the file is missing.
 */
function readRunnerSource(): string {
  const path = new URL("../intake-runner.ts", import.meta.url);
  if (!existsSync(path)) return "";
  return readFileSync(path, "utf8");
}

/**
 * Lists every file under one folder.
 * @param folder Folder to walk.
 * @returns The file paths.
 */
function listFiles(folder: string): string[] {
  if (!existsSync(folder)) return [];
  const found: string[] = [];
  for (const entry of readdirSync(folder)) {
    const path = join(folder, entry);
    if (statSync(path).isDirectory()) {
      found.push(...listFiles(path));
    } else {
      found.push(path);
    }
  }
  return found;
}

/**
 * Counts the matches of one pattern inside one text.
 * @param text Text to scan.
 * @param pattern Pattern to count.
 * @returns The number of matches.
 */
function countMatches(text: string, pattern: RegExp): number {
  const flags = pattern.flags.includes("g")
    ? pattern.flags
    : `${pattern.flags}g`;
  return text.match(new RegExp(pattern.source, flags))?.length ?? 0;
}


/**
 * Resolves one export of the runner module.
 * @param name Export name.
 * @returns The export as a function, or null after a failed assertion.
 */
async function requireRunnerExport(
  name: string,
): Promise<((...args: never[]) => unknown) | null> {
  const module = await loadRunnerModule();
  expect(
    module,
    "The runner module apps/accounting/app/lib/intake-runner.ts is missing",
  ).not.toBeNull();
  if (module === null) return null;
  expect(
    typeof module[name],
    `The runner module does not export ${name}`,
  ).toBe("function");
  if (typeof module[name] !== "function") return null;
  return module[name] as (...args: never[]) => unknown;
}

/**
 * Runs one body with the runner environment names set, then restores them.
 * @param values The value of each environment name; a missing name is deleted.
 * @param body The body to run.
 * @returns The result of the body.
 */
async function withRunnerEnv<T>(
  values: Partial<Record<(typeof RUNNER_ENV_NAMES)[number], string>>,
  body: () => Promise<T>,
): Promise<T> {
  const previous = new Map<string, string | undefined>();
  for (const name of RUNNER_ENV_NAMES) {
    previous.set(name, process.env[name]);
    const value = values[name];
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
  try {
    return await body();
  } finally {
    for (const [name, value] of previous) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  }
}

/**
 * Captures every console and standard error write during one run.
 * @param run The run to capture.
 * @returns The result, the error, and the captured text lines.
 */
async function captureOutput<T>(run: () => Promise<T>): Promise<{
  readonly result: T | undefined;
  readonly error: unknown;
  readonly lines: readonly string[];
}> {
  const lines: string[] = [];
  const record = (...args: unknown[]): void => {
    lines.push(args.map((arg) => String(arg)).join(" "));
  };
  const original = {
    log: console.log,
    info: console.info,
    warn: console.warn,
    error: console.error,
    stderr: process.stderr.write,
  };
  console.log = record;
  console.info = record;
  console.warn = record;
  console.error = record;
  process.stderr.write = ((chunk: unknown) => {
    lines.push(String(chunk));
    return true;
  }) as typeof process.stderr.write;
  try {
    const result = await run();
    return { result, error: undefined, lines };
  } catch (error) {
    return { result: undefined, error, lines };
  } finally {
    console.log = original.log;
    console.info = original.info;
    console.warn = original.warn;
    console.error = original.error;
    process.stderr.write = original.stderr;
  }
}

/**
 * Builds the injected dependencies of one poll run. Only the source and the
 * lease repository work; the other ports are never reached because the source
 * listing throws first.
 * @param source The fake Drive source port.
 * @param leaseRepository The fake lease repository port.
 * @returns The dependencies.
 */
function buildPollDependencies(
  source: Record<string, unknown>,
  leaseRepository: Record<string, unknown>,
): Record<string, unknown> {
  return {
    actor: { accountId: ACCOUNT_ID, companyId: COMPANY_ID, role: "ACCOUNTANT" },
    folderId: FAKE_FOLDER_ID,
    source,
    evidenceStore: {},
    intakeRepository: {},
    submissionRepository: {},
    localReader: {},
    extraction: {},
    leaseRepository,
  };
}

/** One recorded SQL call. */
interface SqlCall {
  /** The joined statement text; each bound value shows as `?`. */
  readonly statement: string;
  /** The bound values in order. */
  readonly values: readonly unknown[];
}

/**
 * Creates a tagged SQL double with ordered query responses and captured bindings.
 * @param responses The row list that each statement returns, in order.
 * @returns The recorded calls and the SQL double.
 */
function sqlDouble(responses: readonly (readonly Record<string, unknown>[])[]): {
  readonly calls: SqlCall[];
  readonly sql: unknown;
} {
  const pending = [...responses];
  const calls: SqlCall[] = [];
  const tagged = vi.fn(
    async (strings: TemplateStringsArray, ...values: readonly unknown[]) => {
      calls.push({ statement: strings.join("?"), values });
      const response = pending.shift();
      if (response === undefined) throw new Error("Unexpected SQL statement.");
      return response;
    },
  );
  return { calls, sql: tagged };
}

/**
 * Collapses the whitespace of one statement and lowercases it.
 * @param statement The joined statement text.
 * @returns The normalized statement.
 */
function normalizeStatement(statement: string): string {
  return statement.replace(/\s+/gu, " ").trim().toLowerCase();
}

/**
 * Runs one body and returns the error it throws or rejects with.
 * @param body The body to run.
 * @returns The error, or undefined when the body completes.
 */
async function captureError(body: () => unknown): Promise<unknown> {
  try {
    await body();
    return undefined;
  } catch (error) {
    return error;
  }
}

/**
 * Reads the source text of one app file.
 * @param relativePath Path relative to the `app/lib` folder.
 * @returns The source text, or an empty string when the file is missing.
 */
function readLibSource(relativePath: string): string {
  const path = new URL(`../${relativePath}`, import.meta.url);
  if (!existsSync(path)) return "";
  return readFileSync(path, "utf8");
}

describe("the intake runner lease", () => {
  it("claims the lease row of FR-6 for the intake queue", async () => {
    const claim = await requireLeaseClaim();
    if (claim === null) return;
    const lease = createFakeLeaseRepository();

    await claim(
      buildLeaseRequest(
        lease.port,
        LEASE_TOKEN,
        WORKER_ID,
        Date.now() + 60_000,
      ),
    );

    expect(lease.calls.length).toBeGreaterThan(0);
    const row = lease.rows.get(QUEUE_NAME);
    expect(row).toBeDefined();
    expect(row?.leaseToken).toBe(LEASE_TOKEN);
    expect(row?.workerId).toBe(WORKER_ID);
  });

  it("refuses a second concurrent claim for the same queue", async () => {
    const claim = await requireLeaseClaim();
    if (claim === null) return;
    const lease = createFakeLeaseRepository();

    await claim(
      buildLeaseRequest(
        lease.port,
        LEASE_TOKEN,
        WORKER_ID,
        Date.now() + 60_000,
      ),
    );
    await claim(
      buildLeaseRequest(
        lease.port,
        OTHER_LEASE_TOKEN,
        OTHER_WORKER_ID,
        Date.now() + 60_000,
      ),
    );

    expect(lease.calls.length).toBeGreaterThanOrEqual(2);
    expect(lease.rows.get(QUEUE_NAME)?.leaseToken).toBe(LEASE_TOKEN);
    expect(lease.rows.get(QUEUE_NAME)?.workerId).toBe(WORKER_ID);
  });

  it("reclaims an expired lease", async () => {
    const claim = await requireLeaseClaim();
    if (claim === null) return;
    const lease = createFakeLeaseRepository([
      {
        queueName: QUEUE_NAME,
        leaseToken: LEASE_TOKEN,
        workerId: WORKER_ID,
        leaseExpiresAt: Date.now() - 60_000,
        claimedAt: Date.now() - 120_000,
      },
    ]);

    await claim(
      buildLeaseRequest(
        lease.port,
        OTHER_LEASE_TOKEN,
        OTHER_WORKER_ID,
        Date.now() + 60_000,
      ),
    );

    expect(lease.rows.get(QUEUE_NAME)?.leaseToken).toBe(OTHER_LEASE_TOKEN);
    expect(lease.rows.get(QUEUE_NAME)?.workerId).toBe(OTHER_WORKER_ID);
  });

  it("leaves the lease row reclaimable when a run traps", async () => {
    const claim = await requireLeaseClaim();
    if (claim === null) return;
    const lease = createFakeLeaseRepository();

    await claim(
      buildLeaseRequest(
        lease.port,
        LEASE_TOKEN,
        WORKER_ID,
        Date.now() + 60_000,
      ),
    );

    const row = lease.rows.get(QUEUE_NAME);
    expect(row).toBeDefined();
    expect(row?.leaseExpiresAt).toBeGreaterThan(Date.now());
    const expiry = collectNumbers(
      lease.calls.map((call) => call.args),
    ).find((value) => value > Date.now());
    expect(expiry).toBeDefined();
  });
});

describe("the intake runner surface", () => {
  it("is not reachable from a route handler", () => {
    const apiFolder = new URL("../../api", import.meta.url).pathname;
    const routeFiles = listFiles(apiFolder).filter((path) =>
      /\.(ts|tsx)$/u.test(path),
    );
    const hits = routeFiles.filter((path) =>
      readFileSync(path, "utf8").includes("intake-runner"),
    );

    expect(hits).toEqual([]);
  });

  it("reads the Drive folder id through readIntakeFolderId with no blank default and holds no Drive id literal in the runner source", () => {
    const source = readRunnerSource();
    expect(
      source,
      "The runner source apps/accounting/app/lib/intake-runner.ts is missing",
    ).not.toBe("");
    expect(source).toContain("readIntakeFolderId(");
    expect(source).not.toMatch(/ACCOUNTING_DRIVE_FOLDER_ID\s*\?\?\s*""/u);
    expect(countMatches(source, /["'][A-Za-z0-9_-]{28,}["']/u)).toBe(0);
  });

  it("prints the usage and exits 0 on a dry start with no Drive call, no database call, and no network call", async () => {
    const entry = await requireRunnerEntry();
    if (entry === null) return;
    const output: string[] = [];
    const record = (...args: unknown[]): void => {
      output.push(args.map((arg) => String(arg)).join(" "));
    };
    const originalLog = console.log;
    const originalInfo = console.info;
    const originalError = console.error;
    const originalExit = process.exit;
    const exitCodes: number[] = [];
    const originalArgv = process.argv;
    console.log = record;
    console.info = record;
    console.error = record;
    process.exit = ((code?: number) => {
      exitCodes.push(code ?? 0);
      throw new Error("dry-start-exit");
    }) as never;
    process.argv = ["node", "intake-runner", "--help"];
    let thrown: unknown;
    try {
      await entry(["--help"]);
    } catch (error) {
      thrown = error;
    } finally {
      console.log = originalLog;
      console.info = originalInfo;
      console.error = originalError;
      process.exit = originalExit;
      process.argv = originalArgv;
    }
    if (thrown !== undefined && String(thrown) !== "dry-start-exit") {
      throw thrown;
    }

    const exitCode = exitCodes.length === 0 ? 0 : exitCodes[0];
    expect(exitCode).toBe(0);
    expect(output.join("\n")).toMatch(/usage/iu);
  });
});

describe("the intake runner actor and folder id", () => {
  it("returns the actor with the fixed role ACCOUNTANT and makes no database call (F304)", async () => {
    const readActor = await requireRunnerExport("readIntakePollActor");
    if (readActor === null) return;
    // The environment holds no database URL, so a database call would fail.
    const env = {
      ACCOUNTING_INTAKE_ACTOR_ID: ACCOUNT_ID,
      ACCOUNTING_INTAKE_COMPANY_ID: COMPANY_ID,
    } as never;

    const actor = await Promise.resolve(readActor(env));

    expect(actor).toEqual({
      accountId: ACCOUNT_ID,
      companyId: COMPANY_ID,
      role: "ACCOUNTANT",
    });
  });

  it("throws a safe error for a blank company id, a company id that is not a UUID, and a blank actor id (F304)", async () => {
    const readActor = await requireRunnerExport("readIntakePollActor");
    if (readActor === null) return;
    const notUuid = "fake-company-not-a-uuid-0002";
    const cases = [
      {
        label: "blank company id",
        env: {
          ACCOUNTING_INTAKE_ACTOR_ID: ACCOUNT_ID,
          ACCOUNTING_INTAKE_COMPANY_ID: "  ",
        },
        value: "",
      },
      {
        label: "company id that is not a UUID",
        env: {
          ACCOUNTING_INTAKE_ACTOR_ID: ACCOUNT_ID,
          ACCOUNTING_INTAKE_COMPANY_ID: notUuid,
        },
        value: notUuid,
      },
      {
        label: "blank actor id",
        env: {
          ACCOUNTING_INTAKE_ACTOR_ID: "",
          ACCOUNTING_INTAKE_COMPANY_ID: COMPANY_ID,
        },
        value: COMPANY_ID,
      },
    ];
    for (const item of cases) {
      const error = await captureError(() => readActor(item.env as never));

      expect(error, item.label).toBeInstanceOf(Error);
      const message = (error as Error).message;
      expect(message.length, item.label).toBeGreaterThan(0);
      if (item.value !== "") {
        expect(message, item.label).not.toContain(item.value);
      }
    }
  });

  it("holds no company_product_principals token in the runner source (F304)", () => {
    const source = readRunnerSource();
    expect(source).not.toBe("");
    expect(countMatches(source, /company_product_principals/u)).toBe(0);
  });

  it("rejects runIntakePoll with the message of readIntakeFolderId for a blank folder id and reads it before the database client (Review B F305)", async () => {
    const run = await requireRunnerExport("runIntakePoll");
    if (run === null) return;
    // The adapter holds the message of readIntakeFolderId.
    expect(readLibSource("drive-document-source.ts")).toContain(
      FOLDER_ID_MESSAGE,
    );
    // The database URL stays blank, so any database call before the folder id
    // read fails with a database message and not with the folder id message.
    const error = await withRunnerEnv(
      {
        ACCOUNTING_DATABASE_URL: "",
        ACCOUNTING_DRIVE_FOLDER_ID: "",
        ACCOUNTING_INTAKE_ACTOR_ID: ACCOUNT_ID,
        ACCOUNTING_INTAKE_COMPANY_ID: COMPANY_ID,
        ACCOUNTING_DUPLICATE_SCAN_CAP: "500",
        ACCOUNTING_EXTRACTION_MODEL: "fake-model-name-0003",
      },
      () => captureError(() => (run as (argv: string[]) => unknown)([])),
    );

    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toBe(FOLDER_ID_MESSAGE);
  });

  it("reads the actor before the database client for a blank company id (PM-21)", async () => {
    const run = await requireRunnerExport("runIntakePoll");
    if (run === null) return;
    const error = await withRunnerEnv(
      {
        ACCOUNTING_DATABASE_URL: "",
        ACCOUNTING_DRIVE_FOLDER_ID: "fake-intake-folder-id",
        ACCOUNTING_INTAKE_ACTOR_ID: ACCOUNT_ID,
        ACCOUNTING_INTAKE_COMPANY_ID: "",
      },
      () => captureError(() => (run as (argv: string[]) => unknown)([])),
    );

    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).not.toMatch(/database/iu);
  });
});

describe("the intake runner trap and lease SQL", () => {
  it("releases the lease once with the claimed token when the poll throws (F309)", async () => {
    const run = await requireRunnerExport("runIntakePoll");
    if (run === null) return;
    const lease = createFakeLeaseRepository();
    const source = {
      list: async () => {
        throw new Error("fake drive failure");
      },
      download: async () => new Uint8Array(),
      export: async () => new Uint8Array(),
    };
    const dependencies = buildPollDependencies(source, lease.port);

    const { error } = await captureOutput(() =>
      (run as (argv: string[], deps: unknown) => Promise<unknown>)(
        [],
        dependencies,
      ),
    );

    expect(error).toBeInstanceOf(Error);
    const claimCalls = lease.calls.filter((call) => call.method === "claim");
    const releaseCalls = lease.calls.filter((call) => call.method === "release");
    console.log(`release_calls=${releaseCalls.length}`);
    expect(claimCalls.length).toBe(1);
    expect(releaseCalls.length).toBe(1);
    const claimedToken = findNamed(claimCalls[0]?.args ?? [], ["leaseToken"]);
    expect(typeof claimedToken).toBe("string");
    expect(findNamed(releaseCalls[0]?.args ?? [], ["leaseToken"])).toBe(
      claimedToken,
    );
  });

  it("binds the claim statement with the conflict update, the expiry guard, and returning (F309)", async () => {
    const create = await requireRunnerExport("createPostgresIntakeLeaseRepository");
    if (create === null) return;
    const claimedAt = "2026-11-13T02:00:00.000Z";
    const double = sqlDouble([
      [
        {
          queue_name: QUEUE_NAME,
          lease_token: LEASE_TOKEN,
          worker_id: WORKER_ID,
          lease_expires_at: "2026-11-13T02:30:00.000Z",
          claimed_at: claimedAt,
        },
      ],
    ]);
    const repository = (create as (sql: unknown) => Record<string, (input: unknown) => Promise<unknown>>)(
      double.sql,
    );

    const lease = (await repository.claim?.({
      scope: { companyId: COMPANY_ID },
      queueName: QUEUE_NAME,
      workerId: WORKER_ID,
      leaseToken: LEASE_TOKEN,
      leaseExpiresAt: new Date("2026-11-13T02:30:00.000Z"),
      now: Date.parse(claimedAt),
    })) as { readonly leaseToken?: string } | undefined;

    expect(double.calls.length).toBe(1);
    const statement = normalizeStatement(double.calls[0]?.statement ?? "");
    expect(statement).toContain(
      "on conflict (scope_company_id, queue_name) do update",
    );
    expect(statement).toContain(
      "where accounting_intake_leases.lease_expires_at <= excluded.claimed_at",
    );
    expect(statement).toContain("returning");
    for (const bound of [COMPANY_ID, QUEUE_NAME, WORKER_ID, LEASE_TOKEN]) {
      expect(double.calls[0]?.values).toContain(bound);
    }
    expect(lease?.leaseToken).toBe(LEASE_TOKEN);
  });

  it("returns undefined for an empty claim response (F309)", async () => {
    const create = await requireRunnerExport("createPostgresIntakeLeaseRepository");
    if (create === null) return;
    const double = sqlDouble([[]]);
    const repository = (create as (sql: unknown) => Record<string, (input: unknown) => Promise<unknown>>)(
      double.sql,
    );

    const lease = await repository.claim?.({
      scope: { companyId: COMPANY_ID },
      queueName: QUEUE_NAME,
      workerId: WORKER_ID,
      leaseToken: LEASE_TOKEN,
      leaseExpiresAt: new Date(Date.now() + 60_000),
    });

    expect(double.calls.length).toBe(1);
    expect(lease).toBeUndefined();
  });

  it("binds the release statement with the scope, the queue, and the token (F309)", async () => {
    const create = await requireRunnerExport("createPostgresIntakeLeaseRepository");
    if (create === null) return;
    const double = sqlDouble([[]]);
    const repository = (create as (sql: unknown) => Record<string, (input: unknown) => Promise<unknown>>)(
      double.sql,
    );

    await repository.release?.({
      scope: { companyId: COMPANY_ID },
      queueName: QUEUE_NAME,
      leaseToken: LEASE_TOKEN,
    });

    expect(double.calls.length).toBe(1);
    const statement = normalizeStatement(double.calls[0]?.statement ?? "");
    expect(statement.startsWith("update accounting_intake_leases")).toBe(true);
    const where = statement.slice(statement.lastIndexOf(" where ") + 7);
    expect(where).toMatch(/scope_company_id\s*=\s*\?/u);
    expect(where).toMatch(/queue_name\s*=\s*\?/u);
    expect(where).toMatch(/lease_token\s*=\s*\?/u);
    for (const bound of [COMPANY_ID, QUEUE_NAME, LEASE_TOKEN]) {
      expect(double.calls[0]?.values).toContain(bound);
    }
    console.log(`lease_sql_cases=${LEASE_SQL_CASES.length}`);
  });
});

describe("the intake runner entry", () => {
  it("returns 1 and logs one line with the event and the error name only when the listing throws an error with a folder id (F313, Review B F307)", async () => {
    const entry = await requireRunnerExport("runIntakePollEntry");
    if (entry === null) return;
    const url = `https://www.googleapis.com/drive/v3/files?q=%27${FAKE_FOLDER_ID}%27+in+parents`;
    class FakeDriveError extends Error {
      /** Request configuration that a real client error carries. */
      readonly config = { url };

      constructor() {
        super(`Request failed for ${url}`);
        this.name = "FakeDriveError";
      }
    }
    const lease = createFakeLeaseRepository();
    const source = {
      list: async () => {
        throw new FakeDriveError();
      },
      download: async () => new Uint8Array(),
      export: async () => new Uint8Array(),
    };
    const dependencies = buildPollDependencies(source, lease.port);

    const { result, error, lines } = await captureOutput(() =>
      (entry as (argv: string[], deps: unknown) => Promise<unknown>)(
        [],
        dependencies,
      ),
    );

    expect(error).toBeUndefined();
    expect(result).toBe(1);
    const text = lines.join("\n");
    expect(text).not.toContain(FAKE_FOLDER_ID);
    expect(text).not.toContain("Request failed");
    const failedLines = text
      .split("\n")
      .filter((line) => line.includes("intake_poll_failed"));
    console.log(`entry_error_cases=${failedLines.length}`);
    expect(failedLines.length).toBe(1);
    const record = JSON.parse(failedLines[0] ?? "{}") as Record<string, unknown>;
    expect(Object.keys(record).sort()).toEqual(["error_name", "event"]);
    expect(record.event).toBe("intake_poll_failed");
    expect(record.error_name).toBe("FakeDriveError");
  });

  it("calls runIntakePollEntry from the module entry block and sets process.exitCode (F313)", () => {
    const source = readRunnerSource();
    expect(source).not.toBe("");
    const entryBlock = source.slice(source.lastIndexOf("import.meta.url"));
    expect(entryBlock).toContain("runIntakePollEntry(");
    expect(entryBlock).toContain("process.exitCode");
  });
});

describe("the intake lease call and the shared helpers", () => {
  it("throws invalid-input and makes no claim call for a request with no scope (F310)", async () => {
    const intake = await loadIntakeModule();
    expect(
      intake,
      "The module packages/backend/src/modules/accounting/intake.ts is missing",
    ).not.toBeNull();
    const claim = intake?.claimIntakeLease as
      | ((request: unknown) => Promise<unknown>)
      | undefined;
    expect(typeof claim).toBe("function");
    if (claim === undefined) return;
    const base = {
      queueName: QUEUE_NAME,
      workerId: WORKER_ID,
      leaseToken: LEASE_TOKEN,
      leaseExpiresAt: Date.now() + 60_000,
    };
    const cases = [
      { label: "no scope and no company", request: (port: unknown) => ({ ...base, repository: port }) },
      { label: "company id only", request: (port: unknown) => ({ ...base, repository: port, companyId: COMPANY_ID }) },
      { label: "alias leaseRepository only", request: (port: unknown) => ({ ...base, leaseRepository: port, scope: { companyId: COMPANY_ID } }) },
      { label: "alias intakeLeaseRepository only", request: (port: unknown) => ({ ...base, intakeLeaseRepository: port, scope: { companyId: COMPANY_ID } }) },
    ];
    for (const item of cases) {
      const lease = createFakeLeaseRepository();

      const error = await captureError(() => claim(item.request(lease.port)));

      expect(error, item.label).toBeInstanceOf(Error);
      expect((error as { reason?: string }).reason, item.label).toBe("invalid-input");
      expect(lease.calls.length, item.label).toBe(0);
    }
    const accepted = createFakeLeaseRepository();
    await claim({
      ...base,
      repository: accepted.port,
      scope: { companyId: COMPANY_ID },
    });
    expect(accepted.calls.filter((call) => call.method === "claim").length).toBe(1);
  });

  it("exports no googleSheetMimeType from the Drive adapter (F310)", () => {
    const source = readLibSource("drive-document-source.ts");
    expect(source).not.toBe("");
    expect(source).toMatch(/export\s+function\s+createDriveDocumentSource\b/u);
    expect(source).not.toMatch(
      /export\s+(?:async\s+)?(?:const|let|var|function)\s+googleSheetMimeType\b/u,
    );
    expect(source).not.toMatch(/export\s*\{[^}]*googleSheetMimeType/u);
  });

  it("holds exactly one haveSameBytes definition in the app, in the evidence store, and monthly-close imports it (F311)", () => {
    const appFolder = new URL("../..", import.meta.url).pathname;
    const files = listFiles(appFolder).filter((path) =>
      /\.(ts|tsx)$/u.test(path),
    );
    console.log(`files_scanned=${files.length}`);
    expect(files.length).toBeGreaterThanOrEqual(10);
    const definitions = files.filter((path) =>
      /\b(?:function\s+haveSameBytes\b|const\s+haveSameBytes\s*=)/u.test(
        readFileSync(path, "utf8"),
      ),
    );
    console.log(`have_same_bytes_definitions=${definitions.length}`);
    expect(definitions.length).toBe(1);
    expect(definitions[0]?.endsWith("/lib/accounting-evidence-store.ts")).toBe(true);
    const monthlyClose = readLibSource("monthly-close.ts");
    expect(monthlyClose).not.toBe("");
    expect(monthlyClose).toMatch(
      /import\s*\{[^}]*\bhaveSameBytes\b[^}]*\}\s*from\s*["']\.\/accounting-evidence-store(?:\.js)?["']/u,
    );
  });
});
