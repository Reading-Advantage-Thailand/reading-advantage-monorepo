import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import type { DB } from "@reading-advantage/db";
import { createTestDb, type TestDb } from "./helpers/testDb.js";
import { NOW, SCHOOL_A, SCHOOL_B, seedDashboard, seedLicenses } from "./helpers/dashboardSeed.js";
import { getSchoolLicenseTiming, getSchoolSeatUsage } from "../licenses/usage.js";

describe("school seat usage and license timing (PGlite)", () => {
  let h: TestDb;
  let db: DB;

  beforeAll(async () => {
    h = await createTestDb();
    db = h.db as unknown as DB;
    await seedDashboard(h);
  }, 120_000);
  beforeEach(async () => {
    await h.db.execute(sql.raw("delete from licenses"));
  });
  afterAll(async () => h?.close());

  // Today in Bangkok is 2026-10-12.
  it("gives 0 seats and the student count when the school has no license", async () => {
    expect(await getSchoolSeatUsage({ db, schoolId: SCHOOL_A, now: NOW })).toEqual({ seats: 0, seatsUsed: 5 });
  });

  it("sums max_users of active licenses with an end date from today on, or none", async () => {
    await seedLicenses(h, [
      { maxUsers: 100, status: "active", expiry: "2026-10-12T16:00:00" }, // 12 Oct 23:00 Bangkok: ends today, still valid
      { maxUsers: 50, status: "active", expiry: null },
      { maxUsers: 10, status: "active", expiry: "2026-10-11T16:59:00" }, // 11 Oct 23:59 Bangkok: ended
      { maxUsers: 20, status: "suspended", expiry: null },
    ]);
    expect((await getSchoolSeatUsage({ db, schoolId: SCHOOL_A, now: NOW })).seats).toBe(150);
  });

  it("gives an ended license 0 seats", async () => {
    await seedLicenses(h, [{ maxUsers: 100, status: "active", expiry: "2026-10-01T00:00:00" }]);
    expect(await getSchoolSeatUsage({ db, schoolId: SCHOOL_A, now: NOW })).toEqual({ seats: 0, seatsUsed: 5 });
  });

  it("ignores the licenses and the users of another school", async () => {
    await seedLicenses(h, [{ school: SCHOOL_B, maxUsers: 500, status: "active", expiry: null }]);
    expect(await getSchoolSeatUsage({ db, schoolId: SCHOOL_A, now: NOW })).toEqual({ seats: 0, seatsUsed: 5 });
    expect(await getSchoolSeatUsage({ db, schoolId: SCHOOL_B, now: NOW })).toEqual({ seats: 500, seatsUsed: 1 });
  });

  it("finds the days to the end of an active license within 30 days", async () => {
    await seedLicenses(h, [
      { maxUsers: 10, status: "active", expiry: "2026-11-11T05:00:00" }, // 30 days
      { maxUsers: 10, status: "active", expiry: "2026-10-20T05:00:00" }, // 8 days
    ]);
    expect(await getSchoolLicenseTiming({ db, schoolId: SCHOOL_A, now: NOW })).toEqual({ daysToEndSoon: 8, ended: false });
  });

  it("gives no end-soon value for an end after 30 days, or a license with no end", async () => {
    await seedLicenses(h, [
      { maxUsers: 10, status: "active", expiry: "2026-11-12T05:00:00" }, // 31 days
      { maxUsers: 10, status: "active", expiry: null },
    ]);
    expect(await getSchoolLicenseTiming({ db, schoolId: SCHOOL_A, now: NOW })).toEqual({ daysToEndSoon: null, ended: false });
  });

  it("flags ended only when no active license is valid", async () => {
    await seedLicenses(h, [{ maxUsers: 10, status: "active", expiry: "2026-10-01T05:00:00" }]);
    expect((await getSchoolLicenseTiming({ db, schoolId: SCHOOL_A, now: NOW })).ended).toBe(true);
    await seedLicenses(h, [{ maxUsers: 10, status: "active", expiry: null }]);
    expect((await getSchoolLicenseTiming({ db, schoolId: SCHOOL_A, now: NOW })).ended).toBe(false);
  });

  it("does not flag a school with no license as ended", async () => {
    expect(await getSchoolLicenseTiming({ db, schoolId: SCHOOL_A, now: NOW })).toEqual({ daysToEndSoon: null, ended: false });
  });
});
