import type { APKGameInstance, GameFactory } from "./types.js";

interface PhaserSceneLike {
  scene?: {
    pause?(): void;
    resume?(): void;
  };
  apkCaptureResponsiveState?(): unknown;
  apkRestoreResponsiveState?(state: unknown): void;
  apkRecompose?(composition: import("../responsive/responsive-composition.js").SupportedResponsiveComposition): void;
}

interface PhaserRendererLike {
  preRender(): void;
  postRender(): void;
}

interface PhaserGameLike {
  destroy(removeCanvas?: boolean): void;
  events?: { once(event: string, listener: () => void): void };
  scene?: {
    getScenes(activeOnly?: boolean): PhaserSceneLike[];
    render?(renderer: PhaserRendererLike): void;
  };
  renderer?: PhaserRendererLike;
  sound?: { mute: boolean };
  scale?: { refresh?(): void; setGameSize?(width: number, height: number): void };
  pause?(): void;
  resume?(): void;
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
      sessionMode: context.sessionMode,
      ...(context.listening ? { listening: context.listening } : {}),
      ...(context.answerAudio ? { answerAudio: context.answerAudio } : {}),
      ...(context.composition ? { composition: context.composition } : {}),
      ...(context.seed === undefined ? {} : { seed: context.seed }),
    });
    const scene = cartridgeConfig.scene;
    const game = new Phaser.Game({
      type: Phaser.AUTO,
      backgroundColor: "#101827",
      scale: {
        mode: Phaser.Scale?.FIT,
        autoCenter: Phaser.Scale?.CENTER_BOTH,
      },
      ...cartridgeConfig,
      scene,
      ...(context.composition ? {
        width: context.composition.safeRect.width,
        height: context.composition.safeRect.height,
      } : {}),
      parent: context.container,
    });

    const pausedScenes = new Set<PhaserSceneLike>();
    let paused = false;
    const currentScenes = (): PhaserSceneLike[] => [
      ...new Set([...(game.scene?.getScenes(true) ?? []), ...pausedScenes]),
    ];

    const responsiveStateByScene = new WeakMap<PhaserSceneLike, unknown>();
    let destroyPromise: Promise<void> | undefined;

    return {
      pause: () => {
        paused = true;
        game.pause?.();
        for (const scene of game.scene?.getScenes(true) ?? []) {
          if (pausedScenes.has(scene)) continue;
          pausedScenes.add(scene);
          scene.scene?.pause?.();
        }
      },
      resume: () => {
        paused = false;
        for (const scene of pausedScenes) scene.scene?.resume?.();
        pausedScenes.clear();
        game.resume?.();
      },
      resize: () => game.scale?.refresh?.(),
      captureResponsiveState: () => {
        const scenes = currentScenes();
        for (const scene of scenes) {
          const state = scene.apkCaptureResponsiveState?.();
          responsiveStateByScene.set(scene, state);
        }
        return scenes;
      },
      restoreResponsiveState: (snapshot) => {
        if (!Array.isArray(snapshot)) throw new Error("Phaser responsive state snapshot is invalid");
        for (const scene of snapshot as PhaserSceneLike[]) {
          scene.apkRestoreResponsiveState?.(responsiveStateByScene.get(scene));
          responsiveStateByScene.delete(scene);
        }
      },
      recompose: (composition) => {
        game.scale?.setGameSize?.(composition.safeRect.width, composition.safeRect.height);
        for (const scene of currentScenes()) scene.apkRecompose?.(composition);
        game.scale?.refresh?.();
        // Redraw the resized canvas without advancing paused simulation or audio.
        if (paused && game.renderer && game.scene?.render) {
          game.renderer.preRender();
          game.scene.render(game.renderer);
          game.renderer.postRender();
        }
      },
      setMuted: (muted) => {
        if (game.sound) game.sound.mute = muted;
      },
      destroy: () => {
        if (destroyPromise) return destroyPromise;
        pausedScenes.clear();
        destroyPromise = new Promise<void>((resolve, reject) => {
          if (!game.events) {
            game.destroy(true);
            resolve();
            return;
          }
          game.events.once("destroy", resolve);
          try {
            game.destroy(true);
          } catch (error) {
            reject(error);
          }
        });
        return destroyPromise;
      },
    };
  };
}
