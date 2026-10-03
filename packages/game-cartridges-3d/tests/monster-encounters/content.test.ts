import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseStoryIndex, parseStoryInput } from '@reading-advantage/advantage-play-kit-3d/contracts';
import { GENERATED_IDS, STORIES_DIR, STORY_IDS, loadStory, makeStory } from './helpers.js';

describe('imported stories (the Monster Encounters content)', () => {
  it.each(STORY_IDS)('%s parses and has content for every encounter', (id) => {
    const pack = loadStory(id);
    const generated = GENERATED_IDS.includes(id);
    expect(pack.id).toBe(id);
    expect(pack.paragraphs.length).toBe(3);
    expect(pack.vocabulary.length).toBeGreaterThanOrEqual(5);
    expect(pack.questions.length).toBe(4);
    expect(pack.sentences.length).toBeGreaterThanOrEqual(6);
    expect(pack.sentences.length).toBeLessThanOrEqual(12);
    expect(pack.fills.length).toBe(4);
    expect(pack.images.length).toBe(generated ? 0 : 3);
    expect(pack.source.translationsGenerated).toBe(generated ? true : undefined);
    for (const w of pack.vocabulary) expect(w.translation.length).toBeGreaterThan(0);
    for (const f of pack.fills) expect(f.sentence).not.toMatch(/<|_{4,}/);
    for (const img of pack.images) expect(existsSync(join(STORIES_DIR, id, img))).toBe(true);
    for (const s of pack.sentences) {
      expect(s.words.join(' ')).toBe(s.text);
      expect(s.words.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('takes extra sentences from the paragraphs after the workbook sentences', () => {
    const pip = loadStory('pip-is-brave');
    expect(pip.sentences.slice(0, 2).map((s) => s.text)).toEqual(['This is Pip.', 'Mom is here.']);
    const extra = pip.sentences.slice(2);
    expect(extra.length).toBe(10);
    const texts = pip.sentences.map((s) => s.text.toLowerCase());
    expect(new Set(texts).size).toBe(texts.length);
    for (const s of extra) {
      expect(s.words.length).toBeGreaterThanOrEqual(3);
      expect(s.words.length).toBeLessThanOrEqual(8);
      expect(s.text).not.toMatch(/["“”‘()]/);
      expect(pip.paragraphs[s.paragraph!]!.text).toContain(s.text);
    }
    // Sentences come from the whole story, not only the first paragraph.
    expect(new Set(extra.map((s) => s.paragraph)).size).toBe(3);
    // A quoted line is skipped; "Mia's" (an apostrophe) is not a quotation mark.
    const student = loadStory('the-new-student');
    expect(student.sentences.map((s) => s.text)).not.toContain("'Mia, you can sit next to me!'");
    expect(student.sentences.map((s) => s.text)).toContain('Her name is Mia.');
  });

  it('normalizes the workbook data', () => {
    const pip = loadStory('pip-is-brave');
    expect(pip.level).toBe('A0');
    expect(pip.series).toBe('Origins 2');
    expect(pip.lesson).toBe(12);
    expect(pip.fills[0]).toMatchObject({ sentence: 'Pip is a ___.', answer: 'puppy', paragraph: 0 });
    expect(pip.sentences[0]!.words).toEqual(['This', 'is', 'Pip.']);
    expect(pip.questions[0]).toMatchObject({ options: ['A cat', 'A boy', 'A puppy', 'A girl'], answer: 2 });
    expect(pip.paragraphs[0]!.translation).toBeTruthy();
    expect(pip.source.translationsGenerated).toBeUndefined();

    const squeaky = loadStory('squeaky-the-small-mouse');
    expect(squeaky.lesson).toBe(14);
    expect(squeaky.vocabulary[0]!.term).toBe('mouse');
    expect(squeaky.vocabulary.find((w) => w.id === 'w-flower')!.term).toBe('flower');
    expect(squeaky.fills[0]!.answer).toBe('mouse');

    const car = loadStory('pip-and-the-red-car');
    expect(car.level).toBe('A0');
    expect(car.series).toBe('Origins 3.1');
    expect(car.lesson).toBe(7);
    expect(car.source.translationsGenerated).toBeUndefined();
    expect(car.vocabulary[0]).toMatchObject({ term: 'puppy', translation: 'ลูกสุนัข' });
    expect(car.questions[0]).toMatchObject({ question: 'Who is Pip?', answer: 1, paragraph: 0 });
    expect(car.fills[0]).toMatchObject({ sentence: 'Pip is a ___.', answer: 'puppy' });
    expect(car.sentences[0]!.words).toEqual(['This', 'is', 'Pip.']);
    expect(car.images).toEqual(['img-1.webp', 'img-2.webp', 'img-3.webp']);
  });

  it('index.json lists the eight stories with a cover where the story has images', () => {
    const index = parseStoryIndex(JSON.parse(readFileSync(join(STORIES_DIR, 'index.json'), 'utf8')));
    expect(index.map((e) => e.id)).toEqual(STORY_IDS);
    expect(index[0]).toMatchObject({
      title: 'Pip is Brave',
      level: 'A0',
      series: 'Origins 2',
      lesson: 12,
      cover: 'img-1.webp',
    });
    expect(index[2]!.cover).toBe('img-1.webp');
    expect(index[6]).toMatchObject({
      title: 'The New Student',
      level: 'A1',
      series: 'Adventures 1.0',
      lesson: 1,
    });
    expect(index[6]!.cover).toBeUndefined();
  });

  it('the A1 stories carry generated Thai glosses for every word', () => {
    for (const id of GENERATED_IDS) {
      const pack = loadStory(id);
      expect(pack.level).toBe('A1');
      expect(pack.source.translationsGenerated).toBe(true);
      expect(pack.vocabulary.length).toBe(5);
      for (const w of pack.vocabulary) expect(w.translation).toMatch(/^[\u0E00-\u0E7F\s]+$/);
      for (const p of pack.paragraphs) expect(p.translation).toBeUndefined();
    }
  });
});

describe('parseStoryInput', () => {
  it('accepts a valid pack and returns typed data', () => {
    const pack = makeStory();
    expect(pack.vocabulary.length).toBe(6);
  });

  it('rejects an answer index outside the options', () => {
    expect(() =>
      makeStory({ questions: [{ id: 'q-1', question: 'Q?', options: ['a', 'b'], answer: 2 }] }),
    ).toThrow(/answer index/i);
  });

  it('rejects words that do not join to the sentence', () => {
    expect(() =>
      makeStory({ sentences: [{ id: 's-1', text: 'Mom is here.', words: ['Mom', 'here.'] }] }),
    ).toThrow(/words do not join/i);
  });

  it('rejects a fill without exactly one blank, or with HTML', () => {
    expect(() => makeStory({ fills: [{ id: 'f-1', sentence: 'Pip is a puppy.', answer: 'puppy' }] })).toThrow(
      /exactly one/,
    );
    expect(() => makeStory({ fills: [{ id: 'f-1', sentence: 'Pip ___ a ___.', answer: 'is' }] })).toThrow(
      /exactly one/,
    );
    expect(() =>
      makeStory({
        fills: [{ id: 'f-1', sentence: 'Pip is a <span class="blank"></span> ___.', answer: 'x' }],
      }),
    ).toThrow(/HTML/);
  });

  it('rejects duplicate ids, bad paragraph indexes, bad levels, and empty stories', () => {
    const w = { id: 'w-x', term: 'x', translation: 'x', definition: 'x' };
    expect(() => makeStory({ vocabulary: [w, w] })).toThrow(/ids must be distinct/i);
    expect(() =>
      makeStory({ fills: [{ id: 'f-1', sentence: 'A ___.', answer: 'a', paragraph: 9 }] }),
    ).toThrow(/paragraph index/i);
    expect(() => parseStoryInput({ ...makeStory(), level: 'C2' })).toThrow(/level/);
    expect(() => makeStory({ vocabulary: [], questions: [], sentences: [], fills: [] })).toThrow(
      /at least one/,
    );
    expect(() => parseStoryInput(null, 'nothing')).toThrow(/Invalid nothing/);
  });
});
