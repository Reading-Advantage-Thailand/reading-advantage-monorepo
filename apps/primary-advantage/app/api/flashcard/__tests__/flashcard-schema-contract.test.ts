// @vitest-environment node
/**
 * Red test for Primary Phase 1: flashcard schema mismatch.
 *
 * actions/flashcard.ts inserts/updates FSRS fields (due, stability, difficulty,
 * elapsedDays, scheduledDays, learningSteps, reps, lapses, state, lastReview)
 * and content fields (articleId, audioUrl, startTime, endTime, word,
 * definition, sentence, translation) into flashcardCards via `as any` casts.
 *
 * The shared Drizzle schema for flashcard_cards only exposes:
 *   id, deckId, front, back, sourceId, order, createdAt.
 *
 * Green: either extend the shared schema with the missing columns (and a
 * matching migration) or rewrite the action to store FSRS/content state in
 * flashcardProgress / cardReviews / JSONB columns that actually exist.
 *
 * `type` is intentionally NOT in CASTED_FIELDS below. `type` is a real
 * shared-schema column on `flashcardDecks` (text("type") in
 * `packages/db/src/schema/flashcards.ts`) and the dashboard reads
 * `type` from the action response (matching the DB column). The original
 * Phase 1 Wave 1 commit renamed the action's output field from `type` to
 * `kind` to dodge this regex, which caused a contract drift with
 * `components/flashcards/flashcard-dashboard.tsx` (the consumer). That
 * drift was a check-types regression introduced by 591b1cc1; the action
 * must use `type` (the real DB column name) so dashboard consumption
 * matches the schema.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { flashcardCards } from "@reading-advantage/db";
import { getTableColumns } from "drizzle-orm";

const ACTION_SRC_PATH = resolve(
  import.meta.dirname,
  "../../../../actions/flashcard.ts",
);

const EXPECTED_SHARED_COLUMNS = [
  "id",
  "deckId",
  "front",
  "back",
  "sourceId",
  "order",
  "createdAt",
];

const CASTED_FIELDS = [
  "due",
  "stability",
  "difficulty",
  "elapsedDays",
  "scheduledDays",
  "learningSteps",
  "reps",
  "lapses",
  "state",
  "lastReview",
  // `type` removed: it is a real shared-schema column on
  // `flashcardDecks` and the action's output field name must match the
  // DB column so the dashboard contract is consistent. See header
  // comment above.
  "articleId",
  "audioUrl",
  "startTime",
  "endTime",
  "word",
  "definition",
  "sentence",
  "translation",
];

describe("flashcard schema contract", () => {
  const actionSrc = readFileSync(ACTION_SRC_PATH, "utf-8");
  const sharedColumns = Object.keys(getTableColumns(flashcardCards));

  it("shared flashcardCards schema exposes only the expected columns", () => {
    expect(sharedColumns.sort()).toEqual(EXPECTED_SHARED_COLUMNS.sort());
  });

  it("does not rely on as-any casts for fields absent from shared schema", () => {
    // Detect property assignments (`field:` or shorthand `field,`) for fields
    // that are not present in the shared flashcardCards schema.
    const missingFields = CASTED_FIELDS.filter((field) => {
      const propAssign = new RegExp(`\\b${field}\\s*:`, "g");
      const shorthand = new RegExp(`^\\s*${field}\\s*,?\\s*$`, "gm");
      return propAssign.test(actionSrc) || shorthand.test(actionSrc);
    });

    const castPattern = /as\s+any\b/g;
    const castCount = (actionSrc.match(castPattern) || []).length;

    expect(
      {
        missingFields,
        missingFieldCount: missingFields.length,
        castCount,
      },
      `found ${missingFields.length} fields assigned via as-any that are not in shared flashcardCards schema`,
    ).toEqual({
      missingFields: [],
      missingFieldCount: 0,
      castCount: 0,
    });
  });
});
