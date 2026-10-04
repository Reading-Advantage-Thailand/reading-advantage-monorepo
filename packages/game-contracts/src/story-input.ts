import { z } from "zod";

import type { SentenceInput, VocabularyInput } from "./educational-io.js";

/** CEFR level labels as shown to teachers; the `+` levels are half steps. */
export const CEFR_LEVELS = ["Pre-A1", "A0", "A0+", "A1", "A1+", "A2", "B1"] as const;

/** Strict schema for one CEFR level label. */
export const cefrLevelSchema = z.enum(CEFR_LEVELS);

/** One CEFR level label. */
export type CefrLevel = z.infer<typeof cefrLevelSchema>;

/**
 * Reads the level from a workbook `cefr_level` value such as "CEFR A0" or "A1".
 * @param raw The workbook value, with or without a "CEFR " prefix.
 * @returns The validated level label.
 * @throws When the rest of the value is not a known level.
 */
export function normalizeCefrLevel(raw: string): CefrLevel {
  const label = raw.trim().replace(/^cefr\s+/iu, "");
  const result = cefrLevelSchema.safeParse(label);
  if (!result.success) throw new Error(`Unknown CEFR level "${raw}"`);
  return result.data;
}

/**
 * Removes the `+` half step from a level: "A0+" becomes "A0".
 * @param level A validated level label.
 * @returns The base level label.
 */
export function baseLevel(level: CefrLevel): CefrLevel {
  return level.endsWith("+") ? cefrLevelSchema.parse(level.slice(0, -1)) : level;
}

const BLANK = "___";

const idSchema = z.string().min(1);
const textSchema = z.string().trim().min(1);
const paragraphIndexSchema = z.number().int().nonnegative();
const storyIdSchema = z.string().regex(/^[a-z0-9-]+$/u, {
  message: "Story id must use lowercase letters, digits, and dashes",
});

/** Strict schema for one paragraph of the story text. */
export const storyParagraphSchema = z
  .object({
    /** English paragraph text as the student reads it. */
    text: textSchema,
    /** Translation of the paragraph for the reader's translation toggle. */
    translation: textSchema.optional(),
  })
  .strict();

/** Strict schema for one vocabulary item of a story; `term` and `translation` match `VocabularyItem`. */
export const storyVocabularySchema = z
  .object({
    /** Stable id within the story, such as "w-brave". */
    id: idSchema,
    /** The English word or phrase in the form it has in the story. */
    term: textSchema,
    /** Short meaning in the student's language. */
    translation: textSchema,
    /** Simple English definition. */
    definition: textSchema,
    phonetic: textSchema.optional(),
  })
  .strict();

/** Strict schema for one sentence-order item of a story. */
export const storySentenceSchema = z
  .object({
    id: idSchema,
    /** The correct sentence. */
    text: textSchema,
    /** Its words in the correct order; punctuation stays attached to its word. */
    words: z.array(textSchema).min(2),
    translation: textSchema.optional(),
    /** Zero-based paragraph the sentence comes from. */
    paragraph: paragraphIndexSchema.optional(),
  })
  .strict()
  .refine((sentence) => sentence.words.join(" ") === sentence.text, {
    message: "Words do not join to the sentence text",
    path: ["words"],
  });

/** Strict schema for one fill-in-the-blank item of a story. */
export const storyFillSchema = z
  .object({
    id: idSchema,
    /** The sentence with exactly one blank written as "___". */
    sentence: textSchema,
    /** The word that fills the blank. */
    answer: textSchema,
    paragraph: paragraphIndexSchema.optional(),
  })
  .strict()
  .refine((fill) => fill.sentence.split(BLANK).length === 2, {
    message: `Sentence needs exactly one "${BLANK}"`,
    path: ["sentence"],
  })
  .refine((fill) => !/<[a-z/][^>]*>/iu.test(fill.sentence), {
    message: "Sentence contains HTML",
    path: ["sentence"],
  });

/** Strict schema for one multiple-choice comprehension question of a story. */
export const storyQuestionSchema = z
  .object({
    id: idSchema,
    question: textSchema,
    options: z.array(textSchema).min(2),
    /** Index of the correct option in `options`. */
    answer: z.number().int().nonnegative(),
    /** Zero-based paragraph that best supports the answer. */
    paragraph: paragraphIndexSchema.optional(),
  })
  .strict()
  .refine((question) => question.answer < question.options.length, {
    message: "Answer index is outside the options",
    path: ["answer"],
  })
  .refine((question) => new Set(question.options).size === question.options.length, {
    message: "Options must be distinct",
    path: ["options"],
  });

/** Strict schema for the workbook provenance of a story. */
export const storySourceSchema = z
  .object({
    /** Workbook file the story came from, relative to the workbooks root. */
    file: textSchema,
    url: z.string().optional(),
    /** True when a model wrote the translations and a native speaker has not reviewed them. */
    translationsGenerated: z.boolean().optional(),
  })
  .strict();

function hasUniqueIds(items: readonly { id: string }[]): boolean {
  return new Set(items.map((item) => item.id)).size === items.length;
}

const audioFileSchema = z.string().regex(/^[a-z0-9-]+\.(mp3|ogg|m4a)$/u);
const audioSpanSchema = z.object({ text: textSchema, start: z.number().nonnegative(), end: z.number().positive() }).strict();

/**
 * Strict schema for the recorded read-aloud: one file for the whole story (each sentence is a time
 * span in it, in story order) and one file with the glossary words (a time span for each). The
 * files sit in the story folder.
 */
export const storyAudioSchema = z
  .object({
    article: audioFileSchema,
    sentences: z.array(audioSpanSchema.extend({ paragraph: paragraphIndexSchema })).min(1),
    words: audioFileSchema.optional(),
    wordTimes: z.array(audioSpanSchema).optional(),
  })
  .strict()
  .refine((audio) => audio.sentences.every((span) => span.end > span.start), {
    message: "A sentence ends before it starts",
    path: ["sentences"],
  });

/** Strict schema for one validated story as a story-mode cartridge receives it. */
export const storyInputSchema = z
  .object({
    schemaVersion: z.literal(1),
    id: storyIdSchema,
    title: textSchema,
    /** Series name, such as "Origins 2". */
    series: textSchema,
    lesson: z.number().int().positive(),
    level: cefrLevelSchema,
    genre: textSchema,
    paragraphs: z.array(storyParagraphSchema).min(1),
    /** Image paths relative to the story folder, such as "img-1.webp". */
    images: z.array(z.string().regex(/^[a-z0-9-]+\.(?:webp|png|jpg)$/u)),
    vocabulary: z.array(storyVocabularySchema),
    sentences: z.array(storySentenceSchema),
    fills: z.array(storyFillSchema),
    questions: z.array(storyQuestionSchema),
    source: storySourceSchema,
    audio: storyAudioSchema.optional(),
  })
  .strict()
  .superRefine((story, context) => {
    for (const key of ["vocabulary", "sentences", "fills", "questions"] as const) {
      if (!hasUniqueIds(story[key])) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Item ids must be distinct",
          path: [key],
        });
      }
    }
    for (const key of ["sentences", "fills", "questions"] as const) {
      story[key].forEach((item, index) => {
        if (item.paragraph !== undefined && item.paragraph >= story.paragraphs.length) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Paragraph index is outside the paragraphs",
            path: [key, index, "paragraph"],
          });
        }
      });
    }
    const itemCount = story.vocabulary.length
      + story.sentences.length
      + story.fills.length
      + story.questions.length;
    if (itemCount === 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "A story needs at least one word, sentence, fill, or question",
      });
    }
  });

/** One validated story: the story-mode calling convention. */
export type StoryInput = z.infer<typeof storyInputSchema>;

/** One paragraph of a story. */
/** Recorded read-aloud timings of a story. */
export type StoryAudio = z.infer<typeof storyAudioSchema>;

/** One paragraph of the story text. */
export type StoryParagraph = z.infer<typeof storyParagraphSchema>;

/** One vocabulary item of a story. */
export type StoryVocabulary = z.infer<typeof storyVocabularySchema>;

/** One sentence-order item of a story. */
export type StorySentence = z.infer<typeof storySentenceSchema>;

/** One fill-in-the-blank item of a story. */
export type StoryFill = z.infer<typeof storyFillSchema>;

/** One comprehension question of a story. */
export type StoryQuestion = z.infer<typeof storyQuestionSchema>;

function describeIssues(error: z.ZodError): string {
  return error.issues
    .map((issue) => `${issue.path.length > 0 ? issue.path.join(".") : "(root)"}: ${issue.message}`)
    .join("\n");
}

/**
 * Validates untrusted JSON as a story.
 * @param json Untrusted story content.
 * @param label Name used in the error message.
 * @returns The validated story.
 * @throws An Error that lists every problem when the content is not a story.
 */
export function parseStoryInput(json: unknown, label = "story"): StoryInput {
  const result = storyInputSchema.safeParse(json);
  if (!result.success) throw new Error(`Invalid ${label}:\n${describeIssues(result.error)}`);
  return result.data;
}

/** Strict schema for one story index row: enough for a selector without loading the story. */
export const storyIndexEntrySchema = z
  .object({
    id: storyIdSchema,
    title: textSchema,
    level: cefrLevelSchema,
    series: textSchema,
    lesson: z.number().int().positive(),
    /** Cover image path relative to the story folder; absent when the story has no images. */
    cover: z.string().optional(),
    /** False while generated translations wait for a native speaker's review. */
    reviewed: z.boolean(),
  })
  .strict();

/** Schema for the story index: every row has a distinct story id. */
export const storyIndexSchema = z
  .array(storyIndexEntrySchema)
  .refine(hasUniqueIds, { message: "Story ids must be distinct" });

/** One story index row. */
export type StoryIndexEntry = z.infer<typeof storyIndexEntrySchema>;

/**
 * Validates untrusted JSON as a story index.
 * @param json Untrusted index content.
 * @returns The validated index rows.
 * @throws An Error that lists every problem when the content is not a story index.
 */
export function parseStoryIndex(json: unknown): StoryIndexEntry[] {
  const result = storyIndexSchema.safeParse(json);
  if (!result.success) throw new Error(`Invalid story index:\n${describeIssues(result.error)}`);
  return result.data;
}

/**
 * Builds the index row for a story; `cover` is its first image.
 * @param story A validated story.
 * @returns A new index row.
 */
export function toStoryIndexEntry(story: StoryInput): StoryIndexEntry {
  const cover = story.images[0];
  return {
    id: story.id,
    title: story.title,
    level: story.level,
    series: story.series,
    lesson: story.lesson,
    ...(cover === undefined ? {} : { cover }),
    reviewed: story.source.translationsGenerated !== true,
  };
}

/**
 * Derives the vocabulary-mode input of a story.
 * @param story A validated story.
 * @returns A new canonical vocabulary array containing only term and translation.
 */
export function toVocabularyInput(story: StoryInput): VocabularyInput {
  return story.vocabulary.map(({ term, translation }) => ({ term, translation }));
}

/**
 * Derives the sentence-mode input of a story; a cartridge splits `term` on spaces for the words.
 * @param story A validated story.
 * @returns A new canonical sentence array containing only term and translation.
 */
export function toSentenceInput(story: StoryInput): SentenceInput {
  return story.sentences.map((sentence) => ({
    term: sentence.text,
    translation: sentence.translation ?? "",
  }));
}
