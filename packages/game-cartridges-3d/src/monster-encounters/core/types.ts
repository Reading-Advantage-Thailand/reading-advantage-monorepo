/**
 * Monster Encounters: the contract between the game core (rules, content, scoring; renderer-free)
 * and the view (three.js battle, HUD; later a Phaser view too).
 *
 * The core never touches the DOM, three.js, time, or Math.random: every call is a pure step on a
 * seeded state, so tests replay exactly and a server could run the same rules later. The view
 * never decides correctness or damage: it shows the current challenge, sends the student's
 * response, and animates the returned events in order.
 *
 * Design and rules: docs/demo-monster-encounters.md. The story is a `StoryInput`
 * (src/apk3d/contracts/story-input.ts); the quest reads `vocabulary`, `sentences`, `fills`, and
 * `questions` from it.
 */

// ---------------------------------------------------------------- the quest

export type HeroId = 'knight' | 'wizard' | 'cleric';

/** Enemy kinds the frontend can show (each maps to a Forge character). */
export type EnemyKind = 'skeleton' | 'giant-bat' | 'mimic' | 'dragon-fire';

export type ChallengeKind = 'word' | 'sentence' | 'fill' | 'question';

export interface ChoiceOption {
  id: string;
  text: string;
}

/** Pick one option: a word's Thai meaning, the word for a blank, or a story question. */
export interface ChoiceChallenge {
  kind: 'word' | 'fill' | 'question';
  /** Id of the content item (StoryWord / StoryFill / StoryQuestion id); stable across retries. */
  itemId: string;
  /** Unique per showing ("c7"), so the frontend can key animations. */
  challengeId: string;
  /** What the student reads: the English word, the sentence with its blank, or the question. */
  prompt: string;
  /** Extra line under the prompt: the phonetic spelling or the English definition in helper mode. */
  hint?: string;
  options: ChoiceOption[];
  /** True when this item was answered wrong before in this quest. */
  retry: boolean;
}

/** Tap the words in order to build the sentence. */
export interface OrderChallenge {
  kind: 'sentence';
  itemId: string;
  challengeId: string;
  prompt: string;
  /** Shuffled tokens (never already in the correct order). Duplicate words get distinct ids. */
  tokens: ChoiceOption[];
  retry: boolean;
}

export type Challenge = ChoiceChallenge | OrderChallenge;

export type Response = { kind: 'choice'; optionId: string } | { kind: 'order'; tokenIds: string[] };

export interface Feedback {
  correct: boolean;
  /** The right answer in words ("กล้าหาญ", "Pip is a brave puppy now.", "A puppy"). */
  correctText: string;
  /** A short, kind explanation for a wrong answer ("brave means กล้าหาญ: not afraid."). */
  explanation?: string;
  /** Paragraph to look at again (zero-based), when known. */
  paragraph?: number;
}

export interface HeroState {
  id: HeroId;
  name: string;
}

export interface EnemyState {
  /** Unique within the quest ("skeleton-1"). */
  id: string;
  kind: EnemyKind;
  name: string;
  hp: number;
  maxHp: number;
  defeated: boolean;
}

export interface EncounterInfo {
  /** Zero-based encounter number. */
  index: number;
  /** Total encounters in this quest. */
  count: number;
  /** Place title shown to the student ("The Bone Hall"). */
  name: string;
  /** One line that sets the scene ("Two skeletons wake up. Show what the story's words mean!"). */
  intro: string;
  /** The challenge kind this encounter mostly uses. */
  kind: ChallengeKind;
  enemies: EnemyState[];
}

/** Snapshot for the UI; read it after any call (also the `Simulation` state). */
export interface QuestState {
  phase: 'ready' | 'challenge' | 'victory';
  encounter: EncounterInfo | null;
  party: HeroState[];
  enemies: EnemyState[];
  /** The team's shared courage (a gentle meter, never a game over). */
  courage: number;
  maxCourage: number;
  activeHero: HeroId | null;
  challenge: Challenge | null;
  xp: number;
}

/** Everything the frontend animates, in order. */
export type GameEvent =
  | { type: 'encounterStart'; encounter: EncounterInfo }
  | { type: 'turn'; hero: HeroId; challenge: Challenge }
  | { type: 'answer'; hero: HeroId; feedback: Feedback }
  | { type: 'heroAttack'; hero: HeroId; target: string; move: 'attack' | 'attack2'; damage: number }
  | { type: 'enemyHit'; enemy: string; hp: number }
  | { type: 'enemyDefeated'; enemy: string }
  | { type: 'heroMiss'; hero: HeroId; target: string }
  | { type: 'enemyAttack'; enemy: string; courage: number }
  | { type: 'heal'; hero: HeroId; courage: number }
  | { type: 'rest'; courage: number }
  | { type: 'xp'; amount: number; total: number; reason: string }
  | { type: 'encounterCleared'; index: number }
  | { type: 'victory'; results: QuestResults };

export interface QuestOptions {
  /** Seed for every choice the core makes (item order, distractors, token shuffles). */
  seed: number;
  /** Helper mode: 3 options instead of 4, and the English definition as a hint on word challenges. */
  helper: boolean;
}

export interface ItemEvidence {
  itemId: string;
  kind: ChallengeKind;
  /** Short label for the results list ("brave", "Pip is a brave puppy now."). */
  label: string;
  attempts: number;
  correctFirstTry: boolean;
  /** Answered correctly at some point in this quest. */
  solved: boolean;
}

export interface QuestResults {
  storyId: string;
  /** Cosmetic only: never a measure of skill. */
  xp: number;
  /** 1 to 3, from first-try accuracy. */
  stars: 1 | 2 | 3;
  firstTryAccuracy: number;
  /** Correct answers in total (the class-boss contribution counts these). */
  correctAnswers: number;
  items: ItemEvidence[];
  /** Labels of items answered wrong at least once, for "practice these". */
  practice: string[];
}

export interface Quest {
  readonly state: QuestState;
  /** Begins the first encounter: encounterStart, then the first turn. */
  start(): GameEvent[];
  /** Answers the current challenge; returns what happens, ending with the next turn or victory. */
  answer(response: Response): GameEvent[];
  results(): QuestResults;
}
