import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const MIGRATION_PATH = join(process.cwd(), "drizzle/0025_review_jobs.sql");
const JOURNAL_PATH = join(process.cwd(), "drizzle/meta/_journal.json");

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

describe("Phase 1 — review_jobs migration contract", () => {
  let migrationSql: string;
  let journal: Journal;

  beforeAll(() => {
    migrationSql = readFileSync(MIGRATION_PATH, "utf8");
    journal = JSON.parse(readFileSync(JOURNAL_PATH, "utf8")) as Journal;
  });

  it("0025_review_jobs.sql exists", () => {
    expect(migrationSql).toBeDefined();
  });

  it("migration creates the review_jobs table", () => {
    expect(migrationSql).toMatch(/CREATE TABLE.*"review_jobs"/i);
  });

  it("migration declares the required columns", () => {
    const columns = [
      "id",
      "pr_owner",
      "pr_repo",
      "pr_pull_number",
      "payload_json",
      "status",
      "attempts",
      "max_attempts",
      "next_attempt_at",
      "last_error",
      "claimed_at",
      "claimed_by",
      "review_id",
      "created_at",
      "updated_at",
    ];

    for (const col of columns) {
      expect(
        migrationSql,
        `migration must declare column ${col}`,
      ).toContain(`"${col}"`);
    }
  });

  it("migration creates the status enum", () => {
    expect(migrationSql).toMatch(/CREATE TYPE.*"codecamp_review_job_status"/i);
    expect(migrationSql).toContain("'pending'");
    expect(migrationSql).toContain("'claimed'");
    expect(migrationSql).toContain("'succeeded'");
    expect(migrationSql).toContain("'failed'");
    expect(migrationSql).toContain("'dead'");
  });

  it("migration creates the idempotency unique index on the PR key", () => {
    expect(migrationSql).toContain('"review_jobs_pr_key_unique"');
    expect(migrationSql).toContain('"pr_owner"');
    expect(migrationSql).toContain('"pr_repo"');
    expect(migrationSql).toContain('"pr_pull_number"');
  });

  it("migration creates the claim index on (status, next_attempt_at)", () => {
    expect(migrationSql).toContain('"review_jobs_claim_idx"');
    expect(migrationSql).toContain('"status"');
    expect(migrationSql).toContain('"next_attempt_at"');
  });

  it("journal contains entry 0025_review_jobs", () => {
    const entry = journal.entries[25];
    expect(entry, "journal entry at index 25").toBeDefined();
    expect(entry.idx, "journal idx").toBe(25);
    expect(entry.tag, "journal tag").toBe("0025_review_jobs");
    expect(entry.when, "journal when").toBeGreaterThan(1782627369208);
    expect(entry.breakpoints, "journal breakpoints").toBe(true);
  });
});
