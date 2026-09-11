/**
 * Static source invariants for part B of the
 * `structural_ux_alignment_20260911` track — shell part 2.
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

describe("structural-ux shell part 2 — static source invariants", () => {
  test("theme-wrapper replaces theme-warpper and both imports are updated", () => {
    expect(fileExists("components/theme-warpper.tsx")).toBe(false);
    expect(fileExists("components/theme-wrapper.tsx")).toBe(true);
    expect(readSource("app/[locale]/layout.tsx")).toContain(
      "@/components/theme-wrapper",
    );
    expect(readSource("components/theme-customizer.tsx")).toContain(
      "@/components/theme-wrapper",
    );
  });

  test("the unused userRole context is deleted", () => {
    expect(fileExists("contexts/userRole-context.tsx")).toBe(false);
  });

  test("the (index) layout has one return and no dead ProgressBar import", () => {
    const source = readSource("app/[locale]/(index)/layout.tsx");
    expect(source).not.toContain("progress-bar-xp");
    expect(source.match(/return \(/g) ?? []).toHaveLength(1);
  });

  test("the auth layout uses min-height instead of a fixed height", () => {
    const source = readSource("app/[locale]/(auth)/auth/layout.tsx");
    expect(source).not.toContain(" h-[800px]");
    expect(source).toContain("min-h-[800px]");
  });

  test("auth pages use the locale-aware Link", () => {
    for (const page of [
      "app/[locale]/(auth)/auth/signin/page.tsx",
      "app/[locale]/(auth)/auth/signup/page.tsx",
      "app/[locale]/(auth)/auth/forgot-password/page.tsx",
      "app/[locale]/(auth)/auth/layout.tsx",
    ]) {
      const source = readSource(page);
      expect(source).toContain("i18n/routing");
      expect(source).not.toContain('import Link from "next/link"');
    }
  });

  test("user-signin-form navigates with the i18n router", () => {
    const source = readSource("components/user-signin-form.tsx");
    expect(source).not.toContain("window.location.href");
    expect(source).not.toContain("next/link");
    expect(source).toContain("router.push");
    expect(source).toContain("router.refresh");
  });

  test("user-account-nav memoizes daysLeft and guards the expiry badge", () => {
    const source = readSource("components/user-account-nav.tsx");
    expect(source).toContain("useMemo");
    expect(source).not.toContain("useEffect");
    expect(source).toContain("hasExpiry");
  });
});
