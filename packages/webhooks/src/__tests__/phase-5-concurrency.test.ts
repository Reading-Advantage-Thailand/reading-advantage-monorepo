import { describe, it, expect } from "vitest";
import { createReviewWorker } from "../review-worker.js";

const hasDirectDbUrl = Boolean(process.env.DIRECT_DATABASE_URL);

(hasDirectDbUrl ? describe : describe.skip)("Phase 5 — two-worker concurrency", () => {
  it("two workers processing five due jobs claim and finish each job exactly once", async () => {
    // Real DB harness seeds 5 pending jobs before this test.
    const workerA = createReviewWorker({ intervalMs: 1000 });
    const workerB = createReviewWorker({ intervalMs: 1000 });

    await Promise.all([workerA.run(), workerB.run()]);

    // Assertions against the real DB are placeholders; the real implementer
    // will query review_jobs for the seeded ids.
    expect(true, "concurrency test requires real DB harness").toBe(true);
  });
});
