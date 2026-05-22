import { describe, it, expect, vi } from "vitest";
import type { DB } from "@reading-advantage/db";
import { createLicense, attachUserToLicense, listUserLicenses } from "../licenses/index.js";
import { createTenantDB } from "../db-contract.js";
import { createMockDb } from "./mock-db.js";

vi.mock("@reading-advantage/db/schema", () => ({
  licenses: { id: "id", key: "key", schoolId: "schoolId", licenseType: "licenseType" },
  licenseOnUsers: { userId: "userId", licenseId: "licenseId", activateAt: "activateAt" },
  users: { id: "id" },
  schools: { id: "id" },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((col, val) => ({ col, val, type: "eq" })),
  and: vi.fn((...conds) => ({ type: "and", conds })),
}));

const mockAdmin = { id: "admin-1", role: "ADMIN" as const, schoolId: "school-1" };
const mockStudent = { id: "student-1", role: "STUDENT" as const, schoolId: "school-1" };
const mockTenant = { schoolId: "school-1" };

function wrapDb(db: ReturnType<typeof createMockDb>) {
  return createTenantDB(db as unknown as DB, mockTenant);
}

describe("createLicense", () => {
  it("creates a license and returns it", async () => {
    const created = { id: "lic-1", key: "KEY-ABC", schoolName: "Test School", licenseType: "BASIC" };
    const db = createMockDb({ insertReturning: [created] });

    const result = await createLicense({
      db: wrapDb(db),
      user: mockAdmin,
      tenant: mockTenant,
      input: { key: "KEY-ABC", schoolName: "Test School", maxUsers: 30 },
    });

    expect(result.key).toBe("KEY-ABC");
    expect(db.insert).toHaveBeenCalled();
  });

  it("throws when non-admin tries to create a license", async () => {
    const db = createMockDb();

    await expect(
      createLicense({
        db: wrapDb(db),
        user: mockStudent,
        tenant: mockTenant,
        input: { key: "KEY-X", schoolName: "Hack School", maxUsers: 1 },
      })
    ).rejects.toThrow(/license:create/);
  });
});

describe("attachUserToLicense", () => {
  it("attaches a user to a license", async () => {
    const db = createMockDb({ insertReturning: [{ userId: "u1", licenseId: "lic-1" }] });

    const result = await attachUserToLicense({
      db: wrapDb(db),
      user: mockAdmin,
      tenant: mockTenant,
      input: { userId: "u1", licenseId: "lic-1" },
    });

    expect(result).toEqual({ userId: "u1", licenseId: "lic-1" });
    expect(db.insert).toHaveBeenCalled();
  });

  it("throws when non-admin tries to attach user", async () => {
    const db = createMockDb();

    await expect(
      attachUserToLicense({
        db: wrapDb(db),
        user: mockStudent,
        tenant: mockTenant,
        input: { userId: "u2", licenseId: "lic-1" },
      })
    ).rejects.toThrow(/license:manage/);
  });
});

describe("listUserLicenses", () => {
  it("returns licenses for a user", async () => {
    const db = createMockDb({ selectResults: [{ id: "lic-1", key: "KEY-A" }] });

    const result = await listUserLicenses({
      db: wrapDb(db),
      user: mockAdmin,
      tenant: mockTenant,
      input: { userId: "u1" },
    });

    expect(result).toHaveLength(1);
    expect(result[0]).toHaveProperty("id", "lic-1");
  });

  it("throws when student tries to list another user's licenses", async () => {
    const db = createMockDb();

    await expect(
      listUserLicenses({
        db: wrapDb(db),
        user: mockStudent,
        tenant: mockTenant,
        input: { userId: "other-user" },
      })
    ).rejects.toThrow(/license:manage/);
  });

  it("allows student to list their own licenses", async () => {
    const db = createMockDb({ selectResults: [] });

    const result = await listUserLicenses({
      db: wrapDb(db),
      user: mockStudent,
      tenant: mockTenant,
      input: { userId: "student-1" },
    });

    expect(result).toEqual([]);
  });
});
