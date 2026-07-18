import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { IdempotencyAcquireRequest } from "../contracts/idempotency.js";
import { createPostgresDurableIdempotencyPort } from "../postgres-idempotency.js";

const PG_TEST_URL = process.env.PG_TEST_URL;
const isolatedSuite = PG_TEST_URL === undefined ? describe.skip : describe;
const KEY = `sha256:${"a".repeat(64)}` as const;
const INPUT = `sha256:${"b".repeat(64)}` as const;

function withDatabase(baseUrl: string, databaseName: string): string {
  const url = new URL(baseUrl);
  url.pathname = `/${databaseName}`;
  return url.toString();
}

function request(
  capabilityId = "kernel.atomic",
  inputFingerprint = INPUT,
): IdempotencyAcquireRequest {
  return {
    namespace: {
      capabilityId,
      scope: "tenant-capability",
      tenantId: "school-1",
    },
    keyFingerprint: KEY,
    inputFingerprint,
    retentionSeconds: 3_600,
  };
}

let admin: ReturnType<typeof postgres> | undefined;
let first: ReturnType<typeof postgres> | undefined;
let second: ReturnType<typeof postgres> | undefined;
let databaseName = "";

isolatedSuite("PostgreSQL durable idempotency adapter", () => {
  beforeAll(async () => {
    if (PG_TEST_URL === undefined) return;
    databaseName = `kernel_idempotency_${Date.now()}_${Math.random()
      .toString(36).slice(2, 8)}`;
    admin = postgres(PG_TEST_URL, { max: 1 });
    await admin.unsafe(`CREATE DATABASE "${databaseName}"`);
    const databaseUrl = withDatabase(PG_TEST_URL, databaseName);
    first = postgres(databaseUrl, { max: 1 });
    second = postgres(databaseUrl, { max: 1 });
    const migration = await readFile(
      resolve(process.cwd(), "../../packages/db/drizzle/0038_capability_idempotency_records.sql"),
      "utf8",
    );
    for (const statement of migration.split("--> statement-breakpoint")) {
      if (statement.trim().length > 0) await first.unsafe(statement);
    }
  }, 30_000);

  afterAll(async () => {
    await first?.end({ timeout: 5 });
    await second?.end({ timeout: 5 });
    if (admin !== undefined && databaseName !== "") {
      await admin.unsafe(`DROP DATABASE IF EXISTS "${databaseName}" WITH (FORCE)`);
    }
    await admin?.end({ timeout: 5 });
  }, 30_000);

  it("grants one owner across two connections then replays the settled output", async () => {
    if (first === undefined || second === undefined) {
      throw new Error("Isolated PostgreSQL clients were not initialized.");
    }
    const firstPort = createPostgresDurableIdempotencyPort(first);
    const secondPort = createPostgresDurableIdempotencyPort(second);
    const results = await Promise.all([
      firstPort.acquire<{ value: number }>(request()),
      secondPort.acquire<{ value: number }>(request()),
    ]);
    const owner = results.find((result) => result.status === "owner");
    const conflict = results.find((result) => result.status === "conflict");
    expect(owner).toMatchObject({ status: "owner" });
    expect(conflict).toMatchObject({
      status: "conflict",
      code: "IDEMPOTENCY_IN_PROGRESS",
      retryable: true,
    });
    if (owner?.status !== "owner") throw new Error("Owner was not acquired.");
    await firstPort.complete(owner.ownershipToken, { value: 7 });

    await expect(secondPort.acquire(request())).resolves.toEqual({
      status: "replay",
      output: { value: 7 },
    });
    await expect(secondPort.acquire(request(
      "kernel.atomic",
      `sha256:${"c".repeat(64)}`,
    ))).resolves.toMatchObject({
      status: "conflict",
      code: "IDEMPOTENCY_INPUT_CONFLICT",
      retryable: false,
    });
  });

  it("reacquires retryable settlement and preserves terminal settlement", async () => {
    if (first === undefined || second === undefined) {
      throw new Error("Isolated PostgreSQL clients were not initialized.");
    }
    const firstPort = createPostgresDurableIdempotencyPort(first);
    const secondPort = createPostgresDurableIdempotencyPort(second);
    const retryRequest = request("kernel.retryable");
    const acquired = await firstPort.acquire(retryRequest);
    if (acquired.status !== "owner") throw new Error("Owner was not acquired.");
    await firstPort.fail({
      ownershipToken: acquired.ownershipToken,
      error: {
        code: "TEMPORARY_FAILURE",
        message: "Please retry.",
        retryable: true,
      },
      disposition: "store-retryable",
    });
    const reacquired = await secondPort.acquire(retryRequest);
    expect(reacquired).toMatchObject({ status: "owner" });
    if (reacquired.status !== "owner") throw new Error("Retry owner missing.");
    await secondPort.fail({
      ownershipToken: reacquired.ownershipToken,
      error: {
        code: "TERMINAL_FAILURE",
        message: "The operation cannot continue.",
        retryable: false,
      },
      disposition: "store-terminal",
    });
    await expect(firstPort.acquire(retryRequest)).resolves.toMatchObject({
      status: "conflict",
      code: "IDEMPOTENCY_TERMINAL",
      retryable: false,
    });
  });

  it("enforces reject policy against a completed replay", async () => {
    if (first === undefined || second === undefined) {
      throw new Error("Isolated PostgreSQL clients were not initialized.");
    }
    const firstPort = createPostgresDurableIdempotencyPort(first);
    const secondPort = createPostgresDurableIdempotencyPort(second);
    const rejectRequest = request("kernel.reject", INPUT);
    if (firstPort.acquireWithPolicy === undefined ||
        secondPort.acquireWithPolicy === undefined) {
      throw new Error("Policy-aware acquisition is unavailable.");
    }
    const acquired = await firstPort.acquireWithPolicy(rejectRequest, "reject");
    if (acquired.status !== "owner") throw new Error("Owner was not acquired.");
    await firstPort.complete(acquired.ownershipToken, { value: 11 });
    await expect(secondPort.acquireWithPolicy(rejectRequest, "reject"))
      .resolves.toMatchObject({
      status: "conflict",
      code: "IDEMPOTENCY_REPLAY_REJECTED",
      retryable: false,
    });
  });

  it("round-trips tagged values, cycles, and shared reference topology", async () => {
    if (first === undefined || second === undefined) {
      throw new Error("Isolated PostgreSQL clients were not initialized.");
    }
    const firstPort = createPostgresDurableIdempotencyPort(first);
    const secondPort = createPostgresDurableIdempotencyPort(second);
    const taggedRequest = request("kernel.tagged-replay");
    const acquired = await firstPort.acquire(taggedRequest);
    if (acquired.status !== "owner") throw new Error("Owner was not acquired.");
    const shared = { label: "shared" };
    const cycle: { name: string; self?: unknown } = { name: "cycle" };
    cycle.self = cycle;
    const sharedBuffer = new ArrayBuffer(16);
    new Uint8Array(sharedBuffer).set([
      0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15,
    ]);
    const expression = /lesson/gy;
    expression.lastIndex = 4;
    const output = {
      count: 9_007_199_254_740_993n,
      cycle,
      dataView: new DataView(sharedBuffer, 5, 6),
      date: new Date("2026-07-18T12:34:56.000Z"),
      expression,
      independentLeft: new Uint8Array([4, 5, 6]).buffer,
      independentRight: new Uint8Array([4, 5, 6]).buffer,
      map: new Map<unknown, unknown>([
        ["first", 1],
        [shared, "shared-map-value"],
        ["last", 3],
      ]),
      set: new Set<unknown>(["first", shared, 17n]),
      sharedBuffer,
      sharedLeft: shared,
      sharedRight: shared,
      typed: new Uint16Array(sharedBuffer, 2, 3),
    };
    await firstPort.complete(acquired.ownershipToken, output);
    const replay = await secondPort.acquire<typeof output>(taggedRequest);
    expect(replay.status).toBe("replay");
    if (replay.status !== "replay") throw new Error("Replay was not returned.");
    expect(replay.output.count).toBe(output.count);
    expect(replay.output.date).toBeInstanceOf(Date);
    expect(replay.output.date.toISOString()).toBe(output.date.toISOString());
    expect(replay.output.map).toBeInstanceOf(Map);
    expect(replay.output.set).toBeInstanceOf(Set);
    expect(replay.output.typed).toBeInstanceOf(Uint16Array);
    expect([...replay.output.typed]).toEqual([...output.typed]);
    expect(replay.output.typed.buffer).toBe(replay.output.sharedBuffer);
    expect(replay.output.typed.byteOffset).toBe(2);
    expect(replay.output.typed.length).toBe(3);
    expect(replay.output.dataView).toBeInstanceOf(DataView);
    expect(replay.output.dataView.buffer).toBe(replay.output.sharedBuffer);
    expect(replay.output.dataView.byteOffset).toBe(5);
    expect(replay.output.dataView.byteLength).toBe(6);
    expect(replay.output.independentLeft)
      .not.toBe(replay.output.independentRight);
    expect([...new Uint8Array(replay.output.independentLeft)])
      .toEqual([...new Uint8Array(replay.output.independentRight)]);
    expect(replay.output.expression).toBeInstanceOf(RegExp);
    expect(replay.output.expression.lastIndex).toBe(4);
    expect(replay.output.sharedLeft).toBe(replay.output.sharedRight);
    expect(replay.output.cycle.self).toBe(replay.output.cycle);
    expect(replay.output.map.get(replay.output.sharedLeft))
      .toBe("shared-map-value");
    expect(replay.output.set.has(replay.output.sharedLeft)).toBe(true);
    const mapKeys = [...replay.output.map.keys()];
    expect(mapKeys[0]).toBe("first");
    expect(mapKeys[1]).toBe(replay.output.sharedLeft);
    expect(mapKeys[2]).toBe("last");
    const setValues = [...replay.output.set];
    expect(setValues[0]).toBe("first");
    expect(setValues[1]).toBe(replay.output.sharedLeft);
    expect(setValues[2]).toBe(17n);
  });

  it("rejects unsupported output before any partial completion write", async () => {
    if (first === undefined || second === undefined) {
      throw new Error("Isolated PostgreSQL clients were not initialized.");
    }
    const port = createPostgresDurableIdempotencyPort(first);
    const unsupportedRequest = request("kernel.unsupported-replay");
    const acquired = await port.acquire(unsupportedRequest);
    if (acquired.status !== "owner") throw new Error("Owner was not acquired.");
    await expect(port.complete(acquired.ownershipToken, {
      executable: function privateCredentialValue() {},
    })).rejects.toThrow(/unsupported/iu);
    const rows = await second<readonly {
      output_json: unknown;
      ownership_token: string | null;
      state: string;
    }[]>`
      SELECT state, ownership_token::text, output_json
        FROM capability_idempotency_records
       WHERE capability_id = 'kernel.unsupported-replay'
    `;
    expect(rows[0]).toMatchObject({
      state: "owned",
      ownership_token: acquired.ownershipToken,
      output_json: null,
    });
  });

  it("atomically reclaims expired completed and terminal rows", async () => {
    if (first === undefined || second === undefined) {
      throw new Error("Isolated PostgreSQL clients were not initialized.");
    }
    const firstPort = createPostgresDurableIdempotencyPort(first);
    const secondPort = createPostgresDurableIdempotencyPort(second);
    const completedRequest = request("kernel.expired-completed");
    const completedOwner = await firstPort.acquire(completedRequest);
    if (completedOwner.status !== "owner") throw new Error("Owner was not acquired.");
    await firstPort.complete(completedOwner.ownershipToken, { value: 13 });
    await first`
      UPDATE capability_idempotency_records
         SET expires_at = now() - interval '1 second'
       WHERE capability_id = 'kernel.expired-completed'
    `;

    const replacementInput = `sha256:${"d".repeat(64)}` as const;
    const replacementRequest = request(
      "kernel.expired-completed",
      replacementInput,
    );
    const completedResults = await Promise.all([
      firstPort.acquire(replacementRequest),
      secondPort.acquire(replacementRequest),
    ]);
    expect(completedResults.filter((result) => result.status === "owner"))
      .toHaveLength(1);
    expect(completedResults.filter((result) => result.status === "conflict"))
      .toHaveLength(1);
    const replacementOwner = completedResults.find(
      (result) => result.status === "owner",
    );
    if (replacementOwner?.status !== "owner") {
      throw new Error("Replacement owner was not acquired.");
    }
    await firstPort.complete(replacementOwner.ownershipToken, { value: 17 });

    const terminalRequest = request("kernel.expired-terminal");
    const terminalOwner = await firstPort.acquire(terminalRequest);
    if (terminalOwner.status !== "owner") throw new Error("Owner was not acquired.");
    await firstPort.fail({
      ownershipToken: terminalOwner.ownershipToken,
      error: {
        code: "TERMINAL_FAILURE",
        message: "The operation cannot continue.",
        retryable: false,
      },
      disposition: "store-terminal",
    });
    await first`
      UPDATE capability_idempotency_records
         SET expires_at = now() - interval '1 second'
       WHERE capability_id = 'kernel.expired-terminal'
    `;
    const terminalReplacement = await secondPort.acquire(request(
      "kernel.expired-terminal",
      replacementInput,
    ));
    expect(terminalReplacement).toMatchObject({ status: "owner" });
    const rows = await first<readonly {
      error_json: unknown;
      input_fingerprint: string;
      output_json: unknown;
      state: string;
    }[]>`
      SELECT state, input_fingerprint, output_json, error_json
        FROM capability_idempotency_records
       WHERE capability_id = 'kernel.expired-terminal'
    `;
    expect(rows[0]).toMatchObject({
      state: "owned",
      input_fingerprint: replacementInput,
      output_json: null,
      error_json: null,
    });
  });

  it("rolls back ownership when the database rejects an acquisition", async () => {
    if (first === undefined || second === undefined) {
      throw new Error("Isolated PostgreSQL clients were not initialized.");
    }
    await first.unsafe(`
      CREATE FUNCTION reject_kernel_rollback() RETURNS trigger AS $$
      BEGIN
        IF NEW.capability_id = 'kernel.rollback' THEN
          RAISE EXCEPTION 'forced isolated rollback';
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);
    await first.unsafe(`
      CREATE TRIGGER capability_idempotency_force_rollback
      AFTER INSERT ON capability_idempotency_records
      FOR EACH ROW EXECUTE FUNCTION reject_kernel_rollback()
    `);
    const port = createPostgresDurableIdempotencyPort(first);
    await expect(port.acquire(request("kernel.rollback"))).rejects.toThrow(
      /forced isolated rollback/u,
    );
    const rows = await second<readonly { count: number }[]>`
      SELECT count(*)::int AS count
        FROM capability_idempotency_records
       WHERE capability_id = 'kernel.rollback'
    `;
    expect(rows[0]?.count).toBe(0);
  });
});

describe("PostgreSQL idempotency isolation gate", () => {
  it("uses PG_TEST_URL only and never falls back to a runtime database URL", async () => {
    const source = await readFile(new URL(import.meta.url), "utf8");
    expect(source).toContain("process.env.PG_TEST_URL");
    const runtimeUrlName = ["DATABASE", "URL"].join("_");
    const directUrlName = ["DIRECT", "DATABASE", "URL"].join("_");
    expect(source).not.toContain(`process.env.${runtimeUrlName}`);
    expect(source).not.toContain(`process.env.${directUrlName}`);
  });
});
