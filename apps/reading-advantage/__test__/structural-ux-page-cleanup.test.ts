/**
 * Static source invariants for part B of the
 * `structural_ux_alignment_20260911` track — page cleanup (FR-8).
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

/** Returns true when a path exists relative to the app root. */
function fileExists(relativePath: string): boolean {
  return fs.existsSync(path.resolve(APP_ROOT, relativePath));
}

describe("structural-ux page cleanup — static source invariants", () => {
  test("the three reload sites use router.refresh instead", () => {
    for (const file of [
      "components/dashboard/class-detail-dashboard.tsx",
      "hooks/teacher/useClassroomActions.ts",
      "components/flashcards/deck-view.tsx",
    ]) {
      const source = readSource(file);
      expect(source).not.toContain("window.location.reload");
      expect(source).toContain("router.refresh");
    }
  });

  test("the workbook generator is reachable from the teacher sidebar", () => {
    const source = readSource("configs/teacher-page-config.ts");
    expect(source).toContain('href: "/teacher/workbook-generator"');
    expect(source).toContain('title: "workbookGenerator"');
  });

  test("sequential page fetches run through Promise.all", () => {
    expect(readSource("app/[locale]/(admin)/admin/reports/page.tsx")).toContain(
      "Promise.all",
    );
    expect(
      readSource("app/[locale]/(system)/system/schooldashboard/page.tsx"),
    ).toContain("Promise.all");
    expect(
      readSource(
        "app/[locale]/(teacher)/teacher/class-roster/[classroomId]/create-new-student/page.tsx",
      ),
    ).toContain("Promise.all");
  });

  test("the license page checks auth before the data fetch", () => {
    const source = readSource("app/[locale]/(system)/system/license/page.tsx");
    const authIndex = source.indexOf("if (!user)");
    const fetchIndex = source.indexOf("await getAllLicenses()");
    expect(authIndex).toBeGreaterThan(-1);
    expect(fetchIndex).toBeGreaterThan(-1);
    expect(authIndex).toBeLessThan(fetchIndex);
  });

  test("license deletion uses the existing confirm dialog and guards null dates", () => {
    const columns = readSource(
      "app/[locale]/(system)/system/license/columns.tsx",
    );
    expect(columns).toContain("ConfirmDialog");
    expect(columns).toContain('return "—"');
    expect(columns).toContain("router.refresh");
  });

  test("admin pages no longer duplicate the layout role guard", () => {
    for (const page of [
      "app/[locale]/(admin)/admin/article-creation/page.tsx",
      "app/[locale]/(admin)/admin/dashboard/page.tsx",
      "app/[locale]/(admin)/admin/management/page.tsx",
      "app/[locale]/(admin)/admin/reports/page.tsx",
      "app/[locale]/(admin)/admin/reports/[classroomId]/page.tsx",
      "app/[locale]/(admin)/admin/teacher-assignments/page.tsx",
    ]) {
      const source = readSource(page);
      expect(source).not.toContain("UnauthorizedPage");
    }
  });

  test("every route group has an error boundary", () => {
    for (const group of [
      "(admin)",
      "(auth)",
      "(host-proof)",
      "(index)",
      "(student)",
      "(system)",
      "(teacher)",
    ]) {
      expect(fileExists(`app/[locale]/${group}/error.tsx`)).toBe(true);
    }
  });
});
