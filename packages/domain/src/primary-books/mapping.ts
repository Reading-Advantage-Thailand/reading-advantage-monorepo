/**
 * Pure mapping from a Workbooks lesson package to Primary rows (field map
 * `Workbooks/docs/content-plans/primary-db-field-map.md` v1.3). No database, no files.
 */
import { resolveObjective } from "../primary-mastery/objective-key.js";
import type { LessonPackage } from "./package-schema.js";

/** The book keys of the printed books and their names. Names always carry the product name. */
export const BOOKS: Record<string, { seriesKey: string; seriesName: string; name: string }> = {
  o2: { seriesKey: "origins", seriesName: "Primary Advantage Origins", name: "Primary Advantage Origins 2" },
  "o3-1": { seriesKey: "origins", seriesName: "Primary Advantage Origins", name: "Primary Advantage Origins 3.1" },
  "o3-2": { seriesKey: "origins", seriesName: "Primary Advantage Origins", name: "Primary Advantage Origins 3.2" },
  q4: { seriesKey: "quest", seriesName: "Primary Advantage Quest", name: "Primary Advantage Quest 4" },
};

/** The locales of the app's translation objects. */
const LOCALES = ["th", "cn", "tw", "vi"] as const;

/**
 * Splits a package key `o3-2/5` into the book key and the lesson number.
 * @param key The package `meta.key`.
 * @returns The book key and the lesson number.
 * @throws When the key has not the shape `<book>/<n>`.
 */
export function splitKey(key: string): { bookKey: string; number: number } {
  const match = /^([a-z0-9-]+)\/(\d+)$/.exec(key);
  if (!match) throw new Error(`Lesson key "${key}" is not <book>/<n>`);
  return { bookKey: match[1], number: Number(match[2]) };
}

/**
 * The legacy article id a package points at: the injected id, the printed source id, or the
 * article the new text replaces.
 * @param pkg The package.
 * @returns The legacy Prisma cuid, or null for a new article.
 */
export function legacyArticleIdOf(pkg: LessonPackage): string | null {
  return pkg.db.legacy?.articleId ?? pkg.meta.printed?.articleId ?? pkg.meta.replaces ?? null;
}

/** A word inside a sentence with its estimated start and end (seconds). */
export interface WordTime {
  word: string;
  start: number;
  end: number;
}

/**
 * Spreads the time of a sentence over its words by word length (the app marks the word under
 * the play head; the speech engine gives no word times).
 * @param sentence The sentence text.
 * @param start Sentence start in seconds.
 * @param end Sentence end in seconds.
 * @returns One entry per word, back to back.
 */
export function estimateWordTimes(sentence: string, start: number, end: number): WordTime[] {
  const words = sentence.split(/\s+/).filter(Boolean);
  const weights = words.map((word) => Math.max(1, word.replace(/[^\p{L}\p{N}]/gu, "").length) + 1);
  const total = weights.reduce((sum, weight) => sum + weight, 0) || 1;
  let at = start;
  return words.map((word, index) => {
    const length = ((end - start) * weights[index]) / total;
    const entry = { word, start: round(at), end: round(at + length) };
    at += length;
    return entry;
  });
}

const round = (value: number) => Math.round(value * 1000) / 1000;

/**
 * Builds the per-sentence Thai list in the order of the audio sentences. A sentence without a
 * Thai pair gets the English text (the reading view shows an empty string otherwise).
 * @param pkg The package.
 * @returns One Thai string per audio sentence.
 */
function thaiBySentence(pkg: LessonPackage): string[] {
  const pairs = new Map<string, string>();
  for (const paragraph of pkg.thai?.paragraphs ?? []) for (const pair of paragraph) pairs.set(normalize(pair.en), pair.th);
  return (pkg.audio?.sentences ?? []).map((sentence) => pairs.get(normalize(sentence.text)) ?? sentence.text);
}

const normalize = (text: string) => text.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");

/** Row values for the `articles` table (new article only; Tutor-read articles are never updated). */
export interface ArticleRow {
  id: string;
  title: string;
  content: string;
  summary: string;
  passage: string;
  type: string;
  genre: string | null;
  imageDescription: string | null;
  cefrLevel: string;
  raLevel: number;
  level: number;
  rating: number;
  audioUrl: string;
  audioWordUrl: string;
  sentences: { sentence: string; startTime: number; endTime: number; words: WordTime[] }[];
  translatedPassage: Record<(typeof LOCALES)[number], string[]>;
  translatedSummary: Record<(typeof LOCALES)[number], string>;
  published: boolean;
  isPublished: boolean;
  isApproved: boolean;
  isDraft: boolean;
}

/**
 * Maps a package to a new `articles` row.
 * @param pkg The package.
 * @param articleId The uuid of the new article.
 * @returns The row values.
 */
export function toArticleRow(pkg: LessonPackage, articleId: string): ArticleRow {
  const passage = pkg.text.paragraphs.join("\n\n");
  const thai = thaiBySentence(pkg);
  const english = (pkg.audio?.sentences ?? []).map((sentence) => sentence.text);
  const translated = (locale: string, index: number) => (locale === "th" ? thai[index] : english[index]);
  return {
    id: articleId,
    title: pkg.meta.title,
    content: passage,
    summary: pkg.text.summary,
    passage,
    type: pkg.meta.appType ?? "fiction",
    genre: pkg.meta.genre ?? null,
    imageDescription: pkg.images[0]?.prompt ?? null,
    cefrLevel: pkg.meta.cefrLevel,
    raLevel: pkg.meta.raLevel,
    level: pkg.meta.raLevel,
    rating: 5,
    audioUrl: `/audios/articles/${articleId}.mp3`,
    audioWordUrl: `/audios/words/${articleId}.mp3`,
    sentences: (pkg.audio?.sentences ?? []).map((sentence) => ({
      sentence: sentence.text,
      startTime: sentence.startTime,
      endTime: sentence.endTime,
      words: estimateWordTimes(sentence.text, sentence.startTime, sentence.endTime),
    })),
    translatedPassage: Object.fromEntries(LOCALES.map((locale) => [locale, english.map((_, index) => translated(locale, index))])) as ArticleRow["translatedPassage"],
    translatedSummary: Object.fromEntries(LOCALES.map((locale) => [locale, locale === "th" && pkg.thai?.summary ? pkg.thai.summary : pkg.text.summary])) as ArticleRow["translatedSummary"],
    published: true,
    isPublished: true,
    isApproved: true,
    isDraft: false,
  };
}

/** Question rows of one article. */
export interface QuestionRows {
  mcq: { id: string; articleId: string; question: string; options: string[]; correctAnswer: number; answer: string; textualEvidence: string | null; order: number }[];
  saq: { id: string; articleId: string; question: string; answer: string; sampleAnswer: string; order: number }[];
  laq: { id: string; articleId: string; question: string }[];
}

/**
 * Maps the question bank to the three question tables. Every row gets its id here so the
 * objective links (`toTagRows`) can name it.
 * @param pkg The package.
 * @param articleId The article uuid.
 * @param newId Makes a question uuid. Tests replace it.
 * @returns The rows of each question table, in bank order.
 * @throws When an MCQ answer is not one of its options.
 */
export function toQuestionRows(pkg: LessonPackage, articleId: string, newId: () => string = () => crypto.randomUUID()): QuestionRows {
  return {
    mcq: pkg.bank.mcq.map((item, order) => {
      const correctAnswer = item.options.indexOf(item.answer);
      if (correctAnswer < 0) throw new Error(`MCQ ${item.id} of ${pkg.meta.key}: the answer is not one of the options`);
      return { id: newId(), articleId, question: item.question, options: item.options, correctAnswer, answer: item.answer, textualEvidence: item.evidence ?? null, order };
    }),
    saq: pkg.bank.saq.map((item, order) => ({ id: newId(), articleId, question: item.question, answer: item.answer, sampleAnswer: item.answer, order })),
    laq: pkg.bank.laq.map((item) => ({ id: newId(), articleId, question: item.question })),
  };
}

/** The content-to-graph link rows of one article (track primary_objective_tags_20261006, FR-4). */
export interface TagRows {
  articleObjectives: { articleId: string; shortId: string; nodeId: string; role: "target" | "supporting"; graphRelease: string }[];
  questionObjectives: { articleId: string; questionId: string; questionType: "mcq" | "saq" | "laq"; shortId: string; nodeId: string; graphRelease: string }[];
  wordNodes: { articleId: string; word: string; pos: string; nodeId: string; role: "glossed" | "recycled"; graphRelease: string }[];
}

/** The graph commits the link rows record. */
export interface TagGraphRelease {
  gse: string;
  vocabulary: string;
}

/**
 * True when the package carries any objective or vocabulary tag.
 * @param pkg The package.
 * @returns Whether `toTagRows` would produce a row.
 */
export function hasTags(pkg: LessonPackage): boolean {
  const tags = pkg.tags;
  if (tags && (tags.targetObjectives.length || tags.supportingObjectives.length || tags.glossedNodes.length || tags.recycledNodes.length)) return true;
  return [...pkg.bank.mcq, ...pkg.bank.saq, ...pkg.bank.laq].some((item) => (item.objectives ?? []).length > 0);
}

/**
 * Splits a vocabulary node id `english.vocabulary.skill.<word>.<pos>` into its word and part of speech.
 * @param nodeId The node id.
 * @param key The package key, for the error.
 * @returns The word (the node's normalized form) and the part of speech.
 * @throws When the id does not have the five segments.
 */
function splitVocabularyNode(nodeId: string, key: string): { word: string; pos: string } {
  const parts = nodeId.split(".");
  if (parts.length !== 5 || parts[0] !== "english" || parts[1] !== "vocabulary" || parts[2] !== "skill") throw new Error(`${key}: vocabulary node id "${nodeId}" is not english.vocabulary.skill.<word>.<pos>`);
  return { word: parts[3], pos: parts[4] };
}

/**
 * Maps the package tags to the three link tables. The article objectives and the word nodes
 * need only the article; the question objectives need the question rows with their ids, so a
 * linked legacy article (whose questions Tutor reads and the backfill links) passes null.
 * @param pkg The package.
 * @param articleId The article uuid.
 * @param rows The question rows of this import, or null when no question row is written.
 * @param release The GSE and vocabulary graph commits to record.
 * @returns The link rows, without duplicates.
 * @throws When a short id is not in the objective key or a node id is malformed; the message names the package.
 */
export function toTagRows(pkg: LessonPackage, articleId: string, rows: QuestionRows | null, release: TagGraphRelease): TagRows {
  const resolve = (shortId: string): string => {
    try {
      return resolveObjective(shortId).nodeId;
    } catch (error) {
      throw new Error(`${pkg.meta.key}: ${error instanceof Error ? error.message : String(error)}`);
    }
  };
  const tags = pkg.tags ?? { targetObjectives: [], supportingObjectives: [], glossedNodes: [], recycledNodes: [] };
  const articleObjectives: TagRows["articleObjectives"] = [];
  const seenArticle = new Set<string>();
  for (const [role, ids] of [["target", tags.targetObjectives], ["supporting", tags.supportingObjectives]] as const) {
    for (const shortId of ids) {
      if (seenArticle.has(`${shortId}:${role}`)) continue;
      seenArticle.add(`${shortId}:${role}`);
      articleObjectives.push({ articleId, shortId, nodeId: resolve(shortId), role, graphRelease: release.gse });
    }
  }
  const questionObjectives: TagRows["questionObjectives"] = [];
  if (rows) {
    for (const [questionType, items, written] of [["mcq", pkg.bank.mcq, rows.mcq], ["saq", pkg.bank.saq, rows.saq], ["laq", pkg.bank.laq, rows.laq]] as const) {
      items.forEach((item, index) => {
        const questionId = written[index]?.id;
        if (!questionId) throw new Error(`${pkg.meta.key}: no row for ${questionType} ${item.id}`);
        for (const shortId of new Set(item.objectives ?? [])) questionObjectives.push({ articleId, questionId, questionType, shortId, nodeId: resolve(shortId), graphRelease: release.gse });
      });
    }
  }
  const wordNodes: TagRows["wordNodes"] = [];
  const seenNode = new Set<string>();
  for (const [role, ids] of [["glossed", tags.glossedNodes], ["recycled", tags.recycledNodes]] as const) {
    for (const nodeId of ids) {
      if (seenNode.has(nodeId)) continue;
      seenNode.add(nodeId);
      wordNodes.push({ articleId, ...splitVocabularyNode(nodeId, pkg.meta.key), nodeId, role, graphRelease: release.vocabulary });
    }
  }
  return { articleObjectives, questionObjectives, wordNodes };
}

/** The `sentencs_and_words_for_flashcard` row of one article (Tutor reads this shape). */
export interface FlashcardRow {
  articleId: string;
  sentence: { sentence: string; translation: Record<(typeof LOCALES)[number], string>; timeSeconds: number }[];
  audioSentencesUrl: string;
  words: { vocabulary: string; definition: { en: string; th: string; cn: string; tw: string; vi: string }; timeSeconds: number }[];
  wordsUrl: string;
}

/**
 * Maps the flashcard sentences (`audio.flashcardTimes`) and the glossary to the flashcard row.
 * @param pkg The package.
 * @param articleId The article uuid.
 * @returns The row values.
 */
export function toFlashcardRow(pkg: LessonPackage, articleId: string): FlashcardRow {
  const thai = new Map((pkg.audio?.sentences ?? []).map((sentence, index) => [normalize(sentence.text), thaiBySentence(pkg)[index]]));
  const wordTimes = new Map((pkg.audio?.wordTimes ?? []).map((word) => [normalize(word.text), word.startTime]));
  return {
    articleId,
    sentence: (pkg.audio?.flashcardTimes ?? []).map((item) => {
      const th = thai.get(normalize(item.text)) ?? item.text;
      return { sentence: item.text, translation: { th, cn: item.text, tw: item.text, vi: item.text }, timeSeconds: item.startTime };
    }),
    audioSentencesUrl: `audios/sentences/${articleId}.mp3`,
    words: pkg.glossary.map((entry) => ({
      vocabulary: entry.word,
      definition: { en: entry.definition, th: entry.thai || entry.definition, cn: entry.definition, tw: entry.definition, vi: entry.definition },
      timeSeconds: wordTimes.get(normalize(entry.word)) ?? 0,
    })),
    wordsUrl: `audios/words/${articleId}.mp3`,
  };
}

/**
 * The package parts the teacher screens need (answer keys, print set, activities, glossary).
 * Media, approvals, and database ids stay out.
 * @param pkg The package.
 * @returns The JSON stored on the lesson row.
 */
export function toLessonPackageJson(pkg: LessonPackage): Record<string, unknown> {
  return {
    glossary: pkg.glossary,
    bank: pkg.bank,
    print: pkg.print ?? null,
    activities: pkg.activities ?? null,
    summary: pkg.text.summary,
    thaiSummary: pkg.thai?.summary ?? null,
    tags: pkg.tags ?? null,
    images: pkg.images.map((image) => ({ position: image.position ?? null, caption: image.caption ?? null })),
  };
}
