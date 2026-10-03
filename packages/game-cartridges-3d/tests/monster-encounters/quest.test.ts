import { describe, expect, it } from 'vitest';
import {
  MAX_COURAGE,
  PARTY,
  REST_COURAGE,
  XP,
  XP_REASON,
  createQuest,
  resolveKind,
} from '../../src/monster-encounters/core/quest.js';
import type { Challenge, GameEvent } from '../../src/monster-encounters/core/types.js';
import type { StoryInput } from '@reading-advantage/advantage-play-kit-3d/contracts';
import { STORY_IDS, fail, loadStory, makeStory, ofType, playPerfect, solve, types } from './helpers.js';

const opts = { seed: 1, helper: false };

describe('setup and start', () => {
  it('starts ready, then opens the Bone Hall with two skeletons and a word challenge', () => {
    const quest = createQuest(makeStory(), opts);
    expect(quest.state.phase).toBe('ready');
    expect(quest.state.encounter).toBeNull();
    expect(quest.state.challenge).toBeNull();
    expect(quest.state.courage).toBe(MAX_COURAGE);
    expect(quest.state.party.map((h) => h.id)).toEqual(['knight', 'wizard', 'cleric']);

    const events = quest.start();
    expect(types(events)).toEqual(['encounterStart', 'turn']);
    const enc = ofType(events, 'encounterStart')[0]!.encounter;
    expect(enc).toMatchObject({ index: 0, count: 4, name: 'The Bone Hall', kind: 'word' });
    expect(enc.enemies.map((e) => [e.id, e.kind, e.hp, e.maxHp, e.defeated])).toEqual([
      ['skeleton-1', 'skeleton', 2, 2, false],
      ['skeleton-2', 'skeleton', 2, 2, false],
    ]);
    const turn = ofType(events, 'turn')[0]!;
    expect(turn.hero).toBe('knight');
    expect(turn.challenge.kind).toBe('word');
    expect(quest.state).toMatchObject({
      phase: 'challenge',
      activeHero: 'knight',
      challenge: turn.challenge,
    });
    expect(quest.state.enemies.length).toBe(2);
  });

  it('refuses a second start and an answer before start', () => {
    const quest = createQuest(makeStory(), opts);
    expect(() => quest.answer({ kind: 'choice', optionId: 'o1' })).toThrow(/phase is ready/);
    quest.start();
    expect(() => quest.start()).toThrow(/twice/);
  });

  it('throws on an empty story', () => {
    const pack = { ...makeStory(), vocabulary: [], questions: [], sentences: [], fills: [] };
    expect(() => createQuest(pack, opts)).toThrow(/no items/);
  });
});

describe('a turn', () => {
  it('a correct answer: attack, hit, xp, then the next turn for the next hero', () => {
    const pack = makeStory();
    const quest = createQuest(pack, opts);
    quest.start();
    const events = quest.answer(solve(pack, quest.state.challenge!));
    expect(types(events)).toEqual(['answer', 'heroAttack', 'enemyHit', 'xp', 'turn']);
    expect(events[0]).toMatchObject({ type: 'answer', hero: 'knight', feedback: { correct: true } });
    expect((events[0] as { feedback: { explanation?: string } }).feedback.explanation).toBeUndefined();
    expect(events[1]).toEqual({
      type: 'heroAttack',
      hero: 'knight',
      target: 'skeleton-1',
      move: 'attack',
      damage: 1,
    });
    expect(events[2]).toEqual({ type: 'enemyHit', enemy: 'skeleton-1', hp: 1 });
    expect(events[3]).toEqual({
      type: 'xp',
      amount: XP.firstTry,
      total: XP.firstTry,
      reason: XP_REASON.firstTry,
    });
    expect(events[4]).toMatchObject({ type: 'turn', hero: 'wizard' });
    expect(quest.state.xp).toBe(10);
    expect(quest.state.enemies[0]!.hp).toBe(1);
    expect(quest.state.courage).toBe(MAX_COURAGE);
  });

  it('a wrong answer: miss, enemy attack, courage down, feedback with answer and paragraph', () => {
    const pack = makeStory();
    const quest = createQuest(pack, opts);
    quest.start();
    const c = quest.state.challenge!;
    const word = pack.vocabulary.find((w) => w.id === c.itemId)!;
    const events = quest.answer(fail(pack, c));
    expect(types(events)).toEqual(['answer', 'heroMiss', 'enemyAttack', 'turn']);
    const fb = ofType(events, 'answer')[0]!.feedback;
    expect(fb.correct).toBe(false);
    expect(fb.correctText).toBe(word.translation);
    expect(fb.explanation).toContain(word.translation);
    expect(fb.explanation).toContain(word.definition);
    expect(events[1]).toEqual({ type: 'heroMiss', hero: 'knight', target: 'skeleton-1' });
    expect(events[2]).toEqual({ type: 'enemyAttack', enemy: 'skeleton-1', courage: 4 });
    expect(quest.state.courage).toBe(4);
    expect(quest.state.xp).toBe(0);
    expect(quest.state.enemies[0]!.hp).toBe(2);
  });

  it('heroes take turns in order across encounters', () => {
    const pack = makeStory();
    const quest = createQuest(pack, opts);
    const heroes = ofType(playPerfect(quest, pack), 'turn').map((t) => t.hero);
    heroes.forEach((h, i) => expect(h).toBe(PARTY[i % 3]!.id));
  });

  it('uses attack2 for the Cleric', () => {
    const pack = makeStory();
    const quest = createQuest(pack, opts);
    const attacks = ofType(playPerfect(quest, pack), 'heroAttack');
    expect(attacks.filter((a) => a.hero === 'cleric').every((a) => a.move === 'attack2')).toBe(true);
    expect(attacks.filter((a) => a.hero !== 'cleric').every((a) => a.move === 'attack')).toBe(true);
  });

  it('rejects a response of the wrong shape or with an unknown id', () => {
    const pack = makeStory();
    const quest = createQuest(pack, opts);
    quest.start();
    expect(() => quest.answer({ kind: 'order', tokenIds: [] })).toThrow(/expected a choice/);
    expect(() => quest.answer({ kind: 'choice', optionId: 'nope' })).toThrow(/unknown option/);
  });
});

describe('retries', () => {
  it('a wrong item comes back at least two turns later, flagged as a retry, and earns 5 xp', () => {
    const pack = makeStory();
    const quest = createQuest(pack, opts);
    quest.start();
    const first = quest.state.challenge!;
    quest.answer(fail(pack, first));
    const second = quest.state.challenge!;
    expect(second.itemId).not.toBe(first.itemId);
    expect(second.retry).toBe(false);
    quest.answer(solve(pack, second));
    const third = quest.state.challenge!;
    expect(third.itemId).not.toBe(first.itemId);
    quest.answer(solve(pack, third));
    const fourth = quest.state.challenge!;
    expect(fourth.itemId).toBe(first.itemId);
    expect(fourth.retry).toBe(true);
    expect(fourth.challengeId).not.toBe(first.challengeId);
    const events = quest.answer(solve(pack, fourth));
    expect(ofType(events, 'xp')[0]).toMatchObject({ amount: XP.retry, reason: XP_REASON.retry });
  });

  it('a wrong item goes last when the queue is shorter than two', () => {
    // One sentence only: the Bat Roost has one item, so the retry is the very next turn.
    const pack = makeStory({
      vocabulary: [],
      fills: [],
      questions: [],
      sentences: [makeStory().sentences[0]!],
    });
    const quest = createQuest(pack, opts);
    quest.start();
    quest.answer(fail(pack, quest.state.challenge!));
    expect(quest.state.challenge!.itemId).toBe('s-1');
    expect(quest.state.challenge!.retry).toBe(true);
  });

  it('when the new items run out, wrong items come first, then the least recently seen', () => {
    // Three words, Bone Hall needs 4 hits: the queue refills after the third word.
    const pack = makeStory({ vocabulary: makeStory().vocabulary.slice(0, 3) });
    const quest = createQuest(pack, opts);
    quest.start();
    const a = quest.state.challenge!.itemId;
    quest.answer(fail(pack, quest.state.challenge!)); // a wrong: queue b, c, a
    const b = quest.state.challenge!.itemId;
    quest.answer(fail(pack, quest.state.challenge!)); // b wrong: queue c, a, b
    const c = quest.state.challenge!.itemId;
    expect(new Set([a, b, c]).size).toBe(3);
    quest.answer(solve(pack, quest.state.challenge!)); // c: 1 hit
    expect(quest.state.challenge!.itemId).toBe(a);
    quest.answer(solve(pack, quest.state.challenge!)); // a: 2 hits
    expect(quest.state.challenge!.itemId).toBe(b);
    quest.answer(solve(pack, quest.state.challenge!)); // b: 3 hits, the queue is empty
    // Refill: items answered wrong (a, then b) before c, although c was seen least recently.
    expect(quest.state.challenge!).toMatchObject({ itemId: a, retry: true });
  });

  it('a refill never asks the item that was just answered twice in a row', () => {
    const pack = makeStory({ vocabulary: makeStory().vocabulary.slice(0, 2) });
    const quest = createQuest(pack, opts);
    quest.start();
    const a = quest.state.challenge!.itemId;
    quest.answer(solve(pack, quest.state.challenge!)); // a: 1 hit
    const b = quest.state.challenge!.itemId;
    quest.answer(fail(pack, quest.state.challenge!)); // b wrong, the queue is shorter than two: b is next
    expect(quest.state.challenge!.itemId).toBe(b);
    quest.answer(solve(pack, quest.state.challenge!)); // b: 2 hits, the queue is empty
    // Refill would put b (wrong before) first, but b was just answered: a comes first.
    expect(quest.state.challenge!.itemId).toBe(a);
    quest.answer(solve(pack, quest.state.challenge!)); // a: 3 hits
    expect(quest.state.challenge!).toMatchObject({ itemId: b, retry: true });
  });
});

describe('courage', () => {
  it('rests at zero courage: courage returns to 3 and the quest continues', () => {
    const pack = makeStory();
    const quest = createQuest(pack, opts);
    quest.start();
    let events: GameEvent[] = [];
    for (let i = 0; i < 5; i++) events = quest.answer(fail(pack, quest.state.challenge!));
    expect(types(events)).toEqual(['answer', 'heroMiss', 'enemyAttack', 'rest', 'turn']);
    expect(events[2]).toMatchObject({ type: 'enemyAttack', courage: 0 });
    expect(events[3]).toEqual({ type: 'rest', courage: REST_COURAGE });
    expect(quest.state.courage).toBe(REST_COURAGE);
    expect(quest.state.phase).toBe('challenge');
  });

  it('a correct Cleric heals one courage, only below the maximum', () => {
    const pack = makeStory();
    const quest = createQuest(pack, opts);
    quest.start();
    quest.answer(fail(pack, quest.state.challenge!)); // knight wrong: courage 4
    quest.answer(solve(pack, quest.state.challenge!)); // wizard
    expect(quest.state.activeHero).toBe('cleric');
    const events = quest.answer(solve(pack, quest.state.challenge!));
    // The Cleric's hit also defeats skeleton-1 (the Wizard hit it first); the heal comes after that.
    expect(types(events)).toEqual([
      'answer',
      'heroAttack',
      'enemyHit',
      'enemyDefeated',
      'heal',
      'xp',
      'turn',
    ]);
    expect(ofType(events, 'heal')[0]).toEqual({ type: 'heal', hero: 'cleric', courage: 5 });
    expect(quest.state.courage).toBe(MAX_COURAGE);
    // Next Cleric turn at full courage: no heal.
    quest.answer(solve(pack, quest.state.challenge!));
    quest.answer(solve(pack, quest.state.challenge!));
    expect(quest.state.activeHero).toBe('cleric');
    expect(ofType(quest.answer(solve(pack, quest.state.challenge!)), 'heal')).toEqual([]);
  });
});

describe('encounters and victory', () => {
  it('a perfect run clears four encounters in order and wins', () => {
    const pack = makeStory();
    const quest = createQuest(pack, opts);
    const all = playPerfect(quest, pack);
    const starts = ofType(all, 'encounterStart').map((e) => e.encounter);
    expect(starts.map((e) => [e.index, e.name, e.kind])).toEqual([
      [0, 'The Bone Hall', 'word'],
      [1, 'The Bat Roost', 'sentence'],
      [2, 'The Treasure Room', 'fill'],
      [3, "The Dragon's Hall", 'question'],
    ]);
    expect(starts[3]!.enemies[0]).toMatchObject({
      id: 'dragon-fire-1',
      hp: 3,
      name: 'Ember, the Fire Dragon',
    });
    expect(ofType(all, 'encounterCleared').map((e) => e.index)).toEqual([0, 1, 2, 3]);
    expect(ofType(all, 'enemyDefeated').map((e) => e.enemy)).toEqual([
      'skeleton-1',
      'skeleton-2',
      'giant-bat-1',
      'giant-bat-2',
      'mimic-1',
      'dragon-fire-1',
    ]);
    // Challenge kinds follow the encounter kinds.
    const turns = ofType(all, 'turn').map((t) => t.challenge.kind);
    expect(turns).toEqual([
      ...Array<string>(4).fill('word'),
      ...Array<string>(4).fill('sentence'),
      'fill',
      'fill',
      'fill',
      'question',
      'question',
      'question',
    ]);

    // The transition: defeat, xp, encounterCleared, xp, encounterStart, turn.
    const i = all.findIndex((e) => e.type === 'enemyDefeated' && e.enemy === 'skeleton-2');
    expect(types(all.slice(i, i + 6))).toEqual([
      'enemyDefeated',
      'xp',
      'encounterCleared',
      'xp',
      'encounterStart',
      'turn',
    ]);
    expect(all[i + 3]).toMatchObject({ type: 'xp', amount: XP.encounter, reason: XP_REASON.encounter });

    // Victory: the last events.
    expect(types(all.slice(-4))).toEqual(['encounterCleared', 'xp', 'xp', 'victory']);
    expect(all.at(-2)).toMatchObject({ type: 'xp', amount: XP.victory, reason: XP_REASON.victory });
    expect(quest.state.phase).toBe('victory');
    expect(quest.state.challenge).toBeNull();
    expect(quest.state.activeHero).toBeNull();
    expect(() => quest.answer({ kind: 'choice', optionId: 'o1' })).toThrow(/phase is victory/);

    const results = ofType(all, 'victory')[0]!.results;
    expect(results).toEqual(quest.results());
    expect(results.storyId).toBe('test-story');
    expect(results.xp).toBe(14 * XP.firstTry + 4 * XP.encounter + XP.victory);
    expect(results.stars).toBe(3);
    expect(results.firstTryAccuracy).toBe(1);
    expect(results.correctAnswers).toBe(14);
    expect(results.practice).toEqual([]);
    expect(results.items.every((i) => i.attempts >= 1 && i.correctFirstTry && i.solved)).toBe(true);
    // Items are unique per itemId; the 2 sentences shown 4 times count once, with 2 attempts each.
    expect(new Set(results.items.map((i) => i.itemId)).size).toBe(results.items.length);
    expect(results.items.filter((i) => i.kind === 'sentence').map((i) => i.attempts)).toEqual([2, 2]);
  });

  it('results give evidence and stars from first-try accuracy', () => {
    const pack = makeStory();
    const quest = createQuest(pack, opts);
    quest.start();
    const wrongOne = quest.state.challenge!;
    quest.answer(fail(pack, wrongOne));
    playPerfect(quest, pack);
    const r = quest.results();
    expect(quest.state.phase).toBe('victory');
    const ev = r.items.find((i) => i.itemId === wrongOne.itemId)!;
    expect(ev).toMatchObject({ kind: 'word', attempts: 2, correctFirstTry: false, solved: true });
    expect(ev.label).toBe(pack.vocabulary.find((w) => w.id === wrongOne.itemId)!.term);
    expect(r.practice).toEqual([ev.label]);
    // The Bone Hall shows 4 of the 6 words: 12 items seen, 11 first try = 91.7% -> 3 stars.
    expect(r.items.length).toBe(12);
    expect(r.stars).toBe(3);
    expect(r.firstTryAccuracy).toBeCloseTo(11 / 12);

    const q2 = createQuest(pack, opts);
    q2.start();
    for (let i = 0; i < 3; i++) q2.answer(fail(pack, q2.state.challenge!));
    playPerfect(q2, pack);
    // Three wrong words come back after two turns each and clear the hall with one new word:
    // 4 words seen, 12 items, 9 first try = 75%.
    expect(q2.results().items.length).toBe(12);
    expect(q2.results().firstTryAccuracy).toBeCloseTo(9 / 12);
    expect(q2.results().stars).toBe(2);

    // Five distinct items wrong at their first showing: below 70% -> 1 star.
    const q3 = createQuest(pack, opts);
    q3.start();
    let wrong = 0;
    while (q3.state.phase === 'challenge') {
      const c = q3.state.challenge!;
      const miss = !c.retry && wrong < 5;
      if (miss) wrong += 1;
      q3.answer(miss ? fail(pack, c) : solve(pack, c));
    }
    expect(q3.results().practice.length).toBe(5);
    expect(q3.results().firstTryAccuracy).toBeLessThan(0.7);
    expect(q3.results().stars).toBe(1);
  });

  it('the dragon has as many HP as questions, between 3 and 5', () => {
    const q = makeStory().questions;
    const five = [...q, { ...q[0]!, id: 'q-4' }, { ...q[0]!, id: 'q-5' }, { ...q[0]!, id: 'q-6' }];
    const hp = (pack: StoryInput) => {
      const quest = createQuest(pack, opts);
      const enc = ofType(playPerfect(quest, pack), 'encounterStart')[3]!.encounter;
      return enc.enemies[0]!.maxHp;
    };
    expect(hp(makeStory({ questions: five }))).toBe(5);
    expect(hp(makeStory({ questions: q.slice(0, 2) }))).toBe(3);
  });
});

describe('fallbacks for missing kinds', () => {
  const counts = { word: 1, fill: 0, sentence: 0, question: 1 };
  it('resolveKind takes the next kind in the cycle word, fill, sentence, question', () => {
    expect(resolveKind('fill', counts)).toBe('question');
    expect(resolveKind('sentence', counts)).toBe('question');
    expect(resolveKind('question', { ...counts, question: 0 })).toBe('word');
    expect(resolveKind('word', { word: 0, fill: 3, sentence: 0, question: 0 })).toBe('fill');
    expect(() => resolveKind('word', { word: 0, fill: 0, sentence: 0, question: 0 })).toThrow();
  });

  it('a story with only words uses words everywhere and still wins', () => {
    const pack = makeStory({ questions: [], sentences: [], fills: [] });
    const quest = createQuest(pack, opts);
    const all = playPerfect(quest, pack);
    const encounters = ofType(all, 'encounterStart').map((e) => e.encounter);
    expect(encounters.map((e) => e.kind)).toEqual(['word', 'word', 'word', 'word']);
    expect(encounters.every((e) => e.intro.endsWith("Show what the story's words mean!"))).toBe(true);
    expect(ofType(all, 'turn').every((t) => t.challenge.kind === 'word')).toBe(true);
    expect(quest.state.phase).toBe('victory');
  });

  it('missing sentences fall back to questions, missing questions to words', () => {
    const pack = makeStory({ sentences: [], questions: [] });
    const kinds = ofType(playPerfect(createQuest(pack, opts), pack), 'encounterStart').map(
      (e) => e.encounter.kind,
    );
    expect(kinds).toEqual(['word', 'word', 'fill', 'word']);
  });

  it('caps enemy HP at two turns per item', () => {
    const base = makeStory();
    const pack = makeStory({ sentences: [base.sentences[0]!], fills: base.fills.slice(0, 1) });
    const encounters = ofType(playPerfect(createQuest(pack, opts), pack), 'encounterStart').map(
      (e) => e.encounter,
    );
    expect(encounters[1]!.enemies.map((e) => e.maxHp)).toEqual([1, 1]);
    expect(encounters[2]!.enemies.map((e) => e.maxHp)).toEqual([2]);
    // Enemies never drop below 1 HP: one word and no other items leaves the 4 encounters winnable.
    const tiny = makeStory({ vocabulary: [base.vocabulary[0]!], sentences: [], fills: [], questions: [] });
    const q = createQuest(tiny, opts);
    playPerfect(q, tiny);
    expect(q.state.phase).toBe('victory');
  });
});

describe('challenge building', () => {
  const challengesOf = (pack: StoryInput, seed: number, helper = false): Challenge[] => {
    const quest = createQuest(pack, { seed, helper });
    return ofType(playPerfect(quest, pack), 'turn').map((t) => t.challenge);
  };

  it('word: 4 options (3 in helper mode), never two identical texts, the answer present', () => {
    const pack = makeStory();
    for (const helper of [false, true]) {
      const words = challengesOf(pack, 5, helper).filter((c) => c.kind === 'word');
      expect(words.length).toBeGreaterThan(0);
      for (const c of words) {
        if (c.kind !== 'word') continue;
        expect(c.options.length).toBe(helper ? 3 : 4);
        expect(new Set(c.options.map((o) => o.text)).size).toBe(c.options.length);
        expect(new Set(c.options.map((o) => o.id)).size).toBe(c.options.length);
        const word = pack.vocabulary.find((w) => w.id === c.itemId)!;
        expect(c.prompt).toBe(word.term);
        expect(c.options.some((o) => o.text === word.translation)).toBe(true);
        expect(c.hint).toBe(helper ? word.definition : word.phonetic);
      }
    }
  });

  it('word: distractors with the same Thai text as the answer are excluded', () => {
    const base = makeStory();
    const pack = makeStory({
      vocabulary: [
        base.vocabulary[0]!,
        { ...base.vocabulary[1]!, translation: base.vocabulary[0]!.translation },
        base.vocabulary[2]!,
      ],
    });
    for (const c of challengesOf(pack, 2)) {
      if (c.kind !== 'word') continue;
      expect(new Set(c.options.map((o) => o.text)).size).toBe(c.options.length);
    }
  });

  it('fill: options from other answers and story words, matched without case', () => {
    const base = makeStory();
    const pack = makeStory({
      fills: [{ id: 'f-1', sentence: 'Pip is a ___.', answer: 'Puppy' }, ...base.fills.slice(1)],
    });
    const fills = challengesOf(pack, 3).filter((c) => c.kind === 'fill');
    expect(fills.length).toBeGreaterThan(0);
    for (const c of fills) {
      if (c.kind !== 'fill') continue;
      expect(c.options.length).toBe(4);
      const texts = c.options.map((o) => o.text.toLowerCase());
      expect(new Set(texts).size).toBe(4);
      const fill = pack.fills.find((f) => f.id === c.itemId)!;
      expect(c.prompt).toBe(fill.sentence);
      expect(texts.filter((t) => t === fill.answer.toLowerCase()).length).toBe(1);
      const allowed = [...pack.fills.map((f) => f.answer), ...pack.vocabulary.map((w) => w.term)].map((t) =>
        t.toLowerCase(),
      );
      for (const t of texts) expect(allowed).toContain(t);
    }
    // "puppy" (the story word) matches the answer "Puppy" without case.
    const quest = createQuest(pack, { seed: 3, helper: false });
    playPerfect(quest, pack);
    expect(quest.results().correctAnswers).toBe(14);
  });

  it('question: the workbook options shuffled, all present', () => {
    const pack = makeStory();
    const qs = challengesOf(pack, 8).filter((c) => c.kind === 'question');
    for (const c of qs) {
      if (c.kind !== 'question') continue;
      const q = pack.questions.find((q) => q.id === c.itemId)!;
      expect(c.prompt).toBe(q.question);
      expect(c.options.map((o) => o.text).sort()).toEqual(q.options.slice().sort());
    }
    // Over many seeds the order changes.
    const orders = new Set(
      Array.from({ length: 12 }, (_, s) =>
        challengesOf(pack, s).find((c) => c.kind === 'question')!.kind === 'question'
          ? (
              challengesOf(pack, s).find((c) => c.kind === 'question') as { options: { text: string }[] }
            ).options
              .map((o) => o.text)
              .join('|')
          : '',
      ),
    );
    expect(orders.size).toBeGreaterThan(1);
  });

  it('sentence: shuffled tokens are never in the correct order, and duplicate words are interchangeable', () => {
    const base = makeStory();
    const pack = makeStory({
      sentences: [
        ...base.sentences,
        {
          id: 's-3',
          text: 'Pip loves Mom and Pip loves Dad.',
          words: ['Pip', 'loves', 'Mom', 'and', 'Pip', 'loves', 'Dad.'],
        },
      ],
    });
    for (let seed = 0; seed < 30; seed++) {
      for (const c of challengesOf(pack, seed)) {
        if (c.kind !== 'sentence') continue;
        const s = pack.sentences.find((s) => s.id === c.itemId)!;
        expect(c.tokens.map((t) => t.text).sort()).toEqual(s.words.slice().sort());
        expect(c.tokens.map((t) => t.text)).not.toEqual(s.words);
        expect(new Set(c.tokens.map((t) => t.id)).size).toBe(c.tokens.length);
      }
    }
    // Swapping the two "Pip" tokens (or the two "loves") is still correct.
    const quest = createQuest(pack, { seed: 4, helper: false });
    quest.start();
    for (let i = 0; i < 4; i++) quest.answer(solve(pack, quest.state.challenge!));
    let c = quest.state.challenge!;
    while (c.kind !== 'sentence' || c.itemId !== 's-3') {
      quest.answer(solve(pack, c));
      c = quest.state.challenge!;
    }
    const right = solve(pack, c);
    if (right.kind !== 'order') throw new Error('unreachable');
    const swapped = right.tokenIds.slice();
    [swapped[0], swapped[4]] = [swapped[4]!, swapped[0]!];
    expect(swapped).not.toEqual(right.tokenIds);
    expect(ofType(quest.answer({ kind: 'order', tokenIds: swapped }), 'answer')[0]!.feedback.correct).toBe(
      true,
    );
  });

  it('sentence: a missing or extra token, or a wrong order, is wrong', () => {
    const pack = makeStory({ vocabulary: [], fills: [], questions: [] });
    const quest = createQuest(pack, opts);
    quest.start();
    const c = quest.state.challenge!;
    if (c.kind !== 'sentence') throw new Error('expected a sentence');
    const right = solve(pack, c);
    if (right.kind !== 'order') throw new Error('unreachable');
    const check = (tokenIds: string[]) =>
      ofType(quest.answer({ kind: 'order', tokenIds }), 'answer')[0]!.feedback.correct;
    expect(check(right.tokenIds.slice(1))).toBe(false);
    expect(() => quest.answer({ kind: 'order', tokenIds: ['zz'] })).toThrow(/unknown token/);
    expect(() => quest.answer({ kind: 'choice', optionId: 'o1' })).toThrow(/expected an order/);
  });

  it('a sentence of one repeated word cannot be shuffled and is still solvable', () => {
    // StoryInput needs two words per sentence; two equal words give one distinct token text.
    const pack = makeStory({
      vocabulary: [],
      fills: [],
      questions: [],
      sentences: [{ id: 's-1', text: 'Go Go', words: ['Go', 'Go'] }],
    });
    const quest = createQuest(pack, opts);
    playPerfect(quest, pack);
    expect(quest.state.phase).toBe('victory');
  });

  it('challenge ids are unique per showing and feedback carries the paragraph', () => {
    const pack = makeStory();
    const quest = createQuest(pack, opts);
    const all = playPerfect(quest, pack);
    const ids = ofType(all, 'turn').map((t) => t.challenge.challengeId);
    expect(new Set(ids).size).toBe(ids.length);
    const fills = ofType(all, 'answer').filter((_, i) => ofType(all, 'turn')[i]!.challenge.kind === 'fill');
    expect(fills.map((a) => a.feedback.paragraph)).toContain(0);
  });
});

describe('determinism', () => {
  it('the same seed replays the same events; another seed differs', () => {
    const pack = loadStory('pip-is-brave');
    const a = playPerfect(createQuest(pack, { seed: 99, helper: false }), pack);
    const b = playPerfect(createQuest(pack, { seed: 99, helper: false }), pack);
    expect(a).toEqual(b);
    const c = playPerfect(createQuest(pack, { seed: 100, helper: false }), pack);
    expect(c).not.toEqual(a);
  });

  it.each(STORY_IDS)('%s: a perfect run and a clumsy run both reach victory', (id) => {
    const pack = loadStory(id);
    const quest = createQuest(pack, { seed: 7, helper: true });
    playPerfect(quest, pack);
    expect(quest.state.phase).toBe('victory');
    expect(quest.results().stars).toBe(3);

    const clumsy = createQuest(pack, { seed: 7, helper: false });
    clumsy.start();
    let n = 0;
    while (clumsy.state.phase === 'challenge' && n < 500) {
      const c = clumsy.state.challenge!;
      clumsy.answer(n % 3 === 0 ? fail(pack, c) : solve(pack, c));
      n += 1;
    }
    expect(clumsy.state.phase).toBe('victory');
    expect(clumsy.state.courage).toBeGreaterThan(0);
    const r = clumsy.results();
    expect(r.practice.length).toBeGreaterThan(0);
    // A wrong item can still wait in the queue when its encounter ends: it stays unsolved in the evidence.
    expect(r.items.filter((i) => i.solved).length).toBeGreaterThan(r.items.length / 2);
    expect(r.correctAnswers).toBeGreaterThanOrEqual(r.items.filter((i) => i.solved).length);
  });

  it('state snapshots are copies: changing one does not change the quest', () => {
    const pack = makeStory();
    const quest = createQuest(pack, opts);
    quest.start();
    const s = quest.state;
    s.enemies[0]!.hp = 0;
    s.encounter!.enemies[0]!.defeated = true;
    expect(quest.state.enemies[0]!.hp).toBe(2);
    expect(quest.state.enemies[0]!.defeated).toBe(false);
  });
});
