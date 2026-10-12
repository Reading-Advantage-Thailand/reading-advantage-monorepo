// @ts-check
/// <reference lib="webworker" />

/**
 * Primary Advantage service worker.
 *
 * It replaces the legacy Serwist worker at the same URL. It stores nothing and has no `fetch`
 * handler, so the browser sends every request to the network. On activation it deletes each cache
 * that it does not own and reloads each open window once, only when it deleted a legacy cache.
 * Keep the prefix in step with `CACHE_PREFIX` in `lib/pwa/constants.ts`.
 */

const CACHE_PREFIX = "primary-v2-";

const worker = /** @type {ServiceWorkerGlobalScope} */ (/** @type {unknown} */ (self));

/**
 * Deletes every cache without the prefix, takes control of the open windows, and reloads each
 * window once when at least one legacy cache was deleted.
 * @returns {Promise<void>} Resolves when the clean-up and the reloads end.
 */
async function takeOver() {
  const names = await caches.keys();
  const legacy = names.filter((name) => !name.startsWith(CACHE_PREFIX));
  const results = await Promise.all(legacy.map((name) => caches.delete(name)));
  await worker.clients.claim();
  if (!results.some(Boolean)) return;
  const windows = await worker.clients.matchAll({ type: "window" });
  await Promise.all(windows.map((client) => /** @type {WindowClient} */ (client).navigate(client.url).catch(() => null)));
}

worker.addEventListener("install", (event) => {
  event.waitUntil(worker.skipWaiting());
});

worker.addEventListener("activate", (event) => {
  event.waitUntil(takeOver());
});
