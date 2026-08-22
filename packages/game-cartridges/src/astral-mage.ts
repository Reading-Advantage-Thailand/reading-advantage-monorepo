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
  createLanguageTargetProgression,
  createResultAccountant,
  finalizeResult,
  preloadAssetBindings,
  validateNonEmptyContent,
  type ActorSpriteLayer,
  type ActorSpriteLike,
  type APKInputController,
  type CartridgeGameConfigContext,
  type CompletionDelivery,
  type InputActionId,
  type RuntimeEdition,
} from "@reading-advantage/advantage-play-kit";
import type { StandardExperienceCartridge } from "@reading-advantage/advantage-play-kit/presentation";

import { createCartridgeStandardExperience } from "./standard-experience.js";

/** Stable public identifier for the Astral Mage cartridge. */
export const ASTRAL_MAGE_ID = "astral-mage" as const;

/** Phaser canvas size used by Astral Mage before host scaling. */
export const ASTRAL_MAGE_CANVAS = Object.freeze({ width: 960, height: 540 });

/** Keyboard bindings accepted by the Astral Mage arena. */
export const ASTRAL_MAGE_KEYBOARD_BINDINGS: Readonly<Record<string, InputActionId>> = Object.freeze({
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

/** One shootable word crystal in the active Astral Mage sentence. */
export interface AstralMageCrystal {
  /** Stable crystal identity for ordered progression. */
  readonly id: string;
  /** Visible word or rune label. */
  readonly label: string;
}

/** One crystal position in the responsive procedural arena. */
export interface AstralMageCrystalPoint {
  /** Stable crystal identity. */
  readonly id: string;
  /** Scene-space horizontal position. */
  readonly x: number;
  /** Scene-space vertical position. */
  readonly y: number;
}

/** Active or terminal phase in an Astral Mage session. */
export type AstralMagePhase = "aim" | "complete";

/** Immutable state exposed by the transport-independent Astral Mage rules. */
export interface AstralMageSnapshot {
  /** Current game phase. */
  readonly phase: AstralMagePhase;
  /** Active sentence index, or the sentence count after completion. */
  readonly sentenceIndex: number;
  /** Index of the next required word in the active sentence. */
  readonly wordIndex: number;
  /** Translation shown as the player prompt. */
  readonly prompt: string;
  /** Source sentence being assembled in word order. */
  readonly sentence: string;
  /** Visible word crystals and one decoy crystal. */
  readonly crystals: readonly AstralMageCrystal[];
  /** Stable identity for the next required crystal. */
  readonly nextCrystalId?: string;
  /** Result of the most recent valid shot. */
  readonly lastOutcome?: "correct" | "incorrect";
  /** Number of correct shots. */
  readonly correctAnswers: number;
  /** Number of valid crystal shots. */
  readonly totalAttempts: number;
  /** Current game score. */
  readonly score: number;
  /** Whether the scene lifecycle has destroyed this session. */
  readonly destroyed: boolean;
}

/** Result returned after one attempted crystal shot. */
export interface AstralMageShotResult {
  /** Whether the crystal was accepted by the active session. */
  readonly accepted: boolean;
  /** Whether the selected crystal was the next required word. */
  readonly correct: boolean;
  /** Whether the sentence sequence advanced. */
  readonly progressed: boolean;
  /** Whether this shot completed the active sentence. */
  readonly ritualCompleted: boolean;
  /** Whether this shot completed every sentence. */
  readonly completed: boolean;
  /** Terminal result on the first completing shot. */
  readonly result?: GameResults;
  /** State after applying the shot. */
  readonly snapshot: AstralMageSnapshot;
}

/** Transport-independent Astral Mage rules and lifecycle controls. */
export interface AstralMageController {
  /** Returns the current immutable game state. */
  snapshot(): AstralMageSnapshot;
  /** Shoots one visible crystal and advances only for the next word. */
  shoot(crystalId: string): AstralMageShotResult;
  /** Captures state for a responsive Phaser reflow. */
  capture(): AstralMageSnapshot;
  /** Restores state captured before a responsive Phaser reflow. */
  restore(snapshot: AstralMageSnapshot): void;
  /** Seals the session so a destroyed scene cannot emit a later result. */
  destroy(): void;
}

/** Minimal Phaser graphics surface used by the procedural arena. */
interface PhaserGraphicsLike {
  clear(): this;
  fillStyle(color: number, alpha?: number): this;
  fillRect(x: number, y: number, width: number, height: number): this;
  fillCircle(x: number, y: number, radius: number): this;
  fillRoundedRect(x: number, y: number, width: number, height: number, radius?: number): this;
  fillTriangle(x0: number, y0: number, x1: number, y1: number, x2: number, y2: number): this;
  lineStyle(lineWidth: number, color: number, alpha?: number): this;
  strokeRoundedRect(x: number, y: number, width: number, height: number, radius?: number): this;
  destroy(): void;
}

/** Minimal Phaser text surface used by the procedural arena. */
interface PhaserTextLike {
  setPosition(x: number, y: number): this;
  setText(value: string): this;
  destroy(): void;
}

/** Minimal Phaser canvas surface needed for pointer conversion. */
interface PhaserCanvasLike {
  getBoundingClientRect?(): { readonly left: number; readonly top: number; readonly width: number; readonly height: number };
}

/** Minimal Phaser scene surface used by this cartridge. */
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
  events?: {
    once(event: string, listener: () => void): void;
  };
  game?: { readonly canvas?: PhaserCanvasLike };
  scale?: { readonly width?: number; readonly height?: number };
}

/** Resources owned by one active Astral Mage scene. */
interface SceneResources {
  readonly art: ActorSpriteLayer;
  readonly graphics: PhaserGraphicsLike;
  readonly title: PhaserTextLike;
  readonly prompt: PhaserTextLike;
  readonly progress: PhaserTextLike;
  readonly feedback: PhaserTextLike;
  readonly instructions: PhaserTextLike;
}

/** Responsive scene state retained outside the educational controller. */
interface AstralMageResponsiveState {
  readonly game: AstralMageSnapshot;
  readonly mage: Readonly<{ x: number; y: number }>;
}

/** Current Phaser scene options passed to the Astral Mage renderer. */
interface AstralMageSceneContext {
  readonly edition: RuntimeEdition;
  readonly controller: AstralMageController;
  readonly inputController: APKInputController;
  readonly composition: CartridgeGameConfigContext["composition"];
  readonly totalSentences: number;
  readonly diagnostic: CartridgeGameConfigContext["diagnostic"];
  readonly sessionMode: CartridgeGameConfigContext["sessionMode"];
}

function tokenizeSentence(sentence: string): readonly string[] {
  return Object.freeze(sentence.trim().split(/\s+/u).filter(Boolean));
}

function calculateProgressCount(
  sentenceWords: readonly (readonly string[])[],
  snapshot: AstralMageSnapshot,
): number {
  if (snapshot.phase === "complete") {
    return sentenceWords.reduce((total, words) => total + words.length, 0);
  }
  return sentenceWords
    .slice(0, snapshot.sentenceIndex)
    .reduce((total, words) => total + words.length, 0) + snapshot.wordIndex;
}

function isResponsiveState(value: unknown): value is AstralMageResponsiveState {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<AstralMageResponsiveState>;
  return typeof candidate.game === "object" && candidate.game !== null
    && typeof candidate.mage === "object" && candidate.mage !== null
    && Number.isFinite(candidate.mage.x) && Number.isFinite(candidate.mage.y);
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}

function echoCrystalLabel(
  sentenceWords: readonly (readonly string[])[],
  sentenceIndex: number,
): string {
  const allWords = sentenceWords.flat();
  const start = sentenceWords
    .slice(0, sentenceIndex)
    .reduce((total, words) => total + words.length, 0);
  return allWords[(start + sentenceWords[sentenceIndex]!.length) % allWords.length]!;
}

/**
 * Creates the reusable Astral Mage rules for one sentence array.
 * @param input Untrusted sentence input from a host or test.
 * @param deliver Completion callback that receives one terminal result.
 * @returns A controller for ordered crystal-shooting gameplay.
 * @throws When the sentence input is invalid, empty, or blank.
 */
export function createAstralMageController(
  input: unknown,
  deliver: CompletionDelivery<GameResults>,
): AstralMageController {
  const parsedInput = sentenceInputSchema.parse(input);
  const content = validateNonEmptyContent(parsedInput, "sentence");
  const sentenceWords = content.items.map((item) => tokenizeSentence(item.term));
  const wordIds = sentenceWords.map((words, sentenceIndex) =>
    words.map((_word, wordIndex) => `word:${sentenceIndex}:${wordIndex}`),
  );
  const allWordIds = wordIds.flat();
  const progression = createLanguageTargetProgression(allWordIds);
  const crystalRounds = sentenceWords.map((words, sentenceIndex) =>
    Object.freeze([
      ...words.map((label, wordIndex) => Object.freeze({
        id: wordIds[sentenceIndex]![wordIndex]!,
        label,
      })),
      Object.freeze({
        id: `echo:${sentenceIndex}`,
        label: echoCrystalLabel(sentenceWords, sentenceIndex),
      }),
    ]),
  );
  let accountant = createResultAccountant();
  const completion = createCompletionLatch(deliver);
  let phase: AstralMagePhase = "aim";
  let sentenceIndex = 0;
  let wordIndex = 0;
  let lastOutcome: "correct" | "incorrect" | undefined;
  let destroyed = false;

  const snapshot = (): AstralMageSnapshot => {
    const displayIndex = Math.min(sentenceIndex, content.items.length - 1);
    return Object.freeze({
      phase,
      sentenceIndex,
      wordIndex,
      prompt: content.items[displayIndex]!.translation,
      sentence: content.items[displayIndex]!.term,
      crystals: crystalRounds[displayIndex]!,
      ...(phase === "aim" ? { nextCrystalId: wordIds[sentenceIndex]![wordIndex]! } : {}),
      ...(lastOutcome === undefined ? {} : { lastOutcome }),
      correctAnswers: accountant.correctAnswers,
      totalAttempts: accountant.totalAttempts,
      score: accountant.score,
      destroyed,
    });
  };

  const restore = (state: AstralMageSnapshot): void => {
    if (destroyed) return;
    const validActiveState = state.phase === "aim"
      && state.sentenceIndex >= 0
      && state.sentenceIndex < sentenceWords.length
      && state.wordIndex >= 0
      && state.wordIndex < sentenceWords[state.sentenceIndex]!.length;
    const validCompleteState = state.phase === "complete"
      && state.sentenceIndex === sentenceWords.length
      && state.wordIndex === 0;
    if (!validActiveState && !validCompleteState) {
      throw new Error("Astral Mage responsive state has invalid sentence progress");
    }
    const progressCount = calculateProgressCount(sentenceWords, state);
    if (
      state.correctAnswers !== progressCount
      || state.totalAttempts < progressCount
      || state.score !== progressCount * 100
    ) {
      throw new Error("Astral Mage responsive state has invalid result counters");
    }
    progression.reset();
    for (const id of allWordIds.slice(0, progressCount)) progression.match(id);
    accountant = createResultAccountant();
    for (let index = 0; index < state.totalAttempts; index += 1) {
      accountant.recordAttempt({ correct: index < state.correctAnswers });
    }
    accountant.addScore(state.score);
    phase = state.phase;
    sentenceIndex = state.sentenceIndex;
    wordIndex = state.wordIndex;
    lastOutcome = state.lastOutcome;
    destroyed = state.destroyed;
    if (destroyed) completion.sealWithoutDelivery();
  };

  return Object.freeze({
    snapshot,
    shoot(crystalId: string): AstralMageShotResult {
      const before = snapshot();
      if (destroyed || phase === "complete" || !before.crystals.some((crystal) => crystal.id === crystalId)) {
        return Object.freeze({
          accepted: false,
          correct: false,
          progressed: false,
          ritualCompleted: false,
          completed: phase === "complete",
          snapshot: before,
        });
      }

      const match = progression.match(crystalId);
      accountant.recordAttempt({ correct: match.matched });
      lastOutcome = match.matched ? "correct" : "incorrect";
      if (!match.matched) {
        return Object.freeze({
          accepted: true,
          correct: false,
          progressed: false,
          ritualCompleted: false,
          completed: false,
          snapshot: snapshot(),
        });
      }

      accountant.addScore(100);
      wordIndex += 1;
      const ritualCompleted = wordIndex >= sentenceWords[sentenceIndex]!.length;
      if (!ritualCompleted) {
        return Object.freeze({
          accepted: true,
          correct: true,
          progressed: true,
          ritualCompleted: false,
          completed: false,
          snapshot: snapshot(),
        });
      }

      sentenceIndex += 1;
      wordIndex = 0;
      if (!progression.isComplete) {
        return Object.freeze({
          accepted: true,
          correct: true,
          progressed: true,
          ritualCompleted: true,
          completed: false,
          snapshot: snapshot(),
        });
      }

      phase = "complete";
      const result = gameResultsSchema.parse(
        finalizeResult(accountant, { xpPerCorrect: 20, xpPerAccuracyPoint: 10 }),
      );
      completion.complete(result);
      return Object.freeze({
        accepted: true,
        correct: true,
        progressed: true,
        ritualCompleted: true,
        completed: true,
        result,
        snapshot: snapshot(),
      });
    },
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
 * Returns evenly spaced crystal positions around the procedural arena.
 * @param crystals Visible crystals in the active sentence.
 * @param sceneWidth Current scene width.
 * @param sceneHeight Current scene height.
 * @returns Immutable scene-space positions for each crystal.
 */
export function getAstralMageCrystalPoints(
  crystals: readonly AstralMageCrystal[],
  sceneWidth: number,
  sceneHeight: number,
): readonly AstralMageCrystalPoint[] {
  if (crystals.length === 0) return Object.freeze([]);
  const centerX = sceneWidth / 2;
  const centerY = sceneHeight * 0.51;
  const radius = Math.min(sceneWidth, sceneHeight) * 0.29;
  return Object.freeze(crystals.map((crystal, index) => Object.freeze({
    id: crystal.id,
    x: centerX + Math.cos(-Math.PI / 2 + index * (Math.PI * 2 / crystals.length)) * radius,
    y: centerY + Math.sin(-Math.PI / 2 + index * (Math.PI * 2 / crystals.length)) * radius,
  })));
}

/**
 * Maps a pointer release to a nearby Astral Mage crystal.
 * @param pointerX Scene-space pointer horizontal coordinate.
 * @param pointerY Scene-space pointer vertical coordinate.
 * @param crystals Visible crystals in the active sentence.
 * @param sceneWidth Current scene width.
 * @param sceneHeight Current scene height.
 * @returns A crystal identity, or undefined outside all crystal targets.
 */
export function chooseAstralMageCrystalFromPointer(
  pointerX: number,
  pointerY: number,
  crystals: readonly AstralMageCrystal[],
  sceneWidth: number,
  sceneHeight: number,
): string | undefined {
  const points = getAstralMageCrystalPoints(crystals, sceneWidth, sceneHeight);
  const hitRadius = Math.max(40, Math.min(sceneWidth, sceneHeight) * 0.12);
  let nearest: AstralMageCrystalPoint | undefined;
  let nearestDistance = Number.POSITIVE_INFINITY;
  for (const point of points) {
    const distance = Math.hypot(pointerX - point.x, pointerY - point.y);
    if (distance < nearestDistance) {
      nearest = point;
      nearestDistance = distance;
    }
  }
  return nearestDistance <= hitRadius ? nearest?.id : undefined;
}

function createScene(context: AstralMageSceneContext): Readonly<Record<string, unknown>> {
  let resources: SceneResources | undefined;
  let targetLabels: PhaserTextLike[] = [];
  let targetSignature = "";
  let animationMs = 0;
  let composition = context.composition;
  let previousKeys = new Set<string>();
  let mage = { x: 0.5, y: 0.71 };
  const normalize = createInputActionNormalizer({
    keyboard: ASTRAL_MAGE_KEYBOARD_BINDINGS,
    pointerTap: { action: "confirm" },
  });
  const frameScheduler = createBoundedFrameScheduler((deltaMs) => {
    animationMs = (animationMs + deltaMs) % 4_000;
  });

  const dimensions = (scene: PhaserSceneLike): { width: number; height: number } => ({
    width: scene.scale?.width ?? ASTRAL_MAGE_CANVAS.width,
    height: scene.scale?.height ?? ASTRAL_MAGE_CANVAS.height,
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

  const syncTargetLabels = (scene: PhaserSceneLike, state: AstralMageSnapshot): void => {
    if (!scene.add) return;
    const signature = state.crystals.map((crystal) => `${crystal.id}:${crystal.label}`).join("|");
    if (signature === targetSignature) return;
    for (const target of targetLabels) target.destroy();
    targetSignature = signature;
    targetLabels = state.crystals.map((crystal) =>
      scene.add!.text(0, 0, crystal.label, {
        fontFamily: "Arial",
        fontSize: "18px",
        color: "#f8fbff",
        align: "center",
      }),
    );
  };

  const updateView = (scene: PhaserSceneLike): void => {
    if (!resources || !scene.add) return;
    const { width, height } = dimensions(scene);
    const state = context.controller.snapshot();
    syncTargetLabels(scene, state);
    const points = getAstralMageCrystalPoints(state.crystals, width, height);
    const pulse = Math.sin(animationMs / 650) * 5;
    const mageX = mage.x * width;
    const mageY = mage.y * height;

    resources.graphics.clear();
    if (!resources.art.ground("world:ground", width, height)) resources.graphics.fillStyle(0x07091d, 1).fillRect(0, 0, width, height);
    for (let index = 0; index < 20; index += 1) {
      const starX = ((index * 151) % 997) / 997 * width;
      const starY = ((index * 89) % 541) / 541 * height;
      const shimmer = 0.35 + 0.25 * Math.sin(animationMs / 800 + index);
      resources.graphics.fillStyle(index % 2 === 0 ? 0x8bbcff : 0xdab6ff, shimmer).fillCircle(starX, starY, 1 + index % 3);
    }
    resources.graphics.fillStyle(0x171144, 0.9).fillCircle(width / 2, height * 0.51, Math.min(width, height) * 0.36);
    resources.graphics.lineStyle(3, 0x6d5dfc, 0.75).strokeRoundedRect(width * 0.18, height * 0.2, width * 0.64, height * 0.6, 42);
    for (const [index, point] of points.entries()) {
      resources.graphics.fillStyle(0x7c8cff, 0.82);
      resources.graphics.fillTriangle(point.x, point.y - 26 - pulse, point.x - 21, point.y + 16, point.x + 21, point.y + 16);
      resources.graphics.fillStyle(0xf5e8ff, 0.75).fillCircle(point.x, point.y - 5 - pulse, 5);
      targetLabels[index]?.setPosition(point.x - 42, point.y + 24);
    }
    if (!resources.art.place("player", "player:idle", { x: mageX, y: mageY, width: 62, depth: 8 })) {
      resources.graphics.fillStyle(0x9c70ff, 0.95).fillCircle(mageX, mageY, 22);
      resources.graphics.fillStyle(0xeee4ff, 1).fillCircle(mageX, mageY - 18, 13);
      resources.graphics.fillStyle(0x42d4ff, 0.9).fillTriangle(mageX - 25, mageY + 18, mageX, mageY - 58, mageX + 25, mageY + 18);
    }
    resources.art.sweep();
    resources.title.setText("ASTRAL MAGE").setPosition(28, 20);
    resources.prompt.setText(`Cast the sentence for: ${state.prompt}`).setPosition(28, 60);
    resources.progress
      .setText(
        `${composition?.profile === "compact" ? "Compact constellation" : "Astral arena"}  •  Ritual ${Math.min(state.sentenceIndex + 1, context.totalSentences)} of ${context.totalSentences}  •  Word ${state.wordIndex + 1}`,
      )
      .setPosition(28, 96);
    resources.feedback
      .setText(
        state.phase === "complete"
          ? "The constellation is complete!"
          : state.lastOutcome === "incorrect"
            ? "That crystal breaks apart. Try the next word."
            : "Move the mage, then cast the next word crystal.",
      )
      .setPosition(28, height - 68);
    resources.instructions
      .setText("Keyboard: WASD / arrows move near a crystal • Space casts • Touch or click")
      .setPosition(28, height - 36);
  };

  const applyShot = (crystalId: string): void => {
    const result = context.controller.shoot(crystalId);
    if (!result.accepted) return;
    context.diagnostic({
      level: "info",
      code: result.completed ? "ASTRAL_MAGE_COMPLETE" : "ASTRAL_MAGE_SHOT",
      message: result.completed ? "Astral Mage completed every sentence." : result.correct ? "Astral Mage bound a correct crystal." : "Astral Mage hit an incorrect crystal.",
      details: {
        correct: result.correct,
        sentenceIndex: result.snapshot.sentenceIndex,
        wordIndex: result.snapshot.wordIndex,
      },
    });
  };

  const moveMage = (action: InputActionId): void => {
    const step = 0.055;
    if (action === "move-left") mage = { ...mage, x: clamp(mage.x - step, 0.12, 0.88) };
    if (action === "move-right") mage = { ...mage, x: clamp(mage.x + step, 0.12, 0.88) };
    if (action === "move-up") mage = { ...mage, y: clamp(mage.y - step, 0.32, 0.82) };
    if (action === "move-down") mage = { ...mage, y: clamp(mage.y + step, 0.32, 0.82) };
  };

  const cleanup = (): void => {
    if (!resources) return;
    frameScheduler.cancel();
    context.controller.destroy();
    resources.graphics.destroy();
    resources.title.destroy();
    resources.prompt.destroy();
    resources.progress.destroy();
    resources.feedback.destroy();
    resources.instructions.destroy();
    for (const target of targetLabels) target.destroy();
    targetLabels = [];
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
    if (!this.add) throw new Error("Astral Mage requires Phaser display services");
    const textStyle = { fontFamily: "Arial", color: "#f8fbff", fontSize: "20px" };
    resources = {
      graphics: this.add.graphics(),
      art: createActorSpriteLayer(this, context.edition),
      title: this.add.text(28, 20, "ASTRAL MAGE", { ...textStyle, fontSize: "30px", fontStyle: "bold" }),
      prompt: this.add.text(28, 60, "", { ...textStyle, fontSize: "24px", wordWrap: { width: 860 } }),
      progress: this.add.text(28, 96, "", { ...textStyle, fontSize: "16px", color: "#b8c9ff" }),
      feedback: this.add.text(28, 0, "", { ...textStyle, fontSize: "17px", color: "#75f4cb" }),
      instructions: this.add.text(28, 0, "", { ...textStyle, fontSize: "15px", color: "#cad4f8" }),
    };
    this.events?.once("shutdown", cleanup);
    this.events?.once("destroy", cleanup);
    updateView(this);
  };

  const update = function (this: PhaserSceneLike, _time: number, delta: number): void {
    if (!resources) return;
    frameScheduler.tick(delta);
    if (context.sessionMode === "playing") {
      const input = context.inputController.snapshot();
      const pressed = input.pressed ?? input.keys.filter((key) => !previousKeys.has(key));
      previousKeys = new Set(input.keys);
      for (const code of pressed) {
        const action = normalize({ modality: "keyboard", code })[0]?.action;
        if (action === "confirm") {
          const { width, height } = dimensions(this);
          const state = context.controller.snapshot();
          const targetId = chooseAstralMageCrystalFromPointer(
            mage.x * width,
            mage.y * height,
            state.crystals,
            width,
            height,
          );
          if (targetId) applyShot(targetId);
        } else if (action) {
          moveMage(action);
        }
      }
      if (input.pointer.released && !input.pointer.cancelled) {
        const action = normalize({ modality: "pointer", phase: "up", x: input.pointer.x, y: input.pointer.y })[0]?.action;
        if (action === "confirm") {
          const { width, height } = dimensions(this);
          const pointer = pointerInScene(this, input.pointer.x, input.pointer.y, width, height);
          const crystalId = chooseAstralMageCrystalFromPointer(
            pointer.x,
            pointer.y,
            context.controller.snapshot().crystals,
            width,
            height,
          );
          if (crystalId) applyShot(crystalId);
        }
      }
    }
    updateView(this);
  };

  return {
    key: ASTRAL_MAGE_ID,
    preload,
    create,
    update,
    extend: {
      apkCaptureResponsiveState: (): AstralMageResponsiveState => Object.freeze({
        game: context.controller.capture(),
        mage: Object.freeze({ ...mage }),
      }),
      apkRestoreResponsiveState: (state: unknown): void => {
        if (!isResponsiveState(state)) throw new Error("Astral Mage responsive state is invalid");
        context.controller.restore(state.game);
        mage = {
          x: clamp(state.mage.x, 0.12, 0.88),
          y: clamp(state.mage.y, 0.32, 0.82),
        };
      },
      apkRecompose: (nextComposition: AstralMageSceneContext["composition"]): void => {
        composition = nextComposition;
      },
    },
  };
}

/**
 * Creates a runtime-compatible Phaser cartridge for one Astral Mage session.
 * @returns A sentence-mode RuntimeCartridge that uses procedural graphics.
 */
export function createAstralMageCartridge(): StandardExperienceCartridge {
  let activeController: AstralMageController | undefined;
  const standardExperience = createCartridgeStandardExperience({
    id: ASTRAL_MAGE_ID,
    title: "Astral Mage",
    description: "Move a mage through a star arena and cast sentence words in order.",
    inputMode: "sentence",
    objective: "Cast each sentence word in the correct order to complete the constellation.",
    mechanicInstruction: "Move near a word crystal and cast it in sentence order.",
    keyboardKeys: ["W", "A", "S", "D", "Arrow keys", "Space"],
    executeTutorialAction: (actionId) => {
      const controller = activeController;
      if (!controller) return;
      const snapshot = controller.snapshot();
      const crystalId = actionId === "action:select-correct"
        ? snapshot.nextCrystalId
        : snapshot.crystals.find((crystal) => crystal.id !== snapshot.nextCrystalId)?.id;
      if (crystalId) controller.shoot(crystalId);
    },
  });
  return {
    manifest: {
      id: ASTRAL_MAGE_ID,
      title: "Astral Mage",
      description: "Move a mage through a star arena and cast sentence words in order.",
      runtimeApiVersion: "1.0.0",
      inputMode: "sentence",
      requiredAssetBindings: [],
      capabilities: [
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
       const controller = createAstralMageController(input, (result) => context.complete(result, "victory"));
      activeController = controller;
      context.diagnostic({
        level: "debug",
        code: "ASTRAL_MAGE_READY",
        message: "Astral Mage word crystals are ready.",
        details: { editionId: context.edition.id, sentenceCount: input.length },
      });
      return {
        width: ASTRAL_MAGE_CANVAS.width,
        height: ASTRAL_MAGE_CANVAS.height,
        render: { antialias: true, pixelArt: false },
        scene: createScene({
          controller,
          edition: context.edition,
          inputController: context.inputController,
          composition: context.composition,
          totalSentences: input.length,
          diagnostic: context.diagnostic,
          sessionMode: context.sessionMode ?? "playing",
        }),
      };
    },
  };
}
