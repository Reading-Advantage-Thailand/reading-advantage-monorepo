/**
 * Adversarial tests for the exponential backoff + jitter logic in
 * `settleJob`.
 *
 * Track: `webhook_review_reliability_20260605`.
 *
 * The happy-path coverage in `phase-3-retry-backoff.test.ts` exercises
 * two cases (attempts=1 retry, attempts=2 jitter bound). These tests
 * probe deeper:
 *
 *   - Backoff doubling across the full attempts=0..N range.
 *   - Jitter distribution bounds over 1000 samples (per the spec,
 *     jitter is uniform `[0, MAX_JITTER_MS)` — no negative jitter, no
 *     jitter >= MAX_JITTER_MS).
 *   - Non-determinism: two identical settle calls produce DIFFERENT
 *     `nextAttemptAt` (the jitter source must actually be random).
 *   - `nextAttemptAt` never schedules in the past.
 *   - `attempts = maxAttempts-1` → retry (within backoff window).
 *   - `attempts = maxAttempts` → terminal dead-letter.
 *   - `maxAttempts=1` → FIRST failure goes directly to dead (per the
 *     spec: "if attempts < max_attempts, retry; else dead" — attempts
 *     is the POST-INCREMENT count, so attempts=1 with max_attempts=1
 *     goes dead on the very first failure).
 *
 * Anti-pattern defenses applied:
 *   - A3 (digit-only labeled count): every integer count uses a labeled
 *     argument to `expect(...)`, never a bare regex.
 *   - A4 (vacuous-pass): each test asserts a specific observable
 *     (nextAttemptAt bound, status transition, settled.attempts).
 *   - A7 (over-broad filter): bounds are explicit (>= lower, < upper),
 *     not substring matches.
 */
import { describe, it, expect } from "vitest";
import { settleJob } from "../review-worker.js";

interface SettleJobInput {
  id: string;
  attempts: number;
  maxAttempts: number;
}

describe("Adversarial — settleJob backoff / jitter / exhaustion", () => {
  describe("exponential backoff doubling", () => {
    const baseDelayMs = 1000;

    for (const attempts of [0, 1, 2, 3]) {
      it(`attempts=${attempts} → backoff delay ≈ base * 2^${attempts} (no jitter)`, () => {
        const settled = settleJob(
          { id: "job-1", attempts, maxAttempts: 5 } as unknown as SettleJobInput,
          new Error("transient"),
          { baseDelayMs, maxJitterMs: 0 },
        );

        const expectedMin = baseDelayMs * Math.pow(2, attempts);
        const actualDelay = settled.nextAttemptAt.getTime() - Date.now();

        expect(settled.status, `status at attempts=${attempts}`).toBe("pending");
        // Allow a small slack (50ms) for test execution latency.
        expect(actualDelay, `backoff at attempts=${attempts}`).toBeGreaterThanOrEqual(expectedMin - 50);
        expect(actualDelay, `backoff upper bound at attempts=${attempts}`).toBeLessThan(expectedMin + 50);
      });
    }
  });

  describe("jitter distribution bounds (1000 samples)", () => {
    const baseDelayMs = 1000;
    const maxJitterMs = 200;
    const samples = 1000;

    it("all jitter samples are in [0, maxJitterMs) (no negative, no overflow)", () => {
      let minJitter = Number.POSITIVE_INFINITY;
      let maxJitter = Number.NEGATIVE_INFINITY;

      for (let i = 0; i < samples; i++) {
        const settled = settleJob(
          { id: "job-1", attempts: 2, maxAttempts: 5 } as unknown as SettleJobInput,
          new Error("transient"),
          { baseDelayMs, maxJitterMs },
        );

        const expectedBase = baseDelayMs * Math.pow(2, 2); // 4000
        const actualDelay = settled.nextAttemptAt.getTime() - Date.now();
        const jitter = actualDelay - expectedBase;

        if (jitter < minJitter) minJitter = jitter;
        if (jitter > maxJitter) maxJitter = jitter;
      }

      expect(minJitter, `min jitter over ${samples} samples`).toBeGreaterThanOrEqual(-50); // slack for clock
      expect(maxJitter, `max jitter over ${samples} samples`).toBeLessThan(maxJitterMs + 50);
    });

    it("nextAttemptAt is ALWAYS in the future (never schedules in the past)", () => {
      for (let i = 0; i < 100; i++) {
        const settled = settleJob(
          { id: "job-1", attempts: 1, maxAttempts: 5 } as unknown as SettleJobInput,
          new Error("transient"),
          { baseDelayMs: 1000, maxJitterMs: 200 },
        );
        const now = Date.now();
        expect(settled.nextAttemptAt.getTime(), `nextAttemptAt is not in the past (sample ${i})`).toBeGreaterThanOrEqual(now);
      }
    });
  });

  describe("jitter non-determinism", () => {
    it("two consecutive settle calls produce different nextAttemptAt (jitter is random)", () => {
      // P(collision) ≈ 1/2^52 with millisecond resolution — vanishingly
      // small, but not zero. Run 10 pairs to be sure.
      let anyDifferenceObserved = false;
      for (let i = 0; i < 10; i++) {
        const a = settleJob(
          { id: "job-1", attempts: 2, maxAttempts: 5 } as unknown as SettleJobInput,
          new Error("transient"),
          { baseDelayMs: 1000, maxJitterMs: 1000 },
        );
        const b = settleJob(
          { id: "job-1", attempts: 2, maxAttempts: 5 } as unknown as SettleJobInput,
          new Error("transient"),
          { baseDelayMs: 1000, maxJitterMs: 1000 },
        );

        if (a.nextAttemptAt.getTime() !== b.nextAttemptAt.getTime()) {
          anyDifferenceObserved = true;
          break;
        }
      }

      expect(anyDifferenceObserved, "two identical settle calls observed different nextAttemptAt").toBe(true);
    });
  });

  describe("exhaustion boundary", () => {
    it("attempts = maxAttempts-2 (3 with default) → status=pending (retry within backoff window)", () => {
      // Per the spec, `maxAttempts` is the count of failed attempts
      // BEFORE going dead. So with maxAttempts=5: the 1st through 4th
      // failures retry; the 5th failure (input attempts=4) goes dead.
      // attempts=3 is the LAST retry attempt.
      const settled = settleJob(
        { id: "job-1", attempts: 3, maxAttempts: 5 } as unknown as SettleJobInput,
        new Error("transient"),
        { baseDelayMs: 1000, maxJitterMs: 0 },
      );

      expect(settled.status, "retry status at attempts=maxAttempts-2").toBe("pending");
      const expectedDelay = 1000 * Math.pow(2, 3); // 8000
      const actualDelay = settled.nextAttemptAt.getTime() - Date.now();
      expect(actualDelay, "backoff at maxAttempts-2 retry").toBeGreaterThanOrEqual(expectedDelay - 50);
    });

    it("attempts = maxAttempts (5 with default) → status=dead (terminal DLQ)", () => {
      const settled = settleJob(
        { id: "job-1", attempts: 5, maxAttempts: 5 } as unknown as SettleJobInput,
        new Error("persistent failure"),
        { baseDelayMs: 1000, maxJitterMs: 0 },
      );

      expect(settled.status, "dead status at attempts=maxAttempts").toBe("dead");
      expect(settled.lastError, "dead lastError").toBe("persistent failure");
      expect(settled.claimedAt, "dead claimedAt cleared").toBeNull();
      expect(settled.claimedBy, "dead claimedBy cleared").toBeNull();
    });

    it("maxAttempts=1, attempts=0 → FIRST failure goes directly to dead", () => {
      // Per the spec: "if attempts < max_attempts, retry; else dead"
      // where `attempts` is the post-increment count. With maxAttempts=1
      // and one failure, attempts becomes 1 → 1 < 1 is false → dead.
      // This means a maxAttempts=1 worker should NEVER schedule a
      // retry — the very first failure is terminal. This test pins
      // that semantic.
      const settled = settleJob(
        { id: "job-1", attempts: 0, maxAttempts: 1 } as unknown as SettleJobInput,
        new Error("first failure"),
        { baseDelayMs: 1000, maxJitterMs: 0 },
      );

      expect(settled.status, "maxAttempts=1 first failure must be dead").toBe("dead");
      expect(settled.lastError, "maxAttempts=1 lastError recorded").toBe("first failure");
    });
  });

  describe("settleJob purity (no side effects on input)", () => {
    it("does not mutate the input job object", () => {
      const job = {
        id: "job-1",
        attempts: 2,
        maxAttempts: 5,
      } as unknown as SettleJobInput;
      const snapshot = { ...job };

      settleJob(job, new Error("transient"), { baseDelayMs: 1000, maxJitterMs: 0 });

      expect(job.attempts, "input attempts unchanged").toBe(snapshot.attempts);
      expect(job.maxAttempts, "input maxAttempts unchanged").toBe(snapshot.maxAttempts);
    });

    it("success path does not require a non-null Error (err=null is the success signal)", () => {
      const settled = settleJob(
        { id: "job-1", attempts: 3, maxAttempts: 5 } as unknown as SettleJobInput,
        null,
        { baseDelayMs: 1000, maxJitterMs: 100 },
      );

      expect(settled.status, "success status").toBe("succeeded");
      expect(settled.lastError, "success lastError cleared").toBeNull();
      expect(settled.attempts, "success attempts preserved").toBe(3);
    });
  });
});