/**
 * Phase 3 — Task 14 (Red): snapshot-drift assertions for FR-5.
 *
 * Spec: measure/tracks/db_migration_ledger_20260611/spec.md §FR-5.
 * Strategy: measure/tracks/db_migration_ledger_20260611/test-strategy.md §3, §5, §7.
 *
 * Intentional Red reason on master (2026-06-13):
 *   - The latest snapshot file in `packages/db/drizzle/meta/` is
 *     `0009_snapshot.json` (from the original 2025 drizzle-kit run).
 *   - The journal has advanced to `0020_sessions_indexes`.
 *   - `drizzle-kit generate` diffs the schema against the latest snapshot,
 *     so running it today emits duplicate DDL for everything added since
 *     0009 — a loaded footgun sitting behind `pnpm generate` (spec §FR-5).
 *   - This test asserts the invariant the implementation must satisfy:
 *     the highest snapshot idx in `drizzle/meta/` must equal the highest
 *     journal idx in `_journal.json`.
 *
 * Per test-strategy §7 (Live-Proof Plan) the Green / Closeout Gate for FR-5
 * is the `drizzle-kit generate` print "No schema changes detected". That
 * command is currently blocked from running in non-interactive environments
 * (it requires a TTY to resolve schema conflicts — see Task 14 status in
 * `plan.md`). The artifact assertion here is the file-system invariant
 * that the implementation must restore; the live-behavior proof is owned
 * by the jr/green role in a TTY-enabled environment.
 *
 * This is a pure filesystem + JSON test. No DB, no network, no TTY.
 */

import { describe, it, expect, beforeAll } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = resolve(HERE, "../..");
const DRIZZLE_META_DIR = join(PACKAGE_ROOT, "drizzle", "meta");
const JOURNAL_PATH = join(DRIZZLE_META_DIR, "_journal.json");

interface JournalEntry {
  idx: number;
  version: string;
  when: number;
  tag: string;
  breakpoints: boolean;
}

interface Journal {
  version: string;
  dialect: string;
  entries: JournalEntry[];
}

interface SnapshotTableIndexColumn {
  expression: string;
}

interface SnapshotTableIndex {
  columns: SnapshotTableIndexColumn[];
}

interface SnapshotTable {
  indexes?: Record<string, SnapshotTableIndex>;
}

interface Snapshot {
  id: string;
  prevId: string;
  version: string;
  dialect: string;
  tables: Record<string, SnapshotTable>;
}

let journal: Journal;
let snapshotIdxs: number[];
let snapshotsByIdx: Map<number, Snapshot>;

function listSnapshotIdxs(): number[] {
  return readdirSync(DRIZZLE_META_DIR)
    .filter((name) => /^\d{4}_snapshot\.json$/.test(name))
    .map((name) => Number.parseInt(name.slice(0, 4), 10))
    .filter((n) => Number.isInteger(n))
    .sort((a, b) => a - b);
}

function loadSnapshot(idx: number): Snapshot {
  const file = join(DRIZZLE_META_DIR, `${String(idx).padStart(4, "0")}_snapshot.json`);
  return JSON.parse(readFileSync(file, "utf8")) as Snapshot;
}

beforeAll(() => {
  journal = JSON.parse(readFileSync(JOURNAL_PATH, "utf8")) as Journal;
  snapshotIdxs = listSnapshotIdxs();
  snapshotsByIdx = new Map(snapshotIdxs.map((idx) => [idx, loadSnapshot(idx)]));
});

// ---------------------------------------------------------------------------
// Snapshot coverage: every snapshot idx is <= the highest journal idx, and the
// highest snapshot idx equals the highest journal idx (spec §FR-5).
// ---------------------------------------------------------------------------

describe("snapshot-drift — latest snapshot matches latest journal idx (FR-5)", () => {
  it("the highest idx in drizzle/meta/NNNN_snapshot.json equals the highest journal idx", () => {
    const journalIdxs = journal.entries.map((e) => e.idx);
    const journalMax = journalIdxs.length === 0 ? -1 : Math.max(...journalIdxs);
    const snapshotMax = snapshotIdxs.length === 0 ? -1 : Math.max(...snapshotIdxs);

    expect(
      journalMax,
      "journal must have at least one entry — empty _journal.json is never valid",
    ).toBeGreaterThanOrEqual(0);
    expect(
      snapshotIdxs.length,
      "drizzle/meta/ must contain at least one NNNN_snapshot.json — drizzle-kit " +
        "generate never ran, or the snapshots were deleted",
    ).toBeGreaterThan(0);
    expect(
      snapshotMax,
      "Snapshot coverage is stale: highest drizzle/meta/NNNN_snapshot.json idx is " +
        snapshotMax +
        " but _journal.json has advanced to idx " +
        journalMax +
        ". drizzle-kit generate will diff the schema against the stale " +
        String(snapshotMax).padStart(4, "0") +
        "_snapshot and emit duplicate DDL for every migration added since then. " +
        "Spec FR-5 fix: run `drizzle-kit generate` against the current schema, " +
        "keep the new snapshot, discard the duplicate SQL, commit both. " +
        "Blocked in this environment by the TTY requirement (see plan Task 14).",
    ).toBe(journalMax);
  });

  it("the highest snapshot file exists and is non-empty", () => {
    const journalMax = Math.max(...journal.entries.map((e) => e.idx));
    const latest = snapshotsByIdx.get(journalMax);
    expect(
      latest,
      "Missing snapshot file for journal idx " +
        journalMax +
        " (drizzle/meta/" +
        String(journalMax).padStart(4, "0") +
        "_snapshot.json). " +
        "Every journal entry at or below the latest snapshot must have a snapshot.",
    ).toBeDefined();
    expect(
      Object.keys((latest as Snapshot).tables ?? {}).length,
      "Latest snapshot (idx " +
        journalMax +
        ") has zero tables — drizzle-kit generate produced an empty snapshot; " +
        "something is wrong with the schema-vs-snapshot diff.",
    ).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Snapshot chain integrity: prevId of the highest snapshot matches id of the
// previous snapshot, and the highest snapshot's version matches the journal.
// ---------------------------------------------------------------------------

describe("snapshot-drift — chain integrity for the latest snapshot (FR-5)", () => {
  it("the latest snapshot's `version` matches the journal's `version`", () => {
    const journalMax = Math.max(...journal.entries.map((e) => e.idx));
    const latest = snapshotsByIdx.get(journalMax);
    expect(
      latest,
      "Missing latest snapshot for journal idx " + journalMax,
    ).toBeDefined();
    expect(
      (latest as Snapshot).version,
      "Latest snapshot (idx " +
        journalMax +
        ") has version '" +
        (latest as Snapshot).version +
        "' but _journal.json has version '" +
        journal.version +
        "'. A snapshot regenerated from a different drizzle-kit version is " +
        "incompatible with the migrator.",
    ).toBe(journal.version);
  });

  it("the latest snapshot's `dialect` matches the journal's `dialect`", () => {
    const journalMax = Math.max(...journal.entries.map((e) => e.idx));
    const latest = snapshotsByIdx.get(journalMax);
    expect(
      latest,
      "Missing latest snapshot for journal idx " + journalMax,
    ).toBeDefined();
    expect(
      (latest as Snapshot).dialect,
      "Latest snapshot (idx " +
        journalMax +
        ") has dialect '" +
        (latest as Snapshot).dialect +
        "' but _journal.json has dialect '" +
        journal.dialect +
        "'. Dialect mismatch means drizzle-kit will refuse to read the snapshot.",
    ).toBe(journal.dialect);
  });

  it("the latest snapshot's `prevId` matches the previous snapshot's `id` (chain integrity)", () => {
    const journalMax = Math.max(...journal.entries.map((e) => e.idx));
    const latest = snapshotsByIdx.get(journalMax);
    expect(
      latest,
      "Missing latest snapshot for journal idx " + journalMax,
    ).toBeDefined();

    const previousIdx = snapshotIdxs.filter((idx) => idx < journalMax).pop();
    if (previousIdx === undefined) {
      // Only one snapshot — no chain to check.
      return;
    }
    const previous = snapshotsByIdx.get(previousIdx);
    expect(
      previous,
      "Missing previous snapshot for idx " + previousIdx,
    ).toBeDefined();
    expect(
      (latest as Snapshot).prevId,
      "Latest snapshot (idx " +
        journalMax +
        ") has prevId '" +
        (latest as Snapshot).prevId +
        "' but previous snapshot (idx " +
        previousIdx +
        ") has id '" +
        (previous as Snapshot).id +
        "'. Broken prevId chain means drizzle-kit cannot walk back to the " +
        "genesis snapshot.",
    ).toBe((previous as Snapshot).id);
  });
});

// ---------------------------------------------------------------------------
// Schema coverage: the latest snapshot references tables that exist in the
// current schema (smoke check — proves the snapshot isn't just a stale file
// that happens to parse, but actually describes the current schema).
// ---------------------------------------------------------------------------

describe("snapshot-drift — schema coverage (FR-5)", () => {
  it("the latest snapshot references the `users` table", () => {
    const journalMax = Math.max(...journal.entries.map((e) => e.idx));
    const latest = snapshotsByIdx.get(journalMax);
    expect(
      latest,
      "Missing latest snapshot for journal idx " + journalMax,
    ).toBeDefined();
    const tableNames = Object.keys((latest as Snapshot).tables ?? {}).map((key) =>
      key.startsWith("public.") ? key.slice("public.".length) : key,
    );
    expect(
      tableNames,
      "Latest snapshot (idx " +
        journalMax +
        ") does not reference the `users` table. " +
        "The `users` table is in the schema (packages/db/src/schema/users.ts) " +
        "but missing from the snapshot — the snapshot is stale and will mislead " +
        "`drizzle-kit generate`. Tables in snapshot: " +
        tableNames.join(", "),
    ).toContain("users");
  });

  it("the latest snapshot references the `sessions` table (FR-8 index target)", () => {
    const journalMax = Math.max(...journal.entries.map((e) => e.idx));
    const latest = snapshotsByIdx.get(journalMax);
    expect(
      latest,
      "Missing latest snapshot for journal idx " + journalMax,
    ).toBeDefined();
    const tableNames = Object.keys((latest as Snapshot).tables ?? {}).map((key) =>
      key.startsWith("public.") ? key.slice("public.".length) : key,
    );
    expect(
      tableNames,
      "Latest snapshot (idx " +
        journalMax +
        ") does not reference the `sessions` table. " +
        "The `sessions` table exists in the schema and migration 0020 adds " +
        "`sessions_user_id_idx` + `sessions_expires_at_idx`. A snapshot that does " +
        "not know about `sessions` will be missing both indexes. " +
        "Tables in snapshot: " +
        tableNames.join(", "),
    ).toContain("sessions");
  });

  it("the latest snapshot contains the FR-8 sessions indexes with expected columns", () => {
    const journalMax = Math.max(...journal.entries.map((e) => e.idx));
    const latest = snapshotsByIdx.get(journalMax);
    expect(
      latest,
      "Missing latest snapshot for journal idx " + journalMax,
    ).toBeDefined();
    const sessionsTable = (latest as Snapshot).tables["public.sessions"];
    expect(
      sessionsTable,
      "Latest snapshot is missing public.sessions, so it cannot prove the " +
        "0020_sessions_indexes migration is represented in drizzle metadata.",
    ).toBeDefined();

    const indexes = sessionsTable.indexes ?? {};
    expect(
      Object.keys(indexes),
      "Latest snapshot must include both FR-8 indexes from 0020_sessions_indexes.",
    ).toEqual(expect.arrayContaining(["sessions_user_id_idx", "sessions_expires_at_idx"]));
    expect(indexes.sessions_user_id_idx?.columns.map((column) => column.expression)).toEqual([
      "user_id",
    ]);
    expect(indexes.sessions_expires_at_idx?.columns.map((column) => column.expression)).toEqual([
      "expires_at",
    ]);
  });
});
