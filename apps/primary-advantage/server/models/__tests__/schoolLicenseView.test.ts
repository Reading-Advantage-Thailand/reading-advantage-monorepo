// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSchoolLicenseView: vi.fn(),
  listSeatHolders: vi.fn(),
  selectQueue: [] as unknown[][],
}));

vi.mock("@reading-advantage/domain", () => ({ licenses: { getSchoolLicenseView: mocks.getSchoolLicenseView, listSeatHolders: mocks.listSeatHolders } }));
vi.mock("@reading-advantage/auth", () => ({
  AuthError: class AuthError extends Error {
    constructor(message: string, readonly code: string) {
      super(message);
    }
  },
}));

/** Chainable Drizzle stub that resolves to the next queued select result. */
function selectChain() {
  const rows = mocks.selectQueue.shift() ?? [];
  const stub: Record<string, unknown> = {};
  for (const m of ["from", "where", "innerJoin", "limit", "orderBy"]) stub[m] = () => stub;
  stub.then = (resolve: (v: unknown) => unknown, reject?: (r: unknown) => unknown) => Promise.resolve(rows).then(resolve, reject);
  return stub;
}
vi.mock("@reading-advantage/db", () => {
  const table = new Proxy({}, { get: (_t, key) => String(key) });
  return {
    db: { select: () => selectChain() },
    eq: vi.fn(), and: vi.fn(), desc: vi.fn(), gte: vi.fn(), lte: vi.fn(), inArray: vi.fn(), sql: vi.fn(),
    schools: table, users: table, xpLogs: table, leaderboards: table, userRoles: table, roles: table,
    classroomStudents: table, classrooms: table, schoolAdmins: table, licenses: table,
  };
});

import { AuthError } from "@reading-advantage/auth";
import { getLicenseViewForCaller, getSeatHoldersForCaller } from "../schoolLicenseView";
import { getSchoolDetail } from "../schoolModel";

const SCHOOL = "5c5c5c5c-0000-4000-8000-000000000001";
const user = (over: Record<string, unknown> = {}) => ({ id: "u1", role: "ADMIN", schoolId: SCHOOL, ...over }) as never;

describe("getLicenseViewForCaller", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSchoolLicenseView.mockResolvedValue({ seats: 3 });
  });

  it("returns the view for the session school", async () => {
    expect(await getLicenseViewForCaller(user())).toEqual({ seats: 3 });
    expect(mocks.getSchoolLicenseView.mock.calls[0][0]).toMatchObject({ schoolId: SCHOOL });
  });

  it("returns null when the domain refuses the caller", async () => {
    mocks.getSchoolLicenseView.mockRejectedValue(new AuthError("no", "FORBIDDEN"));
    expect(await getLicenseViewForCaller(user({ role: "STUDENT" }))).toBeNull();
  });

  it("returns null without a school and does not call the domain", async () => {
    expect(await getLicenseViewForCaller(user({ schoolId: null }))).toBeNull();
    expect(mocks.getSchoolLicenseView).not.toHaveBeenCalled();
  });

  it("rethrows an unknown error", async () => {
    mocks.getSchoolLicenseView.mockRejectedValue(new Error("boom"));
    await expect(getLicenseViewForCaller(user())).rejects.toThrow("boom");
  });
});

describe("getSeatHoldersForCaller", () => {
  it("passes the session school and the page to the domain", async () => {
    mocks.listSeatHolders.mockResolvedValue({ page: 2 });
    expect(await getSeatHoldersForCaller(user() as never, 2)).toEqual({ page: 2 });
    expect(mocks.listSeatHolders.mock.calls[0]![0]).toMatchObject({ schoolId: SCHOOL, page: 2 });
  });
});

describe("getSchoolDetail license key", () => {
  const queue = () => {
    mocks.selectQueue = [
      [{ id: SCHOOL, name: "S", createdAt: new Date(), updatedAt: new Date(), ownerId: null }],
      [],
      [{ id: "l1", key: "SECRET-KEY", name: "L", description: null, maxUsers: 5, startDate: null, expiryDate: null, status: "active" }],
      [],
    ];
  };

  it("leaves out the license and its key by default", async () => {
    queue();
    expect((await getSchoolDetail(SCHOOL))?.license).toBeUndefined();
  });

  it("includes the license when asked", async () => {
    queue();
    expect((await getSchoolDetail(SCHOOL, { withLicense: true }))?.license?.key).toBe("SECRET-KEY");
  });
});

describe("getSchoolDetail staff emails", () => {
  const queue = () => {
    mocks.selectQueue = [
      [{ id: SCHOOL, name: "S", createdAt: new Date(), updatedAt: new Date(), ownerId: "o1" }],
      [{ userId: "a1", userName: "Admin", userEmail: "admin@x.test" }],
      [],
      [{ id: "o1", name: "Owner", email: "owner@x.test" }],
    ];
  };

  it("keeps the emails by default", async () => {
    queue();
    const detail = await getSchoolDetail(SCHOOL);
    expect(detail?.admins?.[0]?.user.email).toBe("admin@x.test");
  });

  it("blanks the admin and owner emails when asked", async () => {
    queue();
    const detail = await getSchoolDetail(SCHOOL, { hideStaffEmails: true });
    expect(detail?.admins?.[0]?.user).toMatchObject({ name: "Admin", email: "" });
    expect(detail?.owner?.email).toBe("");
  });
});
