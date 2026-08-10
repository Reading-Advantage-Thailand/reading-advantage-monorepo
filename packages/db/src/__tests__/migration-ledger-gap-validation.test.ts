/**
 * Unit contract for fail-closed validation in the product migration runner.
 *
 * The real-PostgreSQL 0049 suite proves database transaction semantics when a
 * Podman-provisioned PG_TEST_URL is available. These tests keep the critical
 * ledger-validation regression red in every local and CI environment.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

interface LedgerRow {
  readonly createdAt: number;
  readonly hash: string;
}

const fixture = vi.hoisted(() => {
  const governanceFloor = 1779120003000;
  return {
    governanceFloor,
    legacyTimestamp: governanceFloor - 1000,
    migrations: [
      {
        folderMillis: governanceFloor - 1000,
        hash: "historically-rewritten-0018-hash",
        sql: ["SELECT 18"],
      },
      {
        folderMillis: governanceFloor,
        hash: "known-0019-hash",
        sql: ["SELECT 19"],
      },
      {
        folderMillis: governanceFloor + 1,
        hash: "known-0020-hash",
        sql: ["SELECT 20"],
      },
      {
        folderMillis: governanceFloor + 2,
        hash: "known-0021-hash",
        sql: ["SELECT 21"],
      },
    ],
  };
});

const runnerState = vi.hoisted(() => {
  const transaction = { unsafe: vi.fn() };
  const client = {
    begin: vi.fn(
      async (callback: (value: typeof transaction) => Promise<void>) =>
        callback(transaction),
    ),
    end: vi.fn(async () => undefined),
  };
  return {
    client,
    ledgerRows: [] as LedgerRow[],
    transaction,
  };
});

vi.mock("postgres", () => ({
  default: vi.fn(() => runnerState.client),
}));

vi.mock("../migration-files.js", () => ({
  readPostgresMigrationFiles: vi.fn(() => fixture.migrations),
}));

import { migrateProductDatabase } from "../migration.js";

/**
 * Configures the mocked ledger query responses for one migration attempt.
 * @param ledgerRows The rows currently recorded in the mocked ledger.
 * @returns Completion after the mock is ready for the runner.
 */
async function setLedgerRows(ledgerRows: readonly LedgerRow[]): Promise<void> {
  runnerState.ledgerRows = [...ledgerRows];
  runnerState.transaction.unsafe.mockImplementation(async (query: unknown) => {
    const sql = typeof query === "string" ? query : "";
    if (sql.includes("SELECT hash, created_at")) {
      return runnerState.ledgerRows.map((row) => ({
        created_at: row.createdAt,
        hash: row.hash,
      }));
    }
    if (sql.includes("SELECT created_at")) {
      const latest = [...runnerState.ledgerRows]
        .sort((left, right) => left.createdAt - right.createdAt)
        .at(-1);
      return latest ? [{ created_at: latest.createdAt }] : [];
    }
    return [];
  });
}

/**
 * Returns one complete, exact ledger record for every mocked migration.
 * @returns The exact timestamps and hashes expected at and after the governance floor.
 */
function exactLedgerRows(): LedgerRow[] {
  return fixture.migrations.map((migration) => ({
    createdAt: migration.folderMillis,
    hash: migration.hash,
  }));
}

describe("migrateProductDatabase ledger validation", () => {
  beforeEach(() => {
    runnerState.client.begin.mockClear();
    runnerState.client.end.mockClear();
    runnerState.transaction.unsafe.mockReset();
    runnerState.ledgerRows = [];
  });

  it.each([
    {
      label: "a missing historical timestamp below a later row",
      ledgerRows: exactLedgerRows().filter(
        (row) => row.createdAt !== fixture.governanceFloor,
      ),
    },
    {
      label:
        "a known timestamp at or after the governance floor with the wrong hash",
      ledgerRows: exactLedgerRows().map((row) =>
        row.createdAt === fixture.governanceFloor + 1
          ? { ...row, hash: "wrong-post-floor-hash" }
          : row,
      ),
    },
    {
      label: "duplicate rows at one known timestamp",
      ledgerRows: [
        ...exactLedgerRows(),
        { createdAt: fixture.governanceFloor + 1, hash: "known-0020-hash" },
      ],
    },
    {
      label: "duplicate rows at a legacy timestamp below the governance floor",
      ledgerRows: [
        ...exactLedgerRows(),
        {
          createdAt: fixture.legacyTimestamp,
          hash: "historically-rewritten-legacy-copy",
        },
      ],
    },
  ])(
    "rejects $label instead of trusting only the ledger high-watermark",
    async ({ ledgerRows }) => {
      await setLedgerRows(ledgerRows);

      await expect(
        migrateProductDatabase({
          directDatabaseUrl: "postgres://unit-test.invalid/reading_advantage",
          migrationsFolder: "/fixture/migrations",
        }),
      ).rejects.toThrow();
    },
  );

  it("permits a one-to-one legacy raw-hash mismatch below the governance floor", async () => {
    await setLedgerRows(
      exactLedgerRows().map((row) =>
        row.createdAt === fixture.legacyTimestamp
          ? { ...row, hash: "rewritten-for-fresh-database-compatibility" }
          : row,
      ),
    );

    await expect(
      migrateProductDatabase({
        directDatabaseUrl: "postgres://unit-test.invalid/reading_advantage",
        migrationsFolder: "/fixture/migrations",
      }),
    ).resolves.toBeUndefined();
  });
});
