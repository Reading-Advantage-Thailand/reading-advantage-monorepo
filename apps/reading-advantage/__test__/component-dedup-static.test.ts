/**
 * Static source invariants for part A of the
 * `component_deduplication_20260911` track (FR-1, FR-2, FR-9, FR-10 helpers).
 *
 * These checks read the repository source as text. They do not render
 * components or import app modules. The suite is expected to FAIL before the
 * Phase 3 edits and PASS after.
 */

import * as fs from "node:fs";
import * as path from "node:path";

const APP_ROOT = path.resolve(__dirname, "..");
const SOURCE_ROOTS = ["app", "components", "lib", "hooks", "contexts", "store"];

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

/** Returns source files across app source roots with their contents. */
function collectAppSources(): Array<{ file: string; source: string }> {
  return SOURCE_ROOTS.flatMap((root) =>
    collectSourceFiles(root).map((file) => ({
      file: path.relative(APP_ROOT, file),
      source: fs.readFileSync(file, "utf8"),
    })),
  );
}

/** Returns files defining an exported symbol, restricted to a single site. */
function definitionSites(symbol: string): string[] {
  return collectAppSources()
    .filter(({ source }) => new RegExp(`export\\s+(async\\s+)?(function|const)\\s+${symbol}\\b`).test(source))
    .map(({ file }) => file);
}

describe("component-dedup — static source invariants", () => {
  const appSources = collectAppSources();

  test("FR-1: components/stories-chapter-question/ no longer exists", () => {
    expect(fs.existsSync(path.resolve(APP_ROOT, "components/stories-chapter-question"))).toBe(false);
  });

  test("FR-1: story chapter page renders through the shared question cards", () => {
    const source = readSource(
      "app/[locale]/(student)/student/stories/[storyId]/[chapterNumber]/page.tsx",
    );
    expect(source).toContain('@/components/questions/mc-question-card');
    expect(source).toContain('@/components/questions/sa-question-card');
    expect(source).toContain('@/components/questions/laq-question-card');
    expect(source).not.toContain("stories-chapter-question");
  });

  test("FR-1/FR-2: useQuizProgress has a single definition site in lib/", () => {
    const sites = definitionSites("useQuizProgress");
    expect(sites).toEqual(["lib/use-quiz-progress.ts"]);
  });

  test("FR-2: quiz sessionStorage keys are owned by useQuizProgress", () => {
    const offenders = appSources
      .filter(
        ({ file, source }) =>
          file !== "lib/use-quiz-progress.ts" && source.includes("quiz_progress_"),
      )
      .map(({ file }) => file);
    expect(offenders).toEqual([]);
  });

  test("FR-2: mc-question-card has no corruption-repair blocks or timing hacks", () => {
    const source = readSource("components/questions/mc-question-card.tsx");
    expect(source).not.toContain("checkAndClearCorruptedData");
    expect(source).not.toContain("checkAndClear");
    expect(source).not.toContain("suspicious");
    expect(source).not.toContain("setTimeout");
    expect(source).not.toContain("corrupted");
  });

  test("FR-9: getTranslateSentence has a single definition site in lib/", () => {
    const sites = definitionSites("getTranslateSentence");
    expect(sites).toEqual(["lib/translate-sentence.ts"]);
  });

  test("FR-9: no component re-declares a local translate helper", () => {
    const offenders = appSources
      .filter(
        ({ file, source }) =>
          file !== "lib/translate-sentence.ts" &&
          /(async\s+)?function\s+(getTranslateSentence|getTranslate)\b/.test(source),
      )
      .map(({ file }) => file);
    expect(offenders).toEqual([]);
  });

  test("FR-9: cn to zh-CN normalization lives only in lib/translate-sentence.ts", () => {
    const normalizationPatterns = [
      /"cn"\s*\?\s*"zh-CN"/,
      /[=!]==?\s*"cn"/,
      /"cn"\s*[=!]==/,
    ];
    const offenders = appSources
      .filter(
        ({ file, source }) =>
          file !== "lib/translate-sentence.ts" &&
          normalizationPatterns.some((pattern) => pattern.test(source)),
      )
      .map(({ file }) => file);
    expect(offenders).toEqual([]);
  });

  test("FR-10: isAtLeastTeacher has a single definition site in lib/", () => {
    const sites = definitionSites("isAtLeastTeacher");
    expect(sites).toEqual(["lib/roles.ts"]);
  });

  test("FR-10: GCS audio URL builder has a single definition site in lib/", () => {
    const sites = definitionSites("getGcsAudioUrl");
    expect(sites.length).toBe(1);
    expect(sites[0]).toMatch(/^lib\//);
  });

  test("FR-10: no raw GCS audio template remains outside lib/ and server/", () => {
    const audioTemplates = [
      "storage.googleapis.com/artifacts.reading-advantage.appspot.com/tts/${",
      "storage.googleapis.com/artifacts.reading-advantage.appspot.com/${AUDIO_WORDS_URL}/",
      "storage.googleapis.com/artifacts.reading-advantage.appspot.com/${AUDIO_URL}/",
    ];
    // The parallel worker owns the word-list dialogs; the FR-11 worker owns
    // the legacy flashcard file. Their templates are tracked there.
    const ownedElsewhere = [
      "components/word-list.tsx",
      "components/stories-word-list.tsx",
      "components/vocabulary/tab-flash-card.tsx",
    ];
    const offenders = appSources
      .filter(
        ({ file, source }) =>
          !file.startsWith("lib/") &&
          !file.startsWith("server/") &&
          !ownedElsewhere.includes(file) &&
          audioTemplates.some((template) => source.includes(template)),
      )
      .map(({ file }) => file);
    expect(offenders).toEqual([]);
  });
});
