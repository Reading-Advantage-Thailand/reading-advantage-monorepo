import { and, asc, desc, eq } from "drizzle-orm";
import { assertCan, type Tenant, type UserContext } from "@reading-advantage/auth";
import {
  userSentenceRecords,
  userWordRecords,
} from "@reading-advantage/db/schema";
import { vocabularyItemSchema } from "@reading-advantage/game-contracts";
import { z } from "zod";

import type { TenantDB } from "../db-contract.js";

/** Supported student learning-content modes. */
export const gameLearningContentModeSchema = z.enum(["vocabulary", "sentence"]);

/** Supported translation locales stored in Reading Advantage flashcards. */
export const gameLearningContentLocaleSchema = z.enum(["en", "th", "cn", "tw", "vi"]);

/** Validated input for a student-owned APK learning-content query. */
export const gameLearningContentInputSchema = z.object({
  mode: gameLearningContentModeSchema,
  locale: gameLearningContentLocaleSchema.default("th"),
  limit: z.number().int().min(1).max(50).default(50),
}).strict();

/** Validated output for a student-owned APK learning-content query. */
export const gameLearningContentResultSchema = z.object({
  mode: gameLearningContentModeSchema,
  source: z.literal("student-flashcards"),
  content: z.array(vocabularyItemSchema),
}).strict();

/** Input accepted by the student learning-content query. */
export type GameLearningContentInput = z.input<typeof gameLearningContentInputSchema>;

/** Student-owned content returned to an APK host. */
export type GameLearningContentResult = z.infer<typeof gameLearningContentResultSchema>;

const translationRecordSchema = z.record(z.string(), z.string());
const wordRecordSchema = z.object({
  vocabulary: z.string().trim().min(1),
  definition: translationRecordSchema,
}).passthrough();

/** Translation fallback order after the requested locale. */
const fallbackLocales = ["en", "th", "cn", "tw", "vi"] as const;

/**
 * Selects one non-empty translation with a stable locale fallback.
 * @param value Persisted translation record.
 * @param locale Student-requested locale.
 * @returns The selected translation, or undefined when none is usable.
 */
function selectTranslation(
  value: unknown,
  locale: z.infer<typeof gameLearningContentLocaleSchema>,
): string | undefined {
  const parsed = translationRecordSchema.safeParse(value);
  if (!parsed.success) return undefined;

  for (const key of [locale, ...fallbackLocales]) {
    const translation = parsed.data[key]?.trim();
    if (translation) return translation;
  }
  return undefined;
}

/**
 * Returns saved student vocabulary or sentence flashcards for an APK session.
 * @param args Authenticated tenant context and validated content selection.
 * @returns Canonical cartridge content from student-owned flashcard records.
 * @throws When authorization or input validation fails.
 */
export async function listGameLearningContent({
  db,
  user,
  tenant,
  input,
}: {
  db: TenantDB;
  user: UserContext;
  tenant: Tenant;
  input: GameLearningContentInput;
}): Promise<GameLearningContentResult> {
  assertCan(user, "games:read:own", tenant);
  const parsed = gameLearningContentInputSchema.parse(input);
  const rawDb = db.unscoped(
    parsed.mode === "vocabulary"
      ? "userWordRecords is REFERENTIAL; content is scoped by the authenticated userId"
      : "userSentenceRecords is REFERENTIAL; content is scoped by the authenticated userId",
  );

  if (parsed.mode === "vocabulary") {
    const rows = await rawDb
      .select({ word: userWordRecords.word })
      .from(userWordRecords)
      .where(
        and(
          eq(userWordRecords.userId, user.id),
          eq(userWordRecords.saveToFlashcard, true),
        ),
      )
      .orderBy(asc(userWordRecords.due), desc(userWordRecords.createdAt))
      .limit(parsed.limit);
    const content = rows.flatMap(({ word }) => {
      const record = wordRecordSchema.safeParse(word);
      if (!record.success) return [];
      const translation = selectTranslation(record.data.definition, parsed.locale);
      return translation
        ? [{ term: record.data.vocabulary, translation }]
        : [];
    });

    return gameLearningContentResultSchema.parse({
      mode: parsed.mode,
      source: "student-flashcards",
      content,
    });
  }

  const rows = await rawDb
    .select({
      sentence: userSentenceRecords.sentence,
      translation: userSentenceRecords.translation,
    })
    .from(userSentenceRecords)
    .where(
      and(
        eq(userSentenceRecords.userId, user.id),
        eq(userSentenceRecords.saveToFlashcard, true),
      ),
    )
    .orderBy(asc(userSentenceRecords.due), desc(userSentenceRecords.createdAt))
    .limit(parsed.limit);
  const content = rows.flatMap(({ sentence, translation: storedTranslation }) => {
    const term = typeof sentence === "string" ? sentence.trim() : "";
    const translation = selectTranslation(storedTranslation, parsed.locale);
    return term && translation ? [{ term, translation }] : [];
  });

  return gameLearningContentResultSchema.parse({
    mode: parsed.mode,
    source: "student-flashcards",
    content,
  });
}
