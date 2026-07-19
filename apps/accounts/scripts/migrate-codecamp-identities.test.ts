import { describe, expect, it } from "vitest";

import { CODECAMP_MIGRATION_APPLY_CONFIRMATION } from "@reading-advantage/backend";
import { createCodecampMigrationInput } from "./migrate-codecamp-identities";

const environment = {
  CODECAMP_MIGRATION_SOURCE_DATABASE_URL:
    "postgresql://source:private@localhost/codecamp_advantage",
  COMPANY_AUTH_DIRECT_DATABASE_URL:
    "postgresql://target:private@localhost/company_identity",
};

describe("Codecamp identity migration CLI", () => {
  it("creates a read-only dry-run input without apply authorization", () => {
    expect(
      createCodecampMigrationInput(environment, ["--dry-run"]),
    ).toMatchObject({ mode: "dry-run" });
  });

  it("requires the approved fingerprint and exact apply confirmation", () => {
    expect(() =>
      createCodecampMigrationInput(environment, ["--apply"]),
    ).toThrow("expected-source-fingerprint");
    expect(
      createCodecampMigrationInput(environment, [
        "--apply",
        `--expected-source-fingerprint=${"a".repeat(64)}`,
        `--confirm=${CODECAMP_MIGRATION_APPLY_CONFIRMATION}`,
      ]),
    ).toMatchObject({
      mode: "apply",
      expectedSourceFingerprint: "a".repeat(64),
      confirmation: CODECAMP_MIGRATION_APPLY_CONFIRMATION,
    });
  });

  it("never includes secret-bearing URLs in validation errors", () => {
    const secret = "secret-value-that-must-not-leak";
    try {
      createCodecampMigrationInput(
        {
          ...environment,
          CODECAMP_MIGRATION_SOURCE_DATABASE_URL: `postgresql://source:${secret}@localhost/codecamp_advantage`,
        },
        ["--dry-run", "--apply"],
      );
    } catch (error) {
      expect(String(error)).not.toContain(secret);
    }
  });
});
