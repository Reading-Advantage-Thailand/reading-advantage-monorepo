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
