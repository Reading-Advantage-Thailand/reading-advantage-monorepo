import { z } from "zod";

/** The frozen wire protocol version carried by every multiplayer message envelope. */
export const MULTIPLAYER_PROTOCOL_VERSION = 1 as const;

/** The complete list of protocol versions this contract supports. */
export const SUPPORTED_MULTIPLAYER_VERSIONS = [1] as const;

/** Strict schema for the server-issued identity record of one participant. */
export const playerSchema = z
  .object({
    userId: z.string().min(1),
    displayName: z.string().min(1),
    role: z.enum(["host", "player"]),
    connection: z.enum(["connected", "disconnected"]),
  })
  .strict();

/** Strict schema for the room phase reported in room-state updates. */
export const roomPhaseSchema = z.enum([
  "lobby",
  "countdown",
  "playing",
  "round_end",
  "game_over",
]);

/** Strict schema for one server-computed ranking entry. */
export const rankingEntrySchema = z
  .object({
    userId: z.string().min(1),
    score: z.number().int().min(0),
    correctCount: z.number().int().min(0),
  })
  .strict();

/** Strict schema for the room state broadcast in lobby updates. */
export const roomStateSchema = z
  .object({
    roomCode: z.string().min(1),
    phase: roomPhaseSchema,
    hostUserId: z.string().min(1),
    players: z.array(playerSchema),
    currentRound: z.number().int().min(1).optional(),
  })
  .strict();

/** Payload schema for the client-side version-negotiation opener. */
export const clientHelloSchema = z
  .object({ v: z.number().int().min(1) })
  .strict();

/** Payload schema for the server-side version acceptance. */
export const welcomeSchema = z
  .object({ v: z.literal(1), player: playerSchema })
  .strict();

/** Payload schema for a client joining a room by code and display name. */
export const joinRoomSchema = z
  .object({ roomCode: z.string().min(1), displayName: z.string().min(1) })
  .strict();

/** Payload schema for the server-driven countdown announcement. */
export const countdownSchema = z
  .object({ startsAtMs: z.number().int() })
  .strict();

/** Payload schema for the server-driven round start with the session seed. */
export const roundStartSchema = z
  .object({
    roundId: z.string().min(1),
    seed: z.string().min(1),
    targetSequence: z.array(z.string().min(1)).min(1),
  })
  .strict();

/** Payload schema for the server-driven round end with per-player ranking. */
export const roundEndSchema = z
  .object({ roundId: z.string().min(1), ranking: z.array(rankingEntrySchema) })
  .strict();

/** Payload schema for the server-driven game over with the final ranking. */
export const gameOverSchema = z
  .object({ ranking: z.array(rankingEntrySchema) })
  .strict();

/** Payload schema for a client word submission that carries no score. */
export const submissionSchema = z
  .object({
    roundId: z.string().min(1),
    answer: z.string().min(1),
    clientTimestampMs: z.number().int(),
  })
  .strict();

/** Payload schema for the reserved client-to-server shared-world input frame. */
export const inputFrameSchema = z
  .object({
    tick: z.number().int().min(0),
    input: z.record(z.string(), z.unknown()),
  })
  .strict();

/** Payload schema for the reserved server-to-client shared-world snapshot. */
export const worldSnapshotSchema = z
  .object({
    tick: z.number().int().min(0),
    state: z.record(z.string(), z.unknown()),
  })
  .strict();

/** Canonical error codes carried by the server-to-client error message. */
export const multiplayerErrorCodeSchema = z.enum([
  "unsupported_version",
  "malformed_message",
  "room_not_found",
  "room_full",
  "not_authorized",
  "bad_phase",
]);

/** Strict payload schema for the protocol-version negotiation error. */
export const unsupportedVersionErrorPayloadSchema = z
  .object({
    code: z.literal("unsupported_version"),
    message: z.string(),
    supportedVersions: z.array(z.number().int()).min(1),
  })
  .strict();

/** Strict payload schema for every non-negotiation error. */
export const genericErrorPayloadSchema = z
  .object({
    code: z.enum([
      "malformed_message",
      "room_not_found",
      "room_full",
      "not_authorized",
      "bad_phase",
    ]),
    message: z.string(),
    details: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();

/** Discriminated payload schema covering every error code. */
export const errorPayloadSchema = z.discriminatedUnion("code", [
  unsupportedVersionErrorPayloadSchema,
  genericErrorPayloadSchema,
]);

/**
 * Builds the strict `{ v, type, payload }` envelope for one message kind.
 * @param type The message kind, which doubles as the socket.io event name.
 * @param payload The strict schema for this kind's payload.
 * @returns The strict envelope schema for the kind.
 */
function envelope<const T extends string, P extends z.ZodType>(type: T, payload: P) {
  return z
    .object({ v: z.literal(MULTIPLAYER_PROTOCOL_VERSION), type: z.literal(type), payload })
    .strict();
}

/** Envelope schema for the client-to-server version-negotiation opener. */
export const clientHelloMessageSchema = envelope("client_hello", clientHelloSchema);

/** Envelope schema for the server-to-client version acceptance. */
export const welcomeMessageSchema = envelope("welcome", welcomeSchema);

/** Envelope schema for a client joining a room. */
export const joinRoomMessageSchema = envelope("join_room", joinRoomSchema);

/** Envelope schema for the server-to-client room-state broadcast. */
export const lobbyUpdateMessageSchema = envelope("lobby_update", roomStateSchema);

/** Envelope schema for the server-to-client countdown announcement. */
export const countdownMessageSchema = envelope("countdown", countdownSchema);

/** Envelope schema for the server-to-client round start. */
export const roundStartMessageSchema = envelope("round_start", roundStartSchema);

/** Envelope schema for the server-to-client round end. */
export const roundEndMessageSchema = envelope("round_end", roundEndSchema);

/** Envelope schema for the server-to-client game over. */
export const gameOverMessageSchema = envelope("game_over", gameOverSchema);

/** Envelope schema for a client-to-server word submission. */
export const submissionMessageSchema = envelope("submission", submissionSchema);

/** Envelope schema for the reserved client-to-server shared-world input frame. */
export const inputFrameMessageSchema = envelope("input_frame", inputFrameSchema);

/** Envelope schema for the reserved server-to-client shared-world snapshot. */
export const worldSnapshotMessageSchema = envelope("world_snapshot", worldSnapshotSchema);

/** Envelope schema for a server-to-client error. */
export const errorMessageSchema = envelope("error", errorPayloadSchema);

/** The frozen `multiplayer.v1` message union, discriminated on `type`. */
export const multiplayerMessageSchema = z.discriminatedUnion("type", [
  clientHelloMessageSchema,
  joinRoomMessageSchema,
  submissionMessageSchema,
  inputFrameMessageSchema,
  welcomeMessageSchema,
  lobbyUpdateMessageSchema,
  countdownMessageSchema,
  roundStartMessageSchema,
  roundEndMessageSchema,
  gameOverMessageSchema,
  worldSnapshotMessageSchema,
  errorMessageSchema,
]);

/** The frozen `multiplayer.v1` message union. */
export type MultiplayerMessage = z.infer<typeof multiplayerMessageSchema>;

/** The union of every frozen message kind. */
export type MultiplayerMessageKind = MultiplayerMessage["type"];

/** Envelope schema for the client-to-server version-negotiation opener. */
export type ClientHelloMessage = z.infer<typeof clientHelloMessageSchema>;

/** Envelope schema for the server-to-client version acceptance. */
export type WelcomeMessage = z.infer<typeof welcomeMessageSchema>;

/** Envelope schema for a client joining a room. */
export type JoinRoomMessage = z.infer<typeof joinRoomMessageSchema>;

/** Envelope schema for the server-to-client room-state broadcast. */
export type LobbyUpdateMessage = z.infer<typeof lobbyUpdateMessageSchema>;

/** Envelope schema for the server-to-client countdown announcement. */
export type CountdownMessage = z.infer<typeof countdownMessageSchema>;

/** Envelope schema for the server-to-client round start. */
export type RoundStartMessage = z.infer<typeof roundStartMessageSchema>;

/** Envelope schema for the server-to-client round end. */
export type RoundEndMessage = z.infer<typeof roundEndMessageSchema>;

/** Envelope schema for the server-to-client game over. */
export type GameOverMessage = z.infer<typeof gameOverMessageSchema>;

/** Envelope schema for a client-to-server word submission. */
export type SubmissionMessage = z.infer<typeof submissionMessageSchema>;

/** Envelope schema for the reserved client-to-server shared-world input frame. */
export type InputFrameMessage = z.infer<typeof inputFrameMessageSchema>;

/** Envelope schema for the reserved server-to-client shared-world snapshot. */
export type WorldSnapshotMessage = z.infer<typeof worldSnapshotMessageSchema>;

/** Envelope schema for a server-to-client error. */
export type ErrorMessage = z.infer<typeof errorMessageSchema>;

/** The union of every client-to-server message kind. */
export type ClientToServerMessage =
  | ClientHelloMessage
  | JoinRoomMessage
  | SubmissionMessage
  | InputFrameMessage;

/** The union of every server-to-client message kind. */
export type ServerToClientMessage =
  | WelcomeMessage
  | LobbyUpdateMessage
  | CountdownMessage
  | RoundStartMessage
  | RoundEndMessage
  | GameOverMessage
  | WorldSnapshotMessage
  | ErrorMessage;

/** The server-issued identity record of one participant. */
export type Player = z.infer<typeof playerSchema>;

/** The room phase reported in room-state updates. */
export type RoomPhase = z.infer<typeof roomPhaseSchema>;

/** The room state broadcast in lobby updates. */
export type RoomState = z.infer<typeof roomStateSchema>;

/** One server-computed ranking entry. */
export type RankingEntry = z.infer<typeof rankingEntrySchema>;

/** Canonical error codes carried by the server-to-client error message. */
export type MultiplayerErrorCode = z.infer<typeof multiplayerErrorCodeSchema>;

/** Discriminated error payload covering every error code. */
export type MultiplayerErrorPayload = z.infer<typeof errorPayloadSchema>;

/**
 * Validates untrusted wire input into the frozen `multiplayer.v1` union.
 * @param raw Any value received over the transport boundary.
 * @returns The fully validated message; the `type` field is the socket.io event name.
 * @throws A ZodError when the envelope, version, kind, or payload is malformed.
 */
export function parseMultiplayerMessage(raw: unknown): MultiplayerMessage {
  return multiplayerMessageSchema.parse(raw);
}
