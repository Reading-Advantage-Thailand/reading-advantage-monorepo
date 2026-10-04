import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  APK3D_CAPABILITIES,
  CARTRIDGE_3D_RUNTIME_API_VERSION,
  DEVICE_REQUIREMENTS_DEFAULT,
  MODEL_LICENSE,
  baseLevel,
  calculateXP,
  cartridge3DManifestSchema,
  classBossDamage,
  fromStoryPack,
  gameBriefingSchema,
  gameResultsSchema,
  isCompatible,
  parseStoryInput,
  modelPackSchema,
  normalizeCefrLevel,
  parseStoryIndex,
  practiceOf,
  runtimeCartridgeManifestSchema,
  runtimeEdition3DSchema,
  sentenceInputSchema,
  starsFor,
  starsOf,
  storyGameEvidenceSchema,
  storyIndexEntrySchema,
  storyInputSchema,
  toGameResults,
  toOutcome,
  toSentenceInput,
  toStoryIndexEntry,
  toVocabularyInput,
  validateCartridge3DManifest,
  vocabularyInputSchema,
  type Cartridge3DManifest,
  type StoryGameEvidence,
  type StoryGameEvidenceItem,
  type StoryInput,
} from '../contracts/index.js';

const STORIES_DIR = join(process.cwd(), 'tests', 'fixtures', 'stories');
const STORY_IDS = readdirSync(STORIES_DIR, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name);

const readJson = (path: string): unknown => JSON.parse(readFileSync(path, 'utf8'));

/** The pack files on disk (StoryInput, written by scripts/apk3d-import.ts). */
const loadStory = (id: string): StoryInput =>
  parseStoryInput(readJson(join(STORIES_DIR, id, 'story.json')), id);

/** The A1 stories: no images, generated Thai glosses, `reviewed: false`. */
const GENERATED_IDS = ['the-new-student', 'the-school-garden'];

const manifest = (over: Partial<Cartridge3DManifest> = {}): Cartridge3DManifest =>
  validateCartridge3DManifest({
    id: 'potion-rush',
    title: 'Potion Rush',
    description: 'Serve every customer the sentence they ask for.',
    runtimeApiVersion: CARTRIDGE_3D_RUNTIME_API_VERSION,
    inputMode: 'sentence',
    requiredAssetBindings: [],
    capabilities: [...APK3D_CAPABILITIES],
    renderers: ['three'],
    simulation: 'realtime',
    orientation: 'portrait',
    levels: ['A0', 'A1'],
    needs: { sentences: 2 },
    requiredModelBindings: ['hero.knight', 'set.shop'],
    packs: ['heroes', 'potion-shop'],
    device: {},
    budget: { firstLoadBytes: 4_000_000, totalBytes: 6_000_000 },
    briefingKey: 'potionRush',
    ...over,
  });

const item = (over: Partial<StoryGameEvidenceItem> = {}): StoryGameEvidenceItem => ({
  itemId: 'w-brave',
  itemKind: 'word',
  label: 'brave',
  attempts: 1,
  correctFirstTry: true,
  solved: true,
  ...over,
});

const evidence = (items: StoryGameEvidenceItem[]): StoryGameEvidence =>
  storyGameEvidenceSchema.parse({
    schemaVersion: 1,
    kind: 'story-game',
    gameId: 'monster-encounters',
    storyId: 'pip-is-brave',
    level: 'A0',
    seed: 7,
    durationMs: 120_000,
    items,
    practice: practiceOf(items),
  });

describe('story input', () => {
  it('finds the eight real story packs', () => {
    expect(STORY_IDS.sort()).toEqual([
      'fun-day-at-the-beach',
      'pip-and-the-red-car',
      'pip-is-brave',
      'pip-sees-colors',
      'pips-happy-night',
      'squeaky-the-small-mouse',
      'the-new-student',
      'the-school-garden',
    ]);
  });

  it.each(STORY_IDS)('accepts the real pack %s as written by the importer', (id) => {
    const story = loadStory(id);
    const generated = GENERATED_IDS.includes(id);
    expect(storyInputSchema.safeParse(story).success).toBe(true);
    expect(story.schemaVersion).toBe(1);
    expect(story.id).toBe(id);
    expect(story.level).toBe(generated ? 'A1' : 'A0');
    expect(story.source.translationsGenerated).toBe(generated ? true : undefined);
    expect(story.images.length).toBe(generated ? 0 : 3);
    expect(story.vocabulary.length).toBeGreaterThan(0);
    expect(story.sentences.length).toBeGreaterThanOrEqual(6);
    expect(story.sentences.length).toBeLessThanOrEqual(12);
    for (const w of story.vocabulary) {
      expect(w.term.length).toBeGreaterThan(0);
      expect(w.translation.length).toBeGreaterThan(0);
      expect(w).not.toHaveProperty('word');
      expect(w).not.toHaveProperty('th');
    }
    for (const s of story.sentences) {
      expect(s.words.join(' ')).toBe(s.text);
      expect(s).not.toHaveProperty('answer');
    }
    for (const p of story.paragraphs) expect(p).not.toHaveProperty('th');
  });

  it('rejects the old field names and unknown keys (strict)', () => {
    const story = loadStory('pip-is-brave');
    const old = { ...story, vocabulary: [{ id: 'w', word: 'x', th: 'y', definition: 'z' }] };
    expect(storyInputSchema.safeParse(old).success).toBe(false);
    expect(storyInputSchema.safeParse({ ...story, extra: 1 }).success).toBe(false);
    expect(storyInputSchema.safeParse({ ...story, schemaVersion: 2 }).success).toBe(false);
  });

  it('checks ids, paragraph indexes, blanks, and answer indexes', () => {
    const story = loadStory('pip-is-brave');
    const fill = story.fills[0]!;
    expect(storyInputSchema.safeParse({ ...story, fills: [fill, fill] }).success).toBe(false);
    expect(storyInputSchema.safeParse({ ...story, fills: [{ ...fill, paragraph: 99 }] }).success).toBe(false);
    expect(
      storyInputSchema.safeParse({ ...story, fills: [{ ...fill, sentence: 'No blank.' }] }).success,
    ).toBe(false);
    const q = story.questions[0]!;
    expect(
      storyInputSchema.safeParse({ ...story, questions: [{ ...q, answer: q.options.length }] }).success,
    ).toBe(false);
  });

  it('fromStoryPack converts the old demo shape and keeps the source flag as translationsGenerated', () => {
    const story = loadStory('pip-is-brave');
    const old = {
      ...story,
      level: 'CEFR A0',
      paragraphs: story.paragraphs.map(({ text, translation }) => ({ text, th: translation })),
      vocabulary: story.vocabulary.map(({ term, translation, ...rest }) => ({
        ...rest,
        word: term,
        th: translation,
      })),
      sentences: story.sentences.map(({ text, ...rest }) => ({ ...rest, answer: text })),
      source: { file: story.source.file, thaiGlossesGenerated: true },
    };
    delete (old as { schemaVersion?: number }).schemaVersion;
    const converted = fromStoryPack(old);
    expect(converted.source.translationsGenerated).toBe(true);
    expect(converted.source).not.toHaveProperty('thaiGlossesGenerated');
    expect({ ...converted, source: story.source }).toEqual(story);
    expect(toStoryIndexEntry(converted).reviewed).toBe(false);
    expect(toStoryIndexEntry(story).reviewed).toBe(true);
  });
});

describe('CEFR level', () => {
  it('normalizes the three real workbook values', () => {
    expect(normalizeCefrLevel('CEFR A0')).toBe('A0');
    expect(normalizeCefrLevel('CEFR A0+')).toBe('A0+');
    expect(normalizeCefrLevel('A1')).toBe('A1');
    expect(normalizeCefrLevel('  cefr  A2 ')).toBe('A2');
    expect(() => normalizeCefrLevel('CEFR C1')).toThrow(/unknown CEFR level/i);
    expect(() => normalizeCefrLevel('')).toThrow();
  });

  it('drops the half step for the selector chip', () => {
    expect(baseLevel('A0+')).toBe('A0');
    expect(baseLevel('A1+')).toBe('A1');
    expect(baseLevel('A0')).toBe('A0');
    expect(baseLevel('Pre-A1')).toBe('Pre-A1');
  });
});

describe('story index', () => {
  it('builds an entry per real pack with level, cover, and reviewed', () => {
    const entries = STORY_IDS.map((id) => toStoryIndexEntry(loadStory(id)));
    expect(parseStoryIndex(entries)).toEqual(entries);
    for (const e of entries) {
      expect(storyIndexEntrySchema.safeParse(e).success).toBe(true);
      if (GENERATED_IDS.includes(e.id)) {
        expect(e.level).toBe('A1');
        expect(e.cover).toBeUndefined();
        expect(e.reviewed).toBe(false);
      } else {
        expect(e.level).toBe('A0');
        expect(e.cover).toBe('img-1.webp');
        expect(e.reviewed).toBe(true);
      }
    }
  });

  it('index.json on disk is what the importer builds from the packs', () => {
    const current = parseStoryIndex(readJson(join(STORIES_DIR, 'index.json')));
    const rebuilt = current.map((e) => toStoryIndexEntry(loadStory(e.id)));
    expect(current).toEqual(rebuilt);
    expect(current.map((e) => e.level)).toEqual(['A0', 'A0', 'A0', 'A0', 'A0', 'A0', 'A1', 'A1']);
  });

  it('rejects duplicate ids and a missing reviewed flag', () => {
    const e = toStoryIndexEntry(loadStory('pip-is-brave'));
    expect(() => parseStoryIndex([e, e])).toThrow(/distinct/);
    const { reviewed: _reviewed, ...noReviewed } = e;
    expect(storyIndexEntrySchema.safeParse(noReviewed).success).toBe(false);
  });
});

describe('derived inputs', () => {
  it('toVocabularyInput has the APK VocabularyInput shape', () => {
    const story = loadStory('pip-is-brave');
    const input = toVocabularyInput(story);
    expect(vocabularyInputSchema.safeParse(input).success).toBe(true);
    expect(input.length).toBe(story.vocabulary.length);
    expect(input[0]).toEqual({
      term: story.vocabulary[0]!.term,
      translation: story.vocabulary[0]!.translation,
    });
    expect(Object.keys(input[0]!)).toEqual(['term', 'translation']);
  });

  it('toSentenceInput has the APK SentenceInput shape and splits back into the words', () => {
    const story = loadStory('pip-and-the-red-car');
    const input = toSentenceInput(story);
    expect(sentenceInputSchema.safeParse(input).success).toBe(true);
    expect(input.length).toBe(story.sentences.length);
    input.forEach((s, i) => {
      expect(s.term.split(' ')).toEqual(story.sentences[i]!.words);
      expect(s.translation).toBe('');
    });
  });
});

describe('manifest', () => {
  it('extends the APK manifest with the 3D fields and keeps the base validation', () => {
    const m = manifest();
    expect(m.renderers).toEqual(['three']);
    expect(m.needs).toEqual({ vocabulary: 0, sentences: 2, fills: 0, questions: 0 });
    expect(m.device).toEqual(DEVICE_REQUIREMENTS_DEFAULT);
    expect(m.device.minTextureSize).toBe(2048);
    // The APK validator accepts the base fields of a 3D manifest.
    const {
      renderers,
      simulation,
      orientation,
      levels,
      needs,
      requiredModelBindings,
      packs,
      device,
      budget,
      briefingKey,
      ...base
    } = m;
    expect(runtimeCartridgeManifestSchema.safeParse({ ...base, inputMode: 'sentence' }).success).toBe(true);
    expect(cartridge3DManifestSchema.safeParse({ ...m, id: 'Bad Id' }).success).toBe(false);
    expect(cartridge3DManifestSchema.safeParse({ ...m, capabilities: ['bounded'] }).success).toBe(false);
    expect(
      cartridge3DManifestSchema.safeParse({ ...m, requiredModelBindings: ['/knight.glb'] }).success,
    ).toBe(false);
    expect(cartridge3DManifestSchema.safeParse({ ...m, levels: [] }).success).toBe(false);
    expect(() => validateCartridge3DManifest({ ...m, renderers: [] })).toThrow(/renderers/);
    expect(() => validateCartridge3DManifest({ ...m, renderers: ['three', 'three'] })).toThrow(/unique/);
    expect(() => validateCartridge3DManifest({ ...m, renderers: ['canvas'] })).toThrow(/renderers/);
    expect(manifest({ renderers: ['three', 'phaser'] }).renderers).toEqual(['three', 'phaser']);
    expect(manifest({ renderers: ['phaser'] }).renderers).toEqual(['phaser']);
    expect(manifest({ inputMode: 'story' }).inputMode).toBe('story');
  });

  it('isCompatible checks the level and the item minimums', () => {
    const story = loadStory('pip-is-brave');
    expect(isCompatible(manifest(), story)).toBe(true);
    expect(isCompatible(manifest({ levels: ['A1'] }), story)).toBe(false);
    expect(isCompatible(manifest({ needs: { sentences: story.sentences.length + 1 } as never }), story)).toBe(
      false,
    );
    expect(isCompatible(manifest({ needs: { vocabulary: story.vocabulary.length } as never }), story)).toBe(
      true,
    );
    expect(isCompatible(manifest({ needs: { questions: story.questions.length + 1 } as never }), story)).toBe(
      false,
    );
    expect(isCompatible(manifest({ needs: { fills: story.fills.length + 1 } as never }), story)).toBe(false);
  });

  it('every real story fits Monster Encounters (section 11 step 8) and a sentence game with 6 orders', () => {
    const monsterEncounters = manifest({
      inputMode: 'story',
      simulation: 'turn',
      levels: ['A0', 'A0+', 'A1'],
      needs: { vocabulary: 4, questions: 1 } as never,
    });
    const potionRush = manifest({ levels: ['A0', 'A1'], needs: { sentences: 6 } as never });
    for (const id of STORY_IDS) {
      const story = loadStory(id);
      expect(isCompatible(monsterEncounters, story), id).toBe(true);
      expect(isCompatible(potionRush, story), id).toBe(true);
    }
  });
});

describe('results', () => {
  it('copies the apps XP rule: 8 correct of 10 gives 6 XP, 0 attempts give 0', () => {
    expect(calculateXP(0, 8, 10)).toBe(6);
    expect(calculateXP(999, 8, 10)).toBe(6);
    expect(calculateXP(0, 10, 10)).toBe(10);
    expect(calculateXP(0, 5, 10)).toBe(2);
    expect(calculateXP(0, 0, 0)).toBe(0);
    expect(calculateXP(0, 0, 4)).toBe(0);
  });

  it('toGameResults counts one correct response per solved item and every attempt', () => {
    const items = [
      ...Array.from({ length: 6 }, (_, i) => item({ itemId: `w-${i}` })),
      item({ itemId: 'f-1', itemKind: 'fill', label: 'Pip is a ___.', attempts: 2, correctFirstTry: false }),
      item({
        itemId: 'f-2',
        itemKind: 'fill',
        label: 'The room is ___.',
        attempts: 2,
        correctFirstTry: false,
      }),
    ];
    const r = toGameResults(evidence(items), 42);
    expect(gameResultsSchema.safeParse(r).success).toBe(true);
    expect(r).toEqual({ correctAnswers: 8, totalAttempts: 10, accuracy: 0.8, xp: 6, score: 42 });
    expect(toGameResults(evidence([]), 0)).toEqual({
      correctAnswers: 0,
      totalAttempts: 0,
      accuracy: 0,
      xp: 0,
      score: 0,
    });
    const unsolved = item({ attempts: 3, correctFirstTry: false, solved: false });
    expect(toGameResults(evidence([unsolved]), 0)).toMatchObject({
      correctAnswers: 0,
      totalAttempts: 3,
      xp: 0,
    });
    expect(toGameResults(evidence(items), 7.9).score).toBe(7);
    expect(toGameResults(evidence(items), -3).score).toBe(0);
    expect(classBossDamage(r)).toBe(16);
  });

  it('never sends defeat', () => {
    expect(toOutcome(true)).toBe('victory');
    expect(toOutcome(false)).toBe('complete');
  });

  it('stars: 3 at 90% first try, 2 at 70%, else 1', () => {
    expect(starsFor(1)).toBe(3);
    expect(starsFor(0.9)).toBe(3);
    expect(starsFor(0.89)).toBe(2);
    expect(starsFor(0.7)).toBe(2);
    expect(starsFor(0.69)).toBe(1);
    expect(starsFor(0)).toBe(1);
    const mk = (firstTry: number, total: number) =>
      evidence(
        Array.from({ length: total }, (_, i) =>
          item({ itemId: `w-${i}`, correctFirstTry: i < firstTry, attempts: i < firstTry ? 1 : 2 }),
        ),
      );
    expect(starsOf(mk(9, 10))).toBe(3);
    expect(starsOf(mk(7, 10))).toBe(2);
    expect(starsOf(mk(6, 10))).toBe(1);
    expect(starsOf(evidence([]))).toBe(1);
    expect(mk(7, 10).practice.length).toBe(3);
  });

  it('evidence rejects a first-try item that is not solved, and more than 200 items', () => {
    expect(() => evidence([item({ solved: false })])).toThrow();
    expect(() => evidence(Array.from({ length: 201 }, (_, i) => item({ itemId: `w-${i}` })))).toThrow();
    expect(() => evidence([item({ attempts: 0 })])).toThrow();
  });
});

describe('briefing (APK copy)', () => {
  it('accepts a briefing built from resolved strings and rejects an empty one', () => {
    const briefing = {
      title: 'Potion Rush',
      objective: 'Serve every customer the sentence they ask for.',
      instructions: [{ title: 'Read the order', description: 'Each customer asks for one sentence.' }],
      learningPreview: { heading: 'Sentences from your story' },
      controls: [{ mode: 'touch', label: 'Drag', action: 'Move a word into a cauldron' }],
      tip: 'A wrong word goes into the trash portal.',
    };
    expect(gameBriefingSchema.safeParse(briefing).success).toBe(true);
    expect(gameBriefingSchema.safeParse({ ...briefing, instructions: [] }).success).toBe(false);
    expect(gameBriefingSchema.safeParse({ ...briefing, title: '  ' }).success).toBe(false);
    expect(gameBriefingSchema.safeParse({ ...briefing, startAction: 'Go' }).success).toBe(false);
  });
});

describe('model assets', () => {
  const file = (id: string, byteSize: number) => ({
    id,
    path: `${id}.glb`,
    kind: 'model',
    format: 'glb',
    byteSize,
    triangles: 12_000,
    textureSize: 512,
    skinned: true,
    clips: ['idle', 'walk'],
    presets: ['ranger'],
    provenance: {
      source: `advantage-forge/assets/${id}.ts`,
      license: MODEL_LICENSE,
      forgeCommit: 'ce692ca',
      tool: 'scripts/apk3d-models.ts',
    },
  });
  const pack = {
    id: 'heroes',
    version: '1.0.0',
    root: 'packs/heroes',
    files: { knight: file('knight', 500_000), wizard: file('wizard', 480_000) },
    byteSize: 980_000,
  };

  it('validates a pack and its provenance license', () => {
    expect(MODEL_LICENSE).toBe('AGPL-3.0-or-later');
    expect(modelPackSchema.safeParse(pack).success).toBe(true);
    expect(modelPackSchema.safeParse({ ...pack, byteSize: 1 }).success).toBe(false);
    const mit = { ...file('knight', 1), provenance: { ...file('knight', 1).provenance, license: 'MIT' } };
    expect(modelPackSchema.safeParse({ ...pack, files: { knight: mit }, byteSize: 1 }).success).toBe(false);
    // No hash field on the model kind (the monorepo hashing policy): a pack with one is rejected.
    expect(
      modelPackSchema.safeParse({
        ...pack,
        files: { knight: { ...file('knight', 980_000), sha256: 'a'.repeat(64) } },
      }).success,
    ).toBe(false);
  });

  it('validates an edition whose bindings point at pack files', () => {
    const edition = {
      id: 'standard',
      title: 'Standard',
      runtimeApiVersion: '1.0.0',
      packs: { heroes: pack },
      bindings: { 'hero.knight': { pack: 'heroes', file: 'knight' } },
      tuning: { speed: 1, intensity: 0.8 },
    };
    expect(runtimeEdition3DSchema.safeParse(edition).success).toBe(true);
    expect(
      runtimeEdition3DSchema.safeParse({ ...edition, bindings: { 'hero.x': { pack: 'heroes', file: 'x' } } })
        .success,
    ).toBe(false);
    expect(
      runtimeEdition3DSchema.safeParse({
        ...edition,
        bindings: { 'hero.x': { pack: 'nope', file: 'knight' } },
      }).success,
    ).toBe(false);
    expect(runtimeEdition3DSchema.safeParse({ ...edition, id: 'huge' }).success).toBe(false);
  });
});
