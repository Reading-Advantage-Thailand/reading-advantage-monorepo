/**
 * The Storytime week contract (plan task 2.2, spec FR-3).
 *
 * It follows Workbooks `StorytimeWeekSchema` version 1
 * (`~/Desktop/Workbooks/dashboard/lib/storytime/schema.ts`) for the fields that the app reads.
 * Every object passes unknown keys through, because Workbooks owns the schema and the app must
 * accept a field that a later phase does not read yet. A published week needs one book of each
 * kind and a picture on every page. A wrong version, a time out of order, and a media path that
 * leaves the content folder fail with their field path.
 *
 * The print part, the approvals, and the database stamps stay `unknown`: production owns them and
 * the app never reads them. Tighten them only when an app page reads them.
 */
import { z } from "zod";

/**
 * A media path relative to the Storytime content folder.
 *
 * The path becomes a file path in a later phase, so an absolute path and a parent segment fail.
 */
const mediaPath = z
  .string()
  .min(1)
  .refine((path) => !path.startsWith("/") && !path.includes("\\"), {
    message: "a media path stays inside the content folder",
  })
  .refine((path) => !path.split("/").includes(".."), {
    message: "a media path holds no parent segment",
  });

/** English text with its Thai. An empty Thai string means "not yet". */
const biText = z
  .object({
    en: z.string().min(1),
    th: z.string().default(""),
  })
  .passthrough();

/** A picture of a book page, a song line, a cover, or a family word. */
export const imageSchema = z
  .object({
    prompt: z.string().min(1).optional(),
    characters: z.array(z.string().min(1)).default([]),
    caption: z.string().default(""),
    /** The final picture, relative to the content folder. */
    file: mediaPath.optional(),
  })
  .passthrough();

/** One word of a sentence timing. */
export const wordTimingSchema = z
  .object({
    word: z.string(),
    start: z.number().min(0),
    end: z.number().min(0),
  })
  .passthrough();

/** One sentence of a book audio, with its 1-based page for a book. */
export const sentenceTimepointSchema = z
  .object({
    sentence: z.string(),
    startTime: z.number().min(0),
    endTime: z.number().min(0),
    words: z.array(wordTimingSchema).default([]),
    page: z.number().int().min(1).optional(),
  })
  .passthrough();

/** The audio of a book: the narration and the real slow reading. */
export const bookAudioSchema = z
  .object({
    voice: z.string().optional(),
    file: mediaPath.optional(),
    sentences: z.array(sentenceTimepointSchema).default([]),
    slowFile: mediaPath.optional(),
    slowSentences: z.array(sentenceTimepointSchema).default([]),
  })
  .passthrough();

/** One page of a book. */
export const bookPageSchema = z
  .object({
    text: z.string().min(1),
    image: imageSchema.optional(),
  })
  .passthrough();

/** The "Sounds in this book" page of a decodable. */
export const soundsPageSchema = z
  .object({
    element: z.string().min(1),
    words: z.array(z.string().min(1)).default([]),
    tricky: z.array(z.string().min(1)).default([]),
  })
  .passthrough();

/** One book of a week: the read-along and the decodable. */
export const bookSchema = z
  .object({
    kind: z.enum(["readalong", "decodable"]),
    /** A decodable of a week before the first vowel: one picture word on each page. */
    soundBook: z.boolean().optional(),
    title: z.string().min(1),
    cover: imageSchema.optional(),
    pages: z.array(bookPageSchema).min(1),
    soundsPage: soundsPageSchema.optional(),
    backWords: z.array(z.string().min(1)).default([]),
    /** Names that the reader learns as whole words. */
    names: z.array(z.string().min(1)).default([]),
    audio: bookAudioSchema.default({ sentences: [], slowSentences: [] }),
  })
  .passthrough();

/** The sound of the week and its action. */
export const elementSchema = z
  .object({
    id: z.string().min(1),
    graphemes: z.array(z.string().min(1)).min(1),
    sound: z.string().min(1),
    action: biText.optional(),
    /** Daniel's recording of the sound, relative to the content folder. */
    audio: mediaPath.optional(),
  })
  .passthrough();

/** A picture word of the week's family. */
export const familyWordSchema = z
  .object({
    word: z.string().min(1),
    image: imageSchema.optional(),
  })
  .passthrough();

/** What the week teaches. */
export const focusSchema = z
  .object({
    /** Absent in the listening weeks and in the review weeks. */
    element: elementSchema.optional(),
    paSkill: biText.optional(),
    trickyWords: z.array(z.string().min(1)).default([]),
    frame: z.string().optional(),
    family: z
      .object({
        name: biText.optional(),
        words: z.array(familyWordSchema).default([]),
        max: z.number().int().min(8).max(10).default(8),
      })
      .passthrough()
      .optional(),
    wordWall: z.array(z.string().min(1)).default([]),
  })
  .passthrough();

/** The 1-minute sound game of the five days. */
export const openingSchema = z
  .object({
    pa: z.array(biText).length(5),
    audio: z.array(z.array(z.string().min(1))).length(5).optional(),
  })
  .passthrough();

/** One line of the song, as it is sung. */
export const songLineSchema = z
  .object({
    text: z.string().min(1),
    part: z.enum(["verse", "chorus"]),
    /** One of the 24 named gestures. */
    gesture: z.string().min(1),
    image: imageSchema.optional(),
    /** A repeated line shows the picture of an earlier line: its 0-based index. */
    imageOf: z.number().int().min(0).optional(),
    note: biText.optional(),
    bubble: z.object({ kind: z.literal("thought"), prop: z.string().min(1) }).passthrough().optional(),
    pop: z.string().min(1).optional(),
  })
  .passthrough();

/** The song of the week and its media files. */
export const songSchema = z
  .object({
    title: z.string().min(1),
    lines: z.array(songLineSchema).min(1),
    audio: mediaPath.optional(),
    video: mediaPath.optional(),
    videoPhone: mediaPath.optional(),
    poster: mediaPath.optional(),
    posterPhone: mediaPath.optional(),
    karaoke: mediaPath.optional(),
    /** One entry per sung line, with its word times. */
    times: z.array(sentenceTimepointSchema).default([]),
  })
  .passthrough();

/** The four headings of a teacher note. */
export const noteSchema = z
  .object({
    teacherActions: z.array(z.string().min(1)).default([]),
    teacherLanguage: z.array(z.string().min(1)).default([]),
    studentActions: z.array(z.string().min(1)).default([]),
    watchFor: z.array(z.string().min(1)).default([]),
  })
  .passthrough();

/** One step of a lesson. */
export const stepSchema = z
  .object({
    id: z.string().min(1),
    title: biText,
    minutes: z.number().int().min(0).max(20),
    en: noteSchema,
    th: noteSchema.optional(),
    easier: biText,
    harder: biText,
    group: biText,
    materials: z.array(z.string().min(1)).default([]),
    moved: z.literal("next-opening").optional(),
  })
  .passthrough();

/** One lesson day. */
export const scriptSchema = z
  .object({
    id: z.string().min(1),
    day: z.number().int().min(1).max(5),
    title: biText,
    prep: z.array(biText).default([]),
    steps: z.array(stepSchema).min(1),
  })
  .passthrough();

/** One card of a review strip. */
export const stripCardSchema = z
  .object({
    kind: z.enum(["sound", "tricky", "frame", "word"]),
    text: z.string().min(1),
    week: z.number().int().min(1),
    audio: mediaPath.optional(),
  })
  .passthrough();

/** One day of the printed review deck. */
export const stripSchema = z
  .object({
    day: z.number().int().min(1).max(5),
    cards: z.array(stripCardSchema).default([]),
  })
  .passthrough();

/** One item of the Friday check. */
export const checkItemSchema = z.discriminatedUnion("kind", [
  z
    .object({
      kind: z.literal("circle-picture"),
      sound: z.string().min(1),
      position: z.enum(["first", "middle", "last"]).default("first"),
      pictures: z.array(z.string().min(1)).min(2),
      answer: z.string().min(1),
    })
    .passthrough(),
  z.object({ kind: z.literal("write-word"), word: z.string().min(1) }).passthrough(),
  z
    .object({
      kind: z.literal("write-letter"),
      letter: z.string().min(1),
      sound: z.string().min(1).optional(),
    })
    .passthrough(),
  z
    .object({
      kind: z.literal("picture-sort"),
      groups: z
        .array(z.object({ sound: z.string().min(1), pictures: z.array(z.string().min(1)).min(1) }).passthrough())
        .min(2),
      position: z.enum(["first", "middle", "last"]).default("first"),
    })
    .passthrough(),
  z
    .object({
      kind: z.literal("circle-word"),
      words: z.array(z.string().min(1)).min(2),
      answer: z.string().min(1),
    })
    .passthrough(),
]);

/** The Friday check of the week. */
export const checkSchema = z
  .object({
    items: z.array(checkItemSchema).default([]),
  })
  .passthrough()
  .default({ items: [] });

/** The home card of the week. */
export const homeSchema = z
  .object({
    words: z.array(z.string().min(1)).default([]),
    line: biText.optional(),
    activity: biText.optional(),
    songUrl: z.string().optional(),
    readAlongUrl: z.string().optional(),
  })
  .passthrough();

/** The phonics tags of the week. */
export const tagsSchema = z
  .object({
    graphVersion: z.string().default(""),
    taught: z.array(z.string().min(1)).default([]),
    reviewed: z.array(z.string().min(1)).default([]),
  })
  .passthrough()
  .default({ graphVersion: "", taught: [], reviewed: [] });

/** The week header, with its level, its week number, and its publication status. */
export const metaSchema = z
  .object({
    program: z.literal("storytime"),
    shape: z.literal("storytime-week"),
    level: z.number().int().min(1).max(4),
    week: z.number().int().min(1).max(32),
    unit: z.number().int().min(1).optional(),
    /** `st<level>/<week>`, the stable URL key. */
    key: z.string().regex(/^st[1-4]\/\d+$/),
    kind: z.enum(["teach", "review"]).default("teach"),
    periodMinutes: z.number().int().min(20).max(60).optional(),
    openingMinutes: z.number().int().min(1).max(15).optional(),
    title: z.string().min(1),
    band: z.enum(["Seed", "Sprout", "Leaf", "Bud", "Flower"]).optional(),
    /** Only a published week is on the public QR page. */
    status: z.enum(["draft", "published"]).default("draft"),
  })
  .passthrough();

/** The book kinds that a published week must each hold once (spec FR-3). */
export const PUBLISHED_BOOK_KINDS = ["readalong", "decodable"] as const;

/**
 * Reports a sentence timing whose end comes before its start, and a word timing out of order.
 * @param sentences The sentence timings of one audio.
 * @param path The field path of the issue.
 * @param ctx The refinement context.
 */
function checkTiming(
  sentences: Array<{
    startTime: number;
    endTime: number;
    words: Array<{ start: number; end: number }>;
  }>,
  path: Array<string | number>,
  ctx: z.RefinementCtx,
): void {
  sentences.forEach((sentence, sentenceIndex) => {
    if (sentence.endTime < sentence.startTime) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [...path, sentenceIndex, "endTime"],
        message: "the sentence end comes before its start",
      });
    }
    sentence.words.forEach((word, wordIndex) => {
      if (word.end < word.start) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [...path, sentenceIndex, "words", wordIndex, "end"],
          message: "the word end comes before its start",
        });
      }
    });
  });
}

/**
 * Applies the rules that a published week must meet, and the time order that every week must meet.
 * @param week The parsed week.
 * @param ctx The refinement context.
 */
function checkWeek(week: z.infer<typeof weekBodySchema>, ctx: z.RefinementCtx): void {
  week.books.forEach((book, bookIndex) => {
    checkTiming(book.audio.sentences, ["books", bookIndex, "audio", "sentences"], ctx);
    checkTiming(book.audio.slowSentences, ["books", bookIndex, "audio", "slowSentences"], ctx);
  });
  if (week.song) checkTiming(week.song.times, ["song", "times"], ctx);
  if (week.meta.status !== "published") return;
  for (const kind of PUBLISHED_BOOK_KINDS) {
    const count = week.books.filter((book) => book.kind === kind).length;
    if (count !== 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["books"],
        message: `a published week needs one ${kind} book, and it has ${count}`,
      });
    }
  }
  week.books.forEach((book, bookIndex) => {
    book.pages.forEach((page, pageIndex) => {
      if (!page.image) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["books", bookIndex, "pages", pageIndex, "image"],
          message: "a published week needs a picture on every page",
        });
      }
    });
  });
}

/** The week body without the published-week rules, so that the rules keep the field paths. */
const weekBodySchema = z
  .object({
    version: z.literal(1),
    meta: metaSchema,
    focus: focusSchema,
    opening: openingSchema.optional(),
    books: z.array(bookSchema).default([]),
    song: songSchema.optional(),
    scripts: z.array(scriptSchema).default([]),
    review: z.array(stripSchema).default([]),
    check: checkSchema,
    home: homeSchema.optional(),
    tags: tagsSchema,
    /** Production owns the parts below; no app page reads them. */
    block: z.unknown().optional(),
    benchmark: z.unknown().optional(),
    print: z.unknown().optional(),
    approval: z.unknown().optional(),
    db: z.unknown().optional(),
  })
  .passthrough();

/** The contract of one Storytime week, version 1 (spec FR-3). */
export const weekSchema = weekBodySchema.superRefine(checkWeek);

/** One Storytime week. */
export type StorytimeWeek = z.infer<typeof weekSchema>;

/** One book of a week. */
export type StorytimeBook = z.infer<typeof bookSchema>;

/** One sentence of a book audio. */
export type StorytimeSentence = z.infer<typeof sentenceTimepointSchema>;

/** One media file that a week needs. */
export interface WeekMedia {
  /** The file, relative to the content folder. */
  file: string;
  /** The kind of media. */
  kind: string;
  /** The generation rule that checks this kind. */
  rule: string;
}
