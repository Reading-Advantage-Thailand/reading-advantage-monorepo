import { randomUUID } from "node:crypto";

import { afterAll, describe, expect, it } from "vitest";
import { Redis } from "ioredis";

import {
  RedisRoomStore,
  createRoomStore,
  createStoredRoom,
  type RoomStore,
  type StoredRoom,
} from "../room-store.js";

/**
 * Builds a canonical lobby-phase room record for the contract cases.
 * @param roomCode The room identifier to persist.
 * @param tenantId The tenant that owns the room.
 * @returns A fresh lobby-phase stored room owned by the given tenant.
 */
function makeRoom(roomCode: string, tenantId: string): StoredRoom {
  return createStoredRoom({
    roomCode,
    tenantId,
    hostUserId: `host-${roomCode}`,
    hostDisplayName: `Host ${roomCode}`,
  });
}

/**
 * Runs the full store contract suite against one store factory.
 * @param create Builds a fresh, empty store instance per call.
 */
function runContractSuite(create: () => RoomStore): void {
  it("returns null for a missing room", async () => {
    const store = create();
    await expect(store.get("RA-0000")).resolves.toBeNull();
  });

  it("round-trips a stored room through get", async () => {
    const store = create();
    const room = makeRoom("RA-7F3A", "tenant-1");
    await store.put(room);
    const got = await store.get("RA-7F3A");
    expect(got).toEqual(room);
    expect(got?.phase).toBe("lobby");
    expect(got?.players).toEqual([
      {
        userId: "host-RA-7F3A",
        displayName: "Host RA-7F3A",
        role: "host",
        connection: "connected",
      },
    ]);
  });

  it("returns the latest record after an overwrite", async () => {
    const store = create();
    const room = makeRoom("RA-7F3A", "tenant-1");
    await store.put(room);
    room.phase = "playing";
    room.currentRound = 1;
    room.round = {
      roundId: "r1",
      seed: "seed-1",
      targetSequence: ["dragon", "castle", "wizard"],
    };
    await store.put(room);
    const got = await store.get("RA-7F3A");
    expect(got?.phase).toBe("playing");
    expect(got?.currentRound).toBe(1);
    expect(got?.round).toEqual({
      roundId: "r1",
      seed: "seed-1",
      targetSequence: ["dragon", "castle", "wizard"],
    });
  });

  it("rejects a malformed record at put", async () => {
    const store = create();
    const room = makeRoom("RA-7F3A", "tenant-1");
    await expect(
      store.put({ ...room, phase: "nonsense" } as unknown as StoredRoom),
    ).rejects.toThrow();
  });

  it("deletes a room and tolerates a second delete", async () => {
    const store = create();
    await store.put(makeRoom("RA-7F3A", "tenant-1"));
    await store.delete("RA-7F3A");
    await expect(store.get("RA-7F3A")).resolves.toBeNull();
    await expect(store.delete("RA-7F3A")).resolves.toBeUndefined();
  });

  it("lists only rooms belonging to the requested tenant", async () => {
    const store = create();
    await store.put(makeRoom("RA-0001", "tenant-1"));
    await store.put(makeRoom("RA-0002", "tenant-2"));
    await store.put(makeRoom("RA-0003", "tenant-1"));
    const list = await store.listByTenant?.("tenant-1");
    expect(list).toBeDefined();
    expect(list?.map((room) => room.roomCode).sort()).toEqual([
      "RA-0001",
      "RA-0003",
    ]);
  });

  it("persists submissions and ranking alongside the room record", async () => {
    const store = create();
    const room = makeRoom("RA-7F3A", "tenant-1");
    room.submissions = [
      {
        roundId: "r1",
        answer: "dragon",
        clientTimestampMs: 1_700_000_000_000,
        userId: "user-player",
      },
    ];
    room.ranking = [{ userId: "user-player", score: 100, correctCount: 2 }];
    await store.put(room);
    const got = await store.get("RA-7F3A");
    expect(got?.submissions).toHaveLength(1);
    expect(got?.submissions[0]?.userId).toBe("user-player");
    expect(got?.ranking).toEqual([
      { userId: "user-player", score: 100, correctCount: 2 },
    ]);
  });
}

describe("room store contract suite (in-memory)", () => {
  runContractSuite(() => createRoomStore({ kind: "memory" }));
});

let redisClient: Redis | null = null;

/**
 * Builds a Redis-backed store on the shared test client with an isolated key prefix.
 * @returns A RedisRoomStore instance that cannot collide with other test stores.
 */
function createIsolatedRedisStore(): RoomStore {
  redisClient ??= new Redis(process.env.REDIS_URL!);
  return new RedisRoomStore(redisClient, {
    keyPrefix: `contract:${randomUUID()}:`,
  });
}

afterAll(async () => {
  await redisClient?.quit();
  redisClient = null;
});

describe.skipIf(!process.env.REDIS_URL)(
  "room store contract suite (redis) — skipped unless REDIS_URL is set",
  () => {
    runContractSuite(createIsolatedRedisStore);
  },
);
