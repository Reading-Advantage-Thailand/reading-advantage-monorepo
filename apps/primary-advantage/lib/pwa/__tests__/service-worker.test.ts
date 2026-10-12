import { readFileSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { parse } from "acorn";
import { describe, expect, it, vi } from "vitest";
import { CACHE_PREFIX } from "../constants";

const WORKER_PATH = path.resolve(__dirname, "../../../public/serwist/sw.js");
const source = readFileSync(WORKER_PATH, "utf8");

type Listener = (event: { waitUntil: (promise: Promise<unknown>) => void }) => void;

/** Runs the worker in a `vm` context with a fake worker scope and returns its handles. */
function loadWorker(cacheNames: string[], windowCount = 2) {
  const listeners = new Map<string, Listener[]>();
  const names = new Set(cacheNames);
  const skipWaiting = vi.fn(() => Promise.resolve());
  const claim = vi.fn(() => Promise.resolve());
  const windows = Array.from({ length: windowCount }, (_, i) => ({
    url: `https://example.test/page-${i}`,
    navigate: vi.fn(() => Promise.resolve(null)),
  }));
  const self = {
    addEventListener: (type: string, fn: Listener) => {
      listeners.set(type, [...(listeners.get(type) ?? []), fn]);
    },
    skipWaiting,
    clients: { claim, matchAll: vi.fn(() => Promise.resolve(windows)) },
  };
  const context = {
    self,
    caches: {
      keys: () => Promise.resolve([...names]),
      delete: vi.fn((name: string) => Promise.resolve(names.delete(name))),
    },
  };
  vm.runInNewContext(source, context, { filename: WORKER_PATH });

  /** Fires an event and waits for the promise that the handler passes to `waitUntil`. */
  async function fire(type: string) {
    const pending: Promise<unknown>[] = [];
    for (const fn of listeners.get(type) ?? []) fn({ waitUntil: (p) => pending.push(p) });
    await Promise.all(pending);
  }
  return { listeners, names, skipWaiting, claim, windows, context, fire };
}

describe("public/serwist/sw.js", () => {
  it("calls skipWaiting on install", async () => {
    const worker = loadWorker([]);
    await worker.fire("install");
    expect(worker.skipWaiting).toHaveBeenCalledTimes(1);
  });

  it("deletes every cache without the prefix and keeps its own caches", async () => {
    const worker = loadWorker([
      "serwist-precache-v2-https://primary.reading-advantage.com/",
      "pages",
      "pages-rsc",
      "apis",
      "others",
      `${CACHE_PREFIX}offline`,
    ]);
    await worker.fire("activate");
    expect([...worker.names]).toEqual([`${CACHE_PREFIX}offline`]);
  });

  it("claims the clients and reloads each window once after it deleted a legacy cache", async () => {
    const worker = loadWorker(["pages"]);
    await worker.fire("activate");
    expect(worker.claim).toHaveBeenCalledTimes(1);
    for (const win of worker.windows) {
      expect(win.navigate).toHaveBeenCalledTimes(1);
      expect(win.navigate).toHaveBeenCalledWith(win.url);
    }
  });

  it("claims the clients and does not reload when no legacy cache exists", async () => {
    const worker = loadWorker([`${CACHE_PREFIX}offline`]);
    await worker.fire("activate");
    expect(worker.claim).toHaveBeenCalledTimes(1);
    for (const win of worker.windows) expect(win.navigate).not.toHaveBeenCalled();
  });

  it("does not reload on a second activation after the first one cleaned up", async () => {
    const worker = loadWorker(["pages"]);
    await worker.fire("activate");
    await worker.fire("activate");
    for (const win of worker.windows) expect(win.navigate).toHaveBeenCalledTimes(1);
  });

  it("still finishes when one window cannot navigate", async () => {
    const worker = loadWorker(["pages"]);
    worker.windows[0].navigate.mockRejectedValueOnce(new Error("detached"));
    await expect(worker.fire("activate")).resolves.toBeUndefined();
    expect(worker.windows[1].navigate).toHaveBeenCalledTimes(1);
  });

  it("has no fetch listener, so the browser sends every request to the network", () => {
    const worker = loadWorker([]);
    expect([...worker.listeners.keys()].sort()).toEqual(["activate", "install"]);
    expect(worker.listeners.has("fetch")).toBe(false);
  });

  it("does not use importScripts and parses as a module", () => {
    expect(source).not.toMatch(/importScripts/);
    expect(() => parse(source, { ecmaVersion: "latest", sourceType: "module" })).not.toThrow();
  });

  it("uses the same prefix as the constants file", () => {
    expect(source).toContain(`"${CACHE_PREFIX}"`);
  });
});
