import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { CODECAMP_MIGRATION_APPLY_CONFIRMATION } from "../codecamp-migration.js";
import {
  PostgresCodecampMigrationError,
  validatePostgresCodecampMigrationInput,
} from "../postgres-codecamp-migration.js";

const urls = {
  sourceDatabaseUrl: "postgresql://source:private@localhost/codecamp_advantage",
  targetDatabaseUrl: "postgresql://target:private@localhost/company_identity",
};

describe("PostgreSQL Codecamp migration gates", () => {
  it("admits a dry run without any write authorization", () => {
    expect(() =>
      validatePostgresCodecampMigrationInput({
        ...urls,
        mode: "dry-run",
      }),
    ).not.toThrow();
  });

  it("rejects apply before connection without both exact approvals", () => {
    expect(() =>
      validatePostgresCodecampMigrationInput({
        ...urls,
        mode: "apply",
        confirmation: CODECAMP_MIGRATION_APPLY_CONFIRMATION,
      }),
    ).toThrowError(
      expect.objectContaining({
        code: "EXPECTED_FINGERPRINT_REQUIRED",
      }),
    );
    expect(() =>
      validatePostgresCodecampMigrationInput({
        ...urls,
        mode: "apply",
        expectedSourceFingerprint: "a".repeat(64),
        confirmation: "almost-correct",
      }),
    ).toThrowError(
      expect.objectContaining({
        code: "APPLY_CONFIRMATION_REQUIRED",
      }),
    );
    expect(() =>
      validatePostgresCodecampMigrationInput({
        ...urls,
        mode: "apply",
        expectedSourceFingerprint: "a".repeat(64),
        confirmation: CODECAMP_MIGRATION_APPLY_CONFIRMATION,
      }),
    ).not.toThrow();
  });

  it("rejects smuggled apply values in dry-run mode", () => {
    expect(() =>
      validatePostgresCodecampMigrationInput({
        ...urls,
        mode: "dry-run",
        expectedSourceFingerprint: "a".repeat(64),
      }),
    ).toThrowError(
      expect.objectContaining({
        code: "DRY_RUN_APPLY_INPUT_REJECTED",
      }),
    );
  });

  it("keeps adapter errors secret-safe", () => {
    const secret = "database-password-that-must-not-appear";
    const error = new PostgresCodecampMigrationError(
      "SOURCE_DATABASE_INVALID",
      "Source database must be codecamp_advantage.",
    );
    expect(String(error)).not.toContain(secret);
    expect(error.code).toBe("SOURCE_DATABASE_INVALID");
  });
  it("pins apply readiness to the exact checked-in migration 0043", () => {
    const migration = readFileSync(
      resolve(
        import.meta.dirname,
        "../../../../../db/drizzle/0043_codecamp_company_principal_sync.sql",
      ),
    );
    const source = readFileSync(
      resolve(import.meta.dirname, "../postgres-codecamp-migration.ts"),
      "utf8",
    );
    const hash = createHash("sha256").update(migration).digest("hex");
    expect(source).toContain(`"${hash}"`);
    expect(source).toContain("1_784_446_059_725");
    expect(source).toContain(
      "where created_at = ${CODECAMP_SYNC_MIGRATION_MILLIS}",
    );
    expect(source).toContain("and hash = ${CODECAMP_SYNC_MIGRATION_SHA256}");
  });
});
