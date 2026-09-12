import { describe, expect, it, vi } from "vitest";

import {
  ListeningAudioControllerError,
  createListeningAudioController,
  type AudioClipPlaybackPort,
  type AudioClipPreparationPort,
  type ListeningAudioClipReference,
  type ListeningAudioController,
} from "../index.js";

type PreparedClip = { itemPosition: number };

const session = {
  modality: "listen-to-select",
  sourceLocale: "en-US",
  targetLocale: "th",
  scored: false,
  targetLocaleFallback: "allow-explicit",
} as const;

const clips: readonly ListeningAudioClipReference[] = [
  { itemPosition: 0, url: "/audio/0.mp3", mediaType: "audio/mpeg" },
  { itemPosition: 1, url: "/audio/1.mp3", mediaType: "audio/mpeg" },
  { itemPosition: 2, url: "/audio/2.mp3", mediaType: "audio/mpeg" },
];

function createPorts(overrides?: {
  prepare?: AudioClipPreparationPort<PreparedClip>["prepare"];
  play?: AudioClipPlaybackPort<PreparedClip>["play"];
}) {
  const preparation: AudioClipPreparationPort<PreparedClip> = {
    prepare: vi.fn(overrides?.prepare ?? (async (reference) => ({
      itemPosition: reference.itemPosition,
    }))),
    release: vi.fn(),
  };
  const playback: AudioClipPlaybackPort<PreparedClip> = {
    play: vi.fn(overrides?.play ?? (async () => undefined)),
  };
  return { preparation, playback };
}

describe("listening audio playback controller", () => {
  it("prepares only the active clip and the bounded lookahead", async () => {
    const ports = createPorts();
    const controller = createListeningAudioController({
      session,
      clips,
      preloadAhead: 1,
      preparationTimeoutMs: 1_000,
      ...ports,
      ducking: { duck: vi.fn(() => vi.fn()) },
    });

    await controller.prepare(0);

    expect(ports.preparation.prepare).toHaveBeenCalledTimes(2);
    expect(ports.preparation.prepare).toHaveBeenNthCalledWith(
      1,
      clips[0],
      expect.any(AbortSignal),
    );
    expect(ports.preparation.prepare).toHaveBeenNthCalledWith(
      2,
      clips[1],
      expect.any(AbortSignal),
    );
    expect(controller.getSnapshot()).toMatchObject({
      status: "ready",
      activeItemPosition: 0,
    });
  });

  it("marks the active clip ready without waiting for speculative preload", async () => {
    let resolveFuture: ((clip: PreparedClip) => void) | undefined;
    const ports = createPorts({
      prepare: (reference) => reference.itemPosition === 0
        ? Promise.resolve({ itemPosition: 0 })
        : new Promise((resolve) => {
          resolveFuture = resolve;
        }),
    });
    const controller = createListeningAudioController({
      session,
      clips,
      preloadAhead: 1,
      preparationTimeoutMs: 1_000,
      ...ports,
      ducking: { duck: vi.fn(() => vi.fn()) },
    });

    await expect(controller.prepare(0)).resolves.toMatchObject({
      status: "ready",
      activeItemPosition: 0,
    });
    expect(resolveFuture).toBeDefined();
  });

  it("reuses a prepared lookahead clip and evicts the prior window", async () => {
    const ports = createPorts();
    const controller = createListeningAudioController({
      session,
      clips,
      preloadAhead: 1,
      preparationTimeoutMs: 1_000,
      ...ports,
      ducking: { duck: vi.fn(() => vi.fn()) },
    });

    await controller.prepare(0);
    await vi.waitFor(() => expect(ports.preparation.prepare).toHaveBeenCalledTimes(2));
    await new Promise((resolve) => setTimeout(resolve, 0));
    await controller.prepare(1);

    expect(ports.preparation.prepare).toHaveBeenCalledTimes(3);
    expect(ports.preparation.release).toHaveBeenCalledWith({ itemPosition: 0 });
  });

  it("does not fail the active item when speculative preload fails", async () => {
    const ports = createPorts({
      prepare: async (reference) => {
        if (reference.itemPosition === 1) throw new Error("future failed");
        return { itemPosition: reference.itemPosition };
      },
    });
    const controller = createListeningAudioController({
      session,
      clips,
      preloadAhead: 1,
      preparationTimeoutMs: 1_000,
      ...ports,
      ducking: { duck: vi.fn(() => vi.fn()) },
    });

    await expect(controller.prepare(0)).resolves.toMatchObject({ status: "ready" });
    await vi.waitFor(() => expect(ports.preparation.prepare).toHaveBeenCalledTimes(2));
    expect(controller.getSnapshot()).toMatchObject({ status: "ready" });
    expect(controller.getEvidence().audioFailures).toEqual([]);
  });

  it("records a failed load with an explicit code", async () => {
    const ports = createPorts({
      prepare: async () => {
        throw new ListeningAudioControllerError("load-failed", "Audio failed to load");
      },
    });
    const controller = createListeningAudioController({
      session,
      clips,
      preloadAhead: 0,
      preparationTimeoutMs: 1_000,
      ...ports,
      ducking: { duck: vi.fn(() => vi.fn()) },
    });

    await expect(controller.prepare(0)).rejects.toMatchObject({ code: "load-failed" });
    expect(controller.getSnapshot()).toMatchObject({
      status: "failed",
      failure: { code: "load-failed", itemPosition: 0 },
    });
    expect(controller.getEvidence().audioFailures).toEqual([
      { itemPosition: 0, code: "load-failed" },
    ]);
  });

  it("fails a preparation that exceeds the bounded timeout", async () => {
    const ports = createPorts({
      prepare: () => new Promise(() => undefined),
    });
    const controller = createListeningAudioController({
      session,
      clips,
      preloadAhead: 0,
      preparationTimeoutMs: 100,
      ...ports,
      ducking: { duck: vi.fn(() => vi.fn()) },
    });

    await expect(controller.prepare(0)).rejects.toMatchObject({
      code: "load-failed",
      message: expect.stringMatching(/timed out/i),
    });
    expect(controller.getSnapshot()).toMatchObject({ status: "failed" });
  });

  it("releases a clip that resolves after its preparation timeout", async () => {
    let resolvePreparation: ((clip: PreparedClip) => void) | undefined;
    const ports = createPorts({
      prepare: () => new Promise((resolve) => {
        resolvePreparation = resolve;
      }),
    });
    const controller = createListeningAudioController({
      session,
      clips,
      preloadAhead: 0,
      preparationTimeoutMs: 100,
      ...ports,
      ducking: { duck: vi.fn(() => vi.fn()) },
    });

    await expect(controller.prepare(0)).rejects.toMatchObject({ code: "load-failed" });
    resolvePreparation?.({ itemPosition: 0 });
    await vi.waitFor(() => {
      expect(ports.preparation.release).toHaveBeenCalledWith({ itemPosition: 0 });
    });
  });

  it("ignores and releases a stale preparation result", async () => {
    const pending = new Map<number, (clip: PreparedClip) => void>();
    const ports = createPorts({
      prepare: (reference) => new Promise((resolve) => {
        pending.set(reference.itemPosition, resolve);
      }),
    });
    const controller = createListeningAudioController({
      session,
      clips,
      preloadAhead: 0,
      preparationTimeoutMs: 5_000,
      ...ports,
      ducking: { duck: vi.fn(() => vi.fn()) },
    });

    const first = controller.prepare(0);
    const second = controller.prepare(1);
    pending.get(0)?.({ itemPosition: 0 });
    await first;

    expect(ports.preparation.release).toHaveBeenCalledWith({ itemPosition: 0 });
    expect(controller.getSnapshot()).toMatchObject({
      status: "loading",
      activeItemPosition: 1,
    });

    pending.get(1)?.({ itemPosition: 1 });
    await second;
    expect(controller.getSnapshot()).toMatchObject({
      status: "ready",
      activeItemPosition: 1,
    });
  });

  it("ducks during playback and counts only a successful replay", async () => {
    const restore = vi.fn();
    const duck = vi.fn(() => restore);
    let playCalls = 0;
    const ports = createPorts({
      play: async () => {
        playCalls += 1;
        if (playCalls === 2) {
          throw new ListeningAudioControllerError(
            "playback-failed",
            "Replay failed",
          );
        }
      },
    });
    const controller = createListeningAudioController({
      session,
      clips,
      preloadAhead: 0,
      preparationTimeoutMs: 1_000,
      ...ports,
      ducking: { duck },
    });

    await controller.play(0);
    await expect(controller.replay(0)).rejects.toMatchObject({
      code: "playback-failed",
    });

    expect(duck).toHaveBeenCalledTimes(2);
    expect(restore).toHaveBeenCalledTimes(2);
    expect(controller.getEvidence().replayCounts).toEqual([]);
    expect(controller.getEvidence().audioFailures).toEqual([
      { itemPosition: 0, code: "playback-failed" },
    ]);

    await controller.replay(0);
    expect(controller.getEvidence().replayCounts).toEqual([
      { itemPosition: 0, count: 1 },
    ]);
    expect(controller.getEvidence().audioFailures).toEqual([
      { itemPosition: 0, code: "playback-failed" },
    ]);
  });

  it("fails playback that exceeds the bounded timeout", async () => {
    const ports = createPorts({
      play: (_clip, signal) => new Promise((_resolve, reject) => {
        signal.addEventListener("abort", () => reject(
          new ListeningAudioControllerError("cancelled", "Playback cancelled"),
        ), { once: true });
      }),
    });
    const controller = createListeningAudioController({
      session,
      clips,
      preloadAhead: 0,
      preparationTimeoutMs: 1_000,
      playbackTimeoutMs: 100,
      ...ports,
      ducking: { duck: vi.fn(() => vi.fn()) },
    });

    await expect(controller.play(0)).rejects.toMatchObject({
      code: "playback-failed",
      message: expect.stringMatching(/timed out/i),
    });
    expect(controller.getEvidence().audioFailures).toEqual([
      { itemPosition: 0, code: "playback-failed" },
    ]);
  });

  it("lets only the latest overlapping play request start playback", async () => {
    const pending = new Map<number, (clip: PreparedClip) => void>();
    const ports = createPorts({
      prepare: (reference) => new Promise((resolve) => {
        pending.set(reference.itemPosition, resolve);
      }),
    });
    const controller = createListeningAudioController({
      session,
      clips,
      preloadAhead: 0,
      preparationTimeoutMs: 5_000,
      ...ports,
      ducking: { duck: vi.fn(() => vi.fn()) },
    });

    const first = controller.play(0);
    const second = controller.play(1);
    pending.get(0)?.({ itemPosition: 0 });
    await first;
    expect(ports.playback.play).not.toHaveBeenCalled();

    pending.get(1)?.({ itemPosition: 1 });
    await second;
    expect(ports.playback.play).toHaveBeenCalledTimes(1);
    expect(controller.getSnapshot()).toMatchObject({
      status: "completed",
      activeItemPosition: 1,
    });
  });

  it("does not start playback when pause follows clip resolution", async () => {
    const ports = createPorts({
      prepare: async (reference) => {
        queueMicrotask(() => controller.pause());
        return { itemPosition: reference.itemPosition };
      },
    });
    const controller: ListeningAudioController = createListeningAudioController({
      session,
      clips,
      preloadAhead: 0,
      preparationTimeoutMs: 1_000,
      ...ports,
      ducking: { duck: vi.fn(() => vi.fn()) },
    });

    await expect(controller.play(0)).resolves.toMatchObject({ status: "cancelled" });
    expect(ports.playback.play).not.toHaveBeenCalled();
  });

  it("blocks muted playback without recording an audio failure", async () => {
    const ports = createPorts();
    const controller = createListeningAudioController({
      session,
      clips,
      preloadAhead: 0,
      preparationTimeoutMs: 1_000,
      ...ports,
      ducking: { duck: vi.fn(() => vi.fn()) },
    });

    controller.setMuted(true);
    expect(controller.getSnapshot()).toMatchObject({ muted: true, status: "cancelled" });
    await expect(controller.play(0)).rejects.toMatchObject({ code: "muted" });
    expect(ports.playback.play).not.toHaveBeenCalled();
    expect(controller.getEvidence().audioFailures).toEqual([]);

    controller.setMuted(false);
    await controller.play(0);
    expect(controller.getSnapshot()).toMatchObject({
      muted: false,
      status: "completed",
    });
  });

  it.each(["pause", "restart", "destroy"] as const)(
    "cancels active playback during %s",
    async (operation) => {
      let playbackSignal: AbortSignal | undefined;
      const ports = createPorts({
        play: (_clip, signal) => new Promise<void>((resolve) => {
          playbackSignal = signal;
          signal.addEventListener("abort", () => resolve(), { once: true });
        }),
      });
      const restore = vi.fn();
      const controller = createListeningAudioController({
        session,
        clips,
        preloadAhead: 0,
        preparationTimeoutMs: 1_000,
        ...ports,
        ducking: { duck: () => restore },
      });

      const playing = controller.play(0);
      await vi.waitFor(() => expect(playbackSignal).toBeDefined());
      await controller[operation]();
      await playing;

      expect(playbackSignal?.aborted).toBe(true);
      expect(restore).toHaveBeenCalledTimes(1);
      expect(controller.getEvidence().replayCounts).toEqual([]);
    },
  );

  it("prevents every action after destroy", async () => {
    const ports = createPorts();
    const controller = createListeningAudioController({
      session,
      clips,
      preloadAhead: 0,
      preparationTimeoutMs: 1_000,
      ...ports,
      ducking: { duck: vi.fn(() => vi.fn()) },
    });
    await controller.destroy();

    await expect(controller.prepare(0)).rejects.toMatchObject({ code: "destroyed" });
    await expect(controller.play(0)).rejects.toMatchObject({ code: "destroyed" });
    await expect(controller.replay(0)).rejects.toMatchObject({ code: "destroyed" });
    expect(() => controller.recordTranscriptAssistance(0)).toThrowError(
      expect.objectContaining({ code: "destroyed" }),
    );
  });

  it("keeps fallback and assistance evidence truthful", () => {
    const ports = createPorts();
    const controller = createListeningAudioController({
      session,
      clips,
      preloadAhead: 0,
      preparationTimeoutMs: 1_000,
      ...ports,
      ducking: { duck: vi.fn(() => vi.fn()) },
    });

    controller.recordTranscriptAssistance(1);
    controller.recordTranscriptAssistance(1);
    controller.recordReadingFallback(2);
    expect(controller.getEvidence()).toMatchObject({
      effectiveModality: "reading-fallback",
      assistedItemPositions: [1],
      fallbackItemPositions: [2],
    });
  });

  it("rejects reading fallback inside a scored listening session", () => {
    const ports = createPorts();
    const controller = createListeningAudioController({
      session: {
        ...session,
        scored: true,
        targetLocaleFallback: "reject",
      },
      clips,
      preloadAhead: 0,
      preparationTimeoutMs: 1_000,
      ...ports,
      ducking: { duck: vi.fn(() => vi.fn()) },
    });

    expect(() => controller.recordReadingFallback(0)).toThrowError(
      expect.objectContaining({ code: "scored-fallback-forbidden" }),
    );
  });
});
