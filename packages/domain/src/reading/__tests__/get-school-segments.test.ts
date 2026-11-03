import type { UserContext } from "@reading-advantage/auth";
import { licenseOnUsers, licenses, schools, userActivity, users } from "@reading-advantage/db";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { createTestDb, type TestDb } from "../../__tests__/helpers/testDb.js";
import { getSchoolSegmentsData, resolveLicenseScope, schoolSegmentsQuerySchema } from "../get-school-segments.js";

const SCHOOL_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const SCHOOL_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const LICENSE_A = "a1a1a1a1-a1a1-4a1a-8a1a-a1a1a1a1a1a1";
const LICENSE_B = "b1b1b1b1-b1b1-4b1b-8b1b-b1b1b1b1b1b1";

function user(role: UserContext["role"], overrides: Partial<UserContext> = {}): UserContext {
  return { id: `${role.toLowerCase()}-1`, username: role, name: role, role, schoolId: SCHOOL_A, license_id: LICENSE_A, xp: 0, level: 1, cefrLevel: "A1", ...overrides };
}

describe("schoolSegmentsQuerySchema", () => {
  it("accepts an optional non-empty license id", () => {
    expect(schoolSegmentsQuerySchema.parse({})).toEqual({});
    expect(schoolSegmentsQuerySchema.parse({ licenseId: "x" })).toEqual({ licenseId: "x" });
    expect(() => schoolSegmentsQuerySchema.parse({ licenseId: "" })).toThrow();
  });
});

describe("resolveLicenseScope", () => {
  const tenant = { schoolId: SCHOOL_A };

  it("lets SYSTEM read global aggregates without a license and records no audit", async () => {
    const recordAuditEvent = vi.fn();
    await expect(resolveLicenseScope({ user: user("SYSTEM"), tenant, requestedLicenseId: null, accessKeyProvided: false, recordAuditEvent })).resolves.toEqual({ ok: true, licenseId: null, audited: false });
    expect(recordAuditEvent).not.toHaveBeenCalled();
  });

  it("scopes a non-SYSTEM caller to the own license", async () => {
    const recordAuditEvent = vi.fn();
    await expect(resolveLicenseScope({ user: user("ADMIN"), tenant, requestedLicenseId: null, accessKeyProvided: true, recordAuditEvent })).resolves.toEqual({ ok: true, licenseId: LICENSE_A, audited: false });
    await expect(resolveLicenseScope({ user: user("TEACHER"), tenant, requestedLicenseId: LICENSE_A, accessKeyProvided: false, recordAuditEvent })).resolves.toEqual({ ok: true, licenseId: LICENSE_A, audited: false });
    await expect(resolveLicenseScope({ user: user("STUDENT", { license_id: undefined }), tenant, requestedLicenseId: null, accessKeyProvided: false, recordAuditEvent })).resolves.toEqual({ ok: true, licenseId: null, audited: false });
    expect(recordAuditEvent).not.toHaveBeenCalled();
  });

  it("forbids a non-SYSTEM caller from reading another license, even with an access key", async () => {
    const recordAuditEvent = vi.fn();
    await expect(resolveLicenseScope({ user: user("ADMIN"), tenant, requestedLicenseId: LICENSE_B, accessKeyProvided: true, recordAuditEvent })).resolves.toEqual({ ok: false, reason: "FORBIDDEN_CROSS_LICENSE" });
    expect(recordAuditEvent).not.toHaveBeenCalled();
  });

  it("checks the role only and ignores a tenant that differs from the caller's school", async () => {
    await expect(resolveLicenseScope({ user: user("ADMIN"), tenant: { schoolId: SCHOOL_B }, requestedLicenseId: null, accessKeyProvided: false, recordAuditEvent: vi.fn() })).resolves.toEqual({ ok: true, licenseId: LICENSE_A, audited: false });
  });

  it("lets SYSTEM cross licenses with an access key and no audit", async () => {
    const recordAuditEvent = vi.fn();
    await expect(resolveLicenseScope({ user: user("SYSTEM"), tenant, requestedLicenseId: LICENSE_B, accessKeyProvided: true, recordAuditEvent })).resolves.toEqual({ ok: true, licenseId: LICENSE_B, audited: false });
    expect(recordAuditEvent).not.toHaveBeenCalled();
  });

  it("audits a SYSTEM cross-license read without an access key before it returns", async () => {
    const recordAuditEvent = vi.fn().mockResolvedValue(undefined);
    await expect(resolveLicenseScope({ user: user("SYSTEM"), tenant, requestedLicenseId: LICENSE_B, accessKeyProvided: false, recordAuditEvent })).resolves.toEqual({ ok: true, licenseId: LICENSE_B, audited: true });
    expect(recordAuditEvent).toHaveBeenCalledWith({ actorUserId: "system-1", actorRole: "SYSTEM", licenseId: LICENSE_B });
  });

  it("fails the read when the audit write fails", async () => {
    const recordAuditEvent = vi.fn().mockRejectedValue(new Error("audit down"));
    await expect(resolveLicenseScope({ user: user("SYSTEM"), tenant, requestedLicenseId: LICENSE_B, accessKeyProvided: false, recordAuditEvent })).rejects.toThrow("audit down");
  });

  it("returns the SYSTEM caller's own license without an audit", async () => {
    const recordAuditEvent = vi.fn();
    await expect(resolveLicenseScope({ user: user("SYSTEM"), tenant, requestedLicenseId: LICENSE_A, accessKeyProvided: false, recordAuditEvent })).resolves.toEqual({ ok: true, licenseId: LICENSE_A, audited: false });
    expect(recordAuditEvent).not.toHaveBeenCalled();
  });
});

describe("getSchoolSegmentsData", () => {
  let harness: TestDb;

  beforeAll(async () => {
    harness = await createTestDb();
    await harness.db.insert(schools).values([{ id: SCHOOL_A, name: "Alpha" }, { id: SCHOOL_B, name: "Beta" }]);
    await harness.db.insert(users).values([
      { id: "a-student-1", username: "as1", displayUsername: "as1", role: "STUDENT", schoolId: SCHOOL_A, level: 4, xp: 100 },
      { id: "a-student-2", username: "as2", displayUsername: "as2", role: "STUDENT", schoolId: SCHOOL_A, level: 5, xp: 50 },
      { id: "a-teacher", username: "at", displayUsername: "at", role: "TEACHER", schoolId: SCHOOL_A },
      { id: "a-admin", username: "aa", displayUsername: "aa", role: "ADMIN", schoolId: SCHOOL_A },
      { id: "b-student", username: "bs", displayUsername: "bs", role: "STUDENT", schoolId: SCHOOL_B, level: 2, xp: 10 },
    ]);
    await harness.db.insert(licenses).values([
      { id: LICENSE_A, key: "key-a", schoolName: "Alpha", schoolId: SCHOOL_A, maxUsers: 10 },
      { id: LICENSE_B, key: "key-b", schoolName: "Beta", schoolId: SCHOOL_B, maxUsers: 5 },
    ]);
    await harness.db.insert(licenseOnUsers).values([
      { userId: "a-student-1", licenseId: LICENSE_A },
      { userId: "a-student-2", licenseId: LICENSE_A },
      { userId: "b-student", licenseId: LICENSE_B },
    ]);
    await harness.db.insert(userActivity).values([
      { userId: "a-student-1", activityType: "READ" },
      { userId: "a-teacher", activityType: "READ", createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000) },
    ]);
  }, 120_000);
  afterAll(async () => harness.close());

  it("rejects a TEACHER before any read", async () => {
    const db = harness.tenantDb({ schoolId: SCHOOL_A });
    await expect(getSchoolSegmentsData({ db, user: user("TEACHER"), tenant: { schoolId: SCHOOL_A }, input: { resolvedLicenseId: LICENSE_A } })).rejects.toThrow();
  });

  it("aggregates every school for a SYSTEM caller without a license", async () => {
    const db = harness.tenantDb({ schoolId: null });
    const data = await getSchoolSegmentsData({ db, user: user("SYSTEM", { schoolId: null, license_id: null }), tenant: { schoolId: null }, input: { resolvedLicenseId: null } });
    const alpha = data.segments.find((segment) => segment.schoolId === SCHOOL_A);
    const beta = data.segments.find((segment) => segment.schoolId === SCHOOL_B);
    expect(alpha).toEqual({ schoolId: SCHOOL_A, schoolName: "Alpha", studentCount: 2, teacherCount: 2, activeRate: 25, averageLevel: 4.5, totalXp: 150, licensesUsed: 2, licensesTotal: 10 });
    expect(beta).toEqual({ schoolId: SCHOOL_B, schoolName: "Beta", studentCount: 1, teacherCount: 0, activeRate: 0, averageLevel: 2, totalXp: 10, licensesUsed: 1, licensesTotal: 5 });
    const allSchools = await harness.db.select({ id: schools.id }).from(schools);
    const otherRates = data.segments.filter((segment) => segment.schoolId !== SCHOOL_A && segment.schoolId !== SCHOOL_B).map((segment) => segment.activeRate);
    expect(otherRates.every((rate) => rate === 0)).toBe(true);
    expect(data.summary).toEqual({ totalSchools: allSchools.length, averageActiveRate: Math.round(25 / allSchools.length), totalLicensesUsed: 3 });
  });

  it("limits a SYSTEM caller to the school of the resolved license", async () => {
    const db = harness.tenantDb({ schoolId: null });
    const data = await getSchoolSegmentsData({ db, user: user("SYSTEM", { schoolId: null }), tenant: { schoolId: null }, input: { resolvedLicenseId: LICENSE_B } });
    expect(data.segments.map((segment) => segment.schoolId)).toEqual([SCHOOL_B]);
    expect(data.summary).toEqual({ totalSchools: 1, averageActiveRate: 0, totalLicensesUsed: 1 });
  });

  it("falls back to every school when the resolved license does not exist", async () => {
    const db = harness.tenantDb({ schoolId: null });
    const data = await getSchoolSegmentsData({ db, user: user("SYSTEM", { schoolId: null }), tenant: { schoolId: null }, input: { resolvedLicenseId: "99999999-9999-4999-8999-999999999999" } });
    const allSchools = await harness.db.select({ id: schools.id }).from(schools);
    expect(data.summary.totalSchools).toBe(allSchools.length);
    expect(data.segments.map((segment) => segment.schoolId)).toEqual(expect.arrayContaining([SCHOOL_A, SCHOOL_B]));
  });

  it("returns the ADMIN caller's own school segment through the tenant database", async () => {
    const db = harness.tenantDb({ schoolId: SCHOOL_A });
    const data = await getSchoolSegmentsData({ db, user: user("ADMIN"), tenant: { schoolId: SCHOOL_A }, input: { resolvedLicenseId: LICENSE_A } });
    expect(data.segments.map((segment) => segment.schoolId)).toEqual([SCHOOL_A]);
    expect(data.segments[0]).toMatchObject({ licensesUsed: 2, licensesTotal: 10 });
  });
});
