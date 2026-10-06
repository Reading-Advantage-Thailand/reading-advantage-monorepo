import {
  addRealtimeUsage,
  classifyLocalVoiceSafety,
  classifyModerationResult,
  emptyRealtimeUsage,
  guardedResponseInstructions,
  reportedTranscriptionSeconds,
  vadSpeechSeconds,
  type RealtimeUsage,
  type VoiceSafetyDecision,
  type VoiceSafetyReason,
} from "@reading-advantage/ai/voice";
import type { VoiceScores, VoiceSummary } from "./contracts.js";
import { SAFE_TURN_GUIDANCE, SUMMARY_GUIDANCE } from "./instructions.js";
import type { VoiceProvider, VoiceProviderEvent, VoiceSideband } from "./provider.js";

/** Audio and transcript tokens both count; this cap only stops a runaway reply. */
const VOICE_TURN_MAX_OUTPUT_TOKENS = 900;

/** The provider summary with its scores. */
export type ProviderSummary = VoiceSummary & { scores: VoiceScores };

/** The in-memory state of one live session (a port of the Tutor sideband state). */
export interface SidebandState {
  sideband: VoiceSideband;
  provider: VoiceProvider;
  articleTitle: string;
  transcript: string[];
  summary: ProviderSummary | null;
  usage: RealtimeUsage;
  seenResponseIds: Set<string>;
  usageComplete: boolean;
  inflightResponses: number;
  speechActive: boolean;
  pendingTranscriptions: number;
  speechStarts: Map<string, number>;
  transcriptionSeconds: Map<string, number>;
  reportedTranscriptionItems: Set<string>;
  /** Set once finalization has snapshotted usage; a later close must not mark it incomplete. */
  finalizing: boolean;
  closing: boolean;
  summaryRequested: boolean;
  guardQueue: Promise<void>;
  safetyEvents: Partial<Record<VoiceSafetyReason, number>>;
}

/** The runtime options: a logger and the poll interval (short in tests). */
export interface VoiceRuntimeOptions {
  log?: (message: string, error?: unknown) => void;
  tickMs?: number;
}

/**
 * A provider summary tool call as a summary, clamped to the contract limits.
 * @param value The parsed tool arguments.
 * @returns The summary, or null when the shape is wrong.
 */
export function normalizeProviderSummary(value: unknown): ProviderSummary | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Record<string, unknown>;
  const scores = item.scores as Record<string, unknown> | undefined;
  if (typeof item.summaryTh !== "string" || !scores) return null;
  const score = (key: string) => Math.max(0, Math.min(5, Math.round(Number(scores[key]) || 0)));
  const strings = (key: string, max: number) =>
    Array.isArray(item[key]) ? (item[key] as unknown[]).filter((entry): entry is string => typeof entry === "string").slice(0, max).map((entry) => entry.slice(0, 300)) : [];
  return {
    summaryTh: item.summaryTh.slice(0, 1000),
    strengths: strings("strengths", 3),
    improvements: strings("improvements", 3),
    practicedTopics: strings("practicedTopics", 5),
    scores: { fluency: score("fluency"), grammar: score("grammar"), vocabulary: score("vocabulary"), pronunciation: score("pronunciation") },
  };
}

/**
 * The live-session registry: sidebands, expiry timers, the strict guard, and the summary request.
 * One instance per process; tests create their own.
 * @param options The logger and the poll interval.
 * @returns The runtime.
 */
export function createVoiceRuntime(options: VoiceRuntimeOptions = {}) {
  const log = options.log ?? ((message: string, error?: unknown) => console.warn(message, error ?? ""));
  const tick = options.tickMs ?? 100;
  const sleep = () => new Promise((resolve) => setTimeout(resolve, tick));
  const sidebands = new Map<string, SidebandState>();
  const timers = new Map<string, ReturnType<typeof setTimeout>>();

  /** Sends per-turn guidance as a system item, so every reply keeps the session prompt. */
  const sendGuidance = (state: SidebandState, text: string) =>
    state.sideband.send({ type: "conversation.item.create", item: { type: "message", role: "system", content: [{ type: "input_text", text }] } });

  /** Counts the response from the send: `response.created` arrives too late to stop a second create. */
  const createResponse = (state: SidebandState, response: Record<string, unknown>) => {
    state.inflightResponses += 1;
    state.sideband.send({ type: "response.create", response });
  };

  /** Realtime rejects response.create while another response runs: cancel it and wait briefly. */
  const awaitIdleResponse = async (state: SidebandState) => {
    if (state.inflightResponses === 0) return true;
    state.sideband.send({ type: "response.cancel" });
    for (let attempt = 0; attempt < 30 && state.inflightResponses > 0; attempt += 1) await sleep();
    state.inflightResponses = 0;
    return state.sideband.isOpen();
  };

  const moderateTurn = async (state: SidebandState, transcript: string): Promise<VoiceSafetyDecision> => {
    const local = classifyLocalVoiceSafety(transcript);
    if (!local.allowed) return local;
    try {
      const result = await state.provider.moderate(transcript);
      return classifyModerationResult(result.flagged, result.categories);
    } catch (error) {
      log("[voice] Moderation unavailable; failing closed", error);
      return { allowed: false, reason: "MODERATION_UNAVAILABLE" };
    }
  };

  const sendSafetyResponse = async (state: SidebandState, reason: Exclude<VoiceSafetyReason, "SAFE">) => {
    if (!(await awaitIdleResponse(state)) || state.closing) return;
    createResponse(state, { conversation: "none", input: [], output_modalities: ["audio"], instructions: guardedResponseInstructions(reason), max_output_tokens: 300, tool_choice: "none" });
  };

  const handleGuardedTurn = async (state: SidebandState, transcript: string, itemId: string | null) => {
    if (state.closing) return;
    const decision: VoiceSafetyDecision = transcript ? await moderateTurn(state, transcript) : { allowed: false, reason: "NO_SPEECH" };
    if (state.closing) return;
    if (decision.allowed) {
      state.transcript.push(`Student: ${transcript}`);
      // VAD splits one answer into several turns: the newest turn replies to all of them.
      if (state.speechActive || state.pendingTranscriptions > 0) return;
      if (!(await awaitIdleResponse(state)) || state.closing) return;
      sendGuidance(state, SAFE_TURN_GUIDANCE);
      createResponse(state, { output_modalities: ["audio"], max_output_tokens: VOICE_TURN_MAX_OUTPUT_TOKENS, tool_choice: "auto" });
      return;
    }
    state.safetyEvents[decision.reason] = (state.safetyEvents[decision.reason] ?? 0) + 1;
    if (itemId) state.sideband.send({ type: "conversation.item.delete", item_id: itemId });
    await sendSafetyResponse(state, decision.reason);
  };

  const onEvent = (sessionId: string, state: SidebandState, event: VoiceProviderEvent) => {
    const type = event.type;
    const itemId = typeof event.item_id === "string" ? event.item_id : null;
    if (type === "input_audio_buffer.speech_started") {
      state.speechActive = true;
      if (itemId) state.speechStarts.set(itemId, Number(event.audio_start_ms));
    }
    if (type === "input_audio_buffer.speech_stopped") {
      state.speechActive = false;
      state.pendingTranscriptions += 1;
      if (itemId && !state.reportedTranscriptionItems.has(itemId)) {
        const seconds = vadSpeechSeconds(state.speechStarts.get(itemId), event.audio_end_ms);
        if (seconds !== null) state.transcriptionSeconds.set(itemId, seconds);
      }
    }
    if (type === "conversation.item.input_audio_transcription.completed" || type === "conversation.item.input_audio_transcription.failed") {
      state.pendingTranscriptions = Math.max(0, state.pendingTranscriptions - 1);
    }
    if (type === "conversation.item.input_audio_transcription.completed" && itemId) {
      const reported = reportedTranscriptionSeconds(event.usage);
      if (reported !== null) {
        state.transcriptionSeconds.set(itemId, reported);
        state.reportedTranscriptionItems.add(itemId);
      }
    }
    if (type === "error" && (event.error as { code?: string } | undefined)?.code === "conversation_already_has_active_response") {
      state.inflightResponses = Math.max(0, state.inflightResponses - 1);
    }
    if (type === "conversation.item.input_audio_transcription.completed" && typeof event.transcript === "string") {
      const transcript = event.transcript.trim();
      state.guardQueue = state.guardQueue.then(() => handleGuardedTurn(state, transcript, itemId)).catch((error) => log(`[voice] Strict guard turn failed for ${sessionId}`, error));
    }
    if (type === "response.output_audio_transcript.done" && typeof event.transcript === "string") state.transcript.push(`AI: ${event.transcript.trim()}`);
    if (type === "response.function_call_arguments.done" && event.name === "submit_practice_summary" && typeof event.arguments === "string" && state.summaryRequested) {
      try {
        state.summary = normalizeProviderSummary(JSON.parse(event.arguments));
      } catch {
        /* transient malformed tool output */
      }
    }
    if (type === "response.done") {
      state.inflightResponses = Math.max(0, state.inflightResponses - 1);
      const response = event.response as Record<string, unknown> | undefined;
      const responseId = typeof response?.id === "string" ? response.id : null;
      if (response?.usage && (!responseId || !state.seenResponseIds.has(responseId))) {
        const next = addRealtimeUsage(state.usage, response.usage);
        if (next === state.usage) state.usageComplete = false;
        state.usage = next;
        if (responseId) state.seenResponseIds.add(responseId);
      } else if (response?.status === "completed" && !response.usage) {
        state.usageComplete = false;
      }
    }
  };

  return {
    sidebands,
    timers,
    /**
     * Attaches the sideband of a call and starts the strict guard.
     * @param sessionId The session.
     * @param provider The provider (for moderation).
     * @param providerCallId The call.
     * @param articleTitle The lesson title for the fallback evaluator.
     * @param recovered True after a service restart: usage before the restart is unknown.
     */
    attach(sessionId: string, provider: VoiceProvider, providerCallId: string, articleTitle: string, recovered = false) {
      const sideband = provider.openSideband(providerCallId);
      if (!sideband) return;
      const state: SidebandState = {
        sideband,
        provider,
        articleTitle,
        transcript: [],
        summary: null,
        usage: emptyRealtimeUsage(),
        seenResponseIds: new Set(),
        usageComplete: !recovered,
        inflightResponses: 0,
        speechActive: false,
        pendingTranscriptions: 0,
        speechStarts: new Map(),
        transcriptionSeconds: new Map(),
        reportedTranscriptionItems: new Set(),
        finalizing: false,
        closing: false,
        summaryRequested: false,
        guardQueue: Promise.resolve(),
        safetyEvents: {},
      };
      sidebands.set(sessionId, state);
      sideband.onEvent((event) => onEvent(sessionId, state, event));
      sideband.onClose(() => {
        if (!state.finalizing && state.inflightResponses > 0) state.usageComplete = false;
        if (sidebands.get(sessionId) === state && !timers.has(sessionId)) sidebands.delete(sessionId);
      });
    },
    get: (sessionId: string) => sidebands.get(sessionId) ?? null,
    /** Runs `onExpire` when the reservation ends; replaces an earlier timer. */
    scheduleExpiry(sessionId: string, expiresAt: Date, onExpire: () => Promise<void>) {
      const existing = timers.get(sessionId);
      if (existing) clearTimeout(existing);
      const timer = setTimeout(() => {
        timers.delete(sessionId);
        onExpire().catch((error) => log(`[voice] Expiry finalization failed for ${sessionId}`, error));
      }, Math.max(0, expiresAt.getTime() - Date.now()));
      if (typeof timer.unref === "function") timer.unref();
      timers.set(sessionId, timer);
    },
    clearExpiry(sessionId: string) {
      const timer = timers.get(sessionId);
      if (timer) clearTimeout(timer);
      timers.delete(sessionId);
    },
    /** Asks the coach for the private summary; false when the sideband is gone. */
    async requestSummary(sessionId: string) {
      const state = sidebands.get(sessionId);
      if (!state || !state.sideband.isOpen()) return false;
      state.closing = true;
      state.summaryRequested = true;
      if (!(await awaitIdleResponse(state))) return false;
      sendGuidance(state, SUMMARY_GUIDANCE);
      createResponse(state, { output_modalities: ["text"], tool_choice: { type: "function", name: "submit_practice_summary" } });
      return true;
    },
    /** Requests the summary when not yet requested and waits up to 20 ticks for it. */
    async awaitSummary(sessionId: string) {
      const state = sidebands.get(sessionId);
      if (!state || state.summary) return;
      if (!state.summaryRequested && !(await this.requestSummary(sessionId))) return;
      for (let attempt = 0; attempt < 20 && !state.summary; attempt += 1) await sleep();
    },
    /** The summary tool call arrives before its response.done, which carries usage. */
    async awaitResponsesDone(state: SidebandState) {
      for (let attempt = 0; attempt < 30 && state.inflightResponses > 0 && state.sideband.isOpen(); attempt += 1) await sleep();
      if (state.inflightResponses > 0) state.usageComplete = false;
    },
    /** Closes and forgets a session. */
    release(sessionId: string) {
      const state = sidebands.get(sessionId);
      if (state) state.sideband.close();
      sidebands.delete(sessionId);
    },
  };
}

export type VoiceRuntime = ReturnType<typeof createVoiceRuntime>;
