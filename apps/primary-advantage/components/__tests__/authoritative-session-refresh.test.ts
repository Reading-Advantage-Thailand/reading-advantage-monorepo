// @vitest-environment node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const componentPaths = [
  "articles/questions/sa-question-content.tsx",
  "flashcards/flashcard-game.tsx",
  "lesson/games/lesson-sentence-cloze-test.tsx",
  "lesson/games/lesson-sentence-flashcard.tsx",
  "lesson/games/lesson-sentence-matching.tsx",
  "lesson/games/lesson-sentence-order.tsx",
  "lesson/games/lesson-sentence-order-word.tsx",
  "lesson/games/lesson-vocabulary-flashcard-card.tsx",
  "lesson/games/lesson-vocabulary-matching.tsx",
  "lesson/pratice/lesson-task-mcq.tsx",
  "lesson/pratice/lesson-task-saq.tsx",
  "lesson/task/task-lesson-summary.tsx",
  "pratice/cloze-test-game.tsx",
  "pratice/matching-game.tsx",
  "pratice/order-sentences-game.tsx",
  "pratice/order-words-game.tsx",
];

describe("completion session refresh", () => {
  it.each(componentPaths)("uses the authoritative refresh in %s", (componentPath) => {
    const source = readFileSync(resolve(import.meta.dirname, "..", componentPath), "utf-8");
    expect(source).toMatch(/const\s*\{[^}]*\brefresh\b[^}]*\}\s*=\s*useAuth\s*\(/);
    expect(source).toMatch(/await refresh\(\)/);
    expect(source).not.toMatch(/session\?\.user|\bupdate\s*\(/);
  });
});
