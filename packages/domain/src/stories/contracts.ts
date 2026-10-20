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

/** MCQ shown in one quiz of a chapter (5 random of the bank). */
export const STORY_MCQ_PER_QUIZ = 5;
/** XP for each correct MCQ answer (legacy `UserXpEarned.MCQuestion`). */
export const STORY_XP_PER_CORRECT_MC = 2;
/** Highest SAQ award (the grader scores 1 to 5). */
export const STORY_SA_MAX_XP = 5;
/** Highest LAQ award (five rubric scores of 1 to 5). */
export const STORY_LA_MAX_XP = 25;
/** Highest LAQ answer length in characters. */
export const STORY_LA_MAX_CHARS = 2000;
/** LAQ answer minimum, in characters for each student level. */
export const STORY_LA_CHARS_PER_LEVEL = 30;
/** Feedback requests allowed for one LAQ answer. */
export const STORY_LA_FEEDBACK_TRIES = 2;

/** The activity types of chapter answers. They are text values in `user_activity`; no enum change. */
export const STORY_ACTIVITY_TYPES = {
  mc: "STORIES_MC_QUESTION",
  sa: "STORIES_SA_QUESTION",
  la: "STORIES_LA_QUESTION",
} as const;

/** The three chapter question kinds. */
export const storyQuestionKindSchema = z.enum(["mc", "sa", "la"]);
export type StoryQuestionKind = z.infer<typeof storyQuestionKindSchema>;

/**
 * Smallest LAQ answer for a student level.
 * @param level The student reading level.
 * @returns The minimum number of characters.
 */
export function storyLaMinChars(level: number): number {
  return Math.max(1, Math.floor(level)) * STORY_LA_CHARS_PER_LEVEL;
}

/** Input of `getChapterQuestions`: the chapter id (a UUID). */
export const getChapterQuestionsInputSchema = z.object({ chapterId: z.string().uuid() });
export type GetChapterQuestionsInput = z.input<typeof getChapterQuestionsInputSchema>;

/** One MCQ for the client. It has no answer, no index of the answer, and no evidence text. */
export const chapterMcqSchema = z.object({
  id: z.string(),
  question: z.string(),
  options: z.array(z.string()),
});

/** One written question (SAQ or LAQ) for the client. It has no sample answer. */
export const chapterWrittenQuestionSchema = z.object({ id: z.string(), question: z.string() });

/**
 * Output of `getChapterQuestions`: up to 5 random MCQ, one SAQ, one LAQ, and what the user finished.
 * `mcScore` is the last MCQ score of the user (null before the first submit).
 */
export const getChapterQuestionsOutputSchema = z.object({
  chapterId: z.string(),
  mcq: z.array(chapterMcqSchema),
  saq: chapterWrittenQuestionSchema.nullable(),
  laq: chapterWrittenQuestionSchema.nullable(),
  done: z.object({ mc: z.boolean(), sa: z.boolean(), la: z.boolean() }),
  mcScore: z.number().int().min(0).nullable(),
});
export type GetChapterQuestionsOutput = z.infer<typeof getChapterQuestionsOutputSchema>;

/** Input of `gradeChapterMcq`: the chapter and the answer text for each question shown. */
export const gradeChapterMcqInputSchema = z.object({
  chapterId: z.string().uuid(),
  answers: z
    .array(z.object({ questionId: z.string().uuid(), answer: z.string().max(1000) }))
    .min(1)
    .max(STORY_MCQ_PER_QUIZ),
});
export type GradeChapterMcqInput = z.input<typeof gradeChapterMcqInputSchema>;

/**
 * Output of `gradeChapterMcq`: the server grade. `xpEarned` is the award if this is the first
 * submit of the chapter; the caller pays it only when the activity row is new.
 */
export const gradeChapterMcqOutputSchema = z.object({
  score: z.number().int().min(0),
  total: z.number().int().min(1),
  xpEarned: z.number().int().min(0),
  results: z.array(
    z.object({
      questionId: z.string(),
      question: z.string(),
      answer: z.string(),
      correct: z.boolean(),
      correctAnswer: z.string(),
      textualEvidence: z.string().nullable(),
    }),
  ),
});
export type GradeChapterMcqOutput = z.infer<typeof gradeChapterMcqOutputSchema>;

/** Input of `retakeChapterMcq`: the chapter id (a UUID). */
export const retakeChapterMcqInputSchema = z.object({ chapterId: z.string().uuid() });
export type RetakeChapterMcqInput = z.input<typeof retakeChapterMcqInputSchema>;

/**
 * Output of `retakeChapterMcq`: 5 fresh random MCQ without answers, and whether the chapter
 * still pays MC XP (`false` after the first submit: a retake gives a new score but no second XP).
 */
export const retakeChapterMcqOutputSchema = z.object({
  chapterId: z.string(),
  mcq: z.array(chapterMcqSchema),
  xpAvailable: z.boolean(),
});
export type RetakeChapterMcqOutput = z.infer<typeof retakeChapterMcqOutputSchema>;

/** Input of `resolveChapterWritten`: one SA or LA submit with the score and feedback of the AI. */
export const resolveChapterWrittenInputSchema = z.object({
  chapterId: z.string().uuid(),
  kind: z.enum(["sa", "la"]),
  questionId: z.string().uuid(),
  answer: z.string().trim().min(1).max(STORY_LA_MAX_CHARS),
  score: z.number(),
});
export type ResolveChapterWrittenInput = z.input<typeof resolveChapterWrittenInputSchema>;

/** Output of `resolveChapterWritten`: the question text and the XP award (score clamped to the cap). */
export const resolveChapterWrittenOutputSchema = z.object({
  question: z.string(),
  suggestedAnswer: z.string().nullable(),
  xpEarned: z.number().int().min(0),
});
export type ResolveChapterWrittenOutput = z.infer<typeof resolveChapterWrittenOutputSchema>;

/** Input of `getChapterWrittenQuestion`: the question the feedback is about. */
export const getChapterWrittenQuestionInputSchema = z.object({
  chapterId: z.string().uuid(),
  kind: z.enum(["sa", "la"]),
  questionId: z.string().uuid(),
});
export type GetChapterWrittenQuestionInput = z.input<typeof getChapterWrittenQuestionInputSchema>;

/** Output of `getChapterWrittenQuestion`: the question text and the sample answer (server use only). */
export const getChapterWrittenQuestionOutputSchema = z.object({
  question: z.string(),
  suggestedAnswer: z.string().nullable(),
});
export type GetChapterWrittenQuestionOutput = z.infer<typeof getChapterWrittenQuestionOutputSchema>;
