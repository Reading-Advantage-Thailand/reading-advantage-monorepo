// @vitest-environment node
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = (...parts: string[]) =>
  resolve(import.meta.dirname, "..", "..", ...parts);

const read = (rel: string) => readFileSync(root(rel), "utf-8");
const missing = (rel: string) => !existsSync(root(rel));

describe("component deduplication FR-1 dead files", () => {
  it.each([
    "components/ui/sidebar.tsx",
    "components/teacher/assignment-button.tsx",
    "components/teacher/enrollment-demo.tsx",
    "components/teacher/class-roster.tsx",
    "components/teacher/reports.tsx",
    "hooks/use-permissions.ts",
    "hooks/use-mobile.ts",
    "lib/calculateLevel.ts",
    "types/types.d.ts",
  ])("deletes %s", (file) => {
    expect(missing(file)).toBe(true);
  });
});

describe("component deduplication merged forks", () => {
  it.each([
    "components/practice/cloze-test-game.tsx",
    "components/practice/order-words-game.tsx",
    "components/practice/order-sentences-game.tsx",
    "components/lesson/games/lesson-sentence-flashcard.tsx",
    "components/lesson/games/lesson-vocabulary-flashcard-card.tsx",
    "components/lesson/games/lesson-sentence-matching.tsx",
    "components/lesson/games/lesson-vocabulary-matching.tsx",
    "components/lesson/task/task-first-reading.tsx",
    "components/lesson/task/task-deep-reading.tsx",
    "components/lesson/standalone-lesson-progress-bar.tsx",
    "components/lesson/standalone-lesson-card.tsx",
    "components/dashboard/article-records-table.tsx",
    "components/dashboard/reminder-reread-table.tsx",
    "components/lesson/task/task-preview-vocabulary.tsx",
    "components/lesson/task/task-sentence-collection.tsx",
    "components/lesson/practice/lesson-task-mcq.tsx",
    "components/school/edit-school-form.tsx",
    "components/school/school-profile-form.tsx",
    "components/articles/questions/la-question-content.tsx",
    "components/articles/questions/sa-question-content.tsx",
  ])("merges away %s", (file) => {
    expect(missing(file)).toBe(true);
  });

  it("keeps one cloze game behind a source prop", () => {
    const source = read("components/lesson/games/lesson-sentence-cloze-test.tsx");
    expect(source).toContain("SentenceClozeGameSource");
    expect(source).toContain('"lesson" | "deck"');
  });

  it("keeps one flashcard game behind a cardKind prop", () => {
    const source = read("components/lesson/games/lesson-flashcard-game.tsx");
    expect(source).toContain("cardKind");
    expect(source).toContain("FlashcardType");
  });

  it("keeps one matching game behind a cardKind prop", () => {
    const source = read("components/lesson/games/lesson-matching-game.tsx");
    expect(source).toContain("cardKind");
    expect(source).toContain("FlashcardType");
  });

  it("keeps one reading task behind an enableTranslation prop", () => {
    const source = read("components/lesson/task/task-reading.tsx");
    expect(source).toContain("enableTranslation");
  });

  it("keeps one progress bar behind a source prop", () => {
    const source = read("components/lesson/lesson-progress-bar.tsx");
    expect(source).toContain("LessonProgressSource");
  });

  it("keeps one history table behind a variant prop", () => {
    const source = read("components/dashboard/history-table.tsx");
    expect(source).toContain("HistoryTableVariant");
  });

  it("keeps one school form behind a mode prop", () => {
    const source = read("components/school/school-form.tsx");
    expect(source).toContain("SchoolFormMode");
  });

  it("keeps one collection task behind a kind prop", () => {
    const source = read("components/lesson/task/task-collection.tsx");
    expect(source).toContain("CollectionTaskKind");
  });
});

describe("component deduplication shared helpers", () => {
  it("shares shuffle, formatTime, CEFR colours, and the staff role check", () => {
    expect(read("lib/shuffle.ts")).toContain("export function shuffle");
    expect(read("lib/format-time.ts")).toContain("export function formatTime");
    expect(read("lib/cefr.ts")).toContain("export function getCefrLevelColor");
    expect(read("lib/permissions.ts")).toContain("STAFF_ROLES");
    expect(read("lib/permissions.ts")).toContain("export function isStaffRole");
    expect(read("hooks/use-debounce.ts")).toContain(
      "export function useDebounce",
    );
  });

  it("imports the shared helpers instead of redeclaring them", () => {
    expect(
      read("components/lesson/games/lesson-sentence-cloze-test.tsx"),
    ).toContain('from "@/lib/format-time"');
    expect(
      read("components/teacher/enrollment-management.tsx"),
    ).toContain('from "@/lib/cefr"');
  });

  it("spreads one sharedMainNav in every page config", () => {
    expect(read("configs/main-nav.ts")).toContain("sharedMainNav");
    for (const file of [
      "configs/admin-page-config.ts",
      "configs/index-page-config.ts",
      "configs/student-page-config.ts",
      "configs/system-page-config.ts",
      "configs/teacher-page-config.ts",
    ]) {
      expect(read(file)).toContain("...sharedMainNav");
    }
  });
});

describe("component deduplication data table shell", () => {
  it("serves the live tables through one DataTable shell", () => {
    expect(read("components/ui/data-table.tsx")).toContain(
      "export function DataTable",
    );
    for (const file of [
      "components/dashboard/history-table.tsx",
      "components/teacher/assignments.tsx",
      "components/student-assignment-table.tsx",
      "components/teacher/my-students.tsx",
      "components/teacher/my-classes.tsx",
      "components/system/license-table.tsx",
      "components/manage-tab.tsx",
    ]) {
      expect(read(file)).toContain("<DataTable");
    }
  });
});

describe("component deduplication renames", () => {
  it("uses practice, generators, and signinAction paths", () => {
    expect(existsSync(root("components/practice"))).toBe(true);
    expect(missing("components/pratice")).toBe(true);
    expect(existsSync(root("server/utils/generators"))).toBe(true);
    expect(missing("server/utils/genaretors")).toBe(true);
    expect(existsSync(root("actions/signinAction.ts"))).toBe(true);
    expect(missing("actions/singinAction.ts")).toBe(true);
  });
});
