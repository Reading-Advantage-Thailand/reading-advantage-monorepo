/**
 * The Storytime week contract (plan task 2.2, spec FR-3).
 *
 * It follows Workbooks `StorytimeWeekSchema` version 1
 * (`~/Desktop/Workbooks/dashboard/lib/storytime/schema.ts`) for the fields that the app reads.
 * Every object passes unknown keys through, because Workbooks owns the schema and the app must
 * accept a field that a later phase does not read yet. A published week needs one book of each
 * kind and an image entry on every page; the picture file may follow later. A wrong version, a
 * time out of order, a key that does not match the level and week, and a media path that leaves
 * the content folder fail with their field path.
 *
 * The print part, the approvals, and the database stamps stay `unknown`: production owns them and
 * the app never reads them. Tighten them only when an app page reads them.
 *
 * The seven A-42 fields (spec FR-13) are read schemas: `blendDrill`, `soundLoop`, `sightWords`,
 * `loopMinutes`, `questions`, `recall`, and the loops approval part. They keep the passthrough,
 * and their limits are the limits of the Workbooks hand-off. The app checks the recall count and
 * the question page and word only when the loops part is approved.
 */
import { z } from "zod";
import { loopsApproved, STORYTIME_LOOPS_PART } from "../loops";

export { loopsApproved, STORYTIME_LOOPS_PART };

/** The longest media path that the contract accepts. */
const MEDIA_PATH_MAX = 200;

/**
 * A media path relative to the Storytime content folder.
 *
 * The path becomes a file path or a URL in a later phase, so it is an allowlist: letters, digits,
 * dot, dash, and underscore in segments that a slash separates. A URL, a drive, an absolute path,
 * a backslash, a control byte, an empty segment, a `.` or `..` segment, and a long name fail.
 */
const mediaPath = z
  .string()
  .min(1)
  .refine((path) => path.length <= MEDIA_PATH_MAX, {
    message: `a media path holds at most ${MEDIA_PATH_MAX} characters`,
  })
  .refine((path) => /^[A-Za-z0-9._-]+(\/[A-Za-z0-9._-]+)*$/.test(path), {
    message: "a media path holds letters, digits, dot, dash, underscore, and slash between names",
  })
  .refine((path) => !path.split("/").includes(".."), {
    message: "a media path holds no parent segment",
  })
  .refine((path) => !path.split("/").includes("."), {
    message: "a media path holds no current-directory segment",
  });

/**
 * The name of a recording of the phoneme bank (G3).
 *
 * Every drill clip and every recall clip is a recording of the bank. The name is
 * `phonemes/daniel/<NN>-<label>.mp3`, and the label holds lower-case letters and dashes. The rule
 * is one constant, next to the media path rule, and the receiver uses it for the media list.
 */
export const PHONEME_CLIP_PATTERN = /^phonemes\/daniel\/[0-9]{2}-[a-z]+(-[a-z]+)*\.mp3$/;

/**
 * A recording of the phoneme bank, relative to the content folder.
 *
 * The path must hold the media path rule and the name rule of the bank.
 */
const phonemeClipPath = mediaPath.refine((path) => PHONEME_CLIP_PATTERN.test(path), {
  message: "a clip of the phoneme bank holds the name phonemes/daniel/<NN>-<label>.mp3",
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
    start: z.number().min(0).finite(),
    end: z.number().min(0).finite(),
  })
  .passthrough();

/** One sentence of a book audio, with its 1-based page for a book. */
export const sentenceTimepointSchema = z
  .object({
    sentence: z.string(),
    startTime: z.number().min(0).finite(),
    endTime: z.number().min(0).finite(),
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

/** One question of a read-along book, with the page and the word of its answer. */
export const bookQuestionSchema = z
  .object({
    /** The question word: who, what, or where. Each kind appears once. */
    kind: z.enum(["who", "what", "where"]),
    /** The question line. The Thai prompt is `ask.th`. */
    ask: biText,
    /** The 1-based reader page and the picture word on that page. */
    answer: z.object({ page: z.number().int(), word: z.string().min(1) }).passthrough(),
  })
  .passthrough();

/** The three questions of a read-along book, one of each kind. */
const bookQuestionsSchema = z
  .array(bookQuestionSchema)
  .length(3)
  .refine((questions) => new Set(questions.map((question) => question.kind)).size === 3, {
    message: "each question kind appears once",
  });

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
    /** The three comprehension questions of a read-along book (spec FR-13). */
    questions: bookQuestionsSchema.optional(),
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
    audio: z.array(z.array(mediaPath)).length(5).optional(),
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

/**
 * One word of the oral blend drill of a step.
 *
 * The sound labels are the sounds of the bank in the form `/n/`. The recordings of the sounds,
 * when the week holds them, come in the order of the sound list.
 */
export const blendDrillWordSchema = z
  .object({
    word: z.string().min(1),
    /** 2 to 4 sound labels. */
    sounds: z.array(z.string().min(1)).min(2).max(4),
    /** The recordings of the sounds, in the order of `sounds`. */
    audio: z.array(phonemeClipPath).optional(),
  })
  .passthrough()
  .superRefine((word, ctx) => {
    if (!word.audio || word.audio.length === word.sounds.length) return;
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["audio"],
      message: `the clip list holds ${word.audio.length} clips and the sound list holds ${word.sounds.length}`,
    });
  });

/** The oral blend drill of a step (spec FR-13). */
export const blendDrillSchema = z
  .object({
    /** 3 to 5 drill words. */
    words: z.array(blendDrillWordSchema).min(3).max(5),
    /** The teacher models the word. */
    model: biText,
    /** The teacher leads the class. */
    lead: biText,
    /** The teacher tests the class. */
    test: biText,
    /** How many times the class says each word, 2 to 5. */
    repeats: z.number().int().min(2).max(5),
    /** What the teacher says when a child errs. */
    correction: biText,
  })
  .passthrough();

/** The correct, practise, and retest loop of a sound step (spec FR-13). */
export const soundLoopSchema = z
  .object({
    /** The teacher models the sound again. */
    correct: biText,
    /** The class practises the sound. */
    practise: biText,
    /** The teacher retests the item. */
    retest: biText,
  })
  .passthrough();

/** The fast-way sight-word card of a step (spec FR-13). */
export const sightWordsSchema = z
  .object({
    /** 1 to 3 words of the step. */
    words: z.array(z.string().min(1)).min(1).max(3),
    /** The slide-a-finger line. */
    slide: biText,
    /** The timed check line. */
    check: biText,
    /** The time that the child has for one word, 2 to 5 seconds. */
    seconds: z.number().int().min(2).max(5),
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
    /** The oral blend drill of the step. */
    blendDrill: blendDrillSchema.optional(),
    /** The correct, practise, and retest loop of the step. */
    soundLoop: soundLoopSchema.optional(),
    /** The fast-way sight-word card of the step. */
    sightWords: sightWordsSchema.optional(),
    /** The step minutes when the loops show, 0 to 20. */
    loopMinutes: z.number().int().min(0).max(20).optional(),
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

/** One card of a recall. The card holds a recording of the phoneme bank. */
export const recallCardSchema = stripCardSchema.extend({
  audio: phonemeClipPath.optional(),
});

/** The recall cards of a day and the line that asks for them (spec FR-13). */
export const recallSchema = z
  .object({
    items: z.array(recallCardSchema),
    ask: biText,
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
    /** The recall of the day, shown in the opening. */
    recall: recallSchema.optional(),
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

/** The parts of a week that Daniel approves (spec FR-3). */
export const STORYTIME_APPROVAL_PARTS = ["text", "thai", "images", "audio", "song", "scripts"] as const;

/**
 * One approval part of a week.
 *
 * The part holds the status of the approval, and the date, the source, and the words of the
 * approval when production records them. The app reads only the status of the three media parts.
 */
export const storytimeAppApprovalSchema = z
  .object({
    status: z.enum(["draft", "approved"]),
    date: z.string().optional(),
    source: z.string().min(1).optional(),
    words: z.string().optional(),
  })
  .passthrough();

/**
 * Daniel's approval of the loops of a week (spec FR-13).
 *
 * An approved part needs the date of the approval and the exact words of the approval. A draft
 * part needs neither. The part gates the routines in the app, not the publication of the week.
 */
export const storytimeLoopsApprovalSchema = storytimeAppApprovalSchema.superRefine((part, ctx) => {
  if (part.status !== "approved") return;
  if (!part.date) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["date"],
      message: "an approved loops part needs the date of the approval",
    });
  }
  if (part.words === undefined || part.words.trim() === "") {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["words"],
      message: "an approved loops part needs the exact words of the approval",
    });
  }
});

/** The approval parts of a week, with the loops part. */
export const storytimeApprovalsSchema = z
  .object({
    text: storytimeAppApprovalSchema.optional(),
    thai: storytimeAppApprovalSchema.optional(),
    images: storytimeAppApprovalSchema.optional(),
    audio: storytimeAppApprovalSchema.optional(),
    song: storytimeAppApprovalSchema.optional(),
    scripts: storytimeAppApprovalSchema.optional(),
    /** The loops part. An absent part means a draft. */
    loops: storytimeLoopsApprovalSchema.optional(),
  })
  .passthrough();

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

/** The seconds of rounding that the timing order checks allow. */
const TIMING_SLACK_SECONDS = 0.001;

/**
 * Reports the timings that the player cannot follow: a sentence that starts before the sentence
 * before it starts or ends, a word that starts before the word before it, a word outside the time
 * range of its sentence, a page beyond the pages of the book, and a page with no sentence.
 *
 * A word may overlap the word before it: the player picks the last word whose start has passed,
 * and a shipped week holds one such overlap of 0.04 s.
 * @param sentences The sentence timings of one audio.
 * @param path The field path of the timings.
 * @param ctx The refinement context.
 * @param pageCount The number of pages of the book; absent for a song.
 */
function checkPlayerOrder(
  sentences: Array<{
    startTime: number;
    endTime: number;
    page?: number;
    words: Array<{ start: number; end: number }>;
  }>,
  path: Array<string | number>,
  ctx: z.RefinementCtx,
  pageCount?: number,
): void {
  let previousStart = 0;
  let previousEnd = 0;
  sentences.forEach((sentence, sentenceIndex) => {
    if (sentence.startTime < previousStart) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [...path, sentenceIndex, "startTime"],
        message: "the sentence starts before the sentence before it",
      });
    } else if (sentence.startTime < previousEnd - TIMING_SLACK_SECONDS) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [...path, sentenceIndex, "startTime"],
        message: "the sentence starts before the sentence before it ends",
      });
    }
    previousStart = Math.max(previousStart, sentence.startTime);
    previousEnd = Math.max(previousEnd, sentence.endTime);
    if (pageCount !== undefined && sentence.page !== undefined && sentence.page > pageCount) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [...path, sentenceIndex, "page"],
        message: `the page ${sentence.page} is beyond the ${pageCount} pages of the book`,
      });
    }
    let previousWordStart = 0;
    sentence.words.forEach((word, wordIndex) => {
      if (word.start < previousWordStart - TIMING_SLACK_SECONDS) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [...path, sentenceIndex, "words", wordIndex, "start"],
          message: "the word starts before the word before it",
        });
      }
      previousWordStart = Math.max(previousWordStart, word.start);
      if (word.start < sentence.startTime - TIMING_SLACK_SECONDS) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [...path, sentenceIndex, "words", wordIndex, "start"],
          message: "the word starts before its sentence",
        });
      }
      if (word.end > sentence.endTime + TIMING_SLACK_SECONDS) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [...path, sentenceIndex, "words", wordIndex, "end"],
          message: "the word ends after its sentence",
        });
      }
    });
  });
  if (pageCount !== undefined && sentences.some((sentence) => sentence.page !== undefined)) {
    for (let page = 1; page <= pageCount; page += 1) {
      if (!sentences.some((sentence) => (sentence.page ?? 1) === page)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path,
          message: `the page ${page} has no sentence in the audio timings`,
        });
      }
    }
  }
}

/**
 * Reports the sentences of a published book that hold no page (finding F99).
 *
 * A sentence without a page has no picture for the page-audio coverage. An empty list passes,
 * because the media list owns the missing audio.
 * @param book The book of the week.
 * @param bookIndex The index of the book in the week.
 * @param ctx The refinement context.
 */
function checkPageAudio(
  book: z.infer<typeof bookSchema>,
  bookIndex: number,
  ctx: z.RefinementCtx,
): void {
  const lists: Array<[string, z.infer<typeof sentenceTimepointSchema>[]]> = [
    ["sentences", book.audio.sentences],
    ["slowSentences", book.audio.slowSentences],
  ];
  for (const [name, sentences] of lists) {
    sentences.forEach((sentence, sentenceIndex) => {
      if (sentence.page !== undefined) return;
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["books", bookIndex, "audio", name, sentenceIndex, "page"],
        message: "a published book needs a page on every sentence",
      });
    });
  }
}

/** The number of cards of a recall (spec FR-13). */
const RECALL_CARDS = 5;

/**
 * Reports the errors of the loops that the app checks (spec FR-13, AC-13.2, AC-13.3).
 *
 * The app checks the recall count and the question page and word only when the loops part is
 * approved. A draft week holds the shapes only, so a draft error of the recall count or of the
 * question check never stops the receipt of a week.
 * @param week The parsed week.
 * @param ctx The refinement context.
 */
/**
 * Reports whether a page text holds a word as a whole word.
 *
 * The check compares lower-cased text and matches on a word boundary, so the answer word
 * `at` does not match the page text `cat` (finding F132 of the Phase 3 review at e9c1908fd).
 * @param text The text of the page.
 * @param word The answer word of the question.
 * @returns `true` when the lower-cased word appears with no letter or digit on either side.
 */
function pageHoldsWord(text: string, word: string): boolean {
  const escaped = word.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`, "u").test(
    text.toLowerCase(),
  );
}

function checkLoops(week: z.infer<typeof weekBodySchema>, ctx: z.RefinementCtx): void {
  if (!loopsApproved(week)) return;
  week.scripts.forEach((script, scriptIndex) => {
    const recall = script.recall;
    if (!recall || recall.items.length === RECALL_CARDS) return;
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["scripts", scriptIndex, "recall", "items"],
      message: `a recall holds ${RECALL_CARDS} cards, and it holds ${recall.items.length}`,
    });
  });
  week.books.forEach((book, bookIndex) => {
    (book.questions ?? []).forEach((question, questionIndex) => {
      const page = book.pages[question.answer.page - 1];
      if (!page) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["books", bookIndex, "questions", questionIndex, "answer", "page"],
          message: `the page ${question.answer.page} is beyond the ${book.pages.length} pages of the book`,
        });
        return;
      }
      if (!pageHoldsWord(page.text, question.answer.word)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["books", bookIndex, "questions", questionIndex, "answer", "word"],
          message: `the page ${question.answer.page} does not hold the word ${question.answer.word}`,
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
  const key = `st${week.meta.level}/${week.meta.week}`;
  if (week.meta.key !== key) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["meta", "key"],
      message: `the key ${week.meta.key} does not match the level and week; it must be ${key}`,
    });
  }
  checkLoops(week, ctx);
  if (week.meta.status !== "published") return;
  week.books.forEach((book, bookIndex) => {
    const pageCount = book.pages.length;
    checkPlayerOrder(book.audio.sentences, ["books", bookIndex, "audio", "sentences"], ctx, pageCount);
    checkPlayerOrder(book.audio.slowSentences, ["books", bookIndex, "audio", "slowSentences"], ctx, pageCount);
    checkPageAudio(book, bookIndex, ctx);
  });
  if (week.song) checkPlayerOrder(week.song.times, ["song", "times"], ctx);
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
    /** The approval parts of the week. The app reads the status of the media parts and of the
     * loops part. */
    approval: storytimeApprovalsSchema.optional(),
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
  /** The file, relative to the content folder. For a missing picture, the field path of the
   * image inside the week, not a file name. */
  file: string;
  /** The kind of media. */
  kind: string;
  /** The generation rule that checks this kind. */
  rule: string;
  /** Set when the picture has no file yet; names the book kind and the page number. */
  missing?: string;
}
