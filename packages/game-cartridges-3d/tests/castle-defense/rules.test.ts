/** The Castle Defense rules: waves, the build, the towers, courage, and the evidence. */
import { describe, expect, it } from 'vitest';
import { storyGameEvidenceSchema } from '@reading-advantage/advantage-play-kit-3d/contracts';
import { createRng } from '@reading-advantage/advantage-play-kit-3d/sim';
import {
  CASTLE_DEFENSE_EVENT_TYPES,
  HITS,
  TUNING,
  attackersOf,
  bareWord,
  choicesOf,
  createCastleDefense,
  evidenceOf,
  resultsOf,
  shiftOf,
  wordKey,
} from '../../src/castle-defense/core/index.js';
import { SHORT_STORY, STORY, buildSentence, create, ofType, pickRight, pickWrong, playToEnd, types } from './helpers.js';

describe('content', () => {
  it('the waves are story sentences, each once, in a seeded order, at most maxWaves', () => {
    const shift = shiftOf(STORY, createRng(3), TUNING.maxWaves);
    expect(shift).toHaveLength(TUNING.maxWaves);
    expect(new Set(shift.map((s) => s.id)).size).toBe(shift.length);
    for (const s of shift) {
      const src = STORY.sentences.find((x) => x.id === s.id)!;
      expect(s.words).toEqual(src.words);
      expect(s).toMatchObject({ wrongs: 0, started: false, cleared: false });
    }
    expect(shiftOf(STORY, createRng(3), 6).map((s) => s.id)).toEqual(shift.map((s) => s.id));
    expect(shiftOf(STORY, createRng(4), 6).map((s) => s.id)).not.toEqual(shift.map((s) => s.id));
    expect(shiftOf(SHORT_STORY, createRng(1), 6)).toHaveLength(SHORT_STORY.sentences.length);
  });

  it('attackers cycle: two soldiers, three tanks, one boss, with the legacy hit points', () => {
    expect(attackersOf(1).map((a) => a.type)).toEqual(['soldier', 'soldier']);
    expect(attackersOf(2).map((a) => a.type)).toEqual(['tank', 'tank', 'tank']);
    expect(attackersOf(3).map((a) => [a.type, a.kind])).toEqual([['boss', 'dragon-fire']]);
    expect(attackersOf(4).map((a) => a.type)).toEqual(['soldier', 'soldier']);
    expect(attackersOf(2)[0]!.hits).toBe(HITS.tank);
    expect(new Set([1, 2, 3, 4].flatMap((w) => attackersOf(w).map((a) => a.id))).size).toBe(8);
  });

  it('a step carries the right word once and distinct other words, without punctuation', () => {
    const shift = shiftOf(STORY, createRng(2), 6);
    const rng = createRng(9);
    for (let w = 0; w < shift.length; w++) {
      for (let i = 0; i < shift[w]!.words.length; i++) {
        const choices = choicesOf(shift, w, i, 3, rng);
        expect(choices).toHaveLength(3);
        expect(choices.filter((c) => c.right)).toHaveLength(1);
        expect(choices.find((c) => c.right)!.word).toBe(bareWord(shift[w]!.words[i]!));
        expect(new Set(choices.map((c) => wordKey(c.word))).size).toBe(3);
        expect(choices.every((c) => !c.blocked)).toBe(true);
      }
    }
  });
});

describe('the run', () => {
  it('start shows the first wave and the first step, once', () => {
    const sim = create(5);
    expect(types(sim.dispatch({ type: 'pick', choice: 0 }))).toEqual(['rejected']);
    expect(types(sim.dispatch({ type: 'build', post: 0 }))).toEqual(['rejected']);
    const events = sim.dispatch({ type: 'start' });
    expect(types(events)).toEqual(['waveAppeared', 'stepShown']);
    expect(ofType(events, 'waveAppeared')[0]).toMatchObject({ wave: 1, waveCount: sim.state.waveCount });
    expect(ofType(events, 'waveAppeared')[0]!.attackers).toHaveLength(2);
    expect(types(sim.dispatch({ type: 'start' }))).toEqual(['rejected']);
  });

  it('Helper mode has 2 words on the card', () => {
    expect(create(5, true).state.step!.choices).toHaveLength(TUNING.helperChoices);
    expect(create(5).state.step!.choices).toHaveLength(TUNING.choices);
  });

  it('a right word joins the sentence, scores coins that grow with the streak, and shows the next step', () => {
    const sim = create(5);
    sim.dispatch({ type: 'start' });
    const sentence = sim.state.shift[0]!;
    const a = pickRight(sim);
    expect(types(a)).toEqual(['picked', 'scored', 'stepShown']);
    expect(ofType(a, 'picked')[0]).toMatchObject({ correct: true, streak: 1, index: 0 });
    expect(sim.state.built).toEqual([sentence.words[0]]);
    expect(sim.state.step!.index).toBe(1);
    expect(ofType(pickRight(sim), 'scored')[0]!.coins).toBe(TUNING.coins + TUNING.streakCoins);
    expect(sim.state.shift[0]!.started).toBe(true);
  });

  it('a wrong word fails: the word shuts, an attacker strikes the castle, the chain stays', () => {
    const sim = create(5);
    sim.dispatch({ type: 'start' });
    pickRight(sim);
    const built = [...sim.state.built];
    const events = pickWrong(sim);
    expect(types(events)).toEqual(['picked', 'attackerStrike', 'stepShown']);
    expect(ofType(events, 'picked')[0]).toMatchObject({ correct: false, streak: 0 });
    expect(sim.state.hearts).toBe(TUNING.hearts - 1);
    expect(sim.state.built).toEqual(built);
    expect(sim.state.streak).toBe(0);
    expect(sim.state.step!.index).toBe(1);
    expect(sim.state.step!.choices.filter((c) => c.blocked)).toHaveLength(1);
    const blocked = sim.state.step!.choices.find((c) => c.blocked)!;
    expect(types(sim.dispatch({ type: 'pick', choice: blocked.index }))).toEqual(['rejected']);
    expect(sim.state.shift[0]!.wrongs).toBe(1);
  });

  it('at 0 hearts the heroes rest and the hearts return; there is no game over', () => {
    const sim = create(6);
    sim.dispatch({ type: 'start' });
    let rested = false;
    for (let i = 0; i < 30 && sim.state.stage === 'collect' && sim.state.phase === 'playing'; i++) {
      const wrongLeft = sim.state.step!.choices.some((c) => !c.right && !c.blocked);
      const events = wrongLeft ? pickWrong(sim) : pickRight(sim);
      if (ofType(events, 'rest').length) {
        rested = true;
        expect(types(events)).toEqual(['picked', 'attackerStrike', 'rest', 'stepShown']);
        expect(sim.state.hearts).toBe(sim.state.maxHearts);
      }
      expect(sim.state.hearts).toBeGreaterThan(0);
    }
    expect(rested).toBe(true);
    expect(sim.state.phase).toBe('playing');
  });

  it('a built sentence waits for a post; the tower fires in rounds until the wave falls', () => {
    const sim = create(5);
    sim.dispatch({ type: 'start' });
    const events = buildSentence(sim);
    expect(types(events).slice(-2)).toEqual(['scored', 'sentenceBuilt']);
    expect(sim.state.stage).toBe('place');
    expect(sim.state.step).toBeNull();
    expect(types(sim.dispatch({ type: 'pick', choice: 0 }))).toEqual(['rejected']);
    expect(types(sim.dispatch({ type: 'build', post: 9 }))).toEqual(['rejected']);
    const out = sim.dispatch({ type: 'build', post: 1 });
    expect(types(out).slice(0, 2)).toEqual(['towerBuilt', 'volley']);
    expect(ofType(out, 'towerBuilt')[0]).toMatchObject({ post: 1, hero: 'wizard', level: 1 });
    // two soldiers of 2 hits each, one level-1 tower: 4 rounds
    expect(ofType(out, 'volley')).toHaveLength(4);
    expect(ofType(out, 'volley').every((v) => v.shots.length === 1)).toBe(true);
    expect(ofType(out, 'waveCleared')).toHaveLength(1);
    expect(types(out).slice(-2)).toEqual(['waveAppeared', 'stepShown']);
    expect(sim.state.wave).toBe(2);
    expect(sim.state.stage).toBe('collect');
    expect(sim.state.built).toEqual([]);
    expect(sim.state.attackers).toHaveLength(3);
    expect(sim.state.shift[0]!.cleared).toBe(true);
    expect(sim.state.posts[1]!.level).toBe(1);
  });

  it('towers stack: a second tower fires together with the first; building on a built post strengthens it', () => {
    const sim = create(5);
    sim.dispatch({ type: 'start' });
    buildSentence(sim);
    sim.dispatch({ type: 'build', post: 0 });
    buildSentence(sim);
    const out = sim.dispatch({ type: 'build', post: 2 });
    const volleys = ofType(out, 'volley');
    expect(volleys[0]!.shots.map((s) => s.hero)).toEqual(['knight', 'cleric']);
    // three tanks of 3 hits = 9 hits, two towers: 5 rounds
    expect(volleys).toHaveLength(5);
    buildSentence(sim);
    sim.dispatch({ type: 'build', post: 0 });
    expect(sim.state.posts[0]!.level).toBe(2);
    expect(sim.state.towersBuilt).toBe(3);
  });

  it('the run is won when every sentence has a tower; the victory is the last event', () => {
    const sim = create(2, false, SHORT_STORY);
    const events = playToEnd(sim);
    expect(sim.state.phase).toBe('victory');
    expect(types(events).at(-1)).toBe('victory');
    expect(ofType(events, 'victory')).toHaveLength(1);
    expect(sim.dispatch({ type: 'start' })).toEqual([]);
    for (const e of events) expect(CASTLE_DEFENSE_EVENT_TYPES).toContain(e.type);
  });

  it('with no sentence the run starts won', () => {
    const sim = createCastleDefense([], { seed: 1, helper: false });
    expect(sim.state.phase).toBe('victory');
    expect(sim.state.waveCount).toBe(0);
  });

  it('accepts the APK SentenceInput too', () => {
    const input = [
      { term: 'Pip is a brave puppy.', translation: 'พิปเป็นลูกหมา' },
      { term: 'One', translation: 'x' },
      { term: 'She sees a red car now', translation: 'y' },
      { term: 'We like to play', translation: '' },
    ];
    const sim = createCastleDefense(input, { seed: 1, helper: false });
    expect(sim.state.waveCount).toBe(3);
    expect(sim.state.shift.map((s) => s.id).sort()).toEqual(['s-1', 's-3', 's-4']);
    playToEnd(sim);
    expect(sim.state.phase).toBe('victory');
  });
});

describe('evidence', () => {
  it('one sentence item per started sentence; wrong words count as attempts; no speed in the score', () => {
    const sim = create(5);
    sim.dispatch({ type: 'start' });
    pickWrong(sim);
    pickWrong(sim);
    buildSentence(sim);
    sim.dispatch({ type: 'build', post: 0 });
    buildSentence(sim);
    const slow = resultsOf(sim.state, STORY, 5, 10_000_000);
    const fast = resultsOf(sim.state, STORY, 5, 1);
    expect(slow.results).toEqual(fast.results);
    const evidence = evidenceOf(sim.state, STORY, 5, 1000);
    expect(storyGameEvidenceSchema.parse(evidence)).toEqual(evidence);
    expect(evidence.items).toHaveLength(2);
    expect(evidence.items[0]).toMatchObject({ itemKind: 'sentence', attempts: 3, correctFirstTry: false, solved: true });
    expect(evidence.items[1]).toMatchObject({ attempts: 1, correctFirstTry: false, solved: false });
    expect(evidence.practice).toContain(evidence.items[0]!.label);
  });
});
