/**
 * Wave 0 Phase 2 — Rate limiter architecture test.
 *
 * Proves that the production rate limiter is NOT process-local and
 * has per-user plus per-IP semantics.
 *
 * Red expectations (2026-06-28):
 *   - checkRateLimit only accepts a username parameter (no IP) →
 *     the per-IP semantic test fails.
 *   - The production rate limiter uses a module-level Map → the
 *     "not process-local" structural test fails.
 *   - The rate limiter module does not export a shared-store interface →
 *     cross-instance state sharing test fails.
 *
 * Targeted command:
 *   CI=true pnpm turbo run test --filter=@reading-advantage/auth
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// src/__tests__ → up 3 levels → packages/auth
const PACKAGE_ROOT = join(__dirname, "..", "..");
const RATE_LIMIT_SOURCE = readFileSync(
  join(PACKAGE_ROOT, "src", "rate-limit.ts"),
  "utf8",
);

describe("Wave 0 Phase 2 — Rate limiter production safety", () => {
  describe("Per-IP semantics", () => {
    it("checkRateLimit accepts an IP identifier parameter", () => {
      // The current signature is checkRateLimit(username: string).
      // For per-IP rate limiting, there must be a way to pass the
      // client IP. This test inspects the source to check if the
      // function signature includes an IP/identifier parameter.
      //
      // We check the exported function signature for an ip or
      // identifier parameter beyond just username.
      const hasIpParam =
        /checkRateLimit\s*\(\s*\w+\s*[:,]/.test(RATE_LIMIT_SOURCE) &&
        /(?:ip|identifier|clientIp|address)/i.test(
          RATE_LIMIT_SOURCE.slice(
            RATE_LIMIT_SOURCE.indexOf("checkRateLimit"),
            RATE_LIMIT_SOURCE.indexOf("checkRateLimit") + 300,
          ),
        );
      expect(
        hasIpParam,
        "checkRateLimit must accept an IP or identifier parameter for " +
          "per-IP rate limiting. Current signature is " +
          "`checkRateLimit(username: string)` — no IP semantics. " +
          "The spec requires per-user AND per-IP rate limiting. " +
          "Add an `ip` parameter or change the signature to accept " +
          "a composite key `{ username, ip }`.",
      ).toBe(true);
    });

    it("recordFailure records attempts keyed by IP in addition to username", () => {
      // If recordFailure only keys by username, two different IPs
      // brute-forcing the same username would share a rate limit
      // bucket but different usernames from the same IP would not
      // be limited. We need both dimensions.
      const hasIpInRecordFailure =
        /recordFailure\s*\(/.test(RATE_LIMIT_SOURCE) &&
        /(?:ip|identifier|clientIp|address)/i.test(
          RATE_LIMIT_SOURCE.slice(
            RATE_LIMIT_SOURCE.indexOf("recordFailure"),
            RATE_LIMIT_SOURCE.indexOf("recordFailure") + 300,
          ),
        );
      expect(
        hasIpInRecordFailure,
        "recordFailure must accept and record an IP identifier for " +
          "per-IP rate limiting. Currently it only takes `username: string`.",
      ).toBe(true);
    });
  });

  describe("Non-process-local production store", () => {
    it("production rate limiter does not use module-level Map as sole store", () => {
      // A module-level Map is acceptable ONLY as a dev/fast-path.
      // The production path must use a DB-backed or otherwise
      // cross-instance durable store.
      //
      // We check if the module defines a storage seam (interface/type)
      // that the production path uses, or if it directly uses Map.
      const hasStorageInterface =
        /(?:interface|type)\s+(?:RateLimitStore|RateLimiterBackend|RateLimitStorage)/i.test(
          RATE_LIMIT_SOURCE,
        );
      const usesDbOrAsync =
        /(?:postgres|drizzle|SELECT|FOR UPDATE|upsert|query|database|db\.)/i.test(
          RATE_LIMIT_SOURCE,
        );
      const isOnlyMap =
        RATE_LIMIT_SOURCE.includes("new Map") && !hasStorageInterface && !usesDbOrAsync;

      expect(
        isOnlyMap,
        "Production rate limiter uses ONLY a module-level `new Map()` " +
          "with no storage interface, DB-backed store, or cross-instance " +
          "durable mechanism. This means each server process has its own " +
          "independent rate limit state. In production with multiple " +
          "instances, a user blocked on one instance can retry on another. " +
          "Add a storage seam (e.g., `interface RateLimitStore`) and " +
          "implement a Postgres-backed store for production. " +
          "Keep the in-memory Map as dev-only, opt-in via env.",
      ).toBe(false);
    });

    it("exports a store configuration or factory for production overrides", () => {
      // The module should export a way to configure or replace the
      // rate limit store for production deployments.
      const exportsStoreConfig =
        /export\s+(?:const|function|let)\s+\w*(?:store|backend|config|create|factory)\w*/i.test(
          RATE_LIMIT_SOURCE,
        );
      expect(
        exportsStoreConfig,
        "Rate limiter module does not export a store configuration or " +
          "factory. For production, the rate limit store must be " +
          "configurable (e.g., Postgres-backed). Export a " +
          "`configureRateLimiter(store)` or `createRateLimiter(opts)` " +
          "function.",
      ).toBe(true);
    });
  });

  describe("Rate limit window and max attempts are configurable", () => {
    it("does not hardcode WINDOW_MS and MAX_ATTEMPTS as module constants", () => {
      // Production deployments need to tune these values. They should
      // come from configuration, not be hardcoded const values in the
      // module scope.
      const hardcoded =
        /const\s+WINDOW_MS\s*=\s*\d+/.test(RATE_LIMIT_SOURCE) &&
        /const\s+MAX_ATTEMPTS\s*=\s*\d+/.test(RATE_LIMIT_SOURCE);
      expect(
        hardcoded,
        "WINDOW_MS and MAX_ATTEMPTS are hardcoded module constants " +
          "(WINDOW_MS = 15 * 60 * 1000, MAX_ATTEMPTS = 5). These " +
          "must be configurable for production deployment. Accept " +
          "them as constructor/factory parameters or read from env.",
      ).toBe(false);
    });
  });
});
