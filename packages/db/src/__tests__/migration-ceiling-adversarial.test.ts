/**
 * Adversarial migration-ceiling contract for the Codecamp hotfix
 * (track_id: codecamp_duplicate_lesson_hotfix_20260810, Phase 4).
 *
 * The original B2 ceiling coverage (`codecamp-0049-ledger-gap-deploy-contract.test.ts`)
 * proves only the non-terminal-successor rejection path. The Phase 4 closeout
 * review flagged that duplicate-tag, terminal-positive-control, blank, unknown,
 * and caller-propagation behaviors were not exercised as live-behavior tests,
 * so a regression that silently removed a guard or broke env-var forwarding
 * could pass that file by relying on source-string presence alone.
 *
 * This suite closes the gap with behavioral assertions against
 * `resolveMigrationCeiling` / `migrateProductDatabase` (via mocked postgres +
 * mocked migration-files) and a behavioral subprocess test against
 * `scripts/migrate.ts` that proves `MIGRATION_CEILING_TAG` is forwarded from
 * the shell into the runner's `resolveMigrationCeiling` validation. Each
 * reject case also asserts that `postgres()` is never called, so a future
 * regression that moves validation after client construction fails the test.
 *
 * Targeted adversarial command:
 *   cd packages/db && ./node_modules/.bin/vitest run \
 *     src/__tests__/migration-ceiling-adversarial.test.ts
 *
 * The `vi.hoisted` block holds the mock postgres client, the mock
 * `readPostgresMigrationFiles` override, and a per-test migration-fixture
 * array so each adversarial case can inject the journal shape it needs
 * (duplicate tags, terminal ceilings, blank/unknown values, the real
 * 0049_codecamp_exercise_quiz_repair + 0050_finance_operations_records
 * successor pair) without depending on the checked-in journal.
 */

import { spawn } from "node:child_process";
import { resolve } from "node:path";

import { beforeEach, describe, expect, it, vi } from "vitest";

const PACKAGE_ROOT = resolve(import.meta.dirname, "../..");
const MIGRATE_SCRIPT_PATH = resolve(PACKAGE_ROOT, "scripts/migrate.ts");

interface MigrationFixtureEntry {
  readonly tag: string;
  readonly folderMillis: number;
  readonly hash: string;
  readonly sql: readonly string[];
}

interface RunnerState {
  postgresCalls: number;
  migrations: MigrationFixtureEntry[];
}

const TERMINAL_0048_TAG = "0048_workbook_publishing";
const CURRENT_NON_TERMINAL_0049_TAG = "0049_codecamp_exercise_quiz_repair";
const SUCCESSOR_0050_TAG = "0050_finance_operations_records";

/**
 * Mocked migration runner state: tracks how many times `postgres()` is
 * constructed (call count is the "before DB connection" assertion target)
 * and exposes a mutable `migrations` array for per-test journal fixtures.
 */
const runnerState = vi.hoisted(() => {
  const state: RunnerState = {
    postgresCalls: 0,
    migrations: [],
  };
  const transaction = {
    unsafe: vi.fn(async (_query: unknown) => [] as unknown[]),
  };
  const client = {
    begin: vi.fn(
      async (
        callback: (value: typeof transaction) => Promise<void>,
      ): Promise<void> => callback(transaction),
    ),
    end: vi.fn(async (): Promise<void> => undefined),
  };
  return { client, state, transaction };
});

vi.mock("postgres", () => ({
  default: vi.fn(() => {
    runnerState.state.postgresCalls += 1;
    return runnerState.client;
  }),
}));

vi.mock("../migration-files.js", () => ({
  readPostgresMigrationFiles: vi.fn(() => runnerState.state.migrations),
}));

// Imported after the mocks above so the migration runner picks up the
// hoisted `postgres` and `readPostgresMigrationFiles` overrides.
import { migrateProductDatabase } from "../migration.js";

/**
 * Captures the SQL strings the mocked transaction would execute.
 * @returns Every statement routed through `transaction.unsafe`.
 */
function executedStatements(): string[] {
  return runnerState.transaction.unsafe.mock.calls
    .map(([query]) => (typeof query === "string" ? query : ""))
    .filter((statement) => statement.length > 0);
}

/**
 * Reports whether a tracked fixture statement appeared in the
 * mocked transaction log.
 * @param needle The unique substring that distinguishes one fixture.
 * @returns True when a transaction call contains the substring.
 */
function hasExecutedFixtureMarker(needle: string): boolean {
  return executedStatements().some((statement) => statement.includes(needle));
}

/**
 * Configures the mocked ledger query responses so a successful
 * migration sees an empty `drizzle.__drizzle_migrations` ledger and
 * therefore treats every checked-in migration as pending. Each
 * successful migration is then executed inside the same mocked client
 * and recorded by `transaction.unsafe` for `executedStatements` to
 * inspect.
 */
function configureEmptyLedger(): void {
  runnerState.transaction.unsafe.mockImplementation(
    async (query: unknown) => {
      if (typeof query !== "string") return [];
      const trimmed = query.trim();
      if (trimmed.startsWith("SELECT pg_advisory_xact_lock")) return [];
      if (trimmed.startsWith("CREATE SCHEMA")) return [];
      if (trimmed.startsWith("CREATE TABLE")) return [];
      if (trimmed.startsWith("SELECT hash, created_at")) return [];
      return [];
    },
  );
}

/**
 * Default journal fixture used by every reject-case test. It matches the
 * current checked-in journal shape (0048 terminal, 0049 non-terminal with
 * 0050 successor) so the non-terminal test exercises the exact failure
 * pattern the Phase 4 deploy gate enforces. Re-assigned by the duplicate
 * test to inject a journal with two entries sharing the same tag.
 */
function useDefaultJournal(): void {
  runnerState.state.migrations = [
    {
      tag: TERMINAL_0048_TAG,
      folderMillis: 1779120004000,
      hash: "0048-workbook-publishing-hash",
      sql: ["SELECT 0048_workbook_publishing_apply"],
    },
    {
      tag: CURRENT_NON_TERMINAL_0049_TAG,
      folderMillis: 1785758864000,
      hash: "0049-codecamp-exercise-quiz-repair-hash",
      sql: ["SELECT 0049_codecamp_exercise_quiz_repair_apply"],
    },
    {
      tag: SUCCESSOR_0050_TAG,
      folderMillis: 1785758865000,
      hash: "0050-finance-operations-records-hash",
      sql: ["SELECT 0050_finance_operations_records_apply"],
    },
  ];
}

/**
 * Seeds a journal where the successor tag is terminal (no migration after
 * it) so the positive terminal-control and unbounded-caller tests can run
 * the full prefix without tripping the non-terminal guard.
 */
function useTerminalSuccessorJournal(): void {
  runnerState.state.migrations = [
    {
      tag: TERMINAL_0048_TAG,
      folderMillis: 1779120004000,
      hash: "0048-workbook-publishing-hash",
      sql: ["SELECT 0048_workbook_publishing_apply"],
    },
    {
      tag: CURRENT_NON_TERMINAL_0049_TAG,
      folderMillis: 1785758864000,
      hash: "0049-codecamp-exercise-quiz-repair-hash",
      sql: ["SELECT 0049_codecamp_exercise_quiz_repair_apply"],
    },
    {
      tag: SUCCESSOR_0050_TAG,
      folderMillis: 1785758865000,
      hash: "0050-finance-operations-records-hash",
      sql: ["SELECT 0050_finance_operations_records_apply"],
    },
  ];
}

beforeEach(() => {
  runnerState.state.postgresCalls = 0;
  runnerState.client.begin.mockClear();
  runnerState.client.end.mockClear();
  runnerState.transaction.unsafe.mockClear();
  runnerState.transaction.unsafe.mockReset();
  useDefaultJournal();
});

describe("migration-ceiling adversarial — reject cases (fail-closed before DB connection)", () => {
  it("rejects a blank MIGRATION_CEILING_TAG and never opens a postgres connection", async () => {
    await expect(
      migrateProductDatabase({
        directDatabaseUrl: "postgres://unit-test.invalid/codecamp",
        migrationsFolder: "/fixture/migrations",
        migrationCeilingTag: "",
      }),
    ).rejects.toThrow(/non-empty/i);
    expect(runnerState.state.postgresCalls).toBe(0);
    expect(runnerState.client.begin).not.toHaveBeenCalled();
  });

  it("rejects a whitespace-only MIGRATION_CEILING_TAG and never opens a postgres connection", async () => {
    await expect(
      migrateProductDatabase({
        directDatabaseUrl: "postgres://unit-test.invalid/codecamp",
        migrationsFolder: "/fixture/migrations",
        migrationCeilingTag: "   \t\n  ",
      }),
    ).rejects.toThrow(/non-empty/i);
    expect(runnerState.state.postgresCalls).toBe(0);
    expect(runnerState.client.begin).not.toHaveBeenCalled();
  });

  it("rejects an unknown MIGRATION_CEILING_TAG and never opens a postgres connection", async () => {
    await expect(
      migrateProductDatabase({
        directDatabaseUrl: "postgres://unit-test.invalid/codecamp",
        migrationsFolder: "/fixture/migrations",
        migrationCeilingTag: "9999_unknown",
      }),
    ).rejects.toThrow(/not in the checked-in journal/i);
    expect(runnerState.state.postgresCalls).toBe(0);
    expect(runnerState.client.begin).not.toHaveBeenCalled();
  });

  it("rejects the current non-terminal 0049 ceiling (successor 0050 exists) and never opens a postgres connection", async () => {
    await expect(
      migrateProductDatabase({
        directDatabaseUrl: "postgres://unit-test.invalid/codecamp",
        migrationsFolder: "/fixture/migrations",
        migrationCeilingTag: CURRENT_NON_TERMINAL_0049_TAG,
      }),
    ).rejects.toThrow(/successor/i);
    expect(
      await Promise.resolve(
        migrateProductDatabase({
          directDatabaseUrl: "postgres://unit-test.invalid/codecamp",
          migrationsFolder: "/fixture/migrations",
          migrationCeilingTag: CURRENT_NON_TERMINAL_0049_TAG,
        }).catch((error: unknown) => String((error as Error).message)),
      ),
    ).toMatch(/0050/);
    expect(runnerState.state.postgresCalls).toBe(0);
    expect(runnerState.client.begin).not.toHaveBeenCalled();
  });

  it("rejects a duplicated journal tag (current non-terminal duplicate) and never opens a postgres connection", async () => {
    // Inject a journal where the exact 0049 tag appears twice.
    runnerState.state.migrations = [
      {
        tag: CURRENT_NON_TERMINAL_0049_TAG,
        folderMillis: 1785758864000,
        hash: "0049-codecamp-exercise-quiz-repair-hash-a",
        sql: ["SELECT 0049_codecamp_exercise_quiz_repair_apply_a"],
      },
      {
        tag: TERMINAL_0048_TAG,
        folderMillis: 1779120004000,
        hash: "0048-workbook-publishing-hash",
        sql: ["SELECT 0048_workbook_publishing_apply"],
      },
      {
        tag: CURRENT_NON_TERMINAL_0049_TAG,
        folderMillis: 1785758864001,
        hash: "0049-codecamp-exercise-quiz-repair-hash-b",
        sql: ["SELECT 0049_codecamp_exercise_quiz_repair_apply_b"],
      },
      {
        tag: SUCCESSOR_0050_TAG,
        folderMillis: 1785758865000,
        hash: "0050-finance-operations-records-hash",
        sql: ["SELECT 0050_finance_operations_records_apply"],
      },
    ];

    await expect(
      migrateProductDatabase({
        directDatabaseUrl: "postgres://unit-test.invalid/codecamp",
        migrationsFolder: "/fixture/migrations",
        migrationCeilingTag: CURRENT_NON_TERMINAL_0049_TAG,
      }),
    ).rejects.toThrow(/duplicated/i);
    expect(runnerState.state.postgresCalls).toBe(0);
    expect(runnerState.client.begin).not.toHaveBeenCalled();
  });

  it("rejects a duplicated journal tag even when the duplicate is the terminal entry (no SQL ever runs)", async () => {
    // Inject a journal where 0048 (terminal-position sibling) appears twice.
    runnerState.state.migrations = [
      {
        tag: TERMINAL_0048_TAG,
        folderMillis: 1779120004000,
        hash: "0048-workbook-publishing-hash-a",
        sql: ["SELECT 0048_workbook_publishing_apply_a"],
      },
      {
        tag: CURRENT_NON_TERMINAL_0049_TAG,
        folderMillis: 1785758864000,
        hash: "0049-codecamp-exercise-quiz-repair-hash",
        sql: ["SELECT 0049_codecamp_exercise_quiz_repair_apply"],
      },
      {
        tag: TERMINAL_0048_TAG,
        folderMillis: 1779120004001,
        hash: "0048-workbook-publishing-hash-b",
        sql: ["SELECT 0048_workbook_publishing_apply_b"],
      },
      {
        tag: SUCCESSOR_0050_TAG,
        folderMillis: 1785758865000,
        hash: "0050-finance-operations-records-hash",
        sql: ["SELECT 0050_finance_operations_records_apply"],
      },
    ];

    await expect(
      migrateProductDatabase({
        directDatabaseUrl: "postgres://unit-test.invalid/codecamp",
        migrationsFolder: "/fixture/migrations",
        migrationCeilingTag: TERMINAL_0048_TAG,
      }),
    ).rejects.toThrow(/duplicated/i);
    expect(runnerState.state.postgresCalls).toBe(0);
    expect(runnerState.client.begin).not.toHaveBeenCalled();
    expect(hasExecutedFixtureMarker("0048_workbook_publishing_apply_a")).toBe(
      false,
    );
    expect(hasExecutedFixtureMarker("0048_workbook_publishing_apply_b")).toBe(
      false,
    );
  });
});

describe("migration-ceiling adversarial — positive controls", () => {
  it("permits exactly the reviewed prefix when the ceiling is the terminal entry (no permitted item is excluded)", async () => {
    // In this fixture 0050 is terminal so a ceiling of 0050 is allowed and
    // the slice `migrations.slice(0, ceilingIndex + 1)` equals the entire
    // journal. Every migration must apply — this is the "excludes no
    // permitted item" half of the positive control.
    useTerminalSuccessorJournal();
    configureEmptyLedger();

    await migrateProductDatabase({
      directDatabaseUrl: "postgres://unit-test.invalid/codecamp",
      migrationsFolder: "/fixture/migrations",
      migrationCeilingTag: SUCCESSOR_0050_TAG,
    });

    expect(runnerState.state.postgresCalls).toBe(1);
    expect(runnerState.client.begin).toHaveBeenCalledTimes(1);
    expect(hasExecutedFixtureMarker("0048_workbook_publishing_apply")).toBe(
      true,
    );
    expect(hasExecutedFixtureMarker("0049_codecamp_exercise_quiz_repair_apply")).toBe(
      true,
    );
    expect(hasExecutedFixtureMarker("0050_finance_operations_records_apply")).toBe(
      true,
    );
  });

  it("permits exactly the reviewed prefix for a singleton journal where the ceiling is the only checked-in migration", async () => {
    // Singleton journal where 0048 is the terminal entry (and therefore the
    // only checked-in migration). The ceiling is 0048; the slice must equal
    // [0048] and the lone migration must apply. This proves the runner
    // honors the slice boundary precisely — even at the smallest possible
    // journal — so no permitted item is ever excluded.
    runnerState.state.migrations = [
      {
        tag: TERMINAL_0048_TAG,
        folderMillis: 1779120004000,
        hash: "0048-workbook-publishing-hash",
        sql: ["SELECT 0048_workbook_publishing_apply"],
      },
    ];
    configureEmptyLedger();

    await migrateProductDatabase({
      directDatabaseUrl: "postgres://unit-test.invalid/codecamp",
      migrationsFolder: "/fixture/migrations",
      migrationCeilingTag: TERMINAL_0048_TAG,
    });

    expect(runnerState.state.postgresCalls).toBe(1);
    expect(hasExecutedFixtureMarker("0048_workbook_publishing_apply")).toBe(
      true,
    );
  });

  it("unbounded callers (undefined migrationCeilingTag) retain all-pending behavior — every checked-in migration is applied", async () => {
    useDefaultJournal();
    configureEmptyLedger();

    await migrateProductDatabase({
      directDatabaseUrl: "postgres://unit-test.invalid/codecamp",
      migrationsFolder: "/fixture/migrations",
    });

    expect(runnerState.state.postgresCalls).toBe(1);
    expect(hasExecutedFixtureMarker("0048_workbook_publishing_apply")).toBe(
      true,
    );
    expect(hasExecutedFixtureMarker("0049_codecamp_exercise_quiz_repair_apply")).toBe(
      true,
    );
    expect(hasExecutedFixtureMarker("0050_finance_operations_records_apply")).toBe(
      true,
    );
  });
});

describe("scripts/migrate.ts behavioral propagation of MIGRATION_CEILING_TAG", () => {
  it("forwards MIGRATION_CEILING_TAG to the runner (unknown-tag fail-closed counterexample)", async () => {
    // Spawn the actual scripts/migrate.ts with MIGRATION_CEILING_TAG=9999_unknown
    // and an unreachable DIRECT_DATABASE_URL. If the script forwards the env
    // var, the runner's resolveMigrationCeiling throws "Migration ceiling tag
    // 9999_unknown is not in the checked-in journal." and exits before any
    // DNS lookup. If the script forgets to forward the env var, the runner
    // receives migrationCeilingTag=undefined, returns all migrations, and
    // the postgres() driver tries to resolve unit-test.invalid (ENOTFOUND).
    // The behavioral assertion is therefore: exit non-zero, error text
    // names the exact tag, and the DNS-failure signal is absent.
    const child = spawn(
      process.execPath,
      ["--import", "tsx", MIGRATE_SCRIPT_PATH],
      {
        cwd: PACKAGE_ROOT,
        env: {
          ...process.env,
          DIRECT_DATABASE_URL: "postgres://unit-test.invalid/codecamp",
          MIGRATION_CEILING_TAG: "9999_unknown",
          DATABASE_URL: undefined,
        },
        stdio: ["ignore", "pipe", "pipe"],
      },
    );

    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    const exitCode: number | null = await new Promise((resolveCode) => {
      child.on("close", (code) => resolveCode(code));
    });

    const combined = stdout + stderr;
    expect(exitCode).not.toBe(0);
    expect(combined).toMatch(/9999_unknown/);
    expect(combined).toMatch(/not in the checked-in journal/);
    // No DNS lookup should have happened — the runner rejected before any
    // postgres() construction. If propagation broke, the script would fall
    // through to a getaddrinfo/ENOTFOUND error instead.
    expect(combined).not.toMatch(/getaddrinfo|ENOTFOUND/);
  });
});
