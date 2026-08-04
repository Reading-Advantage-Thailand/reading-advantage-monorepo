import { describe, expect, it } from "vitest";
import { ZodError } from "zod";

import {
  MULTIPLAYER_PROTOCOL_VERSION,
  SUPPORTED_MULTIPLAYER_VERSIONS,
  parseMultiplayerMessage,
} from "../index.js";

const player = {
  userId: "user-7f3a",
  displayName: "Mali",
  role: "player",
  connection: "connected",
};

const host = {
  userId: "user-host",
  displayName: "Kru Nok",
  role: "host",
  connection: "connected",
};

const ranking = [
  { userId: "user-7f3a", score: 120, correctCount: 3 },
  { userId: "user-9c21", score: 80, correctCount: 2 },
];

const validPayloads = {
  client_hello: { v: 1 },
  join_room: { roomCode: "RA-7F3A", displayName: "Mali" },
  submission: {
    roundId: "r1",
    answer: "dragon",
    clientTimestampMs: 1_700_000_000_000,
  },
  input_frame: { tick: 12, input: { direction: "up" } },
  welcome: { v: 1, player },
  lobby_update: {
    roomCode: "RA-7F3A",
    phase: "lobby",
    hostUserId: "user-host",
    players: [host, player],
  },
  countdown: { startsAtMs: 1_700_000_000_500 },
  round_start: {
    roundId: "r1",
    seed: "seed-1",
    targetSequence: ["dragon", "castle"],
  },
  round_end: { roundId: "r1", ranking },
  game_over: { ranking },
  world_snapshot: { tick: 12, state: { entities: [{ id: "e1" }] } },
  error: { code: "room_not_found", message: "Room RA-XXXX does not exist" },
} as const;

const clientToServerKinds = [
  "client_hello",
  "join_room",
  "submission",
  "input_frame",
] as const;

const serverToClientKinds = [
  "welcome",
  "lobby_update",
  "countdown",
  "round_start",
  "round_end",
  "game_over",
  "world_snapshot",
  "error",
] as const;

const allKinds = [...clientToServerKinds, ...serverToClientKinds];

const kindCases = allKinds.map((kind) => [kind, validPayloads[kind]] as const);

const message = (type: string, payload: unknown, v: unknown = 1) => ({
  v,
  type,
  payload,
});

describe("multiplayer.v1 envelope", () => {
  it.each(kindCases)("parses a well-formed %s message", (kind, payload) => {
    expect(parseMultiplayerMessage(message(kind, payload))).toEqual({
      v: 1,
      type: kind,
      payload,
    });
  });

  it.each(kindCases)("uses %s directly as the socket.io event name", (kind, payload) => {
    const parsed = parseMultiplayerMessage(message(kind, payload));
    expect(parsed.type).toBe(kind);
  });

  it.each(kindCases)(
    "rejects a %s message whose envelope version is not 1",
    (kind, payload) => {
      expect(() => parseMultiplayerMessage(message(kind, payload, 2))).toThrow();
    },
  );

  it.each(kindCases)("rejects a %s message with no payload", (kind) => {
    expect(() => parseMultiplayerMessage({ v: 1, type: kind })).toThrow();
  });

  it("rejects an unknown message kind", () => {
    expect(() => parseMultiplayerMessage(message("teleport", {}))).toThrow();
  });

  it("rejects a message missing the type discriminator", () => {
    expect(() => parseMultiplayerMessage({ v: 1, payload: { v: 1 } })).toThrow();
  });

  it.each([
    ["null", null],
    ["array", []],
    ["string", "hello"],
    ["number", 42],
    ["boolean", true],
  ])("rejects non-object input: %s", (_label, raw) => {
    expect(() => parseMultiplayerMessage(raw)).toThrow();
  });

  it("rejects extra fields on the envelope", () => {
    expect(() =>
      parseMultiplayerMessage({
        v: 1,
        type: "client_hello",
        payload: { v: 1 },
        session: "s1",
      }),
    ).toThrow();
  });

  it("rejects malformed input with a zod error rather than a cast", () => {
    expect(() => parseMultiplayerMessage(message("teleport", {}))).toThrowError(
      ZodError,
    );
    expect(() =>
      parseMultiplayerMessage({
        v: 1,
        type: "welcome",
        payload: { v: 1 },
      }),
    ).toThrowError(ZodError);
  });
});

describe("multiplayer.v1 version negotiation", () => {
  it("parses a client hello advertising protocol version 1", () => {
    const parsed = parseMultiplayerMessage(message("client_hello", { v: 1 }));
    if (parsed.type !== "client_hello") throw new Error("unreachable");
    expect(parsed.payload).toEqual({ v: 1 });
  });

  it("parses a hello advertising an unsupported version so the service can reject it", () => {
    const parsed = parseMultiplayerMessage(message("client_hello", { v: 2 }));
    if (parsed.type !== "client_hello") throw new Error("unreachable");
    expect(parsed.payload).toEqual({ v: 2 });
    expect(
      parseMultiplayerMessage(message("client_hello", { v: 99 })).type,
    ).toBe("client_hello");
  });

  it("expresses the unsupported-version error with the supported versions", () => {
    const parsed = parseMultiplayerMessage(
      message("error", {
        code: "unsupported_version",
        message: "unsupported protocol version",
        supportedVersions: [1],
      }),
    );
    if (parsed.type !== "error") throw new Error("unreachable");
    expect(parsed.payload).toEqual({
      code: "unsupported_version",
      message: "unsupported protocol version",
      supportedVersions: [1],
    });
  });

  it("rejects an unsupported_version error that omits the supported versions", () => {
    expect(() =>
      parseMultiplayerMessage(
        message("error", {
          code: "unsupported_version",
          message: "nope",
        }),
      ),
    ).toThrow();
  });

  it("welcomes with the negotiated version and the server-issued player", () => {
    const parsed = parseMultiplayerMessage(message("welcome", { v: 1, player }));
    if (parsed.type !== "welcome") throw new Error("unreachable");
    expect(parsed.payload).toEqual({ v: 1, player });
  });

  it("rejects a welcome with a non-1 negotiated version", () => {
    expect(() =>
      parseMultiplayerMessage(message("welcome", { v: 2, player })),
    ).toThrow();
  });

  it("exposes the frozen supported-version list", () => {
    expect(MULTIPLAYER_PROTOCOL_VERSION).toBe(1);
    expect(SUPPORTED_MULTIPLAYER_VERSIONS).toEqual([1]);
  });
});

describe("multiplayer.v1 identity", () => {
  it("join_room carries only a room code and a display name", () => {
    const parsed = parseMultiplayerMessage(
      message("join_room", { roomCode: "RA-7F3A", displayName: "Mali" }),
    );
    if (parsed.type !== "join_room") throw new Error("unreachable");
    expect(parsed.payload).toEqual({ roomCode: "RA-7F3A", displayName: "Mali" });
    expect(Object.keys(parsed.payload)).toEqual(["roomCode", "displayName"]);
  });

  it.each([
    ["userId", { roomCode: "RA-7F3A", displayName: "Mali", userId: "u-1" }],
    ["playerId", { roomCode: "RA-7F3A", displayName: "Mali", playerId: "p-1" }],
  ])("rejects a join_room that asserts %s", (_label, payload) => {
    expect(() => parseMultiplayerMessage(message("join_room", payload))).toThrow();
  });

  it("Player records carry server-issued identity, role, and connection state", () => {
    const parsed = parseMultiplayerMessage(message("welcome", { v: 1, player: host }));
    if (parsed.type !== "welcome") throw new Error("unreachable");
    expect(parsed.payload.player).toEqual(host);
  });

  it("rejects a Player without a userId", () => {
    expect(() =>
      parseMultiplayerMessage(
        message("welcome", {
          v: 1,
          player: { displayName: "Mali", role: "player", connection: "connected" },
        }),
      ),
    ).toThrow();
  });

  it("rejects a Player with an unknown role", () => {
    expect(() =>
      parseMultiplayerMessage(
        message("welcome", { v: 1, player: { ...player, role: "spectator" } }),
      ),
    ).toThrow();
  });

  it("rejects a Player with an unknown connection state", () => {
    expect(() =>
      parseMultiplayerMessage(
        message("welcome", { v: 1, player: { ...player, connection: "connecting" } }),
      ),
    ).toThrow();
  });

  it("rejects the legacy client-asserted player shape", () => {
    expect(() =>
      parseMultiplayerMessage(
        message("welcome", { v: 1, player: { ...player, isConnected: true } }),
      ),
    ).toThrow();
  });
});

describe("multiplayer.v1 scoring trust", () => {
  it("submission carries only roundId, answer, and clientTimestampMs", () => {
    const parsed = parseMultiplayerMessage(
      message("submission", {
        roundId: "r1",
        answer: "dragon",
        clientTimestampMs: 1_700_000_000_000,
      }),
    );
    if (parsed.type !== "submission") throw new Error("unreachable");
    expect(Object.keys(parsed.payload)).toEqual([
      "roundId",
      "answer",
      "clientTimestampMs",
    ]);
  });

  it.each([
    ["score", { roundId: "r1", answer: "dragon", clientTimestampMs: 1, score: 999 }],
    [
      "responseTimeMs",
      { roundId: "r1", answer: "dragon", clientTimestampMs: 1, responseTimeMs: 12 },
    ],
    ["playerId", { roundId: "r1", answer: "dragon", clientTimestampMs: 1, playerId: "p-1" }],
    ["userId", { roundId: "r1", answer: "dragon", clientTimestampMs: 1, userId: "u-1" }],
  ])("rejects a submission that asserts %s", (_label, payload) => {
    expect(() => parseMultiplayerMessage(message("submission", payload))).toThrow();
  });

  it("rejects a submission missing the answer", () => {
    expect(() =>
      parseMultiplayerMessage(
        message("submission", { roundId: "r1", clientTimestampMs: 1 }),
      ),
    ).toThrow();
  });

  it("rejects scores smuggled into a client-to-server kind", () => {
    expect(() =>
      parseMultiplayerMessage(
        message("submission", {
          roundId: "r1",
          answer: "dragon",
          clientTimestampMs: 1,
          ranking,
        }),
      ),
    ).toThrow();
  });

  it("round_end carries a per-player ranking of server-derived scores", () => {
    const parsed = parseMultiplayerMessage(message("round_end", { roundId: "r1", ranking }));
    if (parsed.type !== "round_end") throw new Error("unreachable");
    expect(parsed.payload.ranking).toEqual(ranking);
  });

  it("rejects a ranking entry missing the score", () => {
    expect(() =>
      parseMultiplayerMessage(
        message("round_end", {
          roundId: "r1",
          ranking: [{ userId: "user-7f3a", correctCount: 3 }],
        }),
      ),
    ).toThrow();
  });

  it("rejects a ranking entry missing correctCount", () => {
    expect(() =>
      parseMultiplayerMessage(
        message("round_end", {
          roundId: "r1",
          ranking: [{ userId: "user-7f3a", score: 120 }],
        }),
      ),
    ).toThrow();
  });

  it("rejects a ranking entry carrying a client-era position field", () => {
    expect(() =>
      parseMultiplayerMessage(
        message("round_end", {
          roundId: "r1",
          ranking: [
            { userId: "user-7f3a", score: 10, correctCount: 1, position: 1 },
          ],
        }),
      ),
    ).toThrow();
  });

  it("rejects a negative score", () => {
    expect(() =>
      parseMultiplayerMessage(
        message("round_end", {
          roundId: "r1",
          ranking: [{ userId: "user-7f3a", score: -5, correctCount: 1 }],
        }),
      ),
    ).toThrow();
  });
});

describe("multiplayer.v1 round lifecycle", () => {
  it("countdown announces a server-chosen start timestamp", () => {
    const parsed = parseMultiplayerMessage(
      message("countdown", { startsAtMs: 1_700_000_000_500 }),
    );
    if (parsed.type !== "countdown") throw new Error("unreachable");
    expect(parsed.payload).toEqual({ startsAtMs: 1_700_000_000_500 });
  });

  it("rejects a countdown without a start timestamp", () => {
    expect(() => parseMultiplayerMessage(message("countdown", {}))).toThrow();
  });

  it("round_start distributes the same seed and target order to every client", () => {
    const parsed = parseMultiplayerMessage(
      message("round_start", {
        roundId: "r1",
        seed: "seed-1",
        targetSequence: ["dragon", "castle"],
      }),
    );
    if (parsed.type !== "round_start") throw new Error("unreachable");
    expect(parsed.payload).toEqual({
      roundId: "r1",
      seed: "seed-1",
      targetSequence: ["dragon", "castle"],
    });
  });

  it("rejects a round_start without a seed", () => {
    expect(() =>
      parseMultiplayerMessage(
        message("round_start", { roundId: "r1", targetSequence: ["dragon"] }),
      ),
    ).toThrow();
  });

  it("rejects a round_start with an empty target order", () => {
    expect(() =>
      parseMultiplayerMessage(
        message("round_start", { roundId: "r1", seed: "seed-1", targetSequence: [] }),
      ),
    ).toThrow();
  });

  it("rejects a game_over without a ranking", () => {
    expect(() => parseMultiplayerMessage(message("game_over", {}))).toThrow();
  });

  it("rejects a lobby_update in an unknown phase", () => {
    expect(() =>
      parseMultiplayerMessage(
        message("lobby_update", {
          roomCode: "RA-7F3A",
          phase: "starting",
          hostUserId: "user-host",
          players: [host, player],
        }),
      ),
    ).toThrow();
  });

  it("lobby_update room state makes currentRound optional", () => {
    const inPlay = {
      roomCode: "RA-7F3A",
      phase: "playing",
      hostUserId: "user-host",
      players: [host, player],
      currentRound: 1,
    };
    const parsed = parseMultiplayerMessage(message("lobby_update", inPlay));
    if (parsed.type !== "lobby_update") throw new Error("unreachable");
    expect(parsed.payload).toEqual(inPlay);
  });
});

describe("multiplayer.v1 reserved shared-world kinds", () => {
  it("input_frame carries a tick and an opaque input payload", () => {
    const parsed = parseMultiplayerMessage(
      message("input_frame", { tick: 12, input: { direction: "up" } }),
    );
    if (parsed.type !== "input_frame") throw new Error("unreachable");
    expect(parsed.payload).toEqual({ tick: 12, input: { direction: "up" } });
  });

  it("rejects an input_frame without a tick", () => {
    expect(() => parseMultiplayerMessage(message("input_frame", { input: {} }))).toThrow();
  });

  it("rejects an input_frame whose input is not an object", () => {
    expect(() =>
      parseMultiplayerMessage(message("input_frame", { tick: 1, input: "up" })),
    ).toThrow();
  });

  it("world_snapshot carries a tick and an opaque state payload", () => {
    const parsed = parseMultiplayerMessage(
      message("world_snapshot", { tick: 12, state: { entities: [{ id: "e1" }] } }),
    );
    if (parsed.type !== "world_snapshot") throw new Error("unreachable");
    expect(parsed.payload).toEqual({ tick: 12, state: { entities: [{ id: "e1" }] } });
  });

  it("rejects a world_snapshot without state", () => {
    expect(() =>
      parseMultiplayerMessage(message("world_snapshot", { tick: 1 })),
    ).toThrow();
  });

  it("keeps the shared-world payloads generic so S6 extends without forking", () => {
    const parsed = parseMultiplayerMessage(
      message("world_snapshot", {
        tick: 5,
        state: { wizards: { w1: { x: 1, y: 2 } }, phase: "wave-3" },
      }),
    );
    if (parsed.type !== "world_snapshot") throw new Error("unreachable");
    expect(parsed.payload.state).toEqual({
      wizards: { w1: { x: 1, y: 2 } },
      phase: "wave-3",
    });
  });
});

describe("multiplayer.v1 error envelope", () => {
  it.each([
    [
      "unsupported_version",
      {
        code: "unsupported_version",
        message: "unsupported protocol version",
        supportedVersions: [1],
      },
    ],
    ["malformed_message", { code: "malformed_message", message: "could not parse" }],
    ["room_not_found", { code: "room_not_found", message: "room does not exist" }],
    ["room_full", { code: "room_full", message: "room is full" }],
    ["not_authorized", { code: "not_authorized", message: "not authorized" }],
    ["bad_phase", { code: "bad_phase", message: "cannot join now" }],
  ])("expresses the %s error code", (_label, payload) => {
    const parsed = parseMultiplayerMessage(message("error", payload));
    if (parsed.type !== "error") throw new Error("unreachable");
    expect(parsed.payload).toEqual(payload);
  });

  it("rejects an unknown error code", () => {
    expect(() =>
      parseMultiplayerMessage(message("error", { code: "kaboom", message: "boom" })),
    ).toThrow();
  });

  it("accepts optional details", () => {
    const parsed = parseMultiplayerMessage(
      message("error", {
        code: "room_full",
        message: "room is full",
        details: { capacity: 4 },
      }),
    );
    if (parsed.type !== "error") throw new Error("unreachable");
    expect(parsed.payload).toEqual({
      code: "room_full",
      message: "room is full",
      details: { capacity: 4 },
    });
  });

  it("rejects an error missing the message", () => {
    expect(() =>
      parseMultiplayerMessage(message("error", { code: "bad_phase" })),
    ).toThrow();
  });
});

describe("multiplayer.v1 JSON round-trip (server to client)", () => {
  it.each(serverToClientKinds)(
    "preserves a parsed %s message through JSON round-trip",
    (kind) => {
      const original = message(kind, validPayloads[kind]);
      const parsed = parseMultiplayerMessage(JSON.parse(JSON.stringify(original)));
      expect(parsed).toEqual(original);
    },
  );
});
