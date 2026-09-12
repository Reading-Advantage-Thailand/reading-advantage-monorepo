import type { AddressInfo } from "node:net";

import { afterEach, describe, expect, it } from "vitest";
import { io as ioc, type Socket as ClientSocket } from "socket.io-client";
import type {
  ErrorMessage,
  JoinRoomMessage,
  LobbyUpdateMessage,
  RoundEndMessage,
  RoundStartMessage,
  WelcomeMessage,
} from "@reading-advantage/game-contracts";

import { createRoomStore, type RoomStore } from "../room-store.js";
import {
  createSessionServer,
  type AuthenticateHook,
  type SessionServer,
} from "../server.js";

const servers: SessionServer[] = [];
const clients: ClientSocket[] = [];

afterEach(async () => {
  for (const client of clients) client.disconnect();
  clients.length = 0;
  await Promise.all(servers.map((server) => server.close()));
  servers.length = 0;
});

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
 * Starts a session server on an ephemeral port with a fixed identity hook.
 * @param store The room store the server persists through.
 * @returns The running server and its bound port.
 */
async function startServer(
  store: RoomStore = createRoomStore({ kind: "memory" }),
): Promise<{ server: SessionServer; port: number }> {
  const server = createSessionServer({ store, authenticate: identityFromToken });
  servers.push(server);
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
  clients.push(socket);
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

describe("version negotiation", () => {
  it("welcomes a v=1 hello with the server-issued identity", async () => {
    const { port } = await startServer();
    const socket = await connect(port, "host");
    socket.emit("client_hello", {
      v: 1,
      type: "client_hello",
      payload: { v: 1 },
    });
    const welcome = await once<WelcomeMessage>(socket, "welcome");
    expect(welcome.payload.v).toBe(1);
    expect(welcome.payload.player.userId).toBe("user-host");
    expect(welcome.payload.player.connection).toBe("connected");
  });

  it("rejects an unknown version with unsupported_version carrying supportedVersions", async () => {
    const { port } = await startServer();
    const socket = await connect(port, "host");
    socket.emit("client_hello", {
      v: 1,
      type: "client_hello",
      payload: { v: 99 },
    });
    const error = await once<ErrorMessage>(socket, "error");
    expect(error.payload.code).toBe("unsupported_version");
    if (error.payload.code === "unsupported_version") {
      expect(error.payload.supportedVersions).toEqual([1]);
    }
  });

  it("rejects a malformed hello payload with malformed_message", async () => {
    const { port } = await startServer();
    const socket = await connect(port, "host");
    socket.emit("client_hello", {
      v: 1,
      type: "client_hello",
      payload: { v: "one" },
    } as unknown as JoinRoomMessage);
    const error = await once<ErrorMessage>(socket, "error");
    expect(error.payload.code).toBe("malformed_message");
  });
});

describe("malformed message handling", () => {
  it("rejects a malformed payload via parseMultiplayerMessage without crashing the handler", async () => {
    const { port } = await startServer();
    const socket = await connect(port, "player");
    socket.emit("client_hello", {
      v: 1,
      type: "client_hello",
      payload: { v: 1 },
    });
    await once(socket, "welcome");
    socket.emit("join_room", {
      v: 1,
      type: "join_room",
      payload: { roomCode: 42, displayName: "Mali" },
    } as unknown as JoinRoomMessage);
    const error = await once<ErrorMessage>(socket, "error");
    expect(error.payload.code).toBe("malformed_message");
    socket.emit("join_room", {
      v: 1,
      type: "join_room",
      payload: { roomCode: "RA-7F3A", displayName: "Mali" },
    });
    const lobby = await once<LobbyUpdateMessage>(socket, "lobby_update");
    expect(lobby.payload.roomCode).toBe("RA-7F3A");
  });

  it("rejects join_room before client_hello with malformed_message", async () => {
    const { port } = await startServer();
    const socket = await connect(port, "player");
    socket.emit("join_room", {
      v: 1,
      type: "join_room",
      payload: { roomCode: "RA-7F3A", displayName: "Mali" },
    });
    const error = await once<ErrorMessage>(socket, "error");
    expect(error.payload.code).toBe("malformed_message");
  });
});

describe("room lifecycle over the wire", () => {
  it("makes the first joiner the host and the second joiner a player", async () => {
    const { port } = await startServer();
    const host = await connect(port, "host");
    const player = await connect(port, "player");
    const hostLobby = await joinRoom(host, "RA-7F3A", "Kru Nok");
    expect(hostLobby.payload.phase).toBe("lobby");
    expect(hostLobby.payload.hostUserId).toBe("user-host");
    expect(hostLobby.payload.players).toEqual([
      {
        userId: "user-host",
        displayName: "Kru Nok",
        role: "host",
        connection: "connected",
      },
    ]);
    const playerLobby = await joinRoom(player, "RA-7F3A", "Mali");
    expect(playerLobby.payload.players).toHaveLength(2);
    const playerRow = playerLobby.payload.players.find(
      (entry) => entry.userId === "user-player",
    );
    expect(playerRow?.role).toBe("player");
    expect(playerRow?.connection).toBe("connected");
  });

  it("broadcasts roster changes to every participant", async () => {
    const { port } = await startServer();
    const host = await connect(port, "host");
    const player = await connect(port, "player");
    await joinRoom(host, "RA-7F3A", "Kru Nok");
    const hostUpdate = once<LobbyUpdateMessage>(host, "lobby_update");
    await joinRoom(player, "RA-7F3A", "Mali");
    const update = await hostUpdate;
    expect(update.payload.players).toHaveLength(2);
  });

  it("advances a room to playing via startRound and persists the round", async () => {
    const store = createRoomStore({ kind: "memory" });
    const { port, server } = await startServer(store);
    const host = await connect(port, "host");
    await joinRoom(host, "RA-7F3A", "Kru Nok");
    const roundStart = once<RoundStartMessage>(host, "round_start");
    await server.commands.startRound({
      roomCode: "RA-7F3A",
      roundId: "r1",
      seed: "seed-1",
      targetSequence: ["dragon", "castle", "wizard"],
    });
    const message = await roundStart;
    expect(message.payload).toEqual({
      roundId: "r1",
      seed: "seed-1",
      targetSequence: ["dragon", "castle", "wizard"],
    });
    const stored = await store.get("RA-7F3A");
    expect(stored?.phase).toBe("playing");
    expect(stored?.currentRound).toBe(1);
    expect(stored?.round?.seed).toBe("seed-1");
  });

  it("ends a round via endRound and persists the server-computed ranking", async () => {
    const store = createRoomStore({ kind: "memory" });
    const { port, server } = await startServer(store);
    const host = await connect(port, "host");
    await joinRoom(host, "RA-7F3A", "Kru Nok");
    await server.commands.startRound({
      roomCode: "RA-7F3A",
      roundId: "r1",
      seed: "seed-1",
      targetSequence: ["dragon"],
    });
    const roundEnd = once<RoundEndMessage>(host, "round_end");
    await server.commands.endRound({
      roomCode: "RA-7F3A",
      ranking: [{ userId: "user-host", score: 100, correctCount: 2 }],
    });
    const message = await roundEnd;
    expect(message.payload.ranking).toEqual([
      { userId: "user-host", score: 100, correctCount: 2 },
    ]);
    const stored = await store.get("RA-7F3A");
    expect(stored?.phase).toBe("round_end");
    expect(stored?.ranking).toEqual([
      { userId: "user-host", score: 100, correctCount: 2 },
    ]);
  });

  it("rejects submissions outside the playing phase with bad_phase", async () => {
    const { port } = await startServer();
    const player = await connect(port, "player");
    await joinRoom(player, "RA-7F3A", "Mali");
    player.emit("submission", {
      v: 1,
      type: "submission",
      payload: { roundId: "r1", answer: "dragon", clientTimestampMs: 1_000 },
    });
    const error = await once<ErrorMessage>(player, "error");
    expect(error.payload.code).toBe("bad_phase");
  });

  it("records submissions during the playing phase attributed to the sender", async () => {
    const store = createRoomStore({ kind: "memory" });
    const { port, server } = await startServer(store);
    const player = await connect(port, "player");
    await joinRoom(player, "RA-7F3A", "Mali");
    await server.commands.startRound({
      roomCode: "RA-7F3A",
      roundId: "r1",
      seed: "seed-1",
      targetSequence: ["dragon"],
    });
    player.emit("submission", {
      v: 1,
      type: "submission",
      payload: { roundId: "r1", answer: "dragon", clientTimestampMs: 1_000 },
    });
    await waitFor(async () => {
      const stored = await store.get("RA-7F3A");
      expect(stored?.submissions).toEqual([
        {
          roundId: "r1",
          answer: "dragon",
          clientTimestampMs: 1_000,
          userId: "user-player",
        },
      ]);
    });
  });

  it("flips a disconnected player's connection state and broadcasts it", async () => {
    const store = createRoomStore({ kind: "memory" });
    const { port } = await startServer(store);
    const host = await connect(port, "host");
    const player = await connect(port, "player");
    await joinRoom(host, "RA-7F3A", "Kru Nok");
    const hostJoinUpdate = once<LobbyUpdateMessage>(host, "lobby_update");
    await joinRoom(player, "RA-7F3A", "Mali");
    await hostJoinUpdate;
    const updateAfterDisconnect = once<LobbyUpdateMessage>(host, "lobby_update");
    player.disconnect();
    const update = await updateAfterDisconnect;
    const playerRow = update.payload.players.find(
      (entry) => entry.userId === "user-player",
    );
    expect(playerRow?.connection).toBe("disconnected");
    await waitFor(async () => {
      const stored = await store.get("RA-7F3A");
      expect(
        stored?.players.find((entry) => entry.userId === "user-player")
          ?.connection,
      ).toBe("disconnected");
    });
  });
});

describe("health endpoint", () => {
  it("serves /livez with 200 on the socket server port", async () => {
    const { port } = await startServer();
    const response = await fetch(`http://127.0.0.1:${port}/livez`);
    expect(response.status).toBe(200);
    await expect(response.text()).resolves.toBe("ok");
  });
});
