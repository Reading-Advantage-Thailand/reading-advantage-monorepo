/**
 * `capability:multiplayer-session` shared core.
 *
 * A transport-agnostic client session that speaks the frozen `multiplayer.v1`
 * contract. The session owns join handshaking, room state, round lifecycle,
 * submission, scoreboard ranking, and a reserved shared-world input queue.
 * Cadence is driven by an injected bounded frame scheduler: each scheduler
 * tick flushes queued input frames in order. No sockets and no timers live
 * here — the transport and the scheduler are injected.
 */

import {
  MULTIPLAYER_PROTOCOL_VERSION,
  parseMultiplayerMessage,
  type MultiplayerErrorCode,
  type MultiplayerMessage,
  type Player,
  type RankingEntry,
  type RoomState,
  type RoundStartMessage,
} from "@reading-advantage/game-contracts";

import type { BoundedFrameScheduler } from "./bounded-frame-loop.js";

/** The client-visible lifecycle phase of a multiplayer session. */
export type MultiplayerSessionPhase =
  | "idle"
  | "hello"
  | "lobby"
  | "countdown"
  | "playing"
  | "results"
  | "closed";

/** The round metadata recorded from a server-issued round start. */
export type MultiplayerSessionRound = RoundStartMessage["payload"];

/** Wire boundary between the session and a socket or equivalent transport. */
export interface MultiplayerTransport {
  /**
   * Sends one validated contract message to the server.
   * @param message The validated `multiplayer.v1` envelope to transmit.
   */
  send(message: MultiplayerMessage): void;
  /**
   * Registers a handler for inbound messages.
   * @param handler Callback invoked for each inbound message.
   * @returns A function that unsubscribes the handler.
   */
  onMessage(handler: (message: MultiplayerMessage) => void): () => void;
  /** Closes the underlying transport connection. */
  close(): void;
}

/** Constructor options for a multiplayer session. */
export interface MultiplayerSessionOptions {
  /** The transport the session speaks `multiplayer.v1` over. */
  transport: MultiplayerTransport;
  /** The bounded frame scheduler that drives the session cadence. */
  scheduler: BoundedFrameScheduler;
}

/** An immutable snapshot of the client-visible session state. */
export interface MultiplayerSessionState {
  /** The client-visible lifecycle phase. */
  phase: MultiplayerSessionPhase;
  /** The server-issued identity of the local participant. */
  player: Player | null;
  /** The latest server-broadcast room state. */
  room: RoomState | null;
  /** The server-announced round start timestamp, when a countdown is active. */
  countdownStartsAtMs: number | null;
  /** The active round metadata distributed by the server. */
  round: MultiplayerSessionRound | null;
  /** The latest server-computed ranking. */
  ranking: RankingEntry[] | null;
  /** The most recent server or local protocol error, if any. */
  lastError: { code: MultiplayerErrorCode; message: string } | null;
}

/** The client-side multiplayer session bound to one transport. */
export interface MultiplayerSession {
  /**
   * Starts the join handshake for a room.
   * @param input The room code and display name to join with.
   */
  join(input: { roomCode: string; displayName: string }): void;
  /**
   * Submits a word answer for the current round.
   * @param input The round number and the submitted answer.
   */
  submit(input: { roundId: number; answer: string }): void;
  /**
   * Queues a reserved shared-world input frame for the next scheduler tick.
   * @param frame The tick number and opaque input payload.
   */
  sendInput(frame: { tick: number; input: Record<string, unknown> }): void;
  /**
   * Returns an immutable snapshot of the current session state.
   * @returns The frozen session state.
   */
  getState(): MultiplayerSessionState;
  /**
   * Subscribes a listener to every state change.
   * @param listener Callback invoked with each new state snapshot.
   * @returns A function that unsubscribes the listener.
   */
  subscribe(listener: (state: MultiplayerSessionState) => void): () => void;
  /**
   * Pumps one scheduler tick into the session, flushing queued input frames.
   * @param rawDeltaMs The frame delta supplied by the scheduler transport.
   */
  tick(rawDeltaMs: number): void;
  /** Unsubscribes the transport, closes it, cancels the scheduler, and closes the session. */
  destroy(): void;
}

/**
 * Creates a multiplayer session bound to an injected transport and scheduler.
 * @param options The transport and scheduler the session speaks over.
 * @returns The created multiplayer session.
 */
export function createMultiplayerSession(options: MultiplayerSessionOptions): MultiplayerSession {
  const { transport, scheduler } = options;

  let phase: MultiplayerSessionPhase = "idle";
  let player: Player | null = null;
  let room: RoomState | null = null;
  let countdownStartsAtMs: number | null = null;
  let round: MultiplayerSessionRound | null = null;
  let ranking: RankingEntry[] | null = null;
  let lastError: { code: MultiplayerErrorCode; message: string } | null = null;
  let pendingJoin: { roomCode: string; displayName: string } | null = null;
  const queuedFrames: Array<{ tick: number; input: Record<string, unknown> }> = [];
  const listeners = new Set<(state: MultiplayerSessionState) => void>();

  const getState = (): MultiplayerSessionState =>
    Object.freeze({ phase, player, room, countdownStartsAtMs, round, ranking, lastError });

  const notify = (): void => {
    const snapshot = getState();
    for (const listener of listeners) listener(snapshot);
  };

  const sendEnvelope = (message: MultiplayerMessage): void => {
    if (phase === "closed") return;
    transport.send(message);
  };

  const applyMessage = (message: MultiplayerMessage): void => {
    switch (message.type) {
      case "welcome":
        player = Object.freeze(message.payload.player);
        if (pendingJoin !== null) {
          sendEnvelope({
            v: MULTIPLAYER_PROTOCOL_VERSION,
            type: "join_room",
            payload: pendingJoin,
          });
        }
        phase = "lobby";
        notify();
        return;
      case "lobby_update":
        room = Object.freeze(message.payload);
        notify();
        return;
      case "countdown":
        countdownStartsAtMs = message.payload.startsAtMs;
        phase = "countdown";
        notify();
        return;
      case "round_start":
        round = Object.freeze(message.payload);
        phase = "playing";
        notify();
        return;
      case "round_end":
      case "game_over":
        ranking = Object.freeze(
          message.payload.ranking.map((entry) => Object.freeze({ ...entry })),
        ) as RankingEntry[];
        phase = "results";
        notify();
        return;
      case "error":
        lastError = Object.freeze({
          code: message.payload.code,
          message: message.payload.message,
        });
        notify();
        return;
      default:
        return;
    }
  };

  const unsubscribeTransport = transport.onMessage((message) => {
    try {
      applyMessage(parseMultiplayerMessage(message));
    } catch {
      lastError = Object.freeze({
        code: "malformed_message",
        message: "Received a malformed multiplayer message",
      });
      notify();
    }
  });

  const flushQueuedFrames = (): void => {
    while (queuedFrames.length > 0) {
      const frame = queuedFrames.shift();
      if (frame !== undefined) {
        sendEnvelope({
          v: MULTIPLAYER_PROTOCOL_VERSION,
          type: "input_frame",
          payload: frame,
        });
      }
    }
  };

  return Object.freeze({
    join(input: { roomCode: string; displayName: string }): void {
      if (phase === "closed") return;
      pendingJoin = input;
      sendEnvelope({
        v: MULTIPLAYER_PROTOCOL_VERSION,
        type: "client_hello",
        payload: { v: MULTIPLAYER_PROTOCOL_VERSION },
      });
      phase = "hello";
      notify();
    },
    submit(input: { roundId: number; answer: string }): void {
      if (phase !== "playing") return;
      sendEnvelope({
        v: MULTIPLAYER_PROTOCOL_VERSION,
        type: "submission",
        payload: {
          roundId: String(input.roundId),
          answer: input.answer,
          clientTimestampMs: Date.now(),
        },
      });
    },
    sendInput(frame: { tick: number; input: Record<string, unknown> }): void {
      if (phase === "closed") return;
      queuedFrames.push(frame);
    },
    getState,
    subscribe(listener: (state: MultiplayerSessionState) => void): () => void {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    tick(_rawDeltaMs: number): void {
      flushQueuedFrames();
    },
    destroy(): void {
      if (phase === "closed") return;
      unsubscribeTransport();
      transport.close();
      scheduler.cancel();
      phase = "closed";
      notify();
      listeners.clear();
    },
  });
}
