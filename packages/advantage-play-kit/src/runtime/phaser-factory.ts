import type { APKGameInstance, GameFactory } from "./types.js";

interface PhaserSceneLike {
  scene?: {
    pause?(): void;
    resume?(): void;
  };
}

interface PhaserGameLike {
  destroy(removeCanvas?: boolean): void;
  scene?: { getScenes(activeOnly?: boolean): PhaserSceneLike[] };
  sound?: { mute: boolean };
  scale?: { refresh?(): void };
}

interface PhaserModuleLike {
  AUTO: unknown;
  Scale?: { FIT?: unknown; CENTER_BOTH?: unknown };
  Game: new (config: Readonly<Record<string, unknown>>) => PhaserGameLike;
}

/** Lazy Phaser module loader used to keep it out of server imports. */
export type PhaserModuleLoader = () => Promise<PhaserModuleLike>;

const loadInstalledPhaser: PhaserModuleLoader = async () =>
  (await import("phaser")) as unknown as PhaserModuleLike;

/**
 * Creates the production renderer factory while retaining an injectable module seam.
 * @param loadPhaser Lazy module loader, normally the installed Phaser 4 package.
 * @returns A renderer factory compatible with mountCartridge.
 */
export function createPhaserGameFactory(
  loadPhaser: PhaserModuleLoader = loadInstalledPhaser,
): GameFactory {
  return async (context): Promise<APKGameInstance> => {
    const Phaser = await loadPhaser();
    const cartridgeConfig = context.cartridge.createGameConfig({
      input: context.input,
      edition: context.edition,
      complete: context.complete,
      diagnostic: context.diagnostic,
      inputController: context.inputController,
      ...(context.seed === undefined ? {} : { seed: context.seed }),
    });
    const game = new Phaser.Game({
      type: Phaser.AUTO,
      backgroundColor: "#101827",
      scale: {
        mode: Phaser.Scale?.FIT,
        autoCenter: Phaser.Scale?.CENTER_BOTH,
      },
      ...cartridgeConfig,
      parent: context.container,
    });

    const forEachActiveScene = (action: "pause" | "resume") => {
      for (const scene of game.scene?.getScenes(true) ?? []) {
        scene.scene?.[action]?.();
      }
    };

    return {
      pause: () => forEachActiveScene("pause"),
      resume: () => forEachActiveScene("resume"),
      resize: () => game.scale?.refresh?.(),
      setMuted: (muted) => {
        if (game.sound) game.sound.mute = muted;
      },
      destroy: () => game.destroy(true),
    };
  };
}
