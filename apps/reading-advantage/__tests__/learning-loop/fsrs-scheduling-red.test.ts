/**
 * PB-8 Red Test — FSRS scheduling after ratings
 *
 * Evidence refs: Reading M-RA-PB-8; site-closures/M-RA-PB-8.md.
 *
 * Today FSRS field updates (`due`, `stability`, `difficulty`, `state`, etc.)
 * are accepted verbatim from the request body in `lesson-controller.ts`. The
 * learning-loop contract requires that the server compute the next due date
 * from a quality rating using the FSRS algorithm.
 *
 * Falsification conditions:
 *  - If no server-side FSRS scheduler exists in the domain layer, the
 *    export assertion fails.
 *  - If a low rating does not produce an earlier due date than a high rating,
 *    the scheduling assertion fails.
 *
 * @jest-environment node
 */

import { addDays } from "date-fns";

describe("PB-8 FSRS scheduling after ratings (Red)", () => {
  it("exports a server-side FSRS scheduler from @reading-advantage/domain", () => {
    const domain = require("@reading-advantage/domain");
    expect(domain.scheduleFsrsReview).toBeDefined();
    expect(typeof domain.scheduleFsrsReview).toBe("function");
  });

  it("hard rating yields earlier due date than easy rating", () => {
    const domain = require("@reading-advantage/domain");
    const schedule = domain.scheduleFsrsReview;
    if (!schedule) {
      throw new Error("scheduleFsrsReview is not exported from @reading-advantage/domain");
    }

    const now = new Date();
    const base = {
      due: now,
      stability: 1,
      difficulty: 5,
      reps: 0,
      lapses: 0,
      state: 0,
    };

    const hard = schedule({ ...base, rating: 1 });
    const easy = schedule({ ...base, rating: 4 });

    expect(hard.due.getTime()).toBeLessThan(easy.due.getTime());
    expect(hard.due.getTime()).toBeGreaterThanOrEqual(now.getTime());
    expect(easy.due.getTime()).toBeGreaterThan(addDays(now, 1).getTime());
  });
});
