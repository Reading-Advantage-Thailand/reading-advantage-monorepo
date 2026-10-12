import { z } from "zod";

/** Stories on one page of the shelf (legacy shows 10). */
export const STORIES_PAGE_SIZE = 10;

/** Input of `listPrimaryStories`: the genre, a title or topic search, and the page (from 1). */
export const listPrimaryStoriesInputSchema = z.object({
  genre: z.string().trim().min(1).max(100).optional(),
  search: z.string().trim().min(1).max(100).optional(),
  page: z.number().int().min(1).max(10_000).default(1),
});

export type ListPrimaryStoriesInput = z.input<typeof listPrimaryStoriesInputSchema>;

/** One book on the shelf. `imageKey` is `image ?? id`; the cover is `images/story/<imageKey>.png`. */
export const storyCardSchema = z.object({
  id: z.string(),
  title: z.string(),
  genre: z.string().nullable(),
  raLevel: z.number().int().nullable(),
  cefrLevel: z.string().nullable(),
  imageKey: z.string(),
});

export type StoryCard = z.infer<typeof storyCardSchema>;

/** Output of `listPrimaryStories`: the page of cards, the match count, and the genres to filter by. */
export const listPrimaryStoriesOutputSchema = z.object({
  stories: z.array(storyCardSchema),
  total: z.number().int().min(0),
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1),
  genres: z.array(z.string()),
});

export type ListPrimaryStoriesOutput = z.infer<typeof listPrimaryStoriesOutputSchema>;

/** Input of `getStoryForStudent`: the story id (a UUID). */
export const getStoryForStudentInputSchema = z.object({ storyId: z.string().uuid() });

export type GetStoryForStudentInput = z.input<typeof getStoryForStudentInputSchema>;

/** Summary text by language code (`th`, `cn`, `tw`, `vi`); bad data reads as no translation. */
const translatedTextSchema = z.record(z.string(), z.string()).nullable().catch(null);

/** One chapter row of the story page. */
export const storyChapterItemSchema = z.object({
  id: z.string(),
  chapterNumber: z.number().int(),
  title: z.string(),
  summary: z.string().nullable(),
  translatedSummary: translatedTextSchema,
});

export type StoryChapterItem = z.infer<typeof storyChapterItemSchema>;

/** One character of the story bible. */
export const storyCharacterSchema = z.object({
  name: z.string().min(1),
  description: z.string().nullish().transform((v) => v ?? null),
  background: z.string().nullish().transform((v) => v ?? null),
});

export type StoryCharacter = z.infer<typeof storyCharacterSchema>;

/**
 * Output of `getStoryForStudent`: the story, its chapters in order, the ids of the chapters that
 * the user finished (`STORIES_*` activity rows), and the characters of the story bible.
 */
export const getStoryForStudentOutputSchema = z.object({
  story: z.object({
    id: z.string(),
    title: z.string(),
    summary: z.string().nullable(),
    translatedSummary: translatedTextSchema,
    genre: z.string().nullable(),
    raLevel: z.number().int().nullable(),
    cefrLevel: z.string().nullable(),
    imageKey: z.string(),
  }),
  chapters: z.array(storyChapterItemSchema),
  finishedChapterIds: z.array(z.string()),
  characters: z.array(storyCharacterSchema),
});

export type GetStoryForStudentOutput = z.infer<typeof getStoryForStudentOutputSchema>;

/** Input of `getChapterForStudent`: the story id (a UUID) and the chapter number (from 1). */
export const getChapterForStudentInputSchema = z.object({
  storyId: z.string().uuid(),
  chapterNumber: z.number().int().min(1).max(10_000),
});

export type GetChapterForStudentInput = z.input<typeof getChapterForStudentInputSchema>;

/** Sentence translations by language code (`th`, `cn`, `tw`, `vi`); bad data reads as no translation. */
const translatedPassageSchema = z.record(z.string(), z.array(z.string()).catch([])).nullable().catch(null);

/** One word of the chapter word list: the word, its meanings by language, and its audio time. */
export const chapterWordSchema = z.object({
  vocabulary: z.string(),
  definition: z.record(z.string(), z.string()),
  timeSeconds: z.number().optional(),
});

export type ChapterWord = z.infer<typeof chapterWordSchema>;

/**
 * Output of `getChapterForStudent`: the story, the chapter with its sentence timings, the
 * translations, the audio key and the picture key, the word list, and the neighbour numbers.
 * `sentences` is raw timing data; the read-along parser in the app validates it.
 */
export const getChapterForStudentOutputSchema = z.object({
  story: z.object({ id: z.string(), title: z.string() }),
  chapter: z.object({
    id: z.string(),
    chapterNumber: z.number().int(),
    title: z.string(),
    passage: z.string(),
    sentences: z.unknown(),
    translatedPassage: translatedPassageSchema,
    audioKey: z.string().nullable(),
    imageKey: z.string(),
  }),
  words: z.object({
    words: z.array(chapterWordSchema).catch([]),
    wordsUrl: z.string(),
  }),
  previousChapterNumber: z.number().int().nullable(),
  nextChapterNumber: z.number().int().nullable(),
});

export type GetChapterForStudentOutput = z.infer<typeof getChapterForStudentOutputSchema>;
