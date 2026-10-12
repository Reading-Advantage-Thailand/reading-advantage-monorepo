/** URL of the service worker. It is the same URL as the legacy worker, so a phone replaces it. */
export const SERVICE_WORKER_URL = "/serwist/sw.js";

/** Scope of the service worker registration. It covers every path of the app. */
export const SERVICE_WORKER_SCOPE = "/";

/** Registration type of the worker. The legacy worker used `module`, so the new one keeps it. */
export const SERVICE_WORKER_TYPE = "module" as const;

/**
 * Prefix of every cache that the new worker owns. The worker deletes each cache without this
 * prefix. `public/serwist/sw.js` is a plain script and repeats this value.
 */
export const CACHE_PREFIX = "primary-v2-";

/**
 * Name of the cache that holds the offline fallback page. It starts with the prefix, so the
 * worker keeps it when it deletes the legacy caches. `public/serwist/sw.js` repeats this value.
 */
export const OFFLINE_CACHE_NAME = `${CACHE_PREFIX}offline`;

/**
 * Files cached at install for the offline fallback. `public/offline.html` is static with inline
 * styles, so the worker cache stays under 200 KB. `public/serwist/sw.js` repeats this list.
 */
export const OFFLINE_FILES = ["/offline.html"] as const;
