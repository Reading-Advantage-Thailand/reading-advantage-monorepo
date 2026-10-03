import { z } from "zod";

import { cefrLevelSchema } from "./story-input.js";

/** Maximum items and practice labels in one story-game evidence record. */
export const MAX_STORY_GAME_EVIDENCE_ITEMS = 200;

/** Strict schema for the kind of story item a game asked about. */
export const storyItemKindSchema = z.enum(["word", "sentence", "fill", "question"]);

/** The kind of story item a game asked about. */
export type StoryItemKind = z.infer<typeof storyItemKindSchema>;

/** Strict schema for one story item as a game reported it. */
export const storyGameEvidenceItemSchema = z
  .object({
    /** The `StoryInput` item id. */
    itemId: z.string().min(1),
    itemKind: storyItemKindSchema,
    /** Short label for the results list, such as the word or the sentence. */
    label: z.string().min(1),
    /** Responses to this item, right and wrong. */
    attempts: z.number().int().min(1),
    correctFirstTry: z.boolean(),
    /** Answered correctly at some point in the run. */
    solved: z.boolean(),
    /** Zero-based paragraph to read again, when known. */
    paragraph: z.number().int().min(0).optional(),
  })
  .strict()
  .refine((item) => !item.correctFirstTry || item.solved, {
    message: "An item correct on the first try is solved",
    path: ["solved"],
  });

/** Strict schema for the evidence a story-mode game reports at completion. */
export const storyGameEvidenceSchema = z
  .object({
    schemaVersion: z.literal(1),
    kind: z.literal("story-game"),
    gameId: z.string().min(1),
    storyId: z.string().min(1),
    level: cefrLevelSchema,
    seed: z.number().int(),
    durationMs: z.number().int().min(0),
    items: z.array(storyGameEvidenceItemSchema).max(MAX_STORY_GAME_EVIDENCE_ITEMS),
    /** Labels of items answered wrong at least once, for a practice list. */
    practice: z.array(z.string()).max(MAX_STORY_GAME_EVIDENCE_ITEMS),
  })
  .strict();

/** Completion evidence of one story-mode game run. */
export type StoryGameEvidence = z.infer<typeof storyGameEvidenceSchema>;

/** One story item as a game reported it. */
export type StoryGameEvidenceItem = z.infer<typeof storyGameEvidenceItemSchema>;

/**
 * Derives the practice list from reported items.
 * @param items Validated story-game evidence items.
 * @returns The labels of items not correct on the first try, in report order.
 */
export function practiceOf(items: readonly StoryGameEvidenceItem[]): string[] {
  return items.filter((item) => !item.correctFirstTry).map((item) => item.label);
}
