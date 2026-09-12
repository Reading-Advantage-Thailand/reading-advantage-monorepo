import { describe, expect, it, vi } from "vitest";

import {
  ListeningAudioControllerError,
  createAnswerChoiceAudioController,
  type AnswerChoiceAudioControllerOptions,
  type AudioClipPlaybackPort,
  type AudioClipPreparationPort,
  type ListeningAudioClipReference,
} from "../index.js";

type PreparedClip = { itemPosition: number };

const session = {
  modality: "read-to-select-audio",
  promptLocale: "th-TH",
  answerLocale: "en-US",
  promptField: "translation",
  answerField: "term",
  scored: true,
} as const;

const clips: readonly ListeningAudioClipReference[] = [
  { itemPosition: 0, url: "/audio/river.mp3", mediaType: "audio/mpeg" },
  { itemPosition: 1, url: "/audio/forest.mp3", mediaType: "audio/mpeg" },
  { itemPosition: 2, url: "/audio/bridge.mp3", mediaType: "audio/mpeg" },
  { itemPosition: 3, url: "/audio/lantern.mp3", mediaType: "audio/mpeg" },
];

function createPorts(overrides: {
  prepare?: AudioClipPreparationPort<PreparedClip>["prepare"];
  play?: AudioClipPlaybackPort<PreparedClip>["play"];
} = {}) {
  const preparation: AudioClipPreparationPort<PreparedClip> = {
    prepare: vi.fn(overrides.prepare ?? (async (reference) => ({ itemPosition: reference.itemPosition }))),
    release: vi.fn(),
  };
  const playback: AudioClipPlaybackPort<PreparedClip> = {
    play: vi.fn(overrides.play ?? (async () => undefined)),
  };
  return { preparation, playback };
}

function createController(
  ports = createPorts(),
  overrides: Partial<AnswerChoiceAudioControllerOptions<PreparedClip>> = {},
) {
  const restore = vi.fn();
  const duck = vi.fn(() => restore);
  const controller = createAnswerChoiceAudioController({
    session,
    clips,
    preparationTimeoutMs: 1_000,
    maxReplaysPerChoice: 2,
    ...ports,
    ducking: { duck },
    ...overrides,
  });
  return { controller, duck, restore, ...ports };
}

describe("answer choice audio controller", () => {
  it("publishes idle states for every stable answer choice", () => {
    const { controller } = createController();
    const next = controller.setQuestion(0, [2, 0, 3, 1]);

    expect(next.choices.map((choice) => choice.clipItemPosition)).toEqual([0, 1, 2, 3]);
    expect(next.choices.every((choice) => choice.status === "idle" && choice.playCount === 0)).toBe(true);
  });

  it("requires the ended event before a deliberate submission", async () => {
    let finish: (() => void) | undefined;
    const ports = createPorts({ play: () => new Promise((resolve) => { finish = resolve; }) });
    const { controller, duck, restore } = createController(ports);
    const statuses: string[] = [];
    controller.subscribe((next) => statuses.push(next.status));
    controller.setQuestion(0);

    const playback = controller.playChoice(0, 0);
    await vi.waitFor(() => expect(controller.getChoiceSnapshot(0, 0)).toMatchObject({
      status: "playing",
      playCount: 1,
      replayCount: 0,
      canConfirm: false,
    }));
    expect(() => controller.confirmChoice(0, 0)).toThrow(/completed/iu);
    finish?.();
    await playback;

    expect(controller.canConfirmChoice(0, 0)).toBe(true);
    expect(controller.confirmChoice(0, 0)).toEqual({
      questionPosition: 0,
      promptItemPosition: 0,
      clipItemPosition: 0,
      attemptIndex: 0,
      completedQuestion: true,
    });
    expect(controller.canConfirmChoice(0, 0)).toBe(false);
    expect(duck).toHaveBeenCalledOnce();
    expect(restore).toHaveBeenCalledOnce();
    expect(statuses).toEqual(expect.arrayContaining(["loading", "ready", "playing", "completed"]));
    expect(controller.getEvidence().questions).toEqual([{
      questionPosition: 0,
      promptItemPosition: 0,
      selectionAttempts: [{
        attemptIndex: 0,
        clipItemPosition: 0,
        playbackResult: "completed",
        submitted: true,
        completedQuestion: true,
      }],
    }]);
  });

  it("records a wrong submission before the correct submission", async () => {
    const { controller } = createController();
    await controller.playChoice(1, 2);
    expect(controller.confirmChoice(1, 2).completedQuestion).toBe(false);
    await controller.playChoice(1, 1);
    expect(controller.confirmChoice(1, 1).completedQuestion).toBe(true);
    await expect(controller.playChoice(1, 3)).rejects.toThrow(/completed.*question/iu);

    expect(controller.getEvidence().questions[0]?.selectionAttempts).toEqual([
      expect.objectContaining({ attemptIndex: 0, clipItemPosition: 2, submitted: true, completedQuestion: false }),
      expect.objectContaining({ attemptIndex: 1, clipItemPosition: 1, submitted: true, completedQuestion: true }),
    ]);
  });

  it("cancels stale playback when the question changes and ignores a late end", async () => {
    let finish: (() => void) | undefined;
    const ports = createPorts({ play: () => new Promise((resolve) => { finish = resolve; }) });
    const { controller, restore } = createController(ports);
    const playback = controller.playChoice(0, 1);
    await vi.waitFor(() => expect(controller.getSnapshot().status).toBe("playing"));

    controller.setQuestion(2);
    expect(controller.getSnapshot()).toMatchObject({ status: "idle", questionPosition: 2 });
    finish?.();
    await playback;

    expect(controller.canConfirmChoice(0, 1)).toBe(false);
    expect(controller.getEvidence().questions).toEqual([{
      questionPosition: 0,
      promptItemPosition: 0,
      selectionAttempts: [expect.objectContaining({ playbackResult: "cancelled", submitted: false })],
    }]);
    expect(restore).toHaveBeenCalledOnce();
  });

  it("releases a prepared clip that arrives after cancellation", async () => {
    let finishPreparation: ((clip: PreparedClip) => void) | undefined;
    const ports = createPorts({
      prepare: () => new Promise((resolve) => { finishPreparation = resolve; }),
    });
    const { controller, preparation } = createController(ports);
    const playback = controller.playChoice(0, 1);
    await vi.waitFor(() => expect(controller.getSnapshot().status).toBe("loading"));
    controller.cancel();
    finishPreparation?.({ itemPosition: 1 });
    await playback;

    expect(preparation.release).toHaveBeenCalledWith({ itemPosition: 1 });
    expect(controller.canConfirmChoice(0, 1)).toBe(false);
    expect(controller.getEvidence().questions[0]?.selectionAttempts).toEqual([
      expect.objectContaining({ playbackResult: "cancelled", submitted: false }),
    ]);
  });

  it("records failures and never enables submission", async () => {
    const ports = createPorts({
      prepare: async () => {
        throw new ListeningAudioControllerError("load-failed", "Clip failed to load");
      },
    });
    const { controller } = createController(ports);

    await expect(controller.playChoice(0, 3)).rejects.toMatchObject({ code: "load-failed" });
    expect(controller.canConfirmChoice(0, 3)).toBe(false);
    expect(controller.getChoiceSnapshot(0, 3)).toMatchObject({
      status: "failed",
      failure: { code: "load-failed" },
    });
    expect(controller.getEvidence()).toMatchObject({
      questions: [{ selectionAttempts: [expect.objectContaining({ playbackResult: "failed" })] }],
      audioFailures: [{ questionPosition: 0, clipItemPosition: 3, code: "load-failed" }],
    });
  });

  it("limits replays per question and clip pair", async () => {
    const { controller } = createController();
    await controller.playChoice(0, 1);
    await controller.playChoice(0, 1);
    await controller.playChoice(0, 1);

    await expect(controller.playChoice(0, 1)).rejects.toMatchObject({ code: "replay-limit" });
    expect(controller.getChoiceSnapshot(0, 1)).toMatchObject({ playCount: 3, replayCount: 2 });
    expect(controller.getEvidence().replayCounts).toEqual([
      { questionPosition: 0, clipItemPosition: 1, count: 2 },
    ]);
  });

  it("publishes pair states and releases every prepared clip on destroy", async () => {
    const { controller, preparation } = createController();
    const listener = vi.fn();
    controller.subscribe(() => { throw new Error("observer failed"); });
    const unsubscribe = controller.subscribe(listener);
    await controller.playChoice(3, 0);
    await controller.playChoice(3, 2);
    unsubscribe();
    controller.destroy();

    expect(listener).toHaveBeenCalledWith(expect.objectContaining({
      questionPosition: 3,
      choices: expect.arrayContaining([
        expect.objectContaining({ clipItemPosition: 0, status: "completed" }),
        expect.objectContaining({ clipItemPosition: 2, status: "completed" }),
      ]),
    }));
    expect(preparation.release).toHaveBeenCalledTimes(2);
    expect(controller.getSnapshot().status).toBe("destroyed");
  });
});
