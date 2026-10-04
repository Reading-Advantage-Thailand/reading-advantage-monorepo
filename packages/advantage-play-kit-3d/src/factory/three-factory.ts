/**
 * The three.js game factory (section 2.3 of docs/apk3d-cartridge.md): it checks the device, makes
 * one canvas and one HUD layer in the host's container, builds the game context, lets the
 * cartridge create its game, and maps the APK lifecycle calls onto the stage, the audio, and the
 * game. In the APK it sits beside `createPhaserGameFactory`, chosen by `manifest.renderer`.
 */
import { stopSpeaking } from '../audio/speech.js';
import { HudRoot } from '../hud/root.js';
import { Stage3D } from '../stage/stage.js';
import type { Composition3D, Game3DContext, GateVerdict, MountedThreeGame, ThreeFactoryContext } from './types.js';

/** A structured factory error; `code` is stable for hosts and QC. */
export class Apk3dError extends Error {
  constructor(
    readonly code: 'apk3d/unsupported-device' | 'apk3d/create-failed',
    message: string,
    readonly reason?: string,
  ) {
    super(message);
    this.name = 'Apk3dError';
  }
}

export interface ThreeFactoryOptions {
  /** Site root for model paths. */
  base: string;
  /** The device check; without one the device counts as supported at the `high` tier. */
  gate?: () => GateVerdict;
}

/** Returns the factory; the host calls it once per mount. */
export function createThreeGameFactory(options: ThreeFactoryOptions): (context: ThreeFactoryContext) => Promise<MountedThreeGame> {
  return async (context) => {
    const verdict = options.gate?.() ?? { status: 'ok', tier: 'high' };
    if (verdict.status === 'unsupported') throw new Apk3dError('apk3d/unsupported-device', `This device cannot run ${context.cartridge.manifest.id}.`, verdict.reason);

    const layer = document.createElement('div');
    layer.className = 'apk3d-layer';
    let canvas: HTMLCanvasElement | null = null;
    let stage = context.stage;
    if (stage) stage.clear();
    else {
      canvas = document.createElement('canvas');
      canvas.className = 'apk3d-canvas';
      context.container.append(canvas);
      stage = new Stage3D(canvas, { base: options.base, tier: verdict.status === 'lite' ? 'low' : verdict.tier });
    }
    stage.loader.bind(context.edition);
    context.container.append(layer);
    const hud = new HudRoot(layer, stage);
    let completed = false;
    const game: Game3DContext = {
      stage,
      hud,
      audio: context.audio,
      i18n: context.i18n,
      input: context.input,
      edition: context.edition,
      seed: context.seed,
      sessionMode: context.sessionMode,
      composition: context.composition,
      options: context.options,
      host: context.host,
      complete: (result, outcome, evidence) => {
        if (completed) {
          context.diagnostic({ level: 'warning', code: 'apk3d/second-completion', message: 'The game completed more than once; the later result is ignored.' });
          return;
        }
        completed = true;
        context.complete(result, outcome, evidence);
      },
      diagnostic: context.diagnostic,
    };

    const teardown = (): void => {
      hud.dispose();
      layer.remove();
      if (canvas) {
        stage.dispose();
        canvas.remove();
      } else {
        stage.resume();
        stage.clear();
      }
    };
    let instance;
    try {
      instance = await context.cartridge.createGame(game);
    } catch (err) {
      teardown();
      throw new Apk3dError('apk3d/create-failed', err instanceof Error ? err.message : String(err));
    }
    let destroyed = false;
    return {
      instance,
      stage,
      start: () => instance.start(),
      pause: () => {
        stage.pause();
        context.audio.suspend();
        stopSpeaking();
        instance.pause();
      },
      resume: () => {
        // No catch-up: the stage restarts its clock and the game's loop resets its accumulator.
        stage.resume();
        context.audio.resume();
        instance.resume();
      },
      resize: (width, height) => instance.resize(width, height),
      captureResponsiveState: () => instance.captureResponsiveState(),
      restoreResponsiveState: (state) => instance.restoreResponsiveState(state),
      recompose: (composition: Composition3D) => instance.recompose(composition),
      setMuted: (muted) => {
        context.audio.setMuted(muted);
        if (muted) stopSpeaking();
        instance.setMuted(muted);
      },
      destroy: async () => {
        if (destroyed) return;
        destroyed = true;
        await instance.destroy();
        context.audio.music('none');
        teardown();
      },
    };
  };
}
