import { describe, expect, it } from "vitest";

import { scriptedSql } from "../../__tests__/support/scripted-sql.js";
import type { IdempotencyAcquireRequest } from "../contracts/idempotency.js";
import { encodeDurableValue } from "../durable-value.js";
import { createPostgresDurableIdempotencyPort } from "../postgres-idempotency.js";

const KEY = `sha256:${"a".repeat(64)}` as const;
const INPUT = `sha256:${"b".repeat(64)}` as const;
const OTHER_INPUT = `sha256:${"c".repeat(64)}` as const;
const TOKEN = "33333333-3333-4333-8333-333333333333";

/**
 * Builds a valid acquisition request.
 * @param overrides Fields that replace the tenant-scoped defaults.
 * @returns A request for the kernel adapter.
 */
function request(overrides: Partial<IdempotencyAcquireRequest> = {}): IdempotencyAcquireRequest {
  return {
    namespace: { capabilityId: "kernel.atomic", scope: "tenant-capability", tenantId: "school-1" },
    keyFingerprint: KEY,
    inputFingerprint: INPUT,
    retentionSeconds: 3_600,
    ...overrides,
  };
}

const failure = { code: "SOME_FAILURE", message: "It failed.", retryable: false };

describe("kernel PostgreSQL durable idempotency adapter", () => {
  it("returns owner when the insert claims a new key in one transaction", async () => {
    const db = scriptedSql([[{ ownership_token: TOKEN }]]);
    const port = createPostgresDurableIdempotencyPort(db.sql);

    await expect(port.acquire(request())).resolves.toEqual({ status: "owner", ownershipToken: TOKEN });
    expect(db.transactions()).toBe(1);
    expect(db.statements).toHaveLength(1);
    expect(db.statements[0]).toContain("ON CONFLICT");
    expect(db.bindings[0]).toEqual(expect.arrayContaining(["kernel.atomic", "tenant-capability", "school-1", KEY, INPUT, 3_600]));
  });

  it("uses the global tenant key for global-capability scope", async () => {
    const db = scriptedSql([[{ ownership_token: TOKEN }]]);
    const port = createPostgresDurableIdempotencyPort(db.sql);

    await port.acquire(request({ namespace: { capabilityId: "kernel.atomic", scope: "global-capability" } }));
    expect(db.bindings[0]).toContain("__global__");
  });

  it("rejects an invalid request before any SQL runs", async () => {
    const db = scriptedSql([]);
    const port = createPostgresDurableIdempotencyPort(db.sql);

    await expect(port.acquire(request({ namespace: { capabilityId: "kernel.atomic", scope: "tenant-capability" } }))).rejects.toThrow();
    await expect(port.acquire(request({ retentionSeconds: 0 }))).rejects.toThrow();
    expect(db.statements).toHaveLength(0);
  });

  it("throws when the conflicting row disappears", async () => {
    const db = scriptedSql([[], []]);
    const port = createPostgresDurableIdempotencyPort(db.sql);

    await expect(port.acquire(request())).rejects.toThrow("Idempotency row disappeared during atomic acquisition.");
  });

  it("reclaims an expired row as a new owner", async () => {
    const db = scriptedSql([[], [{ input_fingerprint: OTHER_INPUT, state: "completed", output_json: null }], [{ ownership_token: TOKEN }]]);
    const port = createPostgresDurableIdempotencyPort(db.sql);

    await expect(port.acquire(request())).resolves.toEqual({ status: "owner", ownershipToken: TOKEN });
    expect(db.statements[2]).toContain("expires_at <= now()");
  });

  it("reports an input conflict when the key is reused with another input", async () => {
    const db = scriptedSql([[], [{ input_fingerprint: OTHER_INPUT, state: "completed", output_json: null }], []]);
    const port = createPostgresDurableIdempotencyPort(db.sql);

    await expect(port.acquire(request())).resolves.toEqual({ status: "conflict", code: "IDEMPOTENCY_INPUT_CONFLICT", retryable: false });
  });

  it("replays the decoded output of a completed row", async () => {
    const output = { value: 42, label: "done" };
    const db = scriptedSql([[], [{ input_fingerprint: INPUT, state: "completed", output_json: encodeDurableValue(output) }], []]);
    const port = createPostgresDurableIdempotencyPort(db.sql);

    await expect(port.acquire(request())).resolves.toEqual({ status: "replay", output });
  });

  it("throws when a completed row has no replay output", async () => {
    const db = scriptedSql([[], [{ input_fingerprint: INPUT, state: "completed", output_json: null }], []]);
    const port = createPostgresDurableIdempotencyPort(db.sql);

    await expect(port.acquire(request())).rejects.toThrow("Completed idempotency row is missing replay output.");
  });

  it("rejects replay of a completed row when the policy is reject", async () => {
    const db = scriptedSql([[], [{ input_fingerprint: INPUT, state: "completed", output_json: null }], []]);
    const port = createPostgresDurableIdempotencyPort(db.sql);

    await expect(port.acquireWithPolicy?.(request(), "reject")).resolves.toEqual({ status: "conflict", code: "IDEMPOTENCY_REPLAY_REJECTED", retryable: false });
  });

  it("rejects an unknown conflict policy before any SQL runs", async () => {
    const db = scriptedSql([]);
    const port = createPostgresDurableIdempotencyPort(db.sql);

    await expect(port.acquireWithPolicy?.(request(), "ignore" as never)).rejects.toThrow();
    expect(db.statements).toHaveLength(0);
  });

  it("reports a terminal row as a non-retryable conflict", async () => {
    const db = scriptedSql([[], [{ input_fingerprint: INPUT, state: "terminal", output_json: null }], []]);
    const port = createPostgresDurableIdempotencyPort(db.sql);

    await expect(port.acquire(request())).resolves.toEqual({ status: "conflict", code: "IDEMPOTENCY_TERMINAL", retryable: false });
  });

  it("takes ownership of a retryable row", async () => {
    const db = scriptedSql([[], [{ input_fingerprint: INPUT, state: "retryable", output_json: null }], [], [{ ownership_token: TOKEN }]]);
    const port = createPostgresDurableIdempotencyPort(db.sql);

    await expect(port.acquireWithPolicy?.(request(), "replay")).resolves.toEqual({ status: "owner", ownershipToken: TOKEN });
    expect(db.statements[3]).toContain("state = 'retryable'");
  });

  it("reports an owned row as a retryable in-progress conflict", async () => {
    const db = scriptedSql([[], [{ input_fingerprint: INPUT, state: "owned", output_json: null }], [], []]);
    const port = createPostgresDurableIdempotencyPort(db.sql);

    await expect(port.acquire(request())).resolves.toEqual({ status: "conflict", code: "IDEMPOTENCY_IN_PROGRESS", retryable: true });
  });

  it("stores the encoded output on completion", async () => {
    const db = scriptedSql([[{ id: "1" }]]);
    const port = createPostgresDurableIdempotencyPort(db.sql);

    await port.complete(TOKEN, { value: 1 });
    expect(db.statements[0]).toContain("SET state = 'completed'");
    expect(db.bindings[0]).toEqual([encodeDurableValue({ value: 1 }), TOKEN]);
  });

  it("throws when completion matches no owned row", async () => {
    const db = scriptedSql([[]]);
    const port = createPostgresDurableIdempotencyPort(db.sql);

    await expect(port.complete(TOKEN, { value: 1 })).rejects.toThrow("Idempotency completion lost ownership.");
  });

  it("deletes the row on a release settlement", async () => {
    const db = scriptedSql([[{ id: "1" }]]);
    const port = createPostgresDurableIdempotencyPort(db.sql);

    await port.fail({ ownershipToken: TOKEN, error: failure, disposition: "release" });
    expect(db.statements[0]).toContain("DELETE FROM capability_idempotency_records");
  });

  it("throws when a release matches no owned row", async () => {
    const db = scriptedSql([[]]);
    const port = createPostgresDurableIdempotencyPort(db.sql);

    await expect(port.fail({ ownershipToken: TOKEN, error: failure, disposition: "release" })).rejects.toThrow("Idempotency release lost ownership.");
  });

  it.each([
    ["store-retryable", "retryable"],
    ["store-terminal", "terminal"],
  ] as const)("stores the %s settlement as state %s", async (disposition, state) => {
    const db = scriptedSql([[{ id: "1" }]]);
    const port = createPostgresDurableIdempotencyPort(db.sql);

    await port.fail({ ownershipToken: TOKEN, error: failure, disposition });
    expect(db.bindings[0]).toEqual([state, failure, TOKEN]);
  });

  it("throws when a stored settlement matches no owned row", async () => {
    const db = scriptedSql([[]]);
    const port = createPostgresDurableIdempotencyPort(db.sql);

    await expect(port.fail({ ownershipToken: TOKEN, error: failure, disposition: "store-terminal" })).rejects.toThrow("Idempotency failure settlement lost ownership.");
  });

  it("rejects an invalid settlement before any SQL runs", async () => {
    const db = scriptedSql([]);
    const port = createPostgresDurableIdempotencyPort(db.sql);

    await expect(port.fail({ ownershipToken: "", error: failure, disposition: "release" })).rejects.toThrow();
    expect(db.statements).toHaveLength(0);
  });
});
