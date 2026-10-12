/**
 * PGlite test of the `getTeacherBookSlots` class rule: only classes of the teacher's school that
 * the teacher owns or co-teaches, not archived (primary_parity_class_books_20261011).
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { DB } from "@reading-advantage/db";
import type { UserContext } from "@reading-advantage/auth";
import { createTestDb, type TestDb } from "../../__tests__/helpers/testDb.js";
import { SCHOOL_A, SCHOOL_B, seedDashboard } from "../../__tests__/helpers/dashboardSeed.js";
import { getTeacherBookSlots } from "../class-books.js";

const teacher = (id: string, schoolId: string | null): UserContext => ({
  id,
  username: id,
  name: id,
  role: "TEACHER",
  schoolId,
  xp: 0,
  level: 1,
  cefrLevel: "A1-",
});

describe("getTeacherBookSlots (PGlite, two schools)", () => {
  let h: TestDb;
  let db: DB;
  beforeAll(async () => {
    h = await createTestDb();
    db = h.db as unknown as DB;
    await seedDashboard(h);
  }, 120_000);
  afterAll(async () => h?.close());

  const names = async (user: UserContext) => (await getTeacherBookSlots({ db, user })).map((slot) => slot.classroomName);

  it("lists the owned classes and skips the archived one", async () => {
    expect(await names(teacher("tA1", SCHOOL_A))).toEqual(["C1", "C2"]);
  });

  it("lists an owned class and a co-taught class", async () => {
    expect(await names(teacher("tA2", SCHOOL_A))).toEqual(["C2", "C3"]);
  });

  it("lists nothing for a teacher without a class", async () => {
    expect(await names(teacher("tA3", SCHOOL_A))).toEqual([]);
  });

  it("never lists a class of another school", async () => {
    expect(await names(teacher("tB", SCHOOL_B))).toEqual(["CB"]);
    expect(await names(teacher("tA1", SCHOOL_B))).toEqual([]);
  });
});
