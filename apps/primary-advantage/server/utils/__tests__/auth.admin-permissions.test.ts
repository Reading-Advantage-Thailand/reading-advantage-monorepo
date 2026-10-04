// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

vi.mock("@reading-advantage/db", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@reading-advantage/db")>()),
  db: {},
}));

import { checkAdminPermissions, type UserWithRoles } from "../auth";

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
