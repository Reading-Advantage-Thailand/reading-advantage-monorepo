import { readFileSync, statSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { parse } from "acorn";
import { describe, expect, it, vi } from "vitest";
import { CACHE_PREFIX, OFFLINE_CACHE_NAME, OFFLINE_FILES } from "../constants";

const WORKER_PATH = path.resolve(__dirname, "../../../public/serwist/sw.js");
const source = readFileSync(WORKER_PATH, "utf8");

type Waiter = { waitUntil: (promise: Promise<unknown>) => void };
type Listener = (event: Waiter & Record<string, unknown>) => void;

/** Runs the worker in a `vm` context with a fake worker scope and returns its handles. */
function loadWorker(cacheNames: string[], windowCount = 2) {
  const listeners = new Map<string, Listener[]>();
  const names = new Set(cacheNames);
  const stored = new Map<string, unknown>();
  const skipWaiting = vi.fn(() => Promise.resolve());
  const claim = vi.fn(() => Promise.resolve());
  const windows = Array.from({ length: windowCount }, (_, i) => ({
    url: `https://example.test/page-${i}`,
    navigate: vi.fn(() => Promise.resolve(null)),
  }));
  const addAll = vi.fn(async (urls: readonly string[]) => {
    for (const url of urls) stored.set(url, { url, body: `cached ${url}` });
  });
  const open = vi.fn(async (name: string) => {
    names.add(name);
    return { addAll };
  });
  const match = vi.fn(async (url: string) => stored.get(url));
  const self = {
    addEventListener: (type: string, fn: Listener) => {
      listeners.set(type, [...(listeners.get(type) ?? []), fn]);
    },
    skipWaiting,
    clients: { claim, matchAll: vi.fn(() => Promise.resolve(windows)) },
  };
  const networkFetch = vi.fn(async (_input: unknown) => ({ body: "network page" }));
  const context = {
    self,
    caches: {
      keys: () => Promise.resolve([...names]),
      delete: vi.fn((name: string) => Promise.resolve(names.delete(name))),
      open,
      match,
    },
    fetch: networkFetch,
  };
  vm.runInNewContext(source, context, { filename: WORKER_PATH });

  /** Fires an event and waits for the promise that the handler passes to `waitUntil`. */
  async function fire(type: string, event: Record<string, unknown> = {}) {
    const pending: Promise<unknown>[] = [];
    for (const fn of listeners.get(type) ?? [])
      fn({ ...event, waitUntil: (p: Promise<unknown>) => pending.push(p) });
    await Promise.all(pending);
  }
  return { listeners, names, stored, skipWaiting, claim, windows, open, addAll, match, networkFetch, fire };
}

/** Builds a fetch event with a `respondWith` spy for one request mode. */
function navigationEvent(mode: string, url = "https://example.test/student/home") {
  return { request: { mode, url }, respondWith: vi.fn() };
}

describe("public/serwist/sw.js", () => {
  it("calls skipWaiting and caches only the offline files on install", async () => {
    const worker = loadWorker([]);
    await worker.fire("install");
    expect(worker.skipWaiting).toHaveBeenCalledTimes(1);
    expect(worker.open).toHaveBeenCalledTimes(1);
    expect(worker.open).toHaveBeenCalledWith(OFFLINE_CACHE_NAME);
    expect(worker.addAll).toHaveBeenCalledTimes(1);
    expect(worker.addAll).toHaveBeenCalledWith([...OFFLINE_FILES]);
    expect([...worker.names]).toEqual([OFFLINE_CACHE_NAME]);
  });

  it("keeps the offline files under 200 KB in total", () => {
    let total = 0;
    for (const file of OFFLINE_FILES) {
      const absolute = path.resolve(__dirname, "../../../public", file.slice(1));
      total += statSync(absolute).size;
    }
    expect(total).toBeGreaterThan(0);
    expect(total).toBeLessThan(200 * 1024);
  });

  it("sends a navigation to the network and caches nothing", async () => {
    const worker = loadWorker([]);
    const event = navigationEvent("navigate");
    await worker.fire("fetch", event);
    expect(worker.networkFetch).toHaveBeenCalledTimes(1);
    expect(worker.networkFetch).toHaveBeenCalledWith(event.request);
    expect(event.respondWith).toHaveBeenCalledTimes(1);
    await expect(event.respondWith.mock.calls[0][0]).resolves.toEqual({ body: "network page" });
    expect(worker.open).not.toHaveBeenCalled();
  });

  it("serves /offline.html when the network fails for a navigation", async () => {
    const worker = loadWorker([]);
    worker.networkFetch.mockRejectedValueOnce(new Error("offline"));
    worker.stored.set("/offline.html", { url: "/offline.html", body: "offline page" });
    const event = navigationEvent("navigate");
    await worker.fire("fetch", event);
    expect(event.respondWith).toHaveBeenCalledTimes(1);
    await expect(event.respondWith.mock.calls[0][0]).resolves.toEqual({
      url: "/offline.html",
      body: "offline page",
    });
    expect(worker.match).toHaveBeenCalledWith("/offline.html");
  });

  it.each(["same-origin", "cors", "no-cors"])("leaves a %s request to the browser", async (mode) => {
    const worker = loadWorker([]);
    const event = navigationEvent(mode, "https://example.test/__ping");
    await worker.fire("fetch", event);
    expect(event.respondWith).not.toHaveBeenCalled();
    expect(worker.networkFetch).not.toHaveBeenCalled();
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

  it("does not wait for a navigation, because a navigation waits for the activation", async () => {
    const worker = loadWorker(["pages"]);
    worker.windows[0].navigate.mockReturnValueOnce(new Promise(() => undefined));
    await expect(worker.fire("activate")).resolves.toBeUndefined();
  });

  it("registers a fetch listener for navigations only", () => {
    const worker = loadWorker([]);
    expect([...worker.listeners.keys()].sort()).toEqual(["activate", "fetch", "install"]);
  });

  it("does not use importScripts and parses as a module", () => {
    expect(source).not.toMatch(/importScripts/);
    expect(() => parse(source, { ecmaVersion: "latest", sourceType: "module" })).not.toThrow();
  });

  it("uses the same prefix, offline cache, and files as the constants file", () => {
    expect(source).toContain(`"${CACHE_PREFIX}"`);
    expect(source).toContain(`"${OFFLINE_CACHE_NAME}"`);
    for (const file of OFFLINE_FILES) expect(source).toContain(`"${file}"`);
  });
});
