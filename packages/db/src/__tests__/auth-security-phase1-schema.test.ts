/**
 * Phase 1 Red-phase tests for Task 3 of the auth-security-hardening track.
 *
 * Driven by `measure/tracks/auth_security_hardening_20260611/plan.md`
 * Phase 1 Task 3. The Green-phase implementer must add a `tokenHash`
 * column to the `sessions` table in
 * `packages/db/src/schema/users.ts` so the FR-1 sha256 storage target
 * has a typed home before Phase 3 lands.
 *
 * Why this is a Phase 1 test (not Phase 2):
 *   The test-strategy (`measure/tracks/.../test-strategy.md` §1) says
 *   Phase 1 is "types-as-tests + 1 migration-journal sanity test". For
 *   Task 3 that means asserting on the runtime Drizzle column object
 *   (not behaviour). The column is the contract; the migration that
 *   fills it ships in Task 2.
 *
 * The column is read off the live `sessions` table definition so a
 * regression to the schema (or a missed unique constraint) trips the
 * test runner instead of being caught in a runtime query surprise.
 *
 * RED expectations (2026-06-12):
 *   - `tokenHash` does not exist on the `sessions` table → all four
 *     assertions fail. The "throws on missing column" assertion proves
 *     the column really is absent (not merely empty), so the Phase 3
 *     implementer can read the file directly without spinning up a
 *     migration.
 *
 * Test command (targeted, no DB / no network):
 *   cd packages/db && npx vitest run src/__tests__/auth-security-phase1-schema.test.ts
 */
import { describe, expect, it } from "vitest";
import { sessions } from "../schema/users.js";

const sessionsColumnNames = Object.keys(sessions).filter(
  (k) => !k.startsWith("_") && !k.startsWith("["),
);

describe("Phase 1 — Task 3: sessions table exposes a tokenHash column", () => {
  it("exposes a tokenHash column on the sessions table", () => {
    expect(
      sessionsColumnNames,
      "Expected the sessions table to expose a tokenHash column so FR-1 " +
        "has a typed storage target for sha256(session token). The current " +
        "schema only has the raw token column.",
    ).toContain("tokenHash");
  });

  it("the tokenHash column is the only snake-case 'token_hash' field on sessions", () => {
    // The Drizzle column name drives the SQL identifier, so the
    // snake-case mapping must match the migration's ALTER TABLE
    // statement exactly. A typo (tokenhash, tokenHashId) would break
    // the 0019 migration at runtime.
    const snakeCased = sessionsColumnNames.filter(
      (k) => k.toLowerCase() === "tokenhash",
    );
    expect(
      snakeCased,
      "The camelCase 'tokenHash' field must map to the SQL column " +
        "'token_hash' (asserted indirectly by exact name match).",
    ).toEqual(["tokenHash"]);
  });

  it("the tokenHash column is marked NOT NULL at the type level", () => {
    // Drizzle columns carry the NOT NULL bit on the column object —
    // we don't need to read the generated SQL. A notNull() column has
    // a truthy `notNull` flag.
    const column = (sessions as unknown as Record<string, { notNull?: boolean }>)
      .tokenHash;

    // If the column does not exist yet, the previous assertion already
    // failed; surface a clean signal here so the failure messages are
    // localised to the right task.
    if (column === undefined) {
      throw new Error(
        "sessions.tokenHash is missing — see the previous assertion for " +
          "the migration-journal context. NOT NULL cannot be asserted " +
          "until the column exists.",
      );
    }

    expect(
      column.notNull,
      "sessions.tokenHash must be NOT NULL. The 0019 migration hardens " +
        "the column to NOT NULL, and the schema declaration must match " +
        "so Drizzle emits the right DDL on the next `drizzle-kit generate`.",
    ).toBe(true);
  });

  it("the tokenHash column is marked UNIQUE at the type level", () => {
    const column = (sessions as unknown as Record<string, { isUnique?: boolean }>)
      .tokenHash;

    if (column === undefined) {
      throw new Error(
        "sessions.tokenHash is missing — see the previous assertion for " +
          "the migration-journal context. UNIQUE cannot be asserted " +
          "until the column exists.",
      );
    }

    expect(
      column.isUnique,
      "sessions.tokenHash must be UNIQUE. FR-1 looks up sessions by " +
        "sha256(token) and the DB-level uniqueness guarantee is what " +
        "prevents two sessions from sharing a token by construction.",
    ).toBe(true);
  });

  it("keeps the legacy token column nullable so hash-only inserts can succeed", () => {
    const column = (sessions as unknown as Record<string, { notNull?: boolean }>)
      .token;

    expect(
      column.notNull,
      "sessions.token must be nullable after FR-1. The column is retained " +
        "for zero-downtime compatibility, but createSession no longer writes " +
        "raw tokens, so a NOT NULL constraint would reject every new " +
        "hash-only session insert in Postgres.",
    ).not.toBe(true);
  });
});
