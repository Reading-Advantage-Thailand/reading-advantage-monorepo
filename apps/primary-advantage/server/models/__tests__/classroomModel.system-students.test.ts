// @vitest-environment node
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { sql } from "drizzle-orm";
import { createTestDb, type TestDb } from "./helpers/testDb";

vi.mock("@reading-advantage/db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@reading-advantage/db")>();
  const dbProxy = new Proxy({}, {
    get(_target, property) {
      const real = (globalThis as Record<string, unknown>).__TEST_DB__ as Record<string | symbol, unknown>;
      const value = real[property];
      return typeof value === "function" ? (value as (...a: unknown[]) => unknown).bind(real) : value;
    },
  });
  return { ...actual, db: dbProxy };
});

import { getAllStudentsInSystem } from "../classroomModel";

let harness: TestDb;
beforeAll(async () => { harness = await createTestDb(); }, 60_000);
afterAll(async () => { await harness.close(); });
beforeEach(async () => { await harness.reset(); });

describe("getAllStudentsInSystem on a migrated database", () => {
  it("lists STUDENT users that have no user_roles row", async () => {
    await harness.db.execute(sql`INSERT INTO users (id, username, display_username, name, role) VALUES
      ('s1', 's1', 's1', 'S1', 'STUDENT'), ('t1', 't1', 't1', 'T1', 'TEACHER')`);
    const result = await getAllStudentsInSystem();
    expect(JSON.stringify(result)).toContain("s1");
    expect(JSON.stringify(result)).not.toContain("t1");
  });
});
