/**
 * Static source invariants for the `broken_ux_fixes_20260911` track.
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
const SOURCE_ROOTS = ["app", "components"];

/** Reads a path relative to the reading-advantage app root. */
function readSource(relativePath: string): string {
  const absolutePath = path.resolve(APP_ROOT, relativePath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Expected source file at ${absolutePath} but it is missing.`);
  }
  return fs.readFileSync(absolutePath, "utf8");
}

/** Returns every .ts/.tsx file under a directory, recursively. */
function collectSourceFiles(relativeDir: string): string[] {
  const absoluteDir = path.resolve(APP_ROOT, relativeDir);
  if (!fs.existsSync(absoluteDir)) return [];

  return fs.readdirSync(absoluteDir, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(absoluteDir, entry.name);
    if (entry.isDirectory()) {
      return collectSourceFiles(path.relative(APP_ROOT, entryPath));
    }
    if (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")) {
      return [entryPath];
    }
    return [];
  });
}

/** Returns source files across app/ and components/ with their contents. */
function collectAppSources(): Array<{ file: string; source: string }> {
  return SOURCE_ROOTS.flatMap((root) =>
    collectSourceFiles(root).map((file) => ({
      file: path.relative(APP_ROOT, file),
      source: fs.readFileSync(file, "utf8"),
    })),
  );
}

/** Returns the first non-comment, non-empty line of a source file. */
function firstMeaningfulLine(source: string): string {
  for (const line of source.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed === "") continue;
    if (trimmed.startsWith("//")) continue;
    if (trimmed.startsWith("/*") || trimmed.startsWith("*")) continue;
    if (trimmed.endsWith("*/")) continue;
    return trimmed;
  }
  return "";
}

describe("broken-ux-fixes — static source invariants", () => {
  const appSources = collectAppSources();

  test("FR-1: student dashboard genre click targets /student/read", () => {
    const source = readSource("components/dashboard/student-dashboard-content.tsx");
    expect(source).not.toContain("/student/articles?genre=");
    expect(source).toContain("/student/read?genre=");
  });

  test("FR-2: no component contains the captoliza class typo", () => {
    const offenders = collectSourceFiles("components")
      .filter((file) => fs.readFileSync(file, "utf8").includes("captoliza"))
      .map((file) => path.relative(APP_ROOT, file));
    expect(offenders).toEqual([]);
  });

  test("FR-3: no source links to the removed /teacher/class-detail route", () => {
    const offenders = appSources
      .filter(({ source }) => source.includes("/teacher/class-detail/"))
      .map(({ file }) => file);
    expect(offenders).toEqual([]);
  });

  test("FR-3: class summary fallback links to the reports route", () => {
    const source = readSource("components/dashboard/class-summary-table.tsx");
    expect(source).toContain("/teacher/reports/");
  });

  test("FR-4: no hardcoded /th/teacher redirects remain", () => {
    const offenders = appSources
      .filter(({ source }) => source.includes("/th/teacher"))
      .map(({ file }) => file);
    expect(offenders).toEqual([]);
  });

  test("FR-4: no router.push prefixes NEXT_PUBLIC_BASE_URL", () => {
    const pattern = /router\.push\(\s*`\$\{process\.env\.NEXT_PUBLIC_BASE_URL/;
    const offenders = appSources
      .filter(({ source }) => pattern.test(source))
      .map(({ file }) => file);
    expect(offenders).toEqual([]);
  });

  test('FR-5: matching.tsx declares "use client" as its first statement', () => {
    const source = readSource("components/matching.tsx");
    expect(firstMeaningfulLine(source)).toMatch(/^"use client";?$/);
  });

  test('FR-5: tab-matching-words.tsx was merged into matching.tsx', () => {
    // component_deduplication_20260911 merged the fork into matching.tsx,
    // which keeps the restored "use client" statement asserted above.
    expect(fs.existsSync(path.resolve(APP_ROOT, "components/vocabulary/tab-matching-words.tsx"))).toBe(false);
  });

  test("FR-6: student-assignment-dashboard.tsx does not import act", () => {
    const source = readSource("components/student-assignment-dashboard.tsx");
    expect(source).not.toMatch(/import\s+React\s*,\s*\{[^}]*\bact\b[^}]*\}\s*from\s*"react"/);
  });

  test("FR-7: flashcard-game.tsx cancels speech before speaking and on unmount", () => {
    const source = readSource("components/flashcards/flashcard-game.tsx");
    const cancelCalls = source.match(/speechSynthesis\.cancel\(\)/g) ?? [];
    expect(cancelCalls.length).toBeGreaterThanOrEqual(2);
  });

  test("FR-8: no source imports log from console", () => {
    const offenders = appSources
      .filter(({ source }) => source.includes('import { log } from "console"'))
      .map(({ file }) => file);
    expect(offenders).toEqual([]);
  });

  test("FR-8: read article page uses the max-w-[400px] class", () => {
    const source = readSource(
      "app/[locale]/(student)/student/read/[articleId]/page.tsx",
    );
    expect(source).not.toContain("max-w-[400px]]");
    expect(source).toContain("max-w-[400px]");
  });

  test("FR-9: chatbot preserves history and drops the bot text prefix", () => {
    const source = readSource("components/chatbot-floating-button.tsx");
    expect(source).not.toContain("setMessages([])");
    expect(source).not.toContain("` : ${");
  });

  test("FR-10: games page redirects unauthenticated users to sign-in", () => {
    const source = readSource("app/[locale]/(student)/student/games/page.tsx");
    expect(source).toContain('redirect("/auth/signin")');
  });
});
