// @ts-check
/// <reference lib="webworker" />

/**
 * Primary Advantage service worker.
 *
 * It replaces the legacy Serwist worker at the same URL. On install it caches the offline
 * fallback page. Navigations go to the network first and fall back to the cached offline page
 * when the network fails; every other request has no handler, so the browser sends it to the
 * network. On activation it deletes each cache except the current offline cache and reloads each open
 * window once, only when it deleted a legacy cache (a cache without the prefix). Keep the values in step with
 * `OFFLINE_CACHE_NAME` and `OFFLINE_FILES` in `lib/pwa/constants.ts`.
 */

const CACHE_PREFIX = "primary-v2-";

/** Version of the offline cache. Change it with each edit of the offline files. */
const CACHE_VERSION = "1";

/** Name of the cache that holds the offline fallback page. */
const OFFLINE_CACHE_NAME = CACHE_PREFIX + "offline-v" + CACHE_VERSION;

/** Files cached at install for the offline fallback. The total stays under 200 KB. */
const OFFLINE_FILES = ["/offline.html"];

const worker = /** @type {ServiceWorkerGlobalScope} */ (/** @type {unknown} */ (self));

/**
 * Caches the offline fallback page. When the cache write fails the install fails with it, so
 * the browser tries the install again later instead of running without a fallback.
 * @returns {Promise<void>} Resolves when the offline files are cached.
 */
async function cacheOffline() {
  const cache = await caches.open(OFFLINE_CACHE_NAME);
  await cache.addAll(OFFLINE_FILES);
}

/**
 * Deletes every cache except the current offline cache, takes control of the open windows, and reloads each
 * window once when at least one legacy cache was deleted.
 * @returns {Promise<void>} Resolves when the clean-up ends and the reloads start.
 */
async function takeOver() {
  const names = await caches.keys();
  const stale = names.filter((name) => name !== OFFLINE_CACHE_NAME);
  const results = await Promise.all(stale.map((name) => caches.delete(name)));
  await worker.clients.claim();
  const deletedLegacy = stale.some((name, i) => results[i] && !name.startsWith(CACHE_PREFIX));
  if (!deletedLegacy) return;
  const windows = await worker.clients.matchAll({ type: "window" });
  // Do not await the navigations: a navigation waits for this activation to end, so an await
  // would block the activation until the browser stops the worker.
  for (const client of windows) {
    /** @type {WindowClient} */ (client).navigate(client.url).catch(() => null);
  }
}

worker.addEventListener("install", (event) => {
  event.waitUntil(Promise.all([cacheOffline(), worker.skipWaiting()]));
});

worker.addEventListener("activate", (event) => {
  event.waitUntil(takeOver());
});

worker.addEventListener("fetch", (event) => {
  if (event.request.mode !== "navigate") return;
  event.respondWith(
    fetch(event.request).catch(async () => {
      const fallback = await caches.match(OFFLINE_FILES[0]);
      if (!fallback) throw new Error("offline page missing from the cache");
      return fallback;
    }),
  );
});
