import { describe, expect, it } from "vitest";

import {
  durableJobInvalidRowFixtures,
  durableJobTransitionScenarioFixtures,
} from "./fixtures/durable-job-transition-counterexamples.js";

describe("durable job invalid-transition counterexample fixtures", () => {
  it("enumerates every partial lease and rerun tuple without duplicate IDs", () => {
    const ids = durableJobInvalidRowFixtures.map(({ id }) => id);
    const leasePartials = ids.filter((id) => id.startsWith("lease-partial-"));
    const rerunPartials = ids.filter((id) => id.startsWith("rerun-partial-"));

    expect(new Set(ids).size, "Counterexample IDs must be unique.").toBe(ids.length);
    expect(leasePartials, "Three all-or-none lease fields have six partial tuples.").toHaveLength(6);
    expect(rerunPartials, "Five all-or-none rerun fields have thirty partial tuples.").toHaveLength(30);
  });

  it("covers every state truth-table exclusion and the dead-attempt-zero discrepancy", () => {
    const ids = new Set(durableJobInvalidRowFixtures.map(({ id }) => id));
    const required = [
      "pending-with-lease",
      "pending-with-result",
      "pending-with-completion",
      "pending-with-rerun",
      "running-attempt-zero",
      "running-without-lease",
      "running-with-result",
      "running-with-completion",
      "running-with-redelivery-marker",
      "succeeded-without-result",
      "succeeded-with-error",
      "succeeded-without-completion",
      "succeeded-with-lease",
      "succeeded-with-rerun",
      "succeeded-with-redelivery",
      "dead-attempt-zero",
      "dead-with-result",
      "dead-without-error",
      "dead-without-completion",
      "dead-with-lease",
      "dead-with-rerun",
      "dead-with-redelivery",
      "legacy-failed-with-result",
      "legacy-failed-without-error",
      "legacy-failed-without-completion",
      "legacy-failed-with-lease",
      "legacy-failed-with-rerun",
      "legacy-failed-with-redelivery",
    ];

    expect(required.filter((id) => !ids.has(id)), "Missing truth-table fixture IDs.").toEqual([]);
  });

  it("covers tenant, bounds, tuple equivalence, and max-attempt redelivery exclusions", () => {
    const ids = new Set(durableJobInvalidRowFixtures.map(({ id }) => id));
    const required = [
      "global-with-tenant-id",
      "tenant-with-null-id",
      "tenant-with-empty-id",
      "tenant-id-over-bound",
      "negative-attempt",
      "attempt-over-maximum",
      "zero-maximum",
      "maximum-over-bound",
      "zero-generation",
      "safe-error-code-only",
      "safe-error-summary-only",
      "rerun-columns-with-flag-false",
      "rerun-flag-with-null-columns",
      "rerun-maximum-under-bound",
      "rerun-maximum-over-bound",
      "pending-at-maximum-without-redelivery",
      "pending-zero-with-redelivery",
    ];

    expect(required.filter((id) => !ids.has(id)), "Missing cross-state fixture IDs.").toEqual([]);
  });

  it("freezes H1 attempt semantics and H3 complete-snapshot race orders", () => {
    const ids = new Set(durableJobTransitionScenarioFixtures.map(({ id }) => id));
    const required = [
      "fresh-claim-increments-once",
      "business-retry-starts-next-ordinal",
      "max-attempt-crash-redelivers-same-ordinal",
      "repeated-expiry-retains-ordinal",
      "replay-resets-generation",
      "rerun-promotion-resets-generation",
      "active-enqueue-queue-move-and-lower-maximum",
      "active-enqueue-raises-maximum",
      "active-enqueue-last-commit-wins-complete-snapshot",
      "settle-then-enqueue-lock-order",
      "enqueue-then-settle-lock-order",
      "fail-then-enqueue-lock-order",
      "enqueue-then-fail-lock-order",
      "reclaim-then-enqueue-lock-order",
      "enqueue-then-reclaim-lock-order",
    ];

    expect(required.filter((id) => !ids.has(id)), "Missing transition scenario IDs.").toEqual([]);
    expect(
      durableJobTransitionScenarioFixtures.filter(({ finding }) => finding === "T5-H1"),
      "H1 fixtures must cover claim, retry, repeated expiry, max crash, replay, and rerun reset.",
    ).toHaveLength(6);
    expect(
      durableJobTransitionScenarioFixtures.filter(({ finding }) => finding === "T5-H3"),
      "H3 fixtures must cover queue/max snapshots, last-commit-wins, and both orders for three races.",
    ).toHaveLength(9);
  });
});
