import { describe, expect, it, vi } from "vitest";
import { createHostedMediaController, createYouTubeMediaController } from "../controllers.js";

describe("provider controller adapters", () => {
  it("wraps every YouTube port operation and publishes refreshed snapshots", () => {
    let currentSeconds = 2;
    let durationSeconds = 90;
    const port = {
      playVideo: vi.fn(),
      pauseVideo: vi.fn(),
      seekTo: vi.fn(),
      getCurrentTime: vi.fn(() => currentSeconds),
      getDuration: vi.fn(() => durationSeconds),
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
    Object.defineProperty(media, "currentTime", { configurable: true, get: () => currentTime, set: (value) => { currentTime = value; } });
    Object.defineProperty(media, "duration", { configurable: true, get: () => duration });
    Object.defineProperty(media, "paused", { configurable: true, get: () => paused });
    Object.defineProperty(media, "ended", { configurable: true, get: () => ended });
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
    media.dispatchEvent(new Event("timeupdate"));
    expect(controller.getSnapshot().status).toBe("ended");
    controller.destroy();
    const count = listener.mock.calls.length;
    media.dispatchEvent(new Event("timeupdate"));
    expect(listener).toHaveBeenCalledTimes(count);
  });
});
