import { describe, expect, it } from "vitest";
import { WORKBOOK_PERMISSIONS, WORKBOOK_ROLE_PERMISSIONS, resolveWorkbookRole } from "./workbook-permissions";

describe("workbook permissions", () => {
  it("resolves WORKBOOK_ADMIN from an exact role claim", () => {
    expect(resolveWorkbookRole(["WORKBOOK_ADMIN"])).toBe("WORKBOOK_ADMIN");
    expect(resolveWorkbookRole(["EMPLOYEE", "WORKBOOK_ADMIN"])).toBe("WORKBOOK_ADMIN");
  });

  it("denies every non-workbook role", () => {
    expect(resolveWorkbookRole(["ADMIN"])).toBeNull();
    expect(resolveWorkbookRole(["SALES_ADMIN"])).toBeNull();
    expect(resolveWorkbookRole(["TEACHER"])).toBeNull();
    expect(resolveWorkbookRole(["EMPLOYEE"])).toBeNull();
    expect(resolveWorkbookRole([])).toBeNull();
  });

  it("does not match by prefix, suffix, or case", () => {
    expect(resolveWorkbookRole(["workbook_admin"])).toBeNull();
    expect(resolveWorkbookRole(["WORKBOOK_ADMINISTRATOR"])).toBeNull();
    expect(resolveWorkbookRole(["SUPER_WORKBOOK_ADMIN"])).toBeNull();
  });

  it("grants every declared permission to WORKBOOK_ADMIN", () => {
    expect(WORKBOOK_ROLE_PERMISSIONS.WORKBOOK_ADMIN).toEqual(WORKBOOK_PERMISSIONS);
    expect(WORKBOOK_PERMISSIONS).toHaveLength(7);
  });
});
