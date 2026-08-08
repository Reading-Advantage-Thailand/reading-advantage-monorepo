import { randomUUID } from "node:crypto";
import type { AddressInfo } from "node:net";

import { afterAll, describe, expect, it } from "vitest";
import { Redis } from "ioredis";
import { io as ioc, type Socket as ClientSocket } from "socket.io-client";
import type {
  LobbyUpdateMessage,
  RoundStartMessage,
} from "@reading-advantage/game-contracts";

import {
  RedisRoomStore,
  createRoomStore,
  type RoomStore,
} from "../room-store.js";
import {
  createSessionServer,
  type AuthenticateHook,
  type SessionServer,
} from "../server.js";

const REDIS_URL = process.env.REDIS_URL;
const redisClient = REDIS_URL ? new Redis(REDIS_URL) : null;

afterAll(async () => {
  await redisClient?.quit();
});

/**
 * Builds the store shared by both simulated server instances.
 * @returns A Redis-backed store when REDIS_URL is set, otherwise a shared in-memory store.
 */
function createSharedStore(): RoomStore {
  if (redisClient) {
    return new RedisRoomStore(redisClient, {
      keyPrefix: `recovery:${randomUUID()}:`,
    });
  }
  return createRoomStore({ kind: "memory" });
}

/**
 * Maps a test-supplied auth token onto a fixed server-side identity.
 * @param socket The connecting socket whose handshake carries the token.
 * @returns The identity the server binds to the connection.
 */
const identityFromToken: AuthenticateHook = (socket) => {
  const token = String(socket.handshake.auth.token ?? "dev");
  return { userId: `user-${token}`, displayName: `Player ${token}`, tenantId: "tenant-1" };
};

/**
 * Starts one simulated server instance on an ephemeral port.
 * @param store The room store the instance persists through.
 * @returns The running instance and its bound port.
 */
async function startServer(
  store: RoomStore,
): Promise<{ server: SessionServer; port: number }> {
  const server = createSessionServer({ store, authenticate: identityFromToken });
  await new Promise<void>((resolve) => {
    server.httpServer.listen(0, "127.0.0.1", () => resolve());
  });
  const { port } = server.httpServer.address() as AddressInfo;
  return { server, port };
}

/**
 * Opens a client socket carrying a fixed auth token.
 * @param port The server port to connect to.
 * @param token The auth token that maps to the connection identity.
 * @returns The connected client socket.
 */
async function connect(port: number, token: string): Promise<ClientSocket> {
  const socket = ioc(`http://127.0.0.1:${port}`, {
    transports: ["websocket"],
    reconnection: false,
    auth: { token },
  });
  await new Promise<void>((resolve, reject) => {
    socket.on("connect", () => resolve());
    socket.on("connect_error", reject);
  });
  return socket;
}

/**
 * Resolves with the first occurrence of a socket.io event.
 * @param socket The client socket to observe.
 * @param event The event name to await.
 * @returns The emitted payload.
 */
function once<T = unknown>(socket: ClientSocket, event: string): Promise<T> {
  return new Promise((resolve) => socket.once(event, resolve));
}

/**
 * Runs the hello/welcome/join handshake for one client.
 * @param socket The connected client socket.
 * @param roomCode The room to join.
 * @param displayName The display name presented at join.
 * @returns The lobby_update broadcast after the join.
 */
async function joinRoom(
  socket: ClientSocket,
  roomCode: string,
  displayName: string,
): Promise<LobbyUpdateMessage> {
  socket.emit("client_hello", {
    v: 1,
    type: "client_hello",
    payload: { v: 1 },
  });
  await once(socket, "welcome");
  socket.emit("join_room", {
    v: 1,
    type: "join_room",
    payload: { roomCode, displayName },
  });
  return once<LobbyUpdateMessage>(socket, "lobby_update");
}

/**
 * Polls until the assertion passes or the timeout elapses.
 * @param assertion The condition to satisfy.
 * @param timeoutMs The polling budget in milliseconds.
 * @throws The last assertion error when the budget elapses.
 */
async function waitFor(
  assertion: () => void | Promise<void>,
  timeoutMs = 2000,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  let lastError: unknown;
  while (Date.now() < deadline) {
    try {
      await assertion();
      return;
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw lastError instanceof Error ? lastError : new Error("waitFor timed out");
}

describe("room recovery after simulated instance loss", () => {
  it("recovers phase, roster, round, and connection state from the shared store", async () => {
    const store = createSharedStore();

    // Instance A: create the room, join two players, advance to a round.
    const A = await startServer(store);
    const host = await connect(A.port, "host");
    const player = await connect(A.port, "player");

    const hostLobby = await joinRoom(host, "RA-7F3A", "Kru Nok");
    expect(hostLobby.payload.phase).toBe("lobby");
    expect(hostLobby.payload.hostUserId).toBe("user-host");
    expect(hostLobby.payload.players).toHaveLength(1);

    const playerLobby = await joinRoom(player, "RA-7F3A", "Mali");
    expect(playerLobby.payload.players).toHaveLength(2);

    const roundStart = once<RoundStartMessage>(player, "round_start");
    await A.server.commands.startRound({
      roomCode: "RA-7F3A",
      roundId: "r1",
      seed: "seed-1",
      targetSequence: ["dragon", "castle", "wizard"],
    });
    expect((await roundStart).payload.seed).toBe("seed-1");

    player.emit("submission", {
      v: 1,
      type: "submission",
      payload: { roundId: "r1", answer: "dragon", clientTimestampMs: 1_700_000_000_000 },
    });
    await waitFor(async () => {
      const stored = await store.get("RA-7F3A");
      expect(stored?.submissions).toHaveLength(1);
    });

    // Simulated instance loss: close A entirely.
    await A.server.close();
    host.disconnect();
    player.disconnect();

    // The shared store must hold the room with both players disconnected.
    await waitFor(async () => {
      const stored = await store.get("RA-7F3A");
      expect(
        stored?.players.every((entry) => entry.connection === "disconnected"),
      ).toBe(true);
    });
    const afterLoss = await store.get("RA-7F3A");
    expect(afterLoss?.phase).toBe("playing");
    expect(afterLoss?.currentRound).toBe(1);
    expect(afterLoss?.round?.seed).toBe("seed-1");

    // Instance B boots against the SAME store and a player reconnects by userId.
    const B = await startServer(store);
    const recovered = await connect(B.port, "player");
    const recoveredLobby = await joinRoom(recovered, "RA-7F3A", "Mali");

    // The room phase survived the instance loss instead of resetting to lobby.
    expect(recoveredLobby.payload.phase).toBe("playing");
    expect(recoveredLobby.payload.currentRound).toBe(1);

    // The roster is recovered; the host stays disconnected while the
    // reconnecting player's connection state flips back to connected.
    const roster = recoveredLobby.payload.players;
    expect(roster).toHaveLength(2);
    expect(
      roster.find((entry) => entry.userId === "user-host")?.connection,
    ).toBe("disconnected");
    expect(
      roster.find((entry) => entry.userId === "user-player")?.connection,
    ).toBe("connected");

    // Round metadata and in-flight submissions survived the instance loss.
    const finalStore = await store.get("RA-7F3A");
    expect(finalStore?.round).toEqual({
      roundId: "r1",
      seed: "seed-1",
      targetSequence: ["dragon", "castle", "wizard"],
    });
    expect(finalStore?.submissions).toHaveLength(1);
    expect(finalStore?.submissions[0]?.userId).toBe("user-player");

    await B.server.close();
    recovered.disconnect();
  });
});
