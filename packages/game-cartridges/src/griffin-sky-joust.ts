import {
  gameResultsSchema,
  sentenceInputSchema,
  type GameResults,
} from "@reading-advantage/game-contracts";
import {
  createActorSpriteLayer,
  createBoundedFrameScheduler,
  createCompletionLatch,
  createInputActionNormalizer,
  createResultAccountant,
  finalizeResult,
  preloadAssetBindings,
  resolveAssetBinding,
  validateNonEmptyContent,
  type ActorSpriteLayer,
  type ActorSpriteLike,
  type APKInputController,
  type APKSessionMode,
  type CartridgeGameConfigContext,
  type GameTerminalOutcome,
  type InputActionId,
  type RuntimeEdition,
} from "@reading-advantage/advantage-play-kit";
import type { StandardExperienceCartridge } from "@reading-advantage/advantage-play-kit/presentation";

import { createCartridgeStandardExperience } from "./standard-experience.js";
import {
  createFlightParallax,
  destroyFlightParallax,
  preloadFlightParallax,
  tickFlightParallax,
  type FlightParallaxLayers,
} from "./flight-parallax.js";

/** Canonical world size used by Griffin Sky-Joust before host scaling. */
export const GRIFFIN_SKY_JOUST_CANVAS = Object.freeze({ width: 960, height: 540 });

/** Keyboard bindings for aerial movement and flap input. */
export const GRIFFIN_SKY_JOUST_KEYBOARD_BINDINGS: Readonly<Record<string, InputActionId>> = Object.freeze({
  ArrowUp: "move-up",
  KeyW: "move-up",
  Space: "move-up",
  ArrowLeft: "move-left",
  KeyA: "move-left",
  ArrowRight: "move-right",
  KeyD: "move-right",
});

/** Damage immunity duration after one accepted collision. */
export const GRIFFIN_SKY_JOUST_INVULNERABILITY_MS = 1_500;

/** Starting health for one Griffin Sky-Joust session. */
export const GRIFFIN_SKY_JOUST_MAX_HEALTH = 3;

/** Maximum simulation delta accepted from one host frame. */
export const GRIFFIN_SKY_JOUST_MAX_FRAME_DELTA_MS = 250;

/** Maximum sentence words shown as moving knights at one time. */
export const GRIFFIN_SKY_JOUST_MAX_ACTIVE_KNIGHTS = 8;

/** Duration that shows one completed sentence before the next wave. */
export const GRIFFIN_SKY_JOUST_SENTENCE_TRANSITION_MS = 900;

/** Semantic actions shared by keyboard, pointer, touch, and test hosts. */
export const GRIFFIN_SKY_JOUST_AVAILABLE_ACTIONS = Object.freeze([
  "move-left",
  "move-right",
  "move-up",
  "confirm",
] as const satisfies readonly InputActionId[]);

/** Horizontal direction used by flap and drift input. */
export type GriffinSkyJoustDirection = -1 | 0 | 1;

/** Active, transition, or terminal phase in one Griffin Sky-Joust session. */
export type GriffinSkyJoustPhase = "playing" | "transition" | "victory" | "defeat";

/** Collision class used by the aerial combat rules. */
export type GriffinSkyJoustCollisionClass = "top-strike" | "side-below";

/** Immutable griffin physics and health state. */
export interface GriffinSkyJoustPlayer {
  /** Horizontal world position. */
  readonly x: number;
  /** Vertical world position. */
  readonly y: number;
  /** Horizontal velocity in world units per second. */
  readonly vx: number;
  /** Vertical velocity in world units per second. */
  readonly vy: number;
  /** Current health. */
  readonly hp: number;
  /** Maximum health. */
  readonly maxHp: number;
  /** Game time until which damage is ignored. */
  readonly invulnerableUntil: number;
  /** Collision radius. */
  readonly radius: number;
}

/** Immutable moving knight carrying one ordered sentence word. */
export interface GriffinSkyJoustKnight {
  /** Stable target identity. */
  readonly id: string;
  /** Word displayed on the knight. */
  readonly word: string;
  /** Zero-based ordered word position. */
  readonly wordIndex: number;
  /** Zero-based source sentence position. */
  readonly sentenceIndex: number;
  /** Zero-based word position within the source sentence. */
  readonly sentenceWordIndex: number;
  /** Horizontal world position. */
  readonly x: number;
  /** Vertical world position. */
  readonly y: number;
  /** Horizontal velocity in world units per second. */
  readonly vx: number;
  /** Vertical velocity in world units per second. */
  readonly vy: number;
  /** Collision radius. */
  readonly radius: number;
}

/** Immutable state captured for rendering, tests, and responsive transitions. */
export interface GriffinSkyJoustSnapshot {
  /** Deterministic host session seed. */
  readonly seed: number;
  /** Active, transition, or terminal session phase. */
  readonly phase: GriffinSkyJoustPhase;
  /** Index of the next ordered word. */
  readonly targetIndex: number;
  /** Number of words across all finite sentence entries. */
  readonly targetCount: number;
  /** Zero-based sentence position for the next ordered word. */
  readonly activeSentenceIndex: number;
  /** Source sentence shown during a completed-wave transition. */
  readonly completedSentence: string;
  /** Game time when the next sentence wave starts. */
  readonly transitionEndsAt: number;
  /** Current sentence translation prompt. */
  readonly prompt: string;
  /** Current ordered word to strike. */
  readonly targetWord: string;
  /** Current ordered word expected by the shared learning contract. */
  readonly answer: string;
  /** Semantic action that advances the aerial mechanic. */
  readonly correctAction: InputActionId;
  /** Semantic actions accepted by this controller. */
  readonly availableActions: readonly InputActionId[];
  /** Griffin physics and health. */
  readonly player: GriffinSkyJoustPlayer;
  /** Remaining moving word knights. */
  readonly knights: readonly GriffinSkyJoustKnight[];
  /** Current game time in milliseconds. */
  readonly gameTime: number;
  /** Current score. */
  readonly score: number;
  /** Current health represented as shared contract lives. */
  readonly lives: number;
  /** Current health represented as shared contract energy. */
  readonly energy: number;
  /** Correct top strikes. */
  readonly correctAnswers: number;
  /** Top-strike learning attempts. */
  readonly totalAttempts: number;
  /** Most recent collision outcome. */
  readonly lastOutcome: "correct" | "incorrect" | "damage" | undefined;
  /** First terminal result, when the session has ended. */
  readonly result?: GameResults;
  /** Whether the scene has permanently released this session. */
  readonly destroyed: boolean;
}

/** Result returned after one aerial action or collision. */
export interface GriffinSkyJoustActionResult {
  /** Whether the action changed the session. */
  readonly accepted: boolean;
  /** Whether the action was a correct top strike. */
  readonly correct: boolean;
  /** Whether the ordered target advanced. */
  readonly progressed: boolean;
  /** Whether one health point was lost. */
  readonly damaged: boolean;
  /** Whether the session is terminal after this action. */
  readonly terminal: boolean;
  /** Compatibility alias for a terminal action. */
  readonly completed: boolean;
  /** Collision class when the action checked a knight. */
  readonly collision?: GriffinSkyJoustCollisionClass;
  /** Explicit terminal outcome, when this action ends the session. */
  readonly outcome?: GameTerminalOutcome;
  /** Terminal result emitted by this action, if any. */
  readonly result?: GameResults;
  /** State after the action. */
  readonly snapshot: GriffinSkyJoustSnapshot;
}

/** Transport-independent Griffin Sky-Joust rules and lifecycle controls. */
export interface GriffinSkyJoustController {
  /** Returns the current immutable session state. */
  snapshot(): GriffinSkyJoustSnapshot;
  /** Applies a flap impulse and optional horizontal direction. */
  flap(direction?: GriffinSkyJoustDirection): GriffinSkyJoustActionResult;
  /** Applies horizontal drift acceleration. */
  drift(direction: -1 | 1): GriffinSkyJoustActionResult;
  /** Advances bounded aerial physics and collision detection. */
  tick(deltaMs: number): GriffinSkyJoustSnapshot;
  /** Resolves the physical collision with one knight. */
  collide(knightId: string): GriffinSkyJoustActionResult;
  /** Alias for collision resolution used by deterministic hosts. */
  resolveCollision(knightId: string): GriffinSkyJoustActionResult;
  /** Applies one deterministic aerial hazard without changing the target. */
  applyHazard(): GriffinSkyJoustActionResult;
  /** Maps a normalized action to movement without recreating a choice menu. */
  choose(action: InputActionId): GriffinSkyJoustActionResult;
  /** Runs one tutorial strike through the real top-strike collision rules. */
  demonstrate(correct: boolean): GriffinSkyJoustActionResult;
  /** Captures all gameplay state needed for responsive recomposition. */
  capture(): GriffinSkyJoustSnapshot;
  /** Restores validated state captured before responsive recomposition. */
  restore(snapshot: GriffinSkyJoustSnapshot): void;
  /** Permanently seals the session and prevents later completion delivery. */
  destroy(): void;
}

/** Optional deterministic setup for physics tests and replay tooling. */
export interface GriffinSkyJoustControllerOptions {
  /** Deterministic host seed for all knight placements. */
  readonly seed?: number;
  /** Optional deterministic source used to derive a placement seed. */
  readonly rng?: () => number;
  /** Optional starting health for bounded test sessions. */
  readonly maxHealth?: number;
  /** Enables a one-word tutorial decoy knight for the incorrect demonstration. */
  readonly tutorialOnly?: boolean;
}

interface GriffinSkyJoustTarget {
  readonly id: string;
  readonly word: string;
  readonly prompt: string;
  readonly sentence: string;
  readonly sentenceIndex: number;
  readonly sentenceWordIndex: number;
}

interface GriffinSkyJoustSceneContext {
  readonly edition: RuntimeEdition;
  readonly controller: GriffinSkyJoustController;
  readonly inputController: APKInputController;
  readonly composition: CartridgeGameConfigContext["composition"];
  readonly sessionMode: APKSessionMode;
}

interface PhaserGraphicsLike {
  clear(): this;
  fillStyle(color: number, alpha?: number): this;
  fillRect(x: number, y: number, width: number, height: number): this;
  fillCircle(x: number, y: number, radius: number): this;
  fillTriangle(x0: number, y0: number, x1: number, y1: number, x2: number, y2: number): this;
  fillRoundedRect(x: number, y: number, width: number, height: number, radius?: number): this;
  lineStyle(lineWidth: number, color: number, alpha?: number): this;
  strokeRoundedRect(x: number, y: number, width: number, height: number, radius?: number): this;
  destroy(): void;
}

interface PhaserTextLike {
  setPosition(x: number, y: number): this;
  setText(value: string): this;
  setFontSize?(value: number): this;
  setBackgroundColor?(value: string): this;
  setPadding?(left: number, top: number, right?: number, bottom?: number): this;
  setOrigin?(x: number, y?: number): this;
  setVisible?(value: boolean): this;
  setWordWrapWidth?(width: number, useAdvancedWrap?: boolean): this;
  getBounds?(): { readonly width: number };
  readonly width?: number;
  destroy(): void;
}

interface PhaserImageLike {
  setOrigin?(x: number, y: number): this;
  setDisplaySize?(width: number, height: number): this;
  setDepth?(depth: number): this;
  setPosition?(x: number, y: number): this;
  setAlpha?(alpha: number): this;
  setTilePosition?(x: number, y: number): this;
  tilePositionY?: number;
  destroy(): void;
}

interface PhaserSceneLike {
  add?: {
    graphics(): PhaserGraphicsLike;
    text(x: number, y: number, value: string, style?: Readonly<Record<string, unknown>>): PhaserTextLike;
    image?(x: number, y: number, key: string, frame?: number): ActorSpriteLike & PhaserImageLike;
    sprite?(x: number, y: number, key: string, frame?: number): ActorSpriteLike & PhaserImageLike;
    tileSprite?(x: number, y: number, width: number, height: number, key: string): ActorSpriteLike & PhaserImageLike;
  };
  load?: {
    image?(key: string, url: string): unknown;
    spritesheet?(key: string, url: string, config: { frameWidth: number; frameHeight: number }): unknown;
    audio?(key: string, urls: string | string[]): unknown;
  };
  events?: { once(event: string, listener: () => void): void };
  game?: { readonly canvas?: { getBoundingClientRect?(): { readonly left: number; readonly width: number } } };
  scale?: { readonly width?: number; readonly height?: number };
}

interface GriffinSkyJoustSceneResources {
  readonly art: ActorSpriteLayer;
  readonly graphics: PhaserGraphicsLike;
  readonly title: PhaserTextLike;
  readonly prompt: PhaserTextLike;
  readonly progress: PhaserTextLike;
  readonly feedback: PhaserTextLike;
  readonly instructions: PhaserTextLike;
  readonly knightLabels: readonly PhaserTextLike[];
  ground?: PhaserImageLike;
  griffin?: PhaserImageLike;
  knightSprites: Map<string, PhaserImageLike>;
  groundWidth: number;
  groundHeight: number;
}

const TUTORIAL_DECOY_ID = "knight:tutorial-decoy";
const PHYSICS = Object.freeze({
  gravity: 800,
  flapImpulse: -350,
  driftAcceleration: 180,
  maxHorizontalVelocity: 280,
  horizontalDamping: 0.98,
  maxVerticalVelocity: 600,
  playerRadius: 24,
  knightRadius: 28,
  knightSpeed: 90,
  damageKnockbackX: 200,
  damageKnockback: -220,
  topMargin: 64,
  bottomMargin: 32,
});

function finiteSeed(value: number): number {
  if (!Number.isFinite(value)) throw new Error("Griffin Sky-Joust seed must be finite");
  return Math.abs(Math.trunc(value)) % 2_147_483_647;
}

function hashUnit(seed: number, index: number, salt: number): number {
  let value = (seed + index * 48_271 + salt * 7_919) % 2_147_483_647;
  value = (value * 48_271) % 2_147_483_647;
  return value / 2_147_483_647;
}

function seedFromOptions(options: GriffinSkyJoustControllerOptions): number {
  if (options.seed !== undefined) return finiteSeed(options.seed);
  if (options.rng === undefined) return 0;
  const value = options.rng();
  return finiteSeed((Number.isFinite(value) ? value : 0.5) * 1_000_000);
}

function freezePlayer(player: GriffinSkyJoustPlayer): GriffinSkyJoustPlayer {
  return Object.freeze({ ...player });
}

function freezeKnight(knight: GriffinSkyJoustKnight): GriffinSkyJoustKnight {
  return Object.freeze({ ...knight });
}

function distanceBetween(
  first: Pick<GriffinSkyJoustPlayer, "x" | "y">,
  second: Pick<GriffinSkyJoustKnight, "x" | "y">,
): number {
  return Math.hypot(first.x - second.x, first.y - second.y);
}

/**
 * Classifies an overlapping griffin and knight by their vertical relationship.
 * @param player Griffin position and collision radius.
 * @param knight Knight position and collision radius.
 * @returns Top strike when the griffin is above the knight; otherwise side or below.
 */
export function classifyGriffinSkyJoustCollision(
  player: Pick<GriffinSkyJoustPlayer, "x" | "y" | "radius">,
  knight: Pick<GriffinSkyJoustKnight, "x" | "y" | "radius">,
): GriffinSkyJoustCollisionClass {
  return player.y < knight.y - knight.radius * 0.5 ? "top-strike" : "side-below";
}

function buildTargets(input: unknown): readonly GriffinSkyJoustTarget[] {
  const parsed = sentenceInputSchema.parse(input);
  const content = validateNonEmptyContent(parsed, "sentence");
  const targets: GriffinSkyJoustTarget[] = [];

  content.items.forEach((item, sentenceIndex) => {
    item.term.trim().split(/\s+/u).forEach((word, wordIndex) => {
      targets.push(Object.freeze({
        id: `knight:${sentenceIndex}:${wordIndex}`,
        word,
        prompt: item.translation,
        sentence: item.term.trim(),
        sentenceIndex,
        sentenceWordIndex: wordIndex,
      }));
    });
  });

  if (targets.length === 0) throw new Error("Griffin Sky-Joust requires at least one sentence word");
  return Object.freeze(targets);
}

function actionResult(
  snapshot: GriffinSkyJoustSnapshot,
  values: Omit<GriffinSkyJoustActionResult, "snapshot">,
): GriffinSkyJoustActionResult {
  return Object.freeze({ ...values, snapshot });
}

function noAction(snapshot: GriffinSkyJoustSnapshot): GriffinSkyJoustActionResult {
  const terminal = snapshot.phase === "victory" || snapshot.phase === "defeat";
  return actionResult(snapshot, {
    accepted: false,
    correct: false,
    progressed: false,
    damaged: false,
    terminal,
    completed: terminal,
    ...(snapshot.result === undefined ? {} : { result: snapshot.result }),
  });
}

function finiteNumber(value: number, label: string): void {
  if (!Number.isFinite(value)) throw new Error(`${label} must be finite`);
}

function positiveInteger(value: number, label: string): number {
  if (!Number.isInteger(value) || value <= 0) throw new Error(`${label} must be a positive integer`);
  return value;
}

/**
 * Creates transport-independent Griffin Sky-Joust physics and learning rules.
 * @param input Strict finite sentence content whose words become ordered knights.
 * @param deliver Callback that receives the first validated terminal result.
 * @param options Optional deterministic setup values.
 * @returns A controller that owns physics, learning progress, health, and cleanup.
 * @throws When sentence content or controller options are invalid.
 */
export function createGriffinSkyJoustController(
  input: unknown,
  deliver: (result: GameResults, outcome: GameTerminalOutcome) => void | Promise<void>,
  options: GriffinSkyJoustControllerOptions = {},
): GriffinSkyJoustController {
  const targets = buildTargets(input);
  const seed = seedFromOptions(options);
  const tutorialOnly = options.tutorialOnly === true;
  const maxHealth = positiveInteger(options.maxHealth ?? GRIFFIN_SKY_JOUST_MAX_HEALTH, "Griffin health");
  const startingPlayer: GriffinSkyJoustPlayer = {
    x: GRIFFIN_SKY_JOUST_CANVAS.width / 2,
    y: GRIFFIN_SKY_JOUST_CANVAS.height - 120,
    vx: 0,
    vy: 0,
    hp: maxHealth,
    maxHp: maxHealth,
    invulnerableUntil: 0,
    radius: PHYSICS.playerRadius,
  };
  const createKnight = (target: GriffinSkyJoustTarget, index: number): GriffinSkyJoustKnight => ({
    id: target.id,
    word: target.word,
    wordIndex: index,
    sentenceIndex: target.sentenceIndex,
    sentenceWordIndex: target.sentenceWordIndex,
    x: 120 + hashUnit(seed, index, 1) * (GRIFFIN_SKY_JOUST_CANVAS.width - 240),
    y: 160 + hashUnit(seed, index, 2) * 180,
    vx: hashUnit(seed, index, 3) > 0.5 ? PHYSICS.knightSpeed : -PHYSICS.knightSpeed,
    vy: 0,
    radius: PHYSICS.knightRadius,
  });
  const knightsForTarget = (index: number): GriffinSkyJoustKnight[] => {
    const sentenceIndex = targets[index]?.sentenceIndex;
    if (sentenceIndex === undefined) return [];
    const end = Math.min(targets.length, index + GRIFFIN_SKY_JOUST_MAX_ACTIVE_KNIGHTS);
    const activeKnights: GriffinSkyJoustKnight[] = [];
    for (let knightIndex = index; knightIndex < end; knightIndex += 1) {
      const target = targets[knightIndex]!;
      if (target.sentenceIndex !== sentenceIndex) break;
      activeKnights.push(createKnight(target, knightIndex));
    }
    return activeKnights;
  };
  let terminalOutcome: GameTerminalOutcome = "complete";
  const completion = createCompletionLatch<GameResults>((result) => deliver(result, terminalOutcome));
  let accountant = createResultAccountant();
  let player = startingPlayer;
  let knights = knightsForTarget(0);
  let phase: GriffinSkyJoustPhase = "playing";
  let targetIndex = 0;
  let gameTime = 0;
  let lastOutcome: GriffinSkyJoustSnapshot["lastOutcome"];
  let terminalResult: GameResults | undefined;
  let destroyed = false;
  let completedSentence = "";
  let transitionEndsAt = 0;

  const currentTarget = (): GriffinSkyJoustTarget => targets[Math.min(targetIndex, targets.length - 1)]!;

  const snapshot = (): GriffinSkyJoustSnapshot => {
    const target = phase === "victory" ? undefined : currentTarget();
    return Object.freeze({
      seed,
      phase,
      targetIndex,
      targetCount: targets.length,
      activeSentenceIndex: currentTarget().sentenceIndex,
      completedSentence,
      transitionEndsAt,
      prompt: target?.prompt ?? "",
      targetWord: target?.word ?? "",
      answer: target?.word ?? "",
      correctAction: "move-up",
      availableActions: GRIFFIN_SKY_JOUST_AVAILABLE_ACTIONS,
      player: freezePlayer(player),
      knights: Object.freeze(knights.map(freezeKnight)),
      gameTime,
      score: accountant.score,
      lives: player.hp,
      energy: player.hp,
      correctAnswers: accountant.correctAnswers,
      totalAttempts: accountant.totalAttempts,
      lastOutcome,
      result: terminalResult,
      destroyed,
    });
  };

  const resultForCurrentCounters = (): GameResults => {
    const accounted = finalizeResult(accountant, {
      xpPerCorrect: 1,
      xpPerAccuracyPoint: 0,
      xpCap: 10,
    });
    const survivalBonus = player.hp / player.maxHp >= 0.5 ? 2 : 0;
    const accuracyBonus = accounted.totalAttempts > 0 && accounted.accuracy === 1 ? 2 : 0;
    return gameResultsSchema.parse({
      ...accounted,
      xp: Math.min(10, accounted.xp + survivalBonus + accuracyBonus),
    });
  };

  const complete = (nextPhase: "victory" | "defeat"): GameResults => {
    phase = nextPhase;
    terminalOutcome = nextPhase;
    terminalResult = resultForCurrentCounters();
    completion.complete(terminalResult);
    return terminalResult;
  };

  const damaged = (knight?: GriffinSkyJoustKnight): GameResults | undefined => {
    const knockbackDirection = knight === undefined || player.x >= knight.x ? 1 : -1;
    player = {
      ...player,
      hp: Math.max(0, player.hp - 1),
      vx: knockbackDirection * PHYSICS.damageKnockbackX,
      vy: PHYSICS.damageKnockback,
      invulnerableUntil: gameTime + GRIFFIN_SKY_JOUST_INVULNERABILITY_MS,
    };
    if (player.hp === 0) return complete("defeat");
    return undefined;
  };

  const validateRestoredState = (state: GriffinSkyJoustSnapshot): void => {
    if (state === null || typeof state !== "object") throw new Error("Griffin responsive state must be an object");
    if (state.seed !== seed) throw new Error("Griffin responsive state seed is invalid");
    if (state.player === null || typeof state.player !== "object" || !Array.isArray(state.knights) || !Array.isArray(state.availableActions)) {
      throw new Error("Griffin responsive state shape is invalid");
    }
    if (!(["playing", "transition", "victory", "defeat"] as const).includes(state.phase)) {
      throw new Error("Griffin responsive state phase is invalid");
    }
    if (state.targetCount !== targets.length || !Number.isInteger(state.targetIndex) || state.targetIndex < 0 || state.targetIndex > targets.length) {
      throw new Error("Griffin responsive state target progress is invalid");
    }
    if (!Number.isInteger(state.score) || state.score < 0 || state.score !== state.correctAnswers * 100) {
      throw new Error("Griffin responsive state score is invalid");
    }
    if (!Number.isInteger(state.correctAnswers) || state.correctAnswers < 0 || state.correctAnswers > state.totalAttempts || state.correctAnswers > state.targetIndex) {
      throw new Error("Griffin responsive state correct counter is invalid");
    }
    if (!Number.isInteger(state.totalAttempts) || state.totalAttempts < 0) throw new Error("Griffin responsive state attempt counter is invalid");
    if (!Number.isInteger(state.player.hp) || state.player.hp < 0 || state.player.hp > state.player.maxHp || state.player.maxHp !== maxHealth) {
      throw new Error("Griffin responsive state health is invalid");
    }
    if ((state.phase === "playing" || state.phase === "transition") && (state.targetIndex === targets.length || state.player.hp === 0)) {
      throw new Error("Griffin responsive state is terminal but marked playing");
    }
    if (state.phase === "victory" && state.targetIndex !== targets.length) {
      throw new Error("Griffin victory state has unfinished words");
    }
    if (state.phase === "defeat" && state.player.hp !== 0) throw new Error("Griffin defeat state has health remaining");
    if (completion.hasCompleted && state.phase === "playing") throw new Error("Griffin cannot restore active state after completion");
    finiteNumber(state.gameTime, "Griffin responsive state game time");
    if (state.gameTime < 0) throw new Error("Griffin responsive state game time is negative");
    finiteNumber(state.player.x, "Griffin player x");
    finiteNumber(state.player.y, "Griffin player y");
    finiteNumber(state.player.vx, "Griffin player vx");
    finiteNumber(state.player.vy, "Griffin player vy");
    finiteNumber(state.player.invulnerableUntil, "Griffin player invulnerability time");
    if (state.player.x < 0 || state.player.x >= GRIFFIN_SKY_JOUST_CANVAS.width
      || state.player.y < PHYSICS.topMargin || state.player.y > GRIFFIN_SKY_JOUST_CANVAS.height - PHYSICS.bottomMargin
      || Math.abs(state.player.vx) > PHYSICS.maxHorizontalVelocity
      || state.player.vy < PHYSICS.flapImpulse || state.player.vy > PHYSICS.maxVerticalVelocity
      || state.player.invulnerableUntil < 0 || state.player.radius !== PHYSICS.playerRadius) {
      throw new Error("Griffin responsive player geometry is invalid");
    }
    const target = state.phase === "victory" ? undefined : targets[state.targetIndex];
    if (state.targetWord !== (target?.word ?? "") || state.answer !== (target?.word ?? "") || state.prompt !== (target?.prompt ?? "")) {
      throw new Error("Griffin responsive state target content is invalid");
    }
    const restoredTarget = targets[Math.min(state.targetIndex, targets.length - 1)]!;
    if (state.activeSentenceIndex !== restoredTarget.sentenceIndex || typeof state.completedSentence !== "string") {
      throw new Error("Griffin responsive state sentence progress is invalid");
    }
    finiteNumber(state.transitionEndsAt, "Griffin transition end time");
    if (state.phase === "transition") {
      if (state.knights.length !== 0 || state.completedSentence.length === 0 || state.transitionEndsAt <= state.gameTime) {
        throw new Error("Griffin responsive transition state is invalid");
      }
    } else if (state.completedSentence !== "" || state.transitionEndsAt !== 0) {
      throw new Error("Griffin responsive state has stale transition content");
    }
    if (state.correctAction !== "move-up" || state.availableActions.join(",") !== GRIFFIN_SKY_JOUST_AVAILABLE_ACTIONS.join(",")) {
      throw new Error("Griffin responsive action contract is invalid");
    }
    if (typeof state.destroyed !== "boolean") throw new Error("Griffin responsive state destroyed flag is invalid");
    if (state.lives !== state.player.hp || state.energy !== state.player.hp) throw new Error("Griffin responsive shared resources are invalid");
    if (state.lastOutcome !== undefined && !["correct", "incorrect", "damage"].includes(state.lastOutcome)) {
      throw new Error("Griffin responsive outcome is invalid");
    }
    const expectedKnights = state.phase === "playing" || state.phase === "defeat" ? knightsForTarget(state.targetIndex) : [];
    const contentKnights = state.knights.filter((knight) => knight.id !== TUTORIAL_DECOY_ID);
    const decoyKnights = state.knights.filter((knight) => knight.id === TUTORIAL_DECOY_ID);
    if ((!tutorialOnly && decoyKnights.length > 0) || decoyKnights.length > 1) {
      throw new Error("Griffin responsive state has an invalid knight identity");
    }
    if (contentKnights.length !== expectedKnights.length) throw new Error("Griffin responsive state has an invalid knight count");
    const ids = new Set<string>();
    const validateKnightGeometry = (knight: GriffinSkyJoustKnight): void => {
      if (knight.radius !== PHYSICS.knightRadius || Math.abs(knight.vx) !== PHYSICS.knightSpeed || knight.vy !== 0) {
        throw new Error("Griffin responsive state knight geometry is invalid");
      }
      if (!Number.isFinite(knight.x) || !Number.isFinite(knight.y)
        || knight.x < knight.radius || knight.x > GRIFFIN_SKY_JOUST_CANVAS.width - knight.radius
        || knight.y < PHYSICS.topMargin || knight.y > GRIFFIN_SKY_JOUST_CANVAS.height - PHYSICS.bottomMargin) {
        throw new Error("Griffin responsive state knight position is invalid");
      }
    };
    for (const [index, knight] of contentKnights.entries()) {
      const target = targets.find((candidate) => candidate.id === knight.id);
      const expectedTarget = expectedKnights[index];
      if (ids.has(knight.id) || !target || !expectedTarget || target.word !== knight.word || target.id !== knight.id
        || knight.id !== expectedTarget.id || knight.wordIndex !== expectedTarget.wordIndex
        || knight.sentenceIndex !== expectedTarget.sentenceIndex
        || knight.sentenceWordIndex !== expectedTarget.sentenceWordIndex) {
        throw new Error("Griffin responsive state has an invalid knight identity");
      }
      ids.add(knight.id);
      validateKnightGeometry(knight);
    }
    for (const decoy of decoyKnights) {
      if (ids.has(decoy.id) || decoy.word !== (targets[0]?.word ?? "") || decoy.wordIndex !== -1) {
        throw new Error("Griffin responsive state has an invalid knight identity");
      }
      ids.add(decoy.id);
      validateKnightGeometry(decoy);
    }
    if ((state.phase === "playing" || state.phase === "transition") && state.result !== undefined) {
      throw new Error("Griffin active state has a terminal result");
    }
    if ((state.phase === "victory" || state.phase === "defeat") && state.result === undefined) {
      throw new Error("Griffin terminal state has no result");
    }
    if (state.result !== undefined) {
      const parsedResult = gameResultsSchema.parse(state.result);
      const accuracy = state.totalAttempts === 0 ? 0 : state.correctAnswers / state.totalAttempts;
      const xp = Math.min(10, state.correctAnswers + (state.player.hp / maxHealth >= 0.5 ? 2 : 0) + (state.totalAttempts > 0 && accuracy === 1 ? 2 : 0));
      if (parsedResult.correctAnswers !== state.correctAnswers || parsedResult.totalAttempts !== state.totalAttempts
        || parsedResult.accuracy !== accuracy || parsedResult.score !== state.score || parsedResult.xp !== xp) {
        throw new Error("Griffin responsive terminal result is inconsistent");
      }
      if (completion.hasCompleted && terminalResult !== undefined && parsedResult.score !== terminalResult.score) {
        throw new Error("Griffin responsive completion result is incompatible");
      }
    }
  };

  const restore = (state: GriffinSkyJoustSnapshot): void => {
    if (destroyed) return;
    validateRestoredState(state);
    player = { ...state.player };
    knights = state.knights.map((knight) => ({ ...knight }));
    phase = state.phase;
    targetIndex = state.targetIndex;
    gameTime = state.gameTime;
    lastOutcome = state.lastOutcome;
    terminalResult = state.result;
    completedSentence = state.completedSentence;
    transitionEndsAt = state.transitionEndsAt;
    accountant = createResultAccountant();
    for (let index = 0; index < state.totalAttempts; index += 1) {
      accountant.recordAttempt({ correct: index < state.correctAnswers });
    }
    accountant.addScore(state.score);
    destroyed = state.destroyed;
    terminalOutcome = phase === "defeat" ? "defeat" : phase === "victory" ? "victory" : "complete";
    if (destroyed || phase === "victory" || phase === "defeat") completion.sealWithoutDelivery();
  };

  const motionResult = (): GriffinSkyJoustActionResult => actionResult(snapshot(), {
    accepted: true,
    correct: false,
    progressed: false,
    damaged: false,
    terminal: false,
    completed: false,
  });

  const flap = (direction: GriffinSkyJoustDirection = 0): GriffinSkyJoustActionResult => {
    if (destroyed || phase !== "playing" || ![-1, 0, 1].includes(direction)) return noAction(snapshot());
    player = {
      ...player,
      vy: PHYSICS.flapImpulse,
      vx: direction === 0
        ? player.vx
        : direction * PHYSICS.driftAcceleration,
    };
    return motionResult();
  };

  const drift = (direction: -1 | 1): GriffinSkyJoustActionResult => {
    if (destroyed || phase !== "playing") return noAction(snapshot());
    player = {
      ...player,
      vx: direction * PHYSICS.driftAcceleration,
    };
    return motionResult();
  };

  const collide = (knightId: string): GriffinSkyJoustActionResult => {
    const before = snapshot();
    if (destroyed || phase !== "playing") return noAction(before);
    const knight = knights.find((candidate) => candidate.id === knightId);
    if (!knight || gameTime < player.invulnerableUntil) return noAction(before);
    if (distanceBetween(player, knight) > player.radius + knight.radius) return noAction(before);

    const collision = classifyGriffinSkyJoustCollision(player, knight);
    const correct = collision === "top-strike" && knight.wordIndex === targetIndex;
    if (correct) {
      accountant.recordAttempt({ correct: true });
      accountant.addScore(100);
      lastOutcome = "correct";
      knights = knights.filter((candidate) => candidate.id !== knightId);
      targetIndex += 1;
      if (targetIndex === targets.length) {
        const result = complete("victory");
        return actionResult(snapshot(), {
          accepted: true,
          correct: true,
          progressed: true,
          damaged: false,
          terminal: true,
          completed: true,
          collision,
          outcome: "victory",
          result,
        });
      }
      const completedTarget = targets[targetIndex - 1]!;
      const nextTarget = targets[targetIndex]!;
      if (nextTarget.sentenceIndex !== completedTarget.sentenceIndex) {
        phase = "transition";
        completedSentence = completedTarget.sentence;
        transitionEndsAt = gameTime + GRIFFIN_SKY_JOUST_SENTENCE_TRANSITION_MS;
        knights = [];
      } else {
        const remainingKnights = new Map(knights.map((candidate) => [candidate.id, candidate]));
        knights = knightsForTarget(targetIndex).map((candidate) => remainingKnights.get(candidate.id) ?? candidate);
      }
      return actionResult(snapshot(), {
        accepted: true,
        correct: true,
        progressed: true,
        damaged: false,
        terminal: false,
        completed: false,
        collision,
      });
    }

    if (collision === "top-strike") accountant.recordAttempt({ correct: false });
    lastOutcome = collision === "top-strike" ? "incorrect" : "damage";
    const result = damaged(knight);
    return actionResult(snapshot(), {
      accepted: true,
      correct: false,
      progressed: false,
      damaged: true,
      terminal: phase !== "playing",
      completed: phase !== "playing",
      collision,
      ...(result ? { outcome: "defeat" as const } : {}),
      ...(result ? { result } : {}),
    });
  };

  const tick = (deltaMs: number): GriffinSkyJoustSnapshot => {
    if (destroyed || (phase !== "playing" && phase !== "transition")) return snapshot();
    if (!Number.isFinite(deltaMs) || deltaMs < 0) throw new Error("Griffin tick requires a nonnegative finite delta");
    const boundedDeltaMs = Math.min(GRIFFIN_SKY_JOUST_MAX_FRAME_DELTA_MS, deltaMs);
    const deltaSeconds = boundedDeltaMs / 1000;
    gameTime += boundedDeltaMs;
    if (phase === "transition") {
      if (gameTime >= transitionEndsAt) {
        phase = "playing";
        completedSentence = "";
        transitionEndsAt = 0;
        knights = knightsForTarget(targetIndex);
      }
      return snapshot();
    }

    let nextX = player.x + player.vx * deltaSeconds;
    let nextY = player.y + player.vy * deltaSeconds;
    let nextVy = Math.min(PHYSICS.maxVerticalVelocity, player.vy + PHYSICS.gravity * deltaSeconds);
    nextX = ((nextX % GRIFFIN_SKY_JOUST_CANVAS.width) + GRIFFIN_SKY_JOUST_CANVAS.width)
      % GRIFFIN_SKY_JOUST_CANVAS.width;
    if (nextY < PHYSICS.topMargin) {
      nextY = PHYSICS.topMargin;
      nextVy = 0;
    }
    if (nextY > GRIFFIN_SKY_JOUST_CANVAS.height - PHYSICS.bottomMargin) {
      nextY = GRIFFIN_SKY_JOUST_CANVAS.height - PHYSICS.bottomMargin;
      nextVy = 0;
    }
    const damping = Math.pow(PHYSICS.horizontalDamping, boundedDeltaMs / 16.67);
    player = {
      ...player,
      x: nextX,
      y: nextY,
      vx: player.vx * damping,
      vy: nextVy,
    };
    knights = knights.map((knight) => {
      let nextKnightX = knight.x + knight.vx * deltaSeconds;
      let nextKnightVx = knight.vx;
      if (nextKnightX < knight.radius || nextKnightX > GRIFFIN_SKY_JOUST_CANVAS.width - knight.radius) {
        nextKnightVx = -nextKnightVx;
        nextKnightX = Math.max(knight.radius, Math.min(
          GRIFFIN_SKY_JOUST_CANVAS.width - knight.radius,
          knight.x + nextKnightVx * deltaSeconds,
        ));
      }
      return { ...knight, x: nextKnightX, vx: nextKnightVx };
    });

    const collision = knights.find((knight) => distanceBetween(player, knight) <= player.radius + knight.radius);
    if (collision) collide(collision.id);
    return snapshot();
  };

  const applyHazard = (): GriffinSkyJoustActionResult => {
    const before = snapshot();
    if (destroyed || phase !== "playing" || gameTime < player.invulnerableUntil) return noAction(before);
    lastOutcome = "damage";
    const result = damaged();
    return actionResult(snapshot(), {
      accepted: true,
      correct: false,
      progressed: false,
      damaged: true,
      terminal: phase !== "playing",
      completed: phase !== "playing",
      ...(result ? { outcome: "defeat" as const, result } : {}),
    });
  };

  const choose = (action: InputActionId): GriffinSkyJoustActionResult => {
    if (action === "move-up") return flap(0);
    if (action === "move-left") return drift(-1);
    if (action === "move-right") return drift(1);
    if (action === "confirm") {
      const target = knights.find((knight) => knight.wordIndex === targetIndex);
      return target ? collide(target.id) : noAction(snapshot());
    }
    return noAction(snapshot());
  };

  const spawnTutorialDecoy = (): GriffinSkyJoustKnight | undefined => {
    if (!tutorialOnly || targets.length !== 1) return undefined;
    const existing = knights.find((knight) => knight.id === TUTORIAL_DECOY_ID);
    if (existing) return existing;
    const target = knights.find((knight) => knight.wordIndex === targetIndex);
    const minX = PHYSICS.knightRadius;
    const maxX = GRIFFIN_SKY_JOUST_CANVAS.width - PHYSICS.knightRadius;
    const y = target === undefined
      ? 200
      : Math.max(PHYSICS.topMargin, Math.min(GRIFFIN_SKY_JOUST_CANVAS.height - PHYSICS.bottomMargin, target.y));
    const preferredX = target === undefined ? 200 : target.x + 160;
    const x = preferredX <= maxX ? Math.max(minX, preferredX) : Math.max(minX, (target?.x ?? 200) - 160);
    const decoy: GriffinSkyJoustKnight = {
      id: TUTORIAL_DECOY_ID,
      word: targets[0]!.word,
      wordIndex: -1,
      sentenceIndex: targets[0]!.sentenceIndex,
      sentenceWordIndex: -1,
      x,
      y,
      vx: PHYSICS.knightSpeed,
      vy: 0,
      radius: PHYSICS.knightRadius,
    };
    knights = [...knights, decoy];
    return decoy;
  };

  const demonstrate = (correct: boolean): GriffinSkyJoustActionResult => {
    if (destroyed || phase !== "playing") return noAction(snapshot());
    if (correct) knights = knights.filter((knight) => knight.id !== TUTORIAL_DECOY_ID);
    const currentTarget = knights.find((knight) => knight.wordIndex === targetIndex);
    const knight = correct
      ? currentTarget
      : knights.find((candidate) => candidate.wordIndex !== targetIndex) ?? spawnTutorialDecoy();
    if (!knight) return noAction(snapshot());
    if (gameTime < player.invulnerableUntil) gameTime = player.invulnerableUntil + 1;
    player = {
      ...player,
      x: knight.x,
      y: knight.y - knight.radius,
      invulnerableUntil: 0,
    };
    return collide(knight.id);
  };

  return Object.freeze({
    snapshot,
    flap,
    drift,
    tick,
    collide,
    resolveCollision: collide,
    applyHazard,
    choose,
    demonstrate,
    capture: snapshot,
    restore,
    destroy(): void {
      if (destroyed) return;
      destroyed = true;
      completion.sealWithoutDelivery();
    },
  });
}

function fileForBinding(
  edition: RuntimeEdition,
  key: string,
): { readonly width: number; readonly height: number; readonly grid?: { readonly frameWidth: number; readonly frameHeight: number } } | undefined {
  const binding = (edition as unknown as { bindings?: Record<string, { file: string }> })?.bindings?.[key];
  if (!binding) return undefined;
  return ((edition as unknown as { pack?: { files?: Record<string, { readonly width: number; readonly height: number; readonly grid?: { readonly frameWidth: number; readonly frameHeight: number } }> } })?.pack?.files as Record<string, { readonly width: number; readonly height: number; readonly grid?: { readonly frameWidth: number; readonly frameHeight: number } }> | undefined)?.[binding.file];
}

function destroyGround(resources: GriffinSkyJoustSceneResources): void {
  resources.ground?.destroy();
  resources.ground = undefined;
  resources.groundWidth = 0;
  resources.groundHeight = 0;
}

function ensureGround(
  scene: PhaserSceneLike,
  resources: GriffinSkyJoustSceneResources,
  edition: RuntimeEdition,
  width: number,
  height: number,
): void {
  if (resources.groundWidth === width && resources.groundHeight === height && resources.ground) return;
  destroyGround(resources);
  resources.groundWidth = width;
  resources.groundHeight = height;
  const binding = (edition as unknown as { bindings?: Record<string, unknown> })?.bindings?.["world:ground"];
  if (!binding) return;
  const resolved = resolveAssetBinding(edition, "world:ground");
  if (scene.add?.tileSprite) {
    const tiled = scene.add.tileSprite(0, 0, width, height, resolved.textureKey);
    tiled.setOrigin?.(0, 0);
    tiled.setDepth?.(-35);
    resources.ground = tiled;
  } else {
    const file = fileForBinding(edition, "world:ground");
    const displayW = width;
    const displayH = file ? displayW * (file.height / file.width) : height;
    const image = scene.add?.image?.(width / 2, height / 2, resolved.textureKey);
    image?.setOrigin?.(0.5, 0.5);
    if (file) image?.setDisplaySize?.(displayW, displayH);
    image?.setDepth?.(-35);
    if (image) resources.ground = image;
  }
}

function createScene(context: GriffinSkyJoustSceneContext): Readonly<Record<string, unknown>> {
  let resources: GriffinSkyJoustSceneResources | undefined;
  let composition = context.composition;
  let previousKeys = new Set<string>();
  let animationMs = 0;
  let parallax: FlightParallaxLayers = { sprites: [], scrollY: 0 };
  const normalize = createInputActionNormalizer({
    keyboard: GRIFFIN_SKY_JOUST_KEYBOARD_BINDINGS,
    pointerTap: { action: "move-up" },
  });
  const frameScheduler = createBoundedFrameScheduler((deltaMs) => {
    animationMs = (animationMs + deltaMs) % 2_000;
    if (context.sessionMode === "playing") context.controller.tick(deltaMs);
  });

  const dimensions = (scene: PhaserSceneLike): { width: number; height: number } => ({
    width: scene.scale?.width ?? GRIFFIN_SKY_JOUST_CANVAS.width,
    height: scene.scale?.height ?? GRIFFIN_SKY_JOUST_CANVAS.height,
  });

  const pointerDirection = (scene: PhaserSceneLike, clientX: number, width: number): GriffinSkyJoustDirection => {
    const rect = scene.game?.canvas?.getBoundingClientRect?.();
    const localX = rect && rect.width > 0
      ? (clientX - rect.left) * (width / rect.width)
      : clientX;
    if (localX < width * 0.45) return -1;
    if (localX > width * 0.55) return 1;
    return 0;
  };

  const updateView = (scene: PhaserSceneLike): void => {
    if (!resources) return;
    const activeResources = resources;
    const state = context.controller.snapshot();
    const { width, height } = dimensions(scene);
    const scaleX = width / GRIFFIN_SKY_JOUST_CANVAS.width;
    const scaleY = height / GRIFFIN_SKY_JOUST_CANVAS.height;
    const portrait = height >= 600 && height > width * 1.2;
    const portraitArenaTop = 148;
    const portraitArenaBottom = 16;
    const scale = portrait
      ? Math.max(scaleX, (height - portraitArenaTop - portraitArenaBottom) / GRIFFIN_SKY_JOUST_CANVAS.height)
      : Math.min(scaleX, scaleY);
    // The portrait camera crops the world with one scale, so visible actors match their circular collision bounds.
    const visibleWorldWidth = width / scale;
    const cameraX = portrait
      ? Math.max(
        visibleWorldWidth / 2,
        Math.min(GRIFFIN_SKY_JOUST_CANVAS.width - visibleWorldWidth / 2, state.player.x),
      )
      : GRIFFIN_SKY_JOUST_CANVAS.width / 2;
    const offsetX = portrait
      ? width / 2 - cameraX * scale
      : (width - GRIFFIN_SKY_JOUST_CANVAS.width * scale) / 2;
    const offsetY = portrait
      ? portraitArenaTop
      : (height - GRIFFIN_SKY_JOUST_CANVAS.height * scale) / 2;
    const worldX = (value: number): number => offsetX + value * scale;
    const worldY = (value: number): number => offsetY + value * scale;
    const displayWidth = scene.game?.canvas?.getBoundingClientRect?.().width ?? width;
    const displayScale = Math.max(0.1, displayWidth / width);
    const displayFontSize = (pixels: number): number => Math.ceil(pixels / displayScale);
    const pulse = Math.sin(animationMs / 2_000 * Math.PI * 2) * 3;

    activeResources.graphics.clear();
    if (parallax.sprites.length === 0) {
      try {
        const next = createFlightParallax(scene, context.edition, width, height, { includeNear: false });
        if (next.sprites.length > 0) {
          next.sprites.forEach((sprite) => sprite.setTileScale?.(3));
          parallax = next;
        }
      } catch {
        // Edition without parallax bindings (tests use {}), keep empty parallax.
      }
    }
    if (parallax.sprites.length === 0) {
      activeResources.graphics.fillStyle(0x6eb6e8, 0.9).fillRect(0, 0, width, height);
    }
    // Light sky ornament, not a full-screen opaque overlay.
    activeResources.graphics.fillStyle(0x8cd0f0, 0.35).fillCircle(worldX(110), worldY(90), 42 * scale);
    activeResources.graphics.fillStyle(0xa8ddf5, 0.28).fillCircle(worldX(830), worldY(140), 56 * scale);
    activeResources.graphics.fillStyle(0x123a5c, 0.88).fillRoundedRect(
      24, 40, Math.max(250, width - 48), 96, 18,
    );

    const place = (
      current: PhaserImageLike | undefined,
      x: number,
      y: number,
      bindingKey: string,
      textureKey: string,
      targetWidth: number,
      depth: number,
      alpha: number,
    ): PhaserImageLike | undefined => {
      const file = fileForBinding(context.edition, bindingKey);
      const fw = file?.grid?.frameWidth ?? file?.width;
      const fh = file?.grid?.frameHeight ?? file?.height;
      const displayW = targetWidth;
      const displayH = fw && fh ? displayW * (fh / fw) : targetWidth;
      const image = current
        ?? scene.add?.sprite?.(x, y, textureKey)
        ?? scene.add?.image?.(x, y, textureKey);
      image?.setOrigin?.(0.5, 0.5);
      image?.setPosition?.(x, y);
      image?.setDisplaySize?.(displayW, displayH);
      image?.setDepth?.(depth);
      image?.setAlpha?.(alpha);
      return image;
    };

    const griffinResolved = (context.edition as unknown as { bindings?: Record<string, unknown> })?.bindings?.["player:idle"] ? resolveAssetBinding(context.edition, "player:idle") : undefined;
    const knightResolved = (context.edition as unknown as { bindings?: Record<string, unknown> })?.bindings?.["enemy:idle"] ? resolveAssetBinding(context.edition, "enemy:idle") : undefined;

    const seenKnightIds = new Set<string>();
    state.knights.forEach((knight) => {
      const knightX = worldX(knight.x);
      const knightY = worldY(knight.y);
      const targetKnight = knight.wordIndex === state.targetIndex;
      seenKnightIds.add(knight.id);
      if (knightResolved) {
        const targetW = knight.radius * 2.6 * scale;
        const existing = activeResources.knightSprites.get(knight.id);
        const placed = place(existing, knightX, knightY, "enemy:idle", knightResolved.textureKey, targetW, 7, targetKnight ? 1 : 0.88);
        if (placed && !existing) activeResources.knightSprites.set(knight.id, placed);
        // Fallback handled via art layer if binding missing
        if (!placed) {
          activeResources.graphics.fillStyle(targetKnight ? 0xfbbf24 : 0x64748b, 1).fillCircle(knightX, knightY, knight.radius * scale);
        }
      } else if (!activeResources.art.place(`knight:${knight.wordIndex}`, "enemy:idle", {
        x: knightX,
        y: knightY,
        width: knight.radius * 2.6 * scale,
        depth: 7,
        alpha: targetKnight ? 1 : 0.85,
      })) {
        activeResources.graphics.fillStyle(targetKnight ? 0xfbbf24 : 0x64748b, 1)
          .fillCircle(knightX, knightY, knight.radius * scale);
      }
      const labelIndex = Math.max(0, state.knights.indexOf(knight));
      const label = activeResources.knightLabels[labelIndex];
      const labelY = knight.sentenceWordIndex % 2 === 0
        ? knightY + knight.radius * scale + 6
        : knightY - knight.radius * scale - displayFontSize(10);
      if (knightX < 0 || knightX > width) {
        label?.setVisible?.(false);
        label?.setText("");
        return;
      }
      label?.setFontSize?.(displayFontSize(16));
      label?.setBackgroundColor?.("rgba(15, 23, 42, 0.88)");
      label?.setPadding?.(displayFontSize(3), displayFontSize(2));
      label?.setOrigin?.(0.5, 0.5);
      label?.setWordWrapWidth?.(Math.max(1, width - 16), true);
      label?.setText(knight.word);
      label?.setVisible?.(true);
      const estimatedWidth = displayFontSize(16) * knight.word.length * 0.62 + displayFontSize(6);
      const labelWidth = Math.min(width - 16, label?.getBounds?.().width ?? label?.width ?? estimatedWidth);
      const labelX = Math.max(labelWidth / 2, Math.min(width - labelWidth / 2, knightX));
      label?.setPosition(labelX, labelY);
    });
    const targetKnight = state.knights.find((knight) => knight.wordIndex === state.targetIndex);
    if (portrait && targetKnight) {
      const targetX = worldX(targetKnight.x);
      if (targetX < 0 || targetX > width) {
        const markerX = targetX < 0 ? 12 : width - 12;
        const markerY = Math.max(portraitArenaTop + 18, Math.min(height - portraitArenaBottom - 18, worldY(targetKnight.y)));
        activeResources.graphics.fillStyle(0xfbbf24, 1);
        if (targetX < 0) activeResources.graphics.fillTriangle(markerX - 8, markerY, markerX + 8, markerY - 10, markerX + 8, markerY + 10);
        else activeResources.graphics.fillTriangle(markerX + 8, markerY, markerX - 8, markerY - 10, markerX - 8, markerY + 10);
      }
    }
    // Remove sprites for knights that left.
    for (const [id, sprite] of activeResources.knightSprites) {
      if (!seenKnightIds.has(id)) {
        sprite.destroy();
        activeResources.knightSprites.delete(id);
      }
    }
    activeResources.knightLabels.slice(state.knights.length).forEach((label) => {
      label.setText("");
      label.setVisible?.(false);
    });

    const playerX = worldX(state.player.x);
    const playerY = worldY(state.player.y) + pulse;
    const invulnerable = state.gameTime < state.player.invulnerableUntil;
    if (griffinResolved) {
      const targetW = state.player.radius * 2.8 * scale;
      // dragon-rider-idle 96x96 visible 96x69, aspect via frame size preserves undistorted mount.
      activeResources.griffin = place(activeResources.griffin, playerX, playerY, "player:idle", griffinResolved.textureKey, targetW, 8, invulnerable ? 0.6 : 1);
    } else if (!activeResources.art.place("player", "player:idle", {
      x: playerX,
      y: playerY,
      width: state.player.radius * 2.8 * scale,
      depth: 8,
      alpha: invulnerable ? 0.6 : 1,
    })) {
      activeResources.graphics.fillStyle(invulnerable ? 0xf8fafc : 0x38d9ff, 0.95)
        .fillCircle(playerX, playerY, state.player.radius * scale);
    }
    activeResources.art.sweep();

    activeResources.title.setText("").setPosition(36, 28);
    activeResources.prompt.setFontSize?.(displayFontSize(18));
    activeResources.prompt.setText(
      state.phase === "transition"
        ? state.completedSentence
        : state.prompt,
    ).setPosition(36, 66);
    activeResources.progress.setFontSize?.(displayFontSize(14));
    activeResources.progress.setText(
      `${Math.min(state.targetIndex + 1, state.targetCount)}/${state.targetCount}  ♥ ${state.player.hp}  ★ ${state.score}`,
    ).setPosition(36, 112);
    activeResources.feedback.setText("").setPosition(36, height - 62);
    activeResources.instructions.setText("").setPosition(36, height - 30);
  };

  const cleanup = (): void => {
    frameScheduler.cancel();
    context.controller.destroy();
    const activeResources = resources;
    if (!activeResources) return;
    resources = undefined;
    destroyFlightParallax(parallax);
    destroyGround(activeResources);
    activeResources.griffin?.destroy();
    for (const sprite of activeResources.knightSprites.values()) sprite.destroy();
    activeResources.knightSprites.clear();
    activeResources.graphics.destroy();
    activeResources.title.destroy();
    activeResources.prompt.destroy();
    activeResources.progress.destroy();
    activeResources.feedback.destroy();
    activeResources.instructions.destroy();
    activeResources.knightLabels.forEach((label) => label.destroy());
    previousKeys = new Set<string>();
  };


  const artKeys = ["player:idle", "enemy:idle", "world:parallax-far", "world:parallax-mid"] as const;

  const preload = function (this: PhaserSceneLike): void {
    if (!this.load) return;
    try { preloadFlightParallax(this, context.edition, { includeNear: false }); } catch { /* tests use empty edition */ }
    preloadAssetBindings(
      this.load,
      context.edition,
      artKeys.filter((key) => (context.edition as unknown as { bindings?: Record<string, unknown> })?.bindings?.[key]),
    );
  };

  const create = function (this: PhaserSceneLike): void {
    if (!this.add) throw new Error("Griffin Sky-Joust requires Phaser display services");
    const style = { fontFamily: "Arial", color: "#f8fbff", fontSize: "18px" };
    resources = {
      graphics: this.add.graphics(),
      art: createActorSpriteLayer(this, context.edition),
      title: this.add.text(0, 0, "", { ...style, fontSize: "28px", fontStyle: "bold" }),
      prompt: this.add.text(0, 0, "", { ...style, fontSize: "21px" }),
      progress: this.add.text(0, 0, "", { ...style, fontSize: "15px", color: "#bae6fd" }),
      feedback: this.add.text(0, 0, "", { ...style, fontSize: "17px", color: "#fde68a" }),
      instructions: this.add.text(0, 0, "", { ...style, fontSize: "14px", color: "#cbd5e1" }),
      knightLabels: Array.from({ length: context.controller.snapshot().targetCount }, () =>
        this.add!.text(0, 0, "", { ...style, fontSize: "17px", align: "center" })),
      knightSprites: new Map(),
      groundWidth: 0,
      groundHeight: 0,
    };
    this.events?.once("shutdown", cleanup);
    this.events?.once("destroy", cleanup);
    updateView(this);
  };

  const update = function (this: PhaserSceneLike, _time = 0, delta = 0): void {
    if (!resources) return;
    if (context.sessionMode === "playing") {
      const input = context.inputController.snapshot();
      const pressed = input.pressed ?? input.keys.filter((key) => !previousKeys.has(key));
      previousKeys = new Set(input.keys);
      pressed.forEach((code) => {
        const action = normalize({ modality: "keyboard", code })[0]?.action;
        if (action) context.controller.choose(action);
      });
      if (input.pointer.released && !input.pointer.cancelled) {
        const pointerAction = normalize({
          modality: "pointer",
          phase: "up",
          x: input.pointer.x,
          y: input.pointer.y,
        })[0]?.action;
        if (pointerAction === "move-up") {
          context.controller.choose(pointerAction);
          const direction = pointerDirection(this, input.pointer.x, dimensions(this).width);
          if (direction < 0) context.controller.choose("move-left");
          if (direction > 0) context.controller.choose("move-right");
        }
      }
    }
    frameScheduler.tick(delta);
    tickFlightParallax(parallax, delta);
    updateView(this);
  };

  return {
    key: "griffin-sky-joust",
    preload,
    create,
    update,
    extend: {
      apkCaptureResponsiveState: () => context.controller.capture(),
      apkRestoreResponsiveState: (state: unknown) => {
        if (typeof state !== "object" || state === null) throw new Error("Griffin responsive state is invalid");
        context.controller.restore(state as GriffinSkyJoustSnapshot);
      },
      apkRecompose: (nextComposition: GriffinSkyJoustSceneContext["composition"]) => {
        composition = nextComposition;
      },
    },
  };
}

/**
 * Creates the bespoke Griffin Sky-Joust Phaser cartridge.
 * @returns A standard lifecycle cartridge with native aerial physics.
 */
export function createGriffinSkyJoustCartridge(): StandardExperienceCartridge {
  let activeController: GriffinSkyJoustController | undefined;
  const standardExperience = createCartridgeStandardExperience({
    id: "griffin-sky-joust",
    title: "Griffin Sky-Joust",
    description: "Ride a griffin through the clouds and strike airborne word knights in sentence order.",
    inputMode: "sentence",
    objective: "Strike every ordered sentence word from above before the griffin loses its health.",
    mechanicInstruction: "Flap to control altitude, drift with A or D, and land on the highlighted word knight.",
    keyboardKeys: ["W", "Up Arrow", "Space", "A", "D"],
    executeTutorialAction: (actionId) => {
      const controller = activeController;
      if (!controller) return;
      controller.demonstrate(actionId === "action:select-correct");
    },
  });

  return {
    manifest: {
      id: "griffin-sky-joust",
      title: "Griffin Sky-Joust",
      description: "Ride a griffin through the clouds and strike airborne word knights in sentence order.",
      runtimeApiVersion: "1.0.0",
      inputMode: "sentence",
      requiredAssetBindings: ["griffin-sky-joust/player-griffin"],
      capabilities: [
        "capability:aerial-physics",
        "capability:moving-word-knights",
        "capability:collision-classification",
        "capability:bounded-frame-delta",
        "capability:input-action-normalization",
        "capability:language-target-progression",
        "capability:nonempty-content-precondition",
        "capability:result-accounting",
        "capability:single-completion-emission",
      ],
    },
    standardExperience,
    createGameConfig(context: CartridgeGameConfigContext): Readonly<Record<string, unknown>> {
      const input = sentenceInputSchema.parse(context.input);
      const sessionMode = context.sessionMode ?? "playing";
      const controller = createGriffinSkyJoustController(
        input,
        sessionMode === "playing" ? (result, outcome) => context.complete(result, outcome) : () => undefined,
        { seed: context.seed, tutorialOnly: sessionMode !== "playing" },
      );
      activeController = controller;
      context.diagnostic({
        level: "debug",
        code: "GRIFFIN_SKY_JOUST_READY",
        message: "Griffin Sky-Joust aerial physics are ready.",
        details: { editionId: context.edition.id, targetCount: controller.snapshot().targetCount },
      });
      return {
        width: GRIFFIN_SKY_JOUST_CANVAS.width,
        height: GRIFFIN_SKY_JOUST_CANVAS.height,
        render: { antialias: false, pixelArt: true },
        scene: createScene({
          controller,
          edition: context.edition,
          inputController: context.inputController,
          composition: context.composition,
          sessionMode,
        }),
      };
    },
  };
}
