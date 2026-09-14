// @vitest-environment node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const componentPaths = [
  "articles/questions/written-question-content.tsx",
  "flashcards/flashcard-game.tsx",
  "lesson/games/lesson-sentence-cloze-test.tsx",
  "lesson/games/lesson-flashcard-game.tsx",
  "lesson/games/lesson-matching-game.tsx",
  "lesson/games/lesson-sentence-order.tsx",
  "lesson/games/lesson-sentence-order-word.tsx",
  "articles/questions/mc-question-content.tsx",
  "lesson/practice/lesson-task-saq.tsx",
  "lesson/task/task-lesson-summary.tsx",
  "practice/matching-game.tsx",
];

describe("completion session refresh", () => {
  it.each(componentPaths)("uses the authoritative refresh in %s", (componentPath) => {
    const source = readFileSync(resolve(import.meta.dirname, "..", componentPath), "utf-8");
    expect(source).toMatch(/const\s*\{[^}]*\brefresh\b[^}]*\}\s*=\s*useAuth\s*\(/);
    expect(source).toMatch(/await refresh\(\)/);
    expect(source).not.toMatch(/session\?\.user|\bupdate\s*\(/);
  });
});
