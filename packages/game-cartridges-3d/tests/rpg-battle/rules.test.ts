/** The RPG Battle rules: the hand, the question, the power of a word, courage, and the monsters. */
import { describe, expect, it } from 'vitest';
import { storyGameEvidenceSchema } from '@reading-advantage/advantage-play-kit-3d/contracts';
import { createRng } from '@reading-advantage/advantage-play-kit-3d/sim';
import {
  ACTIONS,
  HERO_OF,
  MONSTER_KINDS,
  RPG_BATTLE_EVENT_TYPES,
  TUNING,
  createRpgBattle,
  damageOf,
  evidenceOf,
  monstersOf,
  optionsOf,
  resultsOf,
  targetsOf,
  wordsOf,
} from '../../src/rpg-battle/core/index.js';
import { SHORT_STORY, STORY, create, ofType, playRight, playToEnd, playWrong, types, wrongOption } from './helpers.js';

const SEEDS = Array.from({ length: 30 }, (_, i) => i + 1);

describe('content', () => {
  it('targets every story word once, in a seeded order, with an action and a power', () => {
    const targets = targetsOf(STORY, createRng(3), TUNING.powerChance);
    expect(targets).toHaveLength(STORY.vocabulary.length);
    expect(new Set(targets.map((t) => t.id)).size).toBe(STORY.vocabulary.length);
    for (const t of targets) {
      const w = STORY.vocabulary.find((v) => v.id === t.id)!;
      expect(t.term).toBe(w.term);
      expect(t.translation).toBe(w.translation);
      expect(ACTIONS).toContain(t.action);
      expect(['basic', 'power']).toContain(t.power);
      expect(t).toMatchObject({ attempts: 0, correctFirstTry: false, solved: false });
    }
    // The actions come in turn, so any three words in a row show all three actions.
    expect(new Set(targets.slice(0, 3).map((t) => t.action)).size).toBe(3);
    expect(targetsOf(STORY, createRng(3), 0.4).map((t) => t.id)).toEqual(targets.map((t) => t.id));
    expect(targetsOf(STORY, createRng(4), 0.4).map((t) => t.id)).not.toEqual(targets.map((t) => t.id));
  });

  it('powerChance 0 gives only basic words; 1 gives only power words', () => {
    expect(targetsOf(STORY, createRng(1), 0).every((t) => t.power === 'basic')).toBe(true);
    expect(targetsOf(STORY, createRng(1), 1).every((t) => t.power === 'power')).toBe(true);
  });

  it('a power word hits harder than a basic word', () => {
    expect(damageOf({ power: 'power' }, 1, 2)).toBe(2);
    expect(damageOf({ power: 'basic' }, 1, 2)).toBe(1);
    expect(TUNING.powerDamage).toBeGreaterThan(TUNING.basicDamage);
    expect(TUNING.powerCoins).toBeGreaterThan(TUNING.basicCoins);
  });

  it('accepts the APK VocabularyInput too', () => {
    const input = [{ term: 'cat', translation: 'แมว' }, { term: '', translation: 'x' }, { term: 'dog', translation: 'หมา' }];
    expect(wordsOf(input)).toEqual([
      { id: 'w-1', term: 'cat', translation: 'แมว' },
      { id: 'w-3', term: 'dog', translation: 'หมา' },
    ]);
    const sim = createRpgBattle(input, { seed: 1, helper: false });
    expect(sim.state.targetCount).toBe(2);
    playToEnd(sim);
    expect(sim.state.phase).toBe('victory');
  });

  it('monsters guard the damage of their word groups: skeleton, mimic, then the dragon', () => {
    const ms = monstersOf([1, 2, 1, 1, 2, 2, 1, 1, 1, 2], 4);
    expect(ms.map((m) => m.kind)).toEqual([...MONSTER_KINDS]);
    expect(ms.map((m) => m.maxHp)).toEqual([5, 6, 3]);
    expect(monstersOf([1, 1], 4).map((m) => m.kind)).toEqual(['skeleton']);
    expect(monstersOf([], 4)).toEqual([]);
  });

  it('options hold the right meaning once and distinct other meanings', () => {
    const targets = targetsOf(STORY, createRng(2), 0.4);
    const rng = createRng(9);
    for (const t of targets) {
      const opts = optionsOf(targets, t.id, 4, rng);
      expect(opts).toHaveLength(4);
      expect(opts.filter((o) => o.id === t.id)).toHaveLength(1);
      expect(new Set(opts.map((o) => o.text)).size).toBe(opts.length);
      expect(opts.find((o) => o.id === t.id)!.text).toBe(t.translation);
    }
  });
});

describe('start and the hand', () => {
  it('start shows the first monster and a hand of up to 3 cards in target order; a second start is ignored', () => {
    const sim = create(5);
    const events = sim.dispatch({ type: 'start' });
    expect(types(events)).toEqual(['monsterAppeared', 'handShown']);
    expect(ofType(events, 'monsterAppeared')[0]!.kind).toBe('skeleton');
    const hand = ofType(events, 'handShown')[0]!.cards;
    expect(hand).toHaveLength(TUNING.handSize);
    expect(hand.map((c) => c.id)).toEqual(sim.state.targets.slice(0, 3).map((t) => t.id));
    expect(sim.state.hand).toEqual(hand);
    expect(sim.dispatch({ type: 'start' })).toEqual([]);
  });

  it('a card shows its term, action, and power; the hero follows the action', () => {
    const sim = create(5);
    sim.dispatch({ type: 'start' });
    for (const c of sim.state.hand) {
      const w = sim.state.targets.find((t) => t.id === c.id)!;
      expect(c).toMatchObject({ term: w.term, action: w.action, power: w.power, retry: false });
    }
    expect(HERO_OF).toEqual({ slash: 'knight', blaze: 'wizard', mend: 'cleric' });
  });
});

describe('play, cancel, answer', () => {
  it('play puts the question up: the options hold the word of the card', () => {
    const sim = create(5);
    sim.dispatch({ type: 'start' });
    const card = sim.state.hand[1]!;
    const events = sim.dispatch({ type: 'play', cardId: card.id });
    expect(types(events)).toEqual(['cardPlayed']);
    const q = sim.state.question!;
    expect(q.cardId).toBe(card.id);
    expect(q.term).toBe(card.term);
    expect(q.options).toHaveLength(TUNING.options);
    expect(q.options.some((o) => o.id === card.id)).toBe(true);
  });

  it('Helper mode asks with 3 options', () => {
    const sim = create(5, true);
    sim.dispatch({ type: 'start' });
    sim.dispatch({ type: 'play', cardId: sim.state.hand[0]!.id });
    expect(sim.state.question!.options).toHaveLength(TUNING.helperOptions);
  });

  it('rejects a card that is not in the hand, a second play, and an answer outside the question', () => {
    const sim = create(5);
    sim.dispatch({ type: 'start' });
    expect(types(sim.dispatch({ type: 'play', cardId: 'nope' }))).toEqual(['rejected']);
    expect(types(sim.dispatch({ type: 'answer', optionId: 'x' }))).toEqual(['rejected']);
    expect(types(sim.dispatch({ type: 'cancel' }))).toEqual(['rejected']);
    sim.dispatch({ type: 'play', cardId: sim.state.hand[0]!.id });
    expect(types(sim.dispatch({ type: 'play', cardId: sim.state.hand[1]!.id }))).toEqual(['rejected']);
    expect(types(sim.dispatch({ type: 'answer', optionId: 'nope' }))).toEqual(['rejected']);
    expect(sim.state.question).not.toBeNull();
    expect(sim.state.targets.every((t) => t.attempts === 0)).toBe(true);
  });

  it('cancel returns the card and shows the hand again; it counts no attempt', () => {
    const sim = create(5);
    sim.dispatch({ type: 'start' });
    const hand = sim.state.hand.map((c) => c.id);
    sim.dispatch({ type: 'play', cardId: hand[0]! });
    const events = sim.dispatch({ type: 'cancel' });
    expect(types(events)).toEqual(['cardReturned', 'handShown']);
    expect(sim.state.question).toBeNull();
    expect(sim.state.hand.map((c) => c.id)).toEqual(hand);
    expect(sim.state.targets.every((t) => t.attempts === 0)).toBe(true);
  });

  it('a right answer casts the card: the hero strikes, coins grow, the hand refills', () => {
    const sim = create(5);
    sim.dispatch({ type: 'start' });
    const card = sim.state.hand[0]!;
    const word = sim.state.targets.find((t) => t.id === card.id)!;
    const hp = sim.state.monster!.hp;
    const events = playRight(sim);
    expect(types(events).slice(0, 2)).toEqual(['answered', 'heroStrike']);
    const strike = ofType(events, 'heroStrike')[0]!;
    expect(strike).toMatchObject({ hero: HERO_OF[word.action], action: word.action, power: word.power });
    expect(strike.damage).toBe(word.power === 'power' ? 2 : 1);
    expect(strike.coins).toBe(word.power === 'power' ? TUNING.powerCoins : TUNING.basicCoins);
    expect(sim.state.monster!.hp).toBe(hp - strike.damage);
    expect(sim.state.coins).toBe(strike.coins);
    expect(word).toMatchObject({ attempts: 1, correctFirstTry: true, solved: true });
    expect(sim.state.hand.map((c) => c.id)).not.toContain(card.id);
    expect(sim.state.hand).toHaveLength(TUNING.handSize);
    expect(events.at(-1)!.type).toBe('handShown');
  });

  it('a wrong answer costs 1 courage, the monster strikes, and the card stays with a retry mark', () => {
    const sim = create(5);
    sim.dispatch({ type: 'start' });
    const card = sim.state.hand[0]!;
    const events = playWrong(sim);
    expect(types(events)).toEqual(['answered', 'monsterStrike', 'handShown']);
    expect(ofType(events, 'answered')[0]).toMatchObject({ correct: false, wordId: card.id, streak: 0 });
    expect(ofType(events, 'answered')[0]!.correctText).toBe(sim.state.targets.find((t) => t.id === card.id)!.translation);
    expect(sim.state.courage).toBe(TUNING.maxCourage - 1);
    expect(sim.state.monster!.hp).toBe(sim.state.monster!.maxHp);
    expect(sim.state.hand[0]).toMatchObject({ id: card.id, retry: true });
    const word = sim.state.targets.find((t) => t.id === card.id)!;
    expect(word).toMatchObject({ attempts: 1, correctFirstTry: false, solved: false });
    // Later, the right answer solves it and clears the retry mark.
    playRight(sim, card.id);
    expect(word).toMatchObject({ attempts: 2, correctFirstTry: false, solved: true });
  });

  it('no game over: at 0 courage the team rests back to 3, and the run goes on', () => {
    const sim = create(5);
    sim.dispatch({ type: 'start' });
    const all: ReturnType<typeof playWrong> = [];
    for (let i = 0; i < TUNING.maxCourage; i++) all.push(...playWrong(sim));
    expect(ofType(all, 'rest')).toEqual([{ type: 'rest', courage: TUNING.restCourage }]);
    expect(sim.state.courage).toBe(TUNING.restCourage);
    expect(sim.state.phase).toBe('playing');
    for (let i = 0; i < 12; i++) playWrong(sim);
    expect(sim.state.phase).toBe('playing');
    expect(sim.state.courage).toBeGreaterThanOrEqual(1);
    expect(sim.state.courage).toBeLessThanOrEqual(TUNING.maxCourage);
    playToEnd(sim);
    expect(sim.state.phase).toBe('victory');
  });
});

describe('power, streak, and mend', () => {
  /** A sim where the first card has the wanted action and power: found by seed. */
  const findCard = (pred: (c: { action: string; power: string }) => boolean) => {
    for (const seed of SEEDS) {
      const sim = create(seed);
      sim.dispatch({ type: 'start' });
      const i = sim.state.hand.findIndex(pred);
      if (i >= 0) return { sim, id: sim.state.hand[i]!.id };
    }
    throw new Error('no seed has such a card');
  };

  it('a power card gives 1 courage back; a mend card gives 1; a power mend gives 2', () => {
    const cases: [string, string, number][] = [
      ['slash', 'basic', 0],
      ['slash', 'power', 1],
      ['mend', 'basic', 1],
      ['mend', 'power', 2],
    ];
    for (const [action, power, gain] of cases) {
      const { sim, id } = findCard((c) => c.action === action && c.power === power);
      playWrong(sim, sim.state.hand.find((c) => c.id !== id)!.id);
      playWrong(sim, sim.state.hand.find((c) => c.id !== id)!.id);
      const low = sim.state.courage;
      const events = playRight(sim, id);
      expect(sim.state.courage).toBe(Math.min(TUNING.maxCourage, low + gain));
      expect(ofType(events, 'heal')).toHaveLength(low + gain > low && gain > 0 ? 1 : 0);
    }
  });

  it('a right answer in a row adds streak coins up to the cap; a wrong answer ends the streak', () => {
    const sim = create(11);
    sim.dispatch({ type: 'start' });
    const coins: number[] = [];
    for (let i = 0; i < 8 && sim.state.phase === 'playing'; i++) {
      const word = sim.state.targets.find((t) => t.id === sim.state.hand[0]!.id)!;
      const e = playRight(sim);
      coins.push(ofType(e, 'heroStrike')[0]!.coins - (word.power === 'power' ? TUNING.powerCoins : TUNING.basicCoins));
    }
    coins.forEach((bonus, i) => expect(bonus).toBe(Math.min(TUNING.maxStreakBonus, i * TUNING.streakCoins)));
    expect(sim.state.streak).toBe(coins.length);
    expect(sim.state.bestStreak).toBe(coins.length);
    playWrong(sim);
    expect(sim.state.streak).toBe(0);
    expect(sim.state.bestStreak).toBe(coins.length);
  });

  it('a power word takes 2 hit points, a basic word 1', () => {
    const sim = create(5);
    sim.dispatch({ type: 'start' });
    const before = sim.state.monster!.hp;
    const word = sim.state.targets.find((t) => t.id === sim.state.hand[0]!.id)!;
    playRight(sim);
    expect(before - sim.state.monster!.hp).toBe(damageOf(word, TUNING.basicDamage, TUNING.powerDamage));
  });
});

describe('monsters and victory', () => {
  it.each(SEEDS)('seed %i: monsters fall in order, the last cast takes the last hit point', (seed) => {
    const sim = create(seed);
    const events = playToEnd(sim);
    const kinds = ofType(events, 'monsterAppeared').map((e) => e.kind);
    expect(kinds).toEqual(MONSTER_KINDS.slice(0, kinds.length));
    expect(ofType(events, 'monsterDefeated').map((e) => e.kind)).toEqual(kinds);
    expect(sim.state.monster).toBeNull();
    expect(events.filter((e) => e.type === 'victory')).toHaveLength(1);
    expect(events.at(-1)!.type).toBe('victory');
    // The victory comes after the last defeat, never before.
    expect(events.map((e) => e.type).lastIndexOf('monsterDefeated')).toBeLessThan(events.length - 1);
    expect(sim.state.targets.every((t) => t.solved)).toBe(true);
    expect(sim.state.casts).toBe(sim.state.targetCount);
  });

  it('a short story uses fewer monsters and still wins', () => {
    const sim = create(2, false, SHORT_STORY);
    playToEnd(sim);
    expect(sim.state.phase).toBe('victory');
    expect(sim.dispatch({ type: 'play', cardId: 'x' })).toEqual([]);
  });

  it('only listed events are ever emitted', () => {
    const seen = new Set<string>();
    for (const seed of SEEDS) {
      const sim = create(seed);
      for (const e of [...playWrongRun(sim), ...playToEnd(sim)]) seen.add(e.type);
    }
    for (const t of seen) expect(RPG_BATTLE_EVENT_TYPES).toContain(t);
    for (const t of ['handShown', 'cardPlayed', 'answered', 'heroStrike', 'monsterStrike', 'monsterDefeated', 'victory']) expect(seen).toContain(t);
  });

  it('a word that was wrong shows in the evidence with correctFirstTry false', () => {
    const sim = create(8, false, SHORT_STORY);
    sim.dispatch({ type: 'start' });
    const first = sim.state.hand[0]!.id;
    playWrong(sim, first);
    playToEnd(sim);
    const { evidence, results } = resultsOf(sim.state, SHORT_STORY, 8, 1234);
    expect(storyGameEvidenceSchema.parse(evidence)).toEqual(evidence);
    expect(evidence.items.find((i) => i.itemId === first)).toMatchObject({ attempts: 2, correctFirstTry: false, solved: true });
    expect(evidence.practice).toContain(sim.state.targets.find((t) => t.id === first)!.term);
    expect(results.score).toBe(sim.state.coins);
    expect(evidenceOf(sim.state, SHORT_STORY, 8, 5).durationMs).toBe(5);
  });
});

function playWrongRun(sim: ReturnType<typeof create>) {
  const events = [...sim.dispatch({ type: 'start' })];
  for (let i = 0; i < 6; i++) events.push(...playWrong(sim));
  sim.dispatch({ type: 'play', cardId: sim.state.hand[0]!.id });
  events.push(...sim.dispatch({ type: 'cancel' }));
  return events;
}

describe('wrongOption helper', () => {
  it('picks an option that is not the right one', () => {
    const sim = create(5);
    sim.dispatch({ type: 'start' });
    sim.dispatch({ type: 'play', cardId: sim.state.hand[0]!.id });
    expect(wrongOption(sim)).not.toBe(sim.state.hand[0]!.id);
  });
});
