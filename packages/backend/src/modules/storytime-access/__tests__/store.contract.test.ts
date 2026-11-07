/**
 * The Storytime store contract on PGlite (test strategy P2b.3 and P2b.5, task 2b.2).
 *
 * The store lives in `packages/backend/src/modules/storytime-access/index.ts` and owns all SQL.
 * The shared suite in `./store-contract.ts` also runs against the app fake store, so the fake can
 * not drift from the SQL. PGlite is an in-process Postgres engine; no server and no Docker run
 * here (fact M11). The one real server runs only in `phase2b-browser-gate.sh`.
 *
 * At the base every case fails on `Missing packages/backend/src/modules/storytime-access/index.ts`.
 * The module is loaded only after that assertion, so no case fails with a load error.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { storeContractSuite, type ContractStore } from "./store-contract";

const REPO = resolve(import.meta.dirname, "../../../../../..");
const STORE_ENTRY = resolve(REPO, "packages/backend/src/modules/storytime-access/index.ts");
const MIGRATION_DIR = resolve(REPO, "packages/db/drizzle-storytime");
const STORE_LABEL = "packages/backend/src/modules/storytime-access/index.ts";
const MIGRATION_LABEL = "packages/db/drizzle-storytime";

const READY = existsSync(STORE_ENTRY) && existsSync(MIGRATION_DIR);

interface Database {
  exec(sql: string): Promise<unknown>;
  query(sql: string): Promise<{ rows: Array<Record<string, unknown>> }>;
}

interface Harness {
  database: Database;
  store: ContractStore;
}

let harness: Harness | null = null;

/**
 * Creates the in-process database once and applies the committed migration.
 * @returns The database and one store that points at it.
 */
async function setup(): Promise<Harness> {
  if (harness) return harness;
  const { PGlite } = (await import("@electric-sql/pglite")) as {
    PGlite: new () => Database;
  };
  const { drizzle } = (await import("drizzle-orm/pglite")) as {
    drizzle: (client: unknown) => unknown;
  };
  const database = new PGlite();
  const files = readdirSync(MIGRATION_DIR).filter((name) => name.endsWith(".sql"));
  expect(files.length, "exactly one storytime migration SQL file").toBe(1);
  const sqlText = readFileSync(join(MIGRATION_DIR, files[0]), "utf8");
  for (const statement of sqlText.split("--> statement-breakpoint")) {
    if (statement.trim()) await database.exec(statement);
  }
  const { createStorytimeStore } = (await import("../index.js")) as {
    createStorytimeStore: (client: unknown) => ContractStore;
  };
  harness = { database, store: createStorytimeStore(drizzle(database)) };
  return harness;
}

/**
 * Gives a clean store for one contract case.
 * @returns The store with empty tables.
 */
async function makeStore(): Promise<ContractStore> {
  const { database, store } = await setup();
  await database.exec(
    "TRUNCATE storytime_audit_events, storytime_sessions, storytime_login_attempts, storytime_accounts CASCADE",
  );
  return store;
}

if (READY) {
  storeContractSuite("pglite", makeStore);

  describe("storytime store (PGlite)", () => {
    it("keeps the pinned store entry and the migration folder", () => {
      expect(existsSync(STORE_ENTRY), `Missing ${STORE_LABEL}`).toBe(true);
      expect(existsSync(MIGRATION_DIR), `Missing ${MIGRATION_LABEL}`).toBe(true);
    });

    it("blocks an update and a delete of an audit event in the database", async () => {
      expect(existsSync(STORE_ENTRY), `Missing ${STORE_LABEL}`).toBe(true);
      const { database, store } = await setup();
      await makeStore();
      await store.insertAuditEvent({
        action: "sign_in_success",
        username: "staff-01",
        now: new Date("2026-11-07T00:00:00.000Z"),
      });
      await expect(
        database.exec("UPDATE storytime_audit_events SET action = 'tampered'"),
      ).rejects.toThrow();
      await expect(database.exec("DELETE FROM storytime_audit_events")).rejects.toThrow();
      const rows = await database.query(
        "SELECT action, username FROM storytime_audit_events",
      );
      expect(rows.rows).toHaveLength(1);
      expect(rows.rows[0].action).toBe("sign_in_success");
      expect(rows.rows[0].username).toBe("staff-01");
    });
  });
} else {
  describe("storytime store contract (red)", () => {
    it("needs the pinned store entry", () => {
      expect(existsSync(STORE_ENTRY), `Missing ${STORE_LABEL}`).toBe(true);
    });

    it("needs the migration folder", () => {
      expect(existsSync(MIGRATION_DIR), `Missing ${MIGRATION_LABEL}`).toBe(true);
    });
  });
}
