import Phaser from "phaser";
import type { BabelArchitectState } from "@/lib/games/babelArchitect";
import {
  BABEL_ARCHITECT_SCENE_KEY,
  BabelArchitectScene,
  type BabelArchitectBridge,
} from "./babelArchitectScene";

/** Handle returned by the adapter so React can push state and tear down Phaser. */
export interface BabelArchitectAdapterHandle {
  /** Pushes the latest serializable state into the scene bridge. */
  setState: (state: BabelArchitectState) => void;
  /** Destroys the Phaser game instance and frees the canvas. */
  destroy: () => void;
}

/** Options for creating a Phaser game bound to a React container. */
export interface BabelArchitectAdapterOptions {
  /** DOM element that Phaser will attach its canvas to. */
  container: HTMLElement;
  /** Game width in device pixels (390 for the portrait reference). */
  width: number;
  /** Game height in device pixels (844 for the portrait reference). */
  height: number;
  /** Initial state the scene should render on first frame. */
  initialState: BabelArchitectState;
  /** React callback invoked when the player taps a block. */
  onPlaceBlock: (blockId: string) => void;
}

/**
 * Creates a Phaser game instance for Babel's Architect and wires a typed
 * bridge between React-owned game state and the dumb render scene.
 *
 * React owns all learning rules, scoring, and completion logic; the Phaser
 * scene only reads the pushed state and emits placement intents.
 *
 * @param options Container, dimensions, initial state, and intent callback.
 * @returns A handle for pushing state and destroying the game on unmount.
 */
export function createBabelArchitectGame(
  options: BabelArchitectAdapterOptions,
): BabelArchitectAdapterHandle {
  const stateRef: { current: BabelArchitectState } = { current: options.initialState };

  const bridge: BabelArchitectBridge = {
    getState: () => stateRef.current,
    onPlaceBlock: options.onPlaceBlock,
  };

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: options.container,
    width: options.width,
    height: options.height,
    backgroundColor: "#0b1020",
    pixelArt: true,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene: [BabelArchitectScene],
  });

  game.scene.start(BABEL_ARCHITECT_SCENE_KEY, bridge);

  return {
    setState: (state: BabelArchitectState) => {
      stateRef.current = state;
    },
    destroy: () => {
      game.destroy(true);
    },
  };
}
