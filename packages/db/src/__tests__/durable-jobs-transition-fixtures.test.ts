import { createHash } from "node:crypto";

import { describe, expect, it } from "vitest";

import {
  durableJobCanonicalColumns,
  durableJobCanonicalRows,
  durableJobInvalidRowFixtures,
  durableJobRowFromFixture,
  durableJobRowWithoutFixtureOverrides,
  durableJobTransitionScenarioFixtures,
} from "./fixtures/durable-job-transition-counterexamples.js";

const SHA256_DIGEST = /^[0-9a-f]{64}$/;
const TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const QUEUE_NAME = /^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$/;
const JOB_NAME = /^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)+$/;

function sha256(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function expectCanonicalValueForms(
  row: Readonly<Record<string, unknown>>,
  state: string,
): void {
  expect(Object.keys(row).sort(), `${state} rows must be complete.`).toEqual(
    [...durableJobCanonicalColumns].sort(),
  );

  expect(row.job_name, `${state} job name form.`).toMatch(JOB_NAME);
  expect(row.queue_name, `${state} queue name form.`).toMatch(QUEUE_NAME);
  expect(row.payload_json, `${state} payload form.`).toEqual({
    kind: "review",
    pullRequest: 1,
  });
  expect(row.payload_fingerprint, `${state} payload digest form.`).toMatch(SHA256_DIGEST);
  expect(row.payload_fingerprint, `${state} payload digest value.`).toBe(
    sha256(row.payload_json),
  );

  for (const column of ["available_at", "created_at", "updated_at"] as const) {
    expect(row[column], `${state} ${column} form.`).toMatch(TIMESTAMP);
    expect(Date.parse(row[column] as string), `${state} ${column} value.`).not.toBeNaN();
  }
  for (const column of [
    "lease_expires_at",
    "rerun_available_at",
    "completed_at",
  ] as const) {
    if (row[column] !== null) {
      expect(row[column], `${state} ${column} form.`).toMatch(TIMESTAMP);
      expect(Date.parse(row[column] as string), `${state} ${column} value.`).not.toBeNaN();
    }
  }

  for (const column of ["lease_token_hash", "rerun_payload_fingerprint"] as const) {
    if (row[column] !== null) {
      expect(row[column], `${state} ${column} form.`).toMatch(SHA256_DIGEST);
    }
  }
  if (row.rerun_payload_json !== null) {
    expect(row.rerun_queue_name, `${state} rerun queue name form.`).toMatch(QUEUE_NAME);
    expect(row.rerun_payload_json, `${state} rerun payload form.`).toEqual({
      kind: "review-follow-up",
      pullRequest: 1,
    });
    expect(row.rerun_payload_fingerprint, `${state} rerun payload digest value.`).toBe(
      sha256(row.rerun_payload_json),
    );
  }

  for (const column of ["max_attempts", "rerun_max_attempts"] as const) {
    if (row[column] !== null) {
      expect(Number.isInteger(row[column]), `${state} ${column} integer form.`).toBe(true);
      expect(row[column], `${state} ${column} lower bound.`).toBeGreaterThanOrEqual(1);
      expect(row[column], `${state} ${column} upper bound.`).toBeLessThanOrEqual(1_000);
    }
  }
}

describe("durable job invalid-transition counterexample fixtures", () => {
  it("restores each fixture to its canonical valid state row", () => {
    for (const fixture of durableJobInvalidRowFixtures) {
      const canonical = durableJobCanonicalRows[fixture.state];
      const invalid = durableJobRowFromFixture(fixture);
      const restored = durableJobRowWithoutFixtureOverrides(fixture);
      const overrideColumns = new Set(Object.keys(fixture.overrides));

      expect(restored, `${fixture.id} must restore the canonical row.`).toEqual(canonical);
      for (const column of durableJobCanonicalColumns) {
        expect(
          Object.prototype.hasOwnProperty.call(fixture.overrides, column),
          `${fixture.id} must use known columns only.`,
        ).toBe(overrideColumns.has(column));
        if (!overrideColumns.has(column)) {
          expect(invalid[column], `${fixture.id} changed ${column} unexpectedly.`).toEqual(
            canonical[column],
          );
        }
      }
      const changedOverrideColumns = [...overrideColumns].filter(
        (column) => JSON.stringify(canonical[column]) !== JSON.stringify(invalid[column]),
      );
      expect(
        changedOverrideColumns.length,
        `${fixture.id} must change at least one intended cell.`,
      ).toBeGreaterThan(0);
    }
  });

  it("uses valid canonical digest, timestamp, queue, payload, and maximum forms", () => {
    for (const [state, row] of Object.entries(durableJobCanonicalRows)) {
      expectCanonicalValueForms(row, state);
    }
  });

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
