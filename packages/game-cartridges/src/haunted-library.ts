import {
  gameResultsSchema,
  sentenceInputSchema,
  type GameResults,
  type SentenceInput,
} from "@reading-advantage/game-contracts";
import {
  createActorSpriteLayer,
  createBoundedFrameScheduler,
  createCompletionLatch,
  createInputActionNormalizer,
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

/** Stable public identifier for The Haunted Library cartridge. */
export const HAUNTED_LIBRARY_ID = "haunted-library" as const;

/** Canonical portrait scene size before host scaling. */
export const HAUNTED_LIBRARY_CANVAS = Object.freeze({ width: 390, height: 844 });

/** Legacy portrait width retained by the bespoke library rules. */
export const GAME_WIDTH = HAUNTED_LIBRARY_CANVAS.width;

/** Legacy portrait height retained by the bespoke library rules. */
export const GAME_HEIGHT = HAUNTED_LIBRARY_CANVAS.height;

/** Height of one library floor in the canonical scene. */
export const FLOOR_HEIGHT = 160;

/** Height of an edge trampoline in the canonical scene. */
export const TRAMPOLINE_HEIGHT = 20;

/** Width of one edge trampoline in the canonical scene. */
export const TRAMPOLINE_WIDTH = 40;

/** Width of the player collision body. */
export const PLAYER_WIDTH = 48;

/** Height of the player collision body. */
export const PLAYER_HEIGHT = 64;

/** Width of a library door. */
export const DOOR_WIDTH = 60;

/** Height of a library door. */
export const DOOR_HEIGHT = 80;

/** Number of lives granted to a new library session. */
export const INITIAL_LIVES = 3;

/** Duration of collision protection after the player takes damage. */
export const INVULNERABILITY_MS = 1_200;

/** Horizontal movement speed in canonical scene pixels per second. */
export const PLAYER_SPEED = 200;

/** Horizontal movement applied by one direct directional input. */
export const PLAYER_STEP = 56;

/** Downward acceleration in canonical scene pixels per second squared. */
export const GRAVITY = 800;

/** Vertical velocity applied by a manual jump. */
export const JUMP_FORCE = -500;

/** Vertical velocity applied by an edge trampoline. */
export const TRAMPOLINE_FORCE = -700;

/** Horizontal ghost speed in canonical scene pixels per second. */
export const GHOST_SPEED = 72;

/** Horizontal bat speed in canonical scene pixels per second. */
export const BAT_SPEED = 128;

/** Number of floors in the library. */
export const FLOOR_COUNT = 4;

/** Maximum frame delta used by the transport-independent physics simulation. */
export const MAX_FRAME_DELTA_MS = 250;

/** Canonical width of one compact bottom D-pad button. */
const DPAD_BUTTON_WIDTH = 48;

/** Canonical height of one compact bottom D-pad button. */
const DPAD_BUTTON_HEIGHT = 48;

/** Canonical gap between compact bottom D-pad buttons. */
const DPAD_BUTTON_GAP = 8;

/** Canonical inset from the scene bottom to the D-pad bar. */
const DPAD_BOTTOM_INSET = 16;

/** Vertical offset used to drop through the current floor. */
const FLOOR_DROP_PX = 3;

/** Keyboard bindings for the library D-pad. */
export const HAUNTED_LIBRARY_KEYBOARD_BINDINGS: Readonly<Record<string, InputActionId>> = Object.freeze({
  ArrowLeft: "move-left",
  KeyA: "move-left",
  ArrowRight: "move-right",
  KeyD: "move-right",
  ArrowUp: "move-up",
  KeyW: "move-up",
  ArrowDown: "move-down",
  KeyS: "move-down",
  Enter: "confirm",
  Space: "confirm",
});

/** Input actions owned by The Haunted Library controller. */
export type HauntedLibraryAction =
  | "move-left"
  | "move-right"
  | "move-up"
  | "move-down"
  | "confirm";

/** One compact D-pad control in scene pixels. */
export interface HauntedLibraryDpadButton {
  /** Semantic action this control dispatches. */
  readonly action: HauntedLibraryAction;
  /** Left edge in scene pixels. */
  readonly x: number;
  /** Top edge in scene pixels. */
  readonly y: number;
  /** Control width in scene pixels. */
  readonly width: number;
  /** Control height in scene pixels. */
  readonly height: number;
}

/** Active or terminal phase in a library session. */
export type HauntedLibraryPhase = "playing" | "victory" | "defeat";

/** Explicit outcome labels retained in snapshots and action results. */
export type HauntedLibraryOutcome =
  | "correct"
  | "incorrect"
  | "hazard"
  | "traversal"
  | "victory"
  | "defeat";

/** Event exposed by the library rules for feedback and diagnostics. */
export type HauntedLibraryEvent =
  | "move"
  | "floor-transition"
  | "correct"
  | "wrong"
  | "damage"
  | "victory"
  | "defeat";

/** Deterministic options for one Haunted Library session. */
export interface HauntedLibraryControllerOptions {
  /** Host-provided seed used for doors, ghosts, and bat hazards. */
  readonly seed?: number;
  /** Optional starting life count for bounded tests and hosts. */
  readonly initialLives?: number;
  /** Whether a terminal result may be delivered to the host. */
  readonly allowCompletion?: boolean;
}

/** A positioned sentence-word door in the library. */
export interface HauntedLibraryDoor {
  /** Stable door identifier. */
  readonly id: string;
  /** Horizontal center in canonical scene pixels. */
  readonly x: number;
  /** Floor containing the door. */
  readonly floor: number;
  /** Vertical top position in canonical scene pixels. */
  readonly y: number;
  /** Index of this word in the active sentence. */
  readonly wordIndex: number;
  /** Word shown on the door. */
  readonly word: string;
  /** Whether the door has been opened. */
  readonly isOpen: boolean;
  /** Whether the latest attempt on this door was correct. */
  readonly isCorrect: boolean | null;
}

/** One edge trampoline used for floor traversal. */
export interface HauntedLibraryTrampoline {
  /** Stable trampoline identifier. */
  readonly id: string;
  /** Horizontal edge position. */
  readonly x: number;
  /** Floor containing the trampoline. */
  readonly floor: number;
  /** Trampoline width. */
  readonly width: number;
  /** Trampoline height. */
  readonly height: number;
}

/** A moving ghost hazard. */
export interface HauntedLibraryGhost {
  /** Stable ghost identifier. */
  readonly id: string;
  /** Horizontal center in canonical scene pixels. */
  readonly x: number;
  /** Floor containing the ghost. */
  readonly floor: number;
  /** Horizontal velocity in canonical scene pixels per second. */
  readonly velocityX: number;
  /** Remaining stun duration. */
  readonly stunMs: number;
  /** Legacy-compatible stun duration alias. */
  readonly stunTimer: number;
  /** Current ghost movement state. */
  readonly state: "walking" | "stunned";
}

/** A moving bat hazard created by a wrong door. */
export interface HauntedLibraryBat {
  /** Stable bat identifier. */
  readonly id: string;
  /** Horizontal center in canonical scene pixels. */
  readonly x: number;
  /** Floor containing the bat. */
  readonly floor: number;
  /** Horizontal velocity in canonical scene pixels per second. */
  readonly velocityX: number;
}

/** Player position, physics, and facing state. */
export interface HauntedLibraryPlayer {
  /** Horizontal center in canonical scene pixels. */
  readonly x: number;
  /** Vertical top in canonical scene pixels. */
  readonly y: number;
  /** Current or most recently landed floor index. */
  readonly floor: number;
  /** Last horizontal direction. */
  readonly facing: "left" | "right";
  /** Horizontal velocity retained for physics diagnostics. */
  readonly velocityX: number;
  /** Vertical velocity retained for physics diagnostics. */
  readonly velocityY: number;
  /** Current movement state. */
  readonly state: "idle" | "walking" | "jumping";
  /** Whether the player currently stands on a floor. */
  readonly onFloor: boolean;
  /** Collision body width. */
  readonly width: number;
  /** Collision body height. */
  readonly height: number;
}

/** Immutable state exposed by the transport-independent library controller. */
export interface HauntedLibrarySnapshot {
  /** Deterministic host seed for this session. */
  readonly seed: number;
  /** Current gameplay phase. */
  readonly phase: HauntedLibraryPhase;
  /** Current sentence index. */
  readonly sentenceIndex: number;
  /** Number of sentence items in this finite session. */
  readonly sentenceCount: number;
  /** Active sentence content. */
  readonly currentSentence: Readonly<SentenceInput[number]>;
  /** Translation prompt for the active sentence. */
  readonly prompt: string;
  /** Next source-language word answer. */
  readonly answer: string;
  /** Semantic action that opens the active door when the player is nearby. */
  readonly correctAction: "confirm";
  /** Semantic actions accepted by this controller. */
  readonly availableActions: readonly HauntedLibraryAction[];
  /** Words in the active sentence. */
  readonly words: readonly string[];
  /** Index of the next word in the active sentence. */
  readonly wordIndex: number;
  /** Flattened index of the next word in the finite session. */
  readonly targetIndex: number;
  /** Flattened word count in the finite session. */
  readonly targetCount: number;
  /** Current player state. */
  readonly player: HauntedLibraryPlayer;
  /** Floor positions from the bottom floor upward. */
  readonly floors: readonly { readonly y: number; readonly height: number }[];
  /** Edge trampolines used for upward floor traversal. */
  readonly trampolines: readonly HauntedLibraryTrampoline[];
  /** Doors for the active sentence, ordered by word index. */
  readonly doors: readonly HauntedLibraryDoor[];
  /** Active ghosts. */
  readonly ghosts: readonly HauntedLibraryGhost[];
  /** Active bats. */
  readonly bats: readonly HauntedLibraryBat[];
  /** Next bat serial number. */
  readonly batSerial: number;
  /** Remaining lives. */
  readonly lives: number;
  /** Starting lives for this session. */
  readonly initialLives: number;
  /** Shared resource alias for remaining lives. */
  readonly energy: number;
  /** Remaining collision protection. */
  readonly invulnerableMs: number;
  /** Current score. */
  readonly score: number;
  /** Correct door count. */
  readonly correctAnswers: number;
  /** Door attempt count. */
  readonly totalAttempts: number;
  /** Most recent game event. */
  readonly lastEvent: HauntedLibraryEvent | null;
  /** Most recent explicit gameplay outcome. */
  readonly lastOutcome: HauntedLibraryOutcome | undefined;
  /** First terminal result, when the session has ended. */
  readonly result?: GameResults;
  /** Elapsed active gameplay time. */
  readonly gameTime: number;
  /** Whether the controller has been destroyed. */
  readonly destroyed: boolean;
}

/** Result returned after one input action or hazard event. */
export interface HauntedLibraryActionResult {
  /** Whether the action changed the active session. */
  readonly accepted: boolean;
  /** Whether the action opened the correct next door. */
  readonly correct: boolean;
  /** Whether the action advanced sentence progress. */
  readonly progressed: boolean;
  /** Explicit outcome produced by an accepted learning or hazard action. */
  readonly outcome?: HauntedLibraryOutcome;
  /** Whether the session reached a terminal phase. */
  readonly terminal: boolean;
  /** Compatibility alias for terminal. */
  readonly completed: boolean;
  /** Terminal result emitted by the first terminal action. */
  readonly result?: GameResults;
  /** State after the action. */
  readonly snapshot: HauntedLibrarySnapshot;
}

/** Rules and lifecycle controls for one Haunted Library session. */
export interface HauntedLibraryController {
  /** Returns the current immutable library state. */
  snapshot(): HauntedLibrarySnapshot;
  /** Applies one semantic D-pad action. */
  dispatch(action: HauntedLibraryAction): HauntedLibraryActionResult;
  /** Applies one directional input using a short direction name. */
  move(direction: "left" | "right" | "up" | "down", distance?: number): HauntedLibraryActionResult;
  /** Attempts the nearest unopened door on the player's current floor. */
  interact(): HauntedLibraryActionResult;
  /** Compatibility entry point for semantic actions. */
  choose(action: InputActionId): HauntedLibraryActionResult;
  /** Advances gravity, jumping, moving hazards, and collision protection. */
  tick(deltaMs: number): HauntedLibrarySnapshot;
  /** Applies one direct hazard hit for deterministic host tests. */
  applyHazard(): HauntedLibraryActionResult;
  /** Captures state before a responsive reflow. */
  capture(): HauntedLibrarySnapshot;
  /** Restores a fully validated responsive state. */
  restore(state: HauntedLibrarySnapshot): void;
  /** Seals the session and releases later completion delivery. */
  destroy(): void;
}

/** Delivery callback used by the controller and host completion boundary. */
type HauntedLibraryCompletionDelivery = (
  result: GameResults,
  outcome?: GameTerminalOutcome,
) => void | Promise<void>;

/** Minimal Phaser graphics surface used by the procedural library scene. */
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

/** Minimal Phaser text surface used by the procedural library scene. */
interface PhaserTextLike {
  setPosition(x: number, y: number): this;
  setText(value: string): this;
  destroy(): void;
}

/** Minimal Phaser canvas surface for pointer coordinate conversion. */
interface PhaserCanvasLike {
  getBoundingClientRect?(): {
    readonly left: number;
    readonly top?: number;
    readonly width: number;
    readonly height?: number;
  };
}

/** Minimal Phaser scene surface required by this cartridge. */
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

/** Resources owned by one active library scene. */
interface SceneResources {
  readonly art: ActorSpriteLayer;
  readonly graphics: PhaserGraphicsLike;
  readonly title: PhaserTextLike;
  readonly prompt: PhaserTextLike;
  readonly progress: PhaserTextLike;
  readonly feedback: PhaserTextLike;
  readonly instructions: PhaserTextLike;
  readonly doors: readonly PhaserTextLike[];
}

/** Context passed from the cartridge factory to the procedural scene. */
interface HauntedLibrarySceneContext {
  readonly edition: RuntimeEdition;
  readonly controller: HauntedLibraryController;
  readonly inputController: APKInputController;
  readonly composition: CartridgeGameConfigContext["composition"];
  readonly diagnostic: CartridgeGameConfigContext["diagnostic"];
  readonly sessionMode: NonNullable<CartridgeGameConfigContext["sessionMode"]>;
  readonly maxDoorCount: number;
}

const FLOOR_POSITIONS = Object.freeze(
  Array.from({ length: FLOOR_COUNT }, (_, floor) => Object.freeze({
    y: GAME_HEIGHT - 100 - FLOOR_HEIGHT * floor,
    height: 20,
  })),
);

const TRAMPOLINES = Object.freeze(
  FLOOR_POSITIONS.flatMap((floor, index) => [
    Object.freeze({ id: `trampoline:left:${index}`, x: 0, floor: index, width: TRAMPOLINE_WIDTH, height: TRAMPOLINE_HEIGHT }),
    Object.freeze({ id: `trampoline:right:${index}`, x: GAME_WIDTH - TRAMPOLINE_WIDTH, floor: index, width: TRAMPOLINE_WIDTH, height: TRAMPOLINE_HEIGHT }),
  ]),
);

const ACTIONS = Object.freeze([
  "move-left",
  "move-right",
  "move-up",
  "move-down",
  "confirm",
] as const);

const DPAD_ACTIONS = Object.freeze([
  "move-left",
  "move-up",
  "confirm",
  "move-down",
  "move-right",
] as const);

const EMPTY_VALUES = {
  accepted: false,
  correct: false,
  progressed: false,
  terminal: false,
  completed: false,
} as const;

function normalizeSeed(seed: number | undefined): number {
  if (seed === undefined) return 0;
  if (!Number.isFinite(seed)) throw new Error("Haunted Library seed must be finite");
  return Math.abs(Math.trunc(seed)) >>> 0;
}

function seededUnit(seed: number, first: number, second: number, salt: number): number {
  let value = (seed ^ Math.imul(first + 1, 0x45d9f3b) ^ Math.imul(second + 1, 0x119de1f3) ^ salt) >>> 0;
  value = Math.imul(value ^ (value >>> 16), 0x45d9f3b) >>> 0;
  value = Math.imul(value ^ (value >>> 16), 0x45d9f3b) >>> 0;
  return ((value ^ (value >>> 16)) >>> 0) / 4_294_967_296;
}

function wrapX(x: number): number {
  return ((x % GAME_WIDTH) + GAME_WIDTH) % GAME_WIDTH;
}

function circularDistance(left: number, right: number): number {
  const distance = Math.abs(left - right);
  return Math.min(distance, GAME_WIDTH - distance);
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}

function freezeDoor(door: HauntedLibraryDoor): HauntedLibraryDoor {
  return Object.freeze({ ...door });
}

function freezeGhost(ghost: HauntedLibraryGhost): HauntedLibraryGhost {
  return Object.freeze({ ...ghost });
}

function freezeBat(bat: HauntedLibraryBat): HauntedLibraryBat {
  return Object.freeze({ ...bat });
}

function tokenize(sentence: string): readonly string[] {
  const words = sentence.trim().split(/\s+/u).filter(Boolean);
  if (words.length === 0) throw new Error("Haunted Library sentences must contain words");
  return Object.freeze(words);
}

function totalWordCount(sentences: SentenceInput): number {
  return sentences.reduce((total, sentence) => total + tokenize(sentence.term).length, 0);
}

function targetOffset(sentences: SentenceInput, sentenceIndex: number): number {
  return sentences
    .slice(0, sentenceIndex)
    .reduce((total, sentence) => total + tokenize(sentence.term).length, 0);
}

function createDoors(words: readonly string[], sentenceIndex: number, seed: number): HauntedLibraryDoor[] {
  return words.map((word, wordIndex) => {
    const floor = Math.floor(seededUnit(seed, sentenceIndex, wordIndex, 11) * FLOOR_COUNT);
    const x = 50 + seededUnit(seed, sentenceIndex, wordIndex, 23) * (GAME_WIDTH - 100);
    return freezeDoor({
      id: `door:${sentenceIndex}:${wordIndex}`,
      x,
      floor,
      y: FLOOR_POSITIONS[floor]!.y - DOOR_HEIGHT,
      wordIndex,
      word,
      isOpen: false,
      isCorrect: null,
    });
  });
}

function createGhosts(doors: readonly HauntedLibraryDoor[], sentenceIndex: number, seed: number): HauntedLibraryGhost[] {
  return Array.from({ length: 3 }, (_, index) => {
    const sourceDoor = doors[index % doors.length]!;
    const floor = index === 0
      ? doors[0]!.floor
      : Math.floor(seededUnit(seed, sentenceIndex, index, 37) * FLOOR_COUNT);
    const x = index === 0
      ? wrapX(doors[0]!.x + 34)
      : 24 + seededUnit(seed, sentenceIndex, index, 41) * (GAME_WIDTH - 48);
    return freezeGhost({
      id: `ghost:${sentenceIndex}:${index}`,
      x: index === 0 ? x : wrapX(x + sourceDoor.x * 0.12),
      floor,
      velocityX: seededUnit(seed, sentenceIndex, index, 53) < 0.5 ? GHOST_SPEED : -GHOST_SPEED,
      stunMs: 0,
      stunTimer: 0,
      state: "walking",
    });
  });
}

function playerAtFloor(floor: number, x = GAME_WIDTH / 2): HauntedLibraryPlayer {
  return Object.freeze({
    x: clamp(x, 0, GAME_WIDTH),
    y: FLOOR_POSITIONS[floor]!.y - PLAYER_HEIGHT,
    floor,
    facing: "right",
    velocityX: 0,
    velocityY: 0,
    state: "idle",
    onFloor: true,
    width: PLAYER_WIDTH,
    height: PLAYER_HEIGHT,
  });
}

function cloneSnapshot(state: HauntedLibrarySnapshot): HauntedLibrarySnapshot {
  return Object.freeze({
    ...state,
    currentSentence: Object.freeze({ ...state.currentSentence }),
    words: Object.freeze([...state.words]),
    player: Object.freeze({ ...state.player }),
    floors: Object.freeze(state.floors.map((floor) => Object.freeze({ ...floor }))),
    trampolines: Object.freeze(state.trampolines.map((trampoline) => Object.freeze({ ...trampoline }))),
    doors: Object.freeze(state.doors.map(freezeDoor)),
    ghosts: Object.freeze(state.ghosts.map(freezeGhost)),
    bats: Object.freeze(state.bats.map(freezeBat)),
    ...(state.result === undefined ? {} : { result: Object.freeze({ ...state.result }) }),
  });
}

function actionResult(
  snapshot: HauntedLibrarySnapshot,
  values: Omit<HauntedLibraryActionResult, "snapshot">,
): HauntedLibraryActionResult {
  return Object.freeze({ ...values, snapshot });
}

function normalizedPointerPosition(
  scene: PhaserSceneLike,
  pointerX: number,
  pointerY: number,
  width: number,
  height: number,
): { readonly x: number; readonly y: number } {
  const rect = scene.game?.canvas?.getBoundingClientRect?.();
  const rectHeight = rect?.height ?? height;
  if (!rect || rect.width <= 0 || rectHeight <= 0) return { x: pointerX, y: pointerY };
  return {
    x: (pointerX - rect.left) * (width / rect.width),
    y: (pointerY - (rect.top ?? 0)) * (height / rectHeight),
  };
}

/**
 * Returns compact D-pad buttons placed below floor 0 for the current scene size.
 * @param width The current scene width.
 * @param height The current scene height.
 * @returns Frozen button rectangles in scene pixels.
 */
export function getHauntedLibraryDpadLayout(
  width: number,
  height: number,
): readonly HauntedLibraryDpadButton[] {
  const buttonWidth = DPAD_BUTTON_WIDTH * width / GAME_WIDTH;
  const buttonHeight = DPAD_BUTTON_HEIGHT * height / GAME_HEIGHT;
  const gap = DPAD_BUTTON_GAP * width / GAME_WIDTH;
  const bottomInset = DPAD_BOTTOM_INSET * height / GAME_HEIGHT;
  const totalWidth = DPAD_ACTIONS.length * buttonWidth + (DPAD_ACTIONS.length - 1) * gap;
  const startX = (width - totalWidth) / 2;
  const y = height - bottomInset - buttonHeight;
  return Object.freeze(DPAD_ACTIONS.map((action, index) => Object.freeze({
    action,
    x: startX + index * (buttonWidth + gap),
    y,
    width: buttonWidth,
    height: buttonHeight,
  })));
}

/**
 * Maps a responsive pointer or touch coordinate to a library D-pad action.
 * @param pointerX The pointer position in scene coordinates.
 * @param pointerY The pointer position in scene coordinates.
 * @param width The current scene width.
 * @param height The current scene height.
 * @returns The semantic action under the pointer, when one exists.
 */
export function chooseHauntedLibraryActionFromPointer(
  pointerX: number,
  pointerY: number,
  width: number,
  height: number,
): HauntedLibraryAction | undefined {
  return getHauntedLibraryDpadLayout(width, height).find((button) => (
    pointerX >= button.x
    && pointerX <= button.x + button.width
    && pointerY >= button.y
    && pointerY <= button.y + button.height
  ))?.action;
}

/**
 * Finds the nearest unopened door on the player's current floor.
 * @param snapshot The immutable library state to inspect.
 * @returns The nearest unopened door, when one is reachable.
 */
export function findNearestHauntedLibraryDoor(
  snapshot: HauntedLibrarySnapshot,
): HauntedLibraryDoor | undefined {
  return snapshot.doors
    .filter((door) => door.floor === snapshot.player.floor && !door.isOpen)
    .map((door, index) => ({ door, index, distance: circularDistance(snapshot.player.x, door.x) }))
    .filter(({ distance }) => distance <= 72)
    .sort((left, right) => left.distance - right.distance || left.index - right.index)[0]?.door;
}

/**
 * Creates the finite, seeded rules for The Haunted Library.
 * @param input Untrusted sentence content supplied by the host or a test.
 * @param deliver Callback that receives the first terminal result.
 * @param options Deterministic placement, life, and delivery settings.
 * @returns A transport-independent Haunted Library controller.
 * @throws When content, the seed, or the life count is invalid.
 */
export function createHauntedLibraryController(
  input: unknown,
  deliver: HauntedLibraryCompletionDelivery,
  options: HauntedLibraryControllerOptions | number = {},
): HauntedLibraryController {
  const parsedInput = sentenceInputSchema.parse(input);
  const content = validateNonEmptyContent(parsedInput, "sentence");
  const sentences: SentenceInput = content.items.map(({ term, translation }) => ({ term, translation }));
  const targetCount = totalWordCount(sentences);
  const resolvedOptions = typeof options === "number" ? { seed: options } : options;
  const seed = normalizeSeed(resolvedOptions.seed);
  const initialLives = resolvedOptions.initialLives ?? INITIAL_LIVES;
  const allowCompletion = resolvedOptions.allowCompletion ?? true;
  if (!Number.isInteger(initialLives) || initialLives <= 0) {
    throw new Error("Haunted Library initial lives must be a positive integer");
  }

  let accountant = createResultAccountant();
  let phase: HauntedLibraryPhase = "playing";
  let sentenceIndex = 0;
  let wordIndex = 0;
  let player = playerAtFloor(0);
  let doors = createDoors(tokenize(sentences[0]!.term), 0, seed);
  let ghosts = createGhosts(doors, 0, seed);
  let bats: HauntedLibraryBat[] = [];
  let lives = initialLives;
  let invulnerableMs = 0;
  let lastEvent: HauntedLibraryEvent | null = null;
  let lastOutcome: HauntedLibraryOutcome | undefined;
  let terminalResultValue: GameResults | undefined;
  let gameTime = 0;
  let batSerial = 0;
  let destroyed = false;
  let terminalDeliveryOutcome: GameTerminalOutcome = "victory";
  const completion = createCompletionLatch<GameResults>((result) => deliver(result, terminalDeliveryOutcome));

  const activeSentence = (): Readonly<SentenceInput[number]> => sentences[Math.min(sentenceIndex, sentences.length - 1)]!;
  const activeWords = (): readonly string[] => tokenize(activeSentence().term);
  const globalTargetIndex = (): number => phase === "victory"
    ? targetCount
    : targetOffset(sentences, sentenceIndex) + wordIndex;

  const snapshot = (): HauntedLibrarySnapshot => {
    const sentence = activeSentence();
    const words = activeWords();
    return cloneSnapshot({
      seed,
      phase,
      sentenceIndex,
      sentenceCount: sentences.length,
      currentSentence: sentence,
      prompt: sentence.translation,
      answer: phase === "victory" ? "" : words[wordIndex]!,
      correctAction: "confirm",
      availableActions: ACTIONS,
      words,
      wordIndex,
      targetIndex: globalTargetIndex(),
      targetCount,
      player,
      floors: FLOOR_POSITIONS,
      trampolines: TRAMPOLINES,
      doors,
      ghosts,
      bats,
      batSerial,
      lives,
      initialLives,
      energy: lives,
      invulnerableMs,
      score: accountant.score,
      correctAnswers: accountant.correctAnswers,
      totalAttempts: accountant.totalAttempts,
      lastEvent,
      lastOutcome,
      ...(terminalResultValue === undefined ? {} : { result: terminalResultValue }),
      gameTime,
      destroyed,
    });
  };

  const terminalResult = (): GameResults => gameResultsSchema.parse(
    finalizeResult(accountant, { xpPerCorrect: 20, xpPerAccuracyPoint: 10 }),
  );

  const finish = (nextPhase: "victory" | "defeat"): GameResults => {
    phase = nextPhase;
    lastEvent = nextPhase;
    lastOutcome = nextPhase;
    terminalDeliveryOutcome = nextPhase === "victory" ? "victory" : "defeat";
    const result = terminalResult();
    terminalResultValue = result;
    if (allowCompletion) completion.complete(result);
    else completion.sealWithoutDelivery();
    return result;
  };

  const inactiveResult = (): HauntedLibraryActionResult => {
    const current = snapshot();
    const terminal = current.phase !== "playing";
    return actionResult(current, {
      ...EMPTY_VALUES,
      terminal,
      completed: terminal,
      ...(terminalResultValue === undefined ? {} : { result: terminalResultValue }),
    });
  };

  const emptyResult = (): HauntedLibraryActionResult => actionResult(snapshot(), EMPTY_VALUES);

  const resultFor = (
    values: Omit<HauntedLibraryActionResult, "snapshot">,
  ): HauntedLibraryActionResult => actionResult(snapshot(), values);

  const damage = (outcome: HauntedLibraryOutcome = "hazard"): GameResults | undefined => {
    if (lives <= 0) return undefined;
    lives -= 1;
    invulnerableMs = INVULNERABILITY_MS;
    lastEvent = lives === 0 ? "defeat" : "damage";
    lastOutcome = lives === 0 ? "defeat" : outcome;
    if (lives === 0) return finish("defeat");
    return undefined;
  };

  const transitionSentence = (): void => {
    sentenceIndex += 1;
    wordIndex = 0;
    const words = activeWords();
    doors = createDoors(words, sentenceIndex, seed);
    ghosts = createGhosts(doors, sentenceIndex, seed);
    bats = [];
  };

  const openNearestDoor = (): HauntedLibraryActionResult => {
    const before = snapshot();
    if (destroyed || phase !== "playing") return inactiveResult();
    if (!before.player.onFloor) return emptyResult();
    const door = findNearestHauntedLibraryDoor(before);
    if (!door) return emptyResult();

    const doorIndex = doors.findIndex((candidate) => candidate.id === door.id);
    const selected = doors[doorIndex]!;
    const correct = selected.wordIndex === wordIndex;
    accountant.recordAttempt({ correct });

    if (!correct) {
      lives = Math.max(0, lives - 1);
      lastEvent = lives === 0 ? "defeat" : "wrong";
      lastOutcome = lives === 0 ? "defeat" : "incorrect";
      const bat = freezeBat({
        id: `bat:${batSerial}`,
        x: selected.x,
        floor: selected.floor,
        velocityX: seededUnit(seed, sentenceIndex, batSerial, 71) < 0.5 ? BAT_SPEED : -BAT_SPEED,
      });
      batSerial += 1;
      bats = [...bats, bat];
      if (lives === 0) {
        const result = finish("defeat");
        return resultFor({
          accepted: true,
          correct: false,
          progressed: false,
          outcome: "defeat",
          terminal: true,
          completed: true,
          result,
        });
      }
      return resultFor({
        accepted: true,
        correct: false,
        progressed: false,
        outcome: "incorrect",
        terminal: false,
        completed: false,
      });
    }

    doors = doors.map((candidate, index) => index === doorIndex
      ? freezeDoor({ ...candidate, isOpen: true, isCorrect: true })
      : candidate);
    accountant.addScore(100);
    wordIndex += 1;
    lastEvent = "correct";
    lastOutcome = "correct";
    ghosts = ghosts.map((ghost) => circularDistance(ghost.x, selected.x) <= 88 && ghost.floor === selected.floor
      ? freezeGhost({ ...ghost, stunMs: 2_000, stunTimer: 2_000, state: "stunned" })
      : ghost);
    if (wordIndex >= activeWords().length) {
      if (sentenceIndex + 1 >= sentences.length) {
        const result = finish("victory");
        return resultFor({
          accepted: true,
          correct: true,
          progressed: true,
          outcome: "victory",
          terminal: true,
          completed: true,
          result,
        });
      }
      transitionSentence();
    }
    return resultFor({
      accepted: true,
      correct: true,
      progressed: true,
      outcome: "correct",
      terminal: false,
      completed: false,
    });
  };

  const moveFloorPhysics = (deltaMs: number): void => {
    const delta = Math.min(MAX_FRAME_DELTA_MS, deltaMs);
    const dt = delta / 1_000;
    const previous = player;
    const next = { ...player };
    const previousBottom = previous.y + PLAYER_HEIGHT;
    next.velocityY += GRAVITY * dt;
    next.y += next.velocityY * dt;
    let landedFloor = -1;
    if (next.velocityY >= 0) {
      for (let floor = 0; floor < FLOOR_COUNT; floor += 1) {
        const floorY = FLOOR_POSITIONS[floor]!.y;
        const overlapsFloor = next.x + PLAYER_WIDTH / 2 > 0 && next.x - PLAYER_WIDTH / 2 < GAME_WIDTH;
        if (overlapsFloor && previousBottom <= floorY + 1 && next.y + PLAYER_HEIGHT >= floorY) {
          landedFloor = floor;
          break;
        }
      }
    }
    if (landedFloor >= 0) {
      next.floor = landedFloor;
      next.y = FLOOR_POSITIONS[landedFloor]!.y - PLAYER_HEIGHT;
      next.velocityY = 0;
      next.onFloor = true;
      const atEdge = next.x <= TRAMPOLINE_WIDTH || next.x >= GAME_WIDTH - TRAMPOLINE_WIDTH;
      if (atEdge) {
        next.velocityY = TRAMPOLINE_FORCE;
        next.onFloor = false;
        next.state = "jumping";
        lastEvent = "floor-transition";
        lastOutcome = "traversal";
      } else {
        next.state = next.velocityX === 0 ? "idle" : "walking";
      }
    } else {
      next.onFloor = false;
      next.state = "jumping";
    }
    next.velocityX = 0;
    player = Object.freeze(next);
  };

  const validateRestoredState = (state: HauntedLibrarySnapshot): void => {
    if (state === null || typeof state !== "object") throw new Error("Haunted Library state must be an object");
    if (state.seed !== seed || state.sentenceCount !== sentences.length || state.targetCount !== targetCount) {
      throw new Error("Haunted Library state identity is invalid");
    }
    if (!(state.phase === "playing" || state.phase === "victory" || state.phase === "defeat")) {
      throw new Error("Haunted Library state phase is invalid");
    }
    const activeSentenceIndex = state.sentenceIndex;
    if (!Number.isInteger(activeSentenceIndex) || activeSentenceIndex < 0 || activeSentenceIndex >= sentences.length) {
      throw new Error("Haunted Library state sentence index is invalid");
    }
    const expectedSentence = sentences[activeSentenceIndex]!;
    const expectedWords = tokenize(expectedSentence.term);
    if (state.currentSentence.term !== expectedSentence.term
      || state.currentSentence.translation !== expectedSentence.translation
      || state.prompt !== expectedSentence.translation
      || state.words.join(" ") !== expectedWords.join(" ")) {
      throw new Error("Haunted Library state sentence is invalid");
    }
    if (!Number.isInteger(state.wordIndex) || state.wordIndex < 0 || state.wordIndex > expectedWords.length) {
      throw new Error("Haunted Library state word index is invalid");
    }
    if (state.phase === "playing" && state.wordIndex >= expectedWords.length) {
      throw new Error("Haunted Library active word index is terminal");
    }
    if (state.phase === "victory" && (activeSentenceIndex !== sentences.length - 1 || state.wordIndex !== expectedWords.length)) {
      throw new Error("Haunted Library victory state is invalid");
    }
    const expectedTargetIndex = state.phase === "victory"
      ? targetCount
      : targetOffset(sentences, activeSentenceIndex) + state.wordIndex;
    if (state.targetIndex !== expectedTargetIndex || state.correctAnswers !== expectedTargetIndex) {
      throw new Error("Haunted Library target index is invalid");
    }
    if (state.answer !== (state.phase === "victory" ? "" : expectedWords[state.wordIndex]!)) {
      throw new Error("Haunted Library answer is invalid");
    }
    if (state.correctAction !== "confirm"
      || state.availableActions.join(",") !== ACTIONS.join(",")) {
      throw new Error("Haunted Library action contract is invalid");
    }
    if (!Number.isInteger(state.lives) || state.lives < 0 || state.lives > initialLives
      || state.initialLives !== initialLives || state.energy !== state.lives) {
      throw new Error("Haunted Library resources are invalid");
    }
    if (state.phase === "playing" && state.lives === 0) throw new Error("Haunted Library playing state has no lives");
    if (state.phase === "defeat" && state.lives !== 0) throw new Error("Haunted Library defeat must have zero lives");
    if (!Number.isInteger(state.correctAnswers) || !Number.isInteger(state.totalAttempts)
      || state.correctAnswers < 0 || state.correctAnswers > state.totalAttempts
      || state.totalAttempts < 0 || state.score !== state.correctAnswers * 100) {
      throw new Error("Haunted Library result counters are invalid");
    }
    if (!Number.isFinite(state.invulnerableMs) || state.invulnerableMs < 0
      || !Number.isFinite(state.gameTime) || state.gameTime < 0
      || typeof state.destroyed !== "boolean") {
      throw new Error("Haunted Library lifecycle state is invalid");
    }
    if (state.lastEvent !== null && !["move", "floor-transition", "correct", "wrong", "damage", "victory", "defeat"].includes(state.lastEvent)) {
      throw new Error("Haunted Library event is invalid");
    }
    if (state.lastOutcome !== undefined
      && !["correct", "incorrect", "hazard", "traversal", "victory", "defeat"].includes(state.lastOutcome)) {
      throw new Error("Haunted Library outcome is invalid");
    }
    if (!Array.isArray(state.floors) || state.floors.length !== FLOOR_COUNT
      || state.floors.some((floor, index) => floor.y !== FLOOR_POSITIONS[index]!.y || floor.height !== FLOOR_POSITIONS[index]!.height)) {
      throw new Error("Haunted Library floors are invalid");
    }
    if (!Array.isArray(state.trampolines) || state.trampolines.length !== TRAMPOLINES.length
      || state.trampolines.some((trampoline, index) => {
        const expected = TRAMPOLINES[index]!;
        return trampoline.id !== expected.id || trampoline.x !== expected.x || trampoline.floor !== expected.floor
          || trampoline.width !== expected.width || trampoline.height !== expected.height;
      })) {
      throw new Error("Haunted Library trampolines are invalid");
    }

    const expectedDoors = createDoors(expectedWords, activeSentenceIndex, seed);
    if (!Array.isArray(state.doors) || state.doors.length !== expectedDoors.length) {
      throw new Error("Haunted Library doors are invalid");
    }
    for (let index = 0; index < expectedDoors.length; index += 1) {
      const expected = expectedDoors[index]!;
      const restored = state.doors[index]!;
      if (restored.id !== expected.id || restored.x !== expected.x || restored.y !== expected.y
        || restored.floor !== expected.floor || restored.wordIndex !== expected.wordIndex || restored.word !== expected.word
        || typeof restored.isOpen !== "boolean"
        || (restored.isOpen ? typeof restored.isCorrect !== "boolean" : restored.isCorrect !== null)
        || (index < state.wordIndex && (!restored.isOpen || restored.isCorrect !== true))
        || (index >= state.wordIndex && restored.isCorrect === true)
        || (index === state.wordIndex && restored.isOpen && restored.isCorrect !== true)) {
        throw new Error("Haunted Library door state is inconsistent");
      }
    }
    if (!Array.isArray(state.ghosts) || state.ghosts.length !== 3) throw new Error("Haunted Library ghosts are invalid");
    for (let index = 0; index < state.ghosts.length; index += 1) {
      const ghost = state.ghosts[index]!;
      const expected = createGhosts(expectedDoors, activeSentenceIndex, seed)[index]!;
      if (ghost.id !== expected.id || ghost.floor !== expected.floor
        || !Number.isFinite(ghost.x) || ghost.x < 0 || ghost.x >= GAME_WIDTH
        || ghost.velocityX !== expected.velocityX
        || !Number.isFinite(ghost.stunMs) || ghost.stunMs < 0 || ghost.stunTimer !== ghost.stunMs
        || (ghost.stunMs > 0 ? ghost.state !== "stunned" : ghost.state !== "walking")) {
        throw new Error("Haunted Library ghost state is invalid");
      }
    }
    if (!Array.isArray(state.bats) || !Number.isInteger(state.batSerial) || state.batSerial < 0) {
      throw new Error("Haunted Library bats are invalid");
    }
    const batIds = new Set<string>();
    for (const bat of state.bats) {
      const serial = Number(bat.id.replace("bat:", ""));
      if (!/^bat:\d+$/u.test(bat.id) || !Number.isInteger(serial) || serial < 0 || serial >= state.batSerial
        || batIds.has(bat.id) || !Number.isFinite(bat.x) || bat.x < 0 || bat.x >= GAME_WIDTH
        || !Number.isInteger(bat.floor) || bat.floor < 0 || bat.floor >= FLOOR_COUNT
        || (bat.velocityX !== BAT_SPEED && bat.velocityX !== -BAT_SPEED)) {
        throw new Error("Haunted Library bat state is invalid");
      }
      batIds.add(bat.id);
    }
    if (!state.player || !Number.isFinite(state.player.x) || state.player.x < 0 || state.player.x > GAME_WIDTH
      || !Number.isFinite(state.player.y) || state.player.y < -GAME_HEIGHT || state.player.y > GAME_HEIGHT + PLAYER_HEIGHT
      || !Number.isInteger(state.player.floor) || state.player.floor < 0 || state.player.floor >= FLOOR_COUNT
      || state.player.width !== PLAYER_WIDTH || state.player.height !== PLAYER_HEIGHT
      || !Number.isFinite(state.player.velocityX) || !Number.isFinite(state.player.velocityY)
      || (state.player.facing !== "left" && state.player.facing !== "right")
      || !["idle", "walking", "jumping"].includes(state.player.state)
      || typeof state.player.onFloor !== "boolean") {
      throw new Error("Haunted Library player state is invalid");
    }
    if (state.player.onFloor && (state.player.velocityY !== 0
      || state.player.y !== FLOOR_POSITIONS[state.player.floor]!.y - PLAYER_HEIGHT)) {
      throw new Error("Haunted Library grounded player state is invalid");
    }
    if ((state.player.onFloor && state.player.state === "jumping")
      || (!state.player.onFloor && state.player.state !== "jumping")) {
      throw new Error("Haunted Library player movement state is invalid");
    }
    if (state.result !== undefined) gameResultsSchema.parse(state.result);
    if (state.phase === "playing" && state.result !== undefined) throw new Error("Haunted Library active state has a result");
    if ((state.phase === "victory" || state.phase === "defeat") && state.result === undefined) {
      throw new Error("Haunted Library terminal state has no result");
    }
  };

  const controller: HauntedLibraryController = {
    snapshot,
    dispatch(action): HauntedLibraryActionResult {
      if (action === "confirm") return openNearestDoor();
      if (action === "move-up") return controller.move("up");
      if (action === "move-down") return controller.move("down");
      if (action === "move-left") return controller.move("left");
      return controller.move("right");
    },
    move(direction, distance = PLAYER_STEP): HauntedLibraryActionResult {
      if (destroyed || phase !== "playing") return inactiveResult();
      if (!Number.isFinite(distance) || distance < 0) throw new Error("Haunted Library movement distance is invalid");
      if (direction === "up") {
        if (player.onFloor) {
          const trampoline = player.x <= TRAMPOLINE_WIDTH || player.x >= GAME_WIDTH - TRAMPOLINE_WIDTH;
          player = Object.freeze({
            ...player,
            velocityY: trampoline ? TRAMPOLINE_FORCE : JUMP_FORCE,
            onFloor: false,
            state: "jumping",
          });
          lastEvent = trampoline ? "floor-transition" : "move";
          if (trampoline) lastOutcome = "traversal";
          return resultFor({ accepted: true, correct: false, progressed: false, outcome: "traversal", terminal: false, completed: false });
        }
        return resultFor({ accepted: true, correct: false, progressed: false, outcome: "traversal", terminal: false, completed: false });
      }
      if (direction === "down") {
        if (!player.onFloor) {
          player = Object.freeze({ ...player, velocityY: Math.max(0, player.velocityY), state: "jumping" });
          lastEvent = "move";
          return resultFor({ accepted: true, correct: false, progressed: false, outcome: "traversal", terminal: false, completed: false });
        }
        if (player.floor > 0) {
          player = Object.freeze({
            ...player,
            y: FLOOR_POSITIONS[player.floor]!.y - PLAYER_HEIGHT + FLOOR_DROP_PX,
            onFloor: false,
            state: "jumping",
            velocityY: 0,
          });
          lastEvent = "floor-transition";
          lastOutcome = "traversal";
          return resultFor({ accepted: true, correct: false, progressed: false, outcome: "traversal", terminal: false, completed: false });
        }
        lastEvent = "move";
        return resultFor({ accepted: true, correct: false, progressed: false, outcome: "traversal", terminal: false, completed: false });
      }
      const sign = direction === "left" ? -1 : 1;
      player = Object.freeze({
        ...player,
        x: wrapX(player.x + sign * distance),
        velocityX: sign * PLAYER_SPEED,
        facing: sign < 0 ? "left" : "right",
        state: player.onFloor ? "walking" : "jumping",
      });
      lastEvent = "move";
      return resultFor({ accepted: true, correct: false, progressed: false, outcome: "traversal", terminal: false, completed: false });
    },
    interact: openNearestDoor,
    choose(action: InputActionId): HauntedLibraryActionResult {
      if (!ACTIONS.includes(action as HauntedLibraryAction)) return inactiveResult();
      return controller.dispatch(action as HauntedLibraryAction);
    },
    tick(deltaMs: number): HauntedLibrarySnapshot {
      if (!Number.isFinite(deltaMs) || deltaMs < 0) throw new Error("Haunted Library delta must be nonnegative and finite");
      if (destroyed || phase !== "playing") return snapshot();
      const delta = Math.min(MAX_FRAME_DELTA_MS, deltaMs);
      gameTime += delta;
      invulnerableMs = Math.max(0, invulnerableMs - delta);
      moveFloorPhysics(delta);
      ghosts = ghosts.map((ghost) => {
        if (ghost.stunMs > 0) {
          const stunMs = Math.max(0, ghost.stunMs - delta);
          return freezeGhost({ ...ghost, stunMs, stunTimer: stunMs, state: stunMs > 0 ? "stunned" : "walking" });
        }
        return freezeGhost({ ...ghost, x: wrapX(ghost.x + ghost.velocityX * delta / 1_000) });
      });
      const nextBats: HauntedLibraryBat[] = [];
      let terminal = false;
      for (const bat of bats) {
        const direction = circularDistance(bat.x, player.x) === 0
          ? bat.velocityX
          : bat.x < player.x ? BAT_SPEED : -BAT_SPEED;
        const nextX = wrapX(bat.x + direction * delta / 1_000);
        const nextBat = freezeBat({ ...bat, x: nextX, velocityX: direction });
        if (!terminal && nextBat.floor === player.floor && circularDistance(nextBat.x, player.x) <= 26 && invulnerableMs === 0) {
          const result = damage();
          terminal = result !== undefined;
        } else {
          nextBats.push(nextBat);
        }
      }
      bats = nextBats;
      if (!terminal && phase === "playing" && invulnerableMs === 0) {
        for (const ghost of ghosts) {
          const ghostY = FLOOR_POSITIONS[ghost.floor]!.y - 24;
          const playerY = player.y + PLAYER_HEIGHT / 2;
          if (ghost.floor !== player.floor || Math.abs(ghostY - playerY) > 42 || circularDistance(ghost.x, player.x) > 34) continue;
          damage();
          break;
        }
      }
      return snapshot();
    },
    applyHazard(): HauntedLibraryActionResult {
      if (destroyed || phase !== "playing") return inactiveResult();
      const result = damage();
      return resultFor({
        accepted: true,
        correct: false,
        progressed: false,
        outcome: result === undefined ? "hazard" : "defeat",
        terminal: result !== undefined,
        completed: result !== undefined,
        ...(result === undefined ? {} : { result }),
      });
    },
    capture: snapshot,
    restore(state): void {
      if (destroyed) return;
      if (completion.hasCompleted && state.phase === "playing") {
        throw new Error("Haunted Library cannot restore active state after completion");
      }
      validateRestoredState(state);
      accountant = createResultAccountant();
      for (let index = 0; index < state.totalAttempts; index += 1) {
        accountant.recordAttempt({ correct: index < state.correctAnswers });
      }
      accountant.addScore(state.score);
      phase = state.phase;
      sentenceIndex = state.sentenceIndex;
      wordIndex = state.wordIndex;
      player = Object.freeze({ ...state.player });
      doors = state.doors.map(freezeDoor);
      ghosts = state.ghosts.map(freezeGhost);
      bats = state.bats.map(freezeBat);
      batSerial = state.batSerial;
      lives = state.lives;
      invulnerableMs = state.invulnerableMs;
      lastEvent = state.lastEvent;
      lastOutcome = state.lastOutcome;
      terminalResultValue = state.result;
      gameTime = state.gameTime;
      destroyed = state.destroyed;
      if (phase !== "playing" || destroyed) completion.sealWithoutDelivery();
    },
    destroy(): void {
      if (destroyed) return;
      destroyed = true;
      completion.sealWithoutDelivery();
    },
  };

  return Object.freeze(controller);
}

function createScene(context: HauntedLibrarySceneContext): Readonly<Record<string, unknown>> {
  let resources: SceneResources | undefined;
  let composition = context.composition;
  let previousKeys = new Set<string>();
  let animationMs = 0;
  let cleaned = false;
  const normalize = createInputActionNormalizer({
    keyboard: HAUNTED_LIBRARY_KEYBOARD_BINDINGS,
    pointerTap: { action: "confirm" },
  });
  const scheduler = createBoundedFrameScheduler((deltaMs) => {
    animationMs = (animationMs + deltaMs) % 2_000;
    if (context.sessionMode === "playing") context.controller.tick(deltaMs);
  });
  const dimensions = (scene: PhaserSceneLike): { readonly width: number; readonly height: number } => ({
    width: scene.scale?.width ?? GAME_WIDTH,
    height: scene.scale?.height ?? GAME_HEIGHT,
  });
  const worldX = (x: number, width: number): number => x * width / GAME_WIDTH;
  const worldY = (y: number, height: number): number => y * height / GAME_HEIGHT;
  const process = (action: HauntedLibraryAction, distance?: number): void => {
    const result = action === "move-left"
      ? context.controller.move("left", distance)
      : action === "move-right"
        ? context.controller.move("right", distance)
        : action === "move-up"
          ? context.controller.move("up")
          : action === "move-down"
            ? context.controller.move("down")
            : context.controller.dispatch(action);
    if (!result.accepted) return;
    context.diagnostic({
      level: "info",
      code: result.terminal ? "HAUNTED_LIBRARY_TERMINAL" : "HAUNTED_LIBRARY_INPUT",
      message: "The Haunted Library processed a semantic action.",
      details: { action, outcome: result.outcome, phase: result.snapshot.phase },
    });
  };
  const updateView = (scene: PhaserSceneLike): void => {
    if (!resources) return;
    const activeResources = resources;
    const { width, height } = dimensions(scene);
    const state = context.controller.snapshot();
    const dpad = getHauntedLibraryDpadLayout(width, height);
    const pulse = Math.sin(animationMs / 2_000 * Math.PI * 2) * 3;
    activeResources.graphics.clear();
    if (!activeResources.art.ground("world:ground", width, height)) activeResources.graphics.fillStyle(0x100e24, 1).fillRect(0, 0, width, height);
    activeResources.graphics.fillStyle(0x21183a, 1).fillRect(0, height * 0.15, width, height * 0.68);
    for (const floor of state.floors) {
      const y = worldY(floor.y, height);
      activeResources.graphics.fillStyle(0x59446d, 1).fillRect(0, y, width, floor.height * height / GAME_HEIGHT);
      activeResources.graphics.lineStyle(2, 0xd8a7e9, 0.55).strokeRoundedRect(0, y, width, floor.height * height / GAME_HEIGHT, 4);
    }
    for (const trampoline of state.trampolines) {
      const floor = state.floors[trampoline.floor]!;
      activeResources.graphics.fillStyle(0xf97316, 0.95).fillRoundedRect(
        worldX(trampoline.x, width),
        worldY(floor.y - trampoline.height, height),
        trampoline.width * width / GAME_WIDTH,
        trampoline.height * height / GAME_HEIGHT,
        4,
      );
    }
    for (const door of state.doors) {
      const x = worldX(door.x, width);
      const y = worldY(door.y, height);
      activeResources.graphics.fillStyle(
        door.isCorrect === true ? 0x4ade80 : door.isCorrect === false ? 0xef4444 : 0x633b78,
        1,
      ).fillRoundedRect(
        x - DOOR_WIDTH * width / GAME_WIDTH / 2,
        y,
        DOOR_WIDTH * width / GAME_WIDTH,
        DOOR_HEIGHT * height / GAME_HEIGHT,
        8,
      );
      activeResources.graphics.lineStyle(2, door.wordIndex === state.wordIndex ? 0xffd166 : 0xc4b5fd, 0.9)
        .strokeRoundedRect(x - DOOR_WIDTH * width / GAME_WIDTH / 2, y, DOOR_WIDTH * width / GAME_WIDTH, DOOR_HEIGHT * height / GAME_HEIGHT, 8);
    }
    state.ghosts.forEach((ghost, index) => {
      const x = worldX(ghost.x, width);
      const y = worldY(state.floors[ghost.floor]!.y - 42, height);
      const radius = 20 * width / GAME_WIDTH;
      if (activeResources.art.place(`ghost:${index}`, "enemy:idle", {
        x,
        y,
        width: radius * 2.4,
        depth: 7,
        alpha: ghost.stunMs > 0 ? 0.6 : 1,
      })) return;
      activeResources.graphics.fillStyle(ghost.stunMs > 0 ? 0x93c5fd : 0xe879f9, 0.95).fillCircle(x, y, radius);
    });
    for (const bat of state.bats) {
      const x = worldX(bat.x, width);
      const y = worldY(state.floors[bat.floor]!.y - 70, height);
      activeResources.graphics.fillStyle(0xf97316, 0.95).fillCircle(x, y, 13 * width / GAME_WIDTH);
    }
    const playerDrawWidth = PLAYER_WIDTH * width / GAME_WIDTH;
    const playerDrawHeight = PLAYER_HEIGHT * height / GAME_HEIGHT;
    const playerLeft = worldX(state.player.x, width) - playerDrawWidth / 2;
    const playerTop = worldY(state.player.y, height) + pulse;
    if (!activeResources.art.place("player", "player:idle", {
      x: playerLeft + playerDrawWidth / 2,
      y: playerTop + playerDrawHeight / 2,
      width: playerDrawWidth * 1.6,
      height: playerDrawHeight * 1.2,
      depth: 8,
      alpha: state.invulnerableMs > 0 ? 0.6 : 1,
    })) {
      activeResources.graphics.fillStyle(state.invulnerableMs > 0 ? 0xffffff : 0xc4b5fd, 1)
        .fillRoundedRect(playerLeft, playerTop, playerDrawWidth, playerDrawHeight, 4);
    }
    activeResources.art.sweep();
    for (const button of dpad) {
      activeResources.graphics.fillStyle(button.action === "confirm" ? 0x4c1d95 : 0x6d4c88, 1)
        .fillRoundedRect(button.x, button.y, button.width, button.height, 10);
    }
    activeResources.title.setText("THE HAUNTED LIBRARY").setPosition(18, 18);
    activeResources.prompt.setText(`Find the next word: ${state.prompt}`).setPosition(18, 58);
    activeResources.progress.setText(
      `${composition?.profile === "compact" ? "Compact stacks" : "Library stacks"}  •  Target ${Math.min(state.targetIndex + 1, state.targetCount)}/${state.targetCount}  •  Lives ${state.lives}  •  Score ${state.score}`,
    ).setPosition(18, 98);
    for (let index = 0; index < activeResources.doors.length; index += 1) {
      const door = state.doors[index];
      activeResources.doors[index]?.setText(door && !door.isOpen ? door.word : door ? door.word : "").setPosition(
        door ? worldX(door.x, width) - 26 : 0,
        door ? worldY(door.y, height) + 26 : 0,
      );
    }
    activeResources.feedback.setText(
      state.phase === "victory"
        ? "Every word door is open. The library is safe!"
        : state.phase === "defeat"
          ? "The ghosts have claimed the library."
          : state.lastOutcome === "incorrect"
            ? "That door was out of order. The bat is awake."
            : state.lastOutcome === "traversal"
              ? "The trampoline carried you to another floor."
              : state.lastOutcome === "hazard"
                ? "The library hit you. Keep moving while protected."
                : "Move near a door, then press Confirm.",
    ).setPosition(18, height * 0.7);
    activeResources.instructions.setText("Keyboard: hold A/← or D/→ to move  •  W/↑ jump  •  S/↓ descend  •  Enter/Space open  •  Touch the D-pad").setPosition(18, (dpad[0]?.y ?? height) - 22);
  };
  const cleanup = (): void => {
    if (cleaned) return;
    cleaned = true;
    scheduler.cancel();
    context.controller.destroy();
    if (!resources) return;
    const activeResources = resources;
    resources = undefined;
    activeResources.graphics.destroy();
    activeResources.title.destroy();
    activeResources.prompt.destroy();
    activeResources.progress.destroy();
    activeResources.feedback.destroy();
    activeResources.instructions.destroy();
    for (const door of activeResources.doors) door.destroy();
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
    if (cleaned) return;
    if (!this.add) throw new Error("The Haunted Library requires Phaser display services");
    const textStyle = { fontFamily: "Arial", color: "#fff8e7", fontSize: "18px" };
    resources = {
      graphics: this.add.graphics(),
      art: createActorSpriteLayer(this, context.edition),
      title: this.add.text(18, 18, "THE HAUNTED LIBRARY", { ...textStyle, fontSize: "26px", fontStyle: "bold" }),
      prompt: this.add.text(18, 58, "", { ...textStyle, fontSize: "20px", wordWrap: { width: 354 } }),
      progress: this.add.text(18, 98, "", { ...textStyle, fontSize: "14px", color: "#e9d5ff" }),
      feedback: this.add.text(18, 0, "", { ...textStyle, fontSize: "16px", color: "#fde68a", wordWrap: { width: 354 } }),
      instructions: this.add.text(18, 0, "", { ...textStyle, fontSize: "13px", color: "#d8c6e9", wordWrap: { width: 354 } }),
      doors: Array.from({ length: context.maxDoorCount }, () => this.add!.text(0, 0, "", { ...textStyle, fontSize: "13px", align: "center" })),
    };
    this.events?.once("shutdown", cleanup);
    this.events?.once("destroy", cleanup);
    updateView(this);
  };
  const update = function (this: PhaserSceneLike, _time = 0, delta = 0): void {
    if (!resources || cleaned) return;
    const frameDelta = Math.min(MAX_FRAME_DELTA_MS, Math.max(0, delta));
    scheduler.tick(frameDelta);
    if (context.sessionMode === "playing") {
      const input = context.inputController.snapshot();
      const pressed = input.pressed ?? input.keys.filter((key) => !previousKeys.has(key));
      previousKeys = new Set(input.keys);
      const heldActions = new Set<HauntedLibraryAction>();
      for (const code of input.keys) {
        const action = normalize({ modality: "keyboard", code })[0]?.action;
        if (action === "move-left" || action === "move-right" || action === "move-down") heldActions.add(action);
      }
      const heldDistance = PLAYER_SPEED * (frameDelta || 16.67) / 1_000;
      for (const action of heldActions) process(action, heldDistance);
      for (const code of pressed) {
        const action = normalize({ modality: "keyboard", code })[0]?.action;
        if (!action || heldActions.has(action as HauntedLibraryAction)) continue;
        if (action === "move-up" || action === "confirm") process(action);
        else if (action === "move-left" || action === "move-right" || action === "move-down") process(action, heldDistance);
      }
      if (input.pointer.down && !input.pointer.cancelled) {
        const { width, height } = dimensions(this);
        const pointer = normalizedPointerPosition(this, input.pointer.x, input.pointer.y, width, height);
        const action = chooseHauntedLibraryActionFromPointer(pointer.x, pointer.y, width, height);
        if (action === "move-left" || action === "move-right" || action === "move-down") process(action, heldDistance);
      }
      if (input.pointer.released && !input.pointer.cancelled) {
        const { width, height } = dimensions(this);
        const pointer = normalizedPointerPosition(this, input.pointer.x, input.pointer.y, width, height);
        const action = chooseHauntedLibraryActionFromPointer(pointer.x, pointer.y, width, height);
        if (action) process(action, action === "move-left" || action === "move-right" ? heldDistance : undefined);
      }
    }
    updateView(this);
  };
  return {
    key: HAUNTED_LIBRARY_ID,
    preload,
    create,
    update,
    extend: {
      apkCaptureResponsiveState: () => context.controller.capture(),
      apkRestoreResponsiveState: (state: unknown) => {
        if (typeof state !== "object" || state === null) throw new Error("Haunted Library responsive state is invalid");
        context.controller.restore(state as HauntedLibrarySnapshot);
      },
      apkRecompose: (nextComposition: HauntedLibrarySceneContext["composition"]) => {
        composition = nextComposition;
      },
    },
  };
}

/**
 * Creates the standard sentence cartridge for The Haunted Library.
 * @returns A runtime-compatible Phaser cartridge.
 */
export function createHauntedLibraryCartridge(): StandardExperienceCartridge {
  let activeController: HauntedLibraryController | undefined;
  const standardExperience = createCartridgeStandardExperience({
    id: HAUNTED_LIBRARY_ID,
    title: "The Haunted Library",
    description: "Open ordered word doors across haunted library floors while avoiding ghosts and bats.",
    inputMode: "sentence",
    objective: "Open every word door in sentence order before the library takes all your lives.",
    mechanicInstruction: "Move across each floor, use edge trampolines to climb, press Down to descend, and press Confirm near the next word door.",
    keyboardKeys: ["Hold A/Left", "Hold D/Right", "W/Up", "S/Down", "Enter", "Space"],
    executeTutorialAction: (actionId) => {
      const controller = activeController;
      if (!controller) return;
      const state = controller.snapshot();
      const door = actionId === "action:select-correct"
        ? state.doors.find((candidate) => candidate.wordIndex === state.wordIndex)
        : state.doors.find((candidate) => candidate.wordIndex !== state.wordIndex);
      if (!door) return;
      const nextState = controller.snapshot();
      controller.restore({
        ...nextState,
        player: {
          ...nextState.player,
          x: door.x,
          y: FLOOR_POSITIONS[door.floor]!.y - PLAYER_HEIGHT,
          floor: door.floor,
          velocityX: 0,
          velocityY: 0,
          state: "idle",
          onFloor: true,
        },
      });
      controller.interact();
    },
  });
  return {
    manifest: {
      id: HAUNTED_LIBRARY_ID,
      title: "The Haunted Library",
      description: "Open ordered word doors across haunted library floors while avoiding ghosts and bats.",
      runtimeApiVersion: "1.0.0",
      inputMode: "sentence",
      requiredAssetBindings: ["haunted-library/player"],
      capabilities: [
        "capability:bounded-frame-delta",
        "capability:gravity-jump-traversal",
        "capability:edge-trampoline-floor-traversal",
        "capability:host-seeded-placements",
        "capability:horizontal-wrap",
        "capability:ordered-word-doors",
        "capability:ghost-stun",
        "capability:bat-hazards",
        "capability:invulnerability-window",
        "capability:input-action-normalization",
        "capability:result-accounting",
        "capability:single-completion-emission",
      ],
    },
    standardExperience,
    createGameConfig(context: CartridgeGameConfigContext): Readonly<Record<string, unknown>> {
      const input = sentenceInputSchema.parse(context.input);
      const sessionMode = context.sessionMode ?? "playing";
      const controller = createHauntedLibraryController(
        input,
        (result, outcome) => context.complete(result, outcome),
        { seed: context.seed, allowCompletion: sessionMode === "playing" },
      );
      activeController = controller;
      const maxDoorCount = Math.max(...input.map((sentence) => tokenize(sentence.term).length));
      context.diagnostic({
        level: "debug",
        code: "HAUNTED_LIBRARY_READY",
        message: "The Haunted Library gravity and floor controller is ready.",
        details: { editionId: context.edition.id, seed: controller.snapshot().seed, sentenceCount: input.length, targetCount: controller.snapshot().targetCount },
      });
      return {
        width: GAME_WIDTH,
        height: GAME_HEIGHT,
        render: { antialias: false, pixelArt: true },
        scene: createScene({
          controller,
          edition: context.edition,
          inputController: context.inputController,
          composition: context.composition,
          diagnostic: context.diagnostic,
          sessionMode,
          maxDoorCount,
        }),
      };
    },
  };
}
