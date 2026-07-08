import { createBabelArchitectGame } from "./babelArchitectAdapter";
import type { BabelArchitectState } from "@/lib/games/babelArchitect";
import { BABEL_ARCHITECT_SCENE_KEY } from "./babelArchitectScene";

jest.mock("phaser", () => {
  const gameDestroy = jest.fn();
  const sceneStart = jest.fn();
  return {
    __esModule: true,
    default: {
      Game: jest.fn(() => ({
        destroy: gameDestroy,
        scene: { start: sceneStart },
      })),
      AUTO: 0,
      Scale: { FIT: 5, CENTER_BOTH: 2 },
    },
    // Expose spies for assertions across the mocked default export.
    __gameDestroy: gameDestroy,
    __sceneStart: sceneStart,
  };
});

jest.mock("./babelArchitectScene", () => ({
  BabelArchitectScene: class MockBabelArchitectScene {},
  BABEL_ARCHITECT_SCENE_KEY: "babel-architect",
}));

const Phaser = jest.requireMock("phaser") as typeof import("phaser") & {
  __gameDestroy: jest.Mock;
  __sceneStart: jest.Mock;
};

const initialState: BabelArchitectState = {
  sentences: [{ term: "Build the tower", translation: "สร้างหอคอย" }],
  currentSentenceIndex: 0,
  targetTranslation: "สร้างหอคอย",
  blocks: [{ id: "sentence-0-block-0", word: "Build", order: 0, lane: 0, y: -80 }],
  placedBlocks: [],
  progressIndex: 0,
  phase: "playing",
  difficulty: "normal",
  stability: 100,
  errors: 0,
  score: 0,
  correctAnswers: 0,
  totalAttempts: 0,
  elapsedMs: 0,
  startedAtMs: 1_000,
  feedback: null,
};

function makeContainer(): HTMLElement {
  const el = document.createElement("div");
  document.body.appendChild(el);
  return el;
}

describe("babelArchitectAdapter", () => {
  beforeEach(() => {
    Phaser.__gameDestroy.mockClear();
    Phaser.__sceneStart.mockClear();
    (Phaser.default.Game as unknown as jest.Mock).mockClear();
  });

  it("creates a Phaser game bound to the container with portrait dimensions", () => {
    const container = makeContainer();
    createBabelArchitectGame({
      container,
      width: 390,
      height: 844,
      initialState,
      onPlaceBlock: jest.fn(),
    });

    expect(Phaser.default.Game).toHaveBeenCalledTimes(1);
    const config = (Phaser.default.Game as unknown as jest.Mock).mock.calls[0][0];
    expect(config.parent).toBe(container);
    expect(config.width).toBe(390);
    expect(config.height).toBe(844);
  });

  it("starts the babel architect scene with a state/intent bridge", () => {
    const container = makeContainer();
    createBabelArchitectGame({
      container,
      width: 390,
      height: 844,
      initialState,
      onPlaceBlock: jest.fn(),
    });

    expect(Phaser.__sceneStart).toHaveBeenCalledTimes(1);
    const [sceneKey, bridge] = Phaser.__sceneStart.mock.calls[0];
    expect(sceneKey).toBe(BABEL_ARCHITECT_SCENE_KEY);
    expect(typeof bridge.getState).toBe("function");
    expect(typeof bridge.onPlaceBlock).toBe("function");
  });

  it("setState pushes fresh state into the bridge consumed by the scene", () => {
    const container = makeContainer();
    const handle = createBabelArchitectGame({
      container,
      width: 390,
      height: 844,
      initialState,
      onPlaceBlock: jest.fn(),
    });

    const bridge = Phaser.__sceneStart.mock.calls[0][1];
    expect(bridge.getState()).toBe(initialState);

    const next: BabelArchitectState = { ...initialState, progressIndex: 1, score: 180 };
    handle.setState(next);
    expect(bridge.getState()).toBe(next);
  });

  it("forwards player block placement intents through the bridge", () => {
    const container = makeContainer();
    const onPlaceBlock = jest.fn();
    createBabelArchitectGame({
      container,
      width: 390,
      height: 844,
      initialState,
      onPlaceBlock,
    });

    const bridge = Phaser.__sceneStart.mock.calls[0][1];
    bridge.onPlaceBlock("sentence-0-block-0");

    expect(onPlaceBlock).toHaveBeenCalledWith("sentence-0-block-0");
  });

  it("destroys the Phaser game on teardown", () => {
    const container = makeContainer();
    const handle = createBabelArchitectGame({
      container,
      width: 390,
      height: 844,
      initialState,
      onPlaceBlock: jest.fn(),
    });

    handle.destroy();
    expect(Phaser.__gameDestroy).toHaveBeenCalledWith(true);
  });
});
