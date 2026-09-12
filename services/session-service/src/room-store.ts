import { Redis } from "ioredis";
import { z } from "zod";

import {
  playerSchema,
  rankingEntrySchema,
  roomPhaseSchema,
  submissionSchema,
  type RoomState,
} from "@reading-advantage/game-contracts";

/** Strict schema for one server-attributed word submission stored in a room. */
export const storedSubmissionSchema = submissionSchema
  .extend({ userId: z.string().min(1) })
  .strict();

/** Strict schema for the round metadata persisted with a room. */
export const storedRoundSchema = z
  .object({
    roundId: z.string().min(1),
    seed: z.string().min(1),
    targetSequence: z.array(z.string().min(1)).min(1),
  })
  .strict();

/**
 * Strict schema for the persisted room record: the contract `RoomState`
 * surface plus tenant binding, active round, submissions, and ranking.
 */
export const storedRoomSchema = z
  .object({
    roomCode: z.string().min(1),
    tenantId: z.string().min(1),
    phase: roomPhaseSchema,
    hostUserId: z.string().min(1),
    players: z.array(playerSchema),
    currentRound: z.number().int().min(1).optional(),
    round: storedRoundSchema.optional(),
    submissions: z.array(storedSubmissionSchema).default([]),
    ranking: z.array(rankingEntrySchema).default([]),
    updatedAtMs: z.number().int(),
  })
  .strict();

/** The strict persisted-room type shared by every store implementation. */
export type StoredRoom = z.infer<typeof storedRoomSchema>;

/** The strict per-room round metadata persisted with the room. */
export type StoredRound = z.infer<typeof storedRoundSchema>;

/** The strict server-attributed submission persisted with the room. */
export type StoredSubmission = z.infer<typeof storedSubmissionSchema>;

/**
 * The durable room-state boundary. Implementations must survive the owning
 * socket process being replaced, and must not alias caller-provided records.
 */
export interface RoomStore {
  /**
   * Loads one room record.
   * @param roomId The room identifier to load.
   * @returns The stored room, or null when no record exists.
   */
  get(roomId: string): Promise<StoredRoom | null>;
  /**
   * Persists one room record, replacing any prior record with the same code.
   * @param room The validated room record to persist.
   * @throws When the record fails the stored-room schema.
   */
  put(room: StoredRoom): Promise<void>;
  /**
   * Removes one room record.
   * @param roomId The room identifier to remove.
   */
  delete(roomId: string): Promise<void>;
  /**
   * Lists every room record bound to a tenant.
   * @param tenantId The tenant whose rooms should be listed.
   * @returns The tenant's room records.
   */
  listByTenant?(tenantId: string): Promise<StoredRoom[]>;
}

/**
 * Builds a fresh lobby-phase room record for a tenant.
 * @param input The room code, tenant, and host identity that seed the room.
 * @returns A lobby-phase stored room whose creator is the connected host.
 */
export function createStoredRoom(input: {
  roomCode: string;
  tenantId: string;
  hostUserId: string;
  hostDisplayName: string;
}): StoredRoom {
  return {
    roomCode: input.roomCode,
    tenantId: input.tenantId,
    phase: "lobby",
    hostUserId: input.hostUserId,
    players: [
      {
        userId: input.hostUserId,
        displayName: input.hostDisplayName,
        role: "host",
        connection: "connected",
      },
    ],
    submissions: [],
    ranking: [],
    updatedAtMs: Date.now(),
  };
}

/**
 * Projects the contract-visible room state from a stored record.
 * @param room The stored room record.
 * @returns The `RoomState` surface carried by lobby_update broadcasts.
 */
export function toRoomState(room: StoredRoom): RoomState {
  return {
    roomCode: room.roomCode,
    phase: room.phase,
    hostUserId: room.hostUserId,
    players: room.players,
    ...(room.currentRound === undefined ? {} : { currentRound: room.currentRound }),
  };
}

/**
 * In-memory store for development and tests. Rooms die with the process.
 */
export class InMemoryRoomStore implements RoomStore {
  private readonly rooms = new Map<string, StoredRoom>();

  async get(roomId: string): Promise<StoredRoom | null> {
    const room = this.rooms.get(roomId);
    return room === undefined ? null : structuredClone(room);
  }

  async put(room: StoredRoom): Promise<void> {
    const validated = storedRoomSchema.parse(room);
    this.rooms.set(validated.roomCode, structuredClone(validated));
  }

  async delete(roomId: string): Promise<void> {
    this.rooms.delete(roomId);
  }

  async listByTenant(tenantId: string): Promise<StoredRoom[]> {
    return [...this.rooms.values()]
      .filter((room) => room.tenantId === tenantId)
      .map((room) => structuredClone(room));
  }
}

/**
 * Redis-backed store for multi-instance operation. Records are JSON under a
 * configurable key prefix; the same store instance is shared across processes.
 */
export class RedisRoomStore implements RoomStore {
  private readonly client: Redis;
  private readonly keyPrefix: string;

  /**
   * Creates a Redis-backed room store.
   * @param client The ioredis client used for all commands.
   * @param options Key namespace options for the store.
   */
  constructor(client: Redis, options?: { keyPrefix?: string }) {
    this.client = client;
    this.keyPrefix = options?.keyPrefix ?? "session-service:room:";
    this.client.on("error", (error: Error) => {
      process.stderr.write(
        `${JSON.stringify({
          level: "error",
          event: "session-store.redis_error",
          message: error.message,
        })}\n`,
      );
    });
  }

  private key(roomId: string): string {
    return `${this.keyPrefix}${roomId}`;
  }

  async get(roomId: string): Promise<StoredRoom | null> {
    const raw = await this.client.get(this.key(roomId));
    if (raw === null) return null;
    return storedRoomSchema.parse(JSON.parse(raw));
  }

  async put(room: StoredRoom): Promise<void> {
    const validated = storedRoomSchema.parse(room);
    await this.client.set(this.key(validated.roomCode), JSON.stringify(validated));
  }

  async delete(roomId: string): Promise<void> {
    await this.client.del(this.key(roomId));
  }

  async listByTenant(tenantId: string): Promise<StoredRoom[]> {
    const rooms: StoredRoom[] = [];
    const stream: AsyncIterable<string[]> = this.client.scanStream({
      match: `${this.keyPrefix}*`,
      count: 100,
    });
    for await (const keys of stream) {
      if (keys.length === 0) continue;
      const raws = await this.client.mget(keys);
      for (const raw of raws) {
        if (raw === null) continue;
        const room = storedRoomSchema.parse(JSON.parse(raw));
        if (room.tenantId === tenantId) rooms.push(room);
      }
    }
    return rooms;
  }
}

/** Strict env-derived store selection contract for the service. */
export const roomStoreConfigSchema = z.discriminatedUnion("kind", [
  z
    .object({ kind: z.literal("memory"), keyPrefix: z.string().optional() })
    .strict(),
  z
    .object({
      kind: z.literal("redis"),
      redisUrl: z.string().min(1),
      keyPrefix: z.string().optional(),
    })
    .strict(),
]);

/** The strict room-store configuration union. */
export type RoomStoreConfig = z.infer<typeof roomStoreConfigSchema>;

/**
 * Builds the store selected by a validated configuration.
 * @param config The store selection, either in-memory or Redis-backed.
 * @returns The selected room store implementation.
 * @throws When a redis configuration omits the connection URL.
 */
export function createRoomStore(config: RoomStoreConfig): RoomStore {
  if (config.kind === "redis") {
    return new RedisRoomStore(new Redis(config.redisUrl), {
      keyPrefix: config.keyPrefix,
    });
  }
  return new InMemoryRoomStore();
}
