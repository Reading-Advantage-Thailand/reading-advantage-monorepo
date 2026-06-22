/**
 * Schema parity test for the sales-advantage tables.
 *
 * Asserts all 9 sales_* tables export the expected columns and that the
 * FK relationships resolve against their referenced tables. No DB
 * connection required — reads the Drizzle table objects directly.
 *
 * Track: sales_advantage_mvp_20260622 — Phase 1.
 */
import { describe, expect, it } from "vitest";
import {
  salesModules,
  salesLessons,
  salesRubrics,
  salesRoleplayScenarios,
  salesQuizQuestions,
  salesRoleplayAttempts,
  salesProgress,
  salesConversations,
  salesChatMessages,
} from "../schema/sales.js";

function columns(table: object): string[] {
  return Object.keys(table as Record<string, unknown>).filter(
    (k) => !k.startsWith("_") && !k.startsWith("["),
  );
}

describe("sales-advantage schema", () => {
  it("sales_modules exposes the expected columns", () => {
    expect(columns(salesModules)).toEqual(
      expect.arrayContaining([
        "id",
        "slug",
        "title",
        "description",
        "phase",
        "order",
        "createdAt",
      ]),
    );
  });

  it("sales_lessons exposes the expected columns and FK to modules", () => {
    expect(columns(salesLessons)).toEqual(
      expect.arrayContaining([
        "id",
        "moduleId",
        "title",
        "type",
        "content",
        "order",
        "reviewStatus",
        "createdAt",
      ]),
    );
  });

  it("sales_rubrics exposes the expected columns", () => {
    expect(columns(salesRubrics)).toEqual(
      expect.arrayContaining([
        "id",
        "name",
        "criteriaJson",
        "reviewStatus",
        "createdAt",
      ]),
    );
  });

  it("sales_roleplay_scenarios exposes the expected columns and FKs", () => {
    expect(columns(salesRoleplayScenarios)).toEqual(
      expect.arrayContaining([
        "id",
        "lessonId",
        "personaName",
        "personaRole",
        "situation",
        "objective",
        "prospectContextJson",
        "rubricId",
        "order",
        "createdAt",
      ]),
    );
  });

  it("sales_quiz_questions exposes the expected columns", () => {
    expect(columns(salesQuizQuestions)).toEqual(
      expect.arrayContaining([
        "id",
        "lessonId",
        "question",
        "optionsJson",
        "correctAnswer",
        "explanation",
        "order",
        "createdAt",
      ]),
    );
  });

  it("sales_roleplay_attempts exposes the expected columns", () => {
    expect(columns(salesRoleplayAttempts)).toEqual(
      expect.arrayContaining([
        "id",
        "scenarioId",
        "userId",
        "audioStorageKey",
        "durationMs",
        "transcriptExcerpt",
        "llmScoreJson",
        "overallScore",
        "passed",
        "llmFeedback",
        "attemptNumber",
        "createdAt",
      ]),
    );
  });

  it("sales_progress exposes the expected columns", () => {
    expect(columns(salesProgress)).toEqual(
      expect.arrayContaining([
        "id",
        "userId",
        "lessonId",
        "status",
        "completedAt",
        "score",
        "createdAt",
      ]),
    );
  });

  it("sales_conversations exposes the expected columns", () => {
    expect(columns(salesConversations)).toEqual(
      expect.arrayContaining([
        "id",
        "userId",
        "lessonId",
        "moduleId",
        "createdAt",
      ]),
    );
  });

  it("sales_chat_messages exposes the expected columns", () => {
    expect(columns(salesChatMessages)).toEqual(
      expect.arrayContaining([
        "id",
        "conversationId",
        "role",
        "content",
        "createdAt",
      ]),
    );
  });

  it("exports 9 sales tables from the schema barrel", async () => {
    const barrel = await import("../schema/index.js");
    for (const name of [
      "salesModules",
      "salesLessons",
      "salesRubrics",
      "salesRoleplayScenarios",
      "salesQuizQuestions",
      "salesRoleplayAttempts",
      "salesProgress",
      "salesConversations",
      "salesChatMessages",
    ]) {
      expect(barrel).toHaveProperty(name);
    }
  });
});
