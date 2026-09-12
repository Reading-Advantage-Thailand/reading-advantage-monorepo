import { createServer, type Server as HttpServer } from "node:http";

import { Server as SocketIOServer, type Socket } from "socket.io";
import { z } from "zod";
import {
  MULTIPLAYER_PROTOCOL_VERSION,
  SUPPORTED_MULTIPLAYER_VERSIONS,
  parseMultiplayerMessage,
  rankingEntrySchema,
  type ClientHelloMessage,
  type CountdownMessage,
  type ErrorMessage,
  type GameOverMessage,
  type InputFrameMessage,
  type JoinRoomMessage,
  type LobbyUpdateMessage,
  type MultiplayerErrorCode,
  type MultiplayerErrorPayload,
  type MultiplayerMessage,
  type RankingEntry,
  type RoundEndMessage,
  type RoundStartMessage,
  type SubmissionMessage,
  type WelcomeMessage,
  type WorldSnapshotMessage,
} from "@reading-advantage/game-contracts";

import {
  createStoredRoom,
  toRoomState,
  type RoomStore,
  type StoredRoom,
} from "./room-store.js";

/** The tenant bound to connections and rooms under the dev identity passthrough. */
const DEV_TENANT_ID = "dev-tenant";

/** Socket.io event map for every server-to-client `multiplayer.v1` kind. */
interface ServerToClientEvents {
  welcome: (message: WelcomeMessage) => void;
  lobby_update: (message: LobbyUpdateMessage) => void;
  countdown: (message: CountdownMessage) => void;
  round_start: (message: RoundStartMessage) => void;
  round_end: (message: RoundEndMessage) => void;
  game_over: (message: GameOverMessage) => void;
  world_snapshot: (message: WorldSnapshotMessage) => void;
  error: (message: ErrorMessage) => void;
}

/** Socket.io event map for every client-to-server `multiplayer.v1` kind. */
interface ClientToServerEvents {
  client_hello: (message: ClientHelloMessage) => void;
  join_room: (message: JoinRoomMessage) => void;
  submission: (message: SubmissionMessage) => void;
  input_frame: (message: InputFrameMessage) => void;
}

/** Per-connection data bound by the identity hook and the session state machine. */
interface SessionSocketData {
  actor?: SessionActor;
  session?: SocketSessionState;
}

/** The connection lifecycle stage tracked per socket. */
type SessionStage = "awaiting-hello" | "welcomed" | "joined";

/** The per-socket protocol state machine carried on socket.data. */
interface SocketSessionState {
  stage: SessionStage;
  roomCode: string | null;
}

/** A typed socket.io socket bound to the `multiplayer.v1` event maps. */
type SessionSocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  Record<string, never>,
  SessionSocketData
>;

/** A typed socket.io server bound to the `multiplayer.v1` event maps. */
type SessionIOServer = SocketIOServer<
  ClientToServerEvents,
  ServerToClientEvents,
  Record<string, never>,
  SessionSocketData
>;

/** The server-side identity bound to one connection by the authenticate hook. */
export interface SessionActor {
  /** The Accounts-issued user identifier; participants are keyed by it. */
  userId: string;
  /** The display name presented before the join supplies its own. */
  displayName: string;
  /** The tenant that owns the connection, when identity provides one. */
  tenantId?: string;
}

/**
 * The connection-time identity boundary. Task T7 replaces the dev passthrough
 * with Accounts verification; the hook keeps the seam explicit in the meantime.
 */
export type AuthenticateHook = (
  socket: SessionSocket,
) => SessionActor | Promise<SessionActor>;

/**
 * Dev-only identity passthrough. Every connection is accepted and minted an
 * ephemeral identity derived from the socket id; real identity lands in T7.
 * @param socket The connecting socket to mint an identity for.
 * @returns The dev identity bound to the connection.
 */
const DEV_PASSTHROUGH_AUTHENTICATE: AuthenticateHook = (socket) => ({
  userId: `dev-${socket.id}`,
  displayName: "dev-player",
  tenantId: DEV_TENANT_ID,
});

/** Failure mode for a server-side room command. */
export type SessionCommandErrorCode = "room_not_found" | "bad_phase";

/** Error thrown by session commands when the store or phase rejects the operation. */
export class SessionCommandError extends Error {
  /** The structured failure code for the rejected command. */
  readonly code: SessionCommandErrorCode;

  /**
   * Creates a session command failure.
   * @param code The structured failure code.
   * @param message The human-readable failure detail.
   */
  constructor(code: SessionCommandErrorCode, message: string) {
    super(message);
    this.name = "SessionCommandError";
    this.code = code;
  }
}

/** Command input for starting a round on a room. */
export interface StartRoundCommand {
  /** The room code whose phase advances to playing. */
  roomCode: string;
  /** The server-issued round identifier. */
  roundId: string;
  /** The deterministic simulation seed distributed to every player. */
  seed: string;
  /** The target word sequence distributed to every player. */
  targetSequence: string[];
}

/** Command input for ending the active round with a computed ranking. */
export interface EndRoundCommand {
  /** The room code whose phase advances to round_end. */
  roomCode: string;
  /** The server-computed ranking for the round. */
  ranking: RankingEntry[];
}

/** Strict command contract for starting a round. */
const startRoundCommandSchema = z
  .object({
    roomCode: z.string().min(1),
    roundId: z.string().min(1),
    seed: z.string().min(1),
    targetSequence: z.array(z.string().min(1)).min(1),
  })
  .strict();

/** Strict command contract for ending a round. */
const endRoundCommandSchema = z
  .object({ roomCode: z.string().min(1), ranking: z.array(rankingEntrySchema) })
  .strict();

/** The running session server handle. */
export interface SessionServer {
  /** The socket.io transport instance. */
  io: SessionIOServer;
  /** The HTTP server carrying sockets and the /livez probe. */
  httpServer: HttpServer;
  /** Server-driven room commands. */
  commands: {
    /**
     * Advances a room into the playing phase with a new round.
     * @param input The round to start.
     * @throws A SessionCommandError when the room is missing or finished.
     */
    startRound(input: StartRoundCommand): Promise<void>;
    /**
     * Advances the active round into round_end with a computed ranking.
     * @param input The ranking to persist for the active round.
     * @throws A SessionCommandError when the room or active round is missing.
     */
    endRound(input: EndRoundCommand): Promise<void>;
  };
  /**
   * Drains and closes the server exactly once.
   * @returns A promise resolved when the server has closed.
   */
  close(): Promise<void>;
}

/** Constructor options for the session server. */
export interface CreateSessionServerOptions {
  /** The room store all room state persists through. */
  store: RoomStore;
  /** Connection-time identity hook; defaults to the dev passthrough. */
  authenticate?: AuthenticateHook;
  /** The socket.io transport path. */
  path?: string;
}

/**
 * Creates the `multiplayer.v1` socket server skeleton. Connections are
 * identity-bound by the authenticate hook, version-gated on client_hello, then
 * routed through join/lobby/round handling into the injected room store.
 * @param options The store, identity hook, and transport path for the server.
 * @returns The running session server handle.
 */
export function createSessionServer(
  options: CreateSessionServerOptions,
): SessionServer {
  const { store } = options;
  const authenticate = options.authenticate ?? DEV_PASSTHROUGH_AUTHENTICATE;

  const httpServer = createServer((req, res) => {
    if (req.url === "/livez" || req.url === "/livez/") {
      res.writeHead(200, { "Content-Type": "text/plain" });
      res.end("ok");
      return;
    }
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("not found");
  });

  const io: SessionIOServer = new SocketIOServer(httpServer, {
    path: options.path ?? "/socket.io",
    cors: { origin: "*" },
  });

  // Serializes read-modify-write room mutations within this server instance so
  // concurrent handlers (e.g. two disconnects during drain) cannot overwrite
  // each other's flips. Cross-instance atomicity is risk R-3 in the S4 spike.
  const roomLocks = new Map<string, Promise<unknown>>();

  /**
   * Runs a room mutation after every prior mutation of the same room settles.
   * @param roomCode The room whose mutations are serialized.
   * @param operation The mutation to run once the room is unblocked.
   * @returns The mutation's result.
   */
  const withRoomLock = <T>(
    roomCode: string,
    operation: () => Promise<T>,
  ): Promise<T> => {
    const prior = roomLocks.get(roomCode) ?? Promise.resolve();
    const next = prior.then(operation, operation);
    roomLocks.set(
      roomCode,
      next.then(
        () => undefined,
        () => undefined,
      ),
    );
    return next;
  };

  io.use((socket, next) => {
    Promise.resolve(authenticate(socket))
      .then((actor) => {
        socket.data.actor = actor;
        next();
      })
      .catch((error: unknown) => {
        next(error instanceof Error ? error : new Error("authentication failed"));
      });
  });

  /**
   * Broadcasts the contract room state to every socket in the room.
   * @param room The stored room whose state should be broadcast.
   */
  const broadcastLobbyUpdate = (room: StoredRoom): void => {
    io.to(room.roomCode).emit("lobby_update", {
      v: MULTIPLAYER_PROTOCOL_VERSION,
      type: "lobby_update",
      payload: toRoomState(room),
    });
  };

  /**
   * Emits one contract error envelope to a socket.
   * @param socket The socket to notify.
   * @param code The canonical error code.
   * @param message The human-readable error detail.
   */
  const emitError = (
    socket: SessionSocket,
    code: MultiplayerErrorCode,
    message: string,
  ): void => {
    const payload: MultiplayerErrorPayload =
      code === "unsupported_version"
        ? { code, message, supportedVersions: [...SUPPORTED_MULTIPLAYER_VERSIONS] }
        : { code, message };
    socket.emit("error", {
      v: MULTIPLAYER_PROTOCOL_VERSION,
      type: "error",
      payload,
    });
  };

  /**
   * Validates one untrusted wire payload without ever throwing at the handler.
   * @param socket The socket to notify on malformed input.
   * @param raw The unvalidated wire payload.
   * @returns The validated message, or null after a malformed_message error.
   */
  const parseOrError = (
    socket: SessionSocket,
    raw: unknown,
  ): MultiplayerMessage | null => {
    try {
      return parseMultiplayerMessage(raw);
    } catch {
      emitError(socket, "malformed_message", "Received a malformed multiplayer message");
      return null;
    }
  };

  /**
   * Handles the client_hello version-negotiation opener.
   * @param socket The socket speaking the opener.
   * @param raw The unvalidated wire payload.
   */
  const handleClientHello = async (
    socket: SessionSocket,
    raw: unknown,
  ): Promise<void> => {
    const session = socket.data.session;
    if (session?.stage !== "awaiting-hello") {
      emitError(socket, "malformed_message", "client_hello already processed");
      return;
    }
    const message = parseOrError(socket, raw);
    if (message === null) return;
    if (message.type !== "client_hello") {
      emitError(socket, "malformed_message", "expected client_hello");
      return;
    }
    const version = message.payload.v;
    if (!SUPPORTED_MULTIPLAYER_VERSIONS.some((supported) => supported === version)) {
      emitError(socket, "unsupported_version", "unsupported protocol version");
      return;
    }
    const actor = socket.data.actor;
    if (actor === undefined) return;
    session.stage = "welcomed";
    socket.emit("welcome", {
      v: MULTIPLAYER_PROTOCOL_VERSION,
      type: "welcome",
      payload: {
        v: MULTIPLAYER_PROTOCOL_VERSION,
        player: {
          userId: actor.userId,
          displayName: actor.displayName,
          role: "player",
          connection: "connected",
        },
      },
    });
  };

  /**
   * Handles join_room: creates the room with its first joiner as host, or
   * re-enters an existing room, flipping a known participant's connection
   * state back to connected.
   * @param socket The socket joining the room.
   * @param raw The unvalidated wire payload.
   */
  const handleJoinRoom = async (
    socket: SessionSocket,
    raw: unknown,
  ): Promise<void> => {
    const session = socket.data.session;
    if (session?.stage !== "welcomed") {
      emitError(socket, "malformed_message", "join_room before client_hello");
      return;
    }
    const message = parseOrError(socket, raw);
    if (message === null) return;
    if (message.type !== "join_room") {
      emitError(socket, "malformed_message", "expected join_room");
      return;
    }
    const actor = socket.data.actor;
    if (actor === undefined) return;
    const { roomCode, displayName } = message.payload;
    const room = await withRoomLock(roomCode, async () => {
      const existing = await store.get(roomCode);
      const next =
        existing === null
          ? createStoredRoom({
              roomCode,
              tenantId: actor.tenantId ?? DEV_TENANT_ID,
              hostUserId: actor.userId,
              hostDisplayName: displayName,
            })
          : existing;
      if (existing !== null) {
        const player = next.players.find(
          (entry) => entry.userId === actor.userId,
        );
        if (player === undefined) {
          next.players.push({
            userId: actor.userId,
            displayName,
            role: "player",
            connection: "connected",
          });
        } else {
          player.connection = "connected";
          player.displayName = displayName;
        }
        next.updatedAtMs = Date.now();
      }
      await store.put(next);
      return next;
    });
    session.roomCode = roomCode;
    session.stage = "joined";
    await socket.join(roomCode);
    broadcastLobbyUpdate(room);
  };

  /**
   * Handles a word submission during the playing phase, attributing it to the
   * authenticated sender. Server-side scoring is the following S4 task.
   * @param socket The socket submitting the answer.
   * @param raw The unvalidated wire payload.
   */
  const handleSubmission = async (
    socket: SessionSocket,
    raw: unknown,
  ): Promise<void> => {
    const session = socket.data.session;
    if (session?.stage !== "joined") {
      emitError(socket, "malformed_message", "submission before join_room");
      return;
    }
    const message = parseOrError(socket, raw);
    if (message === null) return;
    if (message.type !== "submission") {
      emitError(socket, "malformed_message", "expected submission");
      return;
    }
    const actor = socket.data.actor;
    if (actor === undefined) return;
    const roomCode = session.roomCode;
    if (roomCode === null) return;
    await withRoomLock(roomCode, async () => {
      const room = await store.get(roomCode);
      if (room === null) {
        emitError(socket, "room_not_found", "room not found");
        return;
      }
      if (room.phase !== "playing") {
        emitError(socket, "bad_phase", "submission outside the playing phase");
        return;
      }
      room.submissions.push({ ...message.payload, userId: actor.userId });
      room.updatedAtMs = Date.now();
      await store.put(room);
    });
  };

  /**
   * Handles a reserved shared-world input frame: validated and accepted, then
   * discarded until the S6 authoritative-simulation tier consumes it.
   * @param socket The socket sending the frame.
   * @param raw The unvalidated wire payload.
   */
  const handleInputFrame = async (
    socket: SessionSocket,
    raw: unknown,
  ): Promise<void> => {
    const session = socket.data.session;
    if (session?.stage !== "joined") {
      emitError(socket, "malformed_message", "input_frame before join_room");
      return;
    }
    const message = parseOrError(socket, raw);
    if (message === null) return;
    if (message.type !== "input_frame") {
      emitError(socket, "malformed_message", "expected input_frame");
      return;
    }
  };

  /**
   * Persists the connection-state flip when a socket leaves a room.
   * @param socket The socket that disconnected.
   */
  const handleDisconnect = async (socket: SessionSocket): Promise<void> => {
    const session = socket.data.session;
    const roomCode = session?.roomCode;
    if (roomCode === null || roomCode === undefined) return;
    const actor = socket.data.actor;
    if (actor === undefined) return;
    await withRoomLock(roomCode, async () => {
      const room = await store.get(roomCode);
      if (room === null) return;
      const player = room.players.find((entry) => entry.userId === actor.userId);
      if (player !== undefined) {
        player.connection = "disconnected";
      }
      room.updatedAtMs = Date.now();
      await store.put(room);
      try {
        broadcastLobbyUpdate(room);
      } catch {
        // The engine is already closing; no peers remain to receive the update.
      }
    });
  };

  /**
   * Writes one structured handler failure without crashing the connection.
   * @param socket The socket whose handler failed.
   * @param event The handler event name.
   * @param error The underlying failure.
   */
  const logHandlerError = (
    socket: SessionSocket,
    event: string,
    error: unknown,
  ): void => {
    process.stderr.write(
      `${JSON.stringify({
        level: "error",
        event: "session-server.handler_error",
        handler: event,
        socketId: socket.id,
        message: error instanceof Error ? error.message : "unknown handler failure",
      })}\n`,
    );
  };

  io.on("connection", (socket) => {
    socket.data.session = { stage: "awaiting-hello", roomCode: null };
    socket.on("client_hello", (message) => {
      void handleClientHello(socket, message).catch((error: unknown) =>
        logHandlerError(socket, "client_hello", error),
      );
    });
    socket.on("join_room", (message) => {
      void handleJoinRoom(socket, message).catch((error: unknown) =>
        logHandlerError(socket, "join_room", error),
      );
    });
    socket.on("submission", (message) => {
      void handleSubmission(socket, message).catch((error: unknown) =>
        logHandlerError(socket, "submission", error),
      );
    });
    socket.on("input_frame", (message) => {
      void handleInputFrame(socket, message).catch((error: unknown) =>
        logHandlerError(socket, "input_frame", error),
      );
    });
    socket.on("disconnect", () => {
      void handleDisconnect(socket).catch((error: unknown) =>
        logHandlerError(socket, "disconnect", error),
      );
    });
  });

  /**
   * Starts the next round on a room: persists the round and the playing phase,
   * then broadcasts round_start to every socket in the room.
   * @param input The round to start.
   * @throws A SessionCommandError when the room is missing or finished.
   */
  const startRound = async (input: StartRoundCommand): Promise<void> => {
    const command = startRoundCommandSchema.parse(input);
    await withRoomLock(command.roomCode, async () => {
      const room = await store.get(command.roomCode);
      if (room === null) {
        throw new SessionCommandError(
          "room_not_found",
          `room ${command.roomCode} not found`,
        );
      }
      if (room.phase === "game_over") {
        throw new SessionCommandError(
          "bad_phase",
          "cannot start a round on a finished room",
        );
      }
      room.phase = "playing";
      room.currentRound = (room.currentRound ?? 0) + 1;
      room.round = {
        roundId: command.roundId,
        seed: command.seed,
        targetSequence: command.targetSequence,
      };
      room.submissions = [];
      room.updatedAtMs = Date.now();
      await store.put(room);
    });
    io.to(command.roomCode).emit("round_start", {
      v: MULTIPLAYER_PROTOCOL_VERSION,
      type: "round_start",
      payload: {
        roundId: command.roundId,
        seed: command.seed,
        targetSequence: command.targetSequence,
      },
    });
  };

  /**
   * Ends the active round on a room: persists the ranking and the round_end
   * phase, then broadcasts round_end to every socket in the room.
   * @param input The ranking computed for the active round.
   * @throws A SessionCommandError when the room or the active round is missing.
   */
  const endRound = async (input: EndRoundCommand): Promise<void> => {
    const command = endRoundCommandSchema.parse(input);
    let roundId: string | null = null;
    await withRoomLock(command.roomCode, async () => {
      const room = await store.get(command.roomCode);
      if (room === null) {
        throw new SessionCommandError(
          "room_not_found",
          `room ${command.roomCode} not found`,
        );
      }
      if (room.phase !== "playing" || room.round === undefined) {
        throw new SessionCommandError("bad_phase", "no active round to end");
      }
      roundId = room.round.roundId;
      room.phase = "round_end";
      room.ranking = command.ranking;
      room.updatedAtMs = Date.now();
      await store.put(room);
    });
    if (roundId === null) return;
    io.to(command.roomCode).emit("round_end", {
      v: MULTIPLAYER_PROTOCOL_VERSION,
      type: "round_end",
      payload: { roundId, ranking: command.ranking },
    });
  };

  let closed = false;
  const close = (): Promise<void> => {
    if (closed) return Promise.resolve();
    closed = true;
    return new Promise<void>((resolve) => {
      io.close(() => resolve());
    });
  };

  return {
    io,
    httpServer,
    commands: { startRound, endRound },
    close,
  };
}
