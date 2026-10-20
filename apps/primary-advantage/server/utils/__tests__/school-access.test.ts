// @vitest-environment node
import { describe, expect, it } from "vitest";
import { canManageSchool } from "../school-access";

const school = { id: "s1", ownerId: "owner" };

describe("canManageSchool", () => {
  it("allows the owner", () => {
    expect(canManageSchool({ id: "owner", role: "TEACHER", schoolId: "s1" }, school)).toBe(true);
  });
  it("allows an ADMIN of the school when the school has no owner", () => {
    expect(canManageSchool({ id: "a", role: "ADMIN", schoolId: "s1" }, { id: "s1", ownerId: null })).toBe(true);
  });
  it("refuses an ADMIN of another school", () => {
    expect(canManageSchool({ id: "a", role: "ADMIN", schoolId: "s2" }, school)).toBe(false);
  });
  it("refuses a TEACHER and a STUDENT who do not own the school", () => {
    expect(canManageSchool({ id: "t", role: "TEACHER", schoolId: "s1" }, school)).toBe(false);
    expect(canManageSchool({ id: "x", role: "STUDENT", schoolId: "s1" }, school)).toBe(false);
  });
  it("allows a TEACHER with a school_admins row for the school (Low)", () => {
    expect(canManageSchool({ id: "t", role: "TEACHER", schoolId: "s1", hasSchoolAdminRow: true }, school)).toBe(true);
  });
  it("refuses a TEACHER with a school_admins row of another school (Low)", () => {
    expect(canManageSchool({ id: "t", role: "TEACHER", schoolId: "s2", hasSchoolAdminRow: true }, school)).toBe(false);
  });
  it("allows SYSTEM", () => {
    expect(canManageSchool({ id: "sys", role: "SYSTEM", schoolId: null }, school)).toBe(true);
  });
  it("does not match a null owner with a null user id", () => {
    expect(canManageSchool({ id: "", role: "TEACHER", schoolId: "s1" }, { id: "s1", ownerId: null })).toBe(false);
  });
});
