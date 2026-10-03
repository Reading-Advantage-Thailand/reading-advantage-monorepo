import { describe, expect, it } from "vitest";
import { ROLES } from "@reading-advantage/auth";
import {
  STAFF_ROLES,
  getEffectiveRole,
  hasPermission,
  isStaffRole,
} from "../permissions";

describe("STAFF_ROLES", () => {
  it("is the teacher, admin, and system roles from the shared auth package", () => {
    expect([...STAFF_ROLES]).toEqual([ROLES.TEACHER, ROLES.ADMIN, ROLES.SYSTEM]);
    expect(isStaffRole("TEACHER")).toBe(true);
    expect(isStaffRole("STUDENT")).toBe(false);
    expect(isStaffRole(null)).toBe(false);
  });
});

describe("hasPermission", () => {
  it("denies anonymous callers", () => {
    expect(hasPermission(null, "STUDENT_ACCESS")).toBe(false);
  });

  it("lets a student reach student pages only", () => {
    const student = { role: "student" };
    expect(hasPermission(student, "STUDENT_ACCESS")).toBe(true);
    expect(hasPermission(student, "TEACHER_ACCESS")).toBe(false);
    expect(hasPermission(student, "ADMIN_ACCESS")).toBe(false);
  });

  it("uses the shared hierarchy for database roles", () => {
    const user = { roles: [{ role: { name: "admin" } }] };
    expect(hasPermission(user, "TEACHER_ACCESS")).toBe(true);
    expect(hasPermission(user, "SYSTEM_ACCESS")).toBe(false);
  });

  it("does not let a sales role climb the Primary hierarchy", () => {
    const sales = { role: "SALES_ADMIN" };
    expect(hasPermission(sales, "ADMIN_ACCESS")).toBe(false);
    expect(hasPermission(sales, "TEACHER_ACCESS")).toBe(false);
  });

  it("lets a school admin reach admin pages but never system pages", () => {
    const schoolAdmin = { role: "teacher", SchoolAdmins: [{ id: "x", schoolId: "s" }] };
    expect(hasPermission(schoolAdmin, "ADMIN_ACCESS")).toBe(true);
    expect(hasPermission(schoolAdmin, "SYSTEM_ACCESS")).toBe(false);
  });
});

describe("getEffectiveRole", () => {
  it("returns the highest role by the shared hierarchy", () => {
    expect(
      getEffectiveRole({ role: "student", roles: [{ role: { name: "teacher" } }] }),
    ).toBe("teacher");
    expect(getEffectiveRole(null)).toBe("Guest");
  });
});
