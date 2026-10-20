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
vi.mock("@/lib/session", () => ({ getCurrentUser: vi.fn(), currentUser: vi.fn() }));
vi.mock("@/server/utils/passwordEvents", () => ({ afterPasswordWrite: vi.fn() }));
vi.mock("@/server/utils/credentials", () => ({
  hashNewPassword: vi.fn(async (p: string) => `hash:${p}`),
  upsertCredentialAccount: vi.fn(),
}));

import { createUser, getUserByEmail } from "../userModel";

let harness: TestDb;
beforeAll(async () => { harness = await createTestDb(); }, 60_000);
afterAll(async () => { await harness.close(); });
beforeEach(async () => { await harness.reset(); });

describe("userModel on a migrated database with no roles rows", () => {
  it("createUser signs up a STUDENT without a user role row", async () => {
    const result = await createUser({ name: "N", email: "n@x.test", password: "Valid-pass-123" });
    expect(result).toMatchObject({ success: "User created successfully" });
    const rows = await harness.db.execute(sql`SELECT role FROM users WHERE email = 'n@x.test'`);
    expect((rows.rows[0] as { role: string }).role).toBe("STUDENT");
  });

  it("getUserByEmail returns a user that has no role rows", async () => {
    await harness.db.execute(sql`INSERT INTO users (id, username, display_username, name, email, role)
      VALUES ('u1', 'u1', 'u1', 'U', 'u@x.test', 'TEACHER')`);
    const user = await getUserByEmail("u@x.test");
    expect(user).toMatchObject({ id: "u1", roles: [] });
  });

  it("createUser still adds the user_roles row when the roles row exists", async () => {
    await harness.db.execute(sql`INSERT INTO roles (name) VALUES ('user')`);
    await createUser({ name: "N", email: "n@x.test", password: "Valid-pass-123" });
    const rows = await harness.db.execute(sql`SELECT count(*)::int AS c FROM user_roles`);
    expect((rows.rows[0] as { c: number }).c).toBe(1);
  });
});
