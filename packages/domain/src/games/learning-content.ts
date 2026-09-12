import { and, asc, desc, eq } from "drizzle-orm";
import { assertCan, type Tenant, type UserContext } from "@reading-advantage/auth";
import {
  userSentenceRecords,
  userWordRecords,
} from "@reading-advantage/db/schema";
import {
  listeningSessionConfigSchema,
  readToSelectAudioSessionConfigSchema,
  vocabularyItemSchema,
} from "@reading-advantage/game-contracts";
import { z } from "zod";

import type { TenantDB } from "../db-contract.js";

/** Supported student learning-content modes. */
export const gameLearningContentModeSchema = z.enum(["vocabulary", "sentence"]);

/** Supported translation locales stored in Reading Advantage flashcards. */
export const gameLearningContentLocaleSchema = z.enum(["en", "th", "cn", "tw", "vi"]);

/** Validated input for a student-owned APK learning-content query. */
export const gameLearningContentInputSchema = z
  .object({
    mode: gameLearningContentModeSchema,
    locale: gameLearningContentLocaleSchema.default("th"),
    limit: z.number().int().min(1).max(50).default(50),
    listeningSession: listeningSessionConfigSchema.optional(),
    answerAudioSession: readToSelectAudioSessionConfigSchema.optional(),
  })
  .strict()
  .superRefine((input, context) => {
    if (input.listeningSession && input.answerAudioSession) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Select one audio learning modality",
        path: ["answerAudioSession"],
      });
    }
    if (input.listeningSession && input.listeningSession.targetLocale !== input.locale) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Listening target locale must match the content locale",
        path: ["listeningSession", "targetLocale"],
      });
    }
    if (input.answerAudioSession && (input.mode !== "vocabulary" || input.locale !== "th")) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Read to Select Audio requires Thai vocabulary content",
        path: ["answerAudioSession"],
      });
    }
  });

/** Validated output for a student-owned APK learning-content query. */
export const gameLearningContentResultSchema = z
  .object({
    mode: gameLearningContentModeSchema,
    source: z.literal("student-flashcards"),
    requestedTargetLocale: gameLearningContentLocaleSchema,
    selectedTargetLocales: z.array(gameLearningContentLocaleSchema).max(50),
    content: z.array(vocabularyItemSchema).max(50),
    listeningSession: listeningSessionConfigSchema.optional(),
    answerAudioSession: readToSelectAudioSessionConfigSchema.optional(),
  })
  .strict()
  .superRefine((result, context) => {
    if (result.listeningSession && result.answerAudioSession) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Select one audio learning modality",
        path: ["answerAudioSession"],
      });
    }
    if (result.selectedTargetLocales.length !== result.content.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Selected target locales must align with content items",
        path: ["selectedTargetLocales"],
      });
    }
    if (
      result.listeningSession
      && result.listeningSession.targetLocale !== result.requestedTargetLocale
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Listening target locale must match the requested target locale",
        path: ["listeningSession", "targetLocale"],
      });
    }
    if (result.answerAudioSession && (
      result.mode !== "vocabulary"
      || result.requestedTargetLocale !== "th"
      || result.selectedTargetLocales.some((locale) => locale !== "th")
    )) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Read to Select Audio requires exact Thai target content",
        path: ["selectedTargetLocales"],
      });
    }
  });

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
): { translation: string; locale: z.infer<typeof gameLearningContentLocaleSchema> } | undefined {
  const parsed = translationRecordSchema.safeParse(value);
  if (!parsed.success) return undefined;

  for (const key of [locale, ...fallbackLocales]) {
    const translation = parsed.data[key]?.trim();
    if (translation) return { translation, locale: key };
  }
  return undefined;
}

type SelectedContentItem = {
  term: string;
  translation: string;
  selectedTargetLocale: z.infer<typeof gameLearningContentLocaleSchema>;
};

/**
 * Builds a truthful content response and enforces scored listening locale policy.
 * @param mode Selected educational content mode.
 * @param requestedTargetLocale Target locale requested by the host.
 * @param items Valid content with each selected translation locale.
 * @param listeningSession Optional validated listening session configuration.
 * @param answerAudioSession Optional validated answer-audio session configuration.
 * @returns A validated response with strict educational items and adjacent locales.
 * @throws When scored listening uses a fallback target locale.
 */
function buildLearningContentResult(
  mode: z.infer<typeof gameLearningContentModeSchema>,
  requestedTargetLocale: z.infer<typeof gameLearningContentLocaleSchema>,
  items: readonly SelectedContentItem[],
  listeningSession: z.infer<typeof listeningSessionConfigSchema> | undefined,
  answerAudioSession: z.infer<typeof readToSelectAudioSessionConfigSchema> | undefined,
): GameLearningContentResult {
  const selectedTargetLocales = items.map(({ selectedTargetLocale }) => selectedTargetLocale);
  if (
    listeningSession?.targetLocaleFallback === "reject"
    && selectedTargetLocales.some((locale) => locale !== requestedTargetLocale)
  ) {
    throw new Error("Scored listening content requires the requested target locale");
  }
  if (
    answerAudioSession
    && selectedTargetLocales.some((locale) => locale !== requestedTargetLocale)
  ) {
    throw new Error("Read to Select Audio requires exact Thai target content");
  }
  return gameLearningContentResultSchema.parse({
    mode,
    source: "student-flashcards",
    requestedTargetLocale,
    selectedTargetLocales,
    content: items.map(({ term, translation }) => ({ term, translation })),
    ...(listeningSession ? { listeningSession } : {}),
    ...(answerAudioSession ? { answerAudioSession } : {}),
  });
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
      const selected = selectTranslation(record.data.definition, parsed.locale);
      return selected
        ? [{
          term: record.data.vocabulary,
          translation: selected.translation,
          selectedTargetLocale: selected.locale,
        }]
        : [];
    });

    return buildLearningContentResult(
      parsed.mode,
      parsed.locale,
      content,
      parsed.listeningSession,
      parsed.answerAudioSession,
    );
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
    const selected = selectTranslation(storedTranslation, parsed.locale);
    return term && selected
      ? [{
        term,
        translation: selected.translation,
        selectedTargetLocale: selected.locale,
      }]
      : [];
  });

  return buildLearningContentResult(
    parsed.mode,
    parsed.locale,
    content,
    parsed.listeningSession,
    parsed.answerAudioSession,
  );
}
