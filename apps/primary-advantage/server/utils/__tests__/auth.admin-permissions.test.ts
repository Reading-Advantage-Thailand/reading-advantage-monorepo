// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

vi.mock("@reading-advantage/db", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@reading-advantage/db")>()),
  db: {},
}));

import {
  checkAdminPermissions,
  checkStudentPermissions,
  checkTeacherPermissions,
  effectiveCallerRole,
  getUserSchoolIds,
  type UserWithRoles,
} from "../auth";

/** Builds a caller with no legacy role or school_admins rows. */
function caller(role: string | null): UserWithRoles {
  return { id: "u1", email: null, schoolId: "school-a", level: 1, role, roles: [], SchoolAdmins: [] };
}

describe("checkAdminPermissions session role (FR-5)", () => {
  it.each(["ADMIN", "SYSTEM", "admin"])("admits a %s session role without legacy rows", async (role) => {
    await expect(checkAdminPermissions(caller(role))).resolves.toBe(true);
  });

  it.each(["TEACHER", "STUDENT", null])("rejects a %s session role without legacy rows", async (role) => {
    await expect(checkAdminPermissions(caller(role))).resolves.toBe(false);
  });
});

describe("caller checks count only an own-school school_admins row", () => {
  const foreign = { ...caller("TEACHER"), SchoolAdmins: [{ id: "sa", schoolId: "school-b" }] };
  const own = { ...caller("TEACHER"), SchoolAdmins: [{ id: "sa", schoolId: "school-a" }] };

  it("admits an own-school row and rejects a foreign row for admin checks", async () => {
    await expect(checkAdminPermissions(own)).resolves.toBe(true);
    await expect(checkAdminPermissions(foreign)).resolves.toBe(false);
  });

  it("applies the same rule to the teacher and student checks", async () => {
    const bare = { ...foreign, role: null };
    await expect(checkTeacherPermissions(bare)).resolves.toBe(false);
    await expect(checkStudentPermissions(bare)).resolves.toBe(false);
    await expect(checkTeacherPermissions({ ...own, role: null })).resolves.toBe(true);
  });

  it("ranks a foreign row as no admin in effectiveCallerRole", () => {
    expect(effectiveCallerRole({ ...foreign, role: null })).toBe("");
    expect(effectiveCallerRole({ ...own, role: null })).toBe("ADMIN");
  });

  it("limits accessible schools to the home school", async () => {
    await expect(getUserSchoolIds(foreign)).resolves.toEqual(["school-a"]);
  });
});
