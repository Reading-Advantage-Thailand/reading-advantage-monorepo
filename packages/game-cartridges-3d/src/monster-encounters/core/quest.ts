/**
 * The quest: four encounters in the Sunken Vault, one challenge per hero turn, built from a
 * `StoryInput`. Pure rules on a seeded state: no DOM, no clock, no Math.random. The rules are written up in
 * docs/demo-monster-encounters.md; the comments here point at the rule each block implements.
 * `sim.ts` wraps the quest in the kit `Simulation` shape; the view uses that.
 *
 * Event order per answer (the frontend animates them in this order):
 *   correct: answer, heroAttack, enemyHit, [enemyDefeated], [heal (Cleric)], xp,
 *            then either turn, or encounterCleared, xp, (encounterStart, turn | xp, victory)
 *   wrong:   answer, heroMiss, enemyAttack, [rest], turn
 */
import { createRng, type Rng } from '@reading-advantage/advantage-play-kit-3d/sim';
import type { StoryInput } from '@reading-advantage/advantage-play-kit-3d/contracts';
import type {
  Challenge,
  ChallengeKind,
  ChoiceOption,
  EncounterInfo,
  EnemyKind,
  EnemyState,
  Feedback,
  GameEvent,
  HeroId,
  HeroState,
  ItemEvidence,
  Quest,
  QuestOptions,
  QuestResults,
  QuestState,
  Response,
} from './types.js';

// ---------------------------------------------------------------- constants

export const PARTY: readonly HeroState[] = [
  { id: 'knight', name: 'Knight' },
  { id: 'wizard', name: 'Wizard' },
  { id: 'cleric', name: 'Cleric' },
];

const HERO_MOVE: Record<HeroId, 'attack' | 'attack2'> = {
  knight: 'attack',
  wizard: 'attack',
  cleric: 'attack2',
};

export const MAX_COURAGE = 5;
export const REST_COURAGE = 3;
export const HERO_DAMAGE = 1;

export const XP = { firstTry: 10, retry: 5, encounter: 20, victory: 50 } as const;

/** The reason strings on `xp` events, for a floating label. */
export const XP_REASON = {
  firstTry: 'First try!',
  retry: 'Got it!',
  encounter: 'Encounter cleared!',
  victory: 'Victory!',
} as const;

/** Fallback order when a story lacks items of a kind: the next kind in this cycle that has items. */
const KIND_CYCLE: readonly ChallengeKind[] = ['word', 'fill', 'sentence', 'question'];

/** A wrong item comes back after this many other items (or last when the queue is shorter). */
const RETRY_GAP = 2;

/** Total enemy HP in an encounter never exceeds this many turns per item. */
const REPEATS_PER_ITEM = 2;

interface Place {
  name: string;
  kind: ChallengeKind;
  scene: string;
  enemies: (pack: StoryInput) => { kind: EnemyKind; name: string; hp: number }[];
}

const PLACES: readonly Place[] = [
  {
    name: 'The Bone Hall',
    kind: 'word',
    scene: 'Two skeletons rattle awake.',
    enemies: () => [
      { kind: 'skeleton', name: 'Skeleton', hp: 2 },
      { kind: 'skeleton', name: 'Skeleton', hp: 2 },
    ],
  },
  {
    name: 'The Bat Roost',
    kind: 'sentence',
    scene: 'Two giant bats swoop down from the dark.',
    enemies: () => [
      { kind: 'giant-bat', name: 'Giant Bat', hp: 2 },
      { kind: 'giant-bat', name: 'Giant Bat', hp: 2 },
    ],
  },
  {
    name: 'The Treasure Room',
    kind: 'fill',
    scene: 'The treasure chest is a mimic!',
    enemies: () => [{ kind: 'mimic', name: 'Mimic', hp: 3 }],
  },
  {
    name: "The Dragon's Hall",
    kind: 'question',
    scene: 'Ember, the fire dragon, guards the way out.',
    enemies: (pack) => [
      {
        kind: 'dragon-fire',
        name: 'Ember, the Fire Dragon',
        hp: Math.min(5, Math.max(3, pack.questions.length)),
      },
    ],
  },
];

const KIND_LINE: Record<ChallengeKind, string> = {
  word: "Show what the story's words mean!",
  sentence: "Tap the story's words in order!",
  fill: 'Find the word for each blank!',
  question: 'Answer questions about the story!',
};

// ---------------------------------------------------------------- items

/** One content item with everything a challenge needs: how to build it and how to judge a response. */
interface Item {
  id: string;
  kind: ChallengeKind;
  label: string;
  correctText: string;
  explanation: string;
  paragraph?: number;
  build(rng: Rng, helper: boolean, challengeId: string, retry: boolean): Built;
}

/** A built challenge plus the judge for a response to it. */
interface Built {
  challenge: Challenge;
  judge(response: Response): boolean;
}

const lower = (s: string) => s.toLocaleLowerCase();

/** Distinct texts, keeping the first spelling of each; `same` decides equality. */
function distinct(texts: readonly string[], same: (a: string, b: string) => boolean): string[] {
  const out: string[] = [];
  for (const t of texts) if (!out.some((o) => same(o, t))) out.push(t);
  return out;
}

/** `count` options: the answer plus distractors, shuffled, with positional ids. */
function choiceOptions(rng: Rng, answer: string, pool: readonly string[], count: number): ChoiceOption[] {
  const texts = rng.shuffle([answer, ...rng.sample(pool, count - 1)]);
  return texts.map((text, i) => ({ id: `o${i + 1}`, text }));
}

function judgeChoice(options: readonly ChoiceOption[], isCorrect: (text: string) => boolean) {
  return (response: Response): boolean => {
    if (response.kind !== 'choice') throw new Error(`expected a choice response, got ${response.kind}`);
    const option = options.find((o) => o.id === response.optionId);
    if (!option) throw new Error(`unknown option id ${response.optionId}`);
    return isCorrect(option.text);
  };
}

function wordItems(pack: StoryInput): Item[] {
  return pack.vocabulary.map((w) => ({
    id: w.id,
    kind: 'word',
    label: w.term,
    correctText: w.translation,
    explanation: `"${w.term}" means ${w.translation}: ${w.definition}`,
    build(rng, helper, challengeId, retry) {
      // Distractors: other words' Thai meanings, never the same text twice.
      const pool = distinct(
        pack.vocabulary
          .filter((o) => o.id !== w.id && o.translation !== w.translation)
          .map((o) => o.translation),
        (a, b) => a === b,
      );
      const options = choiceOptions(rng, w.translation, pool, helper ? 3 : 4);
      const hint = helper ? w.definition : w.phonetic;
      return {
        challenge: {
          kind: 'word',
          itemId: w.id,
          challengeId,
          prompt: w.term,
          ...(hint ? { hint } : {}),
          options,
          retry,
        },
        judge: judgeChoice(options, (text) => text === w.translation),
      };
    },
  }));
}

function fillItems(pack: StoryInput): Item[] {
  return pack.fills.map((f) => {
    const filled = f.sentence.replace('___', f.answer);
    const same = (a: string, b: string) => lower(a) === lower(b);
    return {
      id: f.id,
      kind: 'fill',
      label: filled,
      correctText: f.answer,
      explanation: `The word for the blank is "${f.answer}": ${filled}`,
      ...(f.paragraph !== undefined ? { paragraph: f.paragraph } : {}),
      build(rng, helper, challengeId, retry) {
        // Distractors: the other fill answers and the story words, matched without case.
        const pool = distinct(
          [
            ...pack.fills.filter((o) => o.id !== f.id).map((o) => o.answer),
            ...pack.vocabulary.map((w) => w.term),
          ].filter((t) => !same(t, f.answer)),
          same,
        );
        const options = choiceOptions(rng, f.answer, pool, helper ? 3 : 4);
        return {
          challenge: { kind: 'fill', itemId: f.id, challengeId, prompt: f.sentence, options, retry },
          judge: judgeChoice(options, (text) => same(text, f.answer)),
        };
      },
    };
  });
}

function questionItems(pack: StoryInput): Item[] {
  return pack.questions.map((q) => {
    const answer = q.options[q.answer]!;
    return {
      id: q.id,
      kind: 'question',
      label: q.question,
      correctText: answer,
      explanation: `The answer is "${answer}". Look at the story again.`,
      ...(q.paragraph !== undefined ? { paragraph: q.paragraph } : {}),
      build(rng, _helper, challengeId, retry) {
        const options = rng.shuffle(q.options).map((text, i) => ({ id: `o${i + 1}`, text }));
        return {
          challenge: { kind: 'question', itemId: q.id, challengeId, prompt: q.question, options, retry },
          judge: judgeChoice(options, (text) => text === answer),
        };
      },
    };
  });
}

/** True when `a` and `b` have the same text at every position. */
const sameOrder = (a: readonly string[], b: readonly string[]) => a.every((t, i) => t === b[i]);

/** A shuffle of the words that is not the correct order (when any other order exists). */
function shuffleTokens(rng: Rng, words: readonly string[]): string[] {
  if (new Set(words).size < 2) return words.slice();
  for (let tries = 0; tries < 32; tries++) {
    const s = rng.shuffle(words);
    if (!sameOrder(s, words)) return s;
  }
  // Extremely unlikely after 32 tries; a rotation is always out of order for two distinct words.
  return [...words.slice(1), words[0]!];
}

function sentenceItems(pack: StoryInput): Item[] {
  return pack.sentences.map((s) => ({
    id: s.id,
    kind: 'sentence',
    label: s.text,
    correctText: s.text,
    explanation: `The sentence is "${s.text}". Tap the words in this order.`,
    ...(s.paragraph !== undefined ? { paragraph: s.paragraph } : {}),
    build(rng, _helper, challengeId, retry) {
      const tokens = shuffleTokens(rng, s.words).map((text, i) => ({ id: `t${i + 1}`, text }));
      return {
        challenge: {
          kind: 'sentence',
          itemId: s.id,
          challengeId,
          prompt: 'Tap the words in order.',
          tokens,
          retry,
        },
        judge(response) {
          if (response.kind !== 'order') throw new Error(`expected an order response, got ${response.kind}`);
          const texts = response.tokenIds.map((id) => {
            const token = tokens.find((t) => t.id === id);
            if (!token) throw new Error(`unknown token id ${id}`);
            return token.text;
          });
          // Two identical words are interchangeable: only the texts count.
          return texts.length === s.words.length && sameOrder(texts, s.words);
        },
      };
    },
  }));
}

// ---------------------------------------------------------------- encounters

interface Encounter {
  info: EncounterInfo;
  items: Item[];
}

/** The kind an encounter uses: its own when the story has items, else the next kind in the cycle. */
export function resolveKind(wanted: ChallengeKind, counts: Record<ChallengeKind, number>): ChallengeKind {
  const start = KIND_CYCLE.indexOf(wanted);
  for (let i = 0; i < KIND_CYCLE.length; i++) {
    const kind = KIND_CYCLE[(start + i) % KIND_CYCLE.length]!;
    if (counts[kind] > 0) return kind;
  }
  throw new Error('the story has no items to build a quest from');
}

function buildEncounters(pack: StoryInput): Encounter[] {
  const byKind: Record<ChallengeKind, Item[]> = {
    word: wordItems(pack),
    fill: fillItems(pack),
    sentence: sentenceItems(pack),
    question: questionItems(pack),
  };
  const counts: Record<ChallengeKind, number> = {
    word: byKind.word.length,
    fill: byKind.fill.length,
    sentence: byKind.sentence.length,
    question: byKind.question.length,
  };
  const used: Record<string, number> = {};
  return PLACES.map((place, index) => {
    const kind = resolveKind(place.kind, counts);
    const items = byKind[kind];
    const enemies: EnemyState[] = place.enemies(pack).map((e) => {
      used[e.kind] = (used[e.kind] ?? 0) + 1;
      return {
        id: `${e.kind}-${used[e.kind]}`,
        kind: e.kind,
        name: e.name,
        hp: e.hp,
        maxHp: e.hp,
        defeated: false,
      };
    });
    // Enemy HP never exceeds what the items can cover with some repeats: trim from the last enemy.
    let excess = enemies.reduce((sum, e) => sum + e.hp, 0) - items.length * REPEATS_PER_ITEM;
    for (let i = enemies.length - 1; i >= 0 && excess > 0; i--) {
      const e = enemies[i]!;
      const cut = Math.min(excess, e.hp - 1);
      e.hp -= cut;
      e.maxHp = e.hp;
      excess -= cut;
    }
    return {
      info: {
        index,
        count: PLACES.length,
        name: place.name,
        intro: `${place.scene} ${KIND_LINE[kind]}`,
        kind,
        enemies,
      },
      items,
    };
  });
}

// ---------------------------------------------------------------- the quest

interface Evidence {
  itemId: string;
  kind: ChallengeKind;
  label: string;
  attempts: number;
  correctFirstTry: boolean;
  solved: boolean;
  wrongEver: boolean;
}

export function createQuest(pack: StoryInput, options: QuestOptions): Quest {
  const rng = createRng(options.seed);
  const encounters = buildEncounters(pack);

  let phase: QuestState['phase'] = 'ready';
  let encounterIndex = -1;
  let turn = 0; // global turn counter: the hero is PARTY[turn % 3], across encounters
  let shown = 0; // challenges shown so far, for challenge ids
  let courage = MAX_COURAGE;
  let xp = 0;
  let current: { item: Item; built: Built; hero: HeroId } | null = null;
  const evidence = new Map<string, Evidence>();
  // Correct answers beyond the first solve of an item (repeats also count for the class boss).
  let extraCorrect = 0;

  // Per-encounter queue state.
  let queue: Item[] = [];
  let lastSeen = new Map<string, number>();
  let wrongHere = new Set<string>();

  const encounter = () => encounters[encounterIndex]!;
  const liveEnemy = () => encounter().info.enemies.find((e) => !e.defeated);

  const record = (item: Item): Evidence => {
    let e = evidence.get(item.id);
    if (!e) {
      e = {
        itemId: item.id,
        kind: item.kind,
        label: item.label,
        attempts: 0,
        correctFirstTry: false,
        solved: false,
        wrongEver: false,
      };
      evidence.set(item.id, e);
    }
    return e;
  };

  /** Refill the queue when it runs dry: items answered wrong first, then the least recently seen. */
  const refill = () => {
    const items = encounter().items;
    const seen = (item: Item) => lastSeen.get(item.id) ?? -1;
    const wrong = items.filter((i) => wrongHere.has(i.id)).sort((a, b) => seen(a) - seen(b));
    const rest = items.filter((i) => !wrongHere.has(i.id)).sort((a, b) => seen(a) - seen(b));
    queue = [...wrong, ...rest];
    // Do not ask the item that was just answered twice in a row when another item exists.
    if (queue.length > 1 && current && queue[0]!.id === current.item.id) queue.push(queue.shift()!);
  };

  const nextTurn = (): GameEvent => {
    if (queue.length === 0) refill();
    const item = queue.shift()!;
    const hero = PARTY[turn % PARTY.length]!.id;
    turn += 1;
    shown += 1;
    lastSeen.set(item.id, turn);
    const built = item.build(rng, options.helper, `c${shown}`, record(item).wrongEver);
    current = { item, built, hero };
    return { type: 'turn', hero, challenge: built.challenge };
  };

  const startEncounter = (): GameEvent[] => {
    encounterIndex += 1;
    const enc = encounter();
    queue = rng.shuffle(enc.items);
    lastSeen = new Map();
    wrongHere = new Set();
    return [{ type: 'encounterStart', encounter: snapshotEncounter(enc.info) }, nextTurn()];
  };

  const grant = (events: GameEvent[], amount: number, reason: string) => {
    xp += amount;
    events.push({ type: 'xp', amount, total: xp, reason });
  };

  const results = (): QuestResults => {
    const items: ItemEvidence[] = [...evidence.values()].map(({ wrongEver: _w, ...rest }) => rest);
    const seen = items.length;
    const firstTry = items.filter((i) => i.correctFirstTry).length;
    const firstTryAccuracy = seen === 0 ? 0 : firstTry / seen;
    const correctAnswers = [...evidence.values()].reduce((n, e) => n + (e.solved ? 1 : 0), 0) + extraCorrect;
    return {
      storyId: pack.id,
      xp,
      stars: firstTryAccuracy >= 0.9 ? 3 : firstTryAccuracy >= 0.7 ? 2 : 1,
      firstTryAccuracy,
      correctAnswers,
      items,
      practice: [...evidence.values()].filter((e) => e.wrongEver).map((e) => e.label),
    };
  };
  const answer = (response: Response): GameEvent[] => {
    if (phase !== 'challenge' || !current)
      throw new Error(`answer() needs an open challenge (phase is ${phase})`);
    const { item, built, hero } = current;
    const ev = record(item);
    const correct = built.judge(response);
    const firstAttempt = ev.attempts === 0;
    ev.attempts += 1;
    const events: GameEvent[] = [];
    const feedback: Feedback = {
      correct,
      correctText: item.correctText,
      ...(correct ? {} : { explanation: item.explanation }),
      ...(item.paragraph !== undefined ? { paragraph: item.paragraph } : {}),
    };
    events.push({ type: 'answer', hero, feedback });

    const target = liveEnemy()!;
    if (correct) {
      if (ev.solved) extraCorrect += 1;
      else ev.solved = true;
      if (firstAttempt) ev.correctFirstTry = true;
      // The hero attacks the first enemy that is not defeated.
      target.hp = Math.max(0, target.hp - HERO_DAMAGE);
      events.push({
        type: 'heroAttack',
        hero,
        target: target.id,
        move: HERO_MOVE[hero],
        damage: HERO_DAMAGE,
      });
      events.push({ type: 'enemyHit', enemy: target.id, hp: target.hp });
      if (target.hp === 0) {
        target.defeated = true;
        events.push({ type: 'enemyDefeated', enemy: target.id });
      }
      // A correct Cleric heals 1 courage when below the maximum.
      if (hero === 'cleric' && courage < MAX_COURAGE) {
        courage += 1;
        events.push({ type: 'heal', hero, courage });
      }
      if (ev.wrongEver) grant(events, XP.retry, XP_REASON.retry);
      else grant(events, XP.firstTry, XP_REASON.firstTry);

      if (!liveEnemy()) {
        current = null;
        events.push({ type: 'encounterCleared', index: encounterIndex });
        grant(events, XP.encounter, XP_REASON.encounter);
        if (encounterIndex + 1 < encounters.length) {
          events.push(...startEncounter());
        } else {
          grant(events, XP.victory, XP_REASON.victory);
          phase = 'victory';
          events.push({ type: 'victory', results: results() });
        }
        return events;
      }
    } else {
      ev.wrongEver = true;
      wrongHere.add(item.id);
      // The item comes again at least two turns later, or last when the queue is shorter.
      queue.splice(Math.min(RETRY_GAP, queue.length), 0, item);
      events.push({ type: 'heroMiss', hero, target: target.id });
      courage -= 1;
      events.push({ type: 'enemyAttack', enemy: target.id, courage });
      if (courage <= 0) {
        // Never a game over: the team rests and courage returns to 3.
        courage = REST_COURAGE;
        events.push({ type: 'rest', courage });
      }
    }
    events.push(nextTurn());
    return events;
  };

  const start = (): GameEvent[] => {
    if (phase !== 'ready') throw new Error(`start() called twice (phase is ${phase})`);
    phase = 'challenge';
    return startEncounter();
  };

  return {
    get state(): QuestState {
      const enc = encounterIndex >= 0 ? snapshotEncounter(encounter().info) : null;
      return {
        phase,
        encounter: enc,
        party: PARTY.map((h) => ({ ...h })),
        enemies: enc ? enc.enemies : [],
        courage,
        maxCourage: MAX_COURAGE,
        activeHero: phase === 'challenge' && current ? current.hero : null,
        challenge: phase === 'challenge' && current ? current.built.challenge : null,
        xp,
      };
    },
    start,
    answer,
    results,
  };
}

/** A copy of the encounter info with copied enemies, so the frontend can keep events as history. */
function snapshotEncounter(info: EncounterInfo): EncounterInfo {
  return { ...info, enemies: info.enemies.map((e) => ({ ...e })) };
}
