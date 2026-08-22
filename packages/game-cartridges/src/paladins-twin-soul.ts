import {
  gameResultsSchema,
  vocabularyInputSchema,
  type GameResults,
  type VocabularyItem,
} from "@reading-advantage/game-contracts";
import {
  createActorSpriteLayer,
  createBoundedFrameScheduler,
  createCompletionLatch,
  createInputActionNormalizer,
  createLanguageTargetProgression,
  createResultAccountant,
  finalizeResult,
  preloadAssetBindings,
  validateNonEmptyContent,
  type ActorSpriteLayer,
  type ActorSpriteLike,
  type APKInputController,
  type CartridgeGameConfigContext,
  type GameTerminalOutcome,
  type InputActionId,
  type RuntimeEdition,
} from "@reading-advantage/advantage-play-kit";
import type { StandardExperienceCartridge } from "@reading-advantage/advantage-play-kit/presentation";

import { createCartridgeStandardExperience } from "./standard-experience.js";

/** Stable public identifier for Paladin's Twin-Soul. */
export const PALADINS_TWIN_SOUL_ID = "paladins-twin-soul" as const;

/** Phaser canvas size used before the host applies responsive scaling. */
export const PALADINS_TWIN_SOUL_CANVAS = Object.freeze({ width: 960, height: 540 });

/** Keyboard codes accepted by the horizontal paladin controller. */
export const PALADINS_TWIN_SOUL_KEYBOARD_BINDINGS: Readonly<Record<string, InputActionId>> = Object.freeze({
  ArrowLeft: "move-left",
  KeyA: "move-left",
  ArrowRight: "move-right",
  KeyD: "move-right",
  Space: "confirm",
  Enter: "confirm",
});

/** Deterministic timing and size rules for Paladin's Twin-Soul. */
export const PALADINS_TWIN_SOUL_RULES = Object.freeze({
  formationRows: 4,
  formationColumns: 6,
  playerY: 468,
  playerSpeed: 360,
  playerRadius: 22,
  initialHp: 3,
  playerFireIntervalMs: 500,
  playerBulletSpeed: 460,
  enemyFireIntervalMs: 900,
  enemyBulletSpeed: 250,
  enemyMovementSpeed: 42,
  formationTravel: 72,
  captureDelayMs: 900,
  captureTravelMs: 300,
  enemyWidth: 68,
  enemyHeight: 48,
  scorePerCorrectEnemy: 100,
  xpPerCorrect: 20,
  xpPerAccuracyPoint: 10,
});

/** Horizontal movement supplied to one controller tick. */
export type PaladinMovement = -1 | 0 | 1;

/** Active or terminal Paladin's Twin-Soul phase. */
export type PaladinsTwinSoulPhase = "playing" | "victory" | "defeat";

/** Completion callback that receives the terminal result and explicit game outcome. */
export type PaladinsTwinSoulCompletionDelivery = (
  result: GameResults,
  outcome: Exclude<GameTerminalOutcome, "complete">,
) => void | Promise<void>;

/** One vocabulary-labeled enemy in the deterministic formation. */
export interface PaladinsTwinSoulEnemySnapshot {
  /** Stable identity within the current wave. */
  readonly id: string;
  /** Formation row. */
  readonly row: number;
  /** Formation column. */
  readonly column: number;
  /** Current horizontal position. */
  readonly x: number;
  /** Current vertical position. */
  readonly y: number;
  /** Vocabulary term shown below the enemy. */
  readonly term: string;
  /** Translation associated with the displayed term. */
  readonly translation: string;
  /** Whether this enemy is making the capture approach. */
  readonly isCapturing: boolean;
  /** Whether this enemy currently holds the twin soul. */
  readonly hasCapturedTwin: boolean;
  /** Capture approach start time retained for responsive restore. */
  readonly captureStartedAt?: number;
}

/** One player or enemy projectile in the arena. */
export interface PaladinsTwinSoulBulletSnapshot {
  /** Stable projectile identity. */
  readonly id: string;
  /** Current horizontal position. */
  readonly x: number;
  /** Current vertical position. */
  readonly y: number;
  /** Whether the projectile belongs to the paladin. */
  readonly isPlayer: boolean;
}

/** Player state exposed to the renderer and responsive host. */
export interface PaladinsTwinSoulPlayerSnapshot {
  /** Current horizontal position. */
  readonly x: number;
  /** Current hit points. */
  readonly hp: number;
  /** Starting hit points. */
  readonly maxHp: number;
  /** Whether the player has rescued the twin soul. */
  readonly hasTwinSoul: boolean;
  /** Whether the captor currently holds the player. */
  readonly isCaptured: boolean;
  /** Number of bullets emitted by each timed volley. */
  readonly fireStrength: number;
}

/** Immutable state exposed by the Paladin's Twin-Soul rules. */
export interface PaladinsTwinSoulSnapshot {
  /** Current active or terminal phase. */
  readonly phase: PaladinsTwinSoulPhase;
  /** Current wave number, starting at one. */
  readonly wave: number;
  /** Index of the vocabulary target represented by the current formation. */
  readonly targetIndex: number;
  /** Number of vocabulary target waves. */
  readonly targetCount: number;
  /** Current term represented by the correct enemy. */
  readonly targetTerm: string;
  /** Translation-only prompt shown to the learner. */
  readonly prompt: string;
  /** Answer represented by the correct enemy. */
  readonly answer: string;
  /** Stable action identity for the correct enemy. */
  readonly correctAction: string;
  /** Semantic and enemy actions accepted by the controller. */
  readonly availableActions: readonly string[];
  /** Host seed used for formation and hazard order. */
  readonly seed: number;
  /** Player state. */
  readonly player: PaladinsTwinSoulPlayerSnapshot;
  /** Current deterministic formation. */
  readonly enemies: readonly PaladinsTwinSoulEnemySnapshot[];
  /** Current player and enemy projectiles. */
  readonly bullets: readonly PaladinsTwinSoulBulletSnapshot[];
  /** Elapsed gameplay time. */
  readonly gameTime: number;
  /** Formation horizontal offset. */
  readonly formationOffset: number;
  /** Formation travel direction. */
  readonly formationDirection: -1 | 1;
  /** Time of the most recent player volley. */
  readonly lastPlayerFireAt: number;
  /** Time of the most recent enemy volley. */
  readonly lastEnemyFireAt: number;
  /** Whether the current wave has used its capture attempt. */
  readonly captureUsed: boolean;
  /** Whether the current wave has hit its correct enemy. */
  readonly waveCorrect: boolean;
  /** Scheduled start of the current wave capture attempt. */
  readonly nextCaptureAt: number;
  /** Next deterministic projectile sequence number. */
  readonly nextBulletSequence: number;
  /** Result of the most recent enemy collision. */
  readonly lastOutcome?: "correct" | "incorrect";
  /** Correct vocabulary waves cleared. */
  readonly correctAnswers: number;
  /** Target waves recorded as learning attempts. */
  readonly totalAttempts: number;
  /** Current hit points represented by the shared lives field. */
  readonly lives: number;
  /** Current rescue fire strength represented by the shared energy field. */
  readonly energy: number;
  /** First terminal result, when the session is terminal. */
  readonly result?: GameResults;
  /** Current score. */
  readonly score: number;
  /** Whether cleanup has sealed the session. */
  readonly destroyed: boolean;
}

/** Transport-independent Paladin's Twin-Soul controller. */
export interface PaladinsTwinSoulController {
  /** Returns the current immutable state. */
  snapshot(): PaladinsTwinSoulSnapshot;
  /** Applies one semantic movement, confirmation, or enemy action. */
  choose(action: InputActionId | string): PaladinsTwinSoulChooseResult;
  /** Applies one direct counterfire hazard. */
  applyHazard(): PaladinsTwinSoulChooseResult;
  /** Advances movement, timed projectiles, captures, collisions, and waves. */
  tick(deltaMs: number, movement?: PaladinMovement): PaladinsTwinSoulSnapshot;
  /** Captures state before a responsive runtime transition. */
  capture(): PaladinsTwinSoulSnapshot;
  /** Restores a validated responsive state. */
  restore(snapshot: PaladinsTwinSoulSnapshot): void;
  /** Seals the session and prevents later result delivery. */
  destroy(): void;
}

/** Result returned after one Paladin's Twin-Soul action. */
export interface PaladinsTwinSoulChooseResult {
  /** Whether the action changed the active session. */
  readonly accepted: boolean;
  /** Whether the action hit the current correct enemy. */
  readonly correct: boolean;
  /** Whether the action advanced one vocabulary item. */
  readonly progressed: boolean;
  /** Whether the action produced a terminal result. */
  readonly terminal: boolean;
  /** Compatibility alias for terminal. */
  readonly completed: boolean;
  /** First terminal result, when this action produced one. */
  readonly result?: GameResults;
  /** State after applying the action. */
  readonly snapshot: PaladinsTwinSoulSnapshot;
}

/** Optional deterministic controller settings. */
export interface PaladinsTwinSoulControllerOptions {
  /** Nonnegative host seed used for formations and hazards. */
  readonly seed?: number;
}

interface MutableEnemy {
  id: string;
  row: number;
  column: number;
  x: number;
  y: number;
  term: string;
  translation: string;
  isCapturing: boolean;
  hasCapturedTwin: boolean;
  captureStartedAt?: number;
}

type MutableBullet = {
  id: string;
  x: number;
  y: number;
  isPlayer: boolean;
};

interface MutablePlayer {
  x: number;
  hp: number;
  hasTwinSoul: boolean;
  isCaptured: boolean;
  fireStrength: number;
}

interface MutableGameState {
  phase: PaladinsTwinSoulPhase;
  wave: number;
  targetIndex: number;
  player: MutablePlayer;
  enemies: MutableEnemy[];
  bullets: MutableBullet[];
  gameTime: number;
  formationOffset: number;
  formationDirection: -1 | 1;
  lastPlayerFireAt: number;
  lastEnemyFireAt: number;
  nextCaptureAt: number;
  seed: number;
  nextBulletSequence: number;
  captureUsed: boolean;
  waveCorrect: boolean;
  lastOutcome?: "correct" | "incorrect";
  destroyed: boolean;
}

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

interface PhaserTextLike {
  setPosition(x: number, y: number): this;
  setText(value: string): this;
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
  add?: {
    graphics(): PhaserGraphicsLike;
    text(x: number, y: number, value: string, style?: Readonly<Record<string, unknown>>): PhaserTextLike;
    image?(x: number, y: number, key: string, frame?: number): ActorSpriteLike;
    sprite?(x: number, y: number, key: string, frame?: number): ActorSpriteLike;
    tileSprite?(x: number, y: number, width: number, height: number, key: string): ActorSpriteLike;
  };
  load?: {
    image?(key: string, url: string): unknown;
    spritesheet?(key: string, url: string, config: { frameWidth: number; frameHeight: number }): unknown;
    audio?(key: string, urls: string | string[]): unknown;
  };
  events?: { once(event: string, listener: () => void): void };
  game?: { readonly canvas?: PhaserCanvasLike };
  scale?: { readonly width?: number; readonly height?: number };
}

interface SceneResources {
  readonly art: ActorSpriteLayer;
  readonly graphics: PhaserGraphicsLike;
  readonly title: PhaserTextLike;
  readonly prompt: PhaserTextLike;
  readonly progress: PhaserTextLike;
  readonly feedback: PhaserTextLike;
  readonly instructions: PhaserTextLike;
  readonly enemyLabels: readonly PhaserTextLike[];
}

interface PaladinsTwinSoulResponsiveState {
  readonly game: PaladinsTwinSoulSnapshot;
}

interface PaladinsTwinSoulSceneContext {
  readonly edition: RuntimeEdition;
  readonly controller: PaladinsTwinSoulController;
  readonly inputController: APKInputController;
  readonly composition: CartridgeGameConfigContext["composition"];
  readonly diagnostic: CartridgeGameConfigContext["diagnostic"];
  readonly sessionMode: NonNullable<CartridgeGameConfigContext["sessionMode"]>;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}

function finiteDelta(deltaMs: number): number {
  if (!Number.isFinite(deltaMs) || deltaMs < 0) {
    throw new Error("Paladin's Twin-Soul delta must be a nonnegative finite number");
  }
  return deltaMs;
}

function seededIndex(seed: number, ...parts: number[]): number {
  let value = (seed + 0x9e3779b9) | 0;
  for (const part of parts) value = Math.imul(value ^ (part | 0), 0x45d9f3b);
  value ^= value >>> 16;
  return value >>> 0;
}

function formationSeedOffset(seed: number, wave: number, targetIndex: number): number {
  return (seededIndex(seed, wave, targetIndex) % 49) - 24;
}

function captorColumn(): number {
  return Math.floor((PALADINS_TWIN_SOUL_RULES.formationColumns - 1) / 2);
}

function targetRow(): number {
  return PALADINS_TWIN_SOUL_RULES.formationRows - 1;
}

function targetColumn(seed: number, wave: number, targetIndex: number): number {
  return seededIndex(seed, wave, targetIndex, 0x51) % PALADINS_TWIN_SOUL_RULES.formationColumns;
}

function targetEnemyId(wave: number, seed: number, targetIndex: number): string {
  return `wave-${wave}-enemy-${targetRow()}-${targetColumn(seed, wave, targetIndex)}`;
}

function freezeEnemy(enemy: MutableEnemy): PaladinsTwinSoulEnemySnapshot {
  return Object.freeze({
    id: enemy.id,
    row: enemy.row,
    column: enemy.column,
    x: enemy.x,
    y: enemy.y,
    term: enemy.term,
    translation: enemy.translation,
    isCapturing: enemy.isCapturing,
    hasCapturedTwin: enemy.hasCapturedTwin,
    ...(enemy.captureStartedAt === undefined ? {} : { captureStartedAt: enemy.captureStartedAt }),
  });
}

function freezeBullet(bullet: MutableBullet): PaladinsTwinSoulBulletSnapshot {
  return Object.freeze({ ...bullet });
}

function isResponsiveState(value: unknown): value is PaladinsTwinSoulResponsiveState {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<PaladinsTwinSoulResponsiveState>;
  return typeof candidate.game === "object" && candidate.game !== null;
}

function createFormation(
  items: readonly VocabularyItem[],
  targetIndex: number,
  wave: number,
  seed: number,
): MutableEnemy[] {
  const target = items[targetIndex]!;
  const enemies: MutableEnemy[] = [];
  const top = 132;
  const answerRow = targetRow();
  const answerColumn = targetColumn(seed, wave, targetIndex);
  const offset = formationSeedOffset(seed, wave, targetIndex);
  const distractors = items.filter((_item, index) => index !== targetIndex);
  const distinctDistractors = distractors.filter((item) => item.term !== target.term);
  const distractorPool = distinctDistractors.length > 0
    ? distinctDistractors
    : (distractors.length > 0 ? distractors : [target]);

  for (let row = 0; row < PALADINS_TWIN_SOUL_RULES.formationRows; row += 1) {
    for (let column = 0; column < PALADINS_TWIN_SOUL_RULES.formationColumns; column += 1) {
      const isAnswer = row === answerRow && column === answerColumn;
      const distractor = distractorPool[seededIndex(seed, wave, targetIndex, row, column) % distractorPool.length]!;
      const item = isAnswer ? target : distractor;
      enemies.push({
        id: `wave-${wave}-enemy-${row}-${column}`,
        row,
        column,
        x: formationBaseX(column) + offset,
        y: top + row * 76,
        term: item.term,
        translation: item.translation,
        isCapturing: false,
        hasCapturedTwin: false,
      });
    }
  }
  return enemies;
}

function formationBaseX(column: number): number {
  const spacing = 120;
  const formationWidth = (PALADINS_TWIN_SOUL_RULES.formationColumns - 1) * spacing;
  return PALADINS_TWIN_SOUL_CANVAS.width / 2 - formationWidth / 2 + column * spacing;
}

function enemyCenterX(enemy: MutableEnemy): number {
  return enemy.x;
}

function playerVolley(
  state: MutableGameState,
  fireAt: number,
  sequence: number,
): MutableBullet[] {
  const offsets = state.player.fireStrength === 2 ? [-14, 14] : [0];
  return offsets.map((offset, index) => ({
    id: `player-bullet-${fireAt}-${sequence}-${index}`,
    x: state.player.x + offset,
    y: PALADINS_TWIN_SOUL_RULES.playerY - 30,
    isPlayer: true,
  }));
}

function inEnemyHitbox(enemy: MutableEnemy, bullet: MutableBullet): boolean {
  return Math.abs(enemyCenterX(enemy) - bullet.x) <= PALADINS_TWIN_SOUL_RULES.enemyWidth / 2
    && Math.abs(enemy.y - bullet.y) <= PALADINS_TWIN_SOUL_RULES.enemyHeight / 2;
}

/**
 * Resolves one player-bullet collision, preferring the current target over decoys.
 * @param state Mutable session used to identify the current target and captor.
 * @param bullet Player projectile being tested against the formation.
 * @returns The enemy this shot should score, or undefined when the bullet should pass through.
 */
function playerBulletHit(state: MutableGameState, bullet: MutableBullet): MutableEnemy | undefined {
  const targetId = targetEnemyId(state.wave, state.seed, state.targetIndex);
  const target = state.enemies.find((enemy) => enemy.id === targetId);
  const hits = state.enemies.filter((enemy) => inEnemyHitbox(enemy, bullet));
  const targetHit = hits.find((enemy) => enemy.id === targetId);
  if (targetHit) return targetHit;
  const captorHit = hits.find((enemy) => enemy.hasCapturedTwin);
  if (captorHit) return captorHit;
  const inTargetColumn = target !== undefined
    && Math.abs(enemyCenterX(target) - bullet.x) <= PALADINS_TWIN_SOUL_RULES.enemyWidth / 2;
  if (inTargetColumn) return undefined;
  const captor = state.enemies.find((enemy) => enemy.hasCapturedTwin);
  const inCaptorColumn = captor !== undefined
    && Math.abs(enemyCenterX(captor) - bullet.x) <= PALADINS_TWIN_SOUL_RULES.enemyWidth / 2;
  if (inCaptorColumn) return undefined;
  if (hits.length === 0) return undefined;
  return hits.reduce((closest, enemy) => enemy.y > closest.y ? enemy : closest);
}

function enemyVolley(source: MutableEnemy, fireAt: number, targetX: number, sequence: number, seed: number): MutableBullet {
  return {
    id: `enemy-bullet-${fireAt}-${sequence}-${seed}`,
    x: targetX,
    y: source.y + 28,
    isPlayer: false,
  };
}

function counterfireTargetX(seed: number, sequence: number, playerX: number): number {
  return playerX + (seededIndex(seed, sequence) % 3 - 1) * 8;
}

function resultFor(
  accountant: ReturnType<typeof createResultAccountant>,
): GameResults {
  return gameResultsSchema.parse(finalizeResult(accountant, {
    xpPerCorrect: PALADINS_TWIN_SOUL_RULES.xpPerCorrect,
    xpPerAccuracyPoint: PALADINS_TWIN_SOUL_RULES.xpPerAccuracyPoint,
  }));
}

function createScene(context: PaladinsTwinSoulSceneContext): Readonly<Record<string, unknown>> {
  let resources: SceneResources | undefined;
  let composition = context.composition;
  let previousKeys = new Set<string>();
  let currentDimensions: { width: number; height: number } = { ...PALADINS_TWIN_SOUL_CANVAS };
  let currentPointerInScene = (clientX: number, clientY: number): Readonly<{ x: number; y: number }> => ({
    x: clientX,
    y: clientY,
  });
  const frameScheduler = createBoundedFrameScheduler((deltaMs) => {
    if (context.sessionMode !== "playing") return;
    const input = context.inputController.snapshot();
    const pressed = input.pressed ?? input.keys.filter((key) => !previousKeys.has(key));
    previousKeys = new Set(input.keys);
    let movement: PaladinMovement = 0;
    let confirmed = false;

    for (const code of pressed) {
      const action = normalize({ modality: "keyboard", code })[0]?.action;
      if (action === "move-left") movement = -1;
      if (action === "move-right") movement = 1;
      if (action === "confirm") confirmed = true;
    }
    for (const code of input.keys) {
      const action = normalize({ modality: "keyboard", code })[0]?.action;
      if (action === "move-left") movement = -1;
      if (action === "move-right") movement = 1;
    }

    if (input.pointer.down || input.pointer.released) {
      const pointer = currentPointerInScene(input.pointer.x, input.pointer.y);
      const direction = pointer.x < currentDimensions.width / 2 ? -1 : 1;
      const drag = normalize({
        modality: "pointer",
        phase: "drag",
        x: pointer.x,
        y: pointer.y,
        deltaX: input.pointer.x - input.pointer.startX,
        deltaY: input.pointer.y - input.pointer.startY,
      })[0]?.action;
      movement = drag === "move-left" ? -1 : drag === "move-right" ? 1 : direction;
    }

    const before = context.controller.snapshot();
    if (confirmed) context.controller.choose("confirm");
    if (input.pointer.released && !input.pointer.cancelled) {
      const pointer = currentPointerInScene(input.pointer.x, input.pointer.y);
      const pointerAction = normalize({
        modality: "pointer",
        phase: "up",
        x: pointer.x,
        y: pointer.y,
      })[0]?.action;
      if (pointerAction === "confirm") context.controller.choose(pointerAction);
    }
    const after = context.controller.tick(deltaMs, movement);
    if (after.lastOutcome !== before.lastOutcome || after.phase !== before.phase) {
      context.diagnostic({
        level: "info",
        code: after.phase === "victory" ? "PALADINS_TWIN_SOUL_VICTORY" : after.phase === "defeat" ? "PALADINS_TWIN_SOUL_DEFEAT" : "PALADINS_TWIN_SOUL_HIT",
        message: after.phase === "victory" ? "Paladin's Twin-Soul cleared every target wave." : after.phase === "defeat" ? "Paladin's Twin-Soul lost all hit points." : "Paladin's Twin-Soul recorded an enemy hit.",
        details: { correct: after.lastOutcome === "correct", targetIndex: after.targetIndex },
      });
    }
  });

  const normalize = createInputActionNormalizer({
    keyboard: PALADINS_TWIN_SOUL_KEYBOARD_BINDINGS,
    pointerTap: { action: "confirm" },
    pointerDrag: { leftAction: "move-left", rightAction: "move-right", threshold: 8 },
  });

  const getDimensions = (scene: PhaserSceneLike): { width: number; height: number } => ({
    width: scene.scale?.width ?? PALADINS_TWIN_SOUL_CANVAS.width,
    height: scene.scale?.height ?? PALADINS_TWIN_SOUL_CANVAS.height,
  });

  const pointerInScene = (
    scene: PhaserSceneLike,
    clientX: number,
    clientY: number,
    width: number,
    height: number,
  ): Readonly<{ x: number; y: number }> => {
    const rect = scene.game?.canvas?.getBoundingClientRect?.();
    if (!rect || rect.width <= 0 || rect.height <= 0) return { x: clientX, y: clientY };
    return {
      x: (clientX - rect.left) * (width / rect.width),
      y: (clientY - rect.top) * (height / rect.height),
    };
  };

  const updatePointerTransform = (scene: PhaserSceneLike): void => {
    currentPointerInScene = (clientX, clientY) => pointerInScene(
      scene,
      clientX,
      clientY,
      currentDimensions.width,
      currentDimensions.height,
    );
  };

  const updateView = (scene: PhaserSceneLike): void => {
    if (!resources) return;
    const view = resources;
    const art = view.art;
    const { width, height } = getDimensions(scene);
    const state = context.controller.snapshot();
    const scaleX = width / PALADINS_TWIN_SOUL_CANVAS.width;
    const scaleY = height / PALADINS_TWIN_SOUL_CANVAS.height;
    const scale = Math.min(scaleX, scaleY);
    const offsetX = (width - PALADINS_TWIN_SOUL_CANVAS.width * scale) / 2;
    const offsetY = (height - PALADINS_TWIN_SOUL_CANVAS.height * scale) / 2;
    const sceneX = (value: number) => offsetX + value * scale;
    const sceneY = (value: number) => offsetY + value * scale;

    view.graphics.clear();
    if (!art.ground("world:ground", width, height)) view.graphics.fillStyle(0x020617, 1).fillRect(0, 0, width, height);
    view.graphics.fillStyle(0x0f1d3b, 0.95).fillRoundedRect(sceneX(80), sceneY(70), 800 * scale, 400 * scale, 24 * scale);
    for (let index = 0; index < 18; index += 1) {
      view.graphics.fillStyle(index % 2 === 0 ? 0x93c5fd : 0xfef3c7, 0.45).fillCircle(
        sceneX((index * 173) % PALADINS_TWIN_SOUL_CANVAS.width),
        sceneY((index * 97) % 440),
        Math.max(1, scale * (index % 3 + 1)),
      );
    }
    state.enemies.forEach((enemy, index) => {
      const x = sceneX(enemy.x);
      const y = sceneY(enemy.y);
      if (!art.place(`enemy:${index}`, "enemy:idle", {
        x,
        y,
        width: 68 * scale,
        height: 60 * scale,
        depth: 7,
      })) {
        view.graphics
          .fillStyle(enemy.hasCapturedTwin ? 0xfbbf24 : enemy.isCapturing ? 0xa855f7 : 0xdc2626, 1)
          .fillRoundedRect(x - 34 * scale, y - 24 * scale, 68 * scale, 48 * scale, 8 * scale);
      }
      if (enemy.hasCapturedTwin) {
        view.graphics.fillStyle(0xfef3c7, 0.9).fillCircle(x, y, 10 * scale);
      }
    });
    for (const bullet of state.bullets) {
      view.graphics
        .fillStyle(bullet.isPlayer ? 0xfde047 : 0xfb7185, 1)
        .fillRoundedRect(sceneX(bullet.x) - 3 * scale, sceneY(bullet.y) - 10 * scale, 6 * scale, 20 * scale, 3 * scale);
    }
    for (const [index, enemy] of state.enemies.entries()) {
      view.enemyLabels[index]
        ?.setText(enemy.term)
        .setPosition(sceneX(enemy.x) - 34 * scale, sceneY(enemy.y) + 30 * scale);
    }
    view.enemyLabels.slice(state.enemies.length).forEach((label) => label.setText(""));
    if (!art.place("player", "player:idle", {
      x: sceneX(state.player.x),
      y: sceneY(PALADINS_TWIN_SOUL_RULES.playerY),
      width: 52 * scale,
      depth: 8,
    })) {
      view.graphics.fillStyle(0xf59e0b, 1).fillRoundedRect(
        sceneX(state.player.x) - 22 * scale,
        sceneY(PALADINS_TWIN_SOUL_RULES.playerY) - 22 * scale,
        44 * scale,
        44 * scale,
        10 * scale,
      );
    }
    art.sweep();
    if (state.player.hasTwinSoul) {
      view.graphics.fillStyle(0xfef3c7, 0.9).fillCircle(
        sceneX(state.player.x) + 30 * scale,
        sceneY(PALADINS_TWIN_SOUL_RULES.playerY),
        16 * scale,
      );
    }
    view.title.setText("PALADIN'S TWIN-SOUL").setPosition(28, 18);
    view.prompt.setText(`Translation prompt: ${state.prompt}`).setPosition(28, 54);
    view.progress.setText(
      `${composition?.profile === "compact" ? "Compact formation" : "Twin-Soul formation"}  •  Wave ${Math.min(state.wave, state.targetCount)} of ${state.targetCount}  •  HP ${state.player.hp}/${state.player.maxHp}  •  Fire x${state.player.fireStrength}`,
    ).setPosition(28, 88);
    view.feedback.setText(
      state.phase === "victory"
        ? "Every target wave is clear."
        : state.phase === "defeat"
          ? "The formation overran the paladin."
          : state.player.isCaptured
            ? "The twin is captured. Keep the paladin under fire to rescue it."
            : state.lastOutcome === "incorrect"
            ? "Wrong enemy hit. The target remains active and counterfire is incoming."
              : "Move beneath the matching enemy and confirm a shot.",
    ).setPosition(28, height - 68);
    view.instructions.setText("Keyboard: A/D or arrows move • Space confirms a shot • Touch or click to move and fire").setPosition(28, height - 36);
  };

  const cleanup = (): void => {
    if (!resources) {
      context.controller.destroy();
      return;
    }
    frameScheduler.cancel();
    context.controller.destroy();
    resources.graphics.destroy();
    resources.title.destroy();
    resources.prompt.destroy();
    resources.progress.destroy();
    resources.feedback.destroy();
    resources.instructions.destroy();
    resources.enemyLabels.forEach((label) => label.destroy());
    resources = undefined;
    previousKeys = new Set<string>();
  };


  const artKeys = ["world:ground", "player:idle", "enemy:idle"] as const;

  const preload = function (this: PhaserSceneLike): void {
    if (!this.load) return;
    preloadAssetBindings(
      this.load,
      context.edition,
      artKeys.filter((key) => context.edition.bindings[key]),
    );
  };

  const create = function (this: PhaserSceneLike): void {
    if (!this.add) throw new Error("Paladin's Twin-Soul requires Phaser display services");
    currentDimensions = getDimensions(this);
    updatePointerTransform(this);
    const textStyle = { fontFamily: "Arial", color: "#f8fbff", fontSize: "20px" };
    const add = this.add;
    resources = {
      graphics: add.graphics(),
      art: createActorSpriteLayer(this, context.edition),
      title: add.text(28, 18, "PALADIN'S TWIN-SOUL", { ...textStyle, fontSize: "30px", fontStyle: "bold" }),
      prompt: add.text(28, 54, "", { ...textStyle, fontSize: "22px" }),
      progress: add.text(28, 88, "", { ...textStyle, fontSize: "16px", color: "#bfdbfe" }),
      feedback: add.text(28, 0, "", { ...textStyle, fontSize: "17px", color: "#fde68a" }),
      instructions: add.text(28, 0, "", { ...textStyle, fontSize: "15px", color: "#cbd5e1" }),
      enemyLabels: Array.from(
        { length: PALADINS_TWIN_SOUL_RULES.formationRows * PALADINS_TWIN_SOUL_RULES.formationColumns },
        () => add.text(0, 0, "", { ...textStyle, fontSize: "14px" }),
      ),
    };
    this.events?.once("shutdown", cleanup);
    this.events?.once("destroy", cleanup);
    updateView(this);
  };

  const update = function (this: PhaserSceneLike, _time: number, delta: number): void {
    if (!resources) return;
    currentDimensions = getDimensions(this);
    updatePointerTransform(this);
    frameScheduler.tick(delta);
    updateView(this);
  };

  return {
    key: PALADINS_TWIN_SOUL_ID,
    preload,
    create,
    update,
    extend: {
      apkCaptureResponsiveState: (): PaladinsTwinSoulResponsiveState => Object.freeze({
        game: context.controller.capture(),
      }),
      apkRestoreResponsiveState: (value: unknown): void => {
        if (!isResponsiveState(value)) throw new Error("Paladin's Twin-Soul responsive state is invalid");
        context.controller.restore(value.game);
      },
      apkRecompose: (nextComposition: PaladinsTwinSoulSceneContext["composition"]): void => {
        composition = nextComposition;
      },
    },
  };
}

/**
 * Creates the Paladin's Twin-Soul controller for one vocabulary session.
 * @param input Untrusted vocabulary input from a host or test.
 * @param deliver Callback that receives the first terminal result.
 * @param options Deterministic host settings for formations and hazards.
 * @returns A deterministic confirm-to-fire formation controller.
 * @throws When the vocabulary input is invalid, empty, or blank.
 */
export function createPaladinsTwinSoulController(
  input: unknown,
  deliver: PaladinsTwinSoulCompletionDelivery,
  options: PaladinsTwinSoulControllerOptions = {},
): PaladinsTwinSoulController {
  const parsedInput = vocabularyInputSchema.parse(input);
  const content = validateNonEmptyContent(parsedInput, "vocabulary");
  const items = content.items;
  if (options.seed !== undefined && (!Number.isInteger(options.seed) || options.seed < 0)) {
    throw new Error("Paladin's Twin-Soul seed must be a nonnegative integer");
  }
  const seed = options.seed ?? 0;
  const targetIds = items.map((_item, index) => `target:${index}`);
  const progression = createLanguageTargetProgression(targetIds);
  let accountant = createResultAccountant();
  let terminalOutcome: Exclude<GameTerminalOutcome, "complete"> = "victory";
  const completion = createCompletionLatch<GameResults>((result) => deliver(result, terminalOutcome));
  let state: MutableGameState = {
    phase: "playing",
    wave: 1,
    targetIndex: 0,
    player: {
      x: PALADINS_TWIN_SOUL_CANVAS.width / 2,
      hp: PALADINS_TWIN_SOUL_RULES.initialHp,
      hasTwinSoul: false,
      isCaptured: false,
      fireStrength: 1,
    },
    enemies: createFormation(items, 0, 1, seed),
    bullets: [],
    gameTime: 0,
    formationOffset: formationSeedOffset(seed, 1, 0),
    formationDirection: 1,
    lastPlayerFireAt: 0,
    lastEnemyFireAt: 0,
    nextCaptureAt: PALADINS_TWIN_SOUL_RULES.captureDelayMs,
    seed,
    nextBulletSequence: 0,
    captureUsed: false,
    waveCorrect: false,
    destroyed: false,
  };

  let terminalResult: GameResults | undefined;

  const currentEnemyId = (): string => {
    return state.enemies.find((enemy) => enemy.id === targetEnemyId(state.wave, state.seed, state.targetIndex))?.id ?? "";
  };
  const availableActions = (): readonly string[] => Object.freeze([
    "move-left",
    "move-right",
    "confirm",
    ...state.enemies.map((enemy) => enemy.id),
  ]);

  const snapshot = (): PaladinsTwinSoulSnapshot => {
    const target = items[Math.min(state.targetIndex, items.length - 1)]!;
    return Object.freeze({
      phase: state.phase,
      wave: state.wave,
      targetIndex: state.targetIndex,
      targetCount: items.length,
      targetTerm: target.term,
      prompt: target.translation,
      answer: target.term,
      correctAction: state.phase === "playing" ? currentEnemyId() : "",
      availableActions: state.phase === "playing" ? availableActions() : Object.freeze([]),
      seed: state.seed,
      player: Object.freeze({
        x: state.player.x,
        hp: state.player.hp,
        maxHp: PALADINS_TWIN_SOUL_RULES.initialHp,
        hasTwinSoul: state.player.hasTwinSoul,
        isCaptured: state.player.isCaptured,
        fireStrength: state.player.fireStrength,
      }),
      enemies: Object.freeze(state.enemies.map(freezeEnemy)),
      bullets: Object.freeze(state.bullets.map(freezeBullet)),
      gameTime: state.gameTime,
      formationOffset: state.formationOffset,
      formationDirection: state.formationDirection,
      lastPlayerFireAt: state.lastPlayerFireAt,
      lastEnemyFireAt: state.lastEnemyFireAt,
      captureUsed: state.captureUsed,
      waveCorrect: state.waveCorrect,
      nextCaptureAt: state.nextCaptureAt,
      nextBulletSequence: state.nextBulletSequence,
      ...(state.lastOutcome === undefined ? {} : { lastOutcome: state.lastOutcome }),
      correctAnswers: accountant.correctAnswers,
      totalAttempts: accountant.totalAttempts,
      score: accountant.score,
      lives: state.player.hp,
      energy: state.player.fireStrength,
      ...(terminalResult === undefined ? {} : { result: terminalResult }),
      destroyed: state.destroyed,
    });
  };

  const actionResult = (
    values: Omit<PaladinsTwinSoulChooseResult, "snapshot" | "result" | "terminal" | "completed"> & { readonly result?: GameResults },
  ): PaladinsTwinSoulChooseResult => Object.freeze({
    ...values,
    terminal: values.result !== undefined,
    completed: values.result !== undefined,
    ...(values.result === undefined ? {} : { result: values.result }),
    snapshot: snapshot(),
  });

  const finish = (phase: "victory" | "defeat"): GameResults => {
    state.phase = phase;
    terminalOutcome = phase;
    if (phase === "defeat") {
      state.enemies = [];
      state.bullets = [];
    }
    terminalResult = resultFor(accountant);
    completion.complete(terminalResult);
    return terminalResult;
  };

  const setDefeatIfNeeded = (): void => {
    if (state.player.hp <= 0 && state.phase === "playing") {
      state.player.hp = 0;
      finish("defeat");
    }
  };

  const startCapture = (): void => {
    if (state.captureUsed || state.player.hasTwinSoul || state.gameTime < state.nextCaptureAt) return;
    const captor = state.enemies.find(
      (enemy) => enemy.row === 0 && enemy.column === captorColumn(),
    );
    if (!captor || captor.hasCapturedTwin || captor.isCapturing) return;
    captor.isCapturing = true;
    captor.captureStartedAt = state.nextCaptureAt;
  };

  const progressCapture = (): void => {
    const captor = state.enemies.find(
      (enemy) => enemy.row === 0 && enemy.column === captorColumn(),
    );
    if (!captor || !captor.isCapturing || captor.captureStartedAt === undefined) return;
    const elapsed = state.gameTime - captor.captureStartedAt;
    const progress = clamp(elapsed / PALADINS_TWIN_SOUL_RULES.captureTravelMs, 0, 1);
    captor.y = 132 + progress * PALADINS_TWIN_SOUL_RULES.captureTravelMs;
    captor.x = formationBaseX(captor.column) + state.formationOffset;
    if (progress < 1) return;
    captor.isCapturing = false;
    captor.captureStartedAt = undefined;
    state.captureUsed = true;
    captor.y = 132;
    if (Math.abs(captor.x - state.player.x) <= 110) {
      captor.hasCapturedTwin = true;
      state.player.isCaptured = true;
    }
  };

  const updateFormation = (deltaMs: number): void => {
    const seconds = deltaMs / 1000;
    state.formationOffset += state.formationDirection * PALADINS_TWIN_SOUL_RULES.enemyMovementSpeed * seconds;
    if (state.formationOffset >= PALADINS_TWIN_SOUL_RULES.formationTravel) {
      state.formationOffset = PALADINS_TWIN_SOUL_RULES.formationTravel;
      state.formationDirection = -1;
    } else if (state.formationOffset <= -PALADINS_TWIN_SOUL_RULES.formationTravel) {
      state.formationOffset = -PALADINS_TWIN_SOUL_RULES.formationTravel;
      state.formationDirection = 1;
    }
    for (const enemy of state.enemies) {
      if (!enemy.isCapturing) enemy.x = formationBaseX(enemy.column) + state.formationOffset;
    }
  };

  const spawnTimedProjectiles = (): void => {
    while (state.lastEnemyFireAt + PALADINS_TWIN_SOUL_RULES.enemyFireIntervalMs <= state.gameTime) {
      state.lastEnemyFireAt += PALADINS_TWIN_SOUL_RULES.enemyFireIntervalMs;
      const topRow = state.enemies.filter((enemy) => enemy.row === 0);
      const source = topRow[seededIndex(state.seed, state.wave, state.targetIndex, state.lastEnemyFireAt) % topRow.length];
      if (source) {
        state.bullets.push(enemyVolley(
          source,
          state.lastEnemyFireAt,
          counterfireTargetX(state.seed, state.nextBulletSequence, state.player.x),
          state.nextBulletSequence,
          state.seed,
        ));
        state.nextBulletSequence += 1;
      }
    }
  };

  const advanceTarget = (): GameResults | undefined => {
    accountant.addScore(PALADINS_TWIN_SOUL_RULES.scorePerCorrectEnemy);
    progression.match(targetIds[state.targetIndex]!);
    state.targetIndex += 1;
    state.wave += 1;
    if (state.targetIndex >= items.length) {
      state.enemies = [];
      return finish("victory");
    }
    state.enemies = createFormation(items, state.targetIndex, state.wave, state.seed);
    state.formationOffset = formationSeedOffset(state.seed, state.wave, state.targetIndex);
    state.formationDirection = 1;
    state.nextCaptureAt = state.gameTime + PALADINS_TWIN_SOUL_RULES.captureDelayMs;
    state.captureUsed = false;
    state.waveCorrect = false;
    return undefined;
  };

  const resolveEnemyHit = (enemy: MutableEnemy, counterfire: MutableBullet[]): { correct: boolean; result?: GameResults } => {
    const correct = enemy.id === targetEnemyId(state.wave, state.seed, state.targetIndex);
    accountant.recordAttempt({ correct });
    state.lastOutcome = correct ? "correct" : "incorrect";
    if (enemy.hasCapturedTwin) {
      enemy.hasCapturedTwin = false;
      state.player.isCaptured = false;
      state.player.hasTwinSoul = true;
      state.player.fireStrength = 2;
    }
    state.enemies = state.enemies.filter((candidate) => candidate.id !== enemy.id);
    if (!correct) {
      counterfire.push(enemyVolley(
        enemy,
        state.gameTime,
        counterfireTargetX(state.seed, state.nextBulletSequence, state.player.x),
        state.nextBulletSequence,
        state.seed,
      ));
      state.nextBulletSequence += 1;
      return { correct: false };
    }
    state.waveCorrect = true;
    return { correct: true, result: advanceTarget() };
  };

  const firePlayerVolley = (): void => {
    state.lastPlayerFireAt = state.gameTime;
    state.bullets.push(...playerVolley(state, state.gameTime, state.nextBulletSequence));
    state.nextBulletSequence += 1;
  };

  const moveAndCollide = (deltaMs: number, movement: PaladinMovement): void => {
    const seconds = deltaMs / 1000;
    state.player.x = clamp(
      state.player.x + movement * PALADINS_TWIN_SOUL_RULES.playerSpeed * seconds,
      PALADINS_TWIN_SOUL_RULES.playerRadius,
      PALADINS_TWIN_SOUL_CANVAS.width - PALADINS_TWIN_SOUL_RULES.playerRadius,
    );
    state.gameTime += deltaMs;
    updateFormation(deltaMs);
    startCapture();
    progressCapture();
    spawnTimedProjectiles();

    const nextBullets: MutableBullet[] = [];
    const counterfire: MutableBullet[] = [];
    let advanced = false;
    for (const bullet of state.bullets) {
      bullet.y += (bullet.isPlayer ? -PALADINS_TWIN_SOUL_RULES.playerBulletSpeed : PALADINS_TWIN_SOUL_RULES.enemyBulletSpeed) * seconds;
      if (bullet.isPlayer) {
        const hit = playerBulletHit(state, bullet);
        if (hit) {
          const collision = resolveEnemyHit(hit, counterfire);
          advanced = collision.correct;
          if (advanced) break;
          continue;
        }
      } else if (
        Math.abs(bullet.x - state.player.x) <= PALADINS_TWIN_SOUL_RULES.playerRadius
        && Math.abs(bullet.y - PALADINS_TWIN_SOUL_RULES.playerY) <= PALADINS_TWIN_SOUL_RULES.playerRadius
      ) {
        state.player.hp -= 1;
        setDefeatIfNeeded();
        continue;
      }
      if (bullet.y > -60 && bullet.y < PALADINS_TWIN_SOUL_CANVAS.height + 60) nextBullets.push(bullet);
      if (advanced) break;
    }
    state.bullets = state.phase === "defeat" ? [] : [...nextBullets, ...counterfire];
  };

  const restore = (captured: PaladinsTwinSoulSnapshot): void => {
    if (state.destroyed) return;
    if (terminalResult !== undefined && captured.phase === "playing") {
      throw new Error("Paladin's Twin-Soul completion latch is terminal");
    }
    if (!captured || typeof captured !== "object") throw new Error("Paladin's Twin-Soul responsive state is invalid");
    if (captured.seed !== state.seed) throw new Error("Paladin's Twin-Soul responsive seed is invalid");
    if (!(captured.phase === "playing" || captured.phase === "victory" || captured.phase === "defeat")) {
      throw new Error("Paladin's Twin-Soul responsive phase is invalid");
    }
    if (captured.targetCount !== items.length || !Number.isInteger(captured.targetIndex)
      || captured.targetIndex < 0 || captured.targetIndex > items.length
      || captured.wave !== captured.targetIndex + 1) {
      throw new Error("Paladin's Twin-Soul responsive target progress is invalid");
    }
    const target = items[Math.min(captured.targetIndex, items.length - 1)]!;
    if (captured.targetTerm !== target.term || captured.prompt !== target.translation || captured.answer !== target.term) {
      throw new Error("Paladin's Twin-Soul responsive target answer is invalid");
    }
    if (!Number.isFinite(captured.player.x) || !Number.isInteger(captured.player.hp) || captured.player.hp < 0 || captured.player.hp > PALADINS_TWIN_SOUL_RULES.initialHp
      || captured.player.maxHp !== PALADINS_TWIN_SOUL_RULES.initialHp
      || (captured.player.fireStrength !== 1 && captured.player.fireStrength !== 2)
      || captured.lives !== captured.player.hp || captured.energy !== captured.player.fireStrength) {
      throw new Error("Paladin's Twin-Soul responsive resources are invalid");
    }
    if (!Number.isInteger(captured.correctAnswers) || !Number.isInteger(captured.totalAttempts)
      || captured.correctAnswers !== captured.targetIndex || captured.totalAttempts < captured.correctAnswers
      || !Number.isInteger(captured.score) || captured.score !== captured.correctAnswers * PALADINS_TWIN_SOUL_RULES.scorePerCorrectEnemy) {
      throw new Error("Paladin's Twin-Soul responsive result counters are invalid");
    }
    if (captured.phase === "playing" && (captured.targetIndex >= items.length || captured.player.hp === 0)) {
      throw new Error("Paladin's Twin-Soul responsive playing state is terminal");
    }
    if (captured.phase === "victory" && captured.targetIndex !== items.length) {
      throw new Error("Paladin's Twin-Soul responsive victory state is unfinished");
    }
    if (captured.phase === "defeat" && captured.player.hp !== 0) {
      throw new Error("Paladin's Twin-Soul responsive defeat state is unfinished");
    }
    if (captured.phase === "playing") {
      const correctEnemy = captured.enemies.find((enemy) => enemy.id === targetEnemyId(captured.wave, captured.seed, captured.targetIndex));
      const expectedActions = ["move-left", "move-right", "confirm", ...captured.enemies.map((enemy) => enemy.id)];
      if (!correctEnemy || captured.correctAction !== correctEnemy.id
        || captured.availableActions.length !== expectedActions.length
        || captured.availableActions.some((action, index) => action !== expectedActions[index])) {
        throw new Error("Paladin's Twin-Soul responsive actions are invalid");
      }
    } else if (captured.correctAction !== "" || captured.availableActions.length !== 0) {
      throw new Error("Paladin's Twin-Soul terminal actions are invalid");
    }
    if (!Number.isFinite(captured.gameTime) || captured.gameTime < 0
      || !Number.isFinite(captured.formationOffset) || Math.abs(captured.formationOffset) > PALADINS_TWIN_SOUL_RULES.formationTravel
      || (captured.formationDirection !== -1 && captured.formationDirection !== 1)
      || !Number.isFinite(captured.lastPlayerFireAt) || !Number.isFinite(captured.lastEnemyFireAt)
      || !Number.isFinite(captured.nextCaptureAt) || !Number.isInteger(captured.nextBulletSequence) || captured.nextBulletSequence < 0) {
      throw new Error("Paladin's Twin-Soul responsive timing is invalid");
    }
    if (captured.lastOutcome !== undefined && captured.lastOutcome !== "correct" && captured.lastOutcome !== "incorrect") {
      throw new Error("Paladin's Twin-Soul responsive outcome is invalid");
    }
    if (typeof captured.destroyed !== "boolean" || typeof captured.captureUsed !== "boolean"
      || typeof captured.waveCorrect !== "boolean" || typeof captured.player.hasTwinSoul !== "boolean"
      || typeof captured.player.isCaptured !== "boolean") {
      throw new Error("Paladin's Twin-Soul responsive lifecycle state is invalid");
    }
    if (captured.phase === "playing" && (captured.enemies.length === 0 || captured.enemies.length > PALADINS_TWIN_SOUL_RULES.formationRows * PALADINS_TWIN_SOUL_RULES.formationColumns)) {
      throw new Error("Paladin's Twin-Soul responsive formation is invalid");
    }
    const expectedFormation = captured.phase === "playing"
      ? createFormation(items, captured.targetIndex, captured.wave, captured.seed)
      : [];
    const expectedEnemies = new Map(expectedFormation.map((enemy) => [enemy.id, enemy]));
    const enemyIds = new Set<string>();
    const enemyPositions = new Set<string>();
    for (const enemy of captured.enemies) {
      const expectedEnemy = expectedEnemies.get(enemy.id);
      if (typeof enemy.id !== "string" || typeof enemy.term !== "string" || typeof enemy.translation !== "string"
        || enemyIds.has(enemy.id) || enemyPositions.has(`${enemy.row}:${enemy.column}`)
        || !Number.isInteger(enemy.row) || enemy.row < 0 || enemy.row >= PALADINS_TWIN_SOUL_RULES.formationRows
        || !Number.isInteger(enemy.column) || enemy.column < 0 || enemy.column >= PALADINS_TWIN_SOUL_RULES.formationColumns
        || !Number.isFinite(enemy.x) || !Number.isFinite(enemy.y)
        || typeof enemy.isCapturing !== "boolean" || typeof enemy.hasCapturedTwin !== "boolean"
        || (enemy.captureStartedAt !== undefined && !Number.isFinite(enemy.captureStartedAt))
        || !expectedEnemy || enemy.term !== expectedEnemy.term || enemy.translation !== expectedEnemy.translation) {
        throw new Error("Paladin's Twin-Soul responsive enemy is invalid");
      }
      enemyIds.add(enemy.id);
      enemyPositions.add(`${enemy.row}:${enemy.column}`);
    }
    for (const bullet of captured.bullets) {
      if (typeof bullet.id !== "string" || !Number.isFinite(bullet.x) || !Number.isFinite(bullet.y)
        || typeof bullet.isPlayer !== "boolean") throw new Error("Paladin's Twin-Soul responsive bullet is invalid");
    }
    if (captured.phase === "playing" && captured.result !== undefined) {
      throw new Error("Paladin's Twin-Soul active state has a terminal result");
    }
    if (captured.result !== undefined) {
      const parsedResult = gameResultsSchema.parse(captured.result);
      const restoredAccountant = createResultAccountant();
      for (let index = 0; index < captured.totalAttempts; index += 1) {
        restoredAccountant.recordAttempt({ correct: index < captured.correctAnswers });
      }
      restoredAccountant.addScore(captured.score);
      const expectedResult = resultFor(restoredAccountant);
      if (parsedResult.accuracy !== expectedResult.accuracy || parsedResult.xp !== expectedResult.xp
        || parsedResult.correctAnswers !== expectedResult.correctAnswers
        || parsedResult.totalAttempts !== expectedResult.totalAttempts || parsedResult.score !== expectedResult.score) {
        throw new Error("Paladin's Twin-Soul responsive result is inconsistent");
      }
    } else if (captured.phase !== "playing") {
      throw new Error("Paladin's Twin-Soul terminal result is missing");
    }

    accountant = createResultAccountant();
    progression.reset();
    for (let index = 0; index < captured.targetIndex; index += 1) progression.match(targetIds[index]!);
    for (let index = 0; index < captured.totalAttempts; index += 1) accountant.recordAttempt({ correct: index < captured.correctAnswers });
    accountant.addScore(captured.score);
    terminalResult = captured.result;
    state = {
      phase: captured.phase,
      wave: captured.wave,
      targetIndex: captured.targetIndex,
      player: {
        x: clamp(captured.player.x, PALADINS_TWIN_SOUL_RULES.playerRadius, PALADINS_TWIN_SOUL_CANVAS.width - PALADINS_TWIN_SOUL_RULES.playerRadius),
        hp: captured.player.hp,
        hasTwinSoul: captured.player.hasTwinSoul,
        isCaptured: captured.player.isCaptured,
        fireStrength: captured.player.fireStrength,
      },
      enemies: captured.enemies.map((enemy) => ({ ...enemy })),
      bullets: captured.bullets.map((bullet) => ({ ...bullet })),
      gameTime: captured.gameTime,
      formationOffset: captured.formationOffset,
      formationDirection: captured.formationDirection,
      lastPlayerFireAt: captured.lastPlayerFireAt,
      lastEnemyFireAt: captured.lastEnemyFireAt,
      nextCaptureAt: captured.nextCaptureAt,
      seed: captured.seed,
      nextBulletSequence: captured.nextBulletSequence,
      captureUsed: captured.captureUsed,
      waveCorrect: captured.waveCorrect,
      lastOutcome: captured.lastOutcome,
      destroyed: captured.destroyed,
    };
    if (state.phase !== "playing" || state.destroyed) completion.sealWithoutDelivery();
  };

  return Object.freeze({
    snapshot,
    choose(action: InputActionId | string): PaladinsTwinSoulChooseResult {
      const inactive = (): PaladinsTwinSoulChooseResult => actionResult({
        accepted: false,
        correct: false,
        progressed: false,
      });
      if (state.destroyed || state.phase !== "playing" || typeof action !== "string") return inactive();
      if (!availableActions().includes(action)) return inactive();
      if (action === "move-left" || action === "move-right") {
        const direction = action === "move-left" ? -1 : 1;
        state.player.x = clamp(
          state.player.x + direction * PALADINS_TWIN_SOUL_RULES.playerSpeed / 20,
          PALADINS_TWIN_SOUL_RULES.playerRadius,
          PALADINS_TWIN_SOUL_CANVAS.width - PALADINS_TWIN_SOUL_RULES.playerRadius,
        );
        return actionResult({ accepted: true, correct: false, progressed: false });
      }
      if (action === "confirm") {
        firePlayerVolley();
        return actionResult({ accepted: true, correct: false, progressed: false });
      }
      const enemy = state.enemies.find((candidate) => candidate.id === action);
      if (!enemy) return inactive();
      const counterfire: MutableBullet[] = [];
      const collision = resolveEnemyHit(enemy, counterfire);
      state.bullets.push(...counterfire);
      return actionResult({
        accepted: true,
        correct: collision.correct,
        progressed: collision.correct,
        ...(collision.result === undefined ? {} : { result: collision.result }),
      });
    },
    applyHazard(): PaladinsTwinSoulChooseResult {
      if (state.destroyed || state.phase !== "playing") {
        return actionResult({ accepted: false, correct: false, progressed: false });
      }
      const source = state.enemies[seededIndex(state.seed, state.wave, state.targetIndex, state.nextBulletSequence) % state.enemies.length];
      if (source) {
        state.bullets.push(enemyVolley(
          source,
          state.gameTime,
          counterfireTargetX(state.seed, state.nextBulletSequence, state.player.x),
          state.nextBulletSequence,
          state.seed,
        ));
        state.nextBulletSequence += 1;
      }
      state.player.hp = Math.max(0, state.player.hp - 1);
      if (state.player.hp === 0) {
        const result = finish("defeat");
        return actionResult({ accepted: true, correct: false, progressed: false, result });
      }
      return actionResult({ accepted: true, correct: false, progressed: false });
    },
    tick(deltaMs: number, movement: PaladinMovement = 0): PaladinsTwinSoulSnapshot {
      if (state.destroyed || state.phase !== "playing") return snapshot();
      const totalDelta = finiteDelta(deltaMs);
      if (movement !== -1 && movement !== 0 && movement !== 1) throw new Error("Paladin's Twin-Soul movement must be -1, 0, or 1");
      let remaining = totalDelta;
      while (remaining > 0 && state.phase === "playing") {
        const step = Math.min(remaining, 50);
        moveAndCollide(step, movement);
        remaining -= step;
      }
      return snapshot();
    },
    capture: snapshot,
    restore,
    destroy(): void {
      if (state.destroyed) return;
      state.destroyed = true;
      completion.sealWithoutDelivery();
    },
  });
}

/**
 * Creates the Paladin's Twin-Soul standard APK cartridge.
 * @returns A vocabulary cartridge with a confirm-to-fire formation scene.
 */
export function createPaladinsTwinSoulCartridge(): StandardExperienceCartridge {
  let activeController: PaladinsTwinSoulController | undefined;
  /**
   * Moves the paladin under one enemy, confirms a shot, and ticks until the bullet resolves.
   * @param controller Active Twin-Soul controller for this cartridge instance.
   * @param enemyId Enemy the tutorial should stand under before the confirmed shot.
   */
  const aimAndConfirm = (controller: PaladinsTwinSoulController, enemyId: string): void => {
    for (let step = 0; step < 240; step += 1) {
      const state = controller.snapshot();
      if (state.phase !== "playing") return;
      const enemy = state.enemies.find((candidate) => candidate.id === enemyId);
      if (!enemy) return;
      if (Math.abs(state.player.x - enemy.x) <= PALADINS_TWIN_SOUL_RULES.enemyWidth / 4) break;
      controller.tick(16, state.player.x < enemy.x ? 1 : -1);
    }
    const before = controller.snapshot();
    controller.choose("confirm");
    for (let step = 0; step < 90; step += 1) {
      const state = controller.snapshot();
      if (state.phase !== "playing") return;
      if (state.lastOutcome !== before.lastOutcome || state.targetIndex !== before.targetIndex) return;
      controller.tick(16, 0);
    }
  };
  const standardExperience = createCartridgeStandardExperience({
    id: PALADINS_TWIN_SOUL_ID,
    title: "Paladin's Twin-Soul",
    description: "Move a paladin beneath a vocabulary formation and rescue the captured twin.",
    inputMode: "vocabulary",
    objective: "Clear each enemy formation by matching the translation prompt in vocabulary order.",
    mechanicInstruction: "Move left or right, then confirm a shot at the enemy that matches the translation prompt.",
    keyboardKeys: ["A", "Left Arrow", "D", "Right Arrow", "Space", "Enter"] as const,
    executeTutorialAction: (actionId) => {
      const controller = activeController;
      if (!controller) return;
      const state = controller.snapshot();
      if (state.phase !== "playing") return;
      if (actionId === "action:select-correct") {
        aimAndConfirm(controller, state.correctAction);
        return;
      }
      const wrongEnemy = state.enemies.find((enemy) =>
        enemy.id !== state.correctAction && enemy.row === targetRow(),
      ) ?? state.enemies.find((enemy) => enemy.id !== state.correctAction);
      if (wrongEnemy) aimAndConfirm(controller, wrongEnemy.id);
    },
  });

  return {
    manifest: {
      id: PALADINS_TWIN_SOUL_ID,
      title: "Paladin's Twin-Soul",
      description: "Move a paladin beneath a vocabulary formation and rescue the captured twin.",
      runtimeApiVersion: "1.0.0",
      inputMode: "vocabulary",
      requiredAssetBindings: ["paladins-twin-soul/player"],
      capabilities: [
        "capability:bounded-frame-delta",
        "capability:input-action-normalization",
        "capability:language-target-progression",
        "capability:nonempty-content-precondition",
        "capability:result-accounting",
        "capability:single-completion-emission",
        "capability:deterministic-enemy-formation",
        "capability:timed-auto-fire",
        "capability:twin-soul-rescue",
        "capability:enemy-projectiles",
      ],
    },
    standardExperience,
    createGameConfig(context: CartridgeGameConfigContext): Readonly<Record<string, unknown>> {
      const input = vocabularyInputSchema.parse(context.input);
      const sessionMode = context.sessionMode ?? "playing";
      const deliver: PaladinsTwinSoulCompletionDelivery = sessionMode === "tutorial" || sessionMode === "demo"
        ? () => undefined
        : (result, outcome) => context.complete(result, outcome);
      const controller = createPaladinsTwinSoulController(input, deliver, { seed: context.seed ?? 0 });
      activeController = controller;
      context.diagnostic({
        level: "debug",
        code: "PALADINS_TWIN_SOUL_READY",
        message: "Paladin's Twin-Soul formation is ready.",
        details: { editionId: context.edition.id, targetCount: input.length, seed: context.seed ?? 0 },
      });
      return {
        width: PALADINS_TWIN_SOUL_CANVAS.width,
        height: PALADINS_TWIN_SOUL_CANVAS.height,
        render: { antialias: true, pixelArt: false },
        scene: createScene({
          controller,
          edition: context.edition,
          inputController: context.inputController,
          composition: context.composition,
          diagnostic: context.diagnostic,
          sessionMode,
        }),
      };
    },
  };
}
