import type {
  APKInputController,
  APKInputSnapshot,
} from "@reading-advantage/advantage-play-kit";
import { gameResultsSchema } from "@reading-advantage/game-contracts";
import type Phaser from "phaser";
import { describe, expect, it, vi } from "vitest";

import { primaryChibiEdition } from "../editions";
import {
  chooseDragonRiderGate,
  createDragonRiderGameConfig,
  createDragonRiderState,
} from "../cartridges/dragon-rider";
import {
  advanceSpellweaversRun,
  collectSpellweaverLane,
  createSpellweaversRunGameConfig,
  createSpellweaversRunState,
  SPELLWEAVER_COLLECTION_START,
} from "../cartridges/spellweavers-run";
import {
  advanceGriffinRiders,
  createGriffinRidersGameConfig,
  createGriffinRidersState,
  GRIFFIN_COLLISION_LINE,
  moveGriffinLane,
} from "../cartridges/griffin-riders-escape";
import {
  collectStormWindow,
  createStormCastleGameConfig,
  createStormCastleState,
  moveStormPlayer,
} from "../cartridges/storm-castle-tower";

type SceneCallbacks = {
  create(this: Phaser.Scene): void;
  update(this: Phaser.Scene, time: number, delta: number): void;
};

const idlePointer: APKInputSnapshot["pointer"] = {
  down: false,
  cancelled: false,
  id: null,
  kind: null,
  startX: 0,
  startY: 0,
  x: 0,
  y: 0,
};

function createMutableInput() {
  let current: APKInputSnapshot = {
    keys: [],
    pointer: idlePointer,
    destroyed: false,
  };
  const controller: APKInputController = {
    snapshot: () => current,
    destroy: vi.fn(),
  };
  return {
    controller,
    setKeys(keys: readonly string[]) {
      current = { keys, pointer: idlePointer, destroyed: false };
    },
  };
}

function createDisplayObject(): Record<string, unknown> {
  const display: Record<string, unknown> = {};
  for (const method of [
    "setDisplaySize",
    "setDepth",
    "setOrigin",
    "setStrokeStyle",
    "setText",
    "setPosition",
    "setVisible",
    "setX",
    "setScale",
    "setFillStyle",
  ]) {
    display[method] = vi.fn(() => display);
  }
  return display;
}

function createSceneHarness(): Phaser.Scene {
  const add = new Proxy({}, {
    get: () => vi.fn(() => createDisplayObject()),
  });
  return {
    add,
    textures: { exists: vi.fn(() => false) },
    physics: { add: { existing: vi.fn() } },
    cameras: { main: { startFollow: vi.fn() } },
    tweens: {
      add: vi.fn((config: { onComplete?: () => void }) => {
        config.onComplete?.();
        return createDisplayObject();
      }),
    },
    time: {
      delayedCall: vi.fn((_delay: number, callback: () => void) => {
        callback();
        return createDisplayObject();
      }),
    },
    game: {
      canvas: {
        getBoundingClientRect: () => ({ left: 0, top: 0, width: 960, height: 540 }),
      },
    },
  } as unknown as Phaser.Scene;
}

function callbacks(config: Phaser.Types.Core.GameConfig): SceneCallbacks {
  return config.scene as unknown as SceneCallbacks;
}

function press(
  sceneCallbacks: SceneCallbacks,
  scene: Phaser.Scene,
  input: ReturnType<typeof createMutableInput>,
  code: string,
): void {
  input.setKeys([code]);
  sceneCallbacks.update.call(scene, 0, 0);
  input.setKeys([]);
  sceneCallbacks.update.call(scene, 0, 0);
}

const laneCode = (lane: number): string => ["ArrowLeft", "ArrowDown", "ArrowRight"][lane]!;

describe("runner wave Phaser scene callbacks", () => {
  it("drives Dragon Rider through input to one boss completion", () => {
    const content = [
      { term: "สวัสดี", translation: "Hello" },
      { term: "ขอบคุณ", translation: "Thank you" },
      { term: "หนังสือ", translation: "Book" },
      { term: "ดวงจันทร์", translation: "Moon" },
    ];
    const input = createMutableInput();
    const complete = vi.fn();
    const sceneCallbacks = callbacks(createDragonRiderGameConfig({
      input: content,
      edition: primaryChibiEdition,
      inputController: input.controller,
      complete,
      diagnostics: vi.fn(),
      seed: 41,
    }));
    const scene = createSceneHarness();
    sceneCallbacks.create.call(scene);
    let reference = createDragonRiderState(content, 41);
    while (reference.phase === "running") {
      const lane = reference.rounds[reference.roundIndex]!.gates
        .find(({ correct }) => correct)!.lane;
      press(sceneCallbacks, scene, input, lane === 0 ? "ArrowLeft" : "ArrowRight");
      reference = chooseDragonRiderGate(reference, lane);
    }
    expect(complete).toHaveBeenCalledOnce();
    expect(gameResultsSchema.parse(complete.mock.calls[0]![0]).totalAttempts).toBe(4);
  });

  it("drives Spellweavers Run through simultaneous terminal keys only once", () => {
    const content = [{ term: "We play", translation: "พวกเราเล่น" }];
    const input = createMutableInput();
    const complete = vi.fn();
    const sceneCallbacks = callbacks(createSpellweaversRunGameConfig({
      input: content,
      edition: primaryChibiEdition,
      inputController: input.controller,
      complete,
      diagnostics: vi.fn(),
      seed: 17,
    }));
    const scene = createSceneHarness();
    sceneCallbacks.create.call(scene);
    let reference = createSpellweaversRunState(content, 17);
    while (!reference.complete) {
      const delta = ((SPELLWEAVER_COLLECTION_START - reference.orb.position) / 110) *
        1_000 / primaryChibiEdition.tuning.speed + 1;
      sceneCallbacks.update.call(scene, 0, delta);
      reference = advanceSpellweaversRun(
        reference,
        delta * primaryChibiEdition.tuning.speed,
      );
      const terminalWord = reference.targetIndex === reference.words.length - 1;
      if (terminalWord) {
        input.setKeys(["ArrowLeft", "ArrowDown", "ArrowRight"]);
        sceneCallbacks.update.call(scene, 0, 0);
        input.setKeys([]);
        sceneCallbacks.update.call(scene, 0, 0);
      } else {
        press(sceneCallbacks, scene, input, laneCode(reference.orb.lane));
      }
      reference = collectSpellweaverLane(reference, reference.orb.lane);
    }
    expect(complete).toHaveBeenCalledOnce();
    expect(gameResultsSchema.parse(complete.mock.calls[0]![0]).correctAnswers).toBe(2);
  });

  it("drives Griffin Riders through lane input and every perspective wave", () => {
    const content = [{ term: "The griffin flies", translation: "กริฟฟินบิน" }];
    const input = createMutableInput();
    const complete = vi.fn();
    const sceneCallbacks = callbacks(createGriffinRidersGameConfig({
      input: content,
      edition: primaryChibiEdition,
      inputController: input.controller,
      complete,
      diagnostics: vi.fn(),
      seed: 29,
    }));
    const scene = createSceneHarness();
    sceneCallbacks.create.call(scene);
    let reference = createGriffinRidersState(content, 29);
    while (!reference.complete) {
      const lane = reference.targets.find(({ kind }) => kind === "correct")!.lane;
      while (reference.playerLane < lane) {
        press(sceneCallbacks, scene, input, "ArrowRight");
        reference = moveGriffinLane(reference, "right");
      }
      while (reference.playerLane > lane) {
        press(sceneCallbacks, scene, input, "ArrowLeft");
        reference = moveGriffinLane(reference, "left");
      }
      const delta = ((GRIFFIN_COLLISION_LINE - 100) / 95) * 1_000 /
        primaryChibiEdition.tuning.speed + 1;
      sceneCallbacks.update.call(scene, 0, delta);
      reference = advanceGriffinRiders(
        reference,
        delta * primaryChibiEdition.tuning.speed,
      );
    }
    expect(complete).toHaveBeenCalledOnce();
    expect(gameResultsSchema.parse(complete.mock.calls[0]![0]).correctAnswers).toBe(3);
  });

  it("drives Storm Castle through D-pad and collect actions to one completion", () => {
    const content = [{ term: "The bird flies", translation: "นกบิน" }];
    const input = createMutableInput();
    const complete = vi.fn();
    const sceneCallbacks = callbacks(createStormCastleGameConfig({
      input: content,
      edition: primaryChibiEdition,
      inputController: input.controller,
      complete,
      diagnostics: vi.fn(),
      seed: 37,
    }));
    const scene = createSceneHarness();
    sceneCallbacks.create.call(scene);
    let reference = createStormCastleState(content, 37);
    while (!reference.complete) {
      const target = reference.windows.find(
        ({ wordIndex }) => wordIndex === reference.targetIndex,
      )!;
      while (reference.player.column < target.column) {
        press(sceneCallbacks, scene, input, "ArrowRight");
        reference = moveStormPlayer(reference, "right");
      }
      while (reference.player.column > target.column) {
        press(sceneCallbacks, scene, input, "ArrowLeft");
        reference = moveStormPlayer(reference, "left");
      }
      while (reference.player.row < target.row) {
        press(sceneCallbacks, scene, input, "ArrowUp");
        reference = moveStormPlayer(reference, "up");
      }
      press(sceneCallbacks, scene, input, "Space");
      reference = collectStormWindow(reference);
    }
    expect(complete).toHaveBeenCalledOnce();
    expect(gameResultsSchema.parse(complete.mock.calls[0]![0]).correctAnswers).toBe(3);
  });
});
