// @vitest-environment node
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = (...parts: string[]) =>
  resolve(import.meta.dirname, "..", "..", ...parts);
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
});
