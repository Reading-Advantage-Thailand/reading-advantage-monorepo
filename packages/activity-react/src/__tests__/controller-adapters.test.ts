import { describe, expect, it, vi } from "vitest";
import { createHostedMediaController, createYouTubeMediaController } from "../controllers.js";

describe("provider controller adapters", () => {
  it("wraps every YouTube port operation and publishes refreshed snapshots", () => {
    let currentSeconds = 2;
    let durationSeconds = 90;
    let playerState = 2;
    let captionsTrack: unknown = null;
    const port = {
      playVideo: vi.fn(),
      pauseVideo: vi.fn(),
      seekTo: vi.fn(),
      getCurrentTime: vi.fn(() => currentSeconds),
      getDuration: vi.fn(() => durationSeconds),
      getPlayerState: vi.fn(() => playerState),
      getOption: vi.fn(() => captionsTrack),
      destroy: vi.fn(),
    };
    const controller = createYouTubeMediaController(port);
    const listener = vi.fn();
    const unsubscribe = controller.subscribe(listener);
    controller.play();
    expect(port.playVideo).toHaveBeenCalledOnce();
    expect(controller.getSnapshot().status).toBe("playing");
    controller.pause();
    expect(port.pauseVideo).toHaveBeenCalledOnce();
    controller.seek(12);
    expect(port.seekTo).toHaveBeenCalledWith(12, true);
    currentSeconds = 36;
    durationSeconds = 120;
    controller.refresh();
    expect(controller.getSnapshot()).toMatchObject({ currentSeconds: 12, durationSeconds: 120 });
    currentSeconds = 12.25;
    controller.refresh();
    expect(controller.getSnapshot()).toMatchObject({ currentSeconds: 12.25, durationSeconds: 120 });
    expect(listener).toHaveBeenCalled();
    playerState = 0;
    controller.handleStateChange(playerState);
    expect(controller.getSnapshot().status).toBe("ended");
    captionsTrack = { languageCode: "en" };
    controller.handleApiChange();
    expect(controller.getSnapshot().captionsEnabled).toBe(true);
    controller.handleError(100);
    expect(controller.getSnapshot()).toMatchObject({ status: "error", errorMessage: "YouTube playback error (100)" });
    unsubscribe();
    controller.destroy();
    expect(port.destroy).toHaveBeenCalledOnce();
  });

  it("wraps hosted media events, seeking, playback, and cleanup", async () => {
    const media = document.createElement("video");
    let currentTime = 0;
    let duration = Number.NaN;
    let paused = true;
    let ended = false;
    const captionTrack = { mode: "disabled" };
    let notifyCaptionChange: (() => void) | undefined;
    const textTracks = {
      0: captionTrack,
      length: 1,
      addEventListener: vi.fn((_event: string, listener: () => void) => { notifyCaptionChange = listener; }),
      removeEventListener: vi.fn(),
      *[Symbol.iterator]() { yield captionTrack; },
    };
    Object.defineProperty(media, "currentTime", { configurable: true, get: () => currentTime, set: (value) => { currentTime = value; } });
    Object.defineProperty(media, "duration", { configurable: true, get: () => duration });
    Object.defineProperty(media, "paused", { configurable: true, get: () => paused });
    Object.defineProperty(media, "ended", { configurable: true, get: () => ended });
    Object.defineProperty(media, "textTracks", { configurable: true, value: textTracks });
    const play = vi.spyOn(media, "play").mockResolvedValue();
    const pause = vi.spyOn(media, "pause").mockImplementation(() => undefined);
    const controller = createHostedMediaController(media);
    const listener = vi.fn();
    controller.subscribe(listener);
    await controller.play();
    expect(play).toHaveBeenCalledOnce();
    controller.pause();
    expect(pause).toHaveBeenCalledOnce();
    controller.seek(8);
    expect(currentTime).toBe(8);
    media.dispatchEvent(new Event("timeupdate"));
    expect(listener).toHaveBeenCalled();
    duration = 100;
    paused = false;
    media.dispatchEvent(new Event("play"));
    expect(controller.getSnapshot()).toMatchObject({ status: "playing", durationSeconds: 100 });
    ended = true;
    media.dispatchEvent(new Event("ended"));
    expect(controller.getSnapshot().status).toBe("ended");
    media.dispatchEvent(new Event("stalled"));
    expect(controller.getSnapshot()).toMatchObject({ status: "idle", errorMessage: expect.stringContaining("interrupted") });
    media.dispatchEvent(new Event("error"));
    expect(controller.getSnapshot()).toMatchObject({ status: "error" });
    captionTrack.mode = "showing";
    notifyCaptionChange?.();
    expect(controller.getSnapshot().captionsEnabled).toBe(true);
    controller.destroy();
    expect(textTracks.removeEventListener).toHaveBeenCalledWith("change", expect.any(Function));
    const count = listener.mock.calls.length;
    media.dispatchEvent(new Event("timeupdate"));
    expect(listener).toHaveBeenCalledTimes(count);
  });
});
