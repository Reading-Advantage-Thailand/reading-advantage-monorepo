import {
  gameResultsSchema,
  vocabularyInputSchema,
  type GameResults,
} from "@reading-advantage/game-contracts";
import {
  createBoundedFrameScheduler,
  createCompletionLatch,
  createInputActionNormalizer,
  createResultAccountant,
  finalizeResult,
  preloadAssetBindings,
  resolveAssetBinding,
  validateNonEmptyContent,
  type APKInputController,
  type APKInputSnapshot,
  type CartridgeGameConfigContext,
  type GameTerminalOutcome,
  type InputActionId,
  type RuntimeEdition,
} from "@reading-advantage/advantage-play-kit";
import type { StandardExperienceCartridge } from "@reading-advantage/advantage-play-kit/presentation";

import { createCartridgeStandardExperience } from "./standard-experience.js";

/** Stable public identifier for the Magic Defense cartridge. */
export const MAGIC_DEFENSE_ID = "magic-defense" as const;

/** Procedural canvas size before host scaling. */
export const MAGIC_DEFENSE_CANVAS = Object.freeze({ width: 960, height: 540 });

/** Maximum health assigned to each protected castle. */
export const MAGIC_DEFENSE_MAX_CASTLE_HEALTH = 3;

/** Mana required to activate the storm. */
export const MAGIC_DEFENSE_MAX_MANA = 100;

/** Minimum default gameplay timer in seconds. Small decks use this floor. */
export const MAGIC_DEFENSE_DEFAULT_TIMER_SECONDS = 60;

/** Public timer constant retained for gameplay and QC callers. */
export const MAGIC_DEFENSE_TIMER_SECONDS = MAGIC_DEFENSE_DEFAULT_TIMER_SECONDS;

/** Seconds added per vocabulary item when that total exceeds the 60-second floor. */
export const MAGIC_DEFENSE_SECONDS_PER_ITEM = 3;

/** Milliseconds between deterministic falling-missile spawns. */
export const MAGIC_DEFENSE_MISSILE_SPAWN_INTERVAL_MS = 5_000;

/** Stable castle positions used by deterministic missile spawning. */
export const MAGIC_DEFENSE_CASTLES = Object.freeze(["left", "center", "right"] as const);

/** One protected castle in the Magic Defense arena. */
export type MagicDefenseCastleId = (typeof MAGIC_DEFENSE_CASTLES)[number];

/** Terminal state reached by the Magic Defense controller. */
export type MagicDefensePhase = "playing" | "victory" | "defeat";

/** Reason for a terminal defeat. */
export type MagicDefenseDefeatReason = "castles" | "timer";

/** Result of the most recent accepted learning or hazard action. */
export type MagicDefenseOutcome = "correct" | "incorrect" | "missed";

/** One missile falling toward a deterministic castle target. */
export interface MagicDefenseMissile {
  /** Stable missile identity. */
  readonly id: string;
  /** Castle that receives damage when this missile reaches the ground. */
  readonly targetCastleId: MagicDefenseCastleId;
  /** Thai vocabulary target carried by the missile. */
  readonly prompt: string;
  /** English answer required to destroy the missile. */
  readonly answer: string;
  /** Vocabulary index represented by this missile. */
  readonly targetIndex: number;
  /** Normalized fall progress from zero through one. */
  readonly progress: number;
}

/** Immutable health state for one castle. */
export interface MagicDefenseCastleState {
  /** Stable castle identity. */
  readonly id: MagicDefenseCastleId;
  /** Current bounded health. */
  readonly health: number;
  /** Maximum health for the castle. */
  readonly maxHealth: number;
}

/** Immutable state exposed by one Magic Defense session. */
export interface MagicDefenseSnapshot {
  /** Deterministic host seed used for missile target selection. */
  readonly seed: number;
  /** Current gameplay or terminal phase. */
  readonly phase: MagicDefensePhase;
  /** Index of the next vocabulary target. */
  readonly targetIndex: number;
  /** Number of vocabulary targets in the session. */
  readonly targetCount: number;
  /** Thai translation shown as the current target. */
  readonly prompt: string;
  /** English term accepted for the current target. */
  readonly answer: string;
  /** Correct semantic answer action for the current target. */
  readonly correctAction: string;
  /** Available pointer and touch answer actions. */
  readonly availableActions: readonly string[];
  /** Current typed English answer buffer. */
  readonly typingBuffer: string;
  /** Pointer and touch answer choices for the current target. */
  readonly answerChoices: readonly string[];
  /** Current falling missiles. */
  readonly activeMissiles: readonly MagicDefenseMissile[];
  /** Alias retained for scene and QC callers that use the shorter name. */
  readonly missiles: readonly MagicDefenseMissile[];
  /** Current castle health by stable castle identity. */
  readonly castleHealth: Readonly<Record<MagicDefenseCastleId, number>>;
  /** Current castle objects used by procedural scene composition. */
  readonly castles: readonly MagicDefenseCastleState[];
  /** Alias matching the legacy state vocabulary. */
  readonly castleHp: Readonly<Record<MagicDefenseCastleId, number>>;
  /** Current score. */
  readonly score: number;
  /** Consecutive correct translations. */
  readonly combo: number;
  /** Current bounded storm mana. */
  readonly mana: number;
  /** Remaining castle health represented as shared contract lives. */
  readonly lives: number;
  /** Current storm mana represented as shared contract energy. */
  readonly energy: number;
  /** Number of correct translations. */
  readonly correctAnswers: number;
  /** Number of submitted English answers. */
  readonly totalAttempts: number;
  /** Seconds remaining before the timer defeat. */
  readonly timeRemaining: number;
  /** Alias used by timer-focused hosts. */
  readonly timer: number;
  /** Last accepted outcome, when one exists. */
  readonly lastOutcome?: MagicDefenseOutcome;
  /** Defeat reason, when the session is defeated. */
  readonly defeatReason?: MagicDefenseDefeatReason;
  /** Monotonic deterministic spawn cursor. */
  readonly spawnCursor: number;
  /** Milliseconds accumulated toward the next missile spawn. */
  readonly spawnTimerMs: number;
  /** First terminal result, when the session is terminal. */
  readonly result?: GameResults;
  /** Whether the scene lifecycle has sealed this session. */
  readonly destroyed: boolean;
}

/** Result returned after a Magic Defense controller operation. */
export interface MagicDefenseActionResult {
  /** Whether the operation changed the active session. */
  readonly accepted: boolean;
  /** Whether a submitted translation matched the current target. */
  readonly correct: boolean;
  /** Whether the operation advanced vocabulary progress. */
  readonly progressed: boolean;
  /** Whether the operation entered a terminal state. */
  readonly terminal: boolean;
  /** Alias retained for standard cartridge callers. */
  readonly completed: boolean;
  /** First terminal result, when this operation entered a terminal state. */
  readonly result?: GameResults;
  /** Defeat reason, when this operation caused a defeat. */
  readonly reason?: MagicDefenseDefeatReason;
  /** Number of missiles removed by a storm operation. */
  readonly clearedMissiles?: number;
  /** State after the operation. */
  readonly snapshot: MagicDefenseSnapshot;
}

/** Optional deterministic controller settings. */
export interface MagicDefenseControllerOptions {
  /** Gameplay timer length in seconds. */
  readonly timerSeconds?: number;
  /** Deterministic host seed for targets, placements, and hazards. */
  readonly seed?: number;
}

/** Transport-independent Magic Defense rules and lifecycle controls. */
export interface MagicDefenseController {
  /** Returns the current immutable session state. */
  snapshot(): MagicDefenseSnapshot;
  /** Chooses a pointer or touch English answer. */
  choose(answer: string): MagicDefenseActionResult;
  /** Adds one printable character to the translation buffer. */
  typeCharacter(character: string): MagicDefenseActionResult;
  /** Alias for adding one printable character to the translation buffer. */
  type(character: string): MagicDefenseActionResult;
  /** Removes the last character from the translation buffer. */
  backspace(): MagicDefenseActionResult;
  /** Submits the typed or supplied English answer for the current missile. */
  submitAnswer(answer?: string): MagicDefenseActionResult;
  /** Alias for submitting the typed translation. */
  submit(answer?: string): MagicDefenseActionResult;
  /** Submits a pointer or touch answer choice. */
  chooseAnswer(answer: string): MagicDefenseActionResult;
  /** Spawns one deterministic extra missile for scene pressure and storm tests. */
  spawnMissile(): MagicDefenseMissile;
  /** Applies one missile impact to its target castle. */
  missMissile(missileId?: string): MagicDefenseActionResult;
  /** Alias for applying one missile impact to its target castle. */
  missileMiss(missileId?: string): MagicDefenseActionResult;
  /** Clears active missiles when the mana meter is full. */
  activateStorm(): MagicDefenseActionResult;
  /** Alias for the full-mana storm action. */
  useStorm(): MagicDefenseActionResult;
  /** Advances the gameplay timer without moving missiles. */
  advanceTime(seconds: number): MagicDefenseActionResult;
  /** Advances the timer and procedural missile fall positions by milliseconds. */
  tick(deltaMs: number): MagicDefenseActionResult;
  /** Captures all state needed for a responsive scene reflow. */
  capture(): MagicDefenseSnapshot;
  /** Restores a validated responsive scene state. */
  restore(snapshot: MagicDefenseSnapshot): void;
  /** Seals the controller and prevents later mutation or delivery. */
  destroy(): void;
  /** Alias for callers that use the legacy hazard name. */
  applyHazard(): MagicDefenseActionResult;
  /** Alias for keyboard-driven storm actions. */
  storm(): MagicDefenseActionResult;
}

/** Keyboard bindings for semantic submit, erase, and storm actions. */
export const MAGIC_DEFENSE_KEYBOARD_BINDINGS: Readonly<Record<string, InputActionId>> = Object.freeze({
  Enter: "confirm",
  Backspace: "cancel",
  Space: "pause",
});

interface PhaserGraphicsLike {
  clear(): this;
  fillStyle(color: number, alpha?: number): this;
  fillRect(x: number, y: number, width: number, height: number): this;
  fillCircle(x: number, y: number, radius: number): this;
  fillRoundedRect(x: number, y: number, width: number, height: number, radius?: number): this;
  fillTriangle?(x0: number, y0: number, x1: number, y1: number, x2: number, y2: number): this;
  lineStyle(lineWidth: number, color: number, alpha?: number): this;
  strokeRoundedRect(x: number, y: number, width: number, height: number, radius?: number): this;
  setDepth?(depth: number): this;
  destroy(): void;
}

interface PhaserTextLike {
  readonly height?: number;
  setPosition(x: number, y: number): this;
  setText(value: string): this;
  setFontSize?(size: number | string): this;
  setWordWrapWidth?(width: number, useAdvancedWrap?: boolean): this;
  setDepth?(depth: number): this;
  destroy(): void;
}

interface PhaserImageLike {
  setOrigin?(x: number, y: number): this;
  setDisplaySize?(width: number, height: number): this;
  setDepth?(depth: number): this;
  setPosition?(x: number, y: number): this;
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
  readonly worldGraphics: PhaserGraphicsLike;
  readonly graphics: PhaserGraphicsLike;
  readonly title: PhaserTextLike;
  readonly prompt: PhaserTextLike;
  readonly hud: PhaserTextLike;
  readonly buffer: PhaserTextLike;
  readonly feedback: PhaserTextLike;
  readonly instructions: PhaserTextLike;
  readonly storm: PhaserTextLike;
  readonly choices: readonly PhaserTextLike[];
  readonly missiles: Map<string, PhaserTextLike>;
  ground?: PhaserImageLike;
  readonly worldSprites: PhaserImageLike[];
  readonly unitSprites: Map<string, PhaserImageLike>;
  worldWidth: number;
  worldHeight: number;
}

interface MagicDefenseSceneContext {
  readonly controller: MagicDefenseController;
  readonly inputController: APKInputController;
  readonly composition: CartridgeGameConfigContext["composition"];
  readonly diagnostic: CartridgeGameConfigContext["diagnostic"];
  readonly sessionMode: NonNullable<CartridgeGameConfigContext["sessionMode"]>;
  readonly edition: RuntimeEdition;
}

interface ResolvedFieldTexture {
  readonly textureKey: string;
  readonly frame?: number;
}

interface MagicDefenseApproachPose {
  readonly x: number;
  readonly y: number;
  readonly size: number;
}

const CASTLE_X: Readonly<Record<MagicDefenseCastleId, number>> = Object.freeze({
  left: 0.22,
  center: 0.5,
  right: 0.78,
});

/** Horizon line as a fraction of canvas height. Enemies spawn here. */
export const MAGIC_DEFENSE_HORIZON_Y_RATIO = 0.28;

/** Keep baseline at the bottom edge of the canvas. */
export const MAGIC_DEFENSE_TOWER_Y_RATIO = 1;

/** Choice row as a fraction of canvas height. Boxes draw in front of the keeps. */
export const MAGIC_DEFENSE_CHOICE_Y_RATIO = 0.84;

/** Drawn size of one side-view keep at the near damage line. */
export const MAGIC_DEFENSE_TOWER_DISPLAY = Object.freeze({ width: 108, height: 112 });

/** Drawn width of an enemy that has reached a tower. */
export const MAGIC_DEFENSE_ENEMY_NEAR_SIZE = 56;

/** Perspective depth at the horizon. */
export const MAGIC_DEFENSE_ENEMY_Z_FAR = 6;

/** Perspective depth at the towers. */
export const MAGIC_DEFENSE_ENEMY_Z_NEAR = 1;

const FIELD_ART_KEYS = Object.freeze([
  "world:ground",
  "world:road",
  "prop:tower",
  "prop:tree",
  "player:idle",
  "enemy:idle",
]);

const HORIZON_TREE_X = Object.freeze([0.05, 0.12, 0.2, 0.31, 0.69, 0.8, 0.88, 0.95]);
const MID_TREE_POSITIONS = Object.freeze([
  Object.freeze({ x: 0.08, y: 0.46 }),
  Object.freeze({ x: 0.16, y: 0.5 }),
  Object.freeze({ x: 0.84, y: 0.5 }),
  Object.freeze({ x: 0.92, y: 0.46 }),
]);

/**
 * Returns the 2.5D screen pose of one approaching enemy.
 * Horizon enemies stay small. Tower enemies are large.
 * @param progress Normalized walk from the horizon through the tower line.
 * @param castleId Lane that this enemy walks.
 * @param width Current scene width.
 * @param height Current scene height.
 * @returns Screen position and drawn size.
 */
export function magicDefenseApproachPose(
  progress: number,
  castleId: MagicDefenseCastleId,
  width: number,
  height: number,
): MagicDefenseApproachPose {
  const t = Math.min(1, Math.max(0, Number.isFinite(progress) ? progress : 0));
  const z = MAGIC_DEFENSE_ENEMY_Z_FAR
    + t * (MAGIC_DEFENSE_ENEMY_Z_NEAR - MAGIC_DEFENSE_ENEMY_Z_FAR);
  const vanishX = width * 0.5;
  const vanishY = height * MAGIC_DEFENSE_HORIZON_Y_RATIO;
  const destX = width * CASTLE_X[castleId];
  const destY = height * MAGIC_DEFENSE_TOWER_Y_RATIO;
  return Object.freeze({
    x: vanishX + (destX - vanishX) * t,
    y: vanishY + (destY - vanishY) * t,
    size: MAGIC_DEFENSE_ENEMY_NEAR_SIZE * (MAGIC_DEFENSE_ENEMY_Z_NEAR / z),
  });
}

/**
 * Returns whether the edition supplies outdoor field art for Magic Defense.
 * @param edition Audience edition supplied by the host.
 * @returns True when a ground tile is bound.
 */
function usesFieldArt(edition: RuntimeEdition): boolean {
  return Boolean(edition.bindings?.["world:ground"]);
}

/**
 * Resolves one named field texture when the edition binds that role.
 * @param edition Audience edition supplied by the host.
 * @param key Semantic binding key.
 * @returns Texture key and optional frame, or undefined when the role is unbound.
 */
function fieldTexture(edition: RuntimeEdition, key: string): ResolvedFieldTexture | undefined {
  if (!edition.bindings?.[key]) return undefined;
  const resolved = resolveAssetBinding(edition, key);
  return { textureKey: resolved.textureKey, frame: resolved.binding.frame };
}

/**
 * Places one image or sprite at a world position.
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
  texture: ResolvedFieldTexture,
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
 * Draws one trapezoid lane from the horizon to a tower.
 * @param graphics World graphics layer.
 * @param farX Horizon center of the lane.
 * @param farY Horizon y.
 * @param farWidth Lane width at the horizon.
 * @param nearX Tower baseline x.
 * @param nearY Tower baseline y.
 * @param nearWidth Lane width at the towers.
 * @returns Nothing. Fills two triangles when the API exists.
 */
function fillLane(
  graphics: PhaserGraphicsLike,
  farX: number,
  farY: number,
  farWidth: number,
  nearX: number,
  nearY: number,
  nearWidth: number,
): void {
  if (!graphics.fillTriangle) return;
  graphics.fillTriangle(
    farX - farWidth / 2,
    farY,
    farX + farWidth / 2,
    farY,
    nearX - nearWidth / 2,
    nearY,
  );
  graphics.fillTriangle(
    farX + farWidth / 2,
    farY,
    nearX + nearWidth / 2,
    nearY,
    nearX - nearWidth / 2,
    nearY,
  );
}

/**
 * Destroys persistent grass and tree sprites.
 * @param resources Live scene resource bag.
 * @returns Nothing. Clears world sprite ownership.
 */
function destroyWorldLayer(resources: SceneResources): void {
  resources.ground?.destroy();
  resources.ground = undefined;
  for (const sprite of resources.worldSprites) sprite.destroy();
  resources.worldSprites.length = 0;
  resources.worldWidth = 0;
  resources.worldHeight = 0;
}

/**
 * Builds grass, dirt lanes, horizon trees, towers, and the mage once per size.
 * @param scene Active Phaser scene.
 * @param resources Live scene resource bag.
 * @param edition Audience edition supplied by the host.
 * @param width Current scene width.
 * @param height Current scene height.
 * @returns Nothing. Creates world sprites when missing.
 */
function ensureWorldLayer(
  scene: PhaserSceneLike,
  resources: SceneResources,
  edition: RuntimeEdition,
  width: number,
  height: number,
): void {
  if (resources.worldWidth === width && resources.worldHeight === height && resources.ground) return;
  destroyWorldLayer(resources);
  resources.worldWidth = width;
  resources.worldHeight = height;

  const horizonY = height * MAGIC_DEFENSE_HORIZON_Y_RATIO;
  const towerY = height * MAGIC_DEFENSE_TOWER_Y_RATIO;
  const ground = fieldTexture(edition, "world:ground");
  if (ground) {
    const fieldHeight = Math.max(16, height - horizonY);
    if (scene.add?.tileSprite) {
      const tileWidth = 16 * Math.ceil(width / 16);
      const tileHeight = 16 * Math.ceil(fieldHeight / 16);
      const tiled = scene.add.tileSprite(0, horizonY, tileWidth, tileHeight, ground.textureKey);
      tiled.setOrigin?.(0, 0);
      tiled.setDepth?.(-35);
      resources.ground = tiled;
    } else {
      const image = placeImage(scene, width / 2, horizonY, ground, width, fieldHeight, -35, 0.5, 0);
      if (image) resources.ground = image;
    }
  }

  const road = fieldTexture(edition, "world:road");
  if (road) {
    for (const castleId of MAGIC_DEFENSE_CASTLES) {
      for (let step = 0; step <= 12; step += 1) {
        const pose = magicDefenseApproachPose(step / 12, castleId, width, height);
        const tile = Math.max(8, pose.size * 0.55);
        const image = placeImage(scene, pose.x, pose.y, road, tile, tile, -16, 0.5, 0.5);
        if (image) resources.worldSprites.push(image);
      }
    }
  }

  const tree = fieldTexture(edition, "prop:tree");
  if (tree) {
    for (const xRatio of HORIZON_TREE_X) {
      const image = placeImage(scene, width * xRatio, horizonY + 6, tree, 22, 24, -12);
      if (image) resources.worldSprites.push(image);
    }
    for (const position of MID_TREE_POSITIONS) {
      const image = placeImage(
        scene,
        width * position.x,
        height * position.y,
        tree,
        36,
        40,
        -6,
      );
      if (image) resources.worldSprites.push(image);
    }
  }

  const tower = fieldTexture(edition, "prop:tower");
  if (tower) {
    for (const castleId of MAGIC_DEFENSE_CASTLES) {
      const image = placeImage(
        scene,
        width * CASTLE_X[castleId],
        towerY,
        tower,
        MAGIC_DEFENSE_TOWER_DISPLAY.width,
        MAGIC_DEFENSE_TOWER_DISPLAY.height,
        6,
      );
      if (image) resources.worldSprites.push(image);
    }
  }

  const mage = fieldTexture(edition, "player:idle");
  if (mage) {
    const mageY = height * MAGIC_DEFENSE_CHOICE_Y_RATIO;
    const image = placeImage(scene, width * CASTLE_X.center, mageY, mage, 56, 56, 10);
    if (image) resources.worldSprites.push(image);
  }
}

/**
 * Moves or creates one approaching enemy sprite.
 * @param scene Active Phaser scene.
 * @param sprites Owned unit sprites.
 * @param liveIds Identifiers still present this frame.
 * @param id Stable sprite identifier.
 * @param x Horizontal display position.
 * @param y Vertical display position.
 * @param texture Resolved pack texture.
 * @param size Drawn size.
 * @param depth Draw order.
 * @returns Nothing. Updates sprite ownership.
 */
function syncUnitSprite(
  scene: PhaserSceneLike,
  sprites: Map<string, PhaserImageLike>,
  liveIds: Set<string>,
  id: string,
  x: number,
  y: number,
  texture: ResolvedFieldTexture,
  size: number,
  depth: number,
): void {
  liveIds.add(id);
  let sprite = sprites.get(id);
  if (!sprite) {
    sprite = placeImage(scene, x, y, texture, size, size, depth);
    if (!sprite) return;
    sprites.set(id, sprite);
  }
  sprite.setPosition?.(x, y);
  sprite.setDisplaySize?.(size, size);
  sprite.setDepth?.(depth);
  sprite.setVisible?.(true);
}

/**
 * Destroys unit sprites that are no longer in the current snapshot.
 * @param sprites Owned unit sprites.
 * @param liveIds Identifiers still present this frame.
 * @returns Nothing. Removes stale sprites.
 */
function pruneUnitSprites(sprites: Map<string, PhaserImageLike>, liveIds: Set<string>): void {
  for (const [id, sprite] of sprites) {
    if (liveIds.has(id)) continue;
    sprite.destroy();
    sprites.delete(id);
  }
}

/**
 * Returns the default session timer for a vocabulary deck.
 * @param itemCount Number of playable vocabulary targets.
 * @returns At least 60 seconds, and three seconds per item when that value is larger.
 */
export function magicDefenseTimerSeconds(itemCount: number): number {
  return Math.max(MAGIC_DEFENSE_DEFAULT_TIMER_SECONDS, itemCount * MAGIC_DEFENSE_SECONDS_PER_ITEM);
}

function positiveTimer(value: number | undefined, itemCount: number): number {
  const timer = value ?? magicDefenseTimerSeconds(itemCount);
  if (!Number.isFinite(timer) || timer <= 0) throw new Error("Magic Defense timer must be greater than zero");
  return timer;
}

function normalizeSeed(value: number | undefined): number {
  const seed = value ?? 0;
  if (!Number.isFinite(seed)) throw new Error("Magic Defense seed must be finite");
  return Math.abs(Math.trunc(seed)) % 1_000_000;
}

function seededIndex(seed: number, cursor: number, length: number): number {
  return (seed + cursor) % length;
}

function normalizeAnswer(value: string): string {
  return value.trim().replace(/\s+/gu, " ").toLocaleLowerCase();
}

function freezeHealth(health: Readonly<Record<MagicDefenseCastleId, number>>): Readonly<Record<MagicDefenseCastleId, number>> {
  return Object.freeze({ left: health.left, center: health.center, right: health.right });
}

function choicesFor(
  answers: readonly string[],
  targetIndex: number,
): readonly string[] {
  const expected = answers[targetIndex]!;
  const choices = [expected];
  for (let offset = 1; choices.length < 3 && offset <= answers.length; offset += 1) {
    const candidate = answers[(targetIndex + offset) % answers.length]!;
    if (!choices.some((choice) => normalizeAnswer(choice) === normalizeAnswer(candidate))) choices.push(candidate);
  }
  const rotation = (targetIndex + 1) % choices.length;
  return Object.freeze([...choices.slice(rotation), ...choices.slice(0, rotation)]);
}

function containsControlCharacter(value: string): boolean {
  return Array.from(value).some((character) => {
    const codePoint = character.codePointAt(0) ?? 0;
    return codePoint < 0x20 || codePoint === 0x7f;
  });
}

function inputCharacter(code: string): string | undefined {
  // KeyboardEvent.key is the produced character, including Thai. KeyboardEvent.code stays a KeyA fallback.
  const characters = Array.from(code);
  if (characters.length === 1) {
    const character = characters[0]!;
    return containsControlCharacter(character) ? undefined : character;
  }
  if (/^Key[A-Z]$/u.test(code)) return code.slice(3).toLocaleLowerCase();
  if (/^Digit[0-9]$/u.test(code)) return code.slice(5);
  if (/^Numpad[0-9]$/u.test(code)) return code.slice(6);
  if (code === "Space") return " ";
  const punctuation: Readonly<Record<string, string>> = {
    Minus: "-",
    Period: ".",
    Comma: ",",
    Slash: "/",
    Semicolon: ";",
    Quote: "'",
  };
  return punctuation[code];
}

function actionResult(
  snapshot: MagicDefenseSnapshot,
  values: Omit<MagicDefenseActionResult, "snapshot"> = {
    accepted: false,
    correct: false,
    progressed: false,
    terminal: false,
    completed: false,
  },
): MagicDefenseActionResult {
  return Object.freeze({ ...values, snapshot });
}

/**
 * Creates transport-independent Magic Defense rules for one vocabulary session.
 * @param input Untrusted vocabulary content supplied by a host or test.
 * @param deliver Callback that receives the first terminal result.
 * @param options Optional deterministic timer settings.
 * @returns A controller for typed translation and castle defense gameplay.
 * @throws When vocabulary content or timer settings are invalid.
 */
export function createMagicDefenseController(
  input: unknown,
  deliver: (result: GameResults, outcome: GameTerminalOutcome) => void | Promise<void>,
  options: MagicDefenseControllerOptions | number = {},
): MagicDefenseController {
  const parsedInput = vocabularyInputSchema.parse(input);
  const content = validateNonEmptyContent(parsedInput, "vocabulary");
  const items = content.items;
  const answers = items.map((item) => item.term);
  const normalizedOptions = typeof options === "number" ? { seed: options } : options;
  const timerLimit = positiveTimer(normalizedOptions.timerSeconds, items.length);
  const seed = normalizeSeed(normalizedOptions.seed);
  let terminalOutcome: GameTerminalOutcome = "complete";
  const completion = createCompletionLatch<GameResults>((result) => deliver(result, terminalOutcome));
  let accountant = createResultAccountant();
  let phase: MagicDefensePhase = "playing";
  let targetIndex = 0;
  let typingBuffer = "";
  let health: Record<MagicDefenseCastleId, number> = {
    left: MAGIC_DEFENSE_MAX_CASTLE_HEALTH,
    center: MAGIC_DEFENSE_MAX_CASTLE_HEALTH,
    right: MAGIC_DEFENSE_MAX_CASTLE_HEALTH,
  };
  let activeMissiles: MagicDefenseMissile[] = [];
  let spawnCursor = 0;
  let timeRemaining = timerLimit;
  let combo = 0;
  let mana = 0;
  let lastOutcome: MagicDefenseOutcome | undefined;
  let defeatReason: MagicDefenseDefeatReason | undefined;
  let terminalResult: GameResults | undefined;
  let spawnTimerMs = 0;
  let destroyed = false;

  const currentIndex = (): number => Math.min(targetIndex, items.length - 1);
  const currentItem = () => items[currentIndex()]!;
  const currentMissile = (): MagicDefenseMissile | undefined =>
    activeMissiles.find((missile) => missile.targetIndex === targetIndex);
  const castleForCursor = (): MagicDefenseCastleId => {
    const aliveCastles = MAGIC_DEFENSE_CASTLES.filter((castleId) => health[castleId] > 0);
    if (aliveCastles.length === 0) return "center";
    return aliveCastles[seededIndex(seed, spawnCursor, aliveCastles.length)]!;
  };

  const snapshot = (): MagicDefenseSnapshot => {
    const castleHealth = freezeHealth(health);
    const castles = Object.freeze(MAGIC_DEFENSE_CASTLES.map((id) => Object.freeze({
      id,
      health: castleHealth[id],
      maxHealth: MAGIC_DEFENSE_MAX_CASTLE_HEALTH,
    })));
    const missiles = Object.freeze(activeMissiles.map((missile) => Object.freeze({ ...missile })));
    const answerChoices = choicesFor(answers, currentIndex());
    return Object.freeze({
      seed,
      phase,
      targetIndex,
      targetCount: items.length,
      prompt: currentItem().translation,
      answer: currentItem().term,
      correctAction: currentItem().term,
      availableActions: answerChoices,
      typingBuffer,
      answerChoices,
      activeMissiles: missiles,
      missiles,
      castleHealth,
      castles,
      castleHp: castleHealth,
      score: accountant.score,
      combo,
      mana,
      lives: MAGIC_DEFENSE_CASTLES.reduce((total, castleId) => total + castleHealth[castleId], 0),
      energy: mana,
      correctAnswers: accountant.correctAnswers,
      totalAttempts: accountant.totalAttempts,
      timeRemaining,
      timer: timeRemaining,
      ...(lastOutcome === undefined ? {} : { lastOutcome }),
      ...(defeatReason === undefined ? {} : { defeatReason }),
      spawnCursor,
      spawnTimerMs,
      ...(terminalResult === undefined ? {} : { result: terminalResult }),
      destroyed,
    });
  };

  const result = (): GameResults => gameResultsSchema.parse(
    finalizeResult(accountant, { xpPerCorrect: 20, xpPerAccuracyPoint: 10 }),
  );

  const enterDefeat = (reason: MagicDefenseDefeatReason): GameResults => {
    phase = "defeat";
    terminalOutcome = "defeat";
    defeatReason = reason;
    activeMissiles = [];
    terminalResult = result();
    completion.complete(terminalResult);
    return terminalResult;
  };

  const enterVictory = (): GameResults => {
    phase = "victory";
    terminalOutcome = "victory";
    activeMissiles = [];
    terminalResult = result();
    completion.complete(terminalResult);
    return terminalResult;
  };

  const makeMissile = (itemIndex: number, castleId: MagicDefenseCastleId): MagicDefenseMissile => {
    const item = items[Math.max(0, Math.min(itemIndex, items.length - 1))]!;
    const missile = Object.freeze({
      id: `missile:${spawnCursor}`,
      targetCastleId: castleId,
      prompt: item.translation,
      answer: item.term,
      targetIndex: itemIndex,
      progress: 0,
    });
    spawnCursor += 1;
    activeMissiles = [...activeMissiles, missile];
    return missile;
  };

  const spawnCurrent = (): MagicDefenseMissile => {
    const existing = currentMissile();
    if (existing) return existing;
    return makeMissile(targetIndex, castleForCursor());
  };

  const retargetIfCastleFallen = (missileId: string): void => {
    const missile = activeMissiles.find((candidate) => candidate.id === missileId);
    if (!missile || health[missile.targetCastleId] > 0) return;
    const targetCastleId = castleForCursor();
    activeMissiles = activeMissiles.map((candidate) => candidate.id === missileId
      ? Object.freeze({ ...candidate, targetCastleId })
      : candidate);
  };

  const damageCastleForMissile = (missile: MagicDefenseMissile): GameResults | undefined => {
    const targetCastleId = health[missile.targetCastleId] > 0
      ? missile.targetCastleId
      : castleForCursor();
    health = { ...health, [targetCastleId]: Math.max(0, health[targetCastleId] - 1) };
    const allCastlesFallen = MAGIC_DEFENSE_CASTLES.every((castleId) => health[castleId] === 0);
    if (allCastlesFallen) return enterDefeat("castles");
    retargetIfCastleFallen(missile.id);
    return undefined;
  };

  spawnCurrent();

  const terminalResultFor = (
    before: MagicDefenseSnapshot,
    terminalResult: GameResults | undefined,
    values: Omit<MagicDefenseActionResult, "snapshot" | "result" | "terminal" | "completed">,
  ): MagicDefenseActionResult => actionResult(snapshot(), {
    ...values,
    terminal: terminalResult !== undefined,
    completed: terminalResult !== undefined,
    ...(terminalResult === undefined ? {} : { result: terminalResult }),
    ...(phase === "defeat" && before.phase === "playing" ? { reason: defeatReason } : {}),
  });

  const submit = (answer: string): MagicDefenseActionResult => {
    const before = snapshot();
    if (destroyed || phase !== "playing" || typeof answer !== "string") return actionResult(before);
    spawnCurrent();
    const correct = normalizeAnswer(answer) === normalizeAnswer(currentItem().term);
    accountant.recordAttempt({ correct });
    typingBuffer = "";
    lastOutcome = correct ? "correct" : "incorrect";
    if (!correct) {
      combo = 0;
      const terminalResult = damageCastleForMissile(currentMissile()!);
      return terminalResultFor(before, terminalResult, { accepted: true, correct: false, progressed: false });
    }

    combo += 1;
    mana = Math.min(MAGIC_DEFENSE_MAX_MANA, mana + 10);
    accountant.addScore(100);
    const missileIndex = activeMissiles.findIndex((missile) => missile.targetIndex === targetIndex);
    if (missileIndex >= 0) activeMissiles = activeMissiles.filter((_missile, index) => index !== missileIndex);
    targetIndex += 1;
    const terminalResult = targetIndex >= items.length ? enterVictory() : undefined;
    if (terminalResult === undefined) spawnCurrent();
    return terminalResultFor(before, terminalResult, { accepted: true, correct: true, progressed: true });
  };

  const choose = (answer: string): MagicDefenseActionResult => {
    const before = snapshot();
    if (destroyed || phase !== "playing" || typeof answer !== "string" || !before.availableActions.some((action) => normalizeAnswer(action) === normalizeAnswer(answer))) {
      return actionResult(before);
    }
    return submit(answer);
  };

  const miss = (missileId?: string): MagicDefenseActionResult => {
    const before = snapshot();
    if (destroyed || phase !== "playing") return actionResult(before);
    spawnCurrent();
    const missile = missileId === undefined
      ? currentMissile() ?? activeMissiles[0]
      : activeMissiles.find((candidate) => candidate.id === missileId);
    if (!missile) return actionResult(before);

    activeMissiles = activeMissiles.filter((candidate) => candidate.id !== missile.id);
    const targetCastleId = health[missile.targetCastleId] > 0 ? missile.targetCastleId : castleForCursor();
    health = { ...health, [targetCastleId]: Math.max(0, health[targetCastleId] - 1) };
    combo = 0;
    lastOutcome = "missed";
    const allCastlesFallen = MAGIC_DEFENSE_CASTLES.every((castleId) => health[castleId] === 0);
    const terminalResult = allCastlesFallen ? enterDefeat("castles") : undefined;
    if (terminalResult === undefined && missile.targetIndex === targetIndex) spawnCurrent();
    return terminalResultFor(before, terminalResult, { accepted: true, correct: false, progressed: false });
  };

  const advance = (seconds: number): MagicDefenseActionResult => {
    const before = snapshot();
    if (destroyed || phase !== "playing") return actionResult(before);
    if (!Number.isFinite(seconds) || seconds < 0) throw new Error("Magic Defense time must be nonnegative");
    timeRemaining = Math.max(0, timeRemaining - seconds);
    const terminalResult = timeRemaining === 0 ? enterDefeat("timer") : undefined;
    return terminalResultFor(before, terminalResult, {
      accepted: seconds > 0,
      correct: false,
      progressed: false,
    });
  };

  const restore = (state: MagicDefenseSnapshot): void => {
    if (destroyed) return;
    if (typeof state !== "object" || state === null) throw new Error("Magic Defense responsive state is invalid");
    if (state.seed !== seed) throw new Error("Magic Defense responsive seed is invalid");
    if (!Object.values<MagicDefensePhase>(["playing", "victory", "defeat"]).includes(state.phase)) {
      throw new Error("Magic Defense responsive phase is invalid");
    }
    if (state.targetCount !== items.length || !Number.isInteger(state.targetIndex) || state.targetIndex < 0 || state.targetIndex > items.length) {
      throw new Error("Magic Defense responsive target progress is invalid");
    }
    const expectedItem = items[Math.min(state.targetIndex, items.length - 1)]!;
    if (state.prompt !== expectedItem.translation || state.answer !== expectedItem.term || state.correctAction !== expectedItem.term) {
      throw new Error("Magic Defense responsive target content is invalid");
    }
    if (!Array.isArray(state.availableActions) || !Array.isArray(state.answerChoices) || state.availableActions.length !== state.answerChoices.length || state.availableActions.some((action, index) => action !== state.answerChoices[index])) {
      throw new Error("Magic Defense responsive answer actions are invalid");
    }
    const expectedActions = choicesFor(answers, Math.min(state.targetIndex, items.length - 1));
    if (state.availableActions.length !== expectedActions.length || state.availableActions.some((action, index) => action !== expectedActions[index])) {
      throw new Error("Magic Defense responsive answer choices are invalid");
    }
    if (!state.availableActions.some((action) => normalizeAnswer(action) === normalizeAnswer(state.correctAction))) {
      throw new Error("Magic Defense responsive actions omit the correct answer");
    }
    if (state.phase === "playing" && state.targetIndex >= items.length) throw new Error("Magic Defense responsive playing state is terminal");
    if (state.phase === "victory" && state.targetIndex !== items.length) throw new Error("Magic Defense responsive victory state is unfinished");
    if (state.phase === "playing" && state.result !== undefined) throw new Error("Magic Defense responsive playing state has a result");
    if (state.phase !== "playing" && state.result === undefined) throw new Error("Magic Defense responsive terminal result is missing");
    if (state.phase !== "defeat" && state.defeatReason !== undefined) throw new Error("Magic Defense responsive defeat reason is invalid");
    if (state.phase === "defeat" && state.defeatReason === undefined) throw new Error("Magic Defense responsive defeat reason is missing");
    if (state.phase === "defeat" && state.defeatReason !== "castles" && state.defeatReason !== "timer") throw new Error("Magic Defense responsive defeat reason is invalid");
    if (typeof state.typingBuffer !== "string" || typeof state.destroyed !== "boolean") throw new Error("Magic Defense responsive text state is invalid");
    if (!Number.isInteger(state.correctAnswers) || !Number.isInteger(state.totalAttempts) || state.correctAnswers < 0 || state.correctAnswers > state.totalAttempts || state.totalAttempts < 0 || !Number.isInteger(state.score) || state.score < 0 || !Number.isInteger(state.combo) || state.combo < 0 || state.combo > state.correctAnswers || !Number.isInteger(state.mana) || state.mana < 0 || state.mana > MAGIC_DEFENSE_MAX_MANA) {
      throw new Error("Magic Defense responsive counters are invalid");
    }
    if (!Number.isFinite(state.timeRemaining) || state.timeRemaining < 0 || state.timeRemaining > timerLimit) {
      throw new Error("Magic Defense responsive timer is invalid");
    }
    if (state.timer !== state.timeRemaining) throw new Error("Magic Defense responsive timer alias is invalid");
    if (state.phase === "playing" && state.timeRemaining === 0) throw new Error("Magic Defense responsive playing timer is terminal");
    if (state.phase === "defeat" && state.defeatReason === "timer" && state.timeRemaining !== 0) throw new Error("Magic Defense responsive timer defeat is unfinished");
    for (const castleId of MAGIC_DEFENSE_CASTLES) {
      const value = state.castleHealth[castleId];
      if (!Number.isInteger(value) || value < 0 || value > MAGIC_DEFENSE_MAX_CASTLE_HEALTH) {
        throw new Error("Magic Defense responsive castle health is invalid");
      }
    }
    const lives = MAGIC_DEFENSE_CASTLES.reduce((total, castleId) => total + state.castleHealth[castleId], 0);
    if (state.lives !== lives || state.energy !== state.mana) throw new Error("Magic Defense responsive shared resources are invalid");
    if (!Array.isArray(state.castles) || state.castles.length !== MAGIC_DEFENSE_CASTLES.length || !MAGIC_DEFENSE_CASTLES.every((castleId, index) => {
      const castle = state.castles[index];
      return castle?.id === castleId && castle.health === state.castleHealth[castleId] && castle.maxHealth === MAGIC_DEFENSE_MAX_CASTLE_HEALTH;
    })) throw new Error("Magic Defense responsive castle objects are invalid");
    if (!MAGIC_DEFENSE_CASTLES.every((castleId) => state.castleHp[castleId] === state.castleHealth[castleId])) {
      throw new Error("Magic Defense responsive castle health alias is invalid");
    }
    if (!Number.isInteger(state.spawnCursor) || state.spawnCursor < 0 || !Number.isFinite(state.spawnTimerMs) || state.spawnTimerMs < 0 || state.spawnTimerMs >= MAGIC_DEFENSE_MISSILE_SPAWN_INTERVAL_MS) {
      throw new Error("Magic Defense responsive spawn state is invalid");
    }
    if (state.lastOutcome !== undefined && !["correct", "incorrect", "missed"].includes(state.lastOutcome)) {
      throw new Error("Magic Defense responsive outcome is invalid");
    }
    if (state.phase === "defeat" && state.defeatReason === "castles" && state.lives !== 0) throw new Error("Magic Defense castle defeat is unfinished");
    if (state.result !== undefined) gameResultsSchema.parse(state.result);
    if (completion.hasCompleted && (state.phase === "playing" || terminalResult === undefined || state.result === undefined || terminalResult.accuracy !== state.result.accuracy || terminalResult.correctAnswers !== state.result.correctAnswers || terminalResult.totalAttempts !== state.result.totalAttempts || terminalResult.score !== state.result.score || terminalResult.xp !== state.result.xp)) {
      throw new Error("Magic Defense responsive completion latch is incompatible");
    }
    if (!Array.isArray(state.activeMissiles)) throw new Error("Magic Defense responsive missiles are invalid");
    if (state.phase !== "playing" && state.activeMissiles.length > 0) throw new Error("Magic Defense responsive terminal missiles are invalid");
    const missileIds = new Set<string>();
    for (const missile of state.activeMissiles) {
      const missileItem = items[missile.targetIndex];
      if (typeof missile.id !== "string" || missileIds.has(missile.id) || !MAGIC_DEFENSE_CASTLES.includes(missile.targetCastleId) || !Number.isInteger(missile.targetIndex) || missile.targetIndex < 0 || missile.targetIndex >= items.length || typeof missile.prompt !== "string" || typeof missile.answer !== "string" || missile.prompt !== missileItem?.translation || missile.answer !== missileItem?.term || !Number.isFinite(missile.progress) || missile.progress < 0 || missile.progress > 1) {
        throw new Error("Magic Defense responsive missile is invalid");
      }
      missileIds.add(missile.id);
    }
    if (!Array.isArray(state.missiles) || state.missiles.length !== state.activeMissiles.length || state.missiles.some((missile, index) => missile.id !== state.activeMissiles[index]?.id)) {
      throw new Error("Magic Defense responsive missile alias is invalid");
    }
    accountant = createResultAccountant();
    for (let index = 0; index < state.totalAttempts; index += 1) {
      accountant.recordAttempt({ correct: index < state.correctAnswers });
    }
    accountant.addScore(state.score);
    phase = state.phase;
    targetIndex = state.targetIndex;
    typingBuffer = state.typingBuffer;
    health = { ...state.castleHealth };
    activeMissiles = state.activeMissiles.map((missile) => Object.freeze({ ...missile }));
    spawnCursor = state.spawnCursor;
    spawnTimerMs = state.spawnTimerMs;
    timeRemaining = state.timeRemaining;
    combo = state.combo;
    mana = state.mana;
    lastOutcome = state.lastOutcome;
    defeatReason = state.defeatReason;
    terminalResult = state.result;
    if (phase !== "playing" || state.destroyed) completion.sealWithoutDelivery();
    destroyed = state.destroyed;
  };

  const controller: MagicDefenseController = {
    snapshot,
    choose,
    typeCharacter(character: string): MagicDefenseActionResult {
      const before = snapshot();
      if (destroyed || phase !== "playing" || typeof character !== "string" || Array.from(character).length !== 1 || containsControlCharacter(character)) {
        return actionResult(before);
      }
      typingBuffer += character;
      if (typingBuffer.length > 120) typingBuffer = typingBuffer.slice(-120);
      return actionResult(snapshot(), { accepted: true, correct: false, progressed: false, terminal: false, completed: false });
    },
    type(character: string): MagicDefenseActionResult {
      return controller.typeCharacter(character);
    },
    backspace(): MagicDefenseActionResult {
      const before = snapshot();
      if (destroyed || phase !== "playing" || typingBuffer.length === 0) return actionResult(before);
      typingBuffer = Array.from(typingBuffer).slice(0, -1).join("");
      return actionResult(snapshot(), { accepted: true, correct: false, progressed: false, terminal: false, completed: false });
    },
    submitAnswer(answer?: string): MagicDefenseActionResult {
      const supplied = answer ?? typingBuffer;
      return submit(supplied);
    },
    submit(answer?: string): MagicDefenseActionResult {
      return controller.submitAnswer(answer);
    },
    chooseAnswer(answer: string): MagicDefenseActionResult {
      return submit(answer);
    },
    spawnMissile(): MagicDefenseMissile {
      if (destroyed || phase !== "playing") {
        const item = currentItem();
        return Object.freeze({
          id: `sealed:${spawnCursor}`,
          targetCastleId: "center",
          prompt: item.translation,
          answer: item.term,
          targetIndex: currentIndex(),
          progress: 1,
        });
      }
      const itemIndex = seededIndex(seed, spawnCursor, items.length);
      const castleId = castleForCursor();
      return makeMissile(itemIndex, castleId);
    },
    missMissile: miss,
    missileMiss: miss,
    activateStorm(): MagicDefenseActionResult {
      const before = snapshot();
      if (destroyed || phase !== "playing" || mana < MAGIC_DEFENSE_MAX_MANA) return actionResult(before);
      const clearedMissiles = activeMissiles.length;
      activeMissiles = [];
      mana = 0;
      return actionResult(snapshot(), {
        accepted: true,
        correct: false,
        progressed: false,
        terminal: false,
        completed: false,
        clearedMissiles,
      });
    },
    useStorm(): MagicDefenseActionResult {
      return controller.activateStorm();
    },
    advanceTime: advance,
    tick(deltaMs: number): MagicDefenseActionResult {
      const before = snapshot();
      if (destroyed || phase !== "playing") return actionResult(before);
      if (!Number.isFinite(deltaMs) || deltaMs < 0) throw new Error("Magic Defense delta must be nonnegative");
      let latest = actionResult(before);
      const fallingIds = activeMissiles
        .map((missile) => ({ id: missile.id, progress: missile.progress + deltaMs / 8_000 }))
        .filter(({ progress }) => progress >= 1)
        .map(({ id }) => id);
      activeMissiles = activeMissiles.map((missile) => Object.freeze({
        ...missile,
        progress: Math.min(1, missile.progress + deltaMs / 8_000),
      }));
      for (const missileId of fallingIds) {
        latest = miss(missileId);
        if (phase !== "playing") return latest;
      }
      spawnTimerMs += deltaMs;
      while (spawnTimerMs >= MAGIC_DEFENSE_MISSILE_SPAWN_INTERVAL_MS && phase === "playing") {
        spawnTimerMs -= MAGIC_DEFENSE_MISSILE_SPAWN_INTERVAL_MS;
        controller.spawnMissile();
      }
      const timerResult = advance(deltaMs / 1_000);
      return timerResult.accepted || timerResult.terminal ? timerResult : latest;
    },
    capture: snapshot,
    restore,
    destroy(): void {
      if (destroyed) return;
      destroyed = true;
      completion.sealWithoutDelivery();
    },
    applyHazard: miss,
    storm(): MagicDefenseActionResult {
      return controller.activateStorm();
    },
  };
  return Object.freeze(controller);
}

function pointerInScene(
  scene: PhaserSceneLike,
  x: number,
  y: number,
  width: number,
  height: number,
): Readonly<{ x: number; y: number }> {
  const rect = scene.game?.canvas?.getBoundingClientRect?.();
  if (!rect || rect.width <= 0 || rect.height <= 0) return { x, y };
  return { x: (x - rect.left) * (width / rect.width), y: (y - rect.top) * (height / rect.height) };
}

function sceneDimensions(scene: PhaserSceneLike): { width: number; height: number } {
  return {
    width: scene.scale?.width ?? MAGIC_DEFENSE_CANVAS.width,
    height: scene.scale?.height ?? MAGIC_DEFENSE_CANVAS.height,
  };
}

function createScene(context: MagicDefenseSceneContext): Readonly<Record<string, unknown>> {
  let resources: SceneResources | undefined;
  let _composition = context.composition;
  let previousKeys = new Set<string>();
  let animationMs = 0;
  const fieldArt = usesFieldArt(context.edition);
  const normalize = createInputActionNormalizer({
    keyboard: MAGIC_DEFENSE_KEYBOARD_BINDINGS,
    pointerTap: { action: "confirm" },
  });
  const scheduler = createBoundedFrameScheduler((deltaMs) => {
    animationMs = (animationMs + deltaMs) % 2_000;
  });

  const updateView = (scene: PhaserSceneLike): void => {
    if (!resources || !scene.add) return;
    const { width, height } = sceneDimensions(scene);
    const state = context.controller.snapshot();
    const active = resources;
    const renderedWidth = scene.game?.canvas?.getBoundingClientRect?.().width ?? width;
    const renderedScale = renderedWidth > 0 ? Math.min(1, renderedWidth / width) : 1;
    const compactDisplay = renderedScale < 0.75 || width < 600 || _composition?.profile === "compact";
    const choiceCount = state.answerChoices.length;
    const promptFontSize = Math.max(22, Math.ceil(18 / renderedScale));
    const choiceFontSize = Math.max(16, Math.ceil(16 / renderedScale));
    const horizonY = height * MAGIC_DEFENSE_HORIZON_Y_RATIO;
    const towerY = height * MAGIC_DEFENSE_TOWER_Y_RATIO;
    const vanishX = width * 0.5;
    const choiceGap = compactDisplay ? 6 : Math.min(24, width * 0.035);
    const choiceWidth = compactDisplay
      ? (width - 24 - choiceGap * (choiceCount - 1)) / choiceCount
      : Math.min(250, width * 0.27);
    const choicesWidth = choiceWidth * choiceCount + choiceGap * (choiceCount - 1);
    const choiceStart = (width - choicesWidth) / 2;
    const choiceWrapWidth = choiceWidth - 16;
    for (let index = 0; index < active.choices.length; index += 1) {
      active.choices[index]?.setFontSize?.(choiceFontSize).setWordWrapWidth?.(choiceWrapWidth).setText(state.answerChoices[index] ?? "");
    }
    const wrappedChoiceHeight = Math.max(0, ...active.choices.slice(0, choiceCount).map((choice) => choice.height ?? 0));
    const choiceHeight = compactDisplay ? Math.max(76, Math.ceil(wrappedChoiceHeight + 16)) : 56;
    const choiceY = compactDisplay ? height - choiceHeight - 8 : height * MAGIC_DEFENSE_CHOICE_Y_RATIO;
    const pulse = Math.sin(animationMs / 2_000 * Math.PI * 2) * 2;
    const enemyTexture = fieldTexture(context.edition, "enemy:idle");

    active.worldGraphics.clear();
    active.graphics.clear();
    active.worldGraphics.fillStyle(0x87b8e8, 1).fillRect(0, 0, width, horizonY);
    if (fieldArt) {
      ensureWorldLayer(scene, active, context.edition, width, height);
    } else {
      active.worldGraphics.fillStyle(0xcfe8a8, 1).fillRect(0, horizonY, width, height - horizonY);
    }
    active.worldGraphics.fillStyle(0x6b8f3a, 0.35);
    for (const castleId of MAGIC_DEFENSE_CASTLES) {
      fillLane(
        active.worldGraphics,
        vanishX,
        horizonY,
        10,
        width * CASTLE_X[castleId],
        towerY,
        96,
      );
    }
    if (!fieldArt) {
      for (const castle of state.castles) {
        const x = CASTLE_X[castle.id] * width;
        const castleWidth = Math.min(72, width * 0.1);
        const castleHeight = MAGIC_DEFENSE_TOWER_DISPLAY.height;
        const y = towerY - castleHeight;
        active.worldGraphics.fillStyle(castle.health > 0 ? 0x8b5cf6 : 0x475569, 1)
          .fillRoundedRect(x - castleWidth / 2, y, castleWidth, castleHeight, 8);
      }
    }
    const liveIds = new Set<string>();
    for (const missile of state.activeMissiles) {
      const pose = magicDefenseApproachPose(missile.progress, missile.targetCastleId, width, height);
      const size = pose.size + pulse * (0.2 + missile.progress);
      if (enemyTexture) {
        syncUnitSprite(
          scene,
          active.unitSprites,
          liveIds,
          missile.id,
          pose.x,
          pose.y,
          enemyTexture,
          size,
          -4 + missile.progress * 16,
        );
      } else {
        active.worldGraphics.fillStyle(0x38bdf8, 0.95).fillCircle(pose.x, pose.y - size / 2, size / 2);
      }
      const label = active.missiles.get(missile.id);
      label?.setFontSize?.(Math.max(14, Math.ceil(12 / renderedScale))).setText(missile.prompt).setPosition(pose.x - 40, pose.y - size - 18);
      label?.setDepth?.(20);
    }
    pruneUnitSprites(active.unitSprites, liveIds);
    const existingIds = new Set(state.activeMissiles.map((missile) => missile.id));
    for (const [id, label] of active.missiles) {
      if (!existingIds.has(id)) {
        label.destroy();
        active.missiles.delete(id);
      }
    }
    for (const missile of state.activeMissiles) {
      if (!active.missiles.has(missile.id)) {
        const label = scene.add.text(0, 0, missile.prompt, { fontFamily: "Arial", color: "#1f2937", fontSize: "14px" });
        label.setDepth?.(20);
        active.missiles.set(missile.id, label);
      }
    }
    for (const castle of state.castles) {
      const x = CASTLE_X[castle.id] * width;
      const barY = towerY - MAGIC_DEFENSE_TOWER_DISPLAY.height - 8;
      active.graphics.fillStyle(0x0f172a, 0.85).fillRect(x - 28, barY, 56, 8);
      active.graphics.fillStyle(castle.health > 0 ? 0x4ade80 : 0x64748b, 1)
        .fillRect(x - 28, barY, 56 * castle.health / castle.maxHealth, 8);
    }
    for (let index = 0; index < choiceCount; index += 1) {
      const x = choiceStart + index * (choiceWidth + choiceGap);
      active.graphics.fillStyle(0xf8fafc, 0.92).fillRoundedRect(x, choiceY, choiceWidth, choiceHeight, 10);
      active.graphics.lineStyle(2, 0x1e3a5f, 0.85).strokeRoundedRect(x, choiceY, choiceWidth, choiceHeight, 10);
      active.choices[index]?.setPosition(x + 8, choiceY + 8);
    }
    active.graphics.fillStyle(state.mana >= MAGIC_DEFENSE_MAX_MANA ? 0xfacc15 : 0x64748b, 0.95)
      .fillRoundedRect(width * 0.74, 28, width * 0.22, 38, 10);
    active.title.setText("").setPosition(24, 16);
    active.prompt.setFontSize?.(promptFontSize).setWordWrapWidth?.(width - 48).setText(state.prompt).setPosition(24, 42);
    active.hud.setText(`${state.targetIndex + 1}/${state.targetCount}  •  ♥ ${state.lives}  •  ⚡ ${state.mana}/${MAGIC_DEFENSE_MAX_MANA}  •  ${Math.ceil(state.timeRemaining)}s`).setPosition(24, 96);
    active.buffer.setFontSize?.(Math.max(22, Math.ceil(14 / renderedScale))).setText(`⌨ ${state.typingBuffer || "_"}`).setPosition(24, choiceY - 40);
    active.storm.setText(state.mana >= MAGIC_DEFENSE_MAX_MANA ? "STORM READY" : "STORM").setPosition(width * 0.77, 39);
    active.feedback.setText(state.phase === "victory" ? "VICTORY" : state.phase === "defeat" ? "DEFEAT" : state.lastOutcome === "correct" ? "CORRECT" : state.lastOutcome === "incorrect" ? "TRY AGAIN" : state.lastOutcome === "missed" ? "TOWER HIT" : "").setPosition(24, choiceY - 68);
    active.instructions.setText("").setPosition(24, height - 26);
  };

  const choosePointer = (scene: PhaserSceneLike, input: APKInputSnapshot): void => {
    if (!input.pointer.released || input.pointer.cancelled) return;
    const { width, height } = sceneDimensions(scene);
    const pointer = pointerInScene(scene, input.pointer.x, input.pointer.y, width, height);
    if (pointer.x >= width * 0.74 && pointer.y <= 80) {
      context.controller.activateStorm();
      return;
    }
    const renderedWidth = scene.game?.canvas?.getBoundingClientRect?.().width ?? width;
    const renderedScale = renderedWidth > 0 ? Math.min(1, renderedWidth / width) : 1;
    const compactDisplay = renderedScale < 0.75 || width < 600 || _composition?.profile === "compact";
    const state = context.controller.snapshot();
    const choiceCount = state.answerChoices.length;
    const choiceGap = compactDisplay ? 6 : Math.min(24, width * 0.035);
    const choiceWidth = compactDisplay
      ? (width - 24 - choiceGap * (choiceCount - 1)) / choiceCount
      : Math.min(250, width * 0.27);
    const wrappedChoiceHeight = Math.max(0, ...(resources?.choices.slice(0, choiceCount).map((choice) => choice.height ?? 0) ?? []));
    const choiceHeight = compactDisplay ? Math.max(76, Math.ceil(wrappedChoiceHeight + 16)) : 56;
    const choiceY = compactDisplay ? height - choiceHeight - 8 : height * MAGIC_DEFENSE_CHOICE_Y_RATIO;
    if (pointer.y < choiceY || pointer.y > choiceY + choiceHeight) return;
    const choicesWidth = choiceWidth * choiceCount + choiceGap * (choiceCount - 1);
    const choiceStart = (width - choicesWidth) / 2;
    const index = Math.floor((pointer.x - choiceStart) / (choiceWidth + choiceGap));
    if (index < 0 || index >= choiceCount) return;
    const choiceX = choiceStart + index * (choiceWidth + choiceGap);
    if (pointer.x < choiceX || pointer.x > choiceX + choiceWidth) return;
    const action = normalize({ modality: "pointer", phase: "up", x: pointer.x, y: pointer.y })[0]?.action;
    if (action === "confirm") context.controller.choose(state.answerChoices[index]!);
  };

  const handleKeyboard = (input: APKInputSnapshot): void => {
    const pressed = input.pressed ?? input.keys.filter((key) => !previousKeys.has(key));
    previousKeys = new Set(input.keys);
    for (const code of pressed) {
      const action = normalize({ modality: "keyboard", code })[0]?.action;
      if (action === "confirm") context.controller.submitAnswer();
      else if (action === "cancel") context.controller.backspace();
      else if (action === "pause") {
        const state = context.controller.snapshot();
        if (state.mana >= MAGIC_DEFENSE_MAX_MANA && state.typingBuffer.length === 0) context.controller.activateStorm();
        else context.controller.typeCharacter(" ");
      }
      else {
        const character = inputCharacter(code);
        if (character !== undefined) context.controller.typeCharacter(character);
      }
    }
  };

  const cleanup = (): void => {
    scheduler.cancel();
    context.controller.destroy();
    if (!resources) return;
    const active = resources;
    resources = undefined;
    active.worldGraphics.destroy();
    active.graphics.destroy();
    active.title.destroy();
    active.prompt.destroy();
    active.hud.destroy();
    active.buffer.destroy();
    active.feedback.destroy();
    active.instructions.destroy();
    active.storm.destroy();
    for (const choice of active.choices) choice.destroy();
    for (const missile of active.missiles.values()) missile.destroy();
    active.missiles.clear();
    destroyWorldLayer(active);
    for (const sprite of active.unitSprites.values()) sprite.destroy();
    active.unitSprites.clear();
    previousKeys = new Set<string>();
  };

  const preload = function (this: PhaserSceneLike): void {
    const keys = FIELD_ART_KEYS.filter((key) => Boolean(context.edition.bindings?.[key]));
    if (!this.load || keys.length === 0) return;
    preloadAssetBindings(this.load, context.edition, keys);
  };

  const create = function (this: PhaserSceneLike): void {
    if (!this.add) throw new Error("Magic Defense requires Phaser display services");
    const textWidth = Math.max(220, (context.composition?.safeRect?.width ?? MAGIC_DEFENSE_CANVAS.width) - 48);
    const style = { fontFamily: "Arial", color: "#0f172a", fontSize: "18px", wordWrap: { width: textWidth } };
    const worldGraphics = this.add.graphics();
    worldGraphics.setDepth?.(-18);
    const hudGraphics = this.add.graphics();
    hudGraphics.setDepth?.(50);
    resources = {
      worldGraphics,
      graphics: hudGraphics,
      title: this.add.text(24, 20, "", { ...style, fontSize: "28px", fontStyle: "bold" }),
      prompt: this.add.text(24, 66, "", { ...style, fontSize: "22px" }),
      hud: this.add.text(24, 105, "", { ...style, fontSize: "14px", color: "#1e3a5f" }),
      buffer: this.add.text(24, 0, "", { ...style, fontSize: "22px", color: "#7c2d12" }),
      feedback: this.add.text(24, 0, "", { ...style, fontSize: "16px", color: "#1f2937" }),
      instructions: this.add.text(24, 0, "", { ...style, fontSize: "13px", color: "#334155" }),
      storm: this.add.text(0, 0, "", { ...style, fontSize: "14px", fontStyle: "bold", color: "#0f172a" }),
      choices: [0, 1, 2].map(() => this.add!.text(0, 0, "", { ...style, fontSize: "16px" })),
      missiles: new Map(),
      worldSprites: [],
      unitSprites: new Map(),
      worldWidth: 0,
      worldHeight: 0,
    };
    for (const text of [
      resources.title,
      resources.prompt,
      resources.hud,
      resources.buffer,
      resources.feedback,
      resources.instructions,
      resources.storm,
      ...resources.choices,
    ]) {
      text.setDepth?.(60);
    }
    this.events?.once("shutdown", cleanup);
    this.events?.once("destroy", cleanup);
    updateView(this);
  };

  const update = function (this: PhaserSceneLike, _time = 0, delta = 0): void {
    if (!resources) return;
    scheduler.tick(delta);
    if (context.sessionMode === "playing") {
      const input = context.inputController.snapshot();
      handleKeyboard(input);
      choosePointer(this, input);
      context.controller.tick(delta);
    }
    updateView(this);
  };

  return {
    key: MAGIC_DEFENSE_ID,
    preload,
    create,
    update,
    extend: {
      apkCaptureResponsiveState: () => context.controller.capture(),
      apkRestoreResponsiveState: (state: unknown) => {
        if (typeof state !== "object" || state === null) throw new Error("Magic Defense responsive state is invalid");
        context.controller.restore(state as MagicDefenseSnapshot);
      },
      apkRecompose: (nextComposition: MagicDefenseSceneContext["composition"]) => {
        _composition = nextComposition;
      },
    },
  };
}

/**
 * Creates the Magic Defense standard APK cartridge.
 * @returns A vocabulary cartridge with direct typed-defense rules and a procedural scene.
 */
export function createMagicDefenseCartridge(): StandardExperienceCartridge {
  let activeController: MagicDefenseController | undefined;
  const standardExperience = createCartridgeStandardExperience({
    id: MAGIC_DEFENSE_ID,
    title: "Magic Defense",
    description: "Choose English answers for Thai targets to protect the castle.",
    inputMode: "vocabulary",
    objective: "Defend all castles by selecting each English answer.",
    mechanicInstruction: "Type the English answer before its missile reaches the castle.",
    keyboardKeys: ["Letters", "Enter", "Backspace", "Space"],
    executeTutorialAction: (actionId) => {
      const controller = activeController;
      if (!controller) return;
      if (actionId === "action:select-correct") controller.chooseAnswer(controller.snapshot().answer);
      else controller.chooseAnswer(controller.snapshot().answerChoices.find((choice) => choice !== controller.snapshot().answer) ?? "wrong");
    },
  });

  return {
    manifest: {
      id: MAGIC_DEFENSE_ID,
      title: "Magic Defense",
      description: "Choose English answers for Thai targets to protect the castle.",
      runtimeApiVersion: "1.0.0",
      inputMode: "vocabulary",
      requiredAssetBindings: ["legacy-catalog/magic-defense/arcane-castle"],
      capabilities: [
        "capability:three-answer-lanes",
        "capability:spell-energy-cost",
        "capability:castle-ward-hazards",
      ],
    },
    standardExperience,
    createGameConfig(context: CartridgeGameConfigContext): Readonly<Record<string, unknown>> {
      const input = vocabularyInputSchema.parse(context.input);
      const sessionMode = context.sessionMode ?? "playing";
      const controller = createMagicDefenseController(
        input,
        sessionMode === "playing" ? (result, outcome) => context.complete(result, outcome) : () => undefined,
        { timerSeconds: magicDefenseTimerSeconds(input.length), seed: context.seed ?? 0 },
      );
      activeController = controller;
      context.diagnostic({
        level: "debug",
        code: "MAGIC_DEFENSE_READY",
        message: "Magic Defense typed missile wards are ready.",
         details: { cartridgeId: MAGIC_DEFENSE_ID, editionId: context.edition.id, targetCount: input.length, seed: context.seed ?? 0 },
      });
      return {
        width: MAGIC_DEFENSE_CANVAS.width,
        height: MAGIC_DEFENSE_CANVAS.height,
        render: { antialias: false, pixelArt: true },
        scene: createScene({
          controller,
          inputController: context.inputController,
          composition: context.composition,
          diagnostic: context.diagnostic,
          sessionMode,
          edition: context.edition,
        }),
      };
    },
  };
}
