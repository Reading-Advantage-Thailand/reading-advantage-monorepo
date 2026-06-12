/**
 * Phase 1 Contract: artifact presence + shape asserts for the migration-ledger
 * hardening track (db_migration_ledger_20260611). This test is intentionally
 * RED on master — none of the contract artifacts exist yet. Green is owned by
 * the Phase 3 Implement role (one task per describe block).
 *
 * Per measure/test-strategy.md §5: "Phase 1: Pure file-existence + JSON-shape
 * asserts on contract stubs. Doctor stub must exit 2 (probed by
 * command-construction test, not full spawn)."
 *
 * Targeted Red command:
 *   pnpm vitest run src/__tests__/contract-stubs.test.ts
 */

import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = resolve(HERE, "../..");

const README_PATH = join(PACKAGE_ROOT, "drizzle/meta/README.md");
const SENTINELS_PATH = join(PACKAGE_ROOT, "scripts/sentinels.ts");
const DOCTOR_PATH = join(PACKAGE_ROOT, "scripts/migration-ledger-doctor.ts");
const PACKAGE_JSON_PATH = join(PACKAGE_ROOT, "package.json");
const USERS_SCHEMA_PATH = join(PACKAGE_ROOT, "src/schema/users.ts");

function readPackageJson(): Record<string, unknown> {
  return JSON.parse(readFileSync(PACKAGE_JSON_PATH, "utf8")) as Record<string, unknown>;
}

describe("Phase 1 — Task 1: journal re-stamp design note (drizzle/meta/README.md)", () => {
  it("ships drizzle/meta/README.md", () => {
    expect(
      existsSync(README_PATH),
      "packages/db/drizzle/meta/README.md must exist as the sidecar note (JSON allows no comments)"
    ).toBe(true);
  });

  it("documents the strict-`<` migrator semantics from drizzle-orm 0.44.7 (dialect.js:62)", () => {
    const text = readFileSync(README_PATH, "utf8");
    expect(text).toMatch(/drizzle-orm[^0-9]*0\.44\.7/);
    // Must name the strict-`<` comparison from dialect.js:62
    expect(text).toMatch(/strict-?</i);
  });

  it("names the production-ledger ceiling 1779120000000 that bounds the re-stamp", () => {
    const text = readFileSync(README_PATH, "utf8");
    expect(text).toMatch(/1779120000000/);
  });

  it("lists the interpolation table of old → new `when` per re-stamped entry (idx 3–8, 11, 13–15, 17, 18)", () => {
    const text = readFileSync(README_PATH, "utf8");
    // Each affected idx must appear
    for (const idx of [3, 4, 5, 6, 7, 8, 11, 13, 14, 15, 17, 18]) {
      expect(text, `must mention idx ${idx}`).toMatch(new RegExp(`\\b${idx}\\b`));
    }
  });

  it("states the entries 0–16 ≤ 1779120000000 / 17+ > 1779120000000 invariant", () => {
    const text = readFileSync(README_PATH, "utf8");
    // Loose — the README can phrase it many ways; we require both halves.
    expect(text).toMatch(/0[–-]16[^.\n]*1779120000000|0 through 16[^.\n]*1779120000000/i);
    expect(text).toMatch(/17[+>][^.\n]*1779120000000/);
  });

  it("documents the hand-written-migration protocol (SQL file + journal entry + integrity test)", () => {
    const text = readFileSync(README_PATH, "utf8");
    expect(text).toMatch(/SQL file/i);
    expect(text).toMatch(/journal/i);
    expect(text).toMatch(/integrity test/i);
  });
});

describe("Phase 1 — Task 2: sentinel-probe map (scripts/sentinels.ts)", () => {
  it("ships scripts/sentinels.ts", () => {
    expect(
      existsSync(SENTINELS_PATH),
      "packages/db/scripts/sentinels.ts must exist with the typed sentinel map"
    ).toBe(true);
  });

  it("exports a typed sentinel-probe map covering every journal entry 0000..0018", () => {
    const text = readFileSync(SENTINELS_PATH, "utf8");
    // Single source of truth — must be a named export.
    expect(text).toMatch(/export\s+(?:const|let|var)\s+sentinelProbes/);
    for (let i = 0; i <= 20; i++) {
      const tag = `${i.toString().padStart(4, "0")}_`;
      expect(text, `sentinels.ts must reference ${tag}*`).toContain(`"${tag}`);
    }
  });

  it("declares the doctor exit-code contract (0 clean, 1 divergence, 2 config/connection error)", () => {
    const text = readFileSync(SENTINELS_PATH, "utf8");
    // All three codes must be declared, with their semantics.
    expect(text).toMatch(/\b0\b[^.\n]*clean/i);
    expect(text).toMatch(/\b1\b[^.\n]*divergence/i);
    expect(text).toMatch(/\b2\b[^.\n]*(?:connection|config)[^.\n]*error/i);
  });
});

describe("Phase 1 — Task 3: doctor script stub (scripts/migration-ledger-doctor.ts)", () => {
  it("ships scripts/migration-ledger-doctor.ts", () => {
    expect(
      existsSync(DOCTOR_PATH),
      "packages/db/scripts/migration-ledger-doctor.ts must exist (scaffold)"
    ).toBe(true);
  });

  it("parses --check and --repair CLI flags", () => {
    const text = readFileSync(DOCTOR_PATH, "utf8");
    expect(text).toMatch(/--check/);
    expect(text).toMatch(/--repair/);
  });

  it("stub exits 2 (command-construction probe — no full spawn, per test-strategy §5)", () => {
    // Phase 2's ledger-doctor.test.ts proves exit-2 against a real DB; the
    // Phase-1 contract here only asserts the scaffold *declares* process.exit(2)
    // for its not-yet-implemented state.
    const text = readFileSync(DOCTOR_PATH, "utf8");
    expect(text).toMatch(/process\.exit\(\s*2\s*\)/);
  });
});

describe("Phase 1 — Task 3: package.json wiring (doctor script + ./seed subpath)", () => {
  it("registers a `doctor` script that runs the doctor via tsx", () => {
    const pkg = readPackageJson();
    const scripts = pkg.scripts as Record<string, string> | undefined;
    expect(scripts?.doctor, "scripts.doctor must be defined").toBeDefined();
    expect(scripts?.doctor).toMatch(/tsx\s+scripts\/migration-ledger-doctor\.ts/);
  });

  it("exposes a `./seed` subpath export", () => {
    const pkg = readPackageJson();
    const exports = pkg.exports as Record<string, unknown> | undefined;
    expect(exports?.["./seed"], "exports['./seed'] must be defined").toBeDefined();
  });
});

describe("Phase 1 — Task 3: sessions index entries (src/schema/users.ts)", () => {
  it("declares sessions_user_id_idx and sessions_expires_at_idx on the sessions table", () => {
    expect(
      existsSync(USERS_SCHEMA_PATH),
      "src/schema/users.ts must exist for the index-entry check"
    ).toBe(true);
    const text = readFileSync(USERS_SCHEMA_PATH, "utf8");
    expect(text, "must declare sessions_user_id_idx").toMatch(/sessions_user_id_idx/);
    expect(text, "must declare sessions_expires_at_idx").toMatch(/sessions_expires_at_idx/);
  });
});
