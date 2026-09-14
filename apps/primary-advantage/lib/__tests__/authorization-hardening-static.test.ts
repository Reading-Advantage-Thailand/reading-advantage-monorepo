// @vitest-environment node
import { describe, expect, it } from "vitest";
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const appDir = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
);

/**
 * Reads a source file relative to the app root.
 * @param relativePath The path under apps/primary-advantage.
 * @returns The file text.
 */
function readSource(relativePath: string): string {
  return readFileSync(join(appDir, relativePath), "utf8");
}

describe("authorization hardening static invariants", () => {
  it("gates PATCH /api/users/[id] behind ADMIN or SYSTEM", () => {
    const source = readSource("app/api/users/[id]/route.ts");
    expect(source).toMatch(/currentUser|getCurrentUser/);
    expect(source).toMatch(/isAdminOrSystem|USER_MANAGEMENT_ROLES/);
    expect(source).toMatch(/schoolId/);
    const contracts = readSource("lib/authorization.ts");
    expect(contracts).toMatch(/"ADMIN"/);
    expect(contracts).toMatch(/"SYSTEM"/);
  });

  it("authenticates the article generation route", () => {
    const source = readSource("app/api/articles/generate/route.ts");
    expect(source).toMatch(/currentUser|getCurrentUser/);
  });

  it("authenticates the CSV cleanup route and guards fileName", () => {
    const source = readSource("app/api/upload/csv/cleanup/route.ts");
    expect(source).toMatch(/currentUser|getCurrentUser/);
    expect(source).toMatch(/isPlainBasename|cleanupFileNameSchema|basename/);
  });

  it("derives XP on the server without a client xpEarned input", () => {
    const source = readSource("actions/user.ts");
    expect(source).toMatch(/resolveXpAward|XP_AWARD_BY_ACTIVITY/);
    const signature = source.slice(
      source.indexOf("export async function updateUserActivity"),
      source.indexOf("export async function updateUserActivity") + 400,
    );
    expect(signature).not.toMatch(/xpEarned/);
  });

  it("derives proxy routes from the role enum module", () => {
    const source = readSource("proxy.ts");
    expect(source).toMatch(/route-policies/);
    expect(source).not.toMatch(
      /"\/student": \["student", "teacher", "admin", "system"\]/,
    );
  });

  it("provides the unauthorized page", () => {
    const pagePath = join(
      appDir,
      "app",
      "[locale]",
      "unauthorized",
      "page.tsx",
    );
    expect(existsSync(pagePath)).toBe(true);
    expect(readFileSync(pagePath, "utf8")).toMatch(/nauthorized/);
  });

  it("shows a 404 page without a sign-in redirect", () => {
    const source = readSource("app/[locale]/[...not-found]/layout.tsx");
    expect(source).not.toMatch(/redirect\("\/auth\/signin"\)/);
  });

  it("asserts a role in each of the five layouts", () => {
    const layouts = [
      "app/[locale]/admin/layout.tsx",
      "app/[locale]/teacher/layout.tsx",
      "app/[locale]/(student)/student/layout.tsx",
      "app/[locale]/system/layout.tsx",
      "app/[locale]/(student)/settings/layout.tsx",
    ];
    for (const layout of layouts) {
      const source = readSource(layout);
      expect(
        source.includes("unauthorized") ||
          source.includes("requireRole") ||
          source.includes("assertLayoutRole"),
        `${layout} must assert a role`,
      ).toBe(true);
    }
  });

  it("checks ownership on the student-progress page", () => {
    const source = readSource(
      "app/[locale]/teacher/student-progress/[id]/page.tsx",
    );
    expect(source).toMatch(/schoolId|canReadUserResource/);
  });
});
