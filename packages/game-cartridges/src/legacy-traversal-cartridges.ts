import {
  gameResultsSchema,
  sentenceInputSchema,
  vocabularyInputSchema,
  type GameResults,
} from "@reading-advantage/game-contracts";
import {
  createCompletionLatch,
  createInputActionNormalizer,
  createLanguageTargetProgression,
  createResultAccountant,
  finalizeResult,
  preloadAssetBindings,
  resolveAssetBinding,
  validateNonEmptyContent,
  type APKInputController,
  type CartridgeGameConfigContext,
  type CompletionDelivery,
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

interface TraversalCartridgeOptions {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly inputMode: "vocabulary" | "sentence";
  readonly objective: string;
  readonly mechanicInstruction: string;
  readonly keyboardKeys: readonly [string, ...string[]];
  readonly keyboardBindings: Readonly<Record<string, InputActionId>>;
  readonly actions: readonly InputActionId[];
  readonly capabilities: readonly string[];
  readonly assetBinding: string;
  readonly colors: Readonly<{
    background: number;
    panel: number;
    accent: number;
    player: number;
  }>;
}

interface TraversalTarget {
  readonly id: string;
  readonly prompt: string;
  readonly answer: string;
}

interface TraversalSnapshot {
  readonly phase: "traverse" | "complete";
  readonly targetIndex: number;
  readonly prompt: string;
  readonly answer: string;
  readonly correctAction: InputActionId;
  readonly correctAnswers: number;
  readonly totalAttempts: number;
  readonly score: number;
  readonly lastOutcome?: "correct" | "incorrect";
  readonly destroyed: boolean;
}

interface TraversalController {
  snapshot(): TraversalSnapshot;
  choose(action: InputActionId): void;
  capture(): TraversalSnapshot;
  restore(snapshot: TraversalSnapshot): void;
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
  destroy(): void;
}

interface PhaserTextLike {
  setPosition(x: number, y: number): this;
  setText(value: string): this;
  destroy(): void;
}

interface PhaserCanvasLike {
  getBoundingClientRect?(): { readonly left: number; readonly width: number };
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
  readonly graphics: PhaserGraphicsLike;
  readonly title: PhaserTextLike;
  readonly prompt: PhaserTextLike;
  readonly progress: PhaserTextLike;
  readonly feedback: PhaserTextLike;
  readonly instructions: PhaserTextLike;
  readonly choices: readonly PhaserTextLike[];
}

const ACTION_LABELS: Readonly<Record<InputActionId, string>> = Object.freeze({
  "move-left": "Left",
  "move-right": "Right",
  "move-up": "Up",
  "move-down": "Down",
  confirm: "Center",
  cancel: "Back",
  pause: "Pause",
  restart: "Restart",
});

function buildTargets(
  input: unknown,
  inputMode: "vocabulary" | "sentence",
): readonly TraversalTarget[] {
  const parsed = inputMode === "vocabulary"
    ? vocabularyInputSchema.parse(input)
    : sentenceInputSchema.parse(input);
  const content = validateNonEmptyContent(parsed, inputMode);
  if (inputMode === "vocabulary") {
    return Object.freeze(content.items.map((item, index) => Object.freeze({
      id: `target:${index}`,
      prompt: item.term,
      answer: item.translation,
    })));
  }
  return Object.freeze(content.items.flatMap((item, sentenceIndex) =>
    item.term.trim().split(/\s+/u).filter(Boolean).map((word, wordIndex) => Object.freeze({
      id: `target:${sentenceIndex}:${wordIndex}`,
      prompt: item.translation,
      answer: word,
    })),
  ));
}

function createTraversalController(
  options: TraversalCartridgeOptions,
  input: unknown,
  deliver: CompletionDelivery<GameResults>,
): TraversalController {
  const targets = buildTargets(input, options.inputMode);
  const progression = createLanguageTargetProgression(targets.map((target) => target.id));
  let accountant = createResultAccountant();
  const completion = createCompletionLatch(deliver);
  let targetIndex = 0;
  let phase: TraversalSnapshot["phase"] = "traverse";
  let lastOutcome: TraversalSnapshot["lastOutcome"];
  let destroyed = false;

  const snapshot = (): TraversalSnapshot => {
    const displayIndex = Math.min(targetIndex, targets.length - 1);
    const target = targets[displayIndex]!;
    return Object.freeze({
      phase,
      targetIndex,
      prompt: target.prompt,
      answer: target.answer,
      correctAction: options.actions[displayIndex % options.actions.length]!,
      correctAnswers: accountant.correctAnswers,
      totalAttempts: accountant.totalAttempts,
      score: accountant.score,
      ...(lastOutcome ? { lastOutcome } : {}),
      destroyed,
    });
  };

  return Object.freeze({
    snapshot,
    choose(action: InputActionId): void {
      if (destroyed || phase === "complete" || !options.actions.includes(action)) return;
      const state = snapshot();
      const correct = action === state.correctAction;
      accountant.recordAttempt({ correct });
      lastOutcome = correct ? "correct" : "incorrect";
      if (!correct) return;
      progression.match(targets[targetIndex]!.id);
      accountant.addScore(100);
      targetIndex += 1;
      if (!progression.isComplete) return;
      phase = "complete";
      completion.complete(gameResultsSchema.parse(
        finalizeResult(accountant, { xpPerCorrect: 20, xpPerAccuracyPoint: 10 }),
      ));
    },
    capture: snapshot,
    restore(state: TraversalSnapshot): void {
      if (destroyed) return;
      if (state.targetIndex < 0 || state.targetIndex > targets.length) {
        throw new Error(`${options.title} responsive state has invalid progress`);
      }
      progression.reset();
      for (const target of targets.slice(0, state.targetIndex)) progression.match(target.id);
      accountant = createResultAccountant();
      for (let index = 0; index < state.totalAttempts; index += 1) {
        accountant.recordAttempt({ correct: index < state.correctAnswers });
      }
      accountant.addScore(state.score);
      targetIndex = state.targetIndex;
      phase = state.phase;
      lastOutcome = state.lastOutcome;
      destroyed = state.destroyed;
      if (destroyed) completion.sealWithoutDelivery();
    },
    destroy(): void {
      if (destroyed) return;
      destroyed = true;
      completion.sealWithoutDelivery();
    },
  });
}

function createScene(
  options: TraversalCartridgeOptions,
  controller: TraversalController,
  inputController: APKInputController,
  initialComposition: CartridgeGameConfigContext["composition"],
  sessionMode: CartridgeGameConfigContext["sessionMode"],
  diagnostic: CartridgeGameConfigContext["diagnostic"],
  edition: RuntimeEdition,
): Readonly<Record<string, unknown>> {
  let resources: SceneResources | undefined;
  let composition = initialComposition;
  let previousKeys = new Set<string>();
  let dragonSprite: PhaserImageLike | undefined;
  let leftGateSprite: PhaserImageLike | undefined;
  let rightGateSprite: PhaserImageLike | undefined;
  const flightArt = Boolean(edition.pack.files["dragon-rider-idle"] || edition.pack.files["dragon-flight-idle"]);
  let parallax: FlightParallaxLayers = { sprites: [], scrollY: 0 };
  const normalize = createInputActionNormalizer({
    keyboard: options.keyboardBindings,
    pointerTap: { action: "confirm" },
  });

  const dimensions = (scene: PhaserSceneLike): { width: number; height: number } => ({
    width: scene.scale?.width ?? 960,
    height: scene.scale?.height ?? 540,
  });

  const actionForPointer = (scene: PhaserSceneLike, clientX: number): InputActionId => {
    const { width } = dimensions(scene);
    const rect = scene.game?.canvas?.getBoundingClientRect?.();
    const localX = rect && rect.width > 0 ? (clientX - rect.left) * (width / rect.width) : clientX;
    const index = Math.max(0, Math.min(
      options.actions.length - 1,
      Math.floor(localX / (width / options.actions.length)),
    ));
    return options.actions[index]!;
  };

  const choose = (action: InputActionId): void => {
    const before = controller.snapshot();
    controller.choose(action);
    const after = controller.snapshot();
    if (before.totalAttempts === after.totalAttempts) return;
    diagnostic({
      level: "info",
      code: after.phase === "complete" ? "LEGACY_TRAVERSAL_COMPLETE" : "LEGACY_TRAVERSAL_CHOICE",
      message: after.phase === "complete"
        ? `${options.title} completed its learning route.`
        : `${options.title} processed a traversal choice.`,
      details: { cartridgeId: options.id, correct: after.lastOutcome === "correct" },
    });
  };

  const updateView = (scene: PhaserSceneLike): void => {
    if (!resources) return;
    const activeResources = resources;
    const { width, height } = dimensions(scene);
    const state = controller.snapshot();
    const choiceWidth = Math.min(220, width * 0.78 / options.actions.length);
    const choiceGap = Math.min(24, width * 0.04);
    const rowWidth = choiceWidth * options.actions.length + choiceGap * (options.actions.length - 1);
    const rowStart = (width - rowWidth) / 2;
    const choiceY = height * 0.62;

    activeResources.graphics.clear();
    const flightArt = Boolean(edition.pack.files["dragon-rider-idle"] || edition.pack.files["dragon-flight-idle"]);
    if (flightArt) {
      if (parallax.sprites.length === 0) {
        parallax = createFlightParallax(scene, edition, width, height);
      }
      if (parallax.sprites.length === 0) {
        activeResources.graphics.fillStyle(0x6eb6e8, 1).fillRect(0, 0, width, height);
      }
      const place = (current: PhaserImageLike | undefined, x: number, y: number, key: string, size: number): PhaserImageLike | undefined => {
        const image = current ?? scene.add?.sprite?.(x, y, key) ?? scene.add?.image?.(x, y, key);
        image?.setOrigin?.(0.5, 0.5);
        image?.setPosition?.(x, y);
        image?.setDisplaySize?.(size, size);
        image?.setDepth?.(6);
        return image;
      };
      if (edition.bindings["prop:gate"]) {
        const gateKey = resolveAssetBinding(edition, "prop:gate").textureKey;
        leftGateSprite = place(leftGateSprite, width * 0.28, height * 0.48, gateKey, 120);
        rightGateSprite = place(rightGateSprite, width * 0.72, height * 0.48, gateKey, 120);
      }
      if (edition.bindings["player:idle"]) {
        const dragonKey = resolveAssetBinding(edition, "player:idle").textureKey;
        dragonSprite = place(dragonSprite, width / 2, height * 0.82, dragonKey, 96);
      }
    } else {
      activeResources.graphics.fillStyle(options.colors.background, 1).fillRect(0, 0, width, height);
      activeResources.graphics.fillStyle(options.colors.panel, 0.9)
        .fillRoundedRect(width * 0.08, height * 0.18, width * 0.84, height * 0.66, 28);
      activeResources.graphics.fillStyle(options.colors.player, 1).fillCircle(width / 2, height * 0.48, 26);
    }
    options.actions.forEach((action, index) => {
      const x = rowStart + index * (choiceWidth + choiceGap);
      if (!flightArt) {
        activeResources.graphics.fillStyle(options.colors.accent, 0.85)
          .fillRoundedRect(x, choiceY, choiceWidth, 82, 14);
        activeResources.graphics.lineStyle(3, 0xffffff, 0.7)
          .strokeRoundedRect(x, choiceY, choiceWidth, 82, 14);
        activeResources.choices[index]?.setText(`${ACTION_LABELS[action]} route`).setPosition(x + 14, choiceY + 28);
      } else {
        const gateX = index === 0 ? width * 0.28 : width * 0.72;
        activeResources.choices[index]?.setText(ACTION_LABELS[action] ?? action).setPosition(gateX - 24, height * 0.62);
      }
    });
    activeResources.title.setText(options.title.toUpperCase()).setPosition(28, 20);
    activeResources.prompt
      .setText(options.inputMode === "vocabulary" ? `Choose the route for: ${state.prompt}` : `Build the sentence for: ${state.prompt}`)
      .setPosition(28, 66);
    activeResources.progress
      .setText(`${composition?.profile === "compact" ? "Compact route" : "Wide route"}  |  Target ${Math.min(state.targetIndex + 1, state.phase === "complete" ? state.targetIndex : Number.MAX_SAFE_INTEGER)}`)
      .setPosition(28, 105);
    activeResources.feedback
      .setText(state.phase === "complete" ? "Route complete!" : state.lastOutcome === "incorrect" ? "That route is blocked. Try again." : options.mechanicInstruction)
      .setPosition(28, height - 66);
    activeResources.instructions.setText(`Keyboard: ${options.keyboardKeys.join(" / ")}  |  Touch or click a route`).setPosition(28, height - 34);
  };

  const cleanup = (): void => {
    controller.destroy();
    destroyFlightParallax(parallax);
    dragonSprite?.destroy();
    leftGateSprite?.destroy();
    rightGateSprite?.destroy();
    dragonSprite = undefined;
    leftGateSprite = undefined;
    rightGateSprite = undefined;
    if (!resources) return;
    resources.graphics.destroy();
    resources.title.destroy();
    resources.prompt.destroy();
    resources.progress.destroy();
    resources.feedback.destroy();
    resources.instructions.destroy();
    for (const choice of resources.choices) choice.destroy();
    resources = undefined;
    previousKeys = new Set<string>();
  };

  const preload = function (this: PhaserSceneLike): void {
    if (!this.load || !flightArt) return;
    preloadFlightParallax(this, edition);
    const keys = ["player:idle", "prop:gate"].filter((key) => Boolean(edition.bindings[key]));
    if (keys.length) preloadAssetBindings(this.load, edition, keys);
  };

  const create = function (this: PhaserSceneLike): void {
    if (!this.add) throw new Error(`${options.title} requires Phaser display services`);
    const style = { fontFamily: "Arial", color: "#ffffff", fontSize: "19px" };
    resources = {
      graphics: this.add.graphics(),
      title: this.add.text(0, 0, "", { ...style, fontSize: "29px", fontStyle: "bold" }),
      prompt: this.add.text(0, 0, "", { ...style, fontSize: "23px", wordWrap: { width: 860 } }),
      progress: this.add.text(0, 0, "", { ...style, fontSize: "16px", color: "#dbeafe" }),
      feedback: this.add.text(0, 0, "", { ...style, fontSize: "17px", color: "#fde68a" }),
      instructions: this.add.text(0, 0, "", { ...style, fontSize: "15px", color: "#cbd5e1" }),
      choices: options.actions.map(() => this.add!.text(0, 0, "", { ...style, fontSize: "17px" })),
    };
    this.events?.once("shutdown", cleanup);
    this.events?.once("destroy", cleanup);
    updateView(this);
  };

  const update = function (this: PhaserSceneLike, _time = 0, delta = 16): void {
    if (!resources) return;
    tickFlightParallax(parallax, delta);
    if ((sessionMode ?? "playing") === "playing") {
      const input = inputController.snapshot();
      const pressed = input.pressed ?? input.keys.filter((key) => !previousKeys.has(key));
      previousKeys = new Set(input.keys);
      for (const code of pressed) {
        const action = normalize({ modality: "keyboard", code })[0]?.action;
        if (action && options.actions.includes(action)) choose(action);
      }
      if (input.pointer.released && !input.pointer.cancelled) {
        choose(actionForPointer(this, input.pointer.x));
      }
    }
    updateView(this);
  };

  return {
    key: options.id,
    preload,
    create,
    update,
    extend: {
      apkCaptureResponsiveState: () => controller.capture(),
      apkRestoreResponsiveState: (state: unknown) => {
        if (typeof state !== "object" || state === null) {
          throw new Error(`${options.title} responsive state is invalid`);
        }
        controller.restore(state as TraversalSnapshot);
      },
      apkRecompose: (next: CartridgeGameConfigContext["composition"]) => {
        composition = next;
      },
    },
  };
}

function createLegacyTraversalCartridge(options: TraversalCartridgeOptions): StandardExperienceCartridge {
  let activeController: TraversalController | undefined;
  const standardExperience = createCartridgeStandardExperience({
    id: options.id,
    title: options.title,
    description: options.description,
    inputMode: options.inputMode,
    objective: options.objective,
    mechanicInstruction: options.mechanicInstruction,
    keyboardKeys: options.keyboardKeys,
    executeTutorialAction: (actionId) => {
      const controller = activeController;
      if (!controller) return;
      const correctAction = controller.snapshot().correctAction;
      const action = actionId === "action:select-correct"
        ? correctAction
        : options.actions.find((candidate) => candidate !== correctAction) ?? correctAction;
      controller.choose(action);
    },
  });

  return {
    manifest: {
      id: options.id,
      title: options.title,
      description: options.description,
      runtimeApiVersion: "1.0.0",
      inputMode: options.inputMode,
      requiredAssetBindings: [options.assetBinding],
      capabilities: [...options.capabilities],
    },
    standardExperience,
    createGameConfig(context: CartridgeGameConfigContext): Readonly<Record<string, unknown>> {
      const parsedInput = options.inputMode === "vocabulary"
        ? vocabularyInputSchema.parse(context.input)
        : sentenceInputSchema.parse(context.input);
       const controller = createTraversalController(options, parsedInput, (result) => context.complete(result, "victory"));
      activeController = controller;
      context.diagnostic({
        level: "debug",
        code: "LEGACY_TRAVERSAL_READY",
        message: `${options.title} is ready.`,
        details: { cartridgeId: options.id, editionId: context.edition.id },
      });
      return {
        width: 960,
        height: 540,
        render: { antialias: false, pixelArt: true },
        scene: createScene(
          options,
          controller,
          context.inputController,
          context.composition,
          context.sessionMode ?? "playing",
          context.diagnostic,
          context.edition,
        ),
      };
    },
  };
}

/**
 * The shared systems that every traversal title uses.
 *
 * The earlier list named Phaser features (arcade physics, camera, timers, tweens)
 * that these titles never call. This list names the APK systems they do call.
 */
const TRAVERSAL_CAPABILITIES: readonly string[] = Object.freeze([
  "capability:input-action-normalization",
  "capability:language-target-progression",
  "capability:nonempty-content-precondition",
  "capability:result-accounting",
  "capability:single-completion-emission",
  "capability:time-and-frame-loop",
]);

const DRAGON_RIDER_OPTIONS: TraversalCartridgeOptions = {
  id: "dragon-rider",
  title: "Dragon Rider",
  description: "Choose translation gates, grow your flight, and face the final guardian.",
  inputMode: "vocabulary",
  objective: "Guide the dragon through each correct translation gate.",
  mechanicInstruction: "Move left or right to choose a translation gate.",
  keyboardKeys: ["A", "Left Arrow", "D", "Right Arrow"],
  keyboardBindings: { ArrowLeft: "move-left", KeyA: "move-left", ArrowRight: "move-right", KeyD: "move-right" },
  actions: ["move-left", "move-right"],
  capabilities: TRAVERSAL_CAPABILITIES,
  assetBinding: "dragon-rider/player-flight",
  colors: { background: 0x10283d, panel: 0x1e4d65, accent: 0xd97706, player: 0x67e8f9 },
};

const SPELLWEAVERS_RUN_OPTIONS: TraversalCartridgeOptions = {
  id: "spellweavers-run",
  title: "Spellweaver's Run",
  description: "Change lanes to collect falling word orbs in sentence order.",
  inputMode: "sentence",
  objective: "Collect each sentence word from the correct lane.",
  mechanicInstruction: "Choose the lane that carries the next sentence word.",
  keyboardKeys: ["A", "Left Arrow", "S", "Down Arrow", "D", "Right Arrow"],
  keyboardBindings: { ArrowLeft: "move-left", KeyA: "move-left", ArrowDown: "confirm", KeyS: "confirm", ArrowRight: "move-right", KeyD: "move-right" },
  actions: ["move-left", "confirm", "move-right"],
  capabilities: TRAVERSAL_CAPABILITIES,
  assetBinding: "spellweavers-run/player-lane",
  colors: { background: 0x10261f, panel: 0x1f4a3d, accent: 0x7c3aed, player: 0xf0abfc },
};

const SHADOW_GATE_DUNGEON_OPTIONS: TraversalCartridgeOptions = {
  id: "shadow-gate-dungeon",
  title: "Shadow Gate Dungeon",
  description: "Explore the dungeon and collect ordered word crystals before opening the gate.",
  inputMode: "sentence",
  objective: "Collect each word crystal in order and reach the unlocked gate.",
  mechanicInstruction: "Move through the dungeon toward the next word crystal.",
  keyboardKeys: ["W", "A", "S", "D", "Arrow keys"],
  keyboardBindings: { ArrowUp: "move-up", KeyW: "move-up", ArrowDown: "move-down", KeyS: "move-down", ArrowLeft: "move-left", KeyA: "move-left", ArrowRight: "move-right", KeyD: "move-right" },
  actions: ["move-left", "move-up", "move-down", "move-right"],
  capabilities: TRAVERSAL_CAPABILITIES,
  assetBinding: "shadow-gate-dungeon/player",
  colors: { background: 0x090b16, panel: 0x181b2d, accent: 0x4338ca, player: 0xa78bfa },
};

const LABYRINTH_GOBLIN_KING_OPTIONS: TraversalCartridgeOptions = {
  id: "labyrinth-goblin-king",
  title: "Labyrinth of the Goblin King",
  description: "Navigate the maze, collect ordered word orbs, and avoid goblin hazards.",
  inputMode: "sentence",
  objective: "Find each sentence word in order while crossing the labyrinth.",
  mechanicInstruction: "Choose the maze direction that contains the next word orb.",
  keyboardKeys: ["W", "A", "S", "D", "Arrow keys"],
  keyboardBindings: { ArrowUp: "move-up", KeyW: "move-up", ArrowDown: "move-down", KeyS: "move-down", ArrowLeft: "move-left", KeyA: "move-left", ArrowRight: "move-right", KeyD: "move-right" },
  actions: ["move-left", "move-up", "move-down", "move-right"],
  capabilities: TRAVERSAL_CAPABILITIES,
  assetBinding: "labyrinth-goblin-king/player",
  colors: { background: 0x17210f, panel: 0x30401f, accent: 0x65a30d, player: 0xfacc15 },
};

const GRIFFIN_RIDERS_ESCAPE_OPTIONS: TraversalCartridgeOptions = {
  id: "griffin-riders-escape",
  title: "Griffin Rider's Escape",
  description: "Switch sky lanes and pass through sentence gates in order.",
  inputMode: "sentence",
  objective: "Fly through each gate that contains the next sentence word.",
  mechanicInstruction: "Move left or right to enter the correct sky gate.",
  keyboardKeys: ["A", "Left Arrow", "D", "Right Arrow"],
  keyboardBindings: { ArrowLeft: "move-left", KeyA: "move-left", ArrowRight: "move-right", KeyD: "move-right" },
  actions: ["move-left", "move-right"],
  capabilities: TRAVERSAL_CAPABILITIES,
  assetBinding: "griffin-riders-escape/player-lane",
  colors: { background: 0x10233f, panel: 0x21466f, accent: 0x0284c7, player: 0xfef3c7 },
};

/**
 * Creates the Dragon Rider vocabulary cartridge.
 * @returns A standard lifecycle cartridge for Dragon Rider.
 */
export function createDragonRiderCartridge(): StandardExperienceCartridge {
  return createLegacyTraversalCartridge(DRAGON_RIDER_OPTIONS);
}

/**
 * Creates the Spellweaver's Run sentence cartridge.
 * @returns A standard lifecycle cartridge for Spellweaver's Run.
 */
export function createSpellweaversRunCartridge(): StandardExperienceCartridge {
  return createLegacyTraversalCartridge(SPELLWEAVERS_RUN_OPTIONS);
}

/**
 * Creates the Shadow Gate Dungeon sentence cartridge.
 * @returns A standard lifecycle cartridge for Shadow Gate Dungeon.
 */
export function createShadowGateDungeonCartridge(): StandardExperienceCartridge {
  return createLegacyTraversalCartridge(SHADOW_GATE_DUNGEON_OPTIONS);
}

/**
 * Creates the Labyrinth of the Goblin King sentence cartridge.
 * @returns A standard lifecycle cartridge for the labyrinth game.
 */
export function createLabyrinthGoblinKingCartridge(): StandardExperienceCartridge {
  return createLegacyTraversalCartridge(LABYRINTH_GOBLIN_KING_OPTIONS);
}

/**
 * Creates the Griffin Rider's Escape sentence cartridge.
 * @returns A standard lifecycle cartridge for Griffin Rider's Escape.
 */
export function createGriffinRidersEscapeCartridge(): StandardExperienceCartridge {
  return createLegacyTraversalCartridge(GRIFFIN_RIDERS_ESCAPE_OPTIONS);
}
