import {
  gameResultsSchema,
  vocabularyInputSchema,
  type GameResults,
} from "@reading-advantage/game-contracts";
import {
  createBoundedFrameScheduler,
  createCompletionLatch,
  createInputActionNormalizer,
  createLanguageTargetProgression,
  createResultAccountant,
  finalizeResult,
  validateNonEmptyContent,
  type APKInputController,
  type CartridgeGameConfigContext,
  type GameTerminalOutcome,
  type InputActionId,
} from "@reading-advantage/advantage-play-kit";
import type { StandardExperienceCartridge } from "@reading-advantage/advantage-play-kit/presentation";

import { createCartridgeStandardExperience } from "./standard-experience.js";

/** Stable public identifier for the RPG Battle cartridge. */
export const RPG_BATTLE_ID = "rpg-battle" as const;

/** Phaser canvas size used by RPG Battle before host scaling. */
export const RPG_BATTLE_CANVAS = Object.freeze({ width: 960, height: 540 });

/** Maximum health assigned to the hero in every RPG Battle session. */
export const RPG_BATTLE_PLAYER_MAX_HEALTH = 100;

/** Score awarded by each correct translation. */
export const RPG_BATTLE_SCORE_PER_CORRECT = 100;

/** Damage dealt by a basic translated attack. */
export const RPG_BATTLE_BASIC_DAMAGE = 10;

/** Damage dealt by a power translated attack. */
export const RPG_BATTLE_POWER_DAMAGE = 18;

/** Streak interval that adds one damage to a translated attack. */
export const RPG_BATTLE_STREAK_DAMAGE_INTERVAL = 2;

/** Basic damage retained as the default player damage export. */
export const RPG_BATTLE_PLAYER_DAMAGE = RPG_BATTLE_BASIC_DAMAGE;

/** Fixed damage dealt by each enemy counterattack. */
export const RPG_BATTLE_ENEMY_DAMAGE = 10;

/** Time that incorrect-answer feedback locks the answer controls. */
export const RPG_BATTLE_FEEDBACK_LOCK_MS = 900;

/** Keyboard bindings accepted by the RPG Battle arena. */
export const RPG_BATTLE_KEYBOARD_BINDINGS: Readonly<Record<string, InputActionId>> = Object.freeze({
  Enter: "confirm",
  Backspace: "cancel",
});

/** Active or terminal phase in an RPG Battle session. */
export type RpgBattlePhase = "playing" | "victory" | "defeat";

/** Actor that owns one resolved battle turn. */
export type RpgBattleActor = "player" | "enemy";

/** Actor that can receive the next battle action. */
export type RpgBattleTurn = "player" | "enemy";

/** Power level assigned to one deterministic vocabulary action. */
export type RpgBattleActionPower = "basic" | "power";

/** Outcome recorded by the most recent accepted battle operation. */
export type RpgBattleOutcome = "correct" | "incorrect" | "hazard";

/** Result of one accepted or rejected RPG Battle answer attempt. */
export interface RpgBattleAnswerResult {
  /** Whether the answer was accepted by the active session. */
  readonly accepted: boolean;
  /** Whether the submitted translation matched the current target. */
  readonly correct: boolean;
  /** Whether the correct answer advanced the vocabulary target. */
  readonly progressed: boolean;
  /** Whether this attempt ended the battle. */
  readonly terminal: boolean;
  /** Alias for terminal retained by cartridge callers. */
  readonly completed: boolean;
  /** Damage dealt by the hero during this attempt. */
  readonly playerDamage: number;
  /** Damage dealt by the enemy during its counterattack. */
  readonly enemyDamage: number;
  /** Power level used by a correct translated attack. */
  readonly actionPower?: RpgBattleActionPower;
  /** Streak bonus included in a correct translated attack. */
  readonly streakBonus: number;
  /** Strict result emitted when this attempt ends the battle. */
  readonly result?: GameResults;
  /** Battle state after this attempt. */
  readonly snapshot: RpgBattleSnapshot;
}

/** Immutable state exposed by the RPG Battle rules and scene. */
export interface RpgBattleSnapshot {
  /** Current battle phase. */
  readonly phase: RpgBattlePhase;
  /** Index of the next required vocabulary target. */
  readonly targetIndex: number;
  /** Number of required vocabulary targets. */
  readonly targetCount: number;
  /** Current source-language vocabulary prompt. */
  readonly prompt: string;
  /** Correct translation for the current prompt. */
  readonly answer: string;
  /** Deterministic touch answer choices for the current prompt. */
  readonly answerChoices: readonly string[];
  /** Index of the correct touch answer choice. */
  readonly correctChoiceIndex: number;
  /** Correct semantic action for the current target. */
  readonly correctAction: string;
  /** Actions available to the shared controller. */
  readonly availableActions: readonly string[];
  /** Power level assigned to the current target. */
  readonly actionPower: RpgBattleActionPower;
  /** Power level for each visible touch answer choice. */
  readonly answerChoicePowers: readonly RpgBattleActionPower[];
  /** Current typed translation buffer. */
  readonly typedAnswer: string;
  /** Whether an incorrect-answer feedback lock is active. */
  readonly inputLocked: boolean;
  /** Alias for inputLocked used by scene diagnostics. */
  readonly locked: boolean;
  /** Milliseconds left in the incorrect-answer feedback lock. */
  readonly lockRemainingMs: number;
  /** Feedback shown below the battle prompt. */
  readonly feedback: string;
  /** Compatibility field that never reveals the current answer. */
  readonly revealedTranslation: string | undefined;
  /** Result of the most recent accepted answer. */
  readonly lastOutcome: RpgBattleOutcome | undefined;
  /** Number of consecutive correct translations. */
  readonly streak: number;
  /** Current hero health. */
  readonly playerHealth: number;
  /** Shared-contract life alias for hero health. */
  readonly lives: number;
  /** Maximum hero health. */
  readonly playerMaxHealth: number;
  /** Shared-contract energy alias for the current streak. */
  readonly energy: number;
  /** Current enemy health. */
  readonly enemyHealth: number;
  /** Maximum enemy health. */
  readonly enemyMaxHealth: number;
  /** Actor whose turn is currently active. */
  readonly turn: RpgBattleTurn;
  /** Actor that completed the most recent resolved turn. */
  readonly lastActor: RpgBattleActor | undefined;
  /** Resolved actor order for this battle. */
  readonly turnHistory: readonly RpgBattleActor[];
  /** Number of resolved actor turns. */
  readonly turnsTaken: number;
  /** Number of player attacks. */
  readonly playerAttacks: number;
  /** Number of enemy counterattacks. */
  readonly enemyCounterattacks: number;
  /** Number of correct translations. */
  readonly correctAnswers: number;
  /** Number of submitted translations. */
  readonly totalAttempts: number;
  /** Current learning score, with 100 points for each correct target. */
  readonly score: number;
  /** Whether the scene lifecycle destroyed this battle. */
  readonly destroyed: boolean;
  /** Host seed used for answer choice and action-power derivation. */
  readonly seed: number;
}

/** Transport-independent RPG Battle rules and lifecycle controls. */
export interface RpgBattleController {
  /** Returns the current immutable battle state. */
  snapshot(): RpgBattleSnapshot;
  /** Appends text to the translation buffer while the player can act. */
  type(value: string): RpgBattleSnapshot;
  /** Alias for type that names the educational input. */
  typeAnswer(value: string): RpgBattleSnapshot;
  /** Removes the last character from the translation buffer. */
  backspace(): RpgBattleSnapshot;
  /** Submits the current translation buffer through the player turn. */
  submit(input?: string): RpgBattleAnswerResult;
  /** Alias for submit used by keyboard and test adapters. */
  submitAnswer(input?: string): RpgBattleAnswerResult;
  /** Selects one touch answer choice and submits its translation. */
  chooseAnswer(choice: number | string): RpgBattleAnswerResult;
  /** Alias for chooseAnswer retained for direct semantic adapters. */
  choose(choice: number | string): RpgBattleAnswerResult;
  /** Applies one enemy hazard without changing the learning target. */
  applyHazard(): RpgBattleAnswerResult;
  /** Advances feedback time and releases an expired incorrect-answer lock. */
  advanceTime(deltaMs: number): void;
  /** Alias for advanceTime used by frame-driven scene tests. */
  tick(deltaMs: number): void;
  /** Captures battle state before a responsive scene transition. */
  capture(): RpgBattleSnapshot;
  /** Restores validated battle state after a responsive scene transition. */
  restore(snapshot: RpgBattleSnapshot): void;
  /** Seals the battle and prevents later mutation or result delivery. */
  destroy(): void;
}

/** Minimal Phaser graphics surface owned by the RPG Battle scene. */
interface PhaserGraphicsLike {
  clear(): this;
  fillStyle(color: number, alpha?: number): this;
  fillRect(x: number, y: number, width: number, height: number): this;
  fillCircle(x: number, y: number, radius: number): this;
  fillRoundedRect(x: number, y: number, width: number, height: number, radius?: number): this;
  lineStyle(lineWidth: number, color: number, alpha?: number): this;
  strokeRoundedRect(x: number, y: number, width: number, height: number, radius?: number): this;
  destroy(): void;
}

/** Minimal Phaser text surface owned by the RPG Battle scene. */
interface PhaserTextLike {
  setPosition(x: number, y: number): this;
  setText(value: string): this;
  destroy(): void;
}

/** Minimal Phaser canvas surface needed for pointer conversion. */
interface PhaserCanvasLike {
  getBoundingClientRect?(): {
    readonly left: number;
    readonly top?: number;
    readonly width: number;
    readonly height?: number;
  };
}

/** Minimal Phaser scene surface owned by the RPG Battle cartridge. */
interface PhaserSceneLike {
  add?: {
    graphics(): PhaserGraphicsLike;
    text(x: number, y: number, value: string, style?: Readonly<Record<string, unknown>>): PhaserTextLike;
  };
  events?: { once(event: string, listener: () => void): void };
  game?: { readonly canvas?: PhaserCanvasLike };
  scale?: { readonly width?: number; readonly height?: number };
}

/** Display resources created and destroyed by one RPG Battle scene. */
interface SceneResources {
  readonly graphics: PhaserGraphicsLike;
  readonly title: PhaserTextLike;
  readonly prompt: PhaserTextLike;
  readonly health: PhaserTextLike;
  readonly progress: PhaserTextLike;
  readonly buffer: PhaserTextLike;
  readonly feedback: PhaserTextLike;
  readonly instructions: PhaserTextLike;
  readonly choices: readonly PhaserTextLike[];
}

/** Inputs and presentation state supplied to one RPG Battle scene. */
interface RpgBattleSceneContext {
  readonly controller: RpgBattleController;
  readonly inputController: APKInputController;
  readonly composition: CartridgeGameConfigContext["composition"];
  readonly diagnostic: CartridgeGameConfigContext["diagnostic"];
  readonly sessionMode: NonNullable<CartridgeGameConfigContext["sessionMode"]>;
}

/** Deterministic setup used to reproduce one RPG Battle session. */
export interface RpgBattleControllerOptions {
  /** Host-provided seed for action power and answer choice order. */
  readonly seed?: number;
  /** Optional deterministic source used to derive a seed. */
  readonly rng?: () => number;
  /** Session mode that ignores the incorrect-answer lock for tutorial and demo drivers. */
  readonly sessionMode?: "playing" | "tutorial" | "demo";
}

const RPG_BATTLE_SEED_MODULUS = 2_147_483_647;
const RPG_BATTLE_POWER_ACTION_WEIGHT = 0.35;

function normalizeSeed(seed: number | undefined): number {
  if (seed === undefined) return 0;
  if (!Number.isFinite(seed)) throw new Error("RPG Battle seed must be finite");
  return Math.abs(Math.trunc(seed)) % RPG_BATTLE_SEED_MODULUS;
}

function seededUnit(seed: number, index: number, salt: number): number {
  let value = (seed + 1) % RPG_BATTLE_SEED_MODULUS;
  value = (value * 48_271 + (index + 1) * 48_271 + (salt + 1) * 12_289) % RPG_BATTLE_SEED_MODULUS;
  value = (value * 48_271 + salt + 1) % RPG_BATTLE_SEED_MODULUS;
  if (value <= 0) value += RPG_BATTLE_SEED_MODULUS - 1;
  return (value - 1) / (RPG_BATTLE_SEED_MODULUS - 1);
}

function actionPowerFor(seed: number, targetIndex: number): RpgBattleActionPower {
  return seededUnit(seed, targetIndex, 7) < RPG_BATTLE_POWER_ACTION_WEIGHT ? "power" : "basic";
}

function damageFor(power: RpgBattleActionPower, streak: number): number {
  const baseDamage = power === "power" ? RPG_BATTLE_POWER_DAMAGE : RPG_BATTLE_BASIC_DAMAGE;
  return baseDamage + Math.floor(streak / RPG_BATTLE_STREAK_DAMAGE_INTERVAL);
}

function answerChoicesFor(
  items: readonly { readonly translation: string }[],
  targetIndex: number,
  seed: number,
  actionPowers: readonly RpgBattleActionPower[],
): Readonly<{
  choices: readonly string[];
  correctChoiceIndex: number;
  powers: readonly RpgBattleActionPower[];
}> {
  const expected = items[targetIndex]?.translation ?? items[items.length - 1]!.translation;
  const seenTranslations = new Set<string>([expected]);
  const candidateIndices = items
    .map((_item, index) => index)
    .filter((index) => {
      const translation = items[index]!.translation;
      if (seenTranslations.has(translation)) return false;
      seenTranslations.add(translation);
      return true;
    });
  const selectedIndices: number[] = [];
  while (selectedIndices.length < 2 && candidateIndices.length > 0) {
    const totalWeight = candidateIndices.reduce(
      (total, index) => total + (actionPowers[index] === "power" ? 2 : 1),
      0,
    );
    const target = seededUnit(seed, targetIndex, 20 + selectedIndices.length) * totalWeight;
    let running = 0;
    let selectedIndex = candidateIndices.length - 1;
    for (let index = 0; index < candidateIndices.length; index += 1) {
      running += actionPowers[candidateIndices[index]!] === "power" ? 2 : 1;
      if (target <= running) {
        selectedIndex = index;
        break;
      }
    }
    selectedIndices.push(candidateIndices[selectedIndex]!);
    candidateIndices.splice(selectedIndex, 1);
  }
  let decoyIndex = 1;
  const choices = selectedIndices.map((index) => items[index]!.translation);
  const choicePowers = selectedIndices.map((index) => actionPowers[index] ?? "basic");
  const onlyExpectedExists = !items.some((item) => item.translation !== expected);
  while (choices.length < 2) {
    const sourceIndex = (targetIndex + decoyIndex) % items.length;
    const decoy = items[sourceIndex]!.translation;
    decoyIndex += 1;
    if (decoy === expected && !onlyExpectedExists) continue;
    choices.push(decoy);
    choicePowers.push(actionPowers[sourceIndex] ?? actionPowerFor(seed, targetIndex + decoyIndex));
  }
  const correctChoiceIndex = Math.floor(seededUnit(seed, targetIndex, 41) * 3);
  choices.splice(correctChoiceIndex, 0, expected);
  choicePowers.splice(correctChoiceIndex, 0, actionPowers[targetIndex] ?? "basic");
  return Object.freeze({
    choices: Object.freeze(choices),
    correctChoiceIndex,
    powers: Object.freeze(choicePowers),
  });
}

function normalizeAnswer(value: string): string {
  return value.trim().toLocaleLowerCase();
}

function createRejectedResult(
  state: RpgBattleSnapshot,
  completed = false,
): RpgBattleAnswerResult {
  return Object.freeze({
    accepted: false,
    correct: false,
    progressed: false,
    terminal: false,
    completed,
    playerDamage: 0,
    enemyDamage: 0,
    streakBonus: 0,
    result: undefined,
    snapshot: state,
  });
}

function assertFiniteDelta(deltaMs: number): void {
  if (!Number.isFinite(deltaMs) || deltaMs < 0) {
    throw new Error("RPG Battle time delta must be a finite nonnegative number");
  }
}

/**
 * Returns the touch-choice index at a scene coordinate.
 * @param pointerX Scene-space horizontal pointer coordinate.
 * @param pointerY Scene-space vertical pointer coordinate.
 * @param sceneWidth Current scene width.
 * @param sceneHeight Current scene height.
 * @param choiceCount Number of rendered answer choices.
 * @returns The touched choice index, or undefined outside the answer cards.
 */
export function getRpgBattleChoiceIndex(
  pointerX: number,
  pointerY: number,
  sceneWidth: number,
  sceneHeight: number,
  choiceCount = 3,
): number | undefined {
  if (choiceCount <= 0 || sceneWidth <= 0 || sceneHeight <= 0) return undefined;
  const cardWidth = Math.min(560, sceneWidth * 0.84);
  const cardHeight = Math.min(52, sceneHeight * 0.095);
  const gap = Math.min(10, sceneHeight * 0.018);
  const startX = (sceneWidth - cardWidth) / 2;
  const startY = sceneHeight * 0.53;
  if (pointerX < startX || pointerX > startX + cardWidth) return undefined;
  const relativeY = pointerY - startY;
  const step = cardHeight + gap;
  const index = Math.floor(relativeY / step);
  if (index < 0 || index >= choiceCount) return undefined;
  if (relativeY - index * step > cardHeight) return undefined;
  return index;
}

function characterForKeyboardCode(code: string): string | undefined {
  const letter = /^Key([A-Z])$/u.exec(code)?.[1];
  if (letter) return letter.toLocaleLowerCase();
  const digit = /^Digit([0-9])$/u.exec(code)?.[1];
  if (digit) return digit;
  const namedCharacters: Readonly<Record<string, string>> = {
    Space: " ",
    Comma: ",",
    Period: ".",
    Minus: "-",
    Slash: "/",
    Quote: "'",
  };
  return namedCharacters[code];
}

/**
 * Creates transport-independent RPG Battle rules for one vocabulary array.
 * @param input Untrusted vocabulary content supplied by a host or test.
 * @param deliver Callback that receives the first terminal result and its terminal outcome.
 * @param options Deterministic action-power and answer-choice settings.
 * @returns A controller for typed, turn-based translation combat.
 * @throws When the vocabulary input is invalid or empty.
 */
export function createRpgBattleController(
  input: unknown,
  deliver: (result: GameResults, outcome: GameTerminalOutcome) => void | Promise<void>,
  options: RpgBattleControllerOptions = {},
): RpgBattleController {
  const parsedInput = vocabularyInputSchema.parse(input);
  const content = validateNonEmptyContent(parsedInput, "vocabulary");
  const items = content.items;
  const seedSource = options.seed !== undefined ? options.seed : options.rng?.();
  const seed = normalizeSeed(options.seed !== undefined ? seedSource : seedSource === undefined ? undefined : seedSource * 1_000_000);
  const sessionMode = options.sessionMode ?? "playing";
  const ignoresInputLock = sessionMode !== "playing";
  const actionPowers = Object.freeze(items.map((_item, index) => actionPowerFor(seed, index)));
  const targetIds = items.map((_item, index) => `target:${index}`);
  const progression = createLanguageTargetProgression(targetIds);
  const enemyMaxHealth = actionPowers.reduce(
    (total, power, index) => total + damageFor(power, index),
    0,
  );
  let accountant = createResultAccountant();
  let phase: RpgBattlePhase = "playing";
  let targetIndex = 0;
  let typedAnswer = "";
  let inputLocked = false;
  let lockRemainingMs = 0;
  let feedback = "Choose a translation or type your answer.";
  let revealedTranslation: string | undefined;
  let lastOutcome: RpgBattleOutcome | undefined;
  let streak = 0;
  let playerHealth = RPG_BATTLE_PLAYER_MAX_HEALTH;
  let enemyHealth = enemyMaxHealth;
  let turn: RpgBattleTurn = "player";
  let lastActor: RpgBattleActor | undefined;
  let turnHistory: RpgBattleActor[] = [];
  let playerAttacks = 0;
  let enemyCounterattacks = 0;
  let destroyed = false;
  let terminalResultValue: GameResults | undefined;
  let terminalOutcome: GameTerminalOutcome = "complete";
  const completion = createCompletionLatch<GameResults>((result) => deliver(result, terminalOutcome));

  const displayedTargetIndexFor = (index: number): number => Math.min(index, items.length - 1);
  const displayedTargetIndex = (): number => displayedTargetIndexFor(targetIndex);

  const snapshot = (): RpgBattleSnapshot => {
    const displayIndex = displayedTargetIndex();
    const current = items[displayIndex]!;
    const choices = answerChoicesFor(items, displayIndex, seed, actionPowers);
    const history = Object.freeze([...turnHistory]);
    return Object.freeze({
      phase,
      targetIndex,
      targetCount: items.length,
      prompt: current.term,
      answer: current.translation,
      answerChoices: choices.choices,
      correctChoiceIndex: choices.correctChoiceIndex,
      correctAction: current.translation,
      availableActions: choices.choices,
      actionPower: actionPowers[displayIndex]!,
      answerChoicePowers: choices.powers,
      typedAnswer,
      inputLocked,
      locked: inputLocked,
      lockRemainingMs,
      feedback,
      revealedTranslation,
      lastOutcome,
      streak,
      playerHealth,
      lives: playerHealth,
      playerMaxHealth: RPG_BATTLE_PLAYER_MAX_HEALTH,
      energy: streak,
      enemyHealth,
      enemyMaxHealth,
      turn,
      lastActor,
      turnHistory: history,
      turnsTaken: history.length,
      playerAttacks,
      enemyCounterattacks,
      correctAnswers: accountant.correctAnswers,
      totalAttempts: accountant.totalAttempts,
      score: accountant.score,
      destroyed,
      seed,
    });
  };

  const terminalResult = (): GameResults => gameResultsSchema.parse(
    finalizeResult(accountant, { xpPerCorrect: 20, xpPerAccuracyPoint: 10 }),
  );

  const finish = (nextPhase: "victory" | "defeat"): GameResults => {
    phase = nextPhase;
    terminalOutcome = nextPhase;
    if (nextPhase === "victory") enemyHealth = 0;
    if (nextPhase === "defeat") playerHealth = 0;
    inputLocked = false;
    lockRemainingMs = 0;
    feedback = nextPhase === "victory" ? "Victory! The enemy has fallen." : "Defeat. The enemy wins this duel.";
    const result = terminalResult();
    terminalResultValue = result;
    completion.complete(result);
    return result;
  };

  const recordActor = (actor: RpgBattleActor): void => {
    turnHistory = [...turnHistory, actor];
    lastActor = actor;
    turn = actor;
  };

  const releaseTutorialLock = (): void => {
    if (!ignoresInputLock || !inputLocked) return;
    inputLocked = false;
    lockRemainingMs = 0;
  };

  const counterattack = (): number => {
    if (phase !== "playing" || enemyHealth <= 0) return 0;
    recordActor("enemy");
    enemyCounterattacks += 1;
    playerHealth = Math.max(0, playerHealth - RPG_BATTLE_ENEMY_DAMAGE);
    if (playerHealth === 0) {
      finish("defeat");
      return RPG_BATTLE_ENEMY_DAMAGE;
    }
    turn = "player";
    feedback = "The enemy counterattacks. Your turn.";
    return RPG_BATTLE_ENEMY_DAMAGE;
  };

  const resultFor = (
    values: Omit<RpgBattleAnswerResult, "snapshot">,
  ): RpgBattleAnswerResult => Object.freeze({ ...values, result: values.result, snapshot: snapshot() });

  const validateRestoredState = (state: RpgBattleSnapshot): void => {
    if (state === null || typeof state !== "object") throw new Error("RPG Battle state must be an object");
    if (!(["playing", "victory", "defeat"] as const).includes(state.phase)) {
      throw new Error("RPG Battle state phase is invalid");
    }
    if (state.seed !== seed) throw new Error("RPG Battle state seed is invalid");
    if (state.targetCount !== items.length || !Number.isInteger(state.targetIndex) || state.targetIndex < 0 || state.targetIndex > items.length) {
      throw new Error("RPG Battle state target progress is invalid");
    }
    const displayIndex = displayedTargetIndexFor(state.targetIndex);
    const current = items[displayIndex]!;
    const expectedChoices = answerChoicesFor(items, displayIndex, seed, actionPowers);
    if (state.prompt !== current.term || state.answer !== current.translation || state.correctAction !== current.translation) {
      throw new Error("RPG Battle state target content is invalid");
    }
    if (!Array.isArray(state.answerChoices) || state.answerChoices.length !== expectedChoices.choices.length || state.answerChoices.some((choice, index) => choice !== expectedChoices.choices[index])) {
      throw new Error("RPG Battle state answer choices are invalid");
    }
    if (!Array.isArray(state.availableActions) || state.availableActions.some((action, index) => action !== state.answerChoices[index]) || state.availableActions.length !== state.answerChoices.length) {
      throw new Error("RPG Battle state available actions are invalid");
    }
    if (!Array.isArray(state.answerChoicePowers) || state.correctChoiceIndex !== expectedChoices.correctChoiceIndex || state.actionPower !== actionPowers[displayIndex] || state.answerChoicePowers.length !== expectedChoices.powers.length || state.answerChoicePowers.some((power, index) => power !== expectedChoices.powers[index])) {
      throw new Error("RPG Battle state action power is invalid");
    }
    if (!Number.isInteger(state.correctAnswers) || state.correctAnswers !== state.targetIndex || !Number.isInteger(state.totalAttempts) || state.totalAttempts < state.correctAnswers) {
      throw new Error("RPG Battle state result counters are invalid");
    }
    if (state.score !== state.correctAnswers * RPG_BATTLE_SCORE_PER_CORRECT) {
      throw new Error("RPG Battle state score is invalid");
    }
    if (state.playerMaxHealth !== RPG_BATTLE_PLAYER_MAX_HEALTH || !Number.isInteger(state.enemyMaxHealth) || state.enemyMaxHealth !== enemyMaxHealth) {
      throw new Error("RPG Battle state health limits are invalid");
    }
    if (!Number.isInteger(state.enemyHealth) || state.enemyHealth < 0 || state.enemyHealth > enemyMaxHealth) {
      throw new Error("RPG Battle state enemy health is invalid");
    }
    if (!Number.isInteger(state.playerHealth) || state.playerHealth < 0 || state.playerHealth > RPG_BATTLE_PLAYER_MAX_HEALTH || state.lives !== state.playerHealth || state.energy !== state.streak) {
      throw new Error("RPG Battle state player health is invalid");
    }
    if (!Number.isInteger(state.streak) || state.streak < 0 || state.streak > state.correctAnswers) {
      throw new Error("RPG Battle state streak is invalid");
    }
    if (typeof state.typedAnswer !== "string" || typeof state.feedback !== "string" || state.revealedTranslation !== undefined) {
      throw new Error("RPG Battle state text is invalid");
    }
    if (typeof state.inputLocked !== "boolean" || state.locked !== state.inputLocked || !Number.isFinite(state.lockRemainingMs) || state.lockRemainingMs < 0 || state.lockRemainingMs > RPG_BATTLE_FEEDBACK_LOCK_MS || state.inputLocked !== (state.lockRemainingMs > 0)) {
      throw new Error("RPG Battle state lock is invalid");
    }
    if (state.lastOutcome !== undefined && !["correct", "incorrect", "hazard"].includes(state.lastOutcome)) {
      throw new Error("RPG Battle state outcome is invalid");
    }
    if (typeof state.destroyed !== "boolean") throw new Error("RPG Battle state destroyed flag is invalid");
    if (state.phase === "playing" && (state.targetIndex >= items.length || state.playerHealth === 0)) {
      throw new Error("RPG Battle playing state is terminal");
    }
    if (state.phase === "victory" && (state.targetIndex !== items.length || state.enemyHealth !== 0)) {
      throw new Error("RPG Battle victory state is incomplete");
    }
    if (state.phase === "defeat" && state.playerHealth !== 0) {
      throw new Error("RPG Battle defeat state must have zero player health");
    }
    if (state.phase === "defeat" && state.targetIndex >= items.length) {
      throw new Error("RPG Battle defeat state has no active target");
    }
    if (state.turn !== "player" && state.turn !== "enemy") {
      throw new Error("RPG Battle turn is invalid");
    }
    if (!Array.isArray(state.turnHistory) || state.turnHistory.some((actor) => actor !== "player" && actor !== "enemy") || state.turnHistory.length !== state.turnsTaken) {
      throw new Error("RPG Battle turn counters are invalid");
    }
    if (!Number.isInteger(state.turnsTaken) || !Number.isInteger(state.playerAttacks) || !Number.isInteger(state.enemyCounterattacks) || state.playerAttacks !== state.turnHistory.filter((actor) => actor === "player").length || state.playerAttacks !== state.totalAttempts) {
      throw new Error("RPG Battle player turn counters are invalid");
    }
    if (state.enemyCounterattacks !== state.turnHistory.filter((actor) => actor === "enemy").length) {
      throw new Error("RPG Battle enemy turn counters are invalid");
    }
    if (state.lastActor !== undefined && state.lastActor !== "player" && state.lastActor !== "enemy") {
      throw new Error("RPG Battle last actor is invalid");
    }
    if (state.lastActor !== state.turnHistory[state.turnHistory.length - 1]) {
      throw new Error("RPG Battle last actor does not match turn history");
    }
  };

  const submit = (input?: string): RpgBattleAnswerResult => {
    releaseTutorialLock();
    const before = snapshot();
    if (destroyed || phase !== "playing" || turn !== "player" || inputLocked) {
      return createRejectedResult(before);
    }
    if (input !== undefined) typedAnswer = input;
    const submitted = typedAnswer;
    if (submitted.trim().length === 0) {
      feedback = "Type a translation before you submit.";
      return resultFor({
        accepted: false,
        correct: false,
        progressed: false,
        terminal: false,
        completed: false,
        playerDamage: 0,
        enemyDamage: 0,
        streakBonus: 0,
      });
    }

    const current = items[targetIndex]!;
    const correct = normalizeAnswer(submitted) === normalizeAnswer(current.translation);
    accountant.recordAttempt({ correct });
    typedAnswer = "";
    lastOutcome = correct ? "correct" : "incorrect";
    revealedTranslation = undefined;
    recordActor("player");
    playerAttacks += 1;

    if (!correct) {
      streak = 0;
      feedback = "Incorrect. The enemy counterattacks.";
      const enemyDamage = counterattack();
      const ended = terminalResultValue !== undefined;
      if (!ended) feedback = "Incorrect. The enemy counterattacks.";
      if (phase === "playing") {
        inputLocked = true;
        lockRemainingMs = RPG_BATTLE_FEEDBACK_LOCK_MS;
      }
      return resultFor({
        accepted: true,
        correct: false,
        progressed: false,
        terminal: ended,
        completed: ended,
        playerDamage: 0,
        enemyDamage,
        streakBonus: 0,
        ...(ended ? { result: terminalResultValue } : {}),
      });
    }

    const actionPower = actionPowers[targetIndex]!;
    const streakBonus = Math.floor(streak / RPG_BATTLE_STREAK_DAMAGE_INTERVAL);
    const playerDamage = damageFor(actionPower, streak);
    streak += 1;
    accountant.addScore(RPG_BATTLE_SCORE_PER_CORRECT);
    const match = progression.match(targetIds[targetIndex]!);
    if (!match.matched) throw new Error("RPG Battle progression rejected its current target");
    targetIndex += 1;
    enemyHealth = Math.max(0, enemyHealth - playerDamage);
    feedback = actionPower === "power" ? "Power hit!" : "Direct hit!";

    if (targetIndex === items.length) {
      const result = finish("victory");
      return resultFor({
        accepted: true,
        correct: true,
        progressed: true,
        terminal: true,
        completed: true,
        playerDamage,
        enemyDamage: 0,
        actionPower,
        streakBonus,
        result,
      });
    }

    // Correct translations skip the counterattack so a full deck can reach victory.
    turn = "player";
    return resultFor({
      accepted: true,
      correct: true,
      progressed: true,
      terminal: false,
      completed: false,
      playerDamage,
      enemyDamage: 0,
      actionPower,
      streakBonus,
    });
  };

  const chooseAnswer = (choice: number | string): RpgBattleAnswerResult => {
    releaseTutorialLock();
    const state = snapshot();
    if (destroyed || phase !== "playing" || inputLocked) return createRejectedResult(state);
    const selected = typeof choice === "number"
      ? state.answerChoices[choice]
      : state.answerChoices.find((answer) => answer === choice);
    if (selected === undefined) return createRejectedResult(state, false);
    return submit(selected);
  };

  const applyHazard = (): RpgBattleAnswerResult => {
    const before = snapshot();
    if (destroyed || phase !== "playing") return createRejectedResult(before);
    lastOutcome = "hazard";
    const enemyDamage = counterattack();
    const ended = terminalResultValue !== undefined;
    return resultFor({
      accepted: true,
      correct: false,
      progressed: false,
      terminal: ended,
      completed: ended,
      playerDamage: 0,
      enemyDamage,
      streakBonus: 0,
      ...(ended ? { result: terminalResultValue } : {}),
    });
  };

  return Object.freeze({
    snapshot,
    type(value: string): RpgBattleSnapshot {
      releaseTutorialLock();
      if (destroyed || phase !== "playing" || inputLocked) return snapshot();
      typedAnswer += value;
      return snapshot();
    },
    typeAnswer(value: string): RpgBattleSnapshot {
      releaseTutorialLock();
      if (destroyed || phase !== "playing" || inputLocked) return snapshot();
      typedAnswer += value;
      return snapshot();
    },
    backspace(): RpgBattleSnapshot {
      releaseTutorialLock();
      if (destroyed || phase !== "playing" || inputLocked) return snapshot();
      typedAnswer = typedAnswer.slice(0, -1);
      return snapshot();
    },
    submit,
    submitAnswer: submit,
    chooseAnswer,
    choose(choice: number | string): RpgBattleAnswerResult {
      if (choice === "confirm") return submit();
      if (choice === "cancel") {
        releaseTutorialLock();
        const before = snapshot();
        if (destroyed || phase !== "playing" || inputLocked || typedAnswer.length === 0) {
          return createRejectedResult(before);
        }
        typedAnswer = typedAnswer.slice(0, -1);
        return resultFor({
          accepted: true,
          correct: false,
          progressed: false,
          terminal: false,
          completed: false,
          playerDamage: 0,
          enemyDamage: 0,
          streakBonus: 0,
        });
      }
      return chooseAnswer(choice);
    },
    applyHazard,
    advanceTime(deltaMs: number): void {
      assertFiniteDelta(deltaMs);
      if (destroyed || phase !== "playing" || !inputLocked) return;
      lockRemainingMs = Math.max(0, lockRemainingMs - deltaMs);
      if (lockRemainingMs === 0) inputLocked = false;
    },
    tick(deltaMs: number): void {
      this.advanceTime(deltaMs);
    },
    capture: snapshot,
    restore(state: RpgBattleSnapshot): void {
      if (destroyed) return;
      if (phase !== "playing" && state.phase === "playing") {
        throw new Error("RPG Battle responsive state reopens a terminal battle");
      }
      validateRestoredState(state);
      progression.reset();
      for (let index = 0; index < state.targetIndex; index += 1) progression.match(targetIds[index]!);
      accountant = createResultAccountant();
      for (let index = 0; index < state.totalAttempts; index += 1) {
        accountant.recordAttempt({ correct: index < state.correctAnswers });
      }
      accountant.addScore(state.score);
      phase = state.phase;
      targetIndex = state.targetIndex;
      typedAnswer = state.typedAnswer;
      inputLocked = state.inputLocked;
      lockRemainingMs = state.lockRemainingMs;
      feedback = state.feedback;
      revealedTranslation = state.revealedTranslation;
      lastOutcome = state.lastOutcome;
      playerHealth = state.playerHealth;
      enemyHealth = state.enemyHealth;
      turn = state.turn;
      lastActor = state.lastActor;
      turnHistory = [...state.turnHistory];
      playerAttacks = state.playerAttacks;
      enemyCounterattacks = state.enemyCounterattacks;
      streak = state.streak;
      destroyed = state.destroyed;
      terminalResultValue = undefined;
      if (state.phase !== "playing" || state.destroyed) completion.sealWithoutDelivery();
    },
    destroy(): void {
      if (destroyed) return;
      destroyed = true;
      completion.sealWithoutDelivery();
    },
  });
}

function dimensions(scene: PhaserSceneLike): { width: number; height: number } {
  return {
    width: scene.scale?.width ?? RPG_BATTLE_CANVAS.width,
    height: scene.scale?.height ?? RPG_BATTLE_CANVAS.height,
  };
}

function pointerInScene(
  scene: PhaserSceneLike,
  clientX: number,
  clientY: number,
  width: number,
  height: number,
): Readonly<{ x: number; y: number }> {
  const rect = scene.game?.canvas?.getBoundingClientRect?.();
  if (!rect || rect.width <= 0 || !rect.height || rect.height <= 0) {
    return { x: clientX, y: clientY };
  }
  return {
    x: (clientX - rect.left) * (width / rect.width),
    y: (clientY - (rect.top ?? 0)) * (height / rect.height),
  };
}

function createScene(context: RpgBattleSceneContext): Readonly<Record<string, unknown>> {
  let resources: SceneResources | undefined;
  let composition = context.composition;
  let previousKeys = new Set<string>();
  let animationMs = 0;
  const normalize = createInputActionNormalizer({
    keyboard: RPG_BATTLE_KEYBOARD_BINDINGS,
    pointerTap: { action: "confirm" },
  });
  const frameScheduler = createBoundedFrameScheduler((deltaMs) => {
    animationMs = (animationMs + deltaMs) % 2_000;
    context.controller.advanceTime(deltaMs);
  });

  const answerPoint = (scene: PhaserSceneLike, index: number): { x: number; y: number; width: number; height: number } => {
    const { width, height } = dimensions(scene);
    const cardWidth = Math.min(560, width * 0.84);
    const cardHeight = Math.min(52, height * 0.095);
    const gap = Math.min(10, height * 0.018);
    return {
      x: (width - cardWidth) / 2,
      y: height * 0.53 + index * (cardHeight + gap),
      width: cardWidth,
      height: cardHeight,
    };
  };

  const updateView = (scene: PhaserSceneLike): void => {
    if (!resources) return;
    const active = resources;
    const { width, height } = dimensions(scene);
    const state = context.controller.snapshot();
    const pulse = Math.sin(animationMs / 2_000 * Math.PI * 2) * 3;
    const playerBarWidth = width * 0.34;
    const enemyBarWidth = width * 0.34;
    const barY = height * 0.27;

    active.graphics.clear();
    active.graphics.fillStyle(0x160f2a, 1).fillRect(0, 0, width, height);
    active.graphics.fillStyle(0x2b1d4a, 0.96).fillRoundedRect(width * 0.05, height * 0.12, width * 0.9, height * 0.78, 24);
    active.graphics.fillStyle(0x3a2861, 1).fillCircle(width * 0.28, height * 0.4 + pulse, Math.min(width, height) * 0.1);
    active.graphics.fillStyle(0xc94c62, 1).fillCircle(width * 0.72, height * 0.4 - pulse, Math.min(width, height) * 0.1);
    active.graphics.fillStyle(0x111827, 1).fillRoundedRect(width * 0.08, barY, playerBarWidth, 16, 8);
    active.graphics.fillStyle(0x52d273, 1).fillRoundedRect(width * 0.08, barY, playerBarWidth * (state.playerHealth / state.playerMaxHealth), 16, 8);
    active.graphics.fillStyle(0x111827, 1).fillRoundedRect(width * 0.58, barY, enemyBarWidth, 16, 8);
    active.graphics.fillStyle(0xf26d78, 1).fillRoundedRect(width * 0.58, barY, enemyBarWidth * (state.enemyHealth / state.enemyMaxHealth), 16, 8);
    state.answerChoices.forEach((_choice, index) => {
      const card = answerPoint(scene, index);
      active.graphics.fillStyle(state.inputLocked ? 0x475569 : 0x5b3a91, 0.92)
        .fillRoundedRect(card.x, card.y, card.width, card.height, 12);
      active.graphics.lineStyle(2, 0xbda4ff, 0.8)
        .strokeRoundedRect(card.x, card.y, card.width, card.height, 12);
      active.choices[index]
        ?.setText(`${index + 1}. ${state.answerChoices[index]}  [${state.answerChoicePowers[index]}]`)
        .setPosition(card.x + 18, card.y + 16);
    });

    active.title.setText("RPG BATTLE").setPosition(28, 20);
    active.prompt.setText(`Translate to attack: ${state.prompt}`).setPosition(28, 64);
    active.health
      .setText(`Hero ${state.playerHealth}/${state.playerMaxHealth}   |   Enemy ${state.enemyHealth}/${state.enemyMaxHealth}`)
      .setPosition(28, barY - 28);
    active.progress
      .setText(`${composition?.profile === "compact" ? "Compact duel" : "Turn duel"}  |  Target ${Math.min(state.targetIndex + 1, state.targetCount)} of ${state.targetCount}  |  Score ${state.score}  |  Streak ${state.streak}`)
      .setPosition(28, height * 0.49);
    active.buffer.setText(`Typed: ${state.typedAnswer || "_"}`).setPosition(28, height * 0.79);
    active.feedback.setText(state.feedback).setPosition(28, height * 0.84);
    active.instructions
      .setText("Type with the keyboard and press Enter, or tap a translation choice.")
      .setPosition(28, height - 30);
  };

  const processAnswer = (answer: string | number): void => {
    const before = context.controller.snapshot();
    const result = context.controller.choose(answer);
    if (!result.accepted) return;
    context.diagnostic({
      level: "info",
      code: result.terminal ? "RPG_BATTLE_TERMINAL" : "RPG_BATTLE_TURN",
      message: result.terminal ? "RPG Battle ended." : "RPG Battle resolved a translation turn.",
      details: {
        correct: result.correct,
        playerDamage: result.playerDamage,
        enemyDamage: result.enemyDamage,
        actionPower: result.actionPower,
        streakBonus: result.streakBonus,
        targetIndex: result.snapshot.targetIndex,
        attempts: result.snapshot.totalAttempts,
        previousHealth: before.playerHealth,
      },
    });
  };

  const cleanup = (): void => {
    frameScheduler.cancel();
    context.controller.destroy();
    if (!resources) return;
    const active = resources;
    resources = undefined;
    active.graphics.destroy();
    active.title.destroy();
    active.prompt.destroy();
    active.health.destroy();
    active.progress.destroy();
    active.buffer.destroy();
    active.feedback.destroy();
    active.instructions.destroy();
    for (const choice of active.choices) choice.destroy();
    previousKeys = new Set<string>();
  };

  const create = function (this: PhaserSceneLike): void {
    if (!this.add) throw new Error("RPG Battle requires Phaser display services");
    const style = { fontFamily: "Arial", color: "#ffffff", fontSize: "18px" };
    resources = {
      graphics: this.add.graphics(),
      title: this.add.text(0, 0, "", { ...style, fontSize: "30px", fontStyle: "bold" }),
      prompt: this.add.text(0, 0, "", { ...style, fontSize: "24px" }),
      health: this.add.text(0, 0, "", { ...style, fontSize: "15px", color: "#d9f99d" }),
      progress: this.add.text(0, 0, "", { ...style, fontSize: "15px", color: "#ddd6fe" }),
      buffer: this.add.text(0, 0, "", { ...style, fontSize: "19px", color: "#fef3c7" }),
      feedback: this.add.text(0, 0, "", { ...style, fontSize: "16px", color: "#fcd34d" }),
      instructions: this.add.text(0, 0, "", { ...style, fontSize: "14px", color: "#c4b5fd" }),
      choices: [0, 1, 2].map(() => this.add!.text(0, 0, "", { ...style, fontSize: "17px" })),
    };
    this.events?.once("shutdown", cleanup);
    this.events?.once("destroy", cleanup);
    updateView(this);
  };

  const update = function (this: PhaserSceneLike, _time = 0, delta = 0): void {
    if (!resources) return;
    frameScheduler.tick(delta);
    if (context.sessionMode === "playing") {
      const input = context.inputController.snapshot();
      const pressed = input.pressed ?? input.keys.filter((key) => !previousKeys.has(key));
      previousKeys = new Set(input.keys);
      for (const code of pressed) {
        const action = normalize({ modality: "keyboard", code })[0]?.action;
        if (action === "confirm") context.controller.submitAnswer();
        else if (action === "cancel") context.controller.backspace();
        else {
          const character = characterForKeyboardCode(code);
          if (character !== undefined) context.controller.type(character);
        }
      }
      if (input.pointer.released && !input.pointer.cancelled) {
        const pointerAction = normalize({ modality: "pointer", phase: "up", x: input.pointer.x, y: input.pointer.y })[0];
        if (pointerAction?.action === "confirm") {
          const { width, height } = dimensions(this);
          const pointer = pointerInScene(this, input.pointer.x, input.pointer.y, width, height);
          const choice = getRpgBattleChoiceIndex(
            pointer.x,
            pointer.y,
            width,
            height,
            context.controller.snapshot().answerChoices.length,
          );
          if (choice !== undefined) processAnswer(choice);
        }
      }
    }
    updateView(this);
  };

  return {
    key: RPG_BATTLE_ID,
    create,
    update,
    extend: {
      apkCaptureResponsiveState: () => context.controller.capture(),
      apkRestoreResponsiveState: (state: unknown) => {
        if (typeof state !== "object" || state === null) throw new Error("RPG Battle responsive state is invalid");
        context.controller.restore(state as RpgBattleSnapshot);
      },
      apkRecompose: (nextComposition: RpgBattleSceneContext["composition"]) => {
        composition = nextComposition;
      },
    },
  };
}

/** Creates the standard RPG Battle APK cartridge. */
export function createRpgBattleCartridge(): StandardExperienceCartridge {
  let activeController: RpgBattleController | undefined;
  const standardExperience = createCartridgeStandardExperience({
    id: RPG_BATTLE_ID,
    title: "RPG Battle",
    description: "Defeat a fantasy enemy by translating vocabulary in a turn-based duel.",
    inputMode: "vocabulary",
    objective: "Defeat the enemy by translating every required vocabulary target.",
    mechanicInstruction: "Type the translation and press Enter, or tap a translation choice to attack.",
    keyboardKeys: ["A-Z", "Backspace", "Enter"],
    executeTutorialAction: (actionId) => {
      const controller = activeController;
      if (!controller) return;
      if (controller.snapshot().inputLocked) {
        controller.advanceTime(RPG_BATTLE_FEEDBACK_LOCK_MS);
      }
      const state = controller.snapshot();
      if (actionId === "action:select-correct") {
        controller.chooseAnswer(state.correctChoiceIndex);
        return;
      }
      const wrongIndex = state.answerChoices.findIndex((choice) => choice !== state.answer);
      controller.chooseAnswer(wrongIndex >= 0 ? wrongIndex : (state.correctChoiceIndex + 1) % state.answerChoices.length);
    },
  });

  return {
    manifest: {
      id: RPG_BATTLE_ID,
      title: "RPG Battle",
      description: "Defeat a fantasy enemy by translating vocabulary in a turn-based duel.",
      version: "0.1.0",
      runtimeApiVersion: "1.0.0",
      inputMode: "vocabulary",
      requiredAssetBindings: ["legacy-catalog/rpg-battle/arena"],
      capabilities: [
        "capability:bounded-frame-delta",
        "capability:input-action-normalization",
        "capability:language-target-progression",
        "capability:nonempty-content-precondition",
        "capability:result-accounting",
        "capability:single-completion-emission",
        "capability:typed-translation-buffer",
        "capability:turn-based-counterattack",
        "capability:responsive-battle-state",
      ],
    },
    standardExperience,
    createGameConfig(context: CartridgeGameConfigContext): Readonly<Record<string, unknown>> {
      const input = vocabularyInputSchema.parse(context.input);
      const sessionMode = context.sessionMode ?? "playing";
      const controller = createRpgBattleController(
        input,
         sessionMode === "playing" ? (result, outcome) => context.complete(result, outcome) : () => undefined,
        { seed: context.seed, sessionMode },
      );
      activeController = controller;
      context.diagnostic({
        level: "debug",
        code: "RPG_BATTLE_READY",
        message: "RPG Battle translation combat is ready.",
        details: {
          cartridgeId: RPG_BATTLE_ID,
          editionId: context.edition.id,
          targetCount: input.length,
          enemyMaxHealth: controller.snapshot().enemyMaxHealth,
        },
      });
      return {
        width: RPG_BATTLE_CANVAS.width,
        height: RPG_BATTLE_CANVAS.height,
        render: { antialias: false, pixelArt: true },
        scene: createScene({
          controller,
          inputController: context.inputController,
          composition: context.composition,
          diagnostic: context.diagnostic,
          sessionMode,
        }),
      };
    },
  };
}
