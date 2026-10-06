/** The Paladin's Twin Soul rules: waves, shades, wrong strikes, rest, monsters, evidence. */
import { describe, expect, it } from 'vitest';
import { storyGameEvidenceSchema } from '@reading-advantage/advantage-play-kit-3d/contracts';
import { createRng } from '@reading-advantage/advantage-play-kit-3d/sim';
import {
  HEROES,
  MONSTER_KINDS,
  TUNING,
  TWIN_SOUL_EVENT_TYPES,
  createTwinSoul,
  evidenceOf,
  monstersOf,
  resultsOf,
  shadesOf,
  targetsOf,
  wordsOf,
} from '../../src/paladins-twin-soul/core/index.js';
import { SHORT_STORY, STORY, create, ofType, playToEnd, types, wrongShade, wrongStrike } from './helpers.js';

const SEEDS = Array.from({ length: 30 }, (_, i) => i + 1);

describe('content', () => {
  it('targets every story word once, in a seeded order', () => {
    const targets = targetsOf(STORY, createRng(3));
    expect(targets).toHaveLength(STORY.vocabulary.length);
    expect(new Set(targets.map((t) => t.id)).size).toBe(STORY.vocabulary.length);
    expect(targetsOf(STORY, createRng(3)).map((t) => t.id)).toEqual(targets.map((t) => t.id));
    expect(targetsOf(STORY, createRng(4)).map((t) => t.id)).not.toEqual(targets.map((t) => t.id));
  });

  it('accepts the APK VocabularyInput too', () => {
    expect(wordsOf([{ term: 'cat', translation: 'แมว' }, { term: '', translation: 'x' }, { term: 'dog', translation: 'หมา' }])).toEqual([
      { id: 'w-1', term: 'cat', translation: 'แมว' },
      { id: 'w-3', term: 'dog', translation: 'หมา' },
    ]);
    const sim = createTwinSoul([{ term: 'cat', translation: 'แมว' }, { term: 'dog', translation: 'หมา' }], { seed: 1, helper: false });
    expect(sim.state.shades).toHaveLength(2);
    playToEnd(sim);
    expect(sim.state.phase).toBe('victory');
  });

  it('a run with no words is over before it starts', () => {
    const sim = createTwinSoul([], { seed: 1, helper: false });
    expect(sim.state.phase).toBe('victory');
    expect(sim.state.shades).toEqual([]);
    expect(sim.dispatch({ type: 'start' })).toEqual([]);
  });

  it('monsters: 4 words each, the dragon takes the rest, HP counts the words', () => {
    expect(monstersOf(3, 4)).toEqual([{ kind: 'skeleton', hp: 3, maxHp: 3 }]);
    expect(monstersOf(6, 4).map((m) => [m.kind, m.hp])).toEqual([['skeleton', 4], ['mimic', 2]]);
    const many = monstersOf(14, 4);
    expect(many.map((m) => m.kind)).toEqual([...MONSTER_KINDS]);
    expect(many.reduce((s, m) => s + m.hp, 0)).toBe(14);
  });

  it('shades: one captor and distinct decoy terms, seeded', () => {
    const targets = targetsOf(STORY, createRng(1));
    const shades = shadesOf(targets, targets[0]!.id, 5, 1, createRng(5));
    expect(shades).toHaveLength(6);
    expect(shades.filter((s) => s.wordId === targets[0]!.id)).toHaveLength(1);
    expect(new Set(shades.map((s) => s.term.toLowerCase())).size).toBe(6);
    expect(shadesOf(targets, targets[0]!.id, 5, 1, createRng(5))).toEqual(shades);
  });
});

describe('wave', () => {
  it.each(SEEDS)('seed %i: the first wave has a formation with the captor', (seed) => {
    const sim = create(seed);
    const s = sim.state;
    expect(s.shades).toHaveLength(Math.min(TUNING.decoys, s.targetCount - 1) + 1);
    expect(s.shades.filter((x) => x.wordId === s.target!.itemId)).toHaveLength(1);
    expect(s.target!.translation).toBe(s.targets[0]!.translation);
  });

  it('helper mode has fewer shades', () => {
    expect(create(1, true).state.shades).toHaveLength(TUNING.helperDecoys + 1);
    expect(create(1, false).state.shades).toHaveLength(TUNING.decoys + 1);
  });

  it('start shows the monster, the wave, and the capture once', () => {
    const sim = create(2);
    const events = sim.dispatch({ type: 'start' });
    expect(types(events)).toEqual(['monsterAppeared', 'waveShown', 'captured']);
    const wave = ofType(events, 'waveShown')[0]!;
    expect(wave.shades.map((x) => x.id)).toEqual(sim.state.shades.map((x) => x.id));
    expect(ofType(events, 'captured')[0]!.shade).toBe(sim.state.shades.find((x) => x.wordId === wave.itemId)!.id);
    expect(sim.dispatch({ type: 'start' })).toEqual([]);
  });

  it('a strike before start does nothing', () => {
    const sim = create(2);
    expect(sim.dispatch({ type: 'strike', shade: sim.state.shades[0]!.id })).toEqual([]);
  });
});

describe('strikes', () => {
  it('a wrong shade falls, the monster strikes, courage drops by one', () => {
    const sim = create(3);
    sim.dispatch({ type: 'start' });
    const shade = wrongShade(sim)!;
    const events = sim.dispatch({ type: 'strike', shade });
    expect(types(events)).toEqual(['shadeFell', 'monsterStrike']);
    expect(sim.state.courage).toBe(TUNING.maxCourage - 1);
    expect(sim.state.shades.find((x) => x.id === shade)!.fallen).toBe(true);
    expect(sim.state.targetIndex).toBe(0);
    expect(sim.state.targets[0]!.attempts).toBe(1);
    expect(sim.state.targets[0]!.correctFirstTry).toBe(false);
    expect(sim.state.misses).toBe(1);
  });

  it('a fallen shade or an unknown shade is rejected and costs nothing', () => {
    const sim = create(3);
    sim.dispatch({ type: 'start' });
    const shade = wrongShade(sim)!;
    sim.dispatch({ type: 'strike', shade });
    const before = sim.snapshot();
    expect(types(sim.dispatch({ type: 'strike', shade }))).toEqual(['strikeRejected']);
    expect(types(sim.dispatch({ type: 'strike', shade: 'nope' }))).toEqual(['strikeRejected']);
    expect(sim.snapshot()).toEqual(before);
  });

  it('the captor frees the soul: points, a hero strike, the other shades scatter, the next wave comes', () => {
    const sim = create(4);
    sim.dispatch({ type: 'start' });
    const first = sim.state.target!.itemId;
    const captor = sim.state.shades.find((x) => x.wordId === first)!;
    const events = sim.dispatch({ type: 'strike', shade: captor.id });
    expect(types(events).slice(0, 3)).toEqual(['soulFreed', 'heroStrike', 'shadesScattered']);
    expect(ofType(events, 'soulFreed')[0]).toMatchObject({ shade: captor.id, itemId: first, firstTry: true, twins: 1, points: TUNING.pointsPerSoul });
    expect(ofType(events, 'heroStrike')[0]!.hero).toBe(HEROES[0]);
    expect(ofType(events, 'shadesScattered')[0]!.shades).toHaveLength(sim.state.targetCount > 0 ? 5 : 0);
    expect(types(events).slice(-2)).toEqual(['waveShown', 'captured']);
    expect(sim.state.twins).toBe(1);
    expect(sim.state.score).toBe(TUNING.pointsPerSoul);
    expect(sim.state.targetIndex).toBe(1);
    expect(sim.state.monster!.hp).toBe(sim.state.monster!.maxHp - 1);
    expect(sim.state.targets[0]).toMatchObject({ attempts: 1, correctFirstTry: true, solved: true });
  });

  it('a soul freed after a wrong shade is not a first try, and the heroes take turns', () => {
    const sim = create(5);
    sim.dispatch({ type: 'start' });
    wrongStrike(sim);
    const captor = sim.state.shades.find((x) => x.wordId === sim.state.target!.itemId)!;
    const e1 = sim.dispatch({ type: 'strike', shade: captor.id });
    expect(ofType(e1, 'soulFreed')[0]!.firstTry).toBe(false);
    expect(sim.state.targets[0]).toMatchObject({ attempts: 2, correctFirstTry: false, solved: true });
    const e2 = sim.dispatch({ type: 'strike', shade: sim.state.shades.find((x) => x.wordId === sim.state.target!.itemId)!.id });
    expect(ofType(e1, 'heroStrike')[0]!.hero).toBe(HEROES[0]);
    expect(ofType(e2, 'heroStrike')[0]!.hero).toBe(HEROES[1]);
  });

  it('at zero courage the team rests and comes back; there is no game over', () => {
    const sim = create(6);
    sim.dispatch({ type: 'start' });
    const events: ReturnType<typeof wrongStrike> = [];
    for (let i = 0; i < TUNING.maxCourage; i++) events.push(...wrongStrike(sim));
    expect(ofType(events, 'monsterStrike').map((e) => e.courage)).toEqual([4, 3, 2, 1, 0]);
    expect(ofType(events, 'rest')).toEqual([{ type: 'rest', courage: TUNING.restCourage }]);
    expect(sim.state.courage).toBe(TUNING.restCourage);
    expect(sim.state.phase).toBe('playing');
    // The captor stays: the wave can always be finished.
    expect(sim.state.shades.some((x) => x.wordId === sim.state.target!.itemId && !x.fallen)).toBe(true);
  });

  it('even after every wrong shade fell, the captor frees the soul', () => {
    const sim = create(8, false, SHORT_STORY);
    sim.dispatch({ type: 'start' });
    while (wrongShade(sim)) wrongStrike(sim);
    const captor = sim.state.shades.find((x) => x.wordId === sim.state.target!.itemId)!;
    expect(ofType(sim.dispatch({ type: 'strike', shade: captor.id }), 'soulFreed')).toHaveLength(1);
  });
});

describe('the run', () => {
  it.each(SEEDS.slice(0, 8))('seed %i: monsters fall in order and the last soul wins', (seed) => {
    const sim = create(seed);
    const events = playToEnd(sim);
    const count = sim.state.targetCount;
    expect(ofType(events, 'soulFreed')).toHaveLength(count);
    expect(ofType(events, 'heroStrike')).toHaveLength(count);
    expect(ofType(events, 'monsterDefeated').map((e) => e.kind)).toEqual(monstersOf(count, TUNING.wordsPerMonster).map((m) => m.kind));
    expect(ofType(events, 'monsterAppeared').length).toBe(monstersOf(count, TUNING.wordsPerMonster).length);
    expect(events.at(-1)!.type).toBe('victory');
    expect(sim.state.phase).toBe('victory');
    expect(sim.state.monster).toBeNull();
    expect(sim.dispatch({ type: 'strike', shade: 'w1s1' })).toEqual([]);
  });

  it('only declared event types appear, mixed right and wrong play included', () => {
    const sim = create(11);
    const events = [...sim.dispatch({ type: 'start' })];
    for (let i = 0; sim.state.phase === 'playing' && i < 400; i++) {
      if (i % 3 === 0 && wrongShade(sim)) events.push(...wrongStrike(sim));
      else events.push(...sim.dispatch({ type: 'strike', shade: sim.state.shades.find((x) => x.wordId === sim.state.target!.itemId)!.id }));
    }
    expect(sim.state.phase).toBe('victory');
    for (const e of events) expect(TWIN_SOUL_EVENT_TYPES).toContain(e.type);
  });
});

describe('evidence', () => {
  it('one item per story word, parsed by the contract; speed is not used', () => {
    const sim = create(12, false, STORY);
    sim.dispatch({ type: 'start' });
    wrongStrike(sim);
    playToEnd(sim);
    const slow = evidenceOf(sim.state, STORY, 12, 9_999_999);
    const fast = evidenceOf(sim.state, STORY, 12, 1);
    expect(storyGameEvidenceSchema.parse(slow)).toEqual(slow);
    expect(slow.items).toHaveLength(STORY.vocabulary.length);
    expect(new Set(slow.items.map((i) => i.itemId))).toEqual(new Set(STORY.vocabulary.map((v) => v.id)));
    expect({ ...slow, durationMs: 0 }).toEqual({ ...fast, durationMs: 0 });
    const missed = slow.items.filter((i) => !i.correctFirstTry);
    expect(missed.length).toBeGreaterThanOrEqual(1);
    expect(slow.practice.length).toBe(missed.length);
    const { results, outcome } = resultsOf(sim.state, STORY, 12, 1000);
    expect(results.score).toBe(sim.state.score);
    expect(outcome).toBe('victory');
  });
});
