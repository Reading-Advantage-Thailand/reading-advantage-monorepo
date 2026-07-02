/**
 * Wave 2 Phase 1 — Science grade-4 seed contract Red test.
 *
 * Track: wave2_confidence_restoration_20260628
 * Ref: Science HI-05 — grade-4 seed data violates seeder Zod contract.
 *
 * The grade-4 lesson files are bare LessonContent objects, not LessonsFile
 * wrappers, and the grade-4 question banks omit fields the seeder schema
 * requires (text, points, standards). This test loads the real grade-4 seed
 * files and asserts they pass the same Zod contract used by seed-lessons.ts
 * and seed-questions.ts.
 */

import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  validateLessonsSeedFile,
  validateQuizQuestionsSeedFile,
} from "@/lib/schemas/seed-validation";

const HERE = dirname(fileURLToPath(import.meta.url));
const APP_ROOT = resolve(HERE, "..");
const GRADE4_LESSONS_DIR = join(
  APP_ROOT,
  "scripts",
  "seed-data",
  "grade-4",
  "lessons",
);
const GRADE4_QUESTIONS_DIR = join(
  APP_ROOT,
  "scripts",
  "seed-data",
  "grade-4",
  "questions",
);

function listJsonFiles(dir: string): string[] {
  return readdirSync(dir).filter((name) => name.endsWith(".json"));
}

describe("Wave 2 — Grade-4 seed contract", () => {
  it("grade-4 lesson files satisfy the LessonsFile Zod contract", () => {
    const files = listJsonFiles(GRADE4_LESSONS_DIR);
    expect(
      files.length,
      "Grade-4 lesson fixture file count must be > 0",
    ).toBeGreaterThan(0);

    let invalidCount = 0;
    const details: string[] = [];
    for (const file of files) {
      const content = JSON.parse(
        readFileSync(join(GRADE4_LESSONS_DIR, file), "utf-8"),
      );
      const errors = validateLessonsSeedFile(content, file);
      if (errors.length > 0) {
        invalidCount++;
        details.push(
          `${file}: ${errors.map((e) => `${e.field}: ${e.message}`).join("; ")}`,
        );
      }
    }

    expect(
      invalidCount,
      `Invalid grade-4 seed item count: ${invalidCount}\n${details.join("\n")}`,
    ).toBe(0);
  });

  it("grade-4 question files satisfy the QuizQuestionsFile Zod contract", () => {
    const files = listJsonFiles(GRADE4_QUESTIONS_DIR);
    expect(
      files.length,
      "Grade-4 question fixture file count must be > 0",
    ).toBeGreaterThan(0);

    let invalidCount = 0;
    const details: string[] = [];
    for (const file of files) {
      const content = JSON.parse(
        readFileSync(join(GRADE4_QUESTIONS_DIR, file), "utf-8"),
      );
      const errors = validateQuizQuestionsSeedFile(content, file);
      if (errors.length > 0) {
        invalidCount++;
        details.push(
          `${file}: ${errors.map((e) => `${e.field}: ${e.message}`).join("; ")}`,
        );
      }
    }

    expect(
      invalidCount,
      `Invalid grade-4 seed item count: ${invalidCount}\n${details.join("\n")}`,
    ).toBe(0);
  });
});
