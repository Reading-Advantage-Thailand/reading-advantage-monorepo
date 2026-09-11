/**
 * Static source invariants for part B of the
 * `structural_ux_alignment_20260911` track — shell and navigation part 1.
 *
 * These checks read repository source as text. They do not render components
 * or import app modules.
 */

import * as fs from "node:fs";
import * as path from "node:path";

const APP_ROOT = path.resolve(__dirname, "..");

/** Reads a path relative to the reading-advantage app root. */
function readSource(relativePath: string): string {
  const absolutePath = path.resolve(APP_ROOT, relativePath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Expected source file at ${absolutePath} but it is missing.`);
  }
  return fs.readFileSync(absolutePath, "utf8");
}

describe("structural-ux shell part 1 — static source invariants", () => {
  test("one sharedMainNav is exported and spread by the other four configs", () => {
    const index = readSource("configs/index-page-config.ts");
    expect(index).toContain("export const sharedMainNav");

    for (const config of [
      "student-page-config.ts",
      "teacher-page-config.ts",
      "admin-page-config.ts",
      "system-page-config.ts",
    ]) {
      const source = readSource(`configs/${config}`);
      expect(source).toContain("sharedMainNav");
      expect(source).toMatch(/mainNav:\s*\[\.\.\.sharedMainNav\]/);
      expect(source).not.toContain('title: "home"');
    }
  });

  test("SessionSyncRedirect exposes a destination prop with a student default", () => {
    const source = readSource("components/session-sync-redirect.tsx");
    expect(source).toContain("destination");
    expect(source).toContain('destination = "/student/read"');
    expect(source).not.toContain('window.location.href = "/student/read"');
  });

  test("teacher role selection redirects to /teacher/my-classes", () => {
    const source = readSource("app/[locale]/role-selection/page.tsx");
    expect(source).toContain('destination="/teacher/my-classes"');
  });

  test("the shared auth guard is used by AppLayout and all four layouts", () => {
    expect(readSource("lib/auth-guard.ts")).toContain("export async function requireUser");
    expect(readSource("components/shared/app-layout.tsx")).toContain("requireUser");

    for (const layout of [
      "app/[locale]/(admin)/admin/layout.tsx",
      "app/[locale]/(teacher)/teacher/layout.tsx",
      "app/[locale]/(student)/student/layout.tsx",
      "app/[locale]/(system)/system/layout.tsx",
    ]) {
      const source = readSource(layout);
      expect(source).toContain("@/lib/auth-guard");
      expect(source).not.toContain("getCurrentUser");
    }
  });

  test("the teacher layout disables the leaderboard", () => {
    const source = readSource("app/[locale]/(teacher)/teacher/layout.tsx");
    expect(source).toContain("disableLeaderboard={true}");
  });

  test("AppLayout skips the leaderboard fetch when disabled", () => {
    const source = readSource("components/shared/app-layout.tsx");
    expect(source).toMatch(
      /const leaderboard\s*=\s*disableLeaderboard\s*\?\s*\[\]\s*:\s*await\s+feactlearderboard\(\)/,
    );
  });
});
