/** Shared Monster Encounters test helpers: a synthetic story, an answer oracle, and event filters. */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseStoryInput, type StoryInput } from '@reading-advantage/advantage-play-kit-3d/contracts';
import type {
  Challenge,
  GameEvent,
  Quest,
  Response,
} from '../../src/monster-encounters/core/types.js';

export const STORIES_DIR = join(process.cwd(), 'tests', 'fixtures', 'stories');
/** Every story of the demo, in selector order (scripts/apk3d-import.ts STORIES). */
export const STORY_IDS = [
  'pip-is-brave',
  'squeaky-the-small-mouse',
  'pip-and-the-red-car',
  'fun-day-at-the-beach',
  'pips-happy-night',
  'pip-sees-colors',
  'the-new-student',
  'the-school-garden',
];
/** The A1 stories: no images, generated Thai glosses. */
export const GENERATED_IDS = ['the-new-student', 'the-school-garden'];

/** The StoryInput file on disk. */
export function loadStory(id: string): StoryInput {
  return parseStoryInput(JSON.parse(readFileSync(join(STORIES_DIR, id, 'story.json'), 'utf8')), id);
}

/** A small valid story; override any field. */
export function makeStory(over: Partial<StoryInput> = {}): StoryInput {
  return parseStoryInput({
    schemaVersion: 1,
    id: 'test-story',
    title: 'Test Story',
    series: 'Origins 1',
    lesson: 1,
    level: 'A0',
    genre: 'Test',
    paragraphs: [
      { text: 'Pip is a puppy. The room is dark.', translation: 'ปิ๊ปเป็นลูกสุนัข' },
      { text: 'Mom is here.' },
    ],
    images: [],
    vocabulary: [
      { id: 'w-puppy', term: 'puppy', translation: 'ลูกสุนัข', definition: 'A young dog.' },
      { id: 'w-dark', term: 'dark', translation: 'มืด', definition: 'Having no light.' },
      { id: 'w-sound', term: 'sound', translation: 'เสียง', definition: 'Something you hear.' },
      { id: 'w-afraid', term: 'afraid', translation: 'กลัว', definition: 'Feeling scared.' },
      {
        id: 'w-brave',
        term: 'brave',
        translation: 'กล้าหาญ',
        definition: 'Not being afraid.',
        phonetic: '/breɪv/',
      },
      { id: 'w-hand', term: 'hand', translation: 'มือ', definition: 'The end of the arm.' },
    ],
    questions: [
      {
        id: 'q-1',
        question: 'What is Pip?',
        options: ['A cat', 'A boy', 'A puppy', 'A girl'],
        answer: 2,
        paragraph: 0,
      },
      {
        id: 'q-2',
        question: 'How is the room?',
        options: ['Bright', 'Dark', 'Big'],
        answer: 1,
        paragraph: 0,
      },
      { id: 'q-3', question: 'Who is here?', options: ['Mom', 'A cat', 'Dad'], answer: 0, paragraph: 1 },
    ],
    sentences: [
      { id: 's-1', text: 'This is Pip.', words: ['This', 'is', 'Pip.'], paragraph: 0 },
      { id: 's-2', text: 'Mom is here.', words: ['Mom', 'is', 'here.'], paragraph: 1 },
    ],
    fills: [
      { id: 'f-1', sentence: 'Pip is a ___.', answer: 'puppy', paragraph: 0 },
      { id: 'f-2', sentence: 'The room is ___.', answer: 'dark', paragraph: 0 },
      { id: 'f-3', sentence: 'A big ___.', answer: 'sound' },
    ],
    source: { file: 'test.json' },
    ...over,
  });
}

/** The correct response for a challenge, from the story. */
export function solve(pack: StoryInput, c: Challenge): Response {
  if (c.kind === 'sentence') {
    const item = pack.sentences.find((s) => s.id === c.itemId)!;
    const left = c.tokens.slice();
    const tokenIds = item.words.map((w) => {
      const i = left.findIndex((t) => t.text === w);
      if (i < 0) throw new Error(`no token for "${w}"`);
      return left.splice(i, 1)[0]!.id;
    });
    return { kind: 'order', tokenIds };
  }
  const text =
    c.kind === 'word'
      ? pack.vocabulary.find((w) => w.id === c.itemId)!.translation
      : c.kind === 'fill'
        ? pack.fills.find((f) => f.id === c.itemId)!.answer
        : (() => {
            const q = pack.questions.find((q) => q.id === c.itemId)!;
            return q.options[q.answer]!;
          })();
  const option = c.options.find((o) => o.text.toLowerCase() === text.toLowerCase());
  if (!option) throw new Error(`no option for "${text}" in ${c.options.map((o) => o.text).join(', ')}`);
  return { kind: 'choice', optionId: option.id };
}

/** A wrong response for a challenge. */
export function fail(pack: StoryInput, c: Challenge): Response {
  const right = solve(pack, c);
  if (c.kind === 'sentence' && right.kind === 'order') {
    return { kind: 'order', tokenIds: [...right.tokenIds.slice(1), right.tokenIds[0]!] };
  }
  if (c.kind !== 'sentence' && right.kind === 'choice') {
    return { kind: 'choice', optionId: c.options.find((o) => o.id !== right.optionId)!.id };
  }
  throw new Error('unreachable');
}

export const ofType = <T extends GameEvent['type']>(events: GameEvent[], type: T) =>
  events.filter((e): e is Extract<GameEvent, { type: T }> => e.type === type);

export const types = (events: GameEvent[]) => events.map((e) => e.type);

/** Plays the rest of a quest with every answer correct (starts it when needed); returns all events. */
export function playPerfect(quest: Quest, pack: StoryInput, limit = 200): GameEvent[] {
  const all = quest.state.phase === 'ready' ? quest.start() : [];
  for (let i = 0; i < limit && quest.state.phase === 'challenge'; i++) {
    all.push(...quest.answer(solve(pack, quest.state.challenge!)));
  }
  return all;
}
