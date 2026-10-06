// @vitest-environment node
/**
 * Phase 2 review (item 3): getUserActivity returned the full users row (with the password hash
 * column) next to the activity. The callers read only the name, the username, and the CEFR level.
 * This test runs the model against the in-process Postgres (PGlite).
 */
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { userActivity, users, xpLogs } from "@reading-advantage/db";
import { createTestDb, type TestDb } from "./helpers/testDb";

vi.mock("@reading-advantage/db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@reading-advantage/db")>();
  const dbProxy = new Proxy(
    {},
    {
      get(_target, property) {
        const real = (globalThis as Record<string, unknown>).__TEST_DB__ as Record<string | symbol, unknown> | undefined;
        if (!real) throw new Error("Test DB not initialized");
        const value = real[property];
        return typeof value === "function" ? (value as (...args: unknown[]) => unknown).bind(real) : value;
      },
    },
  );
  return { ...actual, db: dbProxy };
});
vi.mock("@/lib/session", () => ({ getCurrentUser: vi.fn(), currentUser: vi.fn() }));
vi.mock("@/server/utils/passwordEvents", () => ({ afterPasswordWrite: vi.fn() }));

import { getUserActivity } from "../userModel";

let harness: TestDb;

beforeAll(async () => {
  harness = await createTestDb();
});

afterEach(async () => {
  await harness.reset();
});

afterAll(async () => {
  await harness.close();
});

describe("getUserActivity", () => {
  it("returns the activity, the XP logs, and only the safe user columns", async () => {
    await harness.db.insert(users).values({
      id: "student-1",
      username: "ann",
      displayUsername: "Ann",
      name: "Ann Lee",
      email: "ann@example.com",
      role: "STUDENT",
      cefrLevel: "A2",
      password: "$argon2id$v=19$secret-hash",
    });
    await harness.db.insert(userActivity).values({ userId: "student-1", activityType: "ARTICLE_READ", targetId: "article-1", completed: true });
    await harness.db.insert(xpLogs).values({ userId: "student-1", xpEarned: 5, activityId: "activity-1", activityType: "ARTICLE_READ" });

    const result = await getUserActivity("student-1");

    expect(result?.user).toEqual({ id: "student-1", name: "Ann Lee", username: "ann", cefrLevel: "A2" });
    expect(result?.activity).toHaveLength(1);
    expect(result?.xpLogs).toHaveLength(1);
    expect(JSON.stringify(result)).not.toContain("argon2id");
  });

  it("returns nothing for an unknown user", async () => {
    expect(await getUserActivity("ghost")).toBeUndefined();
  });
});
