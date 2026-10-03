/**
 * The Castle Defense simulation: a turn `Simulation` (`tick` returns []). Each wave is one
 * sentence of the story. Attackers stand at the gate. The student builds the sentence word by
 * word: the card shows the words to choose from, and the right next word joins the sentence.
 * A wrong word shuts for this step and an attacker strikes the castle (-1 heart); at 0 hearts
 * the heroes rest and the hearts return. When the sentence is built, the student places its
 * tower on a post of the wall (a post is kept by a hero; placing on a built post makes the tower
 * stronger). Then the towers fire in rounds until the wave has fallen; the next sentence starts.
 * There is no game over and no timer; the run is won when every sentence is built.
 *
 * Event order per command:
 *   start: waveAppeared, stepShown
 *   pick right: picked, scored, then stepShown or sentenceBuilt
 *   pick wrong: picked, attackerStrike, [rest], stepShown
 *   build: towerBuilt, volley (one or more), waveCleared, then [waveAppeared, stepShown] or victory
 */
import { createRng, type Rng, type Simulation } from '@reading-advantage/advantage-play-kit-3d/sim';
import { attackersOf, choicesOf, shiftOf, type CastleDefenseInput } from './content.js';
import { POSTS, keeperOf, type Attacker, type CastleDefenseCommand, type CastleDefenseEvent, type CastleDefenseState, type Post, type ShotSummary, type Step } from './types.js';

/** Every tuning number of the game. */
export const TUNING = {
  /** Sentences (waves) in a run, at most. */
  maxWaves: 6,
  /** Words on the card: 3, or 2 in Helper mode. */
  choices: 3,
  helperChoices: 2,
  /** Hearts of the castle. */
  hearts: 5,
  coins: 10,
  /** Extra coins per right word already in a row, up to `maxStreakBonus`. */
  streakCoins: 5,
  maxStreakBonus: 25,
  /** Coins for a finished tower. */
  towerCoins: 20,
} as const;

export interface CastleDefenseOptions {
  seed: number;
  helper: boolean;
}

export type CastleDefenseSimulation = Simulation<CastleDefenseState, CastleDefenseCommand, CastleDefenseEvent>;

export function createCastleDefense(input: CastleDefenseInput, options: CastleDefenseOptions): CastleDefenseSimulation {
  const rng: Rng = createRng(options.seed);
  const shift = shiftOf(input, rng, TUNING.maxWaves);
  const choiceCount = options.helper ? TUNING.helperChoices : TUNING.choices;
  const posts: Post[] = Array.from({ length: POSTS }, (_, post) => ({ post, hero: keeperOf(post), level: 0 }));

  const state: CastleDefenseState = {
    phase: shift.length > 0 ? 'playing' : 'victory',
    helper: options.helper,
    shift,
    wave: 1,
    waveCount: shift.length,
    stage: 'collect',
    built: [],
    step: null,
    attackers: shift.length > 0 ? attackersOf(1) : [],
    posts,
    hearts: TUNING.hearts,
    maxHearts: TUNING.hearts,
    coins: 0,
    streak: 0,
    bestStreak: 0,
    picks: 0,
    towersBuilt: 0,
    started: false,
  };

  const sentence = () => state.shift[state.wave - 1]!;
  const stepAt = (index: number): Step => ({ index, choices: choicesOf(state.shift, state.wave - 1, index, choiceCount, rng) });
  if (shift.length > 0) state.step = stepAt(0);

  const copyAttackers = (): Attacker[] => state.attackers.map((a) => ({ ...a }));
  const copyPosts = (): Post[] => state.posts.map((p) => ({ ...p }));
  const showStep = (): CastleDefenseEvent => ({ type: 'stepShown', step: structuredClone(state.step as Step), built: [...state.built] });
  const living = (): Attacker[] => state.attackers.filter((a) => a.hits > 0);

  const start = (): CastleDefenseEvent[] => {
    if (state.started) return [{ type: 'rejected', command: 'start' }];
    state.started = true;
    if (!state.step) return [];
    return [{ type: 'waveAppeared', wave: state.wave, waveCount: state.waveCount, sentenceId: sentence().id, attackers: copyAttackers() }, showStep()];
  };

  const pick = (index: number): CastleDefenseEvent[] => {
    const step = state.step;
    const choice = step?.choices.find((c) => c.index === index);
    if (!state.started || state.stage !== 'collect' || !step || !choice || choice.blocked) return [{ type: 'rejected', command: 'pick' }];
    const current = sentence();
    const events: CastleDefenseEvent[] = [];
    state.picks += 1;
    current.started = true;

    if (!choice.right) {
      choice.blocked = true;
      current.wrongs += 1;
      state.streak = 0;
      events.push({ type: 'picked', choice: index, word: choice.word, correct: false, index: step.index, streak: 0 });
      const attacker = rng.pick(living());
      state.hearts = Math.max(0, state.hearts - 1);
      events.push({ type: 'attackerStrike', enemyId: attacker.id, hero: keeperOf(attacker.lane), hearts: state.hearts });
      if (state.hearts === 0) {
        state.hearts = state.maxHearts;
        events.push({ type: 'rest', hearts: state.hearts });
      }
      events.push(showStep());
      return events;
    }

    state.built.push(current.words[step.index]!);
    events.push({ type: 'picked', choice: index, word: choice.word, correct: true, index: step.index, streak: state.streak + 1 });
    const coins = TUNING.coins + Math.min(TUNING.maxStreakBonus, state.streak * TUNING.streakCoins);
    state.coins += coins;
    state.streak += 1;
    state.bestStreak = Math.max(state.bestStreak, state.streak);
    events.push({ type: 'scored', coins });
    if (state.built.length >= current.words.length) {
      state.stage = 'place';
      state.step = null;
      events.push({ type: 'sentenceBuilt', wave: state.wave, posts: copyPosts() });
      return events;
    }
    state.step = stepAt(state.built.length);
    events.push(showStep());
    return events;
  };

  const build = (post: number): CastleDefenseEvent[] => {
    const slot = state.posts.find((p) => p.post === post);
    if (!state.started || state.stage !== 'place' || !slot) return [{ type: 'rejected', command: 'build' }];
    const events: CastleDefenseEvent[] = [];
    slot.level += 1;
    state.towersBuilt += 1;
    state.coins += TUNING.towerCoins;
    events.push({ type: 'towerBuilt', post: slot.post, hero: slot.hero, level: slot.level, coins: TUNING.towerCoins });

    // The towers fire in rounds: every tower shoots the front attacker; a level-n tower hits n times.
    for (let round = 1; living().length > 0; round++) {
      const shots: ShotSummary[] = [];
      for (const tower of state.posts.filter((p) => p.level > 0)) {
        const target = living()[0];
        if (!target) break;
        const hits = Math.min(tower.level, target.hits);
        target.hits -= hits;
        shots.push({ post: tower.post, hero: tower.hero, enemyId: target.id, hits, hitsLeft: target.hits, fell: target.hits === 0 });
      }
      events.push({ type: 'volley', round, shots });
    }
    sentence().cleared = true;
    events.push({ type: 'waveCleared', wave: state.wave, attackers: copyAttackers() });

    if (state.wave >= state.waveCount) {
      state.phase = 'victory';
      state.attackers = [];
      state.step = null;
      events.push({ type: 'victory' });
      return events;
    }
    state.wave += 1;
    state.stage = 'collect';
    state.built = [];
    state.attackers = attackersOf(state.wave);
    state.step = stepAt(0);
    events.push({ type: 'waveAppeared', wave: state.wave, waveCount: state.waveCount, sentenceId: sentence().id, attackers: copyAttackers() }, showStep());
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
        case 'pick':
          return pick(command.choice);
        case 'build':
          return build(command.post);
        default:
          return [];
      }
    },
    tick: () => [],
    snapshot: () => structuredClone(state),
  };
}

