/**
 * Phase 6 documentation test — asserts `packages/auth/README.md` documents the
 * rate-limiter dev fast-path, per-IP limits, and Postgres-backed default.
 *
 * This is an artifact-level (markdown content) test. The live-behaviour proofs
 * live in `rate-limit.test.ts` and `rate-limit-store.test.ts`.
 */
import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, "..", "..", "..", "..");
const README_PATH = join(ROOT, "packages", "auth", "README.md");

const readmeExists = existsSync(README_PATH);
const readmeSource = readmeExists ? readFileSync(README_PATH, "utf8") : "";

describe("Phase 6 — README documents rate limiter configuration", () => {
  it("README.md exists at packages/auth/README.md", () => {
    expect(
      readmeExists,
      "Expected packages/auth/README.md to exist so the rate-limiter " +
        "configuration is discoverable for operators.",
    ).toBe(true);
  });

  it("README names the RATE_LIMIT_INMEMORY_FASTPATH env var", () => {
    expect(
      /RATE_LIMIT_INMEMORY_FASTPATH/.test(readmeSource),
      "Expected packages/auth/README.md to name `RATE_LIMIT_INMEMORY_FASTPATH` " +
        "so operators know how to opt into the dev-only fast-path.",
    ).toBe(true);
  });

  it("README explains that the fast-path is gated to development", () => {
    const devLine = readmeSource
      .split("\n")
      .some(
        (line) =>
          /RATE_LIMIT_INMEMORY_FASTPATH/.test(line) &&
          /development|dev|NODE_ENV/i.test(line),
      );

    expect(
      devLine,
      "Expected the README to state that RATE_LIMIT_INMEMORY_FASTPATH is " +
        "only active in development (together with NODE_ENV).",
    ).toBe(true);
  });

  it("README documents per-IP rate limiting", () => {
    const ipLine = readmeSource
      .split("\n")
      .some(
        (line) =>
          /per[- ]?IP|client IP|IP address/i.test(line) &&
          /limit|rate|attempt/i.test(line),
      );

    expect(
      ipLine,
      "Expected the README to document per-IP rate limiting alongside " +
        "per-username rate limiting.",
    ).toBe(true);
  });

  it("README documents Postgres as the production default", () => {
    const postgresLine = readmeSource
      .split("\n")
      .some(
        (line) =>
          /Postgres|PostgreSQL|database/i.test(line) &&
          /default|production|prod/i.test(line),
      );

    expect(
      postgresLine,
      "Expected the README to document that the Postgres-backed store is " +
        "the production default.",
    ).toBe(true);
  });
});
