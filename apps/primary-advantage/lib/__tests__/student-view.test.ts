// @vitest-environment node
import { describe, expect, it } from "vitest";
import { StudentViewModeSchema, roleHomeFor, studentViewModeFor } from "../student-view";

describe("studentViewModeFor", () => {
  it("gives a student the student mode", () => {
    expect(studentViewModeFor("STUDENT")).toBe("student");
  });

  it.each(["TEACHER", "ADMIN", "SYSTEM"])("gives %s the preview mode", (role) => {
    expect(studentViewModeFor(role)).toBe("preview");
  });

  it("reads the session role in any letter case", () => {
    expect(studentViewModeFor("teacher")).toBe("preview");
    expect(studentViewModeFor("student")).toBe("student");
  });

  it("gives no mode to INTERN, an unknown role, or no role", () => {
    expect(studentViewModeFor("INTERN")).toBeNull();
    expect(studentViewModeFor("SALES_REP")).toBeNull();
    expect(studentViewModeFor("nobody")).toBeNull();
    expect(studentViewModeFor(null)).toBeNull();
    expect(studentViewModeFor(undefined)).toBeNull();
  });

  it("validates the mode with the schema", () => {
    expect(StudentViewModeSchema.parse("preview")).toBe("preview");
    expect(StudentViewModeSchema.safeParse("admin").success).toBe(false);
  });
});

describe("roleHomeFor", () => {
  it("sends each staff role to the role home, never to /unauthorized", () => {
    expect(roleHomeFor("TEACHER")).toBe("/teacher/dashboard");
    expect(roleHomeFor("ADMIN")).toBe("/admin/dashboard");
    expect(roleHomeFor("SYSTEM")).toBe("/system/dashboard");
  });

  it("sends a student to the student home and an unknown role to the student home", () => {
    expect(roleHomeFor("STUDENT")).toBe("/student/home");
    expect(roleHomeFor("nobody")).toBe("/student/home");
  });
});
