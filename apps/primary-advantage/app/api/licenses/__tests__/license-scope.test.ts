/**
 * License routes pick their database scope by role
 * (primary_cutover_blockers_20261003, AC-3 SYSTEM screens).
 * SYSTEM manages licenses for every school, even when its own account has a
 * school. Every other role stays inside its own school, even without one.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  currentUser: vi.fn(),
  getTenantDB: vi.fn(),
  getUnscopedDB: vi.fn(),
  inserted: [] as Record<string, unknown>[],
  schoolRows: [] as { name: string }[],
}));

vi.mock("@/lib/session", () => ({ currentUser: mocks.currentUser }));
vi.mock("@reading-advantage/domain", () => ({
  getTenantDB: mocks.getTenantDB,
  getUnscopedDB: mocks.getUnscopedDB,
}));

/** Fake database handle that records insert values and answers school lookups. */
function fakeDb() {
  return {
    select: () => ({ from: () => ({ where: () => ({ limit: async () => mocks.schoolRows }) }) }),
    insert: () => ({
      values: (values: Record<string, unknown>) => {
        mocks.inserted.push(values);
        return { returning: async () => [{ id: "l1", key: "K", name: values.name }] };
      },
    }),
  };
}

import { POST } from "../route";
import { licenseDbFor } from "@/lib/license-db";

const SCHOOL_A = "11111111-1111-4111-8111-111111111111";
const SCHOOL_D = "22222222-2222-4222-8222-222222222222";

function createRequest(body: Record<string, unknown>) {
  return new Request("http://localhost/api/licenses", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as never;
}

const licenseBody = {
  name: "QA License",
  maxUsers: 30,
  startDate: new Date("2026-10-04T00:00:00Z").toISOString(),
  status: "active",
  subscriptionType: "basic",
  schoolId: SCHOOL_D,
};

describe("licenseDbFor", () => {
  beforeEach(() => {
    mocks.getTenantDB.mockReset().mockReturnValue("tenant");
    mocks.getUnscopedDB.mockReset().mockReturnValue("unscoped");
  });

  it("gives SYSTEM the unscoped database even when SYSTEM has a school", () => {
    expect(licenseDbFor({ role: "SYSTEM", schoolId: SCHOOL_A }, "reason")).toBe("unscoped");
    expect(mocks.getTenantDB).not.toHaveBeenCalled();
  });

  it("keeps an ADMIN without a school in the tenant scope", () => {
    expect(licenseDbFor({ role: "ADMIN", schoolId: null }, "reason")).toBe("tenant");
    expect(mocks.getTenantDB).toHaveBeenCalledWith({ schoolId: null });
    expect(mocks.getUnscopedDB).not.toHaveBeenCalled();
  });
});

describe("POST /api/licenses", () => {
  beforeEach(() => {
    mocks.inserted.length = 0;
    mocks.schoolRows = [{ name: "QA School D" }];
    mocks.getTenantDB.mockReset().mockImplementation(fakeDb);
    mocks.getUnscopedDB.mockReset().mockImplementation(fakeDb);
  });

  it("lets SYSTEM with its own school create a license for another school", async () => {
    mocks.currentUser.mockResolvedValue({ id: "sys", role: "SYSTEM", schoolId: SCHOOL_A });
    const response = await POST(createRequest(licenseBody));
    expect(response.status).toBe(200);
    expect(mocks.getUnscopedDB).toHaveBeenCalled();
    expect(mocks.inserted[0]?.schoolId).toBe(SCHOOL_D);
    expect(mocks.inserted[0]?.schoolName).toBe("QA School D");
  });

  it("refuses a SYSTEM license for a school that does not exist", async () => {
    mocks.currentUser.mockResolvedValue({ id: "sys", role: "SYSTEM", schoolId: SCHOOL_A });
    mocks.schoolRows = [];
    const response = await POST(createRequest(licenseBody));
    expect(response.status).toBe(400);
    expect(mocks.inserted).toHaveLength(0);
  });

  it("stores an empty school name when SYSTEM creates a license with no school", async () => {
    mocks.currentUser.mockResolvedValue({ id: "sys", role: "SYSTEM", schoolId: SCHOOL_A });
    const response = await POST(createRequest({ ...licenseBody, schoolId: null }));
    expect(response.status).toBe(200);
    expect(mocks.inserted[0]?.schoolName).toBe("");
  });

  it("ignores a client schoolId from an ADMIN and lets the tenant scope set it", async () => {
    mocks.currentUser.mockResolvedValue({ id: "adm", role: "ADMIN", schoolId: SCHOOL_A });
    const response = await POST(createRequest(licenseBody));
    expect(response.status).toBe(200);
    expect(mocks.getUnscopedDB).not.toHaveBeenCalled();
    expect(mocks.inserted[0]).not.toHaveProperty("schoolId");
    expect(mocks.inserted[0]?.schoolName).toBe("QA School D");
  });
});
