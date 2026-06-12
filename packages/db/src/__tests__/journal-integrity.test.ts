/**
 * Phase 2 — Task 4 (Red): journal-integrity assertions for FR-1/FR-2.
 *
 * Spec: measure/tracks/db_migration_ledger_20260611/spec.md §FR-1, §FR-2.
 * Strategy: measure/tracks/db_migration_ledger_20260611/test-strategy.md §5.
 *
 * Intentional Red reasons on master (2026-06-12):
 *   - idx 3–8, 11, 13–15, 17 carry 2025-era `when` stamps < 1779120000000
 *     (the production ledger ceiling). Migrator strict-`<` semantics
 *     (drizzle-orm 0.44.7 pg-core/dialect.js:62) skip them on any DB whose
 *     ledger already contains 0016.
 *   - idx 10 and 11 share `when` 1779075476967 — duplicates break the
 *     "strictly increasing" invariant.
 *   - re-stamp-safety invariant (test-strategy §3): idx 0–16 must stay
 *     ≤ 1779120000000; idx 17+ must exceed it. Master journal violates
 *     both halves (idx 17 = 1749081600000; idx 18 = 1749168000000).
 *
 * Per test-strategy §7 (Live-Proof Plan), the targeted Red command is:
 *   pnpm vitest run src/__tests__/journal-integrity.test.ts
 *
 * This is a pure filesystem + JSON test. No DB, no network.
 */

import { describe, it, expect, beforeAll } from "vitest";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = resolve(HERE, "../..");
const DRIZZLE_DIR = join(PACKAGE_ROOT, "drizzle");
const JOURNAL_PATH = join(DRIZZLE_DIR, "meta", "_journal.json");

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

let journal: Journal;
let sqlFiles: string[];

beforeAll(() => {
  journal = JSON.parse(readFileSync(JOURNAL_PATH, "utf8")) as Journal;
  sqlFiles = readdirSync(DRIZZLE_DIR)
    .filter((name) => /^\d{4}_.+\.sql$/.test(name))
    .map((name) => name.replace(/\.sql$/, ""))
    .sort();
});

// ---------------------------------------------------------------------------
// Parity: every SQL file has exactly one journal entry, and vice versa
// ---------------------------------------------------------------------------

describe("journal-integrity — file ↔ journal-entry parity (FR-2)", () => {
  it("every drizzle/NNNN_*.sql file has a matching journal entry whose tag equals the filename", () => {
    const journalTags = new Set(journal.entries.map((e) => e.tag));
    const missing = sqlFiles.filter((file) => !journalTags.has(file));
    expect(
      missing,
      `SQL files on disk without a journal entry: ${missing.join(", ")}`,
    ).toEqual([]);
  });

  it("every journal entry has a matching SQL file on disk", () => {
    const fileSet = new Set(sqlFiles);
    const orphan = journal.entries
      .filter((entry) => !fileSet.has(entry.tag))
      .map((entry) => entry.tag);
    expect(
      orphan,
      `Journal entries without a SQL file: ${orphan.join(", ")}`,
    ).toEqual([]);
  });

  it("the 0018_audit_events SQL file (shipped 2026-06-03) is in the journal — must be true once re-stamp lands", () => {
    // Catches the historic "file exists, no journal entry" case for 0018.
    // Will pass on master (journal already includes 0018 from the auth
    // security hardening track). Kept as a guard rail so a future re-stamp
    // cannot drop it.
    const entry = journal.entries.find((e) => e.tag === "0018_audit_events");
    expect(
      entry,
      "0018_audit_events is missing from _journal.json — every SQL file " +
        "on disk must have a journal entry (see audit_log_infrastructure " +
        "track 2026-06-03 for the historic incident).",
    ).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// Contiguity: idx is a contiguous range from 0
// ---------------------------------------------------------------------------

describe("journal-integrity — idx contiguity (FR-2)", () => {
  it("idx values are exactly 0..N-1 with no gaps and no duplicates", () => {
    const idices = journal.entries.map((e) => e.idx).sort((a, b) => a - b);
    for (let i = 0; i < idices.length; i++) {
      expect(idices[i], `idx[${i}] must be ${i}`).toBe(i);
    }
    expect(idices.length, "journal must have at least one entry").toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Monotonicity: when is strictly increasing with idx, and unique
// ---------------------------------------------------------------------------

describe("journal-integrity — when monotonicity (FR-1 / FR-2)", () => {
  it("when is strictly increasing with idx and unique (no two entries share a when)", () => {
    const sorted = [...journal.entries].sort((a, b) => a.idx - b.idx);
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1];
      const curr = sorted[i];
      expect(
        curr.when,
        `idx ${curr.idx} (${curr.tag}).when (${curr.when}) must be > ` +
          `idx ${prev.idx} (${prev.tag}).when (${prev.when}) — drizzle-orm 0.44.7 ` +
          `pg-core/dialect.js:62 uses strict-<, so monotonicity is a hard contract.`,
      ).toBeGreaterThan(prev.when);
    }
  });
});

// ---------------------------------------------------------------------------
// Era sanity: each stamp should be within ~1 year of its neighbors
// ---------------------------------------------------------------------------

describe("journal-integrity — era sanity (FR-2)", () => {
  // One year in milliseconds — generous to absorb DST/leap-second drift.
  const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

  it("no `when` stamp is more than 1 year from the median of its adjacent entries", () => {
    const sorted = [...journal.entries].sort((a, b) => a.idx - b.idx);
    for (let i = 0; i < sorted.length; i++) {
      const entry = sorted[i];
      const neighbors: number[] = [];
      if (i > 0) neighbors.push(sorted[i - 1].when);
      if (i < sorted.length - 1) neighbors.push(sorted[i + 1].when);
      // Endpoints have at least one neighbor; skip if journal has < 2 entries.
      if (neighbors.length === 0) continue;

      const sortedN = [...neighbors].sort((a, b) => a - b);
      const median =
        sortedN.length === 1
          ? sortedN[0]
          : (sortedN[0] + sortedN[1]) / 2;

      const delta = Math.abs(entry.when - median);
      expect(
        delta,
        `idx ${entry.idx} (${entry.tag}).when (${entry.when}) is ${Math.round(
          delta / ONE_YEAR_MS,
        )} years from the median of its neighbors (${median}). ` +
          `Catches 2025/2026 epoch confusion at the source.`,
      ).toBeLessThanOrEqual(ONE_YEAR_MS);
    }
  });
});

// ---------------------------------------------------------------------------
// Re-stamp safety invariant (test-strategy §3): 0–16 ≤ ceiling, 17+ > ceiling
// ---------------------------------------------------------------------------

describe("journal-integrity — re-stamp safety invariant (test-strategy §3)", () => {
  // Production-ledger ceiling recorded in drizzle/meta/README.md.
  // 1779120000000 == idx 16 (0016_users_grade_level) — the highest stamp
  // already in production ledgers before the re-stamp campaign.
  const PRODUCTION_CEILING = 1779120000000;

  it("idx 0..16 `when` values are all ≤ production ceiling 1779120000000", () => {
    const sorted = [...journal.entries]
      .filter((e) => e.idx <= 16)
      .sort((a, b) => a.idx - b.idx);
    for (const entry of sorted) {
      expect(
        entry.when,
        `idx ${entry.idx} (${entry.tag}).when (${entry.when}) must be ≤ ` +
          `${PRODUCTION_CEILING} — re-stamping must never re-appliable migrations ` +
          `in any environment whose ledger already contains them.`,
      ).toBeLessThanOrEqual(PRODUCTION_CEILING);
    }
  });

  it("idx 17+ `when` values are all > production ceiling 1779120000000", () => {
    const sorted = [...journal.entries]
      .filter((e) => e.idx >= 17)
      .sort((a, b) => a.idx - b.idx);
    for (const entry of sorted) {
      expect(
        entry.when,
        `idx ${entry.idx} (${entry.tag}).when (${entry.when}) must be > ` +
          `${PRODUCTION_CEILING} — re-stamping places every idx 17+ above the ` +
          `production ceiling so the migrator applies them.`,
      ).toBeGreaterThan(PRODUCTION_CEILING);
    }
  });
});

// ---------------------------------------------------------------------------
// Sentinel coverage (FR-3 doctor support): every journal entry has a sentinel
// ---------------------------------------------------------------------------

describe("journal-integrity — sentinel coverage for FR-3 doctor", () => {
  it("every journal tag is present in scripts/sentinels.ts", async () => {
    // Import dynamically so test-strategy §5 (no module-resolution surprises)
    // and so a missing file is a clear Red reason.
    const sentinelsModule = await import("../sentinels.js");
    const probes = sentinelsModule.sentinelProbes as Record<
      string,
      { tag: string; kind: "table" | "column"; target: string }
    >;
    const missing = journal.entries
      .map((e) => e.tag)
      .filter((tag) => !(tag in probes));
    expect(
      missing,
      `Journal tags without a sentinel probe in scripts/sentinels.ts: ${missing.join(", ")}`,
    ).toEqual([]);
  });
});
