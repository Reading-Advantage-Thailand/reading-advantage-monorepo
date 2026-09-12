/**
 * Verifies that both reset-progress clients use the staff-scoped endpoint.
 *
 * @jest-environment node
 */

import * as fs from "node:fs";
import * as path from "node:path";

const APP_ROOT = path.resolve(__dirname, "../..");

function readSource(relativePath: string): string {
  return fs.readFileSync(path.resolve(APP_ROOT, relativePath), "utf8");
}

describe("reset-progress client contracts", () => {
  it("settings reset posts to reset-all-progress", () => {
    const source = readSource("components/reset-xp-dialog.tsx");

    expect(source).toContain("/api/v1/users/${userId}/reset-all-progress");
    expect(source).toMatch(/method:\s*["']POST["']/);
    expect(source).not.toMatch(/method:\s*["']PATCH["']/);
    expect(source).not.toContain("resetXP: true");
  });

  it("teacher reset posts to reset-all-progress", () => {
    const source = readSource("components/teacher/my-students.tsx");

    expect(source).toContain(
      "/api/v1/users/${selectedStudentId}/reset-all-progress",
    );
    expect(source).toMatch(/method:\s*["']POST["']/);
    expect(source).not.toMatch(/method:\s*["']PATCH["']/);
  });

  it("removes the dead first-run level-test client", () => {
    expect(
      fs.existsSync(path.resolve(APP_ROOT, "components/first-run-level-test.tsx")),
    ).toBe(false);
  });
});
