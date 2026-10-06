/** The Sorcerer's Ziggurat rules of docs/game-sorcerer-ziggurat-3d.md. */
import { describe, expect, it } from 'vitest';
import { storyGameEvidenceSchema, toGameResults } from '@reading-advantage/advantage-play-kit-3d/contracts';
import { createRng } from '@reading-advantage/advantage-play-kit-3d/sim';
import {
  DECOYS,
  SCORE,
  TUNING,
  ZIGGURAT_EVENT_TYPES,
  climbOf,
  correctCubeOf,
  createSorcererZiggurat,
  cubeWord,
  cubesOf,
  evidenceOf,
  normalWord,
  openingEvents,
  resultsOf,
  scoreOf,
} from '../../src/sorcerer-ziggurat/core/index.js';
import { LONG_STORY, STORY, climb, create, ofType, wrongCube } from './helpers.js';

describe('content', () => {
  it('builds a climb of up to 5 rituals of 3 to 8 words, in a seeded order', () => {
    const a = climbOf(STORY, createRng(3), TUNING.maxRituals);
    expect(a.length).toBeGreaterThan(0);
    expect(a.length).toBeLessThanOrEqual(TUNING.maxRituals);
    a.forEach((r, i) => {
      expect(r.ritualId).toBe(`ritual-${i + 1}`);
      expect(r.words.length).toBeGreaterThanOrEqual(2);
      expect(r).toMatchObject({ refusals: 0, started: false, cleared: false });
    });
    expect(climbOf(STORY, createRng(3), 5).map((r) => r.id)).toEqual(a.map((r) => r.id));
    expect(new Set(a.map((r) => r.id)).size).toBe(a.length);
  });

  it('a tier has the right word and up to 2 different decoys on different lanes', () => {
    const [ritual] = climbOf(STORY, createRng(1), 5);
    const cubes = cubesOf(STORY, ritual!, 0, 1, createRng(2));
    expect(cubes.length).toBeGreaterThanOrEqual(2);
    expect(cubes.length).toBeLessThanOrEqual(1 + DECOYS);
    expect(cubes.filter((c) => c.correct)).toHaveLength(1);
    expect(cubes.find((c) => c.correct)!.word).toBe(cubeWord(ritual!.words[1]!));
    expect(new Set(cubes.map((c) => normalWord(c.word))).size).toBe(cubes.length);
    expect(new Set(cubes.map((c) => c.lane)).size).toBe(cubes.length);
  });

  it('a repeated word never appears as a decoy of itself', () => {
    const input = [
      { term: 'the cat and the dog', translation: 'x' },
      { term: 'a big red car', translation: 'y' },
    ];
    for (let seed = 1; seed <= 30; seed++) {
      const sim = createSorcererZiggurat(input, { seed, helper: false });
      while (sim.state.phase === 'climbing') {
        const keys = sim.state.cubes.map((c) => normalWord(c.word));
        expect(new Set(keys).size).toBe(keys.length);
        climb(sim);
      }
    }
  });

  it('accepts the APK SentenceInput; one-word sentences are skipped; no sentences is a finished climb', () => {
    const input = [
      { term: 'I like cats.', translation: 'ฉันชอบแมว' },
      { term: 'Hello', translation: 'สวัสดี' },
      { term: 'Dogs run fast.', translation: 'สุนัขวิ่งเร็ว' },
    ];
    const sim = createSorcererZiggurat(input, { seed: 1, helper: false });
    expect(sim.state.climb.map((r) => r.id).sort()).toEqual(['s-1', 's-3']);
    expect(createSorcererZiggurat([], { seed: 1, helper: false }).state).toMatchObject({ phase: 'complete', cubes: [] });
  });
});

describe('the climb', () => {
  it('starts at the foot of the first tier with courage and the opening events', () => {
    const sim = create(3);
    const first = sim.state.climb[0]!;
    expect(sim.state).toMatchObject({ phase: 'climbing', ritual: 0, tier: 0, courage: TUNING.courage, hero: { lane: 'forward', tier: 0 } });
    expect(correctCubeOf(sim.state)!.word).toBe(cubeWord(first.words[0]!));
    const opening = openingEvents(sim.state);
    expect(opening.map((e) => e.type)).toEqual(['ritualStarted', 'tierOffered']);
    expect(ofType(opening, 'ritualStarted')[0]).toMatchObject({ ritualId: 'ritual-1', sentenceId: first.id, words: first.words });
    expect(ofType(opening, 'tierOffered')[0]!.cubes.map((c) => c.id)).toEqual(sim.state.cubes.map((c) => c.id));
    expect(sim.tick()).toEqual([]);
  });

  it('the right cube lifts the hero one tier and offers the next word', () => {
    const sim = create(3);
    const first = sim.state.climb[0]!;
    const right = correctCubeOf(sim.state)!;
    const events = climb(sim);
    expect(ofType(events, 'stepped')).toEqual([{ type: 'stepped', cubeId: right.id, lane: right.lane, tier: 1 }]);
    expect(ofType(events, 'tierOffered')[0]).toMatchObject({ tier: 1 });
    expect(sim.state).toMatchObject({ tier: 1, steps: 1, hero: { lane: right.lane, tier: 1 } });
    expect(correctCubeOf(sim.state)!.word).toBe(cubeWord(first.words[1]!));
    expect(first.started).toBe(true);
  });

  it('a step by lane works like a step by cube id', () => {
    const sim = create(3);
    const right = correctCubeOf(sim.state)!;
    expect(ofType(sim.dispatch({ type: 'step', lane: right.lane }), 'stepped')).toHaveLength(1);
  });

  it('a wrong cube crumbles, is a reading attempt, costs one courage, and takes no second step', () => {
    const sim = create(3);
    const wrong = wrongCube(sim);
    const events = sim.dispatch({ type: 'step', cubeId: wrong.id });
    expect(ofType(events, 'cubeCrumbled')).toEqual([{ type: 'cubeCrumbled', id: wrong.id, lane: wrong.lane }]);
    expect(ofType(events, 'courageChanged')).toEqual([{ type: 'courageChanged', courage: TUNING.courage - 1 }]);
    expect(sim.state).toMatchObject({ tier: 0, courage: TUNING.courage - 1, crumbled: 1 });
    expect(sim.state.climb[0]).toMatchObject({ refusals: 1, started: true, cleared: false });
    expect(sim.dispatch({ type: 'step', cubeId: wrong.id })).toEqual([]);
    expect(sim.state.courage).toBe(TUNING.courage - 1);
  });

  it('unknown cubes, lanes without a cube, and a missing target do nothing', () => {
    const sim = create(3);
    expect(sim.dispatch({ type: 'step', cubeId: 'nope' })).toEqual([]);
    expect(sim.dispatch({ type: 'step' })).toEqual([]);
    const free = (['left', 'forward', 'right'] as const).find((l) => !sim.state.cubes.some((c) => c.lane === l));
    if (free) expect(sim.dispatch({ type: 'step', lane: free })).toEqual([]);
  });

  it('when courage runs out the team rests: full courage, the tier returns, the place is kept, no game over', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const sim = create(seed);
      climb(sim);
      const tier = sim.state.tier;
      let rested: ReturnType<typeof ofType<'teamRested'>> = [];
      for (let k = 0; k < TUNING.courage * 3 && rested.length === 0; k++) {
        const wrong = sim.state.cubes.find((c) => !c.correct && !c.spent);
        if (!wrong) {
          // A tier with fewer decoys than courage: the rest happens on a later tier.
          climb(sim);
          continue;
        }
        rested = ofType(sim.dispatch({ type: 'step', cubeId: wrong.id }), 'teamRested');
      }
      if (rested.length === 0) continue;
      expect(rested[0]).toMatchObject({ type: 'teamRested', courage: TUNING.courage });
      expect(sim.state).toMatchObject({ phase: 'climbing', courage: TUNING.courage, rests: 1 });
      expect(sim.state.cubes.every((c) => !c.spent)).toBe(true);
      expect(sim.state.tier).toBeGreaterThanOrEqual(tier);
      expect(ZIGGURAT_EVENT_TYPES).not.toContain('gameOver');
      return;
    }
    throw new Error('no seed reached a rest');
  });

  it('a sentence ends with ritualCleared, then the next ritual starts; the last one ends with climbComplete', () => {
    const sim = create(3);
    const events: ReturnType<typeof climb> = [];
    while (sim.state.phase === 'climbing') events.push(...climb(sim));
    const total = sim.state.climb.reduce((n, r) => n + r.words.length, 0);
    expect(ofType(events, 'stepped')).toHaveLength(total);
    expect(ofType(events, 'ritualCleared')).toHaveLength(sim.state.rituals);
    expect(ofType(events, 'ritualStarted')).toHaveLength(sim.state.rituals - 1);
    expect(ofType(events, 'climbComplete')).toEqual([{ type: 'climbComplete', rituals: sim.state.rituals }]);
    expect(sim.state).toMatchObject({ phase: 'complete', cubes: [], ritualsCleared: sim.state.rituals });
    expect(sim.dispatch({ type: 'step', lane: 'left' })).toEqual([]);
  });
});

describe('evidence and results', () => {
  it('has one sentence item per ritual, attempts = crumbled cubes + 1, and score 100 per tier', () => {
    const sim = create(3);
    sim.dispatch({ type: 'step', cubeId: wrongCube(sim).id });
    while (sim.state.phase === 'climbing') climb(sim);
    const evidence = evidenceOf(sim.state, STORY, 3, 1234);
    expect(storyGameEvidenceSchema.parse(evidence)).toEqual(evidence);
    expect(evidence.items).toHaveLength(sim.state.rituals);
    expect(evidence.items.map((i) => i.itemId)).toEqual(sim.state.climb.map((r) => r.id));
    expect(evidence.items[0]).toMatchObject({ itemKind: 'sentence', attempts: 2, correctFirstTry: false, solved: true });
    expect(evidence.items[1]).toMatchObject({ attempts: 1, correctFirstTry: true, solved: true });
    expect(evidence.practice).toEqual([sim.state.climb[0]!.text]);
    expect(scoreOf(sim.state)).toBe(sim.state.steps * SCORE.step);
    const { results, outcome } = resultsOf(sim.state, STORY, 3, 1234);
    expect(results).toEqual(toGameResults(evidence, scoreOf(sim.state)));
    expect(outcome).toBe('victory');
  });

  it('a ritual the student never touched has no evidence item', () => {
    const sim = create(3);
    climb(sim);
    expect(evidenceOf(sim.state, STORY, 3, 0).items).toHaveLength(1);
  });

  it('speed and rests never change the results: wrong cubes and a slow climb give the same score and xp', () => {
    const clean = create(5, false, LONG_STORY);
    const messy = create(5, false, LONG_STORY);
    while (clean.state.phase === 'climbing') climb(clean);
    while (messy.state.phase === 'climbing') {
      const wrong = messy.state.cubes.find((c) => !c.correct && !c.spent);
      if (wrong && messy.state.rests === 0) messy.dispatch({ type: 'step', cubeId: wrong.id });
      climb(messy);
    }
    const a = resultsOf(clean.state, LONG_STORY, 5, 1).results;
    const b = resultsOf(messy.state, LONG_STORY, 5, 999_999).results;
    expect(b.score).toBe(a.score);
    expect(b.xp).toBeLessThanOrEqual(a.xp);
  });

  it('every tuning number is positive', () => {
    for (const v of Object.values(TUNING)) expect(v).toBeGreaterThan(0);
  });
});
