import {
  gameResultsSchema,
  vocabularyInputSchema,
  type GameResults,
  type VocabularyItem,
} from "@reading-advantage/game-contracts";
import {
  advanceBody,
  createBoundedFrameScheduler,
  createCompletionLatch,
  createDeterministicSpawner,
  createGridNavigator,
  createInputActionNormalizer,
  createResultAccountant,
  finalizeResult,
  intersects,
  preloadAssetBindings,
  resolveAssetBinding,
  validateNonEmptyContent,
  type APKInputController,
  type AnswerChoiceAudioController,
  type CartridgeGameConfigContext,
  type GameTerminalOutcome,
  type GameplayBounds,
  type GameplayVector,
  type InputActionId,
  type ListeningAudioController,
  type RuntimeEdition,
} from "@reading-advantage/advantage-play-kit";
import type {
  CreateTutorialActionDriverContext,
  GameTutorialActionDriverContext,
  StandardExperienceCartridge,
} from "@reading-advantage/advantage-play-kit/presentation";

import { createCartridgeStandardExperience } from "./standard-experience.js";
import {
  WIZARD_GRAVEYARD_MAP,
  type WizardGraveyardFeature,
} from "./wizard-graveyard-map.js";
import { getWizardZombieIntent } from "./wizard-zombie-behavior.js";

/** Stable public identifier for the Wizard vs Zombie cartridge. */
export const WIZARD_VS_ZOMBIE_ID = "wizard-vs-zombie" as const;

/** Base canvas dimensions for the night graveyard. */
export const WIZARD_VS_ZOMBIE_CANVAS = Object.freeze({ width: 960, height: 540 });

/** Backward-compatible arena width export. */
export const GAME_WIDTH = WIZARD_VS_ZOMBIE_CANVAS.width;

/** Backward-compatible arena height export. */
export const GAME_HEIGHT = WIZARD_VS_ZOMBIE_CANVAS.height;

/** Wizard starting and maximum health. */
export const INITIAL_HP = 100;

/** Maximum number of charged shockwaves. */
export const MAX_SHOCKWAVE_CHARGES = 3;

/** Bounded damage-immunity duration after one zombie collision. */
export const INVULNERABILITY_DURATION = 500;

/** One bounded damage protection window for the first answer audition. */
export const ANSWER_AUDIO_PROTECTION_DURATION = 8_000;

/** Wizard collision radius in base arena pixels. */
export const WIZARD_RADIUS = 20;

/** Wizard movement speed in arena pixels per second. */
export const WIZARD_MOVE_SPEED = 240;

/** Soul-crystal collision radius in base arena pixels. */
export const ORB_RADIUS = 25;

/** Zombie collision radius in base arena pixels. */
export const ZOMBIE_RADIUS = 15;

/** Keyboard bindings accepted by the graveyard scene. */
export const WIZARD_VS_ZOMBIE_KEYBOARD_BINDINGS: Readonly<Record<string, InputActionId>> = Object.freeze({
  ArrowLeft: "move-left",
  KeyA: "move-left",
  ArrowRight: "move-right",
  KeyD: "move-right",
  ArrowUp: "move-up",
  KeyW: "move-up",
  ArrowDown: "move-down",
  KeyS: "move-down",
  Space: "confirm",
  Enter: "confirm",
});

/** Four semantic movement directions used by the wizard. */
export type WizardVsZombieDirection =
  | "move-left"
  | "move-right"
  | "move-up"
  | "move-down";

/** Active or terminal Wizard vs Zombie phase. */
export type WizardVsZombiePhase = "playing" | "victory" | "defeat";

/** A point in the fixed base arena coordinate system. */
export interface WizardVsZombiePoint {
  /** Horizontal arena coordinate. */
  readonly x: number;
  /** Vertical arena coordinate. */
  readonly y: number;
}

/** One soul crystal displayed in the graveyard. */
export interface WizardVsZombieOrb extends WizardVsZombiePoint {
  /** Stable identity for this round and position. */
  readonly id: string;
  /** Vocabulary term represented by the crystal. */
  readonly term: string;
  /** Compatibility alias for renderers that call the term a word. */
  readonly word: string;
  /** Target-language translation associated with the crystal. */
  readonly translation: string;
  /** Whether this crystal matches the active target term. */
  readonly isCorrect: boolean;
  /** Collision radius. */
  readonly radius: number;
}

/** One advancing zombie in the graveyard. */
export interface WizardVsZombieZombie extends WizardVsZombiePoint {
  /** Stable zombie identity. */
  readonly id: string;
  /** Movement speed in base pixels per second. */
  readonly speed: number;
  /** Health damage on contact. */
  readonly damage: number;
  /** Collision radius. */
  readonly radius: number;
}

/** Deterministic zombie seed accepted by controller tests and hosts. */
export interface WizardVsZombieZombieSeed extends WizardVsZombiePoint {
  /** Optional stable identity. */
  readonly id?: string;
  /** Optional movement speed. */
  readonly speed?: number;
  /** Optional collision damage. */
  readonly damage?: number;
  /** Optional collision radius. */
  readonly radius?: number;
}

/** Optional deterministic setup for one Wizard vs Zombie controller. */
export interface WizardVsZombieControllerOptions {
  /** Deterministic integer used for crystal layout and zombie gates. */
  readonly seed?: number;
  /** Deterministic source used to derive a seed when supplied. */
  readonly rng?: () => number;
  /** Zombies present before the first simulation step. */
  readonly initialZombies?: readonly WizardVsZombieZombieSeed[];
  /** Whether crystal contact waits for an external audio confirmation. */
  readonly deferOrbCollection?: boolean;
}

/** Immutable graveyard and learning state exposed by the controller. */
export interface WizardVsZombieSnapshot {
  /** Current gameplay phase. */
  readonly phase: WizardVsZombiePhase;
  /** Index of the current target, or the target count after victory. */
  readonly targetIndex: number;
  /** Number of vocabulary targets in the session. */
  readonly targetCount: number;
  /** Current source-language target term. */
  readonly prompt: string;
  /** Current target translation. */
  readonly answer: string;
  /** Shared catalog mechanic label for host diagnostics. */
  readonly mechanic: string;
  /** Semantic movement action that points toward the current correct crystal. */
  readonly correctAction: InputActionId;
  /** Semantic actions accepted by the controller. */
  readonly availableActions: readonly InputActionId[];
  /** Current wizard position and collision radius. */
  readonly wizard: Readonly<WizardVsZombiePoint & { readonly radius: number }>;
  /** Player-shaped alias exposing the legacy health field names. */
  readonly player: Readonly<WizardVsZombiePoint & {
    readonly radius: number;
    readonly hp: number;
    readonly maxHp: number;
    readonly shockwaveCharges: number;
    readonly invulnerabilityTime: number;
  }>;
  /** Current target term alias used by the legacy game state. */
  readonly targetWord: string;
  /** Current soul crystals. */
  readonly orbs: readonly WizardVsZombieOrb[];
  /** Current zombies. */
  readonly zombies: readonly WizardVsZombieZombie[];
  /** Current health. */
  readonly health: number;
  /** Maximum health. */
  readonly maxHealth: number;
  /** Current lives alias for shared catalog hosts. */
  readonly lives: number;
  /** Current energy alias for charged shockwaves. */
  readonly energy: number;
  /** Current shockwave charges. */
  readonly shockwaveCharges: number;
  /** Maximum shockwave charges. */
  readonly maxShockwaveCharges: number;
  /** Remaining damage-immunity time in milliseconds. */
  readonly invulnerabilityMs: number;
  /** Current game score. */
  readonly score: number;
  /** Number of correct crystal collisions. */
  readonly correctAnswers: number;
  /** Number of crystal-collision attempts. */
  readonly totalAttempts: number;
  /** Outcome of the latest crystal collision. */
  readonly lastOutcome: "correct" | "incorrect" | undefined;
  /** Elapsed simulation time in milliseconds. */
  readonly gameTimeMs: number;
  /** Elapsed simulation time alias used by the legacy game state. */
  readonly gameTime: number;
  /** Current deterministic crystal relocation revision. */
  readonly layoutRevision: number;
  /** Whether crystal contact must wait for the wizard to leave the contact zone. */
  readonly orbContactLatched: boolean;
  /** Physical crystal zone that must be left before another contact can register. */
  readonly orbContactZone: Readonly<WizardVsZombiePoint & { readonly radius: number }> | undefined;
  /** Milliseconds accumulated toward the next zombie spawn. */
  readonly spawnTimerMs: number;
  /** Number of deterministic zombie gates already consumed. */
  readonly spawnCount: number;
  /** Whether the scene lifecycle destroyed this session. */
  readonly destroyed: boolean;
  /** One terminal result, when the session has ended. */
  readonly result: GameResults | undefined;
}

/** Result returned by one arena or learning operation. */
export interface WizardVsZombieActionResult {
  /** Whether the operation changed active game state. */
  readonly accepted: boolean;
  /** Whether the operation matched the active vocabulary target. */
  readonly correct: boolean;
  /** Whether the operation advanced the target. */
  readonly progressed: boolean;
  /** Whether the operation recorded a crystal attempt. */
  readonly attempted: boolean;
  /** Whether the operation reached victory or defeat. */
  readonly terminal: boolean;
  /** Alias retained for runtime result adapters. */
  readonly completed: boolean;
  /** First terminal result, when this operation reached a terminal phase. */
  readonly result?: GameResults;
  /** Snapshot after the operation. */
  readonly snapshot: WizardVsZombieSnapshot;
}

/** Transport-independent Wizard vs Zombie rules and lifecycle controls. */
export interface WizardVsZombieController {
  /** Returns the current immutable graveyard state. */
  snapshot(): WizardVsZombieSnapshot;
  /** Moves the wizard one bounded step and resolves collisions. */
  move(direction: WizardVsZombieDirection): WizardVsZombieActionResult;
  /** Slides the wizard by APK kinematic velocity for one bounded frame. */
  steer(velocity: GameplayVector, deltaMs: number): WizardVsZombieActionResult;
  /** Applies one normalized keyboard or controller action. */
  dispatch(action: InputActionId): WizardVsZombieActionResult;
  /** Alias for dispatch retained for cartridge controller callers. */
  choose(action: InputActionId): WizardVsZombieActionResult;
  /** Moves the wizard directly to a base-arena point and resolves collisions. */
  moveTo(position: WizardVsZombiePoint): WizardVsZombieActionResult;
  /** Moves the wizard to a bounded base-arena point without resolving collisions. */
  setWizardPosition(position: WizardVsZombiePoint): void;
  /** Resolves the wizard against its current crystal and zombie positions. */
  resolveCollisions(): WizardVsZombieActionResult;
  /** Collects one crystal by identity through the learning mechanic. */
  collectOrb(orbId: string): WizardVsZombieActionResult;
  /** Advances zombie hunt, spawning, immunity, and collisions. */
  advance(deltaMs: number): WizardVsZombieActionResult;
  /** Alias for advance used by scene and test adapters. */
  tick(deltaMs: number): WizardVsZombieActionResult;
  /** Casts one charged shockwave against nearby zombies. */
  castShockwave(): WizardVsZombieActionResult;
  /** Applies one direct ten-point hazard for deterministic terminal testing. */
  applyHazard(): WizardVsZombieActionResult;
  /** Grants a bounded damage protection window without pausing simulation. */
  grantProtection(durationMs: number): void;
  /** Adds one deterministic zombie to the active graveyard. */
  addZombie(zombie: WizardVsZombieZombieSeed): void;
  /** Captures all gameplay state for a responsive transition. */
  capture(): WizardVsZombieSnapshot;
  /** Restores a validated responsive snapshot. */
  restore(snapshot: WizardVsZombieSnapshot): void;
  /** Seals the session and prevents later mutation or result delivery. */
  destroy(): void;
}

interface PhaserGraphicsLike {
  clear(): this;
  fillStyle(color: number, alpha?: number): this;
  fillRect(x: number, y: number, width: number, height: number): this;
  fillCircle(x: number, y: number, radius: number): this;
  fillRoundedRect(x: number, y: number, width: number, height: number, radius?: number): this;
  lineStyle(lineWidth: number, color: number, alpha?: number): this;
  strokeRoundedRect(x: number, y: number, width: number, height: number, radius?: number): this;
  strokeCircle(x: number, y: number, radius: number): this;
  setDepth?(depth: number): this;
  destroy(): void;
}

interface PhaserTextLike {
  readonly height?: number;
  readonly width?: number;
  setPosition(x: number, y: number): this;
  setText(value: string): this;
  setAlign?(alignment: "left" | "center" | "right" | "justify"): this;
  setDepth?(depth: number): this;
  setFontSize?(size: number | string): this;
  setVisible?(visible: boolean): this;
  setWordWrapWidth?(width: number, useAdvancedWrap?: boolean): this;
  destroy(): void;
}

interface PhaserImageLike {
  setOrigin?(x: number, y: number): this;
  setDisplaySize?(width: number, height: number): this;
  setFrame?(frame: number): this;
  setDepth?(depth: number): this;
  setPosition?(x: number, y: number): this;
  setRotation?(radians: number): this;
  setVisible?(visible: boolean): this;
  destroy(): void;
}

interface PhaserCanvasLike {
  getBoundingClientRect?(): {
    readonly left: number;
    readonly top: number;
    readonly width: number;
    readonly height: number;
  };
}

interface PhaserSceneLike {
  load?: {
    image?(key: string, url: string): unknown;
    spritesheet?(key: string, url: string, config: { frameWidth: number; frameHeight: number }): unknown;
  };
  add?: {
    graphics(): PhaserGraphicsLike;
    text(x: number, y: number, value: string, style?: Readonly<Record<string, unknown>>): PhaserTextLike;
    image?(x: number, y: number, key: string, frame?: number): PhaserImageLike;
    sprite?(x: number, y: number, key: string, frame?: number): PhaserImageLike;
    tileSprite?(x: number, y: number, width: number, height: number, key: string): PhaserImageLike;
  };
  events?: { once(event: string, listener: () => void): void };
  game?: { readonly canvas?: PhaserCanvasLike };
  scale?: { readonly width?: number; readonly height?: number };
}

interface SceneResources {
  readonly night: PhaserGraphicsLike;
  readonly graphics: PhaserGraphicsLike;
  readonly hud: PhaserGraphicsLike;
  readonly title: PhaserTextLike;
  readonly prompt: PhaserTextLike;
  readonly progress: PhaserTextLike;
  readonly health: PhaserTextLike;
  readonly ability: PhaserTextLike;
  readonly audioControl: PhaserTextLike;
  readonly transcriptControl: PhaserTextLike;
  readonly fallbackControl: PhaserTextLike;
  readonly answerAudioControls: readonly PhaserTextLike[];
  readonly feedback: PhaserTextLike;
  readonly instructions: PhaserTextLike;
  readonly orbLabels: readonly PhaserTextLike[];
  ground?: PhaserImageLike;
  readonly worldSprites: PhaserImageLike[];
  playerSprite?: PhaserImageLike;
  readonly orbSprites: Map<string, PhaserImageLike>;
  readonly zombieSprites: Map<string, PhaserImageLike>;
  worldX: number;
  worldY: number;
  worldWidth: number;
  worldHeight: number;
}

interface WizardVsZombieSceneContext {
  readonly controller: WizardVsZombieController;
  readonly items: readonly VocabularyItem[];
  readonly inputController: APKInputController;
  readonly composition: CartridgeGameConfigContext["composition"];
  readonly diagnostic: CartridgeGameConfigContext["diagnostic"];
  readonly sessionMode: NonNullable<CartridgeGameConfigContext["sessionMode"]>;
  readonly edition: RuntimeEdition;
  readonly listening?: ListeningAudioController;
  readonly answerAudio?: AnswerChoiceAudioController;
  readonly seed: number;
}

interface ResolvedArenaTexture {
  readonly textureKey: string;
  readonly frame?: number;
}

/** Display-space mapping for the fixed Wizard arena. */
export interface WizardArenaProjection extends GameplayBounds {
  /** Horizontal display pixels per arena pixel. */
  readonly scaleX: number;
  /** Vertical display pixels per arena pixel. */
  readonly scaleY: number;
}

const SOUL_POSITIONS: readonly WizardVsZombiePoint[] = Object.freeze(
  WIZARD_GRAVEYARD_MAP.clearings.map((clearing) => clearing.center),
);

const ARENA_ART_KEYS = Object.freeze([...new Set([
  ...WIZARD_GRAVEYARD_MAP.terrain.map((layer) => layer.assetKey),
  ...WIZARD_GRAVEYARD_MAP.decor.map((feature) => feature.assetKey),
  "prop:gate",
  "prop:orb",
  "player:idle",
  "enemy:idle",
])]);

/** Authored graveyard decor used by rendering and tests. */
export const GRAVEYARD_FEATURES: readonly WizardGraveyardFeature[] = WIZARD_GRAVEYARD_MAP.decor;

/** Solid footprints used by APK rectangle collision. */
export const GRAVEYARD_SOLIDS: readonly GameplayBounds[] = WIZARD_GRAVEYARD_MAP.solids;

const WIZARD_BOUNDS = Object.freeze({
  x: WIZARD_RADIUS,
  y: WIZARD_RADIUS,
  width: GAME_WIDTH - WIZARD_RADIUS * 2,
  height: GAME_HEIGHT - WIZARD_RADIUS * 2,
});

const VISIBLE_ARENA_BOUNDS = Object.freeze({ x: 0, y: 0, width: GAME_WIDTH, height: GAME_HEIGHT });

const HORDE_BOUNDS = Object.freeze({ x: 0, y: 0, width: GAME_WIDTH, height: GAME_HEIGHT });

/** Cardinal zombie gates outside the visible arena. */
export const WIZARD_ZOMBIE_SPAWN_GATES: readonly WizardVsZombiePoint[] = WIZARD_GRAVEYARD_MAP.enemySpawns;

const WIZARD_MOVE_STEP = 48;
const ZOMBIE_SPAWN_INTERVAL = 1_000;
const ZOMBIE_DAMAGE = 10;
const DEFAULT_ZOMBIE_SPEED = 96;
const SHOCKWAVE_RADIUS = 250;
const SHOCKWAVE_PUSH_DISTANCE = 300;
const MAX_ZOMBIES = 50;
const GRAVEYARD_NAV_CELL_SIZE = 32;
const SHOCKWAVE_EFFECT_DURATION = 280;
const WIZARD_VS_ZOMBIE_MECHANIC = "Collect the true soul and survive the horde.";
const WIZARD_VS_ZOMBIE_AVAILABLE_ACTIONS: readonly InputActionId[] = Object.freeze([
  "move-left",
  "move-right",
  "move-up",
  "move-down",
  "confirm",
]);

function finiteDelta(deltaMs: number): number {
  if (!Number.isFinite(deltaMs) || deltaMs < 0) return 0;
  return Math.min(deltaMs, 1_000);
}

function distanceBetween(first: WizardVsZombiePoint, second: WizardVsZombiePoint): number {
  return Math.hypot(first.x - second.x, first.y - second.y);
}

function normalizedOrbLabel(value: string): string {
  return value.trim().toLowerCase();
}

function actionTowardPoint(
  origin: WizardVsZombiePoint,
  target: WizardVsZombiePoint | undefined,
): InputActionId {
  if (!target) return "confirm";
  const horizontal = target.x - origin.x;
  const vertical = target.y - origin.y;
  if (horizontal === 0 && vertical === 0) return "confirm";
  if (Math.abs(horizontal) >= Math.abs(vertical)) return horizontal > 0 ? "move-right" : "move-left";
  return vertical > 0 ? "move-down" : "move-up";
}

function normalizedSeed(options: WizardVsZombieControllerOptions | number): number {
  const sourceOptions = typeof options === "number" ? { seed: options } : options;
  const source = sourceOptions.rng ? sourceOptions.rng() : sourceOptions.seed ?? 20260818;
  if (!Number.isFinite(source)) return 0;
  return Math.abs(Math.trunc(source)) % SOUL_POSITIONS.length;
}

function buildZombie(seed: WizardVsZombieZombieSeed, index: number): WizardVsZombieZombie {
  return Object.freeze({
    id: seed.id ?? `zombie-${index}`,
    x: seed.x,
    y: seed.y,
    speed: Math.max(0, seed.speed ?? DEFAULT_ZOMBIE_SPEED),
    damage: Math.max(0, seed.damage ?? ZOMBIE_DAMAGE),
    radius: Math.max(1, seed.radius ?? ZOMBIE_RADIUS),
  });
}

function createActionResult(
  snapshot: WizardVsZombieSnapshot,
  values: Omit<WizardVsZombieActionResult, "snapshot">,
): WizardVsZombieActionResult {
  return Object.freeze({ ...values, snapshot });
}

function isPoint(value: unknown): value is WizardVsZombiePoint {
  if (typeof value !== "object" || value === null) return false;
  const point = value as Partial<WizardVsZombiePoint>;
  return Number.isFinite(point.x) && Number.isFinite(point.y);
}

function velocityToward(
  origin: WizardVsZombiePoint,
  target: WizardVsZombiePoint,
  speed: number,
): GameplayVector {
  const dx = target.x - origin.x;
  const dy = target.y - origin.y;
  const distance = Math.hypot(dx, dy);
  if (distance === 0 || speed === 0) return Object.freeze({ x: 0, y: 0 });
  return Object.freeze({ x: dx / distance * speed, y: dy / distance * speed });
}

function bodyRect(point: WizardVsZombiePoint, radius: number): GameplayBounds {
  return {
    x: point.x - radius,
    y: point.y - radius,
    width: radius * 2,
    height: radius * 2,
  };
}

function containsRect(bounds: GameplayBounds, rect: GameplayBounds): boolean {
  return rect.x >= bounds.x
    && rect.y >= bounds.y
    && rect.x + rect.width <= bounds.x + bounds.width
    && rect.y + rect.height <= bounds.y + bounds.height;
}

/**
 * Returns whether a body rectangle hits a graveyard solid.
 * @param rect Candidate collision rectangle.
 * @returns True when the rectangle overlaps a crypt or grave footprint.
 */
export function hitsGraveyardSolid(rect: GameplayBounds): boolean {
  return GRAVEYARD_SOLIDS.some((solid) => intersects(rect, solid));
}

function createGraveyardNavigator(clearance: number) {
  return createGridNavigator({
    bounds: HORDE_BOUNDS,
    cellSize: GRAVEYARD_NAV_CELL_SIZE,
    clearance,
    obstacles: GRAVEYARD_SOLIDS,
  });
}

/**
 * Finds a deterministic safe route through the graveyard.
 * @param start Route origin in arena coordinates.
 * @param target Route destination in arena coordinates.
 * @param clearance Required body clearance from solids.
 * @returns Cardinal grid waypoints, or an empty route when blocked.
 */
export function findGraveyardRoute(
  start: WizardVsZombiePoint,
  target: WizardVsZombiePoint,
  clearance = ZOMBIE_RADIUS,
): readonly WizardVsZombiePoint[] {
  return createGraveyardNavigator(clearance).findPath(start, target);
}

/**
 * Returns the visible shockwave button rectangle for one scene size.
 * @param width Scene width in display pixels.
 * @param height Scene height in display pixels.
 * @returns A touch-safe button rectangle inside the scene.
 */
export function getWizardShockwaveButtonBounds(width: number, height: number): GameplayBounds {
  const safeWidth = Number.isFinite(width) && width > 0 ? width : GAME_WIDTH;
  const safeHeight = Number.isFinite(height) && height > 0 ? height : GAME_HEIGHT;
  const buttonSize = Math.min(54, Math.max(48, safeHeight - 16));
  return Object.freeze({
    x: Math.max(8, safeWidth - buttonSize - 16),
    y: 18,
    width: buttonSize,
    height: buttonSize,
  });
}

/** Display rectangles for the three Wizard listening controls. */
export interface WizardListeningControlBounds {
  /** Play, replay, or retry button rectangle. */
  readonly audio: GameplayBounds;
  /** Transcript assistance button rectangle. */
  readonly transcript: GameplayBounds;
  /** Explicit reading fallback button rectangle. */
  readonly fallback: GameplayBounds;
}

/**
 * Returns visible listening control rectangles for one scene size.
 * @param width Scene width in display pixels.
 * @param height Scene height in display pixels.
 * @returns Touch-safe audio, transcript, and fallback rectangles.
 */
export function getWizardListeningControlBounds(width: number, height: number): WizardListeningControlBounds {
  const shockwave = getWizardShockwaveButtonBounds(width, height);
  const gap = 8;
  const controlHeight = shockwave.height;
  const leftColumnX = Math.max(8, shockwave.x - shockwave.width - gap);
  const secondRowY = shockwave.y + shockwave.height + gap;
  return Object.freeze({
    audio: Object.freeze({ x: leftColumnX, y: shockwave.y, width: shockwave.width, height: controlHeight }),
    transcript: Object.freeze({ x: leftColumnX, y: secondRowY, width: shockwave.width, height: controlHeight }),
    fallback: Object.freeze({ x: shockwave.x, y: secondRowY, width: shockwave.width, height: controlHeight }),
  });
}

/**
 * Returns four numbered answer-audio button rectangles.
 * @param width Scene width in display pixels.
 * @param height Scene height in display pixels.
 * @returns Four compact rectangles in the second HUD row.
 */
export function getWizardAnswerAudioControlBounds(width: number, height: number): readonly GameplayBounds[] {
  const safeWidth = Number.isFinite(width) && width > 0 ? width : GAME_WIDTH;
  const safeHeight = Number.isFinite(height) && height > 0 ? height : GAME_HEIGHT;
  const gap = 8;
  const size = Math.min(48, Math.max(36, (safeWidth - gap * 5) / 4));
  const totalWidth = size * 4 + gap * 3;
  const startX = Math.max(8, (safeWidth - totalWidth) / 2);
  const y = Math.min(88, Math.max(0, safeHeight - size));
  return Object.freeze(Array.from({ length: 4 }, (_unused, index) => Object.freeze({
    x: startX + index * (size + gap),
    y,
    width: size,
    height: size,
  })));
}

/**
 * Returns the unobstructed display rectangle for the fixed Wizard arena.
 * @param width Scene width in display pixels.
 * @param height Scene height in display pixels.
 * @param compact Whether the scene uses the compact HUD.
 * @param listening Whether listening controls need the second compact row.
 * @returns The arena mapping between the top HUD and footer.
 */
export function getWizardArenaProjection(
  width: number,
  height: number,
  compact: boolean,
  listening: boolean,
): WizardArenaProjection {
  const safeWidth = Number.isFinite(width) && width > 0 ? width : GAME_WIDTH;
  const safeHeight = Number.isFinite(height) && height > 0 ? height : GAME_HEIGHT;
  const desiredTop = listening ? 144 : 88;
  const y = Math.min(desiredTop, Math.max(0, safeHeight - 1));
  const arenaHeight = Math.max(1, safeHeight - y);
  return Object.freeze({
    x: 0,
    y,
    width: safeWidth,
    height: arenaHeight,
    scaleX: safeWidth / GAME_WIDTH,
    scaleY: arenaHeight / GAME_HEIGHT,
  });
}

function slidePosition(
  position: WizardVsZombiePoint,
  velocity: GameplayVector,
  deltaMs: number,
  bounds: GameplayBounds,
  radius: number,
): WizardVsZombiePoint {
  const next = advanceBody({ position, velocity }, deltaMs, bounds).position;
  if (!hitsGraveyardSolid(bodyRect(next, radius))) return next;
  const alongX = advanceBody({ position, velocity: { x: velocity.x, y: 0 } }, deltaMs, bounds).position;
  if (!hitsGraveyardSolid(bodyRect(alongX, radius))) return { x: alongX.x, y: position.y };
  const alongY = advanceBody({ position, velocity: { x: 0, y: velocity.y } }, deltaMs, bounds).position;
  if (!hitsGraveyardSolid(bodyRect(alongY, radius))) return { x: position.x, y: alongY.y };
  return position;
}

/**
 * Creates the transport-independent Wizard vs Zombie survival controller.
 * @param input Vocabulary content for the session.
 * @param deliver Callback for the first terminal result.
 * @param options Optional deterministic setup or numeric seed.
 * @returns A controller for night-graveyard vocabulary survival.
 * @throws When the vocabulary input is invalid or empty.
 */
export function createWizardVsZombieController(
  input: unknown,
  deliver: (result: GameResults, outcome: GameTerminalOutcome) => void | Promise<void>,
  options: WizardVsZombieControllerOptions | number = {},
): WizardVsZombieController {
  const parsed = vocabularyInputSchema.parse(input);
  const content = validateNonEmptyContent(parsed, "vocabulary");
  const items: readonly VocabularyItem[] = content.items;
  const seed = normalizedSeed(options);
  let accountant = createResultAccountant();
  let terminalOutcome: GameTerminalOutcome = "complete";
  const completion = createCompletionLatch<GameResults>((result) => deliver(result, terminalOutcome));
  const spawner = createDeterministicSpawner({ intervalMs: ZOMBIE_SPAWN_INTERVAL, maxPerTick: 2 });
  const zombieNavigator = createGraveyardNavigator(ZOMBIE_RADIUS + 2);
  let phase: WizardVsZombiePhase = "playing";
  let targetIndex = 0;
  let layoutRevision = 0;
  let wizard = { ...WIZARD_GRAVEYARD_MAP.playerSpawn };
  let orbs: readonly WizardVsZombieOrb[] = [];
  const setup = typeof options === "number" ? {} : options;
  const deferOrbCollection = setup.deferOrbCollection === true;
  let zombies: readonly WizardVsZombieZombie[] = (setup.initialZombies ?? []).map(buildZombie);
  let health = INITIAL_HP;
  let shockwaveCharges = 0;
  let invulnerabilityMs = 0;
  let gameTimeMs = 0;
  let spawnTimerMs = 0;
  let spawnCount = zombies.length;
  let lastOutcome: "correct" | "incorrect" | undefined;
  let orbContactLatched = false;
  let orbContactZone: Readonly<WizardVsZombiePoint & { readonly radius: number }> | undefined;
  let result: GameResults | undefined;
  let destroyed = false;

  const currentItem = (): VocabularyItem => items[Math.min(targetIndex, items.length - 1)]!;

  const buildOrbs = (): readonly WizardVsZombieOrb[] => {
    const current = currentItem();
    const targetLabel = normalizedOrbLabel(current.term);
    const seenLabels = new Set<string>();
    const distractors = items.filter((item) => {
      const label = normalizedOrbLabel(item.term);
      if (label === targetLabel || seenLabels.has(label)) return false;
      seenLabels.add(label);
      return true;
    });
    const orbCount = Math.min(SOUL_POSITIONS.length, distractors.length + 1);
    const correctSlot = (seed + targetIndex) % orbCount;
    let distractorCursor = targetIndex % Math.max(1, distractors.length);
    return Object.freeze(SOUL_POSITIONS.slice(0, orbCount).map((_unused, slot) => {
      const position = SOUL_POSITIONS[(slot + layoutRevision) % SOUL_POSITIONS.length]!;
      const item = slot === correctSlot
        ? current
        : distractors[distractorCursor++ % distractors.length]!;
      return Object.freeze({
        id: `orb:${targetIndex}:${layoutRevision}:${slot}`,
        x: position.x,
        y: position.y,
        radius: ORB_RADIUS,
        term: item.term,
        word: item.term,
        translation: item.translation,
        isCorrect: slot === correctSlot,
      });
    }));
  };

  orbs = buildOrbs();

  const snapshot = (): WizardVsZombieSnapshot => Object.freeze({
    phase,
    targetIndex,
    targetCount: items.length,
    prompt: currentItem().term,
    answer: currentItem().translation,
    mechanic: WIZARD_VS_ZOMBIE_MECHANIC,
    correctAction: actionTowardPoint(wizard, orbs.find((orb) => orb.isCorrect)),
    availableActions: WIZARD_VS_ZOMBIE_AVAILABLE_ACTIONS,
    wizard: Object.freeze({ ...wizard, radius: WIZARD_RADIUS }),
    player: Object.freeze({
      ...wizard,
      radius: WIZARD_RADIUS,
      hp: health,
      maxHp: INITIAL_HP,
      shockwaveCharges,
      invulnerabilityTime: invulnerabilityMs,
    }),
    targetWord: currentItem().term,
    orbs,
    zombies,
    health,
    maxHealth: INITIAL_HP,
    lives: health,
    energy: shockwaveCharges,
    shockwaveCharges,
    maxShockwaveCharges: MAX_SHOCKWAVE_CHARGES,
    invulnerabilityMs,
    score: accountant.score,
    correctAnswers: accountant.correctAnswers,
    totalAttempts: accountant.totalAttempts,
    lastOutcome,
    gameTimeMs,
    gameTime: gameTimeMs,
    layoutRevision,
    orbContactLatched,
    orbContactZone,
    spawnTimerMs,
    spawnCount,
    destroyed,
    result,
  });

  const terminalResult = (): GameResults => gameResultsSchema.parse(
    finalizeResult(accountant, { xpPerCorrect: 20, xpPerAccuracyPoint: 10 }),
  );

  const finish = (nextPhase: Exclude<WizardVsZombiePhase, "playing">): GameResults => {
    phase = nextPhase;
    terminalOutcome = nextPhase;
    orbs = Object.freeze([]);
    result = terminalResult();
    completion.complete(result);
    return result;
  };

  const inactive = (): WizardVsZombieActionResult => createActionResult(snapshot(), {
    accepted: false,
    correct: false,
    progressed: false,
    attempted: false,
    terminal: false,
    completed: false,
  });

  const damageWizard = (amount: number, respectInvulnerability: boolean): WizardVsZombieActionResult => {
    if (destroyed || phase !== "playing") return inactive();
    if (respectInvulnerability && invulnerabilityMs > 0) {
      return createActionResult(snapshot(), {
        accepted: false,
        correct: false,
        progressed: false,
        attempted: false,
        terminal: false,
        completed: false,
      });
    }
    health = Math.max(0, health - Math.max(0, amount));
    if (respectInvulnerability) invulnerabilityMs = INVULNERABILITY_DURATION;
    if (health === 0) {
      const nextResult = finish("defeat");
      return createActionResult(snapshot(), {
        accepted: true,
        correct: false,
        progressed: false,
        attempted: false,
        terminal: true,
        completed: true,
        result: nextResult,
      });
    }
    return createActionResult(snapshot(), {
      accepted: true,
      correct: false,
      progressed: false,
      attempted: false,
      terminal: false,
      completed: false,
    });
  };

  const collectOrb = (orbId: string): WizardVsZombieActionResult => {
    if (destroyed || phase !== "playing") return inactive();
    const orb = orbs.find((candidate) => candidate.id === orbId);
    if (!orb) return inactive();
    const correct = orb.isCorrect;
    accountant.recordAttempt({ correct });
    lastOutcome = correct ? "correct" : "incorrect";
    if (!correct) {
      accountant.addScore(-Math.min(accountant.score, 5));
      layoutRevision += 1;
      orbs = buildOrbs();
      return createActionResult(snapshot(), {
        accepted: true,
        correct: false,
        progressed: false,
        attempted: true,
        terminal: false,
        completed: false,
      });
    }

    accountant.addScore(100);
    health = Math.min(INITIAL_HP, health + 10);
    shockwaveCharges = Math.min(MAX_SHOCKWAVE_CHARGES, shockwaveCharges + 1);
    targetIndex += 1;
    layoutRevision = 0;
    if (targetIndex >= items.length) {
      const nextResult = finish("victory");
      return createActionResult(snapshot(), {
        accepted: true,
        correct: true,
        progressed: true,
        attempted: true,
        terminal: true,
        completed: true,
        result: nextResult,
      });
    }
    orbs = buildOrbs();
    return createActionResult(snapshot(), {
      accepted: true,
      correct: true,
      progressed: true,
      attempted: true,
      terminal: false,
      completed: false,
    });
  };

  const resolveOrbCollision = (): WizardVsZombieActionResult | undefined => {
    if (orbContactZone
      && distanceBetween(wizard, orbContactZone) > WIZARD_RADIUS + orbContactZone.radius) {
      orbContactLatched = false;
      orbContactZone = undefined;
    }
    if (orbContactLatched) return undefined;
    const orb = orbs.find((candidate) => distanceBetween(wizard, candidate) <= WIZARD_RADIUS + candidate.radius);
    if (!orb) return undefined;
    orbContactLatched = true;
    orbContactZone = Object.freeze({ x: orb.x, y: orb.y, radius: orb.radius });
    if (deferOrbCollection) return undefined;
    return collectOrb(orb.id);
  };

  const resolveZombieCollision = (): WizardVsZombieActionResult | undefined => {
    const zombie = zombies.find((candidate) => distanceBetween(wizard, candidate) <= WIZARD_RADIUS + candidate.radius);
    return zombie ? damageWizard(zombie.damage, true) : undefined;
  };

  const resolveCollisions = (): WizardVsZombieActionResult => {
    if (destroyed || phase !== "playing") return inactive();
    const orbResult = resolveOrbCollision();
    if (orbResult) {
      if (orbResult.terminal) return orbResult;
      const zombieResult = resolveZombieCollision();
      if (zombieResult) return zombieResult;
      return orbResult;
    }
    return resolveZombieCollision() ?? createActionResult(snapshot(), {
      accepted: false,
      correct: false,
      progressed: false,
      attempted: false,
      terminal: false,
      completed: false,
    });
  };

  const placeWizard = (x: number, y: number): void => {
    const next = slidePosition(
      wizard,
      { x: 0, y: 0 },
      0,
      WIZARD_BOUNDS,
      WIZARD_RADIUS,
    );
    const candidate = {
      x: Math.min(WIZARD_BOUNDS.x + WIZARD_BOUNDS.width, Math.max(WIZARD_BOUNDS.x, x)),
      y: Math.min(WIZARD_BOUNDS.y + WIZARD_BOUNDS.height, Math.max(WIZARD_BOUNDS.y, y)),
    };
    wizard = hitsGraveyardSolid(bodyRect(candidate, WIZARD_RADIUS)) ? next : candidate;
  };

  const move = (direction: WizardVsZombieDirection): WizardVsZombieActionResult => {
    if (destroyed || phase !== "playing") return inactive();
    const velocity = {
      x: direction === "move-left" ? -WIZARD_MOVE_SPEED : direction === "move-right" ? WIZARD_MOVE_SPEED : 0,
      y: direction === "move-up" ? -WIZARD_MOVE_SPEED : direction === "move-down" ? WIZARD_MOVE_SPEED : 0,
    };
    return steer(velocity, (WIZARD_MOVE_STEP / WIZARD_MOVE_SPEED) * 1_000);
  };

  const steer = (velocity: GameplayVector, deltaMs: number): WizardVsZombieActionResult => {
    if (destroyed || phase !== "playing") return inactive();
    const elapsed = finiteDelta(deltaMs);
    wizard = slidePosition(wizard, velocity, elapsed, WIZARD_BOUNDS, WIZARD_RADIUS);
    const collision = resolveCollisions();
    if (collision.accepted || collision.attempted) return collision;
    return createActionResult(snapshot(), {
      accepted: true,
      correct: false,
      progressed: false,
      attempted: false,
      terminal: false,
      completed: false,
    });
  };

  const setWizardPosition = (position: WizardVsZombiePoint): void => {
    if (destroyed) return;
    placeWizard(position.x, position.y);
  };

  const moveTo = (position: WizardVsZombiePoint): WizardVsZombieActionResult => {
    if (destroyed || phase !== "playing") return inactive();
    setWizardPosition(position);
    const collision = resolveCollisions();
    if (collision.accepted || collision.attempted) return collision;
    return createActionResult(snapshot(), {
      accepted: true,
      correct: false,
      progressed: false,
      attempted: false,
      terminal: false,
      completed: false,
    });
  };

  const spawnZombie = (): void => {
    if (zombies.length >= MAX_ZOMBIES) return;
    const gate = spawnCount % 4;
    const point = WIZARD_ZOMBIE_SPAWN_GATES[(gate + seed) % WIZARD_ZOMBIE_SPAWN_GATES.length]!;
    const zombie = buildZombie({
      id: `zombie-${spawnCount}`,
      x: point.x,
      y: point.y,
      speed: DEFAULT_ZOMBIE_SPEED,
      damage: ZOMBIE_DAMAGE,
    }, spawnCount);
    zombies = Object.freeze([...zombies, zombie]);
    spawnCount += 1;
  };

  const advance = (deltaMs: number): WizardVsZombieActionResult => {
    if (destroyed || phase !== "playing") return inactive();
    const elapsed = finiteDelta(deltaMs);
    const wasInvulnerable = invulnerabilityMs > 0;
    gameTimeMs += elapsed;
    invulnerabilityMs = Math.max(0, invulnerabilityMs - elapsed);
    const due = spawner.advance(elapsed);
    spawnTimerMs = spawner.elapsedMs;
    for (let index = 0; index < due; index += 1) spawnZombie();
    zombies = Object.freeze(zombies.map((zombie) => {
      const intent = getWizardZombieIntent({
        id: zombie.id,
        seed,
        timeMs: gameTimeMs,
        position: zombie,
        target: wizard,
        baseSpeed: zombie.speed,
      });
      const waypoint = zombieNavigator.nextWaypoint(zombie, intent.target)
        ?? zombieNavigator.nextWaypoint(zombie, wizard)
        ?? zombie;
      const next = slidePosition(
        zombie,
        velocityToward(zombie, waypoint, intent.speed),
        elapsed,
        HORDE_BOUNDS,
        zombie.radius,
      );
      return buildZombie({
        id: zombie.id,
        x: next.x,
        y: next.y,
        speed: zombie.speed,
        damage: zombie.damage,
        radius: zombie.radius,
      }, 0);
    }));
    if (wasInvulnerable) {
      return resolveOrbCollision() ?? createActionResult(snapshot(), {
        accepted: false,
        correct: false,
        progressed: false,
        attempted: false,
        terminal: false,
        completed: false,
      });
    }
    return resolveCollisions();
  };

  const castShockwave = (): WizardVsZombieActionResult => {
    if (destroyed || phase !== "playing" || shockwaveCharges === 0) return inactive();
    shockwaveCharges -= 1;
    const survivors: WizardVsZombieZombie[] = [];
    for (const [index, zombie] of zombies.entries()) {
      const dx = zombie.x - wizard.x;
      const dy = zombie.y - wizard.y;
      const distance = Math.hypot(dx, dy);
      if (distance < SHOCKWAVE_RADIUS) {
        const angle = distance === 0 ? index * Math.PI * 0.5 : Math.atan2(dy, dx);
        const direction = { x: Math.cos(angle), y: Math.sin(angle) };
        const steps = Math.ceil(SHOCKWAVE_PUSH_DISTANCE / 6);
        let pushed: WizardVsZombiePoint = zombie;
        let foundSafe = !hitsGraveyardSolid(bodyRect(zombie, zombie.radius));
        for (let step = 1; step <= steps; step += 1) {
          const travel = Math.min(SHOCKWAVE_PUSH_DISTANCE, step * 6);
          const candidate = {
            x: Math.min(HORDE_BOUNDS.x + HORDE_BOUNDS.width - zombie.radius, Math.max(HORDE_BOUNDS.x + zombie.radius, zombie.x + direction.x * travel)),
            y: Math.min(HORDE_BOUNDS.y + HORDE_BOUNDS.height - zombie.radius, Math.max(HORDE_BOUNDS.y + zombie.radius, zombie.y + direction.y * travel)),
          };
          const safe = !hitsGraveyardSolid(bodyRect(candidate, zombie.radius));
          if (!safe && foundSafe) break;
          if (!safe) continue;
          foundSafe = true;
          pushed = candidate;
        }
        survivors.push(buildZombie({
          ...zombie,
          x: pushed.x,
          y: pushed.y,
        }, 0));
      } else {
        survivors.push(zombie);
      }
    }
    zombies = Object.freeze(survivors);
    return createActionResult(snapshot(), {
      accepted: true,
      correct: false,
      progressed: false,
      attempted: false,
      terminal: false,
      completed: false,
    });
  };

  const applyHazard = (): WizardVsZombieActionResult => damageWizard(ZOMBIE_DAMAGE, false);

  const grantProtection = (durationMs: number): void => {
    if (destroyed || phase !== "playing" || !Number.isFinite(durationMs) || durationMs <= 0) return;
    invulnerabilityMs = Math.max(
      invulnerabilityMs,
      Math.min(ANSWER_AUDIO_PROTECTION_DURATION, durationMs),
    );
  };

  const addZombie = (zombie: WizardVsZombieZombieSeed): void => {
    if (destroyed || phase !== "playing" || zombies.length >= MAX_ZOMBIES) return;
    zombies = Object.freeze([...zombies, buildZombie(zombie, spawnCount)]);
    spawnCount += 1;
  };

  const dispatch = (action: InputActionId): WizardVsZombieActionResult => {
    if (action === "confirm") return castShockwave();
    if (action === "move-left" || action === "move-right" || action === "move-up" || action === "move-down") {
      return move(action);
    }
    return inactive();
  };

  const restore = (state: WizardVsZombieSnapshot): void => {
    if (destroyed) return;
    if (typeof state !== "object" || state === null) throw new Error("Wizard vs Zombie state is invalid");
    if (typeof state.destroyed !== "boolean") throw new Error("Wizard vs Zombie destroyed state is invalid");
    if (!(["playing", "victory", "defeat"] as const).includes(state.phase)) {
      throw new Error("Wizard vs Zombie state phase is invalid");
    }
    if (state.targetCount !== items.length || !Number.isInteger(state.targetIndex) || state.targetIndex < 0 || state.targetIndex > items.length) {
      throw new Error("Wizard vs Zombie state target progress is invalid");
    }
    if (state.mechanic !== WIZARD_VS_ZOMBIE_MECHANIC) {
      throw new Error("Wizard vs Zombie state mechanic is invalid");
    }
    if (!Array.isArray(state.orbs) || !Array.isArray(state.zombies)) {
      throw new Error("Wizard vs Zombie entities are invalid");
    }
    const orbIds = new Set<string>();
    if (!state.orbs.every((orb) => {
      if (typeof orb.id !== "string" || orbIds.has(orb.id)) return false;
      orbIds.add(orb.id);
      return typeof orb.term === "string"
        && orb.word === orb.term
        && typeof orb.translation === "string"
        && typeof orb.isCorrect === "boolean"
        && Number.isFinite(orb.x)
        && Number.isFinite(orb.y)
        && Number.isFinite(orb.radius)
        && orb.radius > 0;
    })) {
      throw new Error("Wizard vs Zombie orb state is invalid");
    }
    const zombieIds = new Set<string>();
    if (state.zombies.length > MAX_ZOMBIES || !state.zombies.every((zombie) => {
      if (typeof zombie.id !== "string" || zombieIds.has(zombie.id)) return false;
      zombieIds.add(zombie.id);
      return Number.isFinite(zombie.x)
        && Number.isFinite(zombie.y)
        && Number.isFinite(zombie.speed)
        && zombie.speed >= 0
        && Number.isFinite(zombie.damage)
        && zombie.damage >= 0
        && Number.isFinite(zombie.radius)
        && zombie.radius > 0;
    })) {
      throw new Error("Wizard vs Zombie zombie state is invalid");
    }
    if (!isPoint(state.wizard) || state.wizard.radius !== WIZARD_RADIUS) {
      throw new Error("Wizard vs Zombie wizard position is invalid");
    }
    if (state.wizard.x < WIZARD_RADIUS || state.wizard.x > GAME_WIDTH - WIZARD_RADIUS || state.wizard.y < WIZARD_RADIUS || state.wizard.y > GAME_HEIGHT - WIZARD_RADIUS) {
      throw new Error("Wizard vs Zombie wizard bounds are invalid");
    }
    if (hitsGraveyardSolid(bodyRect(state.wizard, state.wizard.radius))) {
      throw new Error("Wizard vs Zombie wizard overlaps a solid");
    }
    if (!isPoint(state.player) || state.player.radius !== WIZARD_RADIUS || state.player.x !== state.wizard.x || state.player.y !== state.wizard.y) {
      throw new Error("Wizard vs Zombie player position is invalid");
    }
    if (!Number.isInteger(state.health) || state.health < 0 || state.health > INITIAL_HP) {
      throw new Error("Wizard vs Zombie health is invalid");
    }
    if (state.maxHealth !== INITIAL_HP || state.lives !== state.health || state.player.hp !== state.health || state.player.maxHp !== INITIAL_HP) {
      throw new Error("Wizard vs Zombie health aliases are invalid");
    }
    if (!Number.isInteger(state.shockwaveCharges) || state.shockwaveCharges < 0 || state.shockwaveCharges > MAX_SHOCKWAVE_CHARGES) {
      throw new Error("Wizard vs Zombie charges are invalid");
    }
    if (state.energy !== state.shockwaveCharges || state.player.shockwaveCharges !== state.shockwaveCharges) {
      throw new Error("Wizard vs Zombie energy aliases are invalid");
    }
    if (!Number.isInteger(state.correctAnswers) || !Number.isInteger(state.totalAttempts) || state.correctAnswers < 0 || state.correctAnswers > state.totalAttempts || state.correctAnswers !== state.targetIndex) {
      throw new Error("Wizard vs Zombie result counters are invalid");
    }
    if (!Number.isInteger(state.score) || state.score < 0 || state.score > state.correctAnswers * 100) throw new Error("Wizard vs Zombie score is invalid");
    if (!Number.isInteger(state.layoutRevision) || state.layoutRevision < 0) {
      throw new Error("Wizard vs Zombie orb layout is invalid");
    }
    if (typeof state.orbContactLatched !== "boolean") {
      throw new Error("Wizard vs Zombie orb contact state is invalid");
    }
    const hasValidContactZone = state.orbContactZone === undefined
      || (isPoint(state.orbContactZone) && state.orbContactZone.radius === ORB_RADIUS);
    if (!hasValidContactZone
      || state.orbContactLatched !== (state.orbContactZone !== undefined)
      || (state.orbContactZone !== undefined
        && distanceBetween(state.wizard, state.orbContactZone) > WIZARD_RADIUS + state.orbContactZone.radius)) {
      throw new Error("Wizard vs Zombie orb contact zone is invalid");
    }
    if (!Number.isFinite(state.spawnTimerMs)
      || state.spawnTimerMs < 0
      || state.spawnTimerMs >= ZOMBIE_SPAWN_INTERVAL
      || !Number.isInteger(state.spawnCount)
      || state.spawnCount < 0) {
      throw new Error("Wizard vs Zombie spawn state is invalid");
    }
    if (!Number.isFinite(state.invulnerabilityMs) || state.invulnerabilityMs < 0 || state.invulnerabilityMs > ANSWER_AUDIO_PROTECTION_DURATION) {
      throw new Error("Wizard vs Zombie immunity state is invalid");
    }
    if (!Number.isFinite(state.gameTimeMs) || state.gameTimeMs < 0) {
      throw new Error("Wizard vs Zombie clock is invalid");
    }
    if (state.gameTime !== state.gameTimeMs || state.player.invulnerabilityTime !== state.invulnerabilityMs) {
      throw new Error("Wizard vs Zombie clock aliases are invalid");
    }
    const target = items[Math.min(state.targetIndex, items.length - 1)]!;
    for (const orb of state.orbs) {
      const rect = bodyRect(orb, orb.radius);
      if (!containsRect(VISIBLE_ARENA_BOUNDS, rect)) throw new Error("Wizard vs Zombie orb bounds are invalid");
      if (hitsGraveyardSolid(rect)) throw new Error("Wizard vs Zombie orb overlaps a solid");
      if (findGraveyardRoute(state.wizard, orb, WIZARD_RADIUS).length === 0) {
        throw new Error("Wizard vs Zombie orb route is invalid");
      }
    }
    for (const zombie of state.zombies) {
      const rect = bodyRect(zombie, zombie.radius);
      if (!containsRect(HORDE_BOUNDS, rect)) throw new Error("Wizard vs Zombie zombie bounds are invalid");
      if (hitsGraveyardSolid(rect)) throw new Error("Wizard vs Zombie zombie overlaps a solid");
    }
    if (state.prompt !== target.term || state.answer !== target.translation || state.targetWord !== target.term) {
      throw new Error("Wizard vs Zombie target content is invalid");
    }
    if (!Array.isArray(state.availableActions)
      || state.availableActions.length !== WIZARD_VS_ZOMBIE_AVAILABLE_ACTIONS.length
      || state.availableActions.some((action, index) => action !== WIZARD_VS_ZOMBIE_AVAILABLE_ACTIONS[index])) {
      throw new Error("Wizard vs Zombie available actions are invalid");
    }
    const correctOrb = state.orbs.find((orb) => orb.isCorrect);
    const targetLabel = normalizedOrbLabel(target.term);
    const fairOrbs = state.orbs.every((orb) => orb.isCorrect
      ? normalizedOrbLabel(orb.term) === targetLabel
      : normalizedOrbLabel(orb.term) !== targetLabel);
    if (state.correctAction !== actionTowardPoint(state.wizard, correctOrb)) {
      throw new Error("Wizard vs Zombie correct action is invalid");
    }
    if (state.phase === "playing" && !fairOrbs) {
      throw new Error("Wizard vs Zombie orb fairness is invalid");
    }
    if (state.phase === "playing" && (state.targetIndex === items.length || state.health === 0 || state.result !== undefined || state.orbs.length < 1 || state.orbs.length > 4 || state.orbs.filter((orb) => orb.isCorrect).length !== 1)) {
      throw new Error("Wizard vs Zombie playing state is terminal");
    }
    if (state.phase === "victory" && (state.targetIndex !== items.length || state.orbs.length !== 0)) {
      throw new Error("Wizard vs Zombie victory state is unfinished");
    }
    if (state.phase === "defeat" && (state.health !== 0 || state.orbs.length !== 0)) {
      throw new Error("Wizard vs Zombie defeat state is inconsistent");
    }
    if (state.lastOutcome !== undefined && state.lastOutcome !== "correct" && state.lastOutcome !== "incorrect") {
      throw new Error("Wizard vs Zombie outcome is invalid");
    }
    if (state.totalAttempts === 0 && state.lastOutcome !== undefined) {
      throw new Error("Wizard vs Zombie outcome is inconsistent");
    }
    if (state.phase !== "playing" && state.result === undefined) {
      throw new Error("Wizard vs Zombie terminal result is missing");
    }
    const restoredAccountant = createResultAccountant();
    for (let index = 0; index < state.totalAttempts; index += 1) {
      restoredAccountant.recordAttempt({ correct: index < state.correctAnswers });
    }
    restoredAccountant.addScore(state.score);
    if (state.result !== undefined) {
      const restoredResult = gameResultsSchema.parse(state.result);
      const expectedResult = gameResultsSchema.parse(
        finalizeResult(restoredAccountant, { xpPerCorrect: 20, xpPerAccuracyPoint: 10 }),
      );
      if (restoredResult.accuracy !== expectedResult.accuracy
        || restoredResult.xp !== expectedResult.xp
        || restoredResult.score !== expectedResult.score
        || restoredResult.correctAnswers !== expectedResult.correctAnswers
        || restoredResult.totalAttempts !== expectedResult.totalAttempts) {
        throw new Error("Wizard vs Zombie terminal result is inconsistent");
      }
    }
    wizard = { x: state.wizard.x, y: state.wizard.y };
    health = state.health;
    shockwaveCharges = state.shockwaveCharges;
    invulnerabilityMs = state.invulnerabilityMs;
    gameTimeMs = state.gameTimeMs;
    layoutRevision = state.layoutRevision;
    orbContactLatched = state.orbContactLatched;
    orbContactZone = state.orbContactZone === undefined ? undefined : Object.freeze({ ...state.orbContactZone });
    spawnTimerMs = state.spawnTimerMs;
    zombies = Object.freeze(state.zombies.map((zombie) => buildZombie(zombie, 0)));
    spawnCount = state.spawnCount;
    orbs = Object.freeze(state.orbs.map((orb) => Object.freeze({ ...orb })));
    targetIndex = state.targetIndex;
    phase = state.phase;
    lastOutcome = state.lastOutcome;
    result = state.result;
    accountant = restoredAccountant;
    destroyed = state.destroyed;
    spawner.setElapsed(state.spawnTimerMs);
    if (phase !== "playing" || destroyed) completion.sealWithoutDelivery();
  };

  return Object.freeze({
    snapshot,
    move,
    steer,
    dispatch,
    choose: dispatch,
    moveTo,
    setWizardPosition,
    resolveCollisions,
    collectOrb,
    advance,
    tick: advance,
    castShockwave,
    applyHazard,
    grantProtection,
    addZombie,
    capture: snapshot,
    restore,
    destroy(): void {
      if (destroyed) return;
      destroyed = true;
      completion.sealWithoutDelivery();
    },
  });
}

/**
 * Returns whether the edition supplies graveyard art.
 * @param edition Audience edition supplied by the host.
 * @returns True when ground art is bound.
 */
function usesArenaArt(edition: RuntimeEdition | undefined): boolean {
  return Boolean(edition?.bindings?.["world:ground"]);
}

/**
 * Resolves one named graveyard texture when the edition binds that role.
 * @param edition Audience edition supplied by the host.
 * @param key Semantic binding key.
 * @returns Texture key and optional frame, or undefined when the role is unbound.
 */
function arenaTexture(edition: RuntimeEdition, key: string): ResolvedArenaTexture | undefined {
  if (!edition.bindings?.[key]) return undefined;
  const resolved = resolveAssetBinding(edition, key);
  return { textureKey: resolved.textureKey, frame: resolved.binding.frame };
}

/**
 * Places one image or sprite in the graveyard.
 * @param scene Active Phaser scene.
 * @param x Horizontal display position.
 * @param y Vertical display position.
 * @param texture Resolved pack texture.
 * @param displayWidth Drawn width.
 * @param displayHeight Drawn height.
 * @param depth Draw order.
 * @param originX Horizontal origin.
 * @param originY Vertical origin.
 * @returns The created image, when Phaser display services exist.
 */
function placeImage(
  scene: PhaserSceneLike,
  x: number,
  y: number,
  texture: ResolvedArenaTexture,
  displayWidth: number,
  displayHeight: number,
  depth: number,
  originX = 0.5,
  originY = 1,
): PhaserImageLike | undefined {
  const image = scene.add?.sprite?.(x, y, texture.textureKey, texture.frame ?? 0)
    ?? scene.add?.image?.(x, y, texture.textureKey, texture.frame ?? 0);
  image?.setOrigin?.(originX, originY);
  image?.setDisplaySize?.(displayWidth, displayHeight);
  image?.setDepth?.(depth);
  return image;
}

/**
 * Destroys persistent dirt and gravestone sprites.
 * @param resources Live scene resource bag.
 * @returns Nothing. Clears world sprite ownership.
 */
function destroyWorldLayer(resources: SceneResources): void {
  resources.ground?.destroy();
  resources.ground = undefined;
  for (const sprite of resources.worldSprites) sprite.destroy();
  resources.worldSprites.length = 0;
  resources.worldX = 0;
  resources.worldY = 0;
  resources.worldWidth = 0;
  resources.worldHeight = 0;
}

/**
 * Builds tiled graveyard dirt and gravestones once per canvas size.
 * @param scene Active Phaser scene.
 * @param resources Live scene resource bag.
 * @param edition Audience edition supplied by the host.
 * @param projection Current arena display mapping.
 * @returns Nothing. Creates world sprites when missing.
 */
function ensureWorldLayer(
  scene: PhaserSceneLike,
  resources: SceneResources,
  edition: RuntimeEdition,
  projection: WizardArenaProjection,
): void {
  if (resources.worldX === projection.x
    && resources.worldY === projection.y
    && resources.worldWidth === projection.width
    && resources.worldHeight === projection.height
    && resources.ground) return;
  destroyWorldLayer(resources);
  resources.worldX = projection.x;
  resources.worldY = projection.y;
  resources.worldWidth = projection.width;
  resources.worldHeight = projection.height;
  const artScale = Math.sqrt(projection.scaleX * projection.scaleY);
  const ground = arenaTexture(edition, "world:ground");
  if (ground) {
    if (scene.add?.tileSprite) {
      const tiled = scene.add.tileSprite(
        projection.x,
        projection.y,
        projection.width,
        projection.height,
        ground.textureKey,
      );
      tiled.setOrigin?.(0, 0);
      tiled.setDepth?.(-25);
      resources.ground = tiled;
    } else {
      const image = placeImage(
        scene,
        projection.x + projection.width / 2,
        projection.y + projection.height / 2,
        ground,
        projection.width,
        projection.height,
        -25,
        0.5,
        0.5,
      );
      if (image) resources.ground = image;
    }
  }
  const pathTexture = arenaTexture(edition, "world:path");
  if (pathTexture) {
    for (const path of WIZARD_GRAVEYARD_MAP.paths) {
      for (let index = 1; index < path.points.length; index += 1) {
        const start = path.points[index - 1]!;
        const end = path.points[index]!;
        const dx = (end.x - start.x) * projection.scaleX;
        const dy = (end.y - start.y) * projection.scaleY;
        const x = projection.x + (start.x + end.x) / 2 * projection.scaleX;
        const y = projection.y + (start.y + end.y) / 2 * projection.scaleY;
        const displayWidth = Math.hypot(dx, dy) + path.width * artScale * 0.35;
        const displayHeight = path.width * artScale;
        const image = scene.add?.tileSprite
          ? scene.add.tileSprite(x, y, displayWidth, displayHeight, pathTexture.textureKey)
          : placeImage(scene, x, y, pathTexture, displayWidth, displayHeight, -18, 0.5, 0.5);
        image?.setOrigin?.(0.5, 0.5);
        image?.setRotation?.(Math.atan2(dy, dx));
        image?.setDepth?.(-18);
        if (image) resources.worldSprites.push(image);
      }
    }
  }
  for (const feature of GRAVEYARD_FEATURES) {
    const texture = arenaTexture(edition, feature.assetKey);
    if (!texture) continue;
    if (feature.repeat) {
      const segmentWidth = feature.displayHeight / 2;
      const segmentCount = Math.max(1, Math.ceil(feature.displayWidth / segmentWidth));
      const renderedWidth = feature.displayWidth / segmentCount;
      for (let index = 0; index < segmentCount; index += 1) {
        const localX = -feature.displayWidth / 2 + renderedWidth * (index + 0.5);
        const angle = (feature.rotation ?? 0) * Math.PI / 180;
        const x = feature.position.x + Math.cos(angle) * localX;
        const y = feature.position.y + Math.sin(angle) * localX;
        const image = placeImage(
          scene,
          projection.x + x * projection.scaleX,
          projection.y + y * projection.scaleY,
          { ...texture, frame: index % 8 },
          renderedWidth * artScale,
          feature.displayHeight * artScale,
          feature.depth - 20,
          0.5,
          0.5,
        );
        image?.setRotation?.(angle);
        if (image) resources.worldSprites.push(image);
      }
      continue;
    }
    const image = placeImage(
      scene,
      projection.x + feature.position.x * projection.scaleX,
      projection.y + feature.position.y * projection.scaleY,
      texture,
      feature.displayWidth * artScale,
      feature.displayHeight * artScale,
      feature.depth - 20,
    );
    image?.setRotation?.((feature.rotation ?? 0) * Math.PI / 180);
    if (image) resources.worldSprites.push(image);
  }
}

/**
 * Moves or creates one keyed sprite and drops sprites that no longer have an item.
 * @param scene Active Phaser scene.
 * @param sprites Live sprite map keyed by gameplay identity.
 * @param items Current items to show.
 * @param texture Pack texture for the role.
 * @param size Drawn size.
 * @param depth Draw order.
 * @param originY Vertical origin for the sprite collision anchor.
 * @returns Nothing. Mutates the sprite map.
 */
function syncKeyedSprites(
  scene: PhaserSceneLike,
  sprites: Map<string, PhaserImageLike>,
  items: readonly { readonly id: string; readonly x: number; readonly y: number; readonly frame?: number }[],
  texture: ResolvedArenaTexture | undefined,
  size: number,
  depth: number,
  originY = 0.5,
): void {
  if (!texture) return;
  const seen = new Set<string>();
  for (const item of items) {
    seen.add(item.id);
    const current = sprites.get(item.id);
    const sprite = current ?? placeImage(scene, item.x, item.y, texture, size, size, depth, 0.5, originY);
    sprite?.setPosition?.(item.x, item.y);
    sprite?.setDisplaySize?.(size, size);
    if (item.frame !== undefined) sprite?.setFrame?.(item.frame);
    sprite?.setVisible?.(true);
    if (sprite) sprites.set(item.id, sprite);
  }
  for (const [id, sprite] of sprites) {
    if (seen.has(id)) continue;
    sprite.destroy();
    sprites.delete(id);
  }
}

function heldVelocity(held: ReadonlySet<string>, normalize: (descriptor: {
  readonly modality: "keyboard";
  readonly code: string;
}) => readonly { readonly action: InputActionId }[]): GameplayVector {
  let axisX = 0;
  let axisY = 0;
  const seen = new Set<InputActionId>();
  for (const code of held) {
    const action = normalize({ modality: "keyboard", code })[0]?.action;
    if (!action || seen.has(action)) continue;
    seen.add(action);
    if (action === "move-left") axisX -= 1;
    if (action === "move-right") axisX += 1;
    if (action === "move-up") axisY -= 1;
    if (action === "move-down") axisY += 1;
  }
  if (axisX === 0 && axisY === 0) return Object.freeze({ x: 0, y: 0 });
  const length = Math.hypot(axisX, axisY);
  return Object.freeze({
    x: axisX / length * WIZARD_MOVE_SPEED,
    y: axisY / length * WIZARD_MOVE_SPEED,
  });
}

function createScene(context: WizardVsZombieSceneContext): Readonly<Record<string, unknown>> {
  let resources: SceneResources | undefined;
  let activeScene: PhaserSceneLike | undefined;
  let composition = context.composition;
  let cleaned = false;
  let shockwaveEffectMs = 0;
  let shockwaveEffectOrigin: WizardVsZombiePoint | undefined;
  let playerFacingRow = 0;
  let playerMoving = false;
  let heardItemPosition: number | undefined;
  let assistedItemPosition: number | undefined;
  let fallbackItemPosition: number | undefined;
  let listeningPending = false;
  let listeningFailure: string | undefined;
  let listeningGeneration = 0;
  let pointerGestureTracked = false;
  let pointerSteeringGesture = false;
  const protectedAnswerQuestions = new Set<number>();
  const arenaArt = usesArenaArt(context.edition);
  const normalize = createInputActionNormalizer({
    keyboard: WIZARD_VS_ZOMBIE_KEYBOARD_BINDINGS,
    pointerTap: { action: "confirm" },
    pointerDrag: {
      leftAction: "move-left",
      rightAction: "move-right",
      upAction: "move-up",
      downAction: "move-down",
      threshold: 24,
    },
  });
  const frameScheduler = createBoundedFrameScheduler(() => undefined);

  const dimensions = (scene: PhaserSceneLike): { width: number; height: number } => ({
    width: scene.scale?.width ?? GAME_WIDTH,
    height: scene.scale?.height ?? GAME_HEIGHT,
  });

  const projectedPoint = (point: WizardVsZombiePoint, projection: WizardArenaProjection): WizardVsZombiePoint => ({
    x: projection.x + point.x * projection.scaleX,
    y: projection.y + point.y * projection.scaleY,
  });

  const arenaPoint = (point: WizardVsZombiePoint, projection: WizardArenaProjection): WizardVsZombiePoint => ({
    x: (point.x - projection.x) / projection.scaleX,
    y: (point.y - projection.y) / projection.scaleY,
  });

  const directionToPoint = (
    player: WizardVsZombiePoint,
    point: WizardVsZombiePoint,
  ): WizardVsZombieDirection | undefined => {
    const horizontal = point.x - player.x;
    const vertical = point.y - player.y;
    if (horizontal === 0 && vertical === 0) return undefined;
    if (Math.abs(horizontal) >= Math.abs(vertical)) return horizontal > 0 ? "move-right" : "move-left";
    return vertical > 0 ? "move-down" : "move-up";
  };

  const pointerInScene = (
    scene: PhaserSceneLike,
    clientX: number,
    clientY: number,
    width: number,
    height: number,
  ): WizardVsZombiePoint => {
    const rect = scene.game?.canvas?.getBoundingClientRect?.();
    if (!rect || rect.width <= 0 || rect.height <= 0) return { x: clientX, y: clientY };
    return {
      x: (clientX - rect.left) * width / rect.width,
      y: (clientY - rect.top) * height / rect.height,
    };
  };

  const castWithFeedback = (): WizardVsZombieActionResult => {
    const result = context.controller.castShockwave();
    if (result.accepted) {
      shockwaveEffectMs = SHOCKWAVE_EFFECT_DURATION;
      shockwaveEffectOrigin = result.snapshot.wizard;
    }
    return result;
  };

  const beginListening = (itemPosition: number, replay: boolean): void => {
    const listening = context.listening;
    if (!listening) return;
    const generation = ++listeningGeneration;
    listeningPending = true;
    let operation: ReturnType<ListeningAudioController["play"]>;
    try {
      operation = replay ? listening.replay(itemPosition) : listening.play(itemPosition);
    } catch (error: unknown) {
      listeningPending = false;
      listeningFailure = error instanceof Error ? error.message : "Audio is unavailable. Retry audio or use Reading mode.";
      return;
    }
    void operation.then((next) => {
      if (cleaned || generation !== listeningGeneration || context.controller.snapshot().targetIndex !== itemPosition) return;
      listeningPending = false;
      if (next.status === "completed" && next.activeItemPosition === itemPosition) {
        listeningFailure = undefined;
        heardItemPosition = itemPosition;
        return;
      }
      listeningFailure = next.failure?.message ?? "Audio did not complete. Retry audio or use Reading mode.";
    }).catch((error: unknown) => {
      if (cleaned || generation !== listeningGeneration || context.controller.snapshot().targetIndex !== itemPosition) return;
      listeningPending = false;
      listeningFailure = error instanceof Error ? error.message : "Audio is unavailable. Retry audio or use Reading mode.";
    });
  };

  const listeningBlocked = (): boolean => {
    if (!context.listening) return false;
    const position = context.controller.snapshot().targetIndex;
    return heardItemPosition !== position && fallbackItemPosition !== position;
  };

  const containsPoint = (bounds: GameplayBounds, point: WizardVsZombiePoint): boolean => point.x >= bounds.x
    && point.x <= bounds.x + bounds.width
    && point.y >= bounds.y
    && point.y <= bounds.y + bounds.height;

  const displayScale = (scene: PhaserSceneLike, width: number, height: number): number => {
    const rect = scene.game?.canvas?.getBoundingClientRect?.();
    if (!rect || rect.width <= 0 || rect.height <= 0) return 1;
    return Math.max(0.01, Math.min(rect.width / width, rect.height / height));
  };

  const updateView = (scene: PhaserSceneLike): void => {
    if (!resources) return;
    const { width, height } = dimensions(scene);
    const state = context.controller.snapshot();
    const compact = composition?.profile === "compact" || width <= 520;
    const canvasDisplayScale = displayScale(scene, width, height);
    const targetFontSize = Math.max(compact ? 34 : 44, Math.ceil(18 / canvasDisplayScale));
    const answerFontSize = Math.max(compact ? 16 : 18, Math.ceil(16 / canvasDisplayScale));
    const projection = getWizardArenaProjection(width, height, compact, Boolean(context.listening || context.answerAudio));
    const scale = Math.min(projection.scaleX, projection.scaleY);
    const wizard = projectedPoint(state.wizard, projection);
    resources.night.clear();
    resources.graphics.clear();
    resources.hud.clear();
    if (arenaArt) {
      ensureWorldLayer(scene, resources, context.edition, projection);
      resources.night.fillStyle(0x1a0f14, 0.18).fillRect(projection.x, projection.y, projection.width, projection.height);
      resources.night.fillStyle(0x000000, 0.14).fillRect(projection.x, projection.y, projection.width, projection.height * 0.18);
      resources.night.fillStyle(0x000000, 0.16).fillRect(projection.x, projection.y + projection.height * 0.84, projection.width, projection.height * 0.16);
      const orbTexture = arenaTexture(context.edition, "prop:orb");
      const enemyTexture = arenaTexture(context.edition, "enemy:idle");
      const playerTexture = arenaTexture(context.edition, "player:idle");
      syncKeyedSprites(
        scene,
        resources.orbSprites,
        state.orbs.map((orb, index) => {
          const point = projectedPoint(orb, projection);
          return { id: orb.id, x: point.x, y: point.y, frame: Math.floor(state.gameTimeMs / 120 + index) % 8 };
        }),
        orbTexture,
        Math.max(54, ORB_RADIUS * 2.8 * scale),
        5,
        0.5,
      );
      syncKeyedSprites(
        scene,
        resources.zombieSprites,
        state.zombies.map((zombie) => {
          const point = projectedPoint(zombie, projection);
          const dx = state.wizard.x - zombie.x;
          const dy = state.wizard.y - zombie.y;
          const row = Math.abs(dx) >= Math.abs(dy) ? (dx < 0 ? 0 : 1) : 3;
          const intent = getWizardZombieIntent({
            id: zombie.id,
            seed: context.seed,
            timeMs: state.gameTimeMs,
            position: zombie,
            target: state.wizard,
            baseSpeed: zombie.speed,
          });
          const motionFrame = intent.speed === 0 ? 1 : Math.floor((state.gameTimeMs + intent.animationOffsetMs) / 140) % 6;
          return { id: zombie.id, x: point.x, y: point.y, frame: row * 6 + motionFrame };
        }),
        enemyTexture,
        Math.max(64, 96 * scale),
        6,
        0.78,
      );
      if (playerTexture) {
        const size = Math.max(48, 48 * scale);
        const sprite = resources.playerSprite
          ?? placeImage(scene, wizard.x, wizard.y, playerTexture, size, size, 7, 0.5, 0.78);
        sprite?.setPosition?.(wizard.x, wizard.y);
        sprite?.setDisplaySize?.(size, size);
        sprite?.setFrame?.(playerFacingRow * 4 + (playerMoving ? Math.floor(state.gameTimeMs / 140) % 4 : 1));
        sprite?.setVisible?.(true);
        resources.playerSprite = sprite;
      }
    } else {
      resources.graphics.fillStyle(0x070204, 1).fillRect(projection.x, projection.y, projection.width, projection.height);
      resources.graphics.fillStyle(0x1a0b0d, 0.96).fillRect(
        projection.x + projection.width * 0.04,
        projection.y + projection.height * 0.04,
        projection.width * 0.92,
        projection.height * 0.92,
      );
      for (const zombie of state.zombies) {
        const point = projectedPoint(zombie, projection);
        resources.graphics.fillStyle(0x7f1d1d, 0.95).fillCircle(point.x, point.y, zombie.radius * scale);
      }
      resources.graphics.fillStyle(0xd6d3d1, 1).fillCircle(wizard.x, wizard.y, WIZARD_RADIUS * scale);
      for (const [index, orb] of state.orbs.entries()) {
        const point = projectedPoint(orb, projection);
        const pulse = Math.sin(state.gameTimeMs / 260 + index) * 3;
        resources.graphics.fillStyle(0x67e8f9, 0.9).fillCircle(point.x, point.y + pulse, ORB_RADIUS * scale);
      }
    }
    if (shockwaveEffectMs > 0 && shockwaveEffectOrigin) {
      const origin = projectedPoint(shockwaveEffectOrigin, projection);
      const progress = 1 - shockwaveEffectMs / SHOCKWAVE_EFFECT_DURATION;
      const radius = (36 + progress * (SHOCKWAVE_RADIUS - 36)) * scale;
      resources.graphics.lineStyle(5, 0x67e8f9, Math.max(0.2, 1 - progress)).strokeCircle(origin.x, origin.y, radius);
    }
    const listeningBounds = getWizardListeningControlBounds(width, height);
    const answerAudioBounds = getWizardAnswerAudioControlBounds(width, height);
    resources.hud.fillStyle(0x090407, 1).fillRect(0, 0, width, projection.y);
    const abilityBounds = getWizardShockwaveButtonBounds(width, height);
    const headerOriginX = compact ? 16 : 28;
    const controlsLeft = context.listening
      ? Math.min(abilityBounds.x, listeningBounds.audio.x, listeningBounds.transcript.x)
      : abilityBounds.x;
    const headerTextWidth = compact
      ? Math.max(120, width - headerOriginX - 16)
      : Math.max(120, controlsLeft - headerOriginX - 12);
    resources.prompt.setWordWrapWidth?.(headerTextWidth, true);
    resources.prompt.setFontSize?.(targetFontSize);
    resources.prompt.setAlign?.("left");
    const healthX = headerOriginX + 26;
    const healthY = 66;
    const healthWidth = Math.min(124, Math.max(72, controlsLeft - healthX - 12));
    const healthRatio = Math.max(0, Math.min(1, state.health / state.maxHealth));
    resources.hud.fillStyle(0x3f1d24, 1).fillRoundedRect(healthX, healthY, healthWidth, 12, 6);
    resources.hud.fillStyle(0x4ade80, 1).fillRoundedRect(healthX, healthY, healthWidth * healthRatio, 12, 6);
    resources.hud.lineStyle(2, 0xfecaca, 0.8).strokeRoundedRect(healthX, healthY, healthWidth, 12, 6);
    resources.health.setText(context.answerAudio && state.invulnerabilityMs > 0 ? "♥ 🛡" : "♥")
      .setPosition(headerOriginX, 55)
      .setVisible?.(true);
    resources.health.setFontSize?.(20);
    resources.hud.fillStyle(state.shockwaveCharges > 0 ? 0x164e63 : 0x292524, 0.94)
      .fillRoundedRect(abilityBounds.x, abilityBounds.y, abilityBounds.width, abilityBounds.height, 10);
    resources.hud.lineStyle(3, state.shockwaveCharges > 0 ? 0x67e8f9 : 0x78716c, 1)
      .strokeRoundedRect(abilityBounds.x, abilityBounds.y, abilityBounds.width, abilityBounds.height, 10);
    resources.ability.setText(`✦ ${state.shockwaveCharges}`).setPosition(abilityBounds.x + 9, abilityBounds.y + 14);
    resources.ability.setFontSize?.(20);
    if (context.listening) {
      const position = state.targetIndex;
      const audioLabel = listeningPending
        ? "…"
        : listeningFailure
          ? "↻"
          : heardItemPosition === position
            ? "↻"
            : "🔊";
      resources.hud.fillStyle(0x312e81, 0.96)
        .fillRoundedRect(listeningBounds.audio.x, listeningBounds.audio.y, listeningBounds.audio.width, listeningBounds.audio.height, 10);
      resources.hud.lineStyle(3, 0xa5b4fc, 1)
        .strokeRoundedRect(listeningBounds.audio.x, listeningBounds.audio.y, listeningBounds.audio.width, listeningBounds.audio.height, 10);
      resources.audioControl.setText(audioLabel).setPosition(listeningBounds.audio.x + 13, listeningBounds.audio.y + 12).setVisible?.(true);
      resources.audioControl.setFontSize?.(22);
      resources.hud.fillStyle(0x334155, 0.96)
        .fillRoundedRect(listeningBounds.transcript.x, listeningBounds.transcript.y, listeningBounds.transcript.width, listeningBounds.transcript.height, 10);
      resources.hud.lineStyle(3, 0xcbd5e1, 1)
        .strokeRoundedRect(listeningBounds.transcript.x, listeningBounds.transcript.y, listeningBounds.transcript.width, listeningBounds.transcript.height, 10);
      resources.transcriptControl.setText("Aa").setPosition(listeningBounds.transcript.x + 13, listeningBounds.transcript.y + 14).setVisible?.(true);
      resources.transcriptControl.setFontSize?.(18);
      if (listeningFailure) {
        resources.hud.fillStyle(0x7c2d12, 0.96)
          .fillRoundedRect(listeningBounds.fallback.x, listeningBounds.fallback.y, listeningBounds.fallback.width, listeningBounds.fallback.height, 10);
        resources.hud.lineStyle(3, 0xfdba74, 1)
          .strokeRoundedRect(listeningBounds.fallback.x, listeningBounds.fallback.y, listeningBounds.fallback.width, listeningBounds.fallback.height, 10);
        resources.fallbackControl.setText("A").setPosition(listeningBounds.fallback.x + 18, listeningBounds.fallback.y + 14).setVisible?.(true);
        resources.fallbackControl.setFontSize?.(18);
      } else {
        resources.fallbackControl.setText("").setVisible?.(false);
      }
    } else {
      resources.audioControl.setText("").setVisible?.(false);
      resources.transcriptControl.setText("").setVisible?.(false);
      resources.fallbackControl.setText("").setVisible?.(false);
    }
    for (const [index, control] of resources.answerAudioControls.entries()) {
      const bounds = answerAudioBounds[index];
      const orb = state.orbs[index];
      if (!context.answerAudio || !bounds || !orb) {
        control.setText("").setVisible?.(false);
        continue;
      }
      const choice = context.answerAudio.getChoiceSnapshot(state.targetIndex, itemPositionForOrb(orb));
      const active = choice.status === "loading" || choice.status === "ready" || choice.status === "playing";
      const failed = choice.status === "failed";
      const border = failed ? 0xfca5a5 : active ? 0xfde68a : choice.canConfirm ? 0x86efac : 0xa5b4fc;
      resources.hud.fillStyle(0x312e81, 0.96)
        .fillRoundedRect(bounds.x, bounds.y, bounds.width, bounds.height, 10);
      resources.hud.lineStyle(3, border, 1)
        .strokeRoundedRect(bounds.x, bounds.y, bounds.width, bounds.height, 10);
      control
        .setText(active ? `${index + 1} …` : failed ? `${index + 1} ↻` : `${index + 1} 🔊`)
        .setPosition(bounds.x + 7, bounds.y + 12)
        .setFontSize?.(16)
        .setVisible?.(true);
    }
    for (const [index, orb] of state.orbs.entries()) {
      const point = projectedPoint(orb, projection);
      const maxLabelWidth = Math.min(
        projection.width / 2 - 24,
        Math.max(100 * scale, compact ? 96 : 0, 96 / canvasDisplayScale),
      );
      const label = resources.orbLabels[index];
      const labelText = context.answerAudio ? String(index + 1) : orb.term;
      label
        ?.setText(labelText)
        .setFontSize?.(answerFontSize)
        .setWordWrapWidth?.(maxLabelWidth, true)
        .setAlign?.("center");
      const estimatedLineWidth = Math.max(answerFontSize, labelText.length * answerFontSize * 0.62);
      const measuredWidth = Math.min(maxLabelWidth, label?.width ?? estimatedLineWidth);
      const measuredLines = Math.max(1, Math.ceil(estimatedLineWidth / maxLabelWidth));
      const measuredHeight = label?.height ?? answerFontSize * 1.2 * measuredLines;
      const labelX = Math.min(
        projection.x + projection.width - measuredWidth - 4,
        Math.max(projection.x + 4, point.x - measuredWidth / 2),
      );
      const labelPadding = Math.max(4, 3 / canvasDisplayScale);
      const belowOrbY = point.y + (ORB_RADIUS + 8) * scale;
      const labelY = belowOrbY + measuredHeight + labelPadding <= projection.y + projection.height - 4
        ? belowOrbY
        : Math.max(projection.y + 4, point.y - (ORB_RADIUS + 8) * scale - measuredHeight);
      resources.hud.fillStyle(0x090407, 0.92)
        .fillRoundedRect(
          labelX - labelPadding,
          labelY - labelPadding,
          measuredWidth + labelPadding * 2,
          measuredHeight + labelPadding * 2,
          6,
        );
      label?.setPosition(labelX, labelY);
    }
    resources.title.setText("").setVisible?.(false);
    const promptText = context.answerAudio || !context.listening
      ? state.answer
      : fallbackItemPosition === state.targetIndex
        ? state.answer
        : assistedItemPosition === state.targetIndex
          ? state.answer
          : "";
    resources.prompt.setText(promptText).setPosition(headerOriginX, 12).setVisible?.(promptText.length > 0);
    resources.progress.setText("").setVisible?.(false);
    resources.feedback.setText("").setVisible?.(false);
    resources.instructions.setText("").setVisible?.(false);
  };

  const report = (result: WizardVsZombieActionResult): void => {
    if (!result.attempted && !result.terminal) return;
    context.diagnostic({
      level: "info",
      code: result.terminal ? "WIZARD_VS_ZOMBIE_TERMINAL" : "WIZARD_VS_ZOMBIE_ORB",
      message: result.terminal ? "Wizard vs Zombie reached a terminal state." : "Wizard vs Zombie resolved a soul.",
      details: {
        correct: result.correct,
        targetIndex: result.snapshot.targetIndex,
        totalAttempts: result.snapshot.totalAttempts,
      },
    });
  };

  const itemPositionForOrb = (orb: WizardVsZombieOrb): number => {
    const state = context.controller.snapshot();
    if (orb.isCorrect) return state.targetIndex;
    const position = context.items.findIndex((item) => item.term === orb.term && item.translation === orb.translation);
    if (position < 0) throw new Error("Wizard answer audio choice does not match session content");
    return position;
  };

  const answerChoicePositions = (state: WizardVsZombieSnapshot): readonly number[] => state.orbs.map(itemPositionForOrb);

  const beginAnswerChoice = (questionPosition: number, clipItemPosition: number): void => {
    const answerAudio = context.answerAudio;
    if (!answerAudio) return;
    const choice = answerAudio.getChoiceSnapshot(questionPosition, clipItemPosition);
    if (choice.status === "loading" || choice.status === "ready" || choice.status === "playing") return;
    if (!protectedAnswerQuestions.has(questionPosition)) {
      protectedAnswerQuestions.add(questionPosition);
      context.controller.grantProtection(ANSWER_AUDIO_PROTECTION_DURATION);
    }
    void answerAudio.playChoice(questionPosition, clipItemPosition).catch((error: unknown) => {
      if (cleaned || context.controller.snapshot().targetIndex !== questionPosition) return;
      context.diagnostic({
        level: "warning",
        code: "WIZARD_ANSWER_AUDIO_FAILED",
        message: "Wizard answer audio could not play.",
        details: { questionPosition, clipItemPosition, error: error instanceof Error ? error.message : String(error) },
      });
    });
  };

  const handleAnswerOrbContact = (orb: WizardVsZombieOrb): void => {
    const answerAudio = context.answerAudio;
    if (!answerAudio) return;
    const questionPosition = context.controller.snapshot().targetIndex;
    const clipItemPosition = itemPositionForOrb(orb);
    if (!answerAudio.canConfirmChoice(questionPosition, clipItemPosition)) {
      beginAnswerChoice(questionPosition, clipItemPosition);
      return;
    }
    const confirmation = answerAudio.confirmChoice(questionPosition, clipItemPosition);
    if (confirmation.completedQuestion !== orb.isCorrect) {
      throw new Error("Wizard answer audio confirmation does not match the crystal");
    }
    const result = context.controller.collectOrb(orb.id);
    report(result);
    if (result.progressed && result.snapshot.phase === "playing") {
      answerAudio.setQuestion(result.snapshot.targetIndex, answerChoicePositions(result.snapshot));
    }
  };

  const reportAction = (action: () => WizardVsZombieActionResult): WizardVsZombieActionResult => {
    const wasLatched = context.controller.snapshot().orbContactLatched;
    const result = action();
    report(result);
    if (context.answerAudio && !wasLatched && result.snapshot.orbContactLatched && result.snapshot.orbContactZone) {
      const zone = result.snapshot.orbContactZone;
      const orb = result.snapshot.orbs.find((candidate) => candidate.x === zone.x && candidate.y === zone.y);
      if (orb) handleAnswerOrbContact(orb);
    }
    return result;
  };

  const cleanup = (): void => {
    if (cleaned) return;
    cleaned = true;
    listeningGeneration += 1;
    frameScheduler.cancel();
    context.inputController.cancelActiveGesture();
    context.controller.destroy();
    const active = resources;
    resources = undefined;
    activeScene = undefined;
    if (!active) return;
    destroyWorldLayer(active);
    active.playerSprite?.destroy();
    for (const sprite of active.orbSprites.values()) sprite.destroy();
    active.orbSprites.clear();
    for (const sprite of active.zombieSprites.values()) sprite.destroy();
    active.zombieSprites.clear();
    active.night.destroy();
    active.graphics.destroy();
    active.hud.destroy();
    active.title.destroy();
    active.prompt.destroy();
    active.progress.destroy();
    active.health.destroy();
    active.ability.destroy();
    active.audioControl.destroy();
    active.transcriptControl.destroy();
    active.fallbackControl.destroy();
    for (const control of active.answerAudioControls) control.destroy();
    active.feedback.destroy();
    active.instructions.destroy();
    for (const label of active.orbLabels) label.destroy();
  };

  const preload = function (this: PhaserSceneLike): void {
    if (!this.load || !arenaArt) return;
    const keys = ARENA_ART_KEYS.filter((key) => Boolean(context.edition.bindings?.[key]));
    if (keys.length === 0) return;
    preloadAssetBindings(this.load, context.edition, keys);
  };

  const rememberActiveScene = (scene: PhaserSceneLike): void => {
    activeScene = scene;
  };

  const create = function (this: PhaserSceneLike): void {
    if (!this.add) throw new Error("Wizard vs Zombie requires Phaser display services");
    rememberActiveScene(this);
    const textWidth = Math.max(220, (context.composition?.safeRect?.width ?? GAME_WIDTH) - 56);
    const style = {
      fontFamily: "Arial",
      color: "#fecaca",
      fontSize: "19px",
      wordWrap: { width: textWidth },
      stroke: "#140507",
      strokeThickness: 5,
    };
    const night = this.add.graphics();
    night.setDepth?.(1);
    const graphics = this.add.graphics();
    graphics.setDepth?.(2);
    const hud = this.add.graphics();
    hud.setDepth?.(10);
    const title = this.add.text(28, 18, "", { ...style, fontSize: "30px", fontStyle: "bold", color: "#fee2e2" });
    const prompt = this.add.text(28, 12, "", { ...style, fontSize: "44px", fontStyle: "bold" });
    const progress = this.add.text(28, 98, "", { ...style, fontSize: "16px", color: "#fca5a5" });
    const health = this.add.text(28, 128, "", { ...style, fontSize: "16px", color: "#86efac" });
    const ability = this.add.text(0, 0, "✦ 0", { ...style, fontSize: "20px", color: "#cffafe" });
    const audioControl = this.add.text(0, 0, "🔊", { ...style, fontSize: "22px", color: "#e0e7ff" });
    const transcriptControl = this.add.text(0, 0, "Aa", { ...style, fontSize: "18px", color: "#f1f5f9" });
    const fallbackControl = this.add.text(0, 0, "A", { ...style, fontSize: "18px", color: "#ffedd5" });
    const feedback = this.add.text(28, 0, "", { ...style, fontSize: "17px", color: "#fde68a" });
    const instructions = this.add.text(28, 0, "", { ...style, fontSize: "15px", color: "#d6d3d1" });
    const orbLabels = SOUL_POSITIONS.map(() => this.add!.text(0, 0, "", { ...style, fontSize: "16px", color: "#e2e8f0" }));
    const answerAudioControls = SOUL_POSITIONS.map(() => this.add!.text(0, 0, "", { ...style, fontSize: "16px", color: "#e0e7ff" }));
    for (const text of [title, prompt, progress, health, ability, audioControl, transcriptControl, fallbackControl, feedback, instructions, ...orbLabels, ...answerAudioControls]) {
      text.setDepth?.(20);
    }
    resources = {
      night,
      graphics,
      hud,
      title,
      prompt,
      progress,
      health,
      ability,
      audioControl,
      transcriptControl,
      fallbackControl,
      answerAudioControls,
      feedback,
      instructions,
      orbLabels,
      worldSprites: [],
      orbSprites: new Map(),
      zombieSprites: new Map(),
      worldX: 0,
      worldY: 0,
      worldWidth: 0,
      worldHeight: 0,
    };
    this.events?.once("shutdown", cleanup);
    this.events?.once("destroy", cleanup);
    if (context.listening && context.sessionMode === "playing") beginListening(context.controller.snapshot().targetIndex, false);
    if (context.answerAudio && context.sessionMode === "playing") {
      const state = context.controller.snapshot();
      context.answerAudio.setQuestion(state.targetIndex, answerChoicePositions(state));
    }
    updateView(this);
  };

  const update = function (this: PhaserSceneLike, _time = 0, delta = 0): void {
    if (!resources || cleaned) return;
    frameScheduler.tick(delta);
    const deltaMs = frameScheduler.lastDeltaMs;
    shockwaveEffectMs = Math.max(0, shockwaveEffectMs - deltaMs);
    if (context.sessionMode === "playing") {
      const input = context.inputController.snapshot();
      const startingTargetPosition = context.controller.snapshot().targetIndex;
      const attemptsBeforeInput = context.controller.snapshot().totalAttempts;
      let pointerConsumed = false;
      let pointerWasSteering = pointerSteeringGesture;
      if (input.pointer.cancelled) {
        pointerGestureTracked = false;
        pointerSteeringGesture = false;
      } else if (input.pointer.down && !pointerGestureTracked) {
        const { width, height } = dimensions(this);
        const point = pointerInScene(this, input.pointer.startX, input.pointer.startY, width, height);
        const compact = composition?.profile === "compact" || width <= 520;
        const projection = getWizardArenaProjection(width, height, compact, Boolean(context.listening || context.answerAudio));
        const abilityBounds = getWizardShockwaveButtonBounds(width, height);
        const listeningControls = getWizardListeningControlBounds(width, height);
        const answerControls = getWizardAnswerAudioControlBounds(width, height);
        const startsOnControl = containsPoint(abilityBounds, point)
          || (Boolean(context.listening) && [listeningControls.audio, listeningControls.transcript, listeningControls.fallback]
            .some((bounds) => containsPoint(bounds, point)))
          || (Boolean(context.answerAudio) && answerControls.some((bounds) => containsPoint(bounds, point)));
        pointerGestureTracked = true;
        pointerSteeringGesture = !startsOnControl && containsPoint(projection, point);
        pointerWasSteering = pointerSteeringGesture;
      } else if (!input.pointer.down && !input.pointer.released) {
        pointerGestureTracked = false;
        pointerSteeringGesture = false;
        pointerWasSteering = false;
      }
      if (context.listening && input.pointer.released && !input.pointer.cancelled && !pointerWasSteering) {
        const { width, height } = dimensions(this);
        const point = pointerInScene(this, input.pointer.x, input.pointer.y, width, height);
        const controls = getWizardListeningControlBounds(width, height);
        if (containsPoint(controls.audio, point)) {
          pointerConsumed = true;
          if (!listeningPending) beginListening(startingTargetPosition, heardItemPosition === startingTargetPosition);
        } else if (containsPoint(controls.transcript, point)) {
          pointerConsumed = true;
          context.listening.recordTranscriptAssistance(startingTargetPosition);
          assistedItemPosition = startingTargetPosition;
        } else if (listeningFailure && containsPoint(controls.fallback, point)) {
          pointerConsumed = true;
          listeningGeneration += 1;
          listeningPending = false;
          context.listening.pause();
          context.listening.recordReadingFallback(startingTargetPosition);
          fallbackItemPosition = startingTargetPosition;
          listeningFailure = undefined;
        }
      }
      if (listeningBlocked()) {
        playerMoving = false;
        updateView(this);
        return;
      }
      const held = new Set([...(input.pressed ?? []), ...input.keys]);
      const velocity = heldVelocity(held, normalize);
      let activeVelocity = velocity;
      if (activeVelocity.x === 0 && activeVelocity.y === 0 && pointerSteeringGesture && input.pointer.down) {
        const { width, height } = dimensions(this);
        const compact = composition?.profile === "compact" || width <= 520;
        const projection = getWizardArenaProjection(width, height, compact, Boolean(context.listening || context.answerAudio));
        const pointer = pointerInScene(this, input.pointer.x, input.pointer.y, width, height);
        if (containsPoint(projection, pointer)) {
          const target = arenaPoint(pointer, projection);
          const wizard = context.controller.snapshot().wizard;
          const dx = target.x - wizard.x;
          const dy = target.y - wizard.y;
          const distance = Math.hypot(dx, dy);
          const speed = distance > 0 && deltaMs > 0
            ? Math.min(WIZARD_MOVE_SPEED, distance * 1_000 / deltaMs)
            : 0;
          activeVelocity = distance > 0
            ? { x: dx / distance * speed, y: dy / distance * speed }
            : { x: 0, y: 0 };
        }
      }
      playerMoving = activeVelocity.x !== 0 || activeVelocity.y !== 0;
      if (playerMoving) {
        playerFacingRow = Math.abs(activeVelocity.x) >= Math.abs(activeVelocity.y)
          ? (activeVelocity.x < 0 ? 1 : 2)
          : (activeVelocity.y < 0 ? 3 : 0);
      }
      if (activeVelocity.x !== 0 || activeVelocity.y !== 0) {
        reportAction(() => context.controller.steer(activeVelocity, deltaMs));
      }
      for (const code of input.pressed ?? []) {
        const action = normalize({ modality: "keyboard", code })[0]?.action;
        if (action === "confirm") reportAction(castWithFeedback);
      }
      if (context.answerAudio && input.pointer.released && !input.pointer.cancelled && !pointerWasSteering) {
        const { width, height } = dimensions(this);
        const point = pointerInScene(this, input.pointer.x, input.pointer.y, width, height);
        const controls = getWizardAnswerAudioControlBounds(width, height);
        const choiceIndex = controls.findIndex((bounds) => containsPoint(bounds, point));
        const orb = context.controller.snapshot().orbs[choiceIndex];
        if (orb) {
          pointerConsumed = true;
          beginAnswerChoice(startingTargetPosition, itemPositionForOrb(orb));
        }
      }
      if (!pointerConsumed && input.pointer.released && !input.pointer.cancelled && !pointerWasSteering) {
        const drag = normalize({
          modality: "pointer",
          phase: "drag",
          x: input.pointer.x,
          y: input.pointer.y,
          deltaX: input.pointer.x - input.pointer.startX,
          deltaY: input.pointer.y - input.pointer.startY,
        })[0]?.action;
        if (drag && drag !== "confirm") {
          playerFacingRow = drag === "move-left" ? 1 : drag === "move-right" ? 2 : drag === "move-up" ? 3 : 0;
          playerMoving = true;
          reportAction(() => context.controller.move(drag as WizardVsZombieDirection));
        } else {
          const tap = normalize({ modality: "pointer", phase: "up", x: input.pointer.x, y: input.pointer.y })[0]?.action;
          if (tap === "confirm") {
            const { width, height } = dimensions(this);
            const point = pointerInScene(this, input.pointer.x, input.pointer.y, width, height);
            const abilityBounds = getWizardShockwaveButtonBounds(width, height);
            if (point.x >= abilityBounds.x
              && point.x <= abilityBounds.x + abilityBounds.width
              && point.y >= abilityBounds.y
              && point.y <= abilityBounds.y + abilityBounds.height) {
              reportAction(castWithFeedback);
            } else {
              const state = context.controller.snapshot();
              const compact = composition?.profile === "compact" || width <= 520;
              const projection = getWizardArenaProjection(width, height, compact, Boolean(context.listening || context.answerAudio));
              const direction = containsPoint(projection, point)
                ? directionToPoint(state.wizard, arenaPoint(point, projection))
                : undefined;
              if (direction) {
                playerFacingRow = direction === "move-left" ? 1 : direction === "move-right" ? 2 : direction === "move-up" ? 3 : 0;
                playerMoving = true;
                reportAction(() => context.controller.move(direction));
              }
            }
          }
        }
      }
      if (!input.pointer.down) {
        pointerGestureTracked = false;
        pointerSteeringGesture = false;
      }
      if (context.controller.snapshot().totalAttempts === attemptsBeforeInput) {
        reportAction(() => context.controller.advance(deltaMs));
      }
      const nextState = context.controller.snapshot();
      if (context.listening && nextState.phase === "playing" && nextState.targetIndex !== startingTargetPosition) {
        listeningPending = false;
        listeningFailure = undefined;
        beginListening(nextState.targetIndex, false);
      }
    }
    updateView(this);
  };

  return {
    key: WIZARD_VS_ZOMBIE_ID,
    preload,
    create,
    update,
    extend: {
      apkCaptureResponsiveState: () => context.controller.capture(),
      apkRestoreResponsiveState: (state: unknown) => {
        if (typeof state !== "object" || state === null) throw new Error("Wizard vs Zombie responsive state is invalid");
        context.controller.restore(state as WizardVsZombieSnapshot);
      },
      apkRecompose: (nextComposition: WizardVsZombieSceneContext["composition"]) => {
        composition = nextComposition;
        if (activeScene && resources && !cleaned) updateView(activeScene);
      },
    },
  };
}

/** Creates the Wizard vs Zombie standard APK cartridge. */
export function createWizardVsZombieCartridge(): StandardExperienceCartridge {
  let activeController: WizardVsZombieController | undefined;
  let activeItems: readonly VocabularyItem[] = [];
  const itemPositionForTutorialOrb = (
    orb: WizardVsZombieOrb,
    snapshot: WizardVsZombieSnapshot,
  ): number => {
    if (orb.isCorrect) return snapshot.targetIndex;
    const itemPosition = activeItems.findIndex((item) =>
      item.term === orb.term && item.translation === orb.translation);
    if (itemPosition < 0) throw new Error("Wizard Practice choice does not match tutorial content");
    return itemPosition;
  };
  const demonstrateTutorialAction = async (
    actionId: string,
    driverContext: CreateTutorialActionDriverContext,
    execution: GameTutorialActionDriverContext,
  ): Promise<void> => {
    if (execution.signal?.aborted) return;
    const controller = activeController;
    if (!controller) return;
    const snapshot = controller.snapshot();
    const orb = actionId === "action:select-correct"
      ? snapshot.orbs.find((candidate) => candidate.isCorrect)
      : snapshot.orbs.find((candidate) => !candidate.isCorrect);
    if (!orb) return;
    const answerAudio = driverContext.answerAudio;
    if (answerAudio) {
      const clipItemPosition = itemPositionForTutorialOrb(orb, snapshot);
      answerAudio.setQuestion(
        snapshot.targetIndex,
        snapshot.orbs.map((candidate) => itemPositionForTutorialOrb(candidate, snapshot)),
      );
      await answerAudio.playChoice(snapshot.targetIndex, clipItemPosition);
      if (execution.signal?.aborted || activeController !== controller || controller.snapshot().destroyed) return;
      if (answerAudio.getChoiceSnapshot(snapshot.targetIndex, clipItemPosition).status !== "completed") {
        throw new Error("Wizard Practice answer audio did not complete");
      }
    }
    controller.collectOrb(orb.id);
  };
  const standardExperience = createCartridgeStandardExperience({
    id: WIZARD_VS_ZOMBIE_ID,
    title: "Wizard vs Zombie",
    description: "Match Thai words to their English meanings while you avoid zombies.",
    inputMode: "vocabulary",
    objective: "Match every Thai word to its English meaning.",
    mechanicInstruction: "Read the Thai word. Read the English choices, or use the speakers in audio mode. Hold the graveyard and drag to steer toward a crystal. Use a shockwave to escape zombies.",
    keyboardKeys: ["W", "A", "S", "D", "Arrow keys", "Space"],
    executeTutorialAction: demonstrateTutorialAction,
  });

  return {
    manifest: {
      id: WIZARD_VS_ZOMBIE_ID,
      title: "Wizard vs Zombie",
      description: "Match Thai words to their English meanings while you avoid zombies.",
      runtimeApiVersion: "1.0.0",
      inputMode: "vocabulary",
      requiredAssetBindings: ["legacy-catalog/wizard-vs-zombie/zombie-orbs"],
      capabilities: [
        "capability:bounded-frame-delta",
        "capability:input-action-normalization",
        "capability:nonempty-content-precondition",
        "capability:result-accounting",
        "capability:single-completion-emission",
        "capability:orb-lane-collection",
        "capability:shockwave-energy-charge",
        "capability:zombie-hazard-pressure",
      ],
    },
    standardExperience,
    createGameConfig(context: CartridgeGameConfigContext): Readonly<Record<string, unknown>> {
      const input = vocabularyInputSchema.parse(context.input);
      activeItems = input;
      const sessionMode = context.sessionMode ?? "playing";
      const controller = createWizardVsZombieController(
        input,
        sessionMode === "playing" ? (result, outcome) => {
          const delivered = context.listening?.getEvidence().effectiveModality === "reading-fallback"
            ? gameResultsSchema.parse({ ...result, xp: 0, score: 0 })
            : result;
          context.complete(delivered, outcome);
        } : () => undefined,
        { seed: context.seed, deferOrbCollection: Boolean(context.answerAudio) },
      );
      activeController = controller;
      context.diagnostic({
        level: "debug",
        code: "WIZARD_VS_ZOMBIE_READY",
        message: "Wizard vs Zombie graveyard is ready.",
        details: { cartridgeId: WIZARD_VS_ZOMBIE_ID, editionId: context.edition.id, targetCount: input.length },
      });
      return {
        width: GAME_WIDTH,
        height: GAME_HEIGHT,
        render: { antialias: false, pixelArt: true },
        scene: createScene({
          controller,
          items: input,
          inputController: context.inputController,
          composition: context.composition,
          diagnostic: context.diagnostic,
          sessionMode,
          edition: context.edition,
          listening: context.listening,
          answerAudio: context.answerAudio,
          seed: normalizedSeed({ seed: context.seed }),
        }),
      };
    },
  };
}
