import { describe, expect, it, vi } from "vitest";

import {
  MULTIPLAYER_PROTOCOL_VERSION,
  type MultiplayerErrorCode,
  type MultiplayerMessage,
  type Player,
  type RankingEntry,
  type RoomState,
} from "@reading-advantage/game-contracts";

import { createBoundedFrameScheduler } from "../bounded-frame-loop.js";
import type { BoundedFrameScheduler } from "../bounded-frame-loop.js";
import {
  createMultiplayerSession,
  type MultiplayerSession,
  type MultiplayerTransport,
} from "../multiplayer-session.js";

const v = MULTIPLAYER_PROTOCOL_VERSION;

const playerAva: Player = {
  userId: "u1",
  displayName: "Ava",
  role: "player",
  connection: "connected",
};

const roomState: RoomState = {
  roomCode: "K8T2",
  phase: "lobby",
  hostUserId: "u-host",
  players: [
    playerAva,
    { userId: "u2", displayName: "Ben", role: "player", connection: "connected" },
  ],
};

const ranking: RankingEntry[] = [
  { userId: "u1", score: 120, correctCount: 3 },
  { userId: "u2", score: 80, correctCount: 2 },
];

function welcomeMessage(player: Player): MultiplayerMessage {
  return { v, type: "welcome", payload: { v, player } };
}

function lobbyUpdateMessage(room: RoomState): MultiplayerMessage {
  return { v, type: "lobby_update", payload: room };
}

function countdownMessage(startsAtMs: number): MultiplayerMessage {
  return { v, type: "countdown", payload: { startsAtMs } };
}

function roundStartMessage(
  roundId: string,
  seed: string,
  targetSequence: string[],
): MultiplayerMessage {
  return { v, type: "round_start", payload: { roundId, seed, targetSequence } };
}

function roundEndMessage(roundId: string, entries: RankingEntry[]): MultiplayerMessage {
  return { v, type: "round_end", payload: { roundId, ranking: entries } };
}

function gameOverMessage(entries: RankingEntry[]): MultiplayerMessage {
  return { v, type: "game_over", payload: { ranking: entries } };
}

function errorMessage(code: MultiplayerErrorCode, message: string): MultiplayerMessage {
  return { v, type: "error", payload: { code, message } };
}

interface FakeTransport extends MultiplayerTransport {
  readonly sent: MultiplayerMessage[];
  push(raw: unknown): void;
}

function createFakeTransport(): FakeTransport {
  const sent: MultiplayerMessage[] = [];
  const handlers = new Set<(message: MultiplayerMessage) => void>();
  return {
    sent,
    send: vi.fn((message: MultiplayerMessage): void => {
      sent.push(message);
    }),
    onMessage: vi.fn((handler: (message: MultiplayerMessage) => void): (() => void) => {
      handlers.add(handler);
      return () => {
        handlers.delete(handler);
      };
    }),
    close: vi.fn(),
    push(raw: unknown): void {
      for (const handler of handlers) handler(raw as MultiplayerMessage);
    },
  };
}

interface ManualSchedulerKit {
  readonly scheduler: BoundedFrameScheduler;
  setOnTick(onTick: (deltaMs: number) => void): void;
}

function createManualSchedulerKit(): ManualSchedulerKit {
  let onTick: ((deltaMs: number) => void) | undefined;
  let cancelled = false;
  const scheduler: BoundedFrameScheduler = {
    elapsedMs: 0,
    tickCount: 0,
    lastDeltaMs: 0,
    lastDeltaWasClamped: false,
    get cancelled() {
      return cancelled;
    },
    tick(rawDeltaMs: number): void {
      onTick?.(rawDeltaMs);
    },
    cancel(): void {
      cancelled = true;
    },
  };
  return {
    scheduler,
    setOnTick(next) {
      onTick = next;
    },
  };
}

interface Harness {
  readonly transport: FakeTransport;
  readonly scheduler: BoundedFrameScheduler;
  readonly session: MultiplayerSession;
  pump(deltaMs?: number): void;
  push(raw: unknown): void;
}

function createHarness(): Harness {
  const transport = createFakeTransport();
  const manual = createManualSchedulerKit();
  const sessionRef: { current: MultiplayerSession | undefined } = { current: undefined };
  manual.setOnTick((deltaMs) => sessionRef.current?.tick(deltaMs));
  const session = createMultiplayerSession({ transport, scheduler: manual.scheduler });
  sessionRef.current = session;
  return {
    transport,
    scheduler: manual.scheduler,
    session,
    pump(deltaMs = 16) {
      manual.scheduler.tick(deltaMs);
    },
    push(raw) {
      transport.push(raw);
    },
  };
}

describe("multiplayer session", () => {
  it("sends client_hello on join and defers join_room until welcome", () => {
    const { transport, session, push } = createHarness();

    session.join({ roomCode: "K8T2", displayName: "Ava" });

    expect(transport.sent).toHaveLength(1);
    expect(transport.sent[0]).toEqual({ v, type: "client_hello", payload: { v } });
    expect(session.getState().phase).toBe("hello");

    push(welcomeMessage(playerAva));

    expect(transport.sent).toHaveLength(2);
    expect(transport.sent[1]).toEqual({
      v,
      type: "join_room",
      payload: { roomCode: "K8T2", displayName: "Ava" },
    });
    expect(session.getState().phase).toBe("lobby");
    expect(session.getState().player).toEqual(playerAva);
  });

  it("records the welcome player even when no join is pending", () => {
    const { transport, session, push } = createHarness();

    push(welcomeMessage(playerAva));

    expect(session.getState().player).toEqual(playerAva);
    expect(session.getState().phase).toBe("lobby");
    expect(transport.sent).toEqual([]);
  });

  it("reflects lobby updates in room state", () => {
    const { session, push } = createHarness();

    push(welcomeMessage(playerAva));
    push(lobbyUpdateMessage(roomState));

    expect(session.getState().room).toEqual(roomState);
    expect(session.getState().phase).toBe("lobby");
  });

  it("tracks the countdown phase and its start timestamp", () => {
    const { session, push } = createHarness();

    push(welcomeMessage(playerAva));
    push(lobbyUpdateMessage(roomState));
    push(countdownMessage(1_750_000_000_000));

    expect(session.getState().phase).toBe("countdown");
    expect(session.getState().countdownStartsAtMs).toBe(1_750_000_000_000);
  });

  it("starts a round and records seed plus target sequence", () => {
    const { session, push } = createHarness();

    push(welcomeMessage(playerAva));
    push(countdownMessage(1_750_000_000_000));
    push(roundStartMessage("r1", "seed-42", ["apple", "banana", "cherry"]));

    expect(session.getState().phase).toBe("playing");
    expect(session.getState().round).toEqual({
      roundId: "r1",
      seed: "seed-42",
      targetSequence: ["apple", "banana", "cherry"],
    });
  });

  it("sends a submission while playing, carrying no score", () => {
    const { transport, session, push } = createHarness();

    push(welcomeMessage(playerAva));
    push(roundStartMessage("r1", "seed-42", ["apple"]));
    session.submit({ roundId: 1, answer: "apple" });

    expect(transport.sent).toHaveLength(1);
    const submission = transport.sent[0];
    expect(submission.type).toBe("submission");
    expect(submission.payload).toMatchObject({ roundId: "1", answer: "apple" });
    expect(submission.payload).not.toHaveProperty("score");
    expect(typeof submission.payload.clientTimestampMs).toBe("number");
  });

  it("never sends a submission outside the playing phase", () => {
    const { transport, session, push } = createHarness();

    session.join({ roomCode: "K8T2", displayName: "Ava" });
    session.submit({ roundId: 1, answer: "apple" });
    expect(transport.sent).toHaveLength(1);

    push(welcomeMessage(playerAva));
    push(roundStartMessage("r1", "seed-42", ["apple"]));
    push(roundEndMessage("r1", ranking));
    session.submit({ roundId: 1, answer: "apple" });

    const submissions = transport.sent.filter((message) => message.type === "submission");
    expect(submissions).toHaveLength(0);
  });

  it("records the ranking and enters results when a round ends", () => {
    const { session, push } = createHarness();

    push(welcomeMessage(playerAva));
    push(roundStartMessage("r1", "seed-42", ["apple"]));
    push(roundEndMessage("r1", ranking));

    expect(session.getState().phase).toBe("results");
    expect(session.getState().ranking).toEqual(ranking);
  });

  it("records the final ranking on game over", () => {
    const { session, push } = createHarness();

    push(welcomeMessage(playerAva));
    push(roundStartMessage("r1", "seed-42", ["apple"]));
    push(roundEndMessage("r1", ranking));
    push(gameOverMessage([{ userId: "u1", score: 200, correctCount: 5 }]));

    expect(session.getState().phase).toBe("results");
    expect(session.getState().ranking).toEqual([
      { userId: "u1", score: 200, correctCount: 5 },
    ]);
  });

  it("surfaces a server error in lastError without faking the phase", () => {
    const { session, push } = createHarness();

    session.join({ roomCode: "NOPE", displayName: "Ava" });
    push(errorMessage("room_not_found", "Room NOPE does not exist"));

    expect(session.getState().lastError).toEqual({
      code: "room_not_found",
      message: "Room NOPE does not exist",
    });
    expect(session.getState().phase).toBe("hello");
  });

  it("destroys cleanly: unsubscribes, closes the transport, cancels the scheduler", () => {
    const { transport, scheduler, session, push } = createHarness();
    const listener = vi.fn();
    session.subscribe(listener);
    session.join({ roomCode: "K8T2", displayName: "Ava" });
    listener.mockClear();

    session.destroy();

    expect(transport.close).toHaveBeenCalledTimes(1);
    expect(scheduler.cancelled).toBe(true);
    expect(session.getState().phase).toBe("closed");
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0][0].phase).toBe("closed");

    push(welcomeMessage(playerAva));
    expect(listener).toHaveBeenCalledTimes(1);
    expect(session.getState().player).toBeNull();

    session.join({ roomCode: "K8T2", displayName: "Ava" });
    session.sendInput({ tick: 9, input: { x: 1 } });
    expect(transport.sent).toHaveLength(1);
  });

  it("observes a disconnect through the lobby_update connection flip", () => {
    const { session, push } = createHarness();

    push(welcomeMessage(playerAva));
    push(lobbyUpdateMessage(roomState));
    push(
      lobbyUpdateMessage({
        ...roomState,
        players: [
          { ...playerAva, connection: "disconnected" },
          { userId: "u2", displayName: "Ben", role: "player", connection: "connected" },
        ],
      }),
    );

    expect(
      session.getState().room?.players.find((entry) => entry.userId === "u1")?.connection,
    ).toBe("disconnected");
    expect(session.getState().phase).toBe("lobby");
  });

  it("queues input frames and flushes them in order on a scheduler tick", () => {
    const { transport, session, pump } = createHarness();

    session.sendInput({ tick: 1, input: { dx: 1 } });
    session.sendInput({ tick: 2, input: { dx: 2 } });

    expect(transport.sent).toEqual([]);

    pump(16);

    expect(transport.sent).toEqual([
      { v, type: "input_frame", payload: { tick: 1, input: { dx: 1 } } },
      { v, type: "input_frame", payload: { tick: 2, input: { dx: 2 } } },
    ]);

    pump(16);
    expect(transport.sent).toHaveLength(2);
  });

  it("turns a malformed inbound message into lastError without throwing into a tick", () => {
    const { session, pump, push } = createHarness();

    expect(() => push({ v: 1, type: "lobby_update", payload: { bogus: true } })).not.toThrow();

    expect(session.getState().lastError).toEqual({
      code: "malformed_message",
      message: expect.any(String),
    });
    expect(session.getState().phase).toBe("idle");

    expect(() => pump(16)).not.toThrow();
  });

  it("notifies subscribers on state changes and stops on unsubscribe", () => {
    const { session } = createHarness();
    const listener = vi.fn();

    const unsubscribe = session.subscribe(listener);
    session.join({ roomCode: "K8T2", displayName: "Ava" });

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0][0].phase).toBe("hello");

    unsubscribe();
    session.destroy();
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("returns an immutable snapshot from getState", () => {
    const { session, push } = createHarness();

    push(welcomeMessage(playerAva));
    const snapshot = session.getState();

    expect(Object.isFrozen(snapshot)).toBe(true);
    expect(() => {
      (snapshot as unknown as { phase: string }).phase = "playing";
    }).toThrow();

    expect(session.getState().phase).toBe("lobby");
  });

  it("ignores reserved world snapshots without mutating state", () => {
    const { transport, session, push } = createHarness();
    const listener = vi.fn();
    session.subscribe(listener);
    session.join({ roomCode: "K8T2", displayName: "Ava" });
    listener.mockClear();

    push({ v, type: "world_snapshot", payload: { tick: 5, state: { world: {} } } });

    expect(listener).not.toHaveBeenCalled();
    expect(transport.sent).toHaveLength(1);
    expect(session.getState().phase).toBe("hello");
  });

  it("drives the session flush through the real bounded frame scheduler", () => {
    const transport = createFakeTransport();
    const sessionRef: { current: MultiplayerSession | undefined } = { current: undefined };
    const scheduler = createBoundedFrameScheduler((deltaMs) => sessionRef.current?.tick(deltaMs));
    const session = createMultiplayerSession({ transport, scheduler });
    sessionRef.current = session;

    session.sendInput({ tick: 1, input: { jump: true } });
    expect(transport.sent).toEqual([]);

    scheduler.tick(16);

    expect(transport.sent).toEqual([
      { v, type: "input_frame", payload: { tick: 1, input: { jump: true } } },
    ]);
  });
});
