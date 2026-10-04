/**
 * Story compatibility and migration helpers of the 3D kit: `isCompatible` (does a game support a
 * story's level and size) and `fromStoryPack` (the old demo story pack shape). The story contract
 * itself lives in `@reading-advantage/game-contracts`.
 */
import { z } from 'zod';
import { normalizeCefrLevel, parseStoryInput, type PracticeInput, type StoryInput } from '@reading-advantage/game-contracts';
import type { Cartridge3DManifest } from './manifest.js';

// ---------------------------------------------------------------- compatibility (section 5.4)

/** True when the game supports the story's level and the story has enough items for it. */
export function isCompatible(
  manifest: Pick<Cartridge3DManifest, 'levels' | 'needs'>,
  story: StoryInput,
): boolean {
  return (
    manifest.levels.includes(story.level) &&
    story.vocabulary.length >= manifest.needs.vocabulary &&
    story.sentences.length >= manifest.needs.sentences &&
    story.fills.length >= manifest.needs.fills &&
    story.questions.length >= manifest.needs.questions
  );
}

/**
 * The items a game still needs from the input: 0 and 0 when it can play. A locked game shows
 * these numbers ("save 2 more sentences").
 */
export function missingFor(
  manifest: Pick<Cartridge3DManifest, 'needs'>,
  input: Pick<PracticeInput, 'vocabulary' | 'sentences'>,
): { vocabulary: number; sentences: number } {
  return {
    vocabulary: Math.max(0, manifest.needs.vocabulary - input.vocabulary.length),
    sentences: Math.max(0, manifest.needs.sentences - input.sentences.length),
  };
}

// ---------------------------------------------------------------- migration from the demo StoryPack

/** The old demo `StoryPack` shape (src/demo/core/types.ts) as JSON; unknown keys are dropped. */
const legacyStoryPackSchema = z.object({
  id: z.string(),
  title: z.string(),
  series: z.string(),
  lesson: z.number(),
  level: z.string(),
  genre: z.string(),
  paragraphs: z.array(z.object({ text: z.string(), th: z.string().optional() })),
  images: z.array(z.string()),
  vocabulary: z.array(
    z.object({
      id: z.string(),
      word: z.string(),
      th: z.string(),
      definition: z.string(),
      phonetic: z.string().optional(),
    }),
  ),
  questions: z.array(
    z.object({
      id: z.string(),
      question: z.string(),
      options: z.array(z.string()),
      answer: z.number(),
      paragraph: z.number().optional(),
    }),
  ),
  sentences: z.array(
    z.object({
      id: z.string(),
      answer: z.string(),
      words: z.array(z.string()),
      paragraph: z.number().optional(),
    }),
  ),
  fills: z.array(
    z.object({ id: z.string(), sentence: z.string(), answer: z.string(), paragraph: z.number().optional() }),
  ),
  source: z.object({
    file: z.string(),
    url: z.string().optional(),
    thaiGlossesGenerated: z.boolean().optional(),
  }),
});

export type LegacyStoryPack = z.infer<typeof legacyStoryPackSchema>;

const withOptional = <T extends object, K extends string, V>(base: T, key: K, value: V | undefined) =>
  value === undefined ? base : { ...base, [key]: value };

/**
 * Converts an old demo story pack (`word`/`th`/`answer` fields) into a validated `StoryInput`.
 * The migration script uses it once; the games never see the old shape.
 */
export function fromStoryPack(json: unknown, label = 'story pack'): StoryInput {
  const pack = legacyStoryPackSchema.parse(json);
  const { thaiGlossesGenerated, ...source } = pack.source;
  return parseStoryInput(
    {
      schemaVersion: 1,
      id: pack.id,
      title: pack.title,
      series: pack.series,
      lesson: pack.lesson,
      level: normalizeCefrLevel(pack.level),
      genre: pack.genre,
      paragraphs: pack.paragraphs.map(({ text, th }) => withOptional({ text }, 'translation', th)),
      images: pack.images,
      vocabulary: pack.vocabulary.map(({ id, word, th, definition, phonetic }) =>
        withOptional({ id, term: word, translation: th, definition }, 'phonetic', phonetic),
      ),
      sentences: pack.sentences.map(({ id, answer, words, paragraph }) =>
        withOptional({ id, text: answer, words }, 'paragraph', paragraph),
      ),
      fills: pack.fills.map(({ id, sentence, answer, paragraph }) =>
        withOptional({ id, sentence, answer }, 'paragraph', paragraph),
      ),
      questions: pack.questions.map(({ id, question, options, answer, paragraph }) =>
        withOptional({ id, question, options, answer }, 'paragraph', paragraph),
      ),
      source: withOptional(source, 'translationsGenerated', thaiGlossesGenerated),
    },
    label,
  );
}
