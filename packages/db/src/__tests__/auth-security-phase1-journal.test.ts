/**
 * Phase 1 Red-phase tests for the auth-security-hardening migration journal.
 *
 * Driven by `measure/tracks/auth_security_hardening_20260611/plan.md`
 * Phase 1 Tasks 1 and 2.
 *
 *   Task 1: register the `0018_audit_events` migration in
 *           `packages/db/drizzle/meta/_journal.json`. The SQL file
 *           exists on disk (it shipped with the `audit_log_infrastructure`
 *           track on 2026-06-03) but the journal entry was omitted due
 *           to a non-TTY drizzle-kit write. Without the journal entry,
 *           `drizzle-kit status` reports 0018 as "unknown" and downstream
 *           tooling breaks.
 *   Task 2: write `packages/db/drizzle/0019_session_token_hash.sql` and
 *           register it as idx 19 in the same journal. This migration
 *           adds the `token_hash` column to `sessions` (used by the
 *           Phase 3 FR-1 hashing change).
 *
 * The test strategy (`measure/tracks/.../test-strategy.md` §1) calls
 * for exactly one migration-journal sanity assertion in Phase 1; this
 * file implements it. The assertions are split per task so that
 * Task 1 and Task 2 can land in independent commits and the failing
 * subset is obvious to the Green-phase implementer.
 *
 * RED expectations (2026-06-12):
 *   - Journal currently tops out at idx 17 → all four "audit_events"
 *     assertions fail and all four "session_token_hash" assertions fail.
 *   - 0018 SQL file exists → `expect(0018 SQL present)` passes, but the
 *     journal assertion that follows it does not.
 *   - 0019 SQL file is missing → both the file-exists assertion and the
 *     journal assertion fail.
 *
 * Test command (targeted, no DB / no network):
 *   cd packages/db && npx vitest run src/__tests__/auth-security-phase1-journal.test.ts
 */
import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// `packages/db/src/__tests__/<file>.test.ts` → up 3 levels → packages/db
const PACKAGE_ROOT = join(__dirname, "..", "..");
const DRIZZLE_DIR = join(PACKAGE_ROOT, "drizzle");
const JOURNAL_PATH = join(DRIZZLE_DIR, "meta", "_journal.json");
const MIGRATION_0018_PATH = join(DRIZZLE_DIR, "0018_audit_events.sql");
const MIGRATION_0019_PATH = join(DRIZZLE_DIR, "0019_session_token_hash.sql");

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

function readJournal(): Journal {
  return JSON.parse(readFileSync(JOURNAL_PATH, "utf8")) as Journal;
}

function findEntry(journal: Journal, tag: string): JournalEntry | undefined {
  return journal.entries.find((entry) => entry.tag === tag);
}

// ---------------------------------------------------------------------------
// Task 1 — register 0018_audit_events in the journal
// ---------------------------------------------------------------------------

describe("Phase 1 — Task 1: 0018_audit_events is registered in _journal.json", () => {
  it("the 0018 SQL file exists on disk", () => {
    expect(
      existsSync(MIGRATION_0018_PATH),
      "Expected packages/db/drizzle/0018_audit_events.sql to exist — the " +
        "audit_log_infrastructure track shipped the SQL on 2026-06-03.",
    ).toBe(true);
  });

  it("the journal contains an entry with tag '0018_audit_events'", () => {
    const journal = readJournal();
    const entry = findEntry(journal, "0018_audit_events");
    expect(
      entry,
      "Expected _journal.json to contain an entry with tag " +
        "'0018_audit_events'. The SQL file exists on disk but the journal " +
        "was never updated, so drizzle-kit treats it as unknown.",
    ).toBeDefined();
  });

  it("the 0018 entry uses idx 18 (next free idx after 17)", () => {
    const journal = readJournal();
    const entry = findEntry(journal, "0018_audit_events");
    expect(
      entry?.idx,
      "The 0018 entry must use idx 18 to preserve monotonic ordering with " +
        "the existing 0..17 entries.",
    ).toBe(18);
  });

  it("the 0018 entry's SQL file pointer resolves to a real file", () => {
    const journal = readJournal();
    const entry = findEntry(journal, "0018_audit_events");
    if (!entry) return; // previous assertion already explains the failure

    const pointer = join(DRIZZLE_DIR, `${entry.tag}.sql`);
    expect(
      existsSync(pointer),
      `Journal entry ${entry.idx} (${entry.tag}) must point at an existing ` +
        `SQL file: ${pointer}`,
    ).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Task 2 — write 0019_session_token_hash.sql and register it as idx 19
// ---------------------------------------------------------------------------

describe("Phase 1 — Task 2: 0019_session_token_hash is registered in _journal.json", () => {
  it("the 0019_session_token_hash SQL file exists on disk", () => {
    expect(
      existsSync(MIGRATION_0019_PATH),
      "Expected packages/db/drizzle/0019_session_token_hash.sql to exist — " +
        "Task 2 asks for a new migration that adds token_hash to sessions " +
        "and backfills it from the existing token column.",
    ).toBe(true);
  });

  it("the 0019 SQL adds a token_hash column to the sessions table", () => {
    expect(
      existsSync(MIGRATION_0019_PATH),
      "0019_session_token_hash.sql must exist before its body can be " +
        "asserted against.",
    ).toBe(true);

    const source = readFileSync(MIGRATION_0019_PATH, "utf8");
    expect(
      source,
      "0019_session_token_hash.sql must ALTER TABLE sessions to add the " +
        "token_hash column. FR-1 hashes session tokens with sha256 and the " +
        "DB column is the storage target.",
    ).toMatch(/ALTER TABLE\s+"?sessions"?\s+ADD COLUMN\s+"?token_hash"?/i);
  });

  it("the 0019 SQL backfills token_hash from the existing token column", () => {
    expect(
      existsSync(MIGRATION_0019_PATH),
      "0019_session_token_hash.sql must exist before its body can be " +
        "asserted against.",
    ).toBe(true);

    const source = readFileSync(MIGRATION_0019_PATH, "utf8");
    // The plan specifies encode(digest(token, 'sha256'), 'hex') so the
    // existing rows get sha256 hashes that match the values Phase 3 will
    // start writing. Without the backfill, FR-1 invalidates every active
    // session at deploy time.
    expect(
      source,
      "0019_session_token_hash.sql must UPDATE sessions SET token_hash = " +
        "encode(digest(token, 'sha256'), 'hex') so existing rows remain " +
        "valid after FR-1 ships.",
    ).toMatch(/UPDATE\s+"?sessions"?\s+SET\s+"?token_hash"?\s*=\s*encode\s*\(\s*digest\s*\(\s*"?token"?\s*,\s*'sha256'\s*\)/i);
  });

  it("the 0019 SQL hardens token_hash to NOT NULL and adds a unique index", () => {
    expect(
      existsSync(MIGRATION_0019_PATH),
      "0019_session_token_hash.sql must exist before its body can be " +
        "asserted against.",
    ).toBe(true);

    const source = readFileSync(MIGRATION_0019_PATH, "utf8");
    // The plan calls for two hardening steps: SET NOT NULL on the column
    // and a unique index so FR-1's collision check is enforced at the DB
    // layer instead of relying on application logic.
    expect(
      source,
      "0019_session_token_hash.sql must ALTER COLUMN token_hash SET NOT NULL.",
    ).toMatch(/ALTER COLUMN\s+"?token_hash"?\s+SET\s+NOT\s+NULL/i);

    expect(
      source,
      "0019_session_token_hash.sql must CREATE UNIQUE INDEX on " +
        "(token_hash) so two sessions cannot share a hash.",
    ).toMatch(/CREATE\s+UNIQUE\s+INDEX[^\n;]*"?token_hash"?/i);
  });

  it("the journal contains an entry with tag '0019_session_token_hash'", () => {
    const journal = readJournal();
    const entry = findEntry(journal, "0019_session_token_hash");
    expect(
      entry,
      "Expected _journal.json to contain an entry with tag " +
        "'0019_session_token_hash' at idx 19, immediately after 0018.",
    ).toBeDefined();
  });

  it("the 0019 entry uses idx 19 (immediately after 0018)", () => {
    const journal = readJournal();
    const entry = findEntry(journal, "0019_session_token_hash");
    expect(
      entry?.idx,
      "The 0019 entry must use idx 19 — the test-strategy §3 explicitly " +
        "calls out that Task 1's 0018 journal repair must run before " +
        "Task 2's 0019, otherwise drizzle-kit renumbers and Task 17's " +
        "column reference breaks.",
    ).toBe(19);
  });

  it("the 0019 entry's SQL file pointer resolves to a real file", () => {
    const journal = readJournal();
    const entry = findEntry(journal, "0019_session_token_hash");
    if (!entry) return; // previous assertion already explains the failure

    const pointer = join(DRIZZLE_DIR, `${entry.tag}.sql`);
    expect(
      existsSync(pointer),
      `Journal entry ${entry.idx} (${entry.tag}) must point at an existing ` +
        `SQL file: ${pointer}`,
    ).toBe(true);
  });
});
