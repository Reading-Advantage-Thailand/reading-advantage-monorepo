/** The Magic Defense rules: waves, lanes, shields, courage, and the evidence. */
import { describe, expect, it } from 'vitest';
import { storyGameEvidenceSchema } from '@reading-advantage/advantage-play-kit-3d/contracts';
import { createRng } from '@reading-advantage/advantage-play-kit-3d/sim';
import {
  MAGIC_DEFENSE_EVENT_TYPES,
  TUNING,
  createMagicDefense,
  evidenceOf,
  formationOf,
  resultsOf,
  roundOf,
  standingCastles,
  targetsOf,
  waveSizes,
  wordsOf,
} from '../../src/magic-defense/core/index.js';
import { SHORT_STORY, STORY, castRight, castWrong, create, ofType, playToEnd, rightChoice, types, wrongChoice } from './helpers.js';

const SEEDS = Array.from({ length: 30 }, (_, i) => i + 1);

describe('content', () => {
  it('targets every story word once, in a seeded order, in evenly sized waves', () => {
    const targets = targetsOf(STORY, createRng(3), TUNING.wordsPerWave);
    expect(targets).toHaveLength(STORY.vocabulary.length);
    expect(new Set(targets.map((t) => t.id)).size).toBe(STORY.vocabulary.length);
    for (const t of targets) {
      const w = STORY.vocabulary.find((v) => v.id === t.id)!;
      expect([t.term, t.translation]).toEqual([w.term, w.translation]);
      expect(t).toMatchObject({ attempts: 0, correctFirstTry: false, solved: false });
    }
    expect(targetsOf(STORY, createRng(3), 5).map((t) => t.id)).toEqual(targets.map((t) => t.id));
    expect(targetsOf(STORY, createRng(4), 5).map((t) => t.id)).not.toEqual(targets.map((t) => t.id));
  });

  it('waveSizes spreads the words evenly', () => {
    expect(waveSizes(11, 5)).toEqual([4, 4, 3]);
    expect(waveSizes(10, 5)).toEqual([5, 5]);
    expect(waveSizes(6, 5)).toEqual([3, 3]);
    expect(waveSizes(4, 5)).toEqual([4]);
    expect(waveSizes(0, 5)).toEqual([]);
  });

  it('accepts the APK VocabularyInput too', () => {
    const input = [{ term: 'cat', translation: 'แมว' }, { term: '', translation: 'x' }, { term: 'dog', translation: 'หมา' }, { term: 'fish', translation: 'ปลา' }];
    expect(wordsOf(input).map((w) => w.id)).toEqual(['w-1', 'w-3', 'w-4']);
    const sim = createMagicDefense(input, { seed: 1, helper: false });
    expect(sim.state.targetCount).toBe(3);
    playToEnd(sim);
    expect(sim.state.phase).toBe('victory');
  });

  it('a formation has one caster per castle, alternates the kinds, and has unique ids', () => {
    const a = formationOf(1, 3);
    expect(a.map((e) => e.lane)).toEqual([0, 1, 2]);
    expect(a.map((e) => e.kind)).toEqual(['mimic', 'skeleton', 'mimic']);
    expect(formationOf(2, 3).map((e) => e.kind)).toEqual(['skeleton', 'mimic', 'skeleton']);
    expect(new Set([...a, ...formationOf(2, 3)].map((e) => e.id)).size).toBe(6);
  });

  it('a round carries the right word once, distinct other words, and a standing castle', () => {
    const targets = targetsOf(STORY, createRng(2), 5);
    const enemies = formationOf(1, 3);
    const rng = createRng(9);
    for (const t of targets) {
      const round = roundOf(targets, t.id, enemies, [3, 0, 2], 3, rng);
      expect(round.prompt).toBe(t.translation);
      expect(round.choices).toHaveLength(3);
      expect(round.choices.filter((c) => c.wordId === t.id)).toHaveLength(1);
      expect(new Set(round.choices.map((c) => c.term.toLowerCase())).size).toBe(3);
      expect(round.choices.every((c) => !c.blocked)).toBe(true);
      expect(round.castle).not.toBe(1);
      expect(round.enemyId).toBe(enemies[round.castle]!.id);
    }
    expect(standingCastles([0, 0, 0])).toEqual([0, 1, 2]);
  });
});

describe('the run', () => {
  it('start shows the first formation and the first missile, once', () => {
    const sim = create(5);
    expect(types(sim.dispatch({ type: 'cast', choice: 0 }))).toEqual(['rejected']);
    expect(types(sim.dispatch({ type: 'storm' }))).toEqual(['rejected']);
    const events = sim.dispatch({ type: 'start' });
    expect(types(events)).toEqual(['waveAppeared', 'roundShown']);
    expect(ofType(events, 'waveAppeared')[0]).toMatchObject({ wave: 1, waveCount: sim.state.waveCount });
    expect(ofType(events, 'waveAppeared')[0]!.enemies).toHaveLength(TUNING.castles);
    expect(types(sim.dispatch({ type: 'start' }))).toEqual(['rejected']);
  });

  it('Helper mode has 2 castles and 2 spell words', () => {
    const sim = create(5, true);
    expect(sim.state.enemies).toHaveLength(TUNING.helperCastles);
    expect(sim.state.castles).toHaveLength(TUNING.helperCastles);
    expect(sim.state.round!.choices).toHaveLength(TUNING.helperChoices);
  });

  it('a right spell scores coins that grow with the streak, fills the mana, and shows the next missile', () => {
    const sim = create(5);
    sim.dispatch({ type: 'start' });
    const first = sim.state.round!.wordId;
    const a = castRight(sim);
    expect(types(a).slice(0, 2)).toEqual(['cast', 'scored']);
    expect(ofType(a, 'cast')[0]).toMatchObject({ correct: true, streak: 1 });
    expect(ofType(a, 'scored')[0]).toMatchObject({ coins: TUNING.coins, mana: TUNING.manaPerSpell });
    expect(sim.state.targets.find((t) => t.id === first)).toMatchObject({ solved: true, attempts: 1, correctFirstTry: true });
    expect(sim.state.round!.wordId).not.toBe(first);
    expect(ofType(castRight(sim), 'scored')[0]!.coins).toBe(TUNING.coins + TUNING.streakCoins);
    for (let i = 0; i < 4 && sim.state.phase === 'playing'; i++) castRight(sim);
    expect(sim.state.bestStreak).toBeGreaterThan(2);
  });

  it('a wrong spell fails, the missile hits its castle, the word shuts, and the same missile stays', () => {
    const sim = create(5);
    sim.dispatch({ type: 'start' });
    const word = sim.state.round!.wordId;
    const castle = sim.state.round!.castle;
    const choice = wrongChoice(sim);
    const events = sim.dispatch({ type: 'cast', choice });
    expect(types(events)).toEqual(['cast', 'castleHit', 'roundShown']);
    expect(ofType(events, 'cast')[0]).toMatchObject({ correct: false, choice, castle });
    expect(ofType(events, 'castleHit')[0]).toMatchObject({ castle, health: TUNING.castleHealth - 1 });
    expect(sim.state.castles[castle]).toBe(TUNING.castleHealth - 1);
    expect(sim.state.round!.wordId).toBe(word);
    expect(sim.state.round!.castle).toBe(castle);
    expect(sim.state.round!.choices.find((c) => c.index === choice)!.blocked).toBe(true);
    expect(types(sim.dispatch({ type: 'cast', choice }))).toEqual(['rejected']);
    expect(sim.state.targets.find((t) => t.id === word)).toMatchObject({ attempts: 1, correctFirstTry: false, solved: false });
    expect(sim.state.streak).toBe(0);
    castRight(sim);
    expect(sim.state.targets.find((t) => t.id === word)).toMatchObject({ attempts: 2, correctFirstTry: false, solved: true });
  });

  it('the right word never shuts, so every missile can be broken', () => {
    const sim = create(5);
    sim.dispatch({ type: 'start' });
    while (sim.state.round!.choices.some((c) => c.wordId !== sim.state.round!.wordId && !c.blocked)) castWrong(sim);
    const round = sim.state.round!;
    expect(round.choices.find((c) => c.wordId === round.wordId)!.blocked).toBe(false);
    expect(types(sim.dispatch({ type: 'cast', choice: rightChoice(sim) }))).toContain('scored');
  });

  it('when every castle has fallen the heroes rest and the castles stand again; never a game over', () => {
    const sim = create(5, true);
    sim.dispatch({ type: 'start' });
    let rested = false;
    for (let i = 0; i < 80 && sim.state.phase === 'playing'; i++) {
      const round = sim.state.round!;
      if (round.choices.every((c) => c.wordId === round.wordId || c.blocked)) {
        castRight(sim);
        continue;
      }
      const events = castWrong(sim);
      if (ofType(events, 'rest').length) {
        rested = true;
        expect(ofType(events, 'rest')[0]!.castles).toEqual(sim.state.castles);
        expect(sim.state.castles.every((h) => h === TUNING.castleHealth)).toBe(true);
        expect(sim.state.phase).toBe('playing');
      }
      expect(sim.state.castles.some((h) => h > 0)).toBe(true);
    }
    expect(rested).toBe(true);
  });

  it('a fallen castle is not targeted again until the rest', () => {
    const sim = create(11);
    sim.dispatch({ type: 'start' });
    sim.state.castles[1] = 0;
    for (let i = 0; i < 12 && sim.state.phase === 'playing'; i++) {
      castRight(sim);
      if (sim.state.round) expect(sim.state.round.castle).not.toBe(1);
    }
  });

  it('the storm needs full mana, then mends every castle and empties the mana', () => {
    const sim = create(5);
    sim.dispatch({ type: 'start' });
    castWrong(sim);
    expect(types(sim.dispatch({ type: 'storm' }))).toEqual(['rejected']);
    sim.state.mana = sim.state.maxMana;
    const events = sim.dispatch({ type: 'storm' });
    expect(types(events)).toEqual(['stormCast', 'roundShown']);
    expect(sim.state.mana).toBe(0);
    expect(sim.state.castles.every((h) => h === TUNING.castleHealth)).toBe(true);
    expect(ofType(events, 'roundShown')[0]!.round.choices.some((c) => c.blocked)).toBe(true);
  });

  it('the mana never passes its maximum', () => {
    const sim = create(6, false, STORY);
    sim.dispatch({ type: 'start' });
    while (sim.state.phase === 'playing') castRight(sim);
    expect(sim.state.mana).toBeLessThanOrEqual(sim.state.maxMana);
  });

  it('the formation falls when the words of the wave are done, and the next wave marches in', () => {
    const sim = create(6);
    sim.dispatch({ type: 'start' });
    const size = sim.state.waveSize;
    expect(sim.state.waveCount).toBeGreaterThan(1);
    const firstIds = sim.state.enemies.map((e) => e.id);
    let last: ReturnType<typeof castRight> = [];
    for (let i = 0; i < size; i++) last = castRight(sim);
    expect(types(last)).toEqual(['cast', 'scored', 'waveCleared', 'waveAppeared', 'roundShown']);
    expect(ofType(last, 'waveCleared')[0]!.enemies.map((e) => e.id)).toEqual(firstIds);
    expect(sim.state.wave).toBe(2);
    expect(sim.state.waveDone).toBe(0);
    expect(sim.state.enemies.map((e) => e.id)).not.toEqual(firstIds);
  });

  it.each(SEEDS)('seed %i: every word is cast exactly once to win, with and without mistakes', (seed) => {
    const sim = create(seed, seed % 2 === 0, SHORT_STORY);
    sim.dispatch({ type: 'start' });
    let guard = 0;
    while (sim.state.phase === 'playing' && guard++ < 300) {
      const round = sim.state.round!;
      if (seed % 3 === 0 && round.choices.some((c) => c.wordId !== round.wordId && !c.blocked)) castWrong(sim);
      castRight(sim);
    }
    expect(sim.state.phase).toBe('victory');
    expect(sim.state.round).toBeNull();
    expect(sim.state.targets.every((t) => t.solved)).toBe(true);
    expect(sim.state.castles.some((h) => h > 0)).toBe(true);
  });

  it('commands after the victory do nothing', () => {
    const sim = create(2, false, SHORT_STORY);
    playToEnd(sim);
    expect(sim.dispatch({ type: 'cast', choice: 0 })).toEqual([]);
    expect(sim.dispatch({ type: 'start' })).toEqual([]);
    expect(sim.dispatch({ type: 'storm' })).toEqual([]);
  });

  it('only declared event types appear', () => {
    const events = playToEnd(create(4));
    expect(events.every((e) => MAGIC_DEFENSE_EVENT_TYPES.includes(e.type))).toBe(true);
  });

  it('an empty input is a won run', () => {
    const sim = createMagicDefense([], { seed: 1, helper: false });
    expect(sim.state.phase).toBe('victory');
    expect(sim.dispatch({ type: 'start' })).toEqual([]);
  });
});

describe('evidence', () => {
  it('one item per word with the attempts and the first-try flag; the score is the coins', () => {
    const sim = create(8, false, SHORT_STORY);
    sim.dispatch({ type: 'start' });
    const wrongWord = sim.state.round!.wordId;
    castWrong(sim);
    while (sim.state.phase === 'playing') castRight(sim);
    const evidence = evidenceOf(sim.state, SHORT_STORY, 8, 12_345);
    expect(storyGameEvidenceSchema.parse(evidence)).toEqual(evidence);
    expect(evidence.items).toHaveLength(SHORT_STORY.vocabulary.length);
    const missed = evidence.items.find((i) => i.itemId === wrongWord)!;
    expect(missed).toMatchObject({ attempts: 2, correctFirstTry: false, solved: true });
    expect(evidence.items.filter((i) => i.correctFirstTry)).toHaveLength(SHORT_STORY.vocabulary.length - 1);
    const { results, outcome } = resultsOf(sim.state, SHORT_STORY, 8, 12_345);
    expect(results.score).toBe(sim.state.coins);
    expect(results.correctAnswers).toBe(SHORT_STORY.vocabulary.length);
    expect(outcome).toBe('victory');
  });
});
