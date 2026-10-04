// @vitest-environment node
/**
 * Local Primary QA seed (primary_cutover_blockers_20261003, AC-3).
 * The seed must refuse non-local databases, and the SYSTEM user must be able
 * to sign in with the shared QA password so SYSTEM-only screens can be tested.
 */
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";

import postgres from "postgres";
import { describe, expect, it } from "vitest";

const PACKAGE_ROOT = resolve(import.meta.dirname, "../..");
const TSX = join(PACKAGE_ROOT, "../../node_modules/.bin/tsx");
const pgTestUrl = process.env.PG_TEST_URL;
const describeRealPostgres = pgTestUrl ? describe : describe.skip;

/** Runs one package script with tsx against the given database URL. */
function spawnTsx(script: string, databaseUrl: string) {
  return spawnSync(TSX, [script], {
    cwd: PACKAGE_ROOT,
    env: { ...process.env, CI: "true", NODE_ENV: "test", DATABASE_URL: databaseUrl, DIRECT_DATABASE_URL: databaseUrl },
    encoding: "utf8",
  });
}

/** Runs one package script and throws with its output when it fails. */
function runTsx(script: string, databaseUrl: string): void {
  const result = spawnTsx(script, databaseUrl);
  if (result.status !== 0) throw new Error(`${script} failed:\n${result.stdout}\n${result.stderr}`);
}

describe("primary QA seed guard", () => {
  it("refuses a missing URL and remote hosts before it connects", () => {
    for (const [url, message] of [
      ["", /DATABASE_URL/],
      ["postgres://u:p@10.0.0.5:5432/x", /non-local/],
      ["postgres://u:p@db.example.com/x?host=/cloudsql/i", /non-local/],
    ] as const) {
      const result = spawnTsx("src/seed/primary-qa-seed.ts", url);
      expect(result.status).not.toBe(0);
      expect(result.stderr).toMatch(message);
    }
  }, 60_000);
});

describe("db build config", () => {
  it("keeps the QA seed out of the published build, because it imports auth source", () => {
    const build = JSON.parse(readFileSync(join(PACKAGE_ROOT, "tsconfig.build.json"), "utf8")) as { exclude: string[] };
    expect(build.exclude).toContain("src/seed/primary-qa-seed.ts");
  });
});

describeRealPostgres("seedPrimaryQa (real PostgreSQL)", () => {
  it("gives qa-system a password login and stays safe to rerun", async () => {
    const databaseName = `primary_qa_seed_${randomUUID().replaceAll("-", "")}`;
    const admin = postgres(pgTestUrl!, { max: 1, onnotice: () => {} });
    const scratchUrl = new URL(pgTestUrl!);
    scratchUrl.pathname = `/${databaseName}`;
    await admin.unsafe(`CREATE DATABASE "${databaseName}"`);
    const client = postgres(scratchUrl.toString(), { max: 1, onnotice: () => {} });

    try {
      runTsx("scripts/migrate.ts", scratchUrl.toString());
      runTsx("src/seed/primary-qa-seed.ts", scratchUrl.toString());
      runTsx("src/seed/primary-qa-seed.ts", scratchUrl.toString());

      const rows = await client<{ role: string; providerId: string; password: string }[]>`
        SELECT u.role::text AS role, a.provider_id AS "providerId", a.password
        FROM users u JOIN accounts a ON a.user_id = u.id
        WHERE u.username = 'qa-system'
      `;
      expect(rows).toHaveLength(1);
      expect(rows[0]!.role).toBe("SYSTEM");
      expect(rows[0]!.providerId).toBe("credential");
      expect(rows[0]!.password).toMatch(/^\$argon2id\$/);
    } finally {
      await client.end();
      await admin.unsafe(`DROP DATABASE IF EXISTS "${databaseName}" WITH (FORCE)`);
      await admin.end();
    }
  }, 180_000);
});
