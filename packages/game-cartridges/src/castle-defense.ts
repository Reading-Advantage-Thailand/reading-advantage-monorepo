import {
  gameResultsSchema,
  sentenceInputSchema,
  type GameResults,
} from "@reading-advantage/game-contracts";
import {
  createBoundedFrameScheduler,
  createCompletionLatch,
  createInputActionNormalizer,
  createResultAccountant,
  finalizeResult,
  validateNonEmptyContent,
  type APKInputController,
  type APKSessionMode,
  type CartridgeGameConfigContext,
  type GameTerminalOutcome,
  type InputActionId,
} from "@reading-advantage/advantage-play-kit";
import type {
  StandardExperienceCartridge,
} from "@reading-advantage/advantage-play-kit/presentation";

import { createCartridgeStandardExperience } from "./standard-experience.js";

/** Fixed logical canvas dimensions for the procedural Castle Defense scene. */
export const CASTLE_DEFENSE_CANVAS = Object.freeze({ width: 960, height: 540 });

/** Keyboard bindings for four-way movement and tower confirmation. */
export const CASTLE_DEFENSE_KEYBOARD_BINDINGS: Readonly<Record<string, InputActionId>> = Object.freeze({
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

/** Enemy wave values used by each sentence-backed defense wave. */
export const CASTLE_DEFENSE_WAVE_CONFIGS = Object.freeze([
  Object.freeze({ enemyCount: 2, enemyType: "soldier" as const }),
  Object.freeze({ enemyCount: 3, enemyType: "tank" as const }),
  Object.freeze({ enemyCount: 4, enemyType: "boss" as const }),
]);

/** Active or terminal Castle Defense phase. */
export type CastleDefensePhase = "collecting" | "defending" | "victory" | "defeat";

/** Procedural word-prisoner shown on the defense map. */
export interface CastleDefenseWord {
  /** Stable word identifier. */
  readonly id: string;
  /** Visual role used by the scene. */
  readonly role: "prisoner";
  /** Position within the current sentence. */
  readonly wordIndex: number;
  /** Source-language word. */
  readonly term: string;
  /** Current sentence translation shown with the prisoner. */
  readonly translation: string;
  /** Logical horizontal position. */
  readonly x: number;
  /** Logical vertical position. */
  readonly y: number;
  /** Whether the prisoner has been collected in the current chain. */
  readonly collected: boolean;
}

/** Point in one deterministic routed enemy path. */
export interface CastleDefenseRoutePoint {
  /** Logical horizontal route coordinate. */
  readonly x: number;
  /** Logical vertical route coordinate. */
  readonly y: number;
}

/** Enemy moving from the gate toward the castle base. */
export interface CastleDefenseEnemy {
  /** Stable enemy identifier. */
  readonly id: string;
  /** Enemy class used for health and base damage. */
  readonly type: "soldier" | "tank" | "boss";
  /** Logical horizontal position. */
  readonly x: number;
  /** Logical vertical position. */
  readonly y: number;
  /** Current path progress from zero through one. */
  readonly progress: number;
  /** Seed-selected multi-segment route used by this enemy. */
  readonly route: readonly CastleDefenseRoutePoint[];
  /** Current route segment index. */
  readonly routeSegment: number;
  /** Distance travelled along the selected route. */
  readonly routeDistance: number;
  /** Current hit points. */
  readonly hp: number;
  /** Maximum hit points. */
  readonly maxHp: number;
  /** Base damage when the enemy reaches the base. */
  readonly baseDamage: number;
}

/** Empty location where one tower can be built. */
export interface CastleDefenseTowerSlot {
  /** Stable slot identifier. */
  readonly id: string;
  /** Logical horizontal position. */
  readonly x: number;
  /** Logical vertical position. */
  readonly y: number;
  /** Collision radius for confirmation. */
  readonly radius: number;
  /** Whether a tower already occupies this slot. */
  readonly occupied: boolean;
}

/** Active tower built from one completed sentence chain. */
export interface CastleDefenseTower {
  /** Stable tower identifier. */
  readonly id: string;
  /** Slot occupied by the tower. */
  readonly slotId: string;
  /** Logical horizontal position. */
  readonly x: number;
  /** Logical vertical position. */
  readonly y: number;
  /** Attack radius. */
  readonly range: number;
  /** Damage applied to one enemy attack. */
  readonly damage: number;
  /** Time of the most recent attack. */
  readonly lastAttackAt: number;
  /** Words used to build the tower. */
  readonly materials: readonly string[];
}

/** Castle base health exposed by the controller. */
export interface CastleDefenseBase {
  /** Logical horizontal position. */
  readonly x: number;
  /** Logical vertical position. */
  readonly y: number;
  /** Current health. */
  readonly hp: number;
  /** Maximum health. */
  readonly maxHp: number;
}

/** Four-way player position and current tower-building inventory. */
export interface CastleDefensePlayer {
  /** Logical horizontal position. */
  readonly x: number;
  /** Logical vertical position. */
  readonly y: number;
  /** Collected words available for the next tower. */
  readonly inventory: readonly string[];
}

/** Immutable state captured during Castle Defense play or responsive transitions. */
export interface CastleDefenseSnapshot {
  /** Deterministic session seed. */
  readonly seed: number;
  /** Current game phase. */
  readonly phase: CastleDefensePhase;
  /** Alias for the current game phase. */
  readonly status: CastleDefensePhase;
  /** Zero-based active sentence wave, or the wave count after victory. */
  readonly waveIndex: number;
  /** One-based display wave, bounded by the configured wave count. */
  readonly wave: number;
  /** Number of configured sentence waves. */
  readonly waveCount: number;
  /** Number of completed sentence waves. */
  readonly wavesCompleted: number;
  /** Active sentence index, or the sentence count after victory. */
  readonly currentSentenceIndex: number;
  /** Active sentence content. */
  readonly currentSentence: Readonly<{ term: string; translation: string }>;
  /** Translation prompt for the active sentence. */
  readonly prompt: string;
  /** Next source-language word expected by the chain. */
  readonly answer: string;
  /** Index of the next required word. */
  readonly nextWordIndex: number;
  /** Global index of the next ordered input word. */
  readonly targetIndex: number;
  /** Number of ordered input words in the session. */
  readonly targetCount: number;
  /** Semantic action that moves toward the current word target. */
  readonly correctAction: InputActionId;
  /** Semantic actions accepted by the controller. */
  readonly availableActions: readonly InputActionId[];
  /** Whether every word in this sentence has been collected. */
  readonly sentenceComplete: boolean;
  /** Available word-prisoners for the active sentence. */
  readonly words: readonly CastleDefenseWord[];
  /** Current four-way player position. */
  readonly player: CastleDefensePlayer;
  /** Collected words available for the next tower. */
  readonly inventory: readonly string[];
  /** Empty and occupied tower slots. */
  readonly towerSlots: readonly CastleDefenseTowerSlot[];
  /** Built towers. */
  readonly towers: readonly CastleDefenseTower[];
  /** Active enemies in the configured wave. */
  readonly enemies: readonly CastleDefenseEnemy[];
  /** Castle base health. */
  readonly base: CastleDefenseBase;
  /** Remaining castle lives represented by base health. */
  readonly lives: number;
  /** Current collected-word energy represented by the inventory size. */
  readonly energy: number;
  /** Number of enemies created in the active wave. */
  readonly enemiesSpawned: number;
  /** Total enemies in the active wave. */
  readonly enemiesInWave: number;
  /** Remaining deterministic spawn timer for the active wave. */
  readonly spawnTimer: number;
  /** Elapsed gameplay time. */
  readonly elapsedMs: number;
  /** Current score. */
  readonly score: number;
  /** Number of correct word collections. */
  readonly correctAnswers: number;
  /** Number of word collection attempts. */
  readonly totalAttempts: number;
  /** Most recent collection outcome. */
  readonly lastOutcome: "correct" | "incorrect" | undefined;
  /** One terminal result, when the session ended. */
  readonly result: GameResults | undefined;
  /** Whether cleanup has permanently sealed the session. */
  readonly destroyed: boolean;
}

/** Result returned after one Castle Defense action. */
export interface CastleDefenseActionResult {
  /** Whether the action changed game state. */
  readonly accepted: boolean;
  /** Whether the action made a correct word match. */
  readonly correct: boolean;
  /** Whether the learning chain advanced. */
  readonly progressed: boolean;
  /** Whether the action ended the session. */
  readonly terminal: boolean;
  /** Compatibility alias for a terminal action. */
  readonly completed: boolean;
  /** Stable event produced by the action. */
  readonly event: "ignored" | "player-moved" | "word-collected" | "chain-reset" | "tower-built" | "base-hit";
  /** First terminal result produced by the action. */
  readonly result?: GameResults;
  /** State after the action. */
  readonly snapshot: CastleDefenseSnapshot;
}

/** Transport-independent Castle Defense rules and lifecycle controls. */
export interface CastleDefenseController {
  /** Returns the current immutable state. */
  snapshot(): CastleDefenseSnapshot;
  /** Applies one semantic movement or confirmation action. */
  dispatch(action: InputActionId): CastleDefenseActionResult;
  /** Alias for dispatch retained for cartridge controller compatibility. */
  choose(action: InputActionId): CastleDefenseActionResult;
  /** Collects one word-prisoner by index or stable identifier. */
  collectWord(word: number | string): CastleDefenseActionResult;
  /** Advances deterministic enemy, tower, and wave simulation time. */
  advance(deltaMs: number): CastleDefenseSnapshot;
  /** Applies one direct base hazard for deterministic defeat handling. */
  applyHazard(): CastleDefenseActionResult;
  /** Captures complete state for responsive transitions. */
  capture(): CastleDefenseSnapshot;
  /** Restores a validated state captured from this session. */
  restore(snapshot: CastleDefenseSnapshot): void;
  /** Seals the controller and prevents later mutation or delivery. */
  destroy(): void;
}

type MutableWord = CastleDefenseWord;
type MutableEnemy = CastleDefenseEnemy;
type MutableTowerSlot = CastleDefenseTowerSlot;
type MutableTower = Omit<CastleDefenseTower, "lastAttackAt" | "materials"> & {
  lastAttackAt: number;
  materials: string[];
};

interface MutableCastleDefenseState {
  seed: number;
  phase: CastleDefensePhase;
  waveIndex: number;
  currentSentenceIndex: number;
  currentSentence: { term: string; translation: string };
  words: MutableWord[];
  nextWordIndex: number;
  sentenceComplete: boolean;
  player: CastleDefensePlayer;
  towerSlots: MutableTowerSlot[];
  towers: MutableTower[];
  enemies: MutableEnemy[];
  base: CastleDefenseBase;
  enemiesSpawned: number;
  enemiesInWave: number;
  spawnTimer: number;
  elapsedMs: number;
  score: number;
  lastOutcome: "correct" | "incorrect" | undefined;
  result: GameResults | undefined;
  destroyed: boolean;
}

interface PhaserGraphicsLike {
  clear(): this;
  fillStyle(color: number, alpha?: number): this;
  fillRect(x: number, y: number, width: number, height: number): this;
  fillCircle(x: number, y: number, radius: number): this;
  fillRoundedRect(x: number, y: number, width: number, height: number, radius?: number): this;
  lineStyle(width: number, color: number, alpha?: number): this;
  strokeRoundedRect(x: number, y: number, width: number, height: number, radius?: number): this;
  destroy(): void;
}

interface PhaserTextLike {
  setPosition(x: number, y: number): this;
  setText(value: string): this;
  destroy(): void;
}

interface PhaserSceneLike {
  add?: {
    graphics(): PhaserGraphicsLike;
    text(x: number, y: number, value: string, style?: Readonly<Record<string, unknown>>): PhaserTextLike;
  };
  events?: { once(event: string, listener: () => void): void };
  game?: { canvas?: { getBoundingClientRect?(): { readonly left: number; readonly top?: number; readonly width: number; readonly height?: number } } };
  scale?: { readonly width?: number; readonly height?: number };
}

interface CastleDefenseSceneContext {
  readonly controller: CastleDefenseController;
  readonly inputController: APKInputController;
  readonly composition: CartridgeGameConfigContext["composition"];
  readonly diagnostic: CartridgeGameConfigContext["diagnostic"];
  readonly sessionMode: APKSessionMode;
}

interface SceneResources {
  readonly graphics: PhaserGraphicsLike;
  readonly title: PhaserTextLike;
  readonly prompt: PhaserTextLike;
  readonly status: PhaserTextLike;
  readonly feedback: PhaserTextLike;
  readonly instructions: PhaserTextLike;
  readonly wordLabels: Map<string, PhaserTextLike>;
}

const MOVE_STEP = 64;
const PLAYER_RADIUS = 24;
const WORD_RADIUS = 28;
const BUILD_RADIUS = 110;
const TOWER_RANGE = 520;
const TOWER_DAMAGE = 60;
const TOWER_ATTACK_INTERVAL_MS = 300;
const ENEMY_SPEED = 0.0002;
const ENEMY_SPAWN_INTERVAL_MS = 500;
const BASE_POSITION = Object.freeze({ x: 880, y: 270 });
const GATE_POSITION = Object.freeze({ x: 80, y: 270 });
const PLAYER_START = Object.freeze({ x: 480, y: 440 });
const TOWER_SLOT_POSITIONS = Object.freeze([
  Object.freeze({ id: "slot-0", x: 480, y: 440 }),
  Object.freeze({ id: "slot-1", x: 560, y: 440 }),
  Object.freeze({ id: "slot-2", x: 400, y: 440 }),
  Object.freeze({ id: "slot-3", x: 480, y: 360 }),
  Object.freeze({ id: "slot-4", x: 560, y: 360 }),
  Object.freeze({ id: "slot-5", x: 400, y: 360 }),
]);

const CASTLE_DEFENSE_ACTIONS: readonly InputActionId[] = Object.freeze([
  "move-left",
  "move-right",
  "move-up",
  "move-down",
  "confirm",
]);

const CASTLE_DEFENSE_ROUTES: readonly (readonly CastleDefenseRoutePoint[])[] = Object.freeze([
  Object.freeze([
    Object.freeze({ x: GATE_POSITION.x, y: GATE_POSITION.y }),
    Object.freeze({ x: 200, y: GATE_POSITION.y }),
    Object.freeze({ x: 200, y: 120 }),
    Object.freeze({ x: 520, y: 120 }),
    Object.freeze({ x: 520, y: BASE_POSITION.y }),
    Object.freeze({ x: BASE_POSITION.x, y: BASE_POSITION.y }),
  ]),
  Object.freeze([
    Object.freeze({ x: GATE_POSITION.x, y: GATE_POSITION.y }),
    Object.freeze({ x: 200, y: GATE_POSITION.y }),
    Object.freeze({ x: 200, y: 420 }),
    Object.freeze({ x: 700, y: 420 }),
    Object.freeze({ x: 700, y: BASE_POSITION.y }),
    Object.freeze({ x: BASE_POSITION.x, y: BASE_POSITION.y }),
  ]),
  Object.freeze([
    Object.freeze({ x: GATE_POSITION.x, y: GATE_POSITION.y }),
    Object.freeze({ x: 180, y: GATE_POSITION.y }),
    Object.freeze({ x: 180, y: 160 }),
    Object.freeze({ x: 420, y: 160 }),
    Object.freeze({ x: 420, y: 360 }),
    Object.freeze({ x: 720, y: 360 }),
    Object.freeze({ x: 720, y: BASE_POSITION.y }),
    Object.freeze({ x: BASE_POSITION.x, y: BASE_POSITION.y }),
  ]),
]);

function normalizeSeed(seed: number): number {
  if (!Number.isFinite(seed)) throw new Error("Castle Defense seed must be finite");
  return Math.abs(Math.trunc(seed)) % 1_000_000;
}

function tokenizeSentence(sentence: string): string[] {
  return sentence
    .trim()
    .split(/\s+/u)
    .map((word) => word.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, ""))
    .filter(Boolean);
}

function distance(firstX: number, firstY: number, secondX: number, secondY: number): number {
  return Math.hypot(firstX - secondX, firstY - secondY);
}

function wordPosition(seed: number, waveIndex: number, wordIndex: number): { x: number; y: number } {
  const x = 120 + ((seed * 31 + waveIndex * 97 + wordIndex * 157) % 720);
  const y = 120 + ((seed * 17 + waveIndex * 53 + wordIndex * 83) % 240);
  return { x, y };
}

function waveConfig(waveIndex: number): { enemyCount: number; enemyType: CastleDefenseEnemy["type"] } {
  return CASTLE_DEFENSE_WAVE_CONFIGS[waveIndex % CASTLE_DEFENSE_WAVE_CONFIGS.length]!;
}

function sentenceStartIndex(sentences: readonly { term: string }[], sentenceIndex: number): number {
  return sentences
    .slice(0, sentenceIndex)
    .reduce((total, sentence) => total + tokenizeSentence(sentence.term).length, 0);
}

function routeFor(seed: number, waveIndex: number, enemyIndex: number): readonly CastleDefenseRoutePoint[] {
  const route = CASTLE_DEFENSE_ROUTES[(seed + waveIndex * 7 + enemyIndex * 13) % CASTLE_DEFENSE_ROUTES.length];
  if (!route) throw new Error("Castle Defense route selection failed");
  return route;
}

function routeLength(route: readonly CastleDefenseRoutePoint[]): number {
  return route.slice(1).reduce((total, point, index) => {
    const previous = route[index]!;
    return total + distance(previous.x, previous.y, point.x, point.y);
  }, 0);
}

function positionOnRoute(
  route: readonly CastleDefenseRoutePoint[],
  progress: number,
): { x: number; y: number; routeSegment: number; routeDistance: number } {
  const totalLength = routeLength(route);
  const routeDistance = totalLength * Math.max(0, Math.min(1, progress));
  let traversed = 0;
  for (let index = 0; index < route.length - 1; index += 1) {
    const start = route[index]!;
    const end = route[index + 1]!;
    const segmentLength = distance(start.x, start.y, end.x, end.y);
    if (routeDistance <= traversed + segmentLength || index === route.length - 2) {
      const segmentProgress = segmentLength === 0 ? 0 : (routeDistance - traversed) / segmentLength;
      return {
        x: start.x + (end.x - start.x) * Math.max(0, Math.min(1, segmentProgress)),
        y: start.y + (end.y - start.y) * Math.max(0, Math.min(1, segmentProgress)),
        routeSegment: index,
        routeDistance,
      };
    }
    traversed += segmentLength;
  }
  const last = route.at(-1)!;
  return { x: last.x, y: last.y, routeSegment: Math.max(0, route.length - 2), routeDistance };
}

function enemyStats(type: CastleDefenseEnemy["type"]): { hp: number; baseDamage: number } {
  if (type === "boss") return { hp: 220, baseDamage: 100 };
  if (type === "tank") return { hp: 140, baseDamage: 50 };
  return { hp: 100, baseDamage: 50 };
}

function playerPositionAfterAction(
  player: Readonly<CastleDefensePlayer>,
  action: InputActionId,
): { x: number; y: number } {
  const delta = action === "move-left"
    ? { x: -MOVE_STEP, y: 0 }
    : action === "move-right"
      ? { x: MOVE_STEP, y: 0 }
      : action === "move-up"
        ? { x: 0, y: -MOVE_STEP }
        : { x: 0, y: MOVE_STEP };
  return {
    x: Math.max(PLAYER_RADIUS, Math.min(CASTLE_DEFENSE_CANVAS.width - PLAYER_RADIUS, player.x + delta.x)),
    y: Math.max(PLAYER_RADIUS, Math.min(CASTLE_DEFENSE_CANVAS.height - PLAYER_RADIUS, player.y + delta.y)),
  };
}

function directionToTarget(
  player: Readonly<CastleDefensePlayer>,
  target: Readonly<CastleDefenseWord>,
  words: readonly CastleDefenseWord[],
): InputActionId {
  const direct = directionToPoint(player, target);
  if (!direct) return "confirm";

  const candidates = [direct, "move-left", "move-right", "move-up", "move-down"] as const;
  const safe = candidates.filter((action) => {
    const next = playerPositionAfterAction(player, action);
    return !words.some((word) => word.id !== target.id
      && !word.collected
      && distance(next.x, next.y, word.x, word.y) <= PLAYER_RADIUS + WORD_RADIUS);
  });
  return [...safe].sort((first, second) => {
    const firstPosition = playerPositionAfterAction(player, first);
    const secondPosition = playerPositionAfterAction(player, second);
    return distance(firstPosition.x, firstPosition.y, target.x, target.y)
      - distance(secondPosition.x, secondPosition.y, target.x, target.y);
  })[0] ?? direct;
}

function correctActionForState(
  phase: CastleDefensePhase,
  player: Readonly<CastleDefensePlayer>,
  words: readonly CastleDefenseWord[],
  sentenceComplete: boolean,
  towerSlots: readonly CastleDefenseTowerSlot[],
): InputActionId {
  const activeTarget = words.find((word) => !word.collected);
  if (activeTarget) return directionToTarget(player, activeTarget, words);
  if (phase !== "collecting" || !sentenceComplete) return "confirm";

  const buildSlot = towerSlots.find((slot) => !slot.occupied);
  if (!buildSlot || distance(player.x, player.y, buildSlot.x, buildSlot.y) <= BUILD_RADIUS) return "confirm";
  return directionToPoint(player, buildSlot) ?? "confirm";
}

function createWords(
  sentence: { term: string; translation: string },
  seed: number,
  waveIndex: number,
): MutableWord[] {
  return tokenizeSentence(sentence.term).map((term, wordIndex) => {
    const position = wordPosition(seed, waveIndex, wordIndex);
    return {
      id: `wave:${waveIndex}:word:${wordIndex}`,
      role: "prisoner",
      wordIndex,
      term,
      translation: sentence.translation,
      x: position.x,
      y: position.y,
      collected: false,
    };
  });
}

function createEnemy(waveIndex: number, enemyIndex: number, seed: number): MutableEnemy {
  const type = waveConfig(waveIndex).enemyType;
  const stats = enemyStats(type);
  const route = routeFor(seed, waveIndex, enemyIndex);
  const position = positionOnRoute(route, 0);
  return {
    id: `wave:${waveIndex}:enemy:${enemyIndex}`,
    type,
    x: position.x,
    y: position.y,
    progress: 0,
    route,
    routeSegment: position.routeSegment,
    routeDistance: position.routeDistance,
    hp: stats.hp,
    maxHp: stats.hp,
    baseDamage: stats.baseDamage,
  };
}

function createTowerSlots(): MutableTowerSlot[] {
  return TOWER_SLOT_POSITIONS.map(({ id, x, y }) => ({
    id,
    x,
    y,
    radius: 36,
    occupied: false,
  }));
}

function cloneWords(words: readonly CastleDefenseWord[]): MutableWord[] {
  return words.map((word) => ({ ...word }));
}

function cloneEnemies(enemies: readonly CastleDefenseEnemy[]): MutableEnemy[] {
  return enemies.map((enemy) => ({
    ...enemy,
    route: enemy.route.map((point) => ({ ...point })),
  }));
}

function cloneTowers(towers: readonly CastleDefenseTower[]): MutableTower[] {
  return towers.map((tower) => ({ ...tower, materials: [...tower.materials] }));
}

function cloneSlots(slots: readonly CastleDefenseTowerSlot[]): MutableTowerSlot[] {
  return slots.map((slot) => ({ ...slot }));
}

function freezeSnapshot(
  state: MutableCastleDefenseState,
  waveCount: number,
  targetCount: number,
  sentences: readonly { term: string; translation: string }[],
  accountant: ReturnType<typeof createResultAccountant>,
): CastleDefenseSnapshot {
  const activeSentence = Object.freeze({ ...state.currentSentence });
  const words = Object.freeze(state.words.map((word) => Object.freeze({ ...word })));
  const player = Object.freeze({ ...state.player, inventory: Object.freeze([...state.player.inventory]) });
  const towerSlots = Object.freeze(state.towerSlots.map((slot) => Object.freeze({ ...slot })));
  const towers = Object.freeze(state.towers.map((tower) => Object.freeze({ ...tower, materials: Object.freeze([...tower.materials]) })));
  const enemies = Object.freeze(state.enemies.map((enemy) => Object.freeze({
    ...enemy,
    route: Object.freeze(enemy.route.map((point) => Object.freeze({ ...point }))),
  })));
  const base = Object.freeze({ ...state.base });
  const waveIndex = state.waveIndex;
  const target = state.words[Math.min(state.nextWordIndex, Math.max(0, state.words.length - 1))];
  const targetIndex = state.phase === "victory"
    ? targetCount
    : sentenceStartIndex(sentences, state.currentSentenceIndex) + state.nextWordIndex;
  const correctAction = correctActionForState(
    state.phase,
    state.player,
    state.words,
    state.sentenceComplete,
    state.towerSlots,
  );
  const result = state.result === undefined ? undefined : gameResultsSchema.parse(state.result);
  return Object.freeze({
    seed: state.seed,
    phase: state.phase,
    status: state.phase,
    waveIndex,
    wave: Math.min(waveIndex + 1, waveCount),
    waveCount,
    wavesCompleted: state.phase === "victory" ? waveCount : waveIndex,
    currentSentenceIndex: state.currentSentenceIndex,
    currentSentence: activeSentence,
    prompt: state.currentSentence.translation,
    answer: target?.term ?? "",
    nextWordIndex: state.nextWordIndex,
    targetIndex,
    targetCount,
    correctAction,
    availableActions: CASTLE_DEFENSE_ACTIONS,
    sentenceComplete: state.sentenceComplete,
    words,
    player,
    inventory: player.inventory,
    towerSlots,
    towers,
    enemies,
    base,
    lives: state.base.hp,
    energy: state.player.inventory.length,
    enemiesSpawned: state.enemiesSpawned,
    enemiesInWave: state.enemiesInWave,
    spawnTimer: state.spawnTimer,
    elapsedMs: state.elapsedMs,
    score: accountant.score,
    correctAnswers: accountant.correctAnswers,
    totalAttempts: accountant.totalAttempts,
    lastOutcome: state.lastOutcome,
    result,
    destroyed: state.destroyed,
  });
}

function resultFor(accountant: ReturnType<typeof createResultAccountant>): GameResults {
  return gameResultsSchema.parse(finalizeResult(accountant, { xpPerCorrect: 20, xpPerAccuracyPoint: 10 }));
}

function createActionResult(
  snapshot: CastleDefenseSnapshot,
  values: Omit<CastleDefenseActionResult, "snapshot">,
): CastleDefenseActionResult {
  return Object.freeze({ ...values, snapshot });
}

/**
 * Creates transport-independent Castle Defense rules for one deterministic sentence session.
 * @param input Untrusted sentence content for the session.
 * @param deliver Callback that receives the first terminal result.
 * @param seed Deterministic seed for prisoner positions and wave setup.
 * @returns A controller for prisoner collection, tower building, and wave defense.
 * @throws When sentence content or the seed is invalid.
 */
export function createCastleDefenseController(
  input: unknown,
  deliver: (result: GameResults, outcome: GameTerminalOutcome) => void | Promise<void>,
  seed = 0,
): CastleDefenseController {
  const parsedInput = sentenceInputSchema.parse(input);
  const content = validateNonEmptyContent(parsedInput, "sentence");
  const sentences = content.items.map((item) => ({ term: item.term, translation: item.translation }));
  const normalizedSeed = normalizeSeed(seed);
  const waveCount = sentences.length;
  const targetCount = sentences.reduce((total, sentence) => total + tokenizeSentence(sentence.term).length, 0);
  if (targetCount === 0) throw new Error("Castle Defense requires at least one sentence word");
  const firstSentence = sentences[0]!;
  const firstWave = waveConfig(0);
  let accountant = createResultAccountant();
  let terminalOutcome: GameTerminalOutcome = "complete";
  const completion = createCompletionLatch<GameResults>((result) => deliver(result, terminalOutcome));
  let state: MutableCastleDefenseState = {
    seed: normalizedSeed,
    phase: "collecting",
    waveIndex: 0,
    currentSentenceIndex: 0,
    currentSentence: { ...firstSentence },
    words: createWords(firstSentence, normalizedSeed, 0),
    nextWordIndex: 0,
    sentenceComplete: false,
    player: { ...PLAYER_START, inventory: [] },
    towerSlots: createTowerSlots(),
    towers: [],
    enemies: [createEnemy(0, 0, normalizedSeed)],
    base: { ...BASE_POSITION, hp: 100, maxHp: 100 },
    enemiesSpawned: 1,
    enemiesInWave: firstWave.enemyCount,
    spawnTimer: 0,
    elapsedMs: 0,
    score: 0,
    lastOutcome: undefined,
    result: undefined,
    destroyed: false,
  };

  const snapshot = (): CastleDefenseSnapshot => freezeSnapshot(state, waveCount, targetCount, sentences, accountant);
  const noOp = (): CastleDefenseActionResult => createActionResult(snapshot(), {
    accepted: false,
    correct: false,
    progressed: false,
    terminal: false,
    completed: false,
    event: "ignored",
  });

  const finish = (phase: "victory" | "defeat"): GameResults => {
    state.phase = phase;
    terminalOutcome = phase;
    const result = resultFor(accountant);
    state.result = result;
    completion.complete(result);
    return result;
  };

  const resetSentenceChain = (): void => {
    state.nextWordIndex = 0;
    state.sentenceComplete = false;
    state.player = { ...state.player, inventory: [] };
    state.words = createWords(state.currentSentence, normalizedSeed, state.waveIndex);
  };

  const collectWord = (word: number | string): CastleDefenseActionResult => {
    if (state.destroyed || state.phase !== "collecting") return noOp();
    const wordIndex = typeof word === "number"
      ? word
      : state.words.find((candidate) => candidate.id === word)?.wordIndex ?? -1;
    const selected = state.words.find((candidate) => candidate.wordIndex === wordIndex);
    if (!selected || selected.collected) return noOp();

    const correct = wordIndex === state.nextWordIndex;
    accountant.recordAttempt({ correct });
    state.lastOutcome = correct ? "correct" : "incorrect";
    if (!correct) {
      resetSentenceChain();
      return createActionResult(snapshot(), {
        accepted: true,
        correct: false,
        progressed: false,
        terminal: false,
        completed: false,
        event: "chain-reset",
      });
    }

    state.words = state.words.map((candidate) => candidate.wordIndex === wordIndex
      ? { ...candidate, collected: true }
      : candidate);
    state.player = { ...state.player, inventory: [...state.player.inventory, selected.term] };
    state.nextWordIndex += 1;
    state.sentenceComplete = state.nextWordIndex >= state.words.length;
    state.score += 100;
    accountant.addScore(100);
    return createActionResult(snapshot(), {
      accepted: true,
      correct: true,
      progressed: true,
      terminal: false,
      completed: false,
      event: "word-collected",
    });
  };

  const move = (action: InputActionId): CastleDefenseActionResult => {
    const nextPosition = playerPositionAfterAction(state.player, action);
    state.player = {
      ...state.player,
      ...nextPosition,
    };
    if (state.phase === "collecting") {
      const nearby = state.words.find((word) => !word.collected
        && distance(state.player.x, state.player.y, word.x, word.y) <= PLAYER_RADIUS + WORD_RADIUS);
      if (nearby) return collectWord(nearby.wordIndex);
    }
    return createActionResult(snapshot(), {
      accepted: true,
      correct: false,
      progressed: false,
      terminal: false,
      completed: false,
      event: "player-moved",
    });
  };

  const buildTower = (): CastleDefenseActionResult => {
    if (state.destroyed || state.phase !== "collecting" || !state.sentenceComplete) return noOp();
    const slot = state.towerSlots.find((candidate) => !candidate.occupied
      && distance(state.player.x, state.player.y, candidate.x, candidate.y) <= BUILD_RADIUS);
    if (!slot) return noOp();
    const tower: MutableTower = {
      id: `tower:${slot.id}:wave:${state.waveIndex}`,
      slotId: slot.id,
      x: slot.x,
      y: slot.y,
      range: TOWER_RANGE,
      damage: TOWER_DAMAGE,
      lastAttackAt: 0,
      materials: [...state.player.inventory],
    };
    state.towerSlots = state.towerSlots.map((candidate) => candidate.id === slot.id
      ? { ...candidate, occupied: true }
      : candidate);
    state.towers = [...state.towers, tower];
    state.player = { ...state.player, inventory: [] };
    state.phase = "defending";
    return createActionResult(snapshot(), {
      accepted: true,
      correct: false,
      progressed: true,
      terminal: false,
      completed: false,
      event: "tower-built",
    });
  };

  const dispatch = (action: InputActionId): CastleDefenseActionResult => {
    if (state.destroyed || state.phase === "victory" || state.phase === "defeat") return noOp();
    if (action === "move-left" || action === "move-right" || action === "move-up" || action === "move-down") {
      return move(action);
    }
    if (action === "confirm") return buildTower();
    return noOp();
  };
  const choose = (action: InputActionId): CastleDefenseActionResult => dispatch(action);

  const startNextWave = (): void => {
    state.waveIndex += 1;
    state.currentSentenceIndex = state.waveIndex;
    state.currentSentence = { ...sentences[state.waveIndex]! };
    state.words = createWords(state.currentSentence, normalizedSeed, state.waveIndex);
    state.nextWordIndex = 0;
    state.sentenceComplete = false;
    state.player = { ...state.player, inventory: [] };
    // Recycle filled slots so later sentence waves can still build.
    if (state.towerSlots.every((slot) => slot.occupied)) {
      state.towerSlots = state.towerSlots.map((slot) => ({
        ...slot,
        occupied: false,
      }));
    }
    const config = waveConfig(state.waveIndex);
    state.enemies = [createEnemy(state.waveIndex, 0, normalizedSeed)];
    state.enemiesSpawned = 1;
    state.enemiesInWave = config.enemyCount;
    state.spawnTimer = 0;
    state.phase = "collecting";
  };

  const advance = (deltaMs: number): CastleDefenseSnapshot => {
    if (!Number.isFinite(deltaMs) || deltaMs < 0) throw new Error("Castle Defense delta must be nonnegative and finite");
    if (state.destroyed || state.phase === "victory" || state.phase === "defeat") return snapshot();
    if (state.phase !== "defending") return snapshot();
    state.elapsedMs += deltaMs;
    state.spawnTimer += deltaMs;

    while (state.enemiesSpawned < state.enemiesInWave && state.spawnTimer >= ENEMY_SPAWN_INTERVAL_MS) {
      state.spawnTimer -= ENEMY_SPAWN_INTERVAL_MS;
      state.enemies = [...state.enemies, createEnemy(state.waveIndex, state.enemiesSpawned, normalizedSeed)];
      state.enemiesSpawned += 1;
    }

    let baseDamage = 0;
    state.enemies = state.enemies
      .map((enemy) => {
        const progress = Math.min(1, enemy.progress + ENEMY_SPEED * deltaMs);
        const position = positionOnRoute(enemy.route, progress);
        return {
          ...enemy,
          progress,
          x: position.x,
          y: position.y,
          routeSegment: position.routeSegment,
          routeDistance: position.routeDistance,
        };
      })
      .filter((enemy) => {
        if (enemy.progress < 1) return true;
        baseDamage += enemy.baseDamage;
        return false;
      });
    if (baseDamage > 0) {
      state.base = { ...state.base, hp: Math.max(0, state.base.hp - baseDamage) };
      if (state.base.hp === 0) {
        finish("defeat");
        return snapshot();
      }
    }

    if (state.phase === "defending") {
      for (const tower of state.towers) {
        if (state.elapsedMs - tower.lastAttackAt < TOWER_ATTACK_INTERVAL_MS) continue;
        const target = state.enemies
          .filter((enemy) => distance(tower.x, tower.y, enemy.x, enemy.y) <= tower.range)
          .sort((first, second) => first.progress - second.progress)[0];
        if (!target) continue;
        tower.lastAttackAt = state.elapsedMs;
        state.enemies = state.enemies
          .map((enemy) => enemy.id === target.id ? { ...enemy, hp: enemy.hp - tower.damage } : enemy)
          .filter((enemy) => {
            if (enemy.hp > 0) return true;
            return false;
          });
      }
    }

    if (state.phase === "defending" && state.enemiesSpawned >= state.enemiesInWave && state.enemies.length === 0) {
      if (state.waveIndex + 1 >= waveCount) {
        state.waveIndex = waveCount;
        state.currentSentenceIndex = waveCount;
        state.sentenceComplete = true;
        finish("victory");
      } else {
        startNextWave();
      }
    }
    return snapshot();
  };

  const applyHazard = (): CastleDefenseActionResult => {
    if (state.destroyed || state.phase === "victory" || state.phase === "defeat") return noOp();
    state.base = { ...state.base, hp: Math.max(0, state.base.hp - 50) };
    if (state.base.hp === 0) {
      const result = finish("defeat");
      return createActionResult(snapshot(), {
        accepted: true,
        correct: false,
        progressed: false,
        terminal: true,
        completed: true,
        event: "base-hit",
        result,
      });
    }
    return createActionResult(snapshot(), {
      accepted: true,
      correct: false,
      progressed: false,
      terminal: false,
      completed: false,
      event: "base-hit",
    });
  };

  const restore = (captured: CastleDefenseSnapshot): void => {
    if (state.destroyed) return;
    if (captured === null || typeof captured !== "object") throw new Error("Castle Defense responsive state must be an object");
    if (captured.seed !== normalizedSeed || captured.waveCount !== waveCount) throw new Error("Castle Defense responsive state identity is invalid");
    if (captured.phase === "victory" || captured.phase === "defeat" || captured.destroyed) {
      throw new Error("Castle Defense cannot restore a terminal or destroyed state");
    }
    if (captured.phase !== "collecting" && captured.phase !== "defending") {
      throw new Error("Castle Defense responsive state phase is invalid");
    }
    if (captured.waveIndex < 0 || captured.waveIndex >= waveCount) throw new Error("Castle Defense active wave is invalid");
    if (captured.currentSentenceIndex !== captured.waveIndex) throw new Error("Castle Defense active sentence is invalid");
    if (captured.targetCount !== targetCount) throw new Error("Castle Defense target count is invalid");
    if (captured.currentSentence.term !== sentences[captured.waveIndex]?.term
      || captured.currentSentence.translation !== sentences[captured.waveIndex]?.translation) {
      throw new Error("Castle Defense current sentence is invalid");
    }
    if (!Number.isInteger(captured.totalAttempts) || !Number.isInteger(captured.correctAnswers)
      || captured.totalAttempts < captured.correctAnswers || captured.totalAttempts < 0 || captured.correctAnswers < 0) {
      throw new Error("Castle Defense result counters are invalid");
    }
    if (!Number.isInteger(captured.score) || captured.score < 0 || captured.score !== captured.correctAnswers * 100
      || captured.base.maxHp !== 100 || captured.base.hp < 0 || captured.base.hp > captured.base.maxHp
      || captured.lives !== captured.base.hp
      || !Number.isInteger(captured.energy) || captured.energy < 0
      || captured.energy !== captured.player.inventory.length
      || !Number.isFinite(captured.spawnTimer) || captured.spawnTimer < 0
      || !Number.isFinite(captured.elapsedMs) || captured.elapsedMs < 0) {
      throw new Error("Castle Defense responsive resources are invalid");
    }
    if (captured.nextWordIndex < 0 || captured.nextWordIndex > captured.words.length) throw new Error("Castle Defense word progress is invalid");
    const expectedTargetIndex = sentenceStartIndex(sentences, captured.waveIndex) + captured.nextWordIndex;
    if (captured.targetIndex !== expectedTargetIndex) throw new Error("Castle Defense target index is invalid");
    const expectedCorrectAction = correctActionForState(
      captured.phase,
      captured.player,
      captured.words,
      captured.sentenceComplete,
      captured.towerSlots,
    );
    if (captured.correctAction !== expectedCorrectAction
      || !Array.isArray(captured.availableActions)
      || captured.availableActions.length !== CASTLE_DEFENSE_ACTIONS.length
      || captured.availableActions.some((action, index) => action !== CASTLE_DEFENSE_ACTIONS[index])) {
      throw new Error("Castle Defense common actions are invalid");
    }
    if (captured.result !== undefined) throw new Error("Castle Defense active state cannot contain a result");
    if (captured.enemiesSpawned < 1 || captured.enemiesSpawned > captured.enemiesInWave
      || captured.enemiesInWave !== waveConfig(captured.waveIndex).enemyCount
      || captured.enemies.length > captured.enemiesSpawned) {
      throw new Error("Castle Defense enemy wave is invalid");
    }
    for (const [enemyIndex, enemy] of captured.enemies.entries()) {
      const route = routeFor(normalizedSeed, captured.waveIndex, Number(enemy.id.split(":").at(-1)) || enemyIndex);
      if (enemy.route.length !== route.length
        || enemy.route.some((point, index) => point.x !== route[index]?.x || point.y !== route[index]?.y)
        || !Number.isFinite(enemy.progress) || enemy.progress < 0 || enemy.progress > 1
        || !Number.isInteger(enemy.routeSegment) || enemy.routeSegment < 0 || enemy.routeSegment >= route.length - 1
        || !Number.isFinite(enemy.routeDistance) || enemy.routeDistance < 0 || enemy.routeDistance > routeLength(route)) {
        throw new Error("Castle Defense routed enemy state is invalid");
      }
    }
    if (captured.phase === "defending" && !captured.towers.length) throw new Error("Castle Defense defending state has no tower");
    if (completion.hasCompleted) {
      throw new Error("Castle Defense cannot restore active state after completion");
    }

    accountant = createResultAccountant();
    for (let attempt = 0; attempt < captured.totalAttempts; attempt += 1) {
      accountant.recordAttempt({ correct: attempt < captured.correctAnswers });
    }
    accountant.addScore(captured.score);
    state = {
      seed: captured.seed,
      phase: captured.phase,
      waveIndex: captured.waveIndex,
      currentSentenceIndex: captured.currentSentenceIndex,
      currentSentence: { ...captured.currentSentence },
      words: cloneWords(captured.words),
      nextWordIndex: captured.nextWordIndex,
      sentenceComplete: captured.sentenceComplete,
      player: { ...captured.player, inventory: [...captured.player.inventory] },
      towerSlots: cloneSlots(captured.towerSlots),
      towers: cloneTowers(captured.towers),
      enemies: cloneEnemies(captured.enemies),
      base: { ...captured.base },
      enemiesSpawned: captured.enemiesSpawned,
      enemiesInWave: captured.enemiesInWave,
      spawnTimer: captured.spawnTimer,
      elapsedMs: captured.elapsedMs,
      score: captured.score,
      lastOutcome: captured.lastOutcome,
      result: captured.result,
      destroyed: captured.destroyed,
    };
  };

  return Object.freeze({
    snapshot,
    dispatch,
    choose,
    collectWord,
    advance,
    applyHazard,
    capture: snapshot,
    restore,
    destroy(): void {
      if (state.destroyed) return;
      state.destroyed = true;
      completion.sealWithoutDelivery();
    },
  });
}

function dimensions(scene: PhaserSceneLike): { width: number; height: number } {
  return {
    width: scene.scale?.width ?? CASTLE_DEFENSE_CANVAS.width,
    height: scene.scale?.height ?? CASTLE_DEFENSE_CANVAS.height,
  };
}

function pointerInScene(scene: PhaserSceneLike, x: number, y: number): { x: number; y: number } {
  const { width, height } = dimensions(scene);
  const rect = scene.game?.canvas?.getBoundingClientRect?.();
  if (!rect || rect.width <= 0) return { x, y };
  return {
    x: (x - rect.left) * (width / rect.width) * (CASTLE_DEFENSE_CANVAS.width / width),
    y: (y - (rect.top ?? 0)) * (CASTLE_DEFENSE_CANVAS.height / (rect.height && rect.height > 0 ? rect.height : height)),
  };
}

function directionToPoint(
  player: Readonly<{ readonly x: number; readonly y: number }>,
  point: Readonly<{ readonly x: number; readonly y: number }>,
): InputActionId | undefined {
  const horizontal = point.x - player.x;
  const vertical = point.y - player.y;
  if (horizontal === 0 && vertical === 0) return undefined;
  if (Math.abs(horizontal) >= Math.abs(vertical)) return horizontal > 0 ? "move-right" : "move-left";
  return vertical > 0 ? "move-down" : "move-up";
}

function createScene(context: CastleDefenseSceneContext): Readonly<Record<string, unknown>> {
  let resources: SceneResources | undefined;
  let composition = context.composition;
  let previousKeys = new Set<string>();
  let animationMs = 0;
  let cleaned = false;
  const normalize = createInputActionNormalizer({
    keyboard: CASTLE_DEFENSE_KEYBOARD_BINDINGS,
    pointerTap: { action: "confirm" },
    pointerDrag: {
      leftAction: "move-left",
      rightAction: "move-right",
      upAction: "move-up",
      downAction: "move-down",
      threshold: 24,
    },
  });
  const frameScheduler = createBoundedFrameScheduler((deltaMs) => {
    animationMs = (animationMs + deltaMs) % 2_000;
  });

  const updateView = (scene: PhaserSceneLike): void => {
    if (!resources) return;
    const active = resources;
    const { width, height } = dimensions(scene);
    const scaleX = width / CASTLE_DEFENSE_CANVAS.width;
    const scaleY = height / CASTLE_DEFENSE_CANVAS.height;
    const point = (x: number, y: number) => ({ x: x * scaleX, y: y * scaleY });
    const state = context.controller.snapshot();
    active.graphics.clear().fillStyle(0x101b2d, 1).fillRect(0, 0, width, height);
    active.graphics.fillStyle(0x243b53, 0.95).fillRoundedRect(width * 0.04, height * 0.12, width * 0.92, height * 0.78, 20);
    const route = state.enemies[0]?.route
      ?? routeFor(state.seed, Math.min(state.waveIndex, Math.max(0, state.waveCount - 1)), 0);
    const roadWidth = 34 * Math.min(scaleX, scaleY);
    active.graphics.fillStyle(0x4b5563, 1);
    for (let index = 0; index < route.length - 1; index += 1) {
      const start = point(route[index]!.x, route[index]!.y);
      const end = point(route[index + 1]!.x, route[index + 1]!.y);
      if (start.y === end.y) {
        active.graphics.fillRect(Math.min(start.x, end.x), start.y - roadWidth / 2, Math.abs(end.x - start.x), roadWidth);
      } else {
        active.graphics.fillRect(start.x - roadWidth / 2, Math.min(start.y, end.y), roadWidth, Math.abs(end.y - start.y));
      }
    }

    for (const slot of state.towerSlots) {
      const position = point(slot.x, slot.y);
      active.graphics.fillStyle(slot.occupied ? 0xe0a458 : 0x64748b, slot.occupied ? 0.95 : 0.65).fillCircle(position.x, position.y, slot.radius * Math.min(scaleX, scaleY));
      active.graphics.lineStyle(2, 0xf8fafc, 0.65).strokeRoundedRect(position.x - 30 * scaleX, position.y - 30 * scaleY, 60 * scaleX, 60 * scaleY, 8);
    }
    for (const word of state.words) {
      if (word.collected) continue;
      const position = point(word.x, word.y);
      active.graphics.fillStyle(0x9b5de5, 0.9).fillRoundedRect(position.x - 36 * scaleX, position.y - 24 * scaleY, 72 * scaleX, 48 * scaleY, 10);
      active.graphics.lineStyle(2, 0xfef3c7, 0.85).strokeRoundedRect(position.x - 36 * scaleX, position.y - 24 * scaleY, 72 * scaleX, 48 * scaleY, 10);
      let label = active.wordLabels.get(word.id);
      if (!label) {
        label = scene.add?.text(0, 0, word.term, { fontFamily: "Arial", color: "#fff7ed", fontSize: "14px", align: "center", wordWrap: { width: 64 } });
        if (label) active.wordLabels.set(word.id, label);
      }
      label?.setText(word.term).setPosition(position.x - 30 * scaleX, position.y - 8 * scaleY);
    }
    const visibleWordIds = new Set(state.words.filter((word) => !word.collected).map((word) => word.id));
    for (const [id, label] of active.wordLabels) {
      if (visibleWordIds.has(id)) continue;
      label.destroy();
      active.wordLabels.delete(id);
    }
    for (const tower of state.towers) {
      const position = point(tower.x, tower.y);
      active.graphics.fillStyle(0xf59e0b, 1).fillCircle(position.x, position.y, 19 * Math.min(scaleX, scaleY));
    }
    for (const enemy of state.enemies) {
      const position = point(enemy.x, enemy.y);
      active.graphics.fillStyle(enemy.type === "boss" ? 0xef4444 : enemy.type === "tank" ? 0xf97316 : 0xdc2626, 1).fillCircle(position.x, position.y, 16 * Math.min(scaleX, scaleY));
    }
    const base = point(state.base.x, state.base.y);
    active.graphics.fillStyle(0x38bdf8, 1).fillCircle(base.x, base.y, 33 * Math.min(scaleX, scaleY));
    const player = point(state.player.x, state.player.y);
    const pulse = Math.sin(animationMs / 2_000 * Math.PI * 2) * 2;
    active.graphics.fillStyle(0x7bdff2, 1).fillCircle(player.x, player.y + pulse, PLAYER_RADIUS * Math.min(scaleX, scaleY));

    active.title.setText("CASTLE DEFENSE").setPosition(24, 18);
    active.prompt.setText(`Prisoners: ${state.prompt}`).setPosition(24, 56);
    active.status.setText(`${composition?.profile === "compact" ? "Compact" : "Wide"}  |  Wave ${state.wave}/${state.waveCount}  |  Words ${state.targetIndex}/${state.targetCount}  |  Base ${state.base.hp}/${state.base.maxHp}  |  Towers ${state.towers.length}`).setPosition(24, 92);
    active.feedback.setText(state.phase === "victory"
      ? "Every sentence wave is defended. Victory!"
      : state.phase === "defeat"
        ? "The castle has fallen."
        : state.lastOutcome === "incorrect"
          ? "That prisoner is out of order. The current chain resets."
          : state.sentenceComplete
            ? "The chain is complete. Move near a slot and confirm to build."
            : "Collect the glowing prisoners in sentence order.").setPosition(24, height - 68);
    active.instructions.setText("Keyboard: A/D/W/S or Arrow keys to move  |  Space or Enter to build  |  Swipe or tap").setPosition(24, height - 36);
  };

  const processInput = (scene: PhaserSceneLike): void => {
    const input = context.inputController.snapshot();
    const pressed = input.pressed ?? input.keys.filter((key) => !previousKeys.has(key));
    previousKeys = new Set(input.keys);
    for (const code of pressed) {
      const action = normalize({ modality: "keyboard", code })[0]?.action;
      if (action) context.controller.choose(action);
    }
    if (!input.pointer.released || input.pointer.cancelled) return;
    const pointer = pointerInScene(scene, input.pointer.x, input.pointer.y);
    const dragActions = normalize({
      modality: "pointer",
      phase: "drag",
      x: pointer.x,
      y: pointer.y,
      deltaX: input.pointer.x - input.pointer.startX,
      deltaY: input.pointer.y - input.pointer.startY,
    });
    if (dragActions[0]) {
      context.controller.choose(dragActions[0].action);
      return;
    }
    const state = context.controller.snapshot();
    if (state.phase === "collecting" && state.sentenceComplete
      && state.towerSlots.some((slot) => !slot.occupied
        && distance(state.player.x, state.player.y, slot.x, slot.y) <= BUILD_RADIUS)) {
      context.controller.choose("confirm");
      return;
    }
    if (state.phase === "collecting") {
      const direction = directionToPoint(state.player, pointer);
      if (direction) context.controller.choose(direction);
      return;
    }
    if (normalize({ modality: "pointer", phase: "up", x: pointer.x, y: pointer.y })[0]?.action === "confirm") {
      context.controller.choose("confirm");
    }
  };

  const cleanup = (): void => {
    if (cleaned) return;
    cleaned = true;
    frameScheduler.cancel();
    context.controller.destroy();
    const active = resources;
    resources = undefined;
    previousKeys = new Set<string>();
    if (!active) return;
    active.graphics.destroy();
    active.title.destroy();
    active.prompt.destroy();
    active.status.destroy();
    active.feedback.destroy();
    active.instructions.destroy();
    for (const label of active.wordLabels.values()) label.destroy();
    active.wordLabels.clear();
  };

  const create = function (this: PhaserSceneLike): void {
    if (resources) return;
    if (!this.add) throw new Error("Castle Defense requires Phaser display services");
    const textWidth = Math.max(220, (context.composition?.safeRect?.width ?? CASTLE_DEFENSE_CANVAS.width) - 48);
    const style = { fontFamily: "Arial", color: "#ffffff", fontSize: "18px", wordWrap: { width: textWidth } };
    resources = {
      graphics: this.add.graphics(),
      title: this.add.text(0, 0, "", { ...style, fontSize: "29px", fontStyle: "bold" }),
      prompt: this.add.text(0, 0, "", { ...style, fontSize: "22px" }),
      status: this.add.text(0, 0, "", { ...style, fontSize: "15px", color: "#dbeafe" }),
      feedback: this.add.text(0, 0, "", { ...style, fontSize: "16px", color: "#fde68a" }),
      instructions: this.add.text(0, 0, "", { ...style, fontSize: "14px", color: "#cbd5e1" }),
      wordLabels: new Map(),
    };
    this.events?.once("shutdown", cleanup);
    this.events?.once("destroy", cleanup);
    updateView(this);
  };

  const update = function (this: PhaserSceneLike, _time = 0, delta = 0): void {
    if (!resources) return;
    frameScheduler.tick(delta);
    if (context.sessionMode === "playing") {
      processInput(this);
      context.controller.advance(Math.min(delta, 50));
    }
    updateView(this);
  };

  return {
    key: "castle-defense",
    create,
    update,
    extend: {
      apkCaptureResponsiveState: () => context.controller.capture(),
      apkRestoreResponsiveState: (captured: unknown) => {
        if (typeof captured !== "object" || captured === null) throw new Error("Castle Defense responsive state is invalid");
        context.controller.restore(captured as CastleDefenseSnapshot);
      },
      apkRecompose: (nextComposition: CastleDefenseSceneContext["composition"]) => {
        composition = nextComposition;
      },
    },
  };
}

/**
 * Creates the standard Castle Defense Phaser cartridge with its procedural scene.
 * @returns A sentence-mode cartridge with briefing, tutorial, gameplay, and debrief lifecycle.
 */
export function createCastleDefenseCartridge(): StandardExperienceCartridge {
  let activeController: CastleDefenseController | undefined;
  const standardExperience = createCartridgeStandardExperience({
    id: "castle-defense",
    title: "Castle Defense",
    description: "Build a castle defense by placing sentence words in order.",
    inputMode: "sentence",
    objective: "Place every sentence word in order before the castle falls.",
    mechanicInstruction: "Move through the four defense directions, collect each prisoner word in order, and confirm near a slot to build.",
    keyboardKeys: ["A", "D", "W", "S", "Arrow keys", "Space"],
    executeTutorialAction: (actionId) => {
      const controller = activeController;
      if (!controller) return;
      const state = controller.snapshot();
      if (state.phase !== "collecting") return;
      if (actionId === "action:select-correct") {
        controller.collectWord(state.nextWordIndex);
        return;
      }
      const wrongIndex = state.nextWordIndex + 1 < state.targetCount ? state.nextWordIndex + 1 : state.nextWordIndex;
      controller.collectWord(wrongIndex);
    },
  });

  return {
    manifest: {
      id: "castle-defense",
      title: "Castle Defense",
      description: "Build a castle defense by placing sentence words in order.",
      version: "0.1.0",
      runtimeApiVersion: "1.0.0",
      inputMode: "sentence",
      requiredAssetBindings: ["legacy-catalog/castle-defense/fortress"],
      capabilities: [
        "capability:four-direction-defense",
        "capability:sentence-chain-reset",
        "capability:castle-health-hazards",
      ],
    },
    standardExperience,
    createGameConfig(context: CartridgeGameConfigContext): Readonly<Record<string, unknown>> {
      const input = sentenceInputSchema.parse(context.input);
      const sessionMode = context.sessionMode ?? "playing";
      const controller = createCastleDefenseController(
        input,
        sessionMode === "playing" ? (result, outcome) => context.complete(result, outcome) : () => undefined,
        context.seed ?? 0,
      );
      activeController = controller;
      context.diagnostic({
        level: "debug",
        code: "CASTLE_DEFENSE_READY",
        message: "Castle Defense procedural defense scene is ready.",
        details: {
          cartridgeId: "castle-defense",
          editionId: context.edition.id,
          sentenceCount: input.length,
          seed: context.seed ?? 0,
        },
      });
      return {
        width: CASTLE_DEFENSE_CANVAS.width,
        height: CASTLE_DEFENSE_CANVAS.height,
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
