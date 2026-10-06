// @vitest-environment jsdom
/** The story game host hands a new answer audio controller to each mount and passes its evidence on (the mount itself is stubbed). */
import { describe, expect, it, vi } from 'vitest';
import type { AnswerChoiceAudioController } from '../audio/answer-choice.js';
import type { Cartridge, MountOptions } from '../factory/index.js';
import type { ReadToSelectAudioEvidence, StoryGameEvidence } from '../contracts/index.js';

const mounts: MountOptions[] = [];

vi.mock('../factory/index.js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../factory/index.js')>()),
  createCartridgeMounter: () => async (options: MountOptions) => {
    mounts.push(options);
    return { start: () => undefined, destroy: async () => undefined, recompose: () => undefined, setMuted: () => undefined };
  },
  createThreeGameFactory: () => ({}),
  createPhaserGameFactory: () => ({}),
  selectRenderer: () => ({ renderer: 'three' }),
}));
vi.mock('../stage/index.js', () => ({ Stage3D: class { dispose(): void {} } }));
vi.mock('../stage/loader.js', () => ({ fetchModelPack: async () => { throw new Error('no packs in tests'); } }));
vi.mock('../device/gate.js', () => ({ checkDevice: () => ({ status: 'ok', tier: 'high' }) }));

const { startStoryGame } = await import('../host/story-game.js');

const cartridge = {
  manifest: { id: 'hero-vs-zombie', briefingKey: 'demo.briefing', inputMode: 'vocabulary', device: {}, renderers: ['three'], packs: [], requiredModelBindings: [], requiredAssetBindings: [] },
  strings: {},
  briefing: () => ({ title: 'Demo', objective: 'Play.', instructions: [], controls: [], learningPreview: { heading: 'Words' } }),
} as unknown as Cartridge;

const result = { accuracy: 1, xp: 10, score: 10, correctAnswers: 2, totalAttempts: 2 };
const evidence = { schemaVersion: 1, kind: 'story-game', gameId: 'hero-vs-zombie', inputId: 'vocabulary', level: 'A1', seed: 7, durationMs: 1000, items: [], practice: [] } as unknown as StoryGameEvidence;
const answerEvidence = { schemaVersion: 1, itemCount: 2 } as unknown as ReadToSelectAudioEvidence;

describe('startStoryGame with answer audio', () => {
  it('mounts the run with a controller from answerAudio and passes the answer evidence to onComplete', async () => {
    Object.defineProperty(window, 'matchMedia', { writable: true, value: () => ({ matches: false, addEventListener: () => undefined, removeEventListener: () => undefined }) });
    const container = document.createElement('div');
    document.body.append(container);
    const controller = { id: 'run' } as unknown as AnswerChoiceAudioController;
    const answerAudio = vi.fn(() => controller);
    const onComplete = vi.fn();
    const session = startStoryGame({
      container, cartridge, input: [{ term: 'apple', translation: 'แอปเปิล' }], assetBase: '/', catalogs: [], skipBriefing: true,
      answerAudio, onComplete, onExit: () => undefined,
    });
    await vi.waitFor(() => expect(mounts).toHaveLength(1));

    expect(answerAudio).toHaveBeenCalledOnce();
    expect(mounts[0]!.answerAudio).toBe(controller);
    mounts[0]!.complete(result, 'victory', evidence, answerEvidence);
    expect(onComplete).toHaveBeenCalledWith(result, 'victory', evidence, answerEvidence);
    await session.destroy();
  });

  it('briefs an audio run in the answer audio mode', async () => {
    const briefing = vi.spyOn(cartridge, 'briefing');
    const container = document.createElement('div');
    document.body.append(container);
    const session = startStoryGame({
      container, cartridge, input: [{ term: 'apple', translation: 'แอปเปิล' }], assetBase: '/', catalogs: [],
      answerAudio: () => ({}) as unknown as AnswerChoiceAudioController, onComplete: () => undefined, onExit: () => undefined,
    });
    expect(briefing).toHaveBeenCalledWith(expect.anything(), expect.anything(), { answerAudio: true });
    await session.destroy();
  });
});
