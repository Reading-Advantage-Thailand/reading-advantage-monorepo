import { describe, expect, it, vi } from "vitest";

import { createBrowserAudioClipPorts } from "../index.js";

type Listener = () => void;

class FakeAudioElement {
  preload = "";
  src = "";
  currentTime = 0;
  readonly pause = vi.fn();
  readonly load = vi.fn(() => this.emit("canplay"));
  readonly play = vi.fn(async () => {
    this.emit("ended");
  });
  readonly removeAttribute = vi.fn((name: string) => {
    if (name === "src") this.src = "";
  });
  private readonly listeners = new Map<string, Set<Listener>>();

  addEventListener(name: string, listener: Listener): void {
    const current = this.listeners.get(name) ?? new Set<Listener>();
    current.add(listener);
    this.listeners.set(name, current);
  }

  removeEventListener(name: string, listener: Listener): void {
    this.listeners.get(name)?.delete(listener);
  }

  emit(name: string): void {
    for (const listener of this.listeners.get(name) ?? []) listener();
  }

  listenerCount(): number {
    return [...this.listeners.values()].reduce((total, value) => total + value.size, 0);
  }
}

describe("browser URL audio ports", () => {
  it("prepares, plays, and releases a URL clip", async () => {
    const element = new FakeAudioElement();
    const ports = createBrowserAudioClipPorts({
      createAudio: () => element as unknown as HTMLAudioElement,
    });
    const signal = new AbortController().signal;

    const prepared = await ports.preparation.prepare(
      { itemPosition: 0, url: "/audio/dragon.mp3", mediaType: "audio/mpeg" },
      signal,
    );
    await ports.playback.play(prepared, signal);
    ports.preparation.release(prepared);

    expect(element.preload).toBe("auto");
    expect(element.play).toHaveBeenCalledTimes(1);
    expect(element.pause).toHaveBeenCalledTimes(1);
    expect(element.removeAttribute).toHaveBeenCalledWith("src");
    expect(element.listenerCount()).toBe(0);
  });

  it("reports play rejection and restores listeners", async () => {
    const element = new FakeAudioElement();
    element.play.mockRejectedValueOnce(new Error("autoplay blocked"));
    const ports = createBrowserAudioClipPorts({
      createAudio: () => element as unknown as HTMLAudioElement,
    });
    const signal = new AbortController().signal;
    const prepared = await ports.preparation.prepare(
      { itemPosition: 0, url: "/audio/dragon.mp3", mediaType: "audio/mpeg" },
      signal,
    );

    await expect(ports.playback.play(prepared, signal)).rejects.toMatchObject({
      code: "playback-failed",
    });
    expect(element.listenerCount()).toBe(0);
  });

  it("clears the source when preparation is aborted", async () => {
    const element = new FakeAudioElement();
    element.load.mockImplementation(() => undefined);
    const ports = createBrowserAudioClipPorts({
      createAudio: () => element as unknown as HTMLAudioElement,
    });
    const abort = new AbortController();
    const preparation = ports.preparation.prepare(
      { itemPosition: 0, url: "/audio/dragon.mp3", mediaType: "audio/mpeg" },
      abort.signal,
    );

    abort.abort();

    await expect(preparation).rejects.toMatchObject({ code: "cancelled" });
    expect(element.removeAttribute).toHaveBeenCalledWith("src");
    expect(element.src).toBe("");
    expect(element.listenerCount()).toBe(0);
  });
});
