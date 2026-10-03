/**
 * The RPG Battle simulation: a turn `Simulation` (`tick` returns []). The hand shows up to 3
 * word cards in target order, each with an action (slash, blaze, mend) and a power. The student
 * plays a card and answers which meaning is the word's. A right answer casts the card: its hero
 * strikes (a power card for 2, a basic card for 1), coins grow with the streak, a mend card gives
 * 1 courage back, and a power card gives 1 more. A wrong answer sends the card back to the hand
 * (it is marked as a retry), the monster strikes (courage -1), and at 0 the team rests back to
 * 3. There is no game over and no timer; the run is won when every word is cast.
 *
 * Event order per command:
 *   start:  monsterAppeared, handShown
 *   play:   cardPlayed
 *   cancel: cardReturned, handShown
 *   right:  answered, heroStrike, [heal], [monsterDefeated, [monsterAppeared]], then handShown or victory
 *   wrong:  answered, monsterStrike, [rest], handShown
 */
import { createRng, type Rng, type Simulation } from '@reading-advantage/advantage-play-kit-3d/sim';
import { damageOf, monstersOf, optionsOf, targetsOf, type RpgBattleInput } from './content.js';
import {
  HERO_OF,
  type Card,
  type Monster,
  type RpgBattleCommand,
  type RpgBattleEvent,
  type RpgBattleState,
  type TargetWord,
} from './types.js';

/** Every tuning number of the game. */
export const TUNING = {
  handSize: 3,
  /** Answer options: 4, or 3 in Helper mode. */
  options: 4,
  helperOptions: 3,
  /** The chance a word is a power word. */
  powerChance: 0.4,
  basicDamage: 1,
  powerDamage: 2,
  basicCoins: 10,
  powerCoins: 25,
  /** Extra coins per right answer already in a row, up to `maxStreakBonus`. */
  streakCoins: 5,
  maxStreakBonus: 25,
  /** Courage a mend card gives back; a power card gives `powerHeal` more. */
  mendHeal: 1,
  powerHeal: 1,
  maxCourage: 5,
  restCourage: 3,
  /** Words per monster; the fire dragon takes every word after the second group. */
  wordsPerMonster: 4,
} as const;

export interface RpgBattleOptions {
  seed: number;
  helper: boolean;
}

export type RpgBattleSimulation = Simulation<RpgBattleState, RpgBattleCommand, RpgBattleEvent>;

export function createRpgBattle(input: RpgBattleInput, options: RpgBattleOptions): RpgBattleSimulation {
  const rng: Rng = createRng(options.seed);
  const targets = targetsOf(input, rng, TUNING.powerChance);
  const damage = (w: TargetWord): number => damageOf(w, TUNING.basicDamage, TUNING.powerDamage);
  const monsters = monstersOf(targets.map(damage), TUNING.wordsPerMonster);
  const optionCount = options.helper ? TUNING.helperOptions : TUNING.options;
  const retry = new Set<string>();

  const state: RpgBattleState = {
    phase: targets.length > 0 ? 'playing' : 'victory',
    helper: options.helper,
    targets,
    targetCount: targets.length,
    hand: [],
    question: null,
    monster: monsters[0] ? { ...monsters[0] } : null,
    monsterIndex: 0,
    courage: TUNING.maxCourage,
    maxCourage: TUNING.maxCourage,
    coins: 0,
    streak: 0,
    bestStreak: 0,
    casts: 0,
    started: false,
  };

  const cardOf = (w: TargetWord): Card => ({ id: w.id, term: w.term, action: w.action, power: w.power, retry: retry.has(w.id) });

  /** The hand: the first words not cast yet, in target order. */
  const refill = (): Card[] => {
    state.hand = state.targets.filter((w) => !w.solved).slice(0, TUNING.handSize).map(cardOf);
    return state.hand.map((c) => ({ ...c }));
  };

  const nextMonster = (events: RpgBattleEvent[]): void => {
    state.monsterIndex += 1;
    const next = monsters[state.monsterIndex];
    state.monster = next ? { ...next } : null;
    if (next) events.push({ type: 'monsterAppeared', kind: next.kind });
  };

  /** Deals `amount` to the current monster; what is left over carries to the next one. */
  const deal = (amount: number, events: RpgBattleEvent[]): void => {
    let left = amount;
    while (left > 0 && state.monster) {
      const m: Monster = state.monster;
      const taken = Math.min(m.hp, left);
      m.hp -= taken;
      left -= taken;
      if (m.hp === 0) {
        events.push({ type: 'monsterDefeated', kind: m.kind });
        nextMonster(events);
      }
    }
  };

  const cast = (word: TargetWord, events: RpgBattleEvent[]): void => {
    const streakBonus = Math.min(TUNING.maxStreakBonus, state.streak * TUNING.streakCoins);
    const coins = (word.power === 'power' ? TUNING.powerCoins : TUNING.basicCoins) + streakBonus;
    state.coins += coins;
    state.casts += 1;
    events.push({ type: 'heroStrike', hero: HERO_OF[word.action], action: word.action, power: word.power, damage: damage(word), coins });
    const heal = (word.action === 'mend' ? TUNING.mendHeal : 0) + (word.power === 'power' ? TUNING.powerHeal : 0);
    if (heal > 0 && state.courage < state.maxCourage) {
      state.courage = Math.min(state.maxCourage, state.courage + heal);
      events.push({ type: 'heal', courage: state.courage });
    }
    deal(damage(word), events);
  };

  const miss = (events: RpgBattleEvent[]): void => {
    state.courage = Math.max(0, state.courage - 1);
    events.push({ type: 'monsterStrike', courage: state.courage });
    if (state.courage === 0) {
      state.courage = TUNING.restCourage;
      events.push({ type: 'rest', courage: state.courage });
    }
  };

  const start = (): RpgBattleEvent[] => {
    if (state.started) return [];
    state.started = true;
    const events: RpgBattleEvent[] = [];
    if (state.monster) events.push({ type: 'monsterAppeared', kind: state.monster.kind });
    events.push({ type: 'handShown', cards: refill() });
    return events;
  };

  const play = (cardId: string): RpgBattleEvent[] => {
    const word = state.targets.find((w) => w.id === cardId && !w.solved);
    if (state.question || !word || !state.hand.some((c) => c.id === cardId)) return [{ type: 'rejected', command: 'play' }];
    state.question = { cardId, term: word.term, options: optionsOf(state.targets, word.id, optionCount, rng) };
    return [{ type: 'cardPlayed', question: structuredClone(state.question), action: word.action, power: word.power }];
  };

  const cancel = (): RpgBattleEvent[] => {
    const q = state.question;
    if (!q) return [{ type: 'rejected', command: 'cancel' }];
    state.question = null;
    return [{ type: 'cardReturned', cardId: q.cardId }, { type: 'handShown', cards: refill() }];
  };

  const answer = (optionId: string): RpgBattleEvent[] => {
    const q = state.question;
    if (!q || !q.options.some((o) => o.id === optionId)) return [{ type: 'rejected', command: 'answer' }];
    const word = state.targets.find((w) => w.id === q.cardId)!;
    state.question = null;
    word.attempts += 1;
    const correct = optionId === word.id;
    if (word.attempts === 1) word.correctFirstTry = correct;
    const events: RpgBattleEvent[] = [];
    if (correct) {
      word.solved = true;
      retry.delete(word.id);
      events.push({ type: 'answered', wordId: word.id, optionId, correct, correctText: word.translation, streak: state.streak + 1 });
      cast(word, events);
      state.streak += 1;
      state.bestStreak = Math.max(state.bestStreak, state.streak);
    } else {
      state.streak = 0;
      retry.add(word.id);
      events.push({ type: 'answered', wordId: word.id, optionId, correct, correctText: word.translation, streak: 0 });
      miss(events);
    }
    if (state.targets.every((w) => w.solved)) {
      state.phase = 'victory';
      state.hand = [];
      events.push({ type: 'victory' });
      return events;
    }
    events.push({ type: 'handShown', cards: refill() });
    return events;
  };

  return {
    get state() {
      return state;
    },
    dispatch(command) {
      if (state.phase !== 'playing') return [];
      switch (command.type) {
        case 'start':
          return start();
        case 'play':
          return play(command.cardId);
        case 'cancel':
          return cancel();
        case 'answer':
          return answer(command.optionId);
        default:
          return [];
      }
    },
    tick: () => [],
    snapshot: () => structuredClone(state),
  };
}
