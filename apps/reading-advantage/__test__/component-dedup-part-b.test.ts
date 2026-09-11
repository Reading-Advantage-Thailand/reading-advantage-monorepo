/**
 * Static source invariants for part B of the
 * `component_deduplication_20260911` track (FR-3, FR-4, FR-5, FR-6, FR-7,
 * FR-8, FR-10 table/button half, FR-11).
 *
 * These checks read the repository source as text. They do not render
 * components or import app modules. The suite is expected to FAIL before the
 * Phase 3 edits and PASS after.
 */

import * as fs from "node:fs";
import * as path from "node:path";

const APP_ROOT = path.resolve(__dirname, "..");
const SOURCE_ROOTS = ["app", "components", "lib", "hooks", "store"];

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

/** Returns source files across app source roots with their contents. */
function collectAppSources(): Array<{ file: string; source: string }> {
  return SOURCE_ROOTS.flatMap((root) =>
    collectSourceFiles(root).map((file) => ({
      file: path.relative(APP_ROOT, file),
      source: fs.readFileSync(file, "utf8"),
    })),
  );
}

/** Returns files with exactly one default-exported component of the given name. */
function defaultExportSites(componentName: string): string[] {
  return collectAppSources()
    .filter(({ source }) =>
      new RegExp(`export\\s+default\\s+function\\s+${componentName}\\b`).test(source),
    )
    .map(({ file }) => file);
}

describe("component-dedup part B — static source invariants", () => {
  const appSources = collectAppSources();

  // FR-3: one matching component driven by a fetchWords prop.
  test("FR-3: tab-matching-words.tsx no longer exists", () => {
    expect(fileExists("components/vocabulary/tab-matching-words.tsx")).toBe(false);
  });

  test("FR-3: matching.tsx accepts a fetchWords prop and keeps its load states", () => {
    const source = readSource("components/matching.tsx");
    expect(source).toContain("fetchWords");
    expect(source).toContain("loadState");
  });

  test("FR-3: the vocabulary tab renders the shared matching component", () => {
    const source = readSource("components/vocabulary/tabs-vocabulary.tsx");
    expect(source).not.toContain("tab-matching-words");
    expect(source).toContain('from "@/components/matching"');
  });

  // FR-4: one enroll component with a mode prop.
  test("FR-4: unenroll-classes.tsx no longer exists", () => {
    expect(fileExists("components/teacher/unenroll-classes.tsx")).toBe(false);
  });

  test("FR-4: enroll-classes.tsx defines the merged component with a mode prop", () => {
    const source = readSource("components/teacher/enroll-classes.tsx");
    expect(source).toMatch(/mode:\s*"enroll"\s*\|\s*"unenroll"/);
  });

  test("FR-4: the merged component calls the mode endpoint", () => {
    const source = readSource("components/teacher/enroll-classes.tsx");
    expect(source).toContain("/enroll`");
    expect(source).toContain("/unenroll`");
  });

  test("FR-4: row name cells call row.toggleSelected instead of passing it", () => {
    const source = readSource("components/teacher/enroll-classes.tsx");
    expect(source).not.toMatch(/onClick=\{\(\) => row\.toggleSelected\}/);
    expect(source).toContain("row.toggleSelected()");
  });

  test("FR-4: both enroll pages render the merged component", () => {
    const enrollPage = readSource(
      "app/[locale]/(teacher)/teacher/enroll-classes/[studentId]/page.tsx",
    );
    const unenrollPage = readSource(
      "app/[locale]/(teacher)/teacher/unenroll-classes/[studentId]/page.tsx",
    );
    expect(enrollPage).toContain('from "@/components/teacher/enroll-classes"');
    expect(unenrollPage).toContain('from "@/components/teacher/enroll-classes"');
    expect(unenrollPage).toContain('"unenroll"');
  });

  // FR-5: one history table with a variant.
  test("FR-5: reminder-reread-table.tsx no longer exists", () => {
    expect(fileExists("components/reminder-reread-table.tsx")).toBe(false);
  });

  test("FR-5: article-records-table accepts a variant and preserves targetId", () => {
    const source = readSource("components/article-records-table.tsx");
    expect(source).toContain("variant");
    expect(source).toContain("targetId");
  });

  test("FR-5: both history pages use only the shared table", () => {
    const studentHistory = readSource(
      "app/[locale]/(student)/student/history/page.tsx",
    );
    expect(studentHistory).not.toContain("reminder-reread-table");
    const teacherHistory = readSource(
      "app/[locale]/(teacher)/teacher/class-roster/[classroomId]/history/[studentId]/page.tsx",
    );
    expect(teacherHistory).not.toContain("reminder-reread-table");
  });

  // FR-6: one classroom student table.
  test("FR-6: a single ClassroomStudentTable definition exists", () => {
    const sites = defaultExportSites("ClassroomStudentTable");
    expect(sites.length).toBe(1);
  });

  test("FR-6: admin report and teacher roster both use it", () => {
    const report = readSource("components/admin/classroom-report.tsx");
    const roster = readSource("components/teacher/class-roster.tsx");
    expect(report).toContain("ClassroomStudentTable");
    expect(roster).toContain("ClassroomStudentTable");
  });

  // FR-7: one word-list dialog with a data-source prop.
  test("FR-7: stories-word-list.tsx no longer exists", () => {
    expect(fileExists("components/stories-word-list.tsx")).toBe(false);
  });

  test("FR-7: word-list.tsx takes a data-source prop and uses the GCS helper", () => {
    const source = readSource("components/word-list.tsx");
    expect(source).toContain("dataSource");
    expect(source).toContain("getGcsWordAudioUrl");
  });

  test("FR-7: word-list.tsx no longer uses lodash", () => {
    const source = readSource("components/word-list.tsx");
    expect(source).not.toContain('from "lodash"');
  });

  test("FR-7: one shared audio element per dialog", () => {
    const source = readSource("components/word-list.tsx");
    expect((source.match(/<audio/g) ?? []).length).toBeLessThanOrEqual(1);
  });

  test("FR-7: the stories chapter page renders the shared word list", () => {
    const source = readSource(
      "app/[locale]/(student)/student/stories/[storyId]/[chapterNumber]/page.tsx",
    );
    expect(source).toContain('from "@/components/word-list"');
    expect(source).not.toContain("stories-word-list");
  });

  // FR-8: one rating popup on the shared Dialog.
  test("FR-8: chapter-rating-popup.tsx no longer exists", () => {
    expect(fileExists("components/chapter-rating-popup.tsx")).toBe(false);
  });

  test("FR-8: rating-popup.tsx accepts the union target prop and uses Dialog", () => {
    const source = readSource("components/rating-popup.tsx");
    expect(source).toContain("storyId");
    expect(source).toContain("chapterId");
    expect(source).toContain("DialogContent");
  });

  test("FR-8: rating-popup updates state locally instead of refetching the article", () => {
    const source = readSource("components/rating-popup.tsx");
    expect(source).not.toMatch(/fetch\(`\/api\/v1\/articles\/\$\{/);
    expect(source).toContain("setLocalAverageRating");
  });

  test("FR-8: the stories chapter card uses the shared rating popup", () => {
    const source = readSource("components/stories-chapter-card.tsx");
    expect(source).toContain('from "./rating-popup"');
    expect(source).not.toContain("chapter-rating-popup");
  });

  // FR-10: shared teacher table shell and CopyKeyButton.
  test("FR-10: a shared teacher table shell exists and is reused", () => {
    const sites = defaultExportSites("TeacherDataTable");
    expect(sites).toEqual(["components/teacher/teacher-data-table.tsx"]);
    const shellUser = readSource("components/classroom-student-table.tsx");
    expect(shellUser).toContain("TeacherDataTable");
    const roster = readSource("components/teacher/class-roster.tsx");
    expect(roster).toContain("ClassroomStudentTable");
  });

  test("FR-10: a single CopyKeyButton definition exists and is reused", () => {
    const sites = defaultExportSites("CopyKeyButton");
    expect(sites.length).toBe(1);
    const systemReports = readSource("components/system/reports.tsx");
    expect(systemReports).toContain("CopyKeyButton");
  });

  // FR-11: dead code removal.
  test("FR-11: dead components are deleted", () => {
    expect(fileExists("components/teacher/reports.tsx")).toBe(false);
    expect(fileExists("components/admin/dashboard-content.tsx")).toBe(false);
    expect(fileExists("components/vocabulary/tab-flash-card.tsx")).toBe(false);
    expect(
      fileExists("components/vocabulary/flash-card-vocabulary-practice-button.tsx"),
    ).toBe(false);
  });

  test("FR-11: the Word type no longer lives in the deleted flashcard file", () => {
    const sites = appSources
      .filter(({ source }) => /export\s+(type|interface)\s+Word\b/.test(source))
      .map(({ file }) => file);
    expect(sites).not.toContain("components/vocabulary/tab-flash-card.tsx");
  });

  test("FR-11: stories-select.tsx has no stray SelectStory statement", () => {
    const source = readSource("components/stories-select.tsx");
    expect(source).not.toMatch(/^\s*SelectStory;\s*$/m);
  });

  test("FR-11: read and stories pages drop dead params/searchParams handling", () => {
    const readPage = readSource("app/[locale]/(student)/student/read/page.tsx");
    expect(readPage).not.toContain("resolvedSearchParams");
    const storiesPage = readSource("app/[locale]/(student)/student/stories/page.tsx");
    expect(storiesPage).not.toContain("resolvedSearchParams");
  });

  test("FR-11: the debugAll flag is removed", () => {
    const offenders = appSources
      .filter(({ source }) => source.includes("debugAll"))
      .map(({ file }) => file);
    expect(offenders).toEqual([]);
  });

  // NOTE: components/system-articles.tsx is intentionally NOT asserted absent.
  // It is imported by the system handle-passages page and the teacher passages
  // page, so it is not dead code. See the track deviation notes.
});
