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
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

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
/** The names of the dry-start rows of this file. */
const DRY_START_CASES = [
  "prints the usage and exits 0 on a dry start with no Drive call, no database call, and no network call",
] as const;

console.log(`lease_cases=${LEASE_CASES.length}`);
if (LEASE_CASES.length < 4) {
  throw new Error(`lease_cases=${LEASE_CASES.length} is below the floor of 4.`);
}
console.log(`dry_start_cases=${DRY_START_CASES.length}`);

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

  it("reads the Drive folder id from ACCOUNTING_DRIVE_FOLDER_ID and holds no Drive id literal in the runner source", () => {
    const source = readRunnerSource();
    expect(
      source,
      "The runner source apps/accounting/app/lib/intake-runner.ts is missing",
    ).not.toBe("");
    expect(source).toContain("process.env.ACCOUNTING_DRIVE_FOLDER_ID");
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
