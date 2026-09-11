/**
 * Static source invariants for the `loading_state_correctness_20260911` track.
 *
 * These checks read the repository source as text. They do not render
 * components or import app modules. Public routes and Next.js aliases would
 * make a live test brittle. A static check proves the fix landed in source.
 *
 * The suite is expected to FAIL before the Phase 3 edits and PASS after.
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

describe("loading-state-fixes — static source invariants", () => {
  test("FR-5: StudentCartridgeHost takes mode from props, not window.location.search", () => {
    const source = readSource("components/apk/StudentCartridgeHost.tsx");
    expect(source).not.toContain("window.location.search");
  });

  test("FR-8: matching.tsx indexes translations by the current locale with a Thai fallback", () => {
    const source = readSource("components/matching.tsx");
    expect(source).not.toContain("translation?.th");
    expect(source).not.toContain("translation.th;");
    expect(source).toContain("translation?.[currentLocale]");
  });

  test("FR-5: student-assignment-dashboard navigates client-side with router.push", () => {
    const source = readSource("components/student-assignment-dashboard.tsx");
    expect(source).not.toContain("window.location.href");
    expect(source).toContain("router.push(`/student/lesson/");
    expect(source).toContain('redirect("/auth/signin")');
  });

  test("FR-6: system-dashboard-client uses static Tailwind lookup maps", () => {
    const source = readSource("components/dashboard/system-dashboard-client.tsx");
    expect(source).not.toContain("bg-${");
    expect(source).not.toContain("hover:bg-${");
    expect(source).toContain("HEALTH_BADGE_CLASSES");
  });

  test("FR-6: change-role uses a static color lookup map", () => {
    const source = readSource("components/shared/change-role.tsx");
    expect(source).not.toContain("${color}");
    expect(source).toContain("ROLE_COLOR_CLASSES");
  });

  test("FR-6: health badges default to unknown when data is missing", () => {
    const source = readSource("components/dashboard/system-dashboard-client.tsx");
    expect(source).not.toContain('|| "excellent"');
    expect(source).not.toContain('|| "good"');
    expect(source).not.toContain('|| "low"');
    expect(source).toContain("unknown");
  });

  test("FR-6: the reading-session KPI is not labeled as Total XP", () => {
    const en = readSource("locales/en.ts");
    const block = en.match(/totalXp: \{[\s\S]*?\n            \},/);
    expect(block).not.toBeNull();
    expect(block![0]).not.toContain("Total XP");
    expect(block![0]).not.toContain("XP");
  });
});
