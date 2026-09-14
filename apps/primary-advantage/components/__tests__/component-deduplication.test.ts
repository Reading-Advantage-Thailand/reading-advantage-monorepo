// @vitest-environment node
/**
 * Component deduplication import-resolution pins. The dead forks stay
 * deleted: nothing in the app may import these modules, so each deleted
 * module gets one test asserting its path no longer resolves. A repo-wide
 * reference scan backs this file; the last scan found zero module imports
 * of any deleted path (remaining hits are route hrefs, similarly named
 * live modules, comments, and docs).
 */
import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const unresolvable = (rel: string) => require.resolve(rel);

describe("component deduplication FR-1 dead files", () => {
  it.each([
    "../ui/sidebar.tsx",
    "../teacher/assignment-button.tsx",
    "../teacher/enrollment-demo.tsx",
    "../teacher/class-roster.tsx",
    "../teacher/reports.tsx",
    "../../hooks/use-permissions.ts",
    "../../hooks/use-mobile.ts",
    "../../lib/calculateLevel.ts",
    "../../types/types.d.ts",
  ])("deletes %s", (file) => {
    expect(() => unresolvable(file)).toThrow();
  });
});

describe("component deduplication merged forks", () => {
  it.each([
    "../practice/cloze-test-game.tsx",
    "../practice/order-words-game.tsx",
    "../practice/order-sentences-game.tsx",
    "../lesson/games/lesson-sentence-flashcard.tsx",
    "../lesson/games/lesson-vocabulary-flashcard-card.tsx",
    "../lesson/games/lesson-sentence-matching.tsx",
    "../lesson/games/lesson-vocabulary-matching.tsx",
    "../lesson/task/task-first-reading.tsx",
    "../lesson/task/task-deep-reading.tsx",
    "../lesson/standalone-lesson-progress-bar.tsx",
    "../lesson/standalone-lesson-card.tsx",
    "../dashboard/article-records-table.tsx",
    "../dashboard/reminder-reread-table.tsx",
    "../lesson/task/task-preview-vocabulary.tsx",
    "../lesson/task/task-sentence-collection.tsx",
    "../lesson/practice/lesson-task-mcq.tsx",
    "../school/edit-school-form.tsx",
    "../school/school-profile-form.tsx",
    "../articles/questions/la-question-content.tsx",
    "../articles/questions/sa-question-content.tsx",
  ])("merges away %s", (file) => {
    expect(() => unresolvable(file)).toThrow();
  });
});
