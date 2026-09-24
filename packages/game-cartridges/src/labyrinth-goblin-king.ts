import { gameResultsSchema, sentenceInputSchema, type GameResults } from "@reading-advantage/game-contracts";
import {
  calculateXp,
  createCompletionLatch,
  preloadAssetBindings as preloadRuntimeAssetBindings,
  resolveAssetBinding,
  validateNonEmptyContent,
  type CartridgeGameConfigContext,
  type CompletionDelivery,
  type GameTerminalOutcome,
} from "@reading-advantage/advantage-play-kit";
import type { StandardExperienceCartridge } from "@reading-advantage/advantage-play-kit/presentation";

import { createCartridgeStandardExperience } from "./standard-experience.js";

/** Stable historical cartridge identifier. */
export const LABYRINTH_GOBLIN_KING_ID = "labyrinth-goblin-king" as const;
/** Logical scene size retained from the original game. */
export const LABYRINTH_CANVAS = Object.freeze({ width: 390, height: 700 });
/** Fixed maze dimensions retained from the original game. */
export const LABYRINTH_GRID = Object.freeze({ columns: 11, rows: 15, tileSize: 32 });
/** Neutral color shared by all English word orbs. */
export const LABYRINTH_ORB_COLOR = 0x5865d8;
/** Time between grid steps during continuous movement. */
export const LABYRINTH_STEP_MS = 130;
/** Duration of the sentence-completion aura. */
export const LABYRINTH_AURA_MS = 6_000;

/** Four maze directions plus the stationary state. */
export type LabyrinthDirection = "up" | "down" | "left" | "right" | "none";
/** One immutable maze cell. */
export interface LabyrinthCell { readonly column: number; readonly row: number }
/** One supplied English word orb. */
export interface LabyrinthWordOrb extends LabyrinthCell { readonly id: string; readonly word: string; readonly orderIndex: number; readonly collected: boolean }
/** One goblin state in the maze. */
export interface LabyrinthGoblin extends LabyrinthCell { readonly id: string; readonly direction: LabyrinthDirection; readonly fleeing: boolean; readonly eaten: boolean }
interface Sentence { readonly prompt: string; readonly words: readonly string[] }

/** Complete state for rendering and responsive restoration. */
export interface LabyrinthGoblinKingSnapshot {
  readonly seed: number;
  readonly phase: "playing" | "victory" | "defeat";
  readonly sentenceIndex: number;
  readonly sentenceCount: number;
  readonly targetIndex: number;
  readonly sentenceWordCount: number;
  readonly prompt: string;
  readonly answer: string;
  readonly builtSentence: string;
  readonly player: LabyrinthCell & Readonly<{ direction: LabyrinthDirection; queuedDirection: LabyrinthDirection; lives: number; invulnerabilityMs: number; auraMs: number }>;
  readonly orbs: readonly LabyrinthWordOrb[];
  readonly goblins: readonly LabyrinthGoblin[];
  readonly stepAccumulatorMs: number;
  readonly mazeSteps: number;
  readonly spawnWave: number;
  readonly correctAnswers: number;
  readonly totalAttempts: number;
  readonly score: number;
  readonly goblinsEaten: number;
  readonly lastOutcome?: "correct" | "incorrect" | "hazard" | "goblin-eaten";
  readonly destroyed: boolean;
}

/** Deterministic maze rules independent of Phaser. */
export interface LabyrinthGoblinKingController {
  /** @returns The immutable current state. */
  snapshot(): LabyrinthGoblinKingSnapshot;
  /**
   * Queues the next turn while movement continues.
   * @param direction Desired maze direction.
   * @returns Nothing.
   */
  queueDirection(direction: LabyrinthDirection): void;
  /**
   * Advances bounded movement and collision rules.
   * @param deltaMs Elapsed frame time.
   * @returns The state after the frame.
   */
  tick(deltaMs: number): LabyrinthGoblinKingSnapshot;
  /** @returns The complete responsive state. */
  capture(): LabyrinthGoblinKingSnapshot;
  /**
   * Restores one validated responsive state.
   * @param snapshot State captured from this run.
   * @returns Nothing.
   */
  restore(snapshot: LabyrinthGoblinKingSnapshot): void;
  /** @returns Nothing. */
  destroy(): void;
}

function mix32(value: number): number { let mixed = value | 0; mixed = Math.imul(mixed ^ mixed >>> 16, 0x45d9f3b); mixed = Math.imul(mixed ^ mixed >>> 16, 0x45d9f3b); return (mixed ^ mixed >>> 16) >>> 0; }
function mazeWall(column: number, row: number): boolean {
  if (column < 0 || column >= LABYRINTH_GRID.columns || row < 0 || row >= LABYRINTH_GRID.rows) return true;
  if ((column === 0 && row === 1) || (column === LABYRINTH_GRID.columns - 1 && row === LABYRINTH_GRID.rows - 2)) return false;
  return row === 0 || row === LABYRINTH_GRID.rows - 1 || column === 0 || column === LABYRINTH_GRID.columns - 1 || (row % 2 === 0 && column % 2 === 0);
}
function moved(cell: LabyrinthCell, direction: LabyrinthDirection): LabyrinthCell {
  return { column: cell.column + (direction === "right" ? 1 : direction === "left" ? -1 : 0), row: cell.row + (direction === "down" ? 1 : direction === "up" ? -1 : 0) };
}
function canEnter(cell: LabyrinthCell): boolean { return !mazeWall(cell.column, cell.row); }
function sentencesFor(input: unknown): readonly Sentence[] {
  const content = validateNonEmptyContent(sentenceInputSchema.parse(input), "sentence");
  return Object.freeze(content.items.map((item) => Object.freeze({ prompt: item.translation, words: Object.freeze(item.term.trim().split(/\s+/u).filter(Boolean)) })));
}
function floorCells(): readonly LabyrinthCell[] {
  const cells: LabyrinthCell[] = [];
  for (let row = 1; row < LABYRINTH_GRID.rows - 1; row += 1) for (let column = 1; column < LABYRINTH_GRID.columns - 1; column += 1) if (!mazeWall(column, row)) cells.push({ column, row });
  return cells;
}
const FLOORS = floorCells();
function spawnOrbs(sentence: Sentence, targetIndex: number, seed: number, wave: number, player: LabyrinthCell): readonly LabyrinthWordOrb[] {
  const offset = mix32(seed + wave * 104729) % FLOORS.length;
  const candidates = [...FLOORS.slice(offset), ...FLOORS.slice(0, offset)].filter((cell) => Math.abs(cell.column - player.column) + Math.abs(cell.row - player.row) >= 3);
  const available: LabyrinthCell[] = [];
  for (const cell of candidates) {
    if (available.every((placed) => Math.hypot(placed.column - cell.column, placed.row - cell.row) >= 4)) available.push(cell);
    if (available.length === 3) break;
  }
  if (available.length < 3) throw new Error("Labyrinth cannot place a readable word wave");
  const answer = sentence.words[targetIndex]!;
  const distractors = [...new Set(sentence.words.filter((word) => word !== answer))];
  const start = distractors.length ? mix32(seed + wave * 31) % distractors.length : 0;
  const words = [answer, distractors[start] ?? answer, distractors[(start + 1) % Math.max(1, distractors.length)] ?? answer];
  const answerSlot = mix32(seed ^ wave * 97) % 3;
  [words[0], words[answerSlot]] = [words[answerSlot]!, words[0]!];
  return Object.freeze(words.map((word, index) => Object.freeze({ id: `${wave}:${index}`, word: word!, orderIndex: sentence.words.indexOf(word!), collected: false, ...available[index]! })));
}
function initialGoblins(seed: number, occupied: readonly LabyrinthCell[]): readonly LabyrinthGoblin[] {
  const player = occupied[0]!;
  const available = FLOORS.filter((cell) =>
    !occupied.some((used) => sameCell(cell, used))
    && Math.abs(cell.column - player.column) + Math.abs(cell.row - player.row) >= 6,
  );
  const first = available[mix32(seed + 41) % available.length]!;
  const second = available.filter((cell) => !sameCell(cell, first))[mix32(seed + 83) % (available.length - 1)]!;
  return Object.freeze([{ id: "goblin:0", ...first, direction: "left", fleeing: false, eaten: false }, { id: "goblin:1", ...second, direction: "up", fleeing: false, eaten: false }]);
}
function directions(seed: number): readonly LabyrinthDirection[] {
  const all: readonly LabyrinthDirection[] = ["up", "right", "down", "left"];
  const offset = mix32(seed) % all.length;
  return [...all.slice(offset), ...all.slice(0, offset)];
}
function sameCell(a: LabyrinthCell, b: LabyrinthCell): boolean { return a.column === b.column && a.row === b.row; }
function mazeTransform(width: number, height: number): Readonly<{ scale: number; offsetX: number; offsetY: number }> {
  const scale = Math.min(width / LABYRINTH_CANVAS.width, (height - 130) / 500);
  return Object.freeze({ scale, offsetX: (width - LABYRINTH_GRID.columns * LABYRINTH_GRID.tileSize * scale) / 2, offsetY: 130 });
}
function scenePoint(cell: LabyrinthCell, width: number, height: number): Readonly<{ x: number; y: number }> {
  const transform = mazeTransform(width, height);
  return Object.freeze({ x: transform.offsetX + (cell.column + .5) * LABYRINTH_GRID.tileSize * transform.scale, y: transform.offsetY + (cell.row + .5) * LABYRINTH_GRID.tileSize * transform.scale });
}

/**
 * Creates one deterministic Labyrinth of the Goblin King controller.
 * @param input Sentence content with English terms and Thai prompts.
 * @param deliver Host completion delivery.
 * @param seed Deterministic placement seed.
 * @returns The maze controller.
 */
export function createLabyrinthGoblinKingController(input: unknown, deliver: CompletionDelivery<GameResults>, seed = 0): LabyrinthGoblinKingController {
  const sentences = sentencesFor(input); const completion = createCompletionLatch(deliver);
  let phase: LabyrinthGoblinKingSnapshot["phase"] = "playing"; let sentenceIndex = 0; let targetIndex = 0;
  let player = { column: 1, row: 1, direction: "right" as LabyrinthDirection, queuedDirection: "right" as LabyrinthDirection, lives: 3, invulnerabilityMs: 0, auraMs: 0 };
  let spawnWave = 0; let orbs = spawnOrbs(sentences[0]!, targetIndex, seed, spawnWave, player); let goblins = initialGoblins(seed, [player, ...orbs]);
  let stepAccumulatorMs = 0; let mazeSteps = 0; let correctAnswers = 0; let totalAttempts = 0; let score = 0; let goblinsEaten = 0; let lastOutcome: LabyrinthGoblinKingSnapshot["lastOutcome"]; let destroyed = false;
  const snapshot = (): LabyrinthGoblinKingSnapshot => {
    const sentence = sentences[Math.min(sentenceIndex, sentences.length - 1)]!;
    return Object.freeze({ seed, phase, sentenceIndex, sentenceCount: sentences.length, targetIndex, sentenceWordCount: sentence.words.length, prompt: sentence.prompt, answer: sentence.words[Math.min(targetIndex, sentence.words.length - 1)]!, builtSentence: sentence.words.slice(0, targetIndex).join(" "), player: Object.freeze({ ...player }), orbs: Object.freeze(orbs.map((orb) => Object.freeze({ ...orb }))), goblins: Object.freeze(goblins.map((goblin) => Object.freeze({ ...goblin }))), stepAccumulatorMs, mazeSteps, spawnWave, correctAnswers, totalAttempts, score, goblinsEaten, ...(lastOutcome ? { lastOutcome } : {}), destroyed });
  };
  const finish = (outcome: Exclude<GameTerminalOutcome, "complete">): void => {
    phase = outcome; const accuracy = totalAttempts === 0 ? 0 : correctAnswers / totalAttempts;
    completion.complete(gameResultsSchema.parse({ correctAnswers, totalAttempts, accuracy, score, xp: calculateXp({ correctAnswers, totalAttempts, accuracy }, { xpPerCorrect: 20, xpPerAccuracyPoint: 10 }) }));
  };
  const collect = (): void => {
    const touched = orbs.find((orb) => !orb.collected && sameCell(orb, player)); if (!touched) return;
    const correct = touched.word === sentences[sentenceIndex]!.words[targetIndex]; totalAttempts += 1;
    if (!correct) {
      player = { ...player, lives: player.lives - 1, invulnerabilityMs: 1_000 }; lastOutcome = "incorrect"; spawnWave += 1;
      if (player.lives <= 0) { finish("defeat"); return; }
      orbs = spawnOrbs(sentences[sentenceIndex]!, targetIndex, seed, spawnWave, player);
      return;
    }
    correctAnswers += 1; score += 100; targetIndex += 1; lastOutcome = "correct";
    const sentence = sentences[sentenceIndex]!;
    if (targetIndex < sentence.words.length) { spawnWave += 1; orbs = spawnOrbs(sentence, targetIndex, seed, spawnWave, player); return; }
    player = { ...player, auraMs: LABYRINTH_AURA_MS }; goblins = goblins.map((goblin) => ({ ...goblin, fleeing: true }));
    if (sentenceIndex + 1 >= sentences.length) { finish("victory"); return; }
    sentenceIndex += 1; targetIndex = 0; spawnWave += 1; orbs = spawnOrbs(sentences[sentenceIndex]!, targetIndex, seed, spawnWave, player);
  };
  const moveGoblins = (): void => {
    goblins = goblins.map((goblin, index) => {
      if (goblin.eaten || (mazeSteps + index) % 3 !== 0) return goblin;
      const choices = directions(seed + spawnWave * 97 + index * 13).filter((direction) => canEnter(moved(goblin, direction)));
      const distance = Math.abs(goblin.column - player.column) + Math.abs(goblin.row - player.row);
      const chase = index > 0 && distance <= 4;
      const ranked = [...choices].sort((a, b) => {
        const da = moved(goblin, a); const db = moved(goblin, b);
        const distanceA = Math.abs(da.column - player.column) + Math.abs(da.row - player.row); const distanceB = Math.abs(db.column - player.column) + Math.abs(db.row - player.row);
        if (player.auraMs > 0) return distanceB - distanceA;
        if (chase) return distanceA - distanceB;
        return a === goblin.direction ? -1 : b === goblin.direction ? 1 : 0;
      });
      const direction = ranked[0] ?? goblin.direction; const next = moved(goblin, direction); return { ...goblin, ...(canEnter(next) ? next : {}), direction, fleeing: player.auraMs > 0 };
    });
  };
  const collideGoblins = (): void => {
    goblins = goblins.map((goblin) => {
      if (goblin.eaten || !sameCell(goblin, player)) return goblin;
      if (player.auraMs > 0) { goblinsEaten += 1; lastOutcome = "goblin-eaten"; return { ...goblin, eaten: true }; }
      if (player.invulnerabilityMs === 0) { player = { ...player, lives: player.lives - 1, invulnerabilityMs: 1_000 }; lastOutcome = "hazard"; if (player.lives <= 0) finish("defeat"); }
      return goblin;
    });
  };
  return Object.freeze({ snapshot,
    queueDirection(direction: LabyrinthDirection) { if (!destroyed && phase === "playing" && ["up", "down", "left", "right"].includes(direction)) player = { ...player, queuedDirection: direction }; },
    tick(deltaMs: number) {
      if (destroyed || phase !== "playing") return snapshot(); const elapsed = Math.max(0, Math.min(deltaMs, 250)); stepAccumulatorMs += elapsed; player = { ...player, invulnerabilityMs: Math.max(0, player.invulnerabilityMs - elapsed), auraMs: Math.max(0, player.auraMs - elapsed) };
      if (player.auraMs === 0 && goblins.some((goblin) => goblin.fleeing)) goblins = goblins.map((goblin) => ({ ...goblin, fleeing: false }));
      while (stepAccumulatorMs >= LABYRINTH_STEP_MS && phase === "playing") {
        stepAccumulatorMs -= LABYRINTH_STEP_MS; mazeSteps += 1; const queued = moved(player, player.queuedDirection); const forward = moved(player, player.direction);
        if (canEnter(queued)) player = { ...player, ...queued, direction: player.queuedDirection };
        else if (canEnter(forward)) player = { ...player, ...forward };
        moveGoblins(); collect(); if (phase === "playing") collideGoblins();
      }
      return snapshot();
    }, capture: snapshot,
    restore(state: LabyrinthGoblinKingSnapshot) {
      if (typeof state !== "object" || state === null) throw new Error("Labyrinth responsive state is invalid");
      const validSentence = Number.isInteger(state.sentenceIndex) && state.sentenceIndex >= 0 && state.sentenceIndex < sentences.length;
      if (!validSentence) throw new Error("Labyrinth responsive state is invalid");
      const priorCorrect = sentences.slice(0, state.sentenceIndex).reduce((sum, sentence) => sum + sentence.words.length, 0);
      const expectedWave = state.phase === "victory" ? state.totalAttempts - 1 : state.totalAttempts;
      const counters = Number.isInteger(state.targetIndex) && state.targetIndex >= 0 && state.targetIndex <= sentences[state.sentenceIndex]!.words.length && Number.isInteger(state.correctAnswers) && state.correctAnswers === priorCorrect + state.targetIndex && Number.isInteger(state.totalAttempts) && state.totalAttempts >= state.correctAnswers && state.score === state.correctAnswers * 100 && Number.isInteger(state.spawnWave) && state.spawnWave === expectedWave && Number.isInteger(state.mazeSteps) && state.mazeSteps >= 0 && Number.isInteger(state.goblinsEaten) && state.goblinsEaten >= 0;
      const cell = (value: LabyrinthCell | undefined) => Boolean(value && Number.isInteger(value.column) && Number.isInteger(value.row) && canEnter(value));
      const arrays = Array.isArray(state.orbs) && state.orbs.length === 3 && Array.isArray(state.goblins) && state.goblins.length === 2;
      const phaseValid = state.phase === "victory" ? state.sentenceIndex === sentences.length - 1 && state.targetIndex === sentences[state.sentenceIndex]!.words.length : state.phase === "defeat" ? state.player?.lives === 0 : state.phase === "playing" && state.player?.lives > 0;
      const cardinal = (direction: LabyrinthDirection) => ["up", "down", "left", "right"].includes(direction);
      const valid = counters && arrays && phaseValid && state.seed === seed && state.sentenceCount === sentences.length && state.sentenceWordCount === sentences[state.sentenceIndex]!.words.length && state.prompt === sentences[state.sentenceIndex]!.prompt && state.answer === sentences[state.sentenceIndex]!.words[Math.min(state.targetIndex, sentences[state.sentenceIndex]!.words.length - 1)] && state.builtSentence === sentences[state.sentenceIndex]!.words.slice(0, state.targetIndex).join(" ") && cell(state.player) && cardinal(state.player.direction) && cardinal(state.player.queuedDirection) && state.player.lives >= 0 && state.player.lives <= 3 && Number.isFinite(state.player.invulnerabilityMs) && state.player.invulnerabilityMs >= 0 && state.player.invulnerabilityMs <= 1_000 && Number.isFinite(state.player.auraMs) && state.player.auraMs >= 0 && state.player.auraMs <= LABYRINTH_AURA_MS && state.orbs.every((orb) => cell(orb) && sentences[state.sentenceIndex]!.words.includes(orb.word) && orb.collected === false) && new Set(state.orbs.map((orb) => orb.id)).size === state.orbs.length && new Set(state.orbs.map((orb) => `${orb.column}:${orb.row}`)).size === state.orbs.length && state.goblins.every((goblin) => cell(goblin) && cardinal(goblin.direction)) && new Set(state.goblins.map((goblin) => goblin.id)).size === state.goblins.length && state.goblins.filter((goblin) => goblin.eaten).length === state.goblinsEaten && state.goblins.every((goblin) => goblin.eaten || goblin.fleeing === (state.player.auraMs > 0)) && Number.isFinite(state.stepAccumulatorMs) && state.stepAccumulatorMs >= 0 && state.stepAccumulatorMs < LABYRINTH_STEP_MS && typeof state.destroyed === "boolean";
      if (!valid) throw new Error("Labyrinth responsive state is invalid");
      phase = state.phase; sentenceIndex = state.sentenceIndex; targetIndex = state.targetIndex; player = { ...state.player }; orbs = state.orbs.map((orb) => ({ ...orb })); goblins = state.goblins.map((goblin) => ({ ...goblin })); stepAccumulatorMs = state.stepAccumulatorMs; mazeSteps = state.mazeSteps; spawnWave = state.spawnWave; correctAnswers = state.correctAnswers; totalAttempts = state.totalAttempts; score = state.score; goblinsEaten = state.goblinsEaten; lastOutcome = state.lastOutcome; destroyed = state.destroyed; if (destroyed) completion.sealWithoutDelivery();
    }, destroy() { destroyed = true; completion.sealWithoutDelivery(); },
  });
}

interface G { clear(): this; fillStyle(c: number, a?: number): this; fillRect(x: number, y: number, w: number, h: number): this; fillCircle(x: number, y: number, r: number): this; fillRoundedRect(x: number, y: number, w: number, h: number, r?: number): this; destroy(): void }
interface T { setText(v: string): this; setPosition(x: number, y: number): this; setOrigin?(x: number, y?: number): this; destroy(): void }
interface I { setOrigin?(x: number, y: number): this; setDepth?(depth: number): this; setPosition?(x: number, y: number): this; setDisplaySize?(width: number, height: number): this; setAlpha?(alpha: number): this; setTint?(color: number): this; clearTint?(): this; destroy(): void }
interface S { load?: { image?(key: string, url: string): unknown; spritesheet?(key: string, url: string, config: { frameWidth: number; frameHeight: number }): unknown }; add?: { graphics(): G; text(x: number, y: number, v: string, s?: Readonly<Record<string, unknown>>): T; tileSprite?(x: number, y: number, width: number, height: number, key: string): I; sprite?(x: number, y: number, key: string, frame?: number): I; image?(x: number, y: number, key: string): I }; scale?: { width?: number; height?: number }; game?: { canvas?: { getBoundingClientRect?(): { left: number; top: number; width: number; height: number } } }; events?: { once(e: string, f: () => void): void } }
function preloadAssetBindings(load: NonNullable<S["load"]>, edition: CartridgeGameConfigContext["edition"], _keys: readonly string[]): void {
  const keys = ["world:ground", "player:idle", "enemy:idle"].filter((key) => Boolean(edition.bindings[key]));
  if (keys.length) preloadRuntimeAssetBindings(load, edition, keys);
}
function wrapWord(word: string): string { const parts = [...new Intl.Segmenter("en", { granularity: "grapheme" }).segment(word)].map((part) => part.segment); const lines: string[] = []; for (let index = 0; index < parts.length; index += 8) lines.push(parts.slice(index, index + 8).join("")); return lines.join("\n"); }
function createScene(context: CartridgeGameConfigContext, controller: LabyrinthGoblinKingController): Readonly<Record<string, unknown>> {
  let graphics: G | undefined; let prompt: T | undefined; let status: T | undefined; let labels: readonly T[] = []; let ground: I | undefined; let playerImage: I | undefined; const enemyImages = new Map<string, I>(); let composition = context.composition;
  const size = (scene: S) => ({ width: scene.scale?.width ?? 390, height: scene.scale?.height ?? 700 });
  const cleanup = () => { controller.destroy(); graphics?.destroy(); prompt?.destroy(); status?.destroy(); labels.forEach((label) => label.destroy()); ground?.destroy(); playerImage?.destroy(); enemyImages.forEach((image) => image.destroy()); enemyImages.clear(); };
  const render = (scene: S) => { if (!graphics || !prompt || !status) return; const state = controller.snapshot(); const { width, height } = size(scene); const transform = mazeTransform(width, height); const { scale, offsetX: ox, offsetY: oy } = transform;
    graphics.clear().fillStyle(0x111827, 1).fillRect(0, 0, width, 130); if (!ground) graphics.fillStyle(0x111827, 1).fillRect(0, 130, width, height - 130); for (let row = 0; row < 15; row += 1) for (let column = 0; column < 11; column += 1) graphics.fillStyle(mazeWall(column, row) ? 0x334155 : 0x111827, mazeWall(column, row) ? 1 : 0.28).fillRect(ox + column * 32 * scale, oy + row * 32 * scale, 32 * scale, 32 * scale);
    state.orbs.forEach((orb, index) => { const { x, y } = scenePoint(orb, width, height); const wrapped = wrapWord(orb.word); const cardHeight = Math.max(44, wrapped.split("\n").length * 18 + 10); graphics!.fillStyle(LABYRINTH_ORB_COLOR, 1).fillRoundedRect(x - 35, y - cardHeight / 2, 70, cardHeight, 9); labels[index]?.setText(wrapped).setPosition(x, y - cardHeight / 2 + 5); });
    prompt.setText(state.prompt).setPosition(width / 2, 18); status.setText(state.phase === "victory" ? state.builtSentence : `${state.builtSentence}${state.builtSentence ? "  " : ""}${state.targetIndex + 1}/${state.sentenceWordCount}  ♥${state.player.lives}`).setPosition(width / 2, 82);
    const rectWidth = scene.game?.canvas?.getBoundingClientRect?.().width ?? width;
    const displayed = Math.max(0.1, rectWidth / width);
    const addActor = (key: string): I | undefined => {
      if (!scene.add || !context.edition.bindings[key]) return undefined;
      const resolved = resolveAssetBinding(context.edition, key);
      const image = scene.add.sprite?.(0, 0, resolved.textureKey, 0) ?? scene.add.image?.(0, 0, resolved.textureKey);
      image?.setOrigin?.(0.5, 0.5);
      image?.setDepth?.(5);
      return image;
    };
    playerImage ??= addActor("player:idle");
    for (const goblin of state.goblins) if (!enemyImages.has(goblin.id)) { const image = addActor("enemy:idle"); if (image) enemyImages.set(goblin.id, image); }
    const playerPoint = scenePoint(state.player, width, height);
    if (playerImage) {
      const displaySize = 48 / displayed;
      playerImage.setDisplaySize?.(displaySize, displaySize);
      playerImage.setPosition?.(playerPoint.x, playerPoint.y - displaySize * (2.5 / 24));
      playerImage.setAlpha?.(state.player.invulnerabilityMs > 0 ? 0.55 : 1);
      if (state.player.auraMs > 0) playerImage.setTint?.(0xfbbf24); else playerImage.clearTint?.();
    } else graphics.fillStyle(state.player.auraMs > 0 ? 0xfbbf24 : 0xe2e8f0, 1).fillCircle(playerPoint.x, playerPoint.y, 12);
    for (const goblin of state.goblins) {
      const goblinPoint = scenePoint(goblin, width, height);
      const image = enemyImages.get(goblin.id);
      if (image) {
        const displaySize = 70.4 / displayed;
        image.setDisplaySize?.(displaySize, displaySize);
        image.setPosition?.(goblinPoint.x - displaySize * (1 / 32), goblinPoint.y - displaySize * (8 / 32));
        image.setAlpha?.(goblin.eaten ? 0 : 1);
        if (goblin.fleeing) image.setTint?.(0x60a5fa); else image.clearTint?.();
      } else if (!goblin.eaten) graphics.fillStyle(goblin.fleeing ? 0x60a5fa : 0x22c55e, 1).fillCircle(goblinPoint.x, goblinPoint.y, 12);
    }
  };
  return { key: LABYRINTH_GOBLIN_KING_ID, preload(this: S) { if (this.load) { const keys = ["world:ground", "player:idle", "enemy:idle"].filter((key) => Boolean(context.edition.bindings[key])); if (keys.length) preloadAssetBindings(this.load, context.edition, keys); } }, create(this: S) { if (!this.add) throw new Error("Labyrinth requires Phaser display services"); const { width, height } = size(this); const rectWidth = this.game?.canvas?.getBoundingClientRect?.().width ?? width; const displayed = Math.max(.1, rectWidth / width); const compact = width <= 480 || composition?.profile === "compact"; if (context.edition.bindings["world:ground"] && this.add.tileSprite) { const resolved = resolveAssetBinding(context.edition, "world:ground"); ground = this.add.tileSprite(0, 0, width, height, resolved.textureKey); ground.setOrigin?.(0, 0); ground.setDepth?.(-10); } graphics = this.add.graphics(); prompt = this.add.text(0, 0, "", { fontFamily: "Arial", fontSize: `${Math.min(42, Math.max(compact ? 24 : 30, Math.ceil(18 / displayed)))}px`, color: "#ffffff", fontStyle: "bold", align: "center", wordWrap: { width: width - 24, useAdvancedWrap: true } }); prompt.setOrigin?.(.5, 0); status = this.add.text(0, 0, "", { fontFamily: "Arial", fontSize: `${Math.min(38, Math.max(17, Math.ceil(15 / displayed)))}px`, color: "#bfdbfe", align: "center" }); status.setOrigin?.(.5, 0); labels = Array.from({ length: 3 }, () => { const label = this.add!.text(0, 0, "", { fontFamily: "Arial", fontSize: `${Math.min(34, Math.max(15, Math.ceil(14 / displayed)))}px`, color: "#ffffff", align: "center" }); label.setOrigin?.(.5, 0); return label; }); this.events?.once("shutdown", cleanup); this.events?.once("destroy", cleanup); render(this); }, update(this: S, _time = 0, delta = 16) { if ((context.sessionMode ?? "playing") === "playing") { const input = context.inputController.snapshot(); const keys = new Set(input.keys); const direction: LabyrinthDirection = keys.has("ArrowUp") || keys.has("KeyW") ? "up" : keys.has("ArrowDown") || keys.has("KeyS") ? "down" : keys.has("ArrowLeft") || keys.has("KeyA") ? "left" : keys.has("ArrowRight") || keys.has("KeyD") ? "right" : "none"; if (direction !== "none") controller.queueDirection(direction); if (input.pointer.down && !input.pointer.cancelled && direction === "none") { const rect = this.game?.canvas?.getBoundingClientRect?.(); const { width, height } = size(this); const x = rect && rect.width ? (input.pointer.x - rect.left) * width / rect.width : input.pointer.x; const y = rect && rect.height ? (input.pointer.y - rect.top) * height / rect.height : input.pointer.y; const state = controller.snapshot(); const playerPoint = scenePoint(state.player, width, height); controller.queueDirection(Math.abs(x - playerPoint.x) > Math.abs(y - playerPoint.y) ? (x > playerPoint.x ? "right" : "left") : y > playerPoint.y ? "down" : "up"); } controller.tick(delta); } render(this); }, extend: { apkCaptureResponsiveState: () => controller.capture(), apkRestoreResponsiveState: (state: unknown) => controller.restore(state as LabyrinthGoblinKingSnapshot), apkRecompose: (next: CartridgeGameConfigContext["composition"]) => { composition = next; } } };
}

/** @returns The retained Labyrinth of the Goblin King cartridge. */
export function createLabyrinthGoblinKingCartridge(): StandardExperienceCartridge {
  let active: LabyrinthGoblinKingController | undefined; const standardExperience = createCartridgeStandardExperience({ id: LABYRINTH_GOBLIN_KING_ID, title: "Labyrinth of the Goblin King", description: "Navigate the maze, collect ordered word orbs, and avoid goblin hazards.", inputMode: "sentence", objective: "Collect each English sentence word for the Thai prompt.", mechanicInstruction: "Queue turns through the maze and collect word orbs in order.", keyboardKeys: ["W", "A", "S", "D", "Arrow keys"], executeTutorialAction: (id) => active?.queueDirection(id === "action:select-correct" ? "right" : "down") });
  return { manifest: { id: LABYRINTH_GOBLIN_KING_ID, title: "Labyrinth of the Goblin King", description: "Navigate the maze, collect ordered word orbs, and avoid goblin hazards.", runtimeApiVersion: "1.0.0", inputMode: "sentence", requiredAssetBindings: ["labyrinth-goblin-king/player"], capabilities: ["capability:input-action-normalization", "capability:language-target-progression", "capability:nonempty-content-precondition", "capability:result-accounting", "capability:single-completion-emission", "capability:time-and-frame-loop"] }, standardExperience, createGameConfig(context) { const input = sentenceInputSchema.parse(context.input); let controller!: LabyrinthGoblinKingController; controller = createLabyrinthGoblinKingController(input, (result) => context.complete(result, controller.snapshot().phase as GameTerminalOutcome), context.seed ?? 0); active = controller; return { width: 390, height: 700, render: { antialias: false, pixelArt: true }, scene: createScene(context, controller) }; } };
}
