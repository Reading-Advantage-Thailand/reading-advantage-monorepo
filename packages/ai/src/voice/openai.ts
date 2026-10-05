/**
 * The OpenAI Realtime adapter of Reedy: opens a WebRTC call with the browser's SDP offer, hangs
 * it up, watches it over a WebSocket sideband, and moderates turns with `omni-moderation-latest`.
 * Uses `fetch` and the global `WebSocket` of Node 22+; no SDK. Ported from the Tutor
 * `AiVoiceService.ts` provider calls.
 */

const DEFAULT_BASE_URL = "https://api.openai.com/v1";

/** What the adapter needs: the key and the optional base URL. Never read from `process.env` here. */
export interface OpenAIVoiceConfig {
  apiKey: string;
  baseUrl?: string;
  /** Replaces `fetch` in tests. */
  fetch?: typeof fetch;
  /** Replaces the global `WebSocket` in tests. */
  WebSocket?: typeof WebSocket;
}

/** A call request: the offer, the session prompt, and the models. */
export interface OpenAIVoiceCallRequest {
  sdp: string;
  instructions: string;
  model: string;
  transcriptionModel: string;
}

/** The private summary tool the coach calls at the end of practice. */
export const SUMMARY_TOOL = {
  type: "function",
  name: "submit_practice_summary",
  description: "Submit the final private learning summary when requested at the end of practice.",
  parameters: {
    type: "object",
    additionalProperties: false,
    required: ["summaryTh", "strengths", "improvements", "scores"],
    properties: {
      summaryTh: { type: "string" },
      strengths: { type: "array", items: { type: "string" }, maxItems: 3 },
      improvements: { type: "array", items: { type: "string" }, maxItems: 3 },
      practicedTopics: { type: "array", items: { type: "string" }, maxItems: 5 },
      scores: {
        type: "object",
        additionalProperties: false,
        required: ["fluency", "grammar", "vocabulary", "pronunciation"],
        properties: {
          fluency: { type: "integer", minimum: 0, maximum: 5 },
          grammar: { type: "integer", minimum: 0, maximum: 5 },
          vocabulary: { type: "integer", minimum: 0, maximum: 5 },
          pronunciation: { type: "integer", minimum: 0, maximum: 5 },
        },
      },
    },
  },
} as const;

/**
 * The Realtime session config of a call: audio in and out, bilingual transcription, and the
 * strict guard (VAD commits the turn, only the sideband creates a response).
 * @param request The call request.
 * @returns The `session` body of the calls endpoint.
 */
export function realtimeSessionConfig(request: OpenAIVoiceCallRequest) {
  return {
    type: "realtime",
    model: request.model,
    instructions: request.instructions,
    output_modalities: ["audio"],
    audio: {
      input: {
        transcription: {
          model: request.transcriptionModel,
          languages: ["th", "en"],
          prompt: "The learner may naturally switch between Thai and English while discussing an English lesson. Preserve both languages and English lesson vocabulary accurately.",
        },
        turn_detection: { type: "server_vad", create_response: false, interrupt_response: true },
      },
      output: { voice: "marin" },
    },
    tools: [SUMMARY_TOOL],
  };
}

/**
 * The call id from the `Location` header of the calls endpoint.
 * @param location The header value.
 * @returns The id, or null.
 */
export function parseProviderCallId(location: string | null): string | null {
  return location?.match(/\/calls\/([^/?#]+)/)?.[1] ?? null;
}

/** The OpenAI Realtime voice provider. */
export class OpenAIVoiceProvider {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly fetchFn: typeof fetch;
  private readonly WebSocketCtor: typeof WebSocket;

  constructor(config: OpenAIVoiceConfig) {
    this.apiKey = config.apiKey.trim();
    this.baseUrl = (config.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, "");
    this.fetchFn = config.fetch ?? fetch;
    this.WebSocketCtor = config.WebSocket ?? WebSocket;
  }

  /**
   * Opens a Realtime call with the browser's offer.
   * @param request The offer, the prompt, and the models.
   * @returns The SDP answer and the call id.
   * @throws When the key is missing, the endpoint fails, or the answer is not an SDP.
   */
  async createCall(request: OpenAIVoiceCallRequest): Promise<{ answerSdp: string; providerCallId: string; model: string }> {
    if (!this.apiKey) throw new Error("Voice provider is not configured");
    const form = new FormData();
    form.set("sdp", request.sdp);
    form.set("session", JSON.stringify(realtimeSessionConfig(request)));
    const response = await this.fetchFn(`${this.baseUrl}/realtime/calls`, {
      method: "POST",
      headers: { Authorization: `Bearer ${this.apiKey}` },
      body: form,
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) throw new Error(`Voice provider call failed: ${response.status}`);
    const answerSdp = await response.text();
    const providerCallId = parseProviderCallId(response.headers.get("location"));
    if (!providerCallId || !answerSdp.startsWith("v=0")) throw new Error("Voice provider returned an invalid session");
    return { answerSdp, providerCallId, model: request.model };
  }

  /**
   * Hangs a call up; a failure is swallowed, the call ends by itself.
   * @param providerCallId The call.
   */
  async hangup(providerCallId: string): Promise<void> {
    if (!this.apiKey || !providerCallId) return;
    await this.fetchFn(`${this.baseUrl}/realtime/calls/${encodeURIComponent(providerCallId)}/hangup`, {
      method: "POST",
      headers: { Authorization: `Bearer ${this.apiKey}` },
      signal: AbortSignal.timeout(8_000),
    }).catch(() => undefined);
  }

  /**
   * Opens the WebSocket sideband of a call. Auth goes in the subprotocols, as the Realtime API
   * accepts from a browser-style socket.
   * @param providerCallId The call.
   * @returns The sideband, or null when the key is missing.
   */
  openSideband(providerCallId: string) {
    if (!this.apiKey) return null;
    const url = `${this.baseUrl.replace(/^http/, "ws")}/realtime?call_id=${encodeURIComponent(providerCallId)}`;
    const socket = new this.WebSocketCtor(url, ["realtime", `openai-insecure-api-key.${this.apiKey}`]);
    let onEvent: ((event: { type: string } & Record<string, unknown>) => void) | null = null;
    let onClose: (() => void) | null = null;
    const queue: string[] = [];
    socket.addEventListener("open", () => {
      for (const message of queue.splice(0)) socket.send(message);
    });
    socket.addEventListener("message", (message) => {
      try {
        const event = JSON.parse(String((message as MessageEvent).data));
        if (event && typeof event.type === "string") onEvent?.(event);
      } catch {
        /* a non-JSON frame */
      }
    });
    socket.addEventListener("close", () => onClose?.());
    socket.addEventListener("error", () => undefined);
    return {
      onEvent(listener: (event: { type: string } & Record<string, unknown>) => void) {
        onEvent = listener;
      },
      onClose(listener: () => void) {
        onClose = listener;
      },
      send(event: Record<string, unknown>) {
        const message = JSON.stringify(event);
        if (socket.readyState === 1) socket.send(message);
        else if (socket.readyState === 0) queue.push(message);
      },
      isOpen: () => socket.readyState === 1 || socket.readyState === 0,
      close: () => socket.close(1000, "Session finalized"),
    };
  }

  /**
   * Moderates a learner turn.
   * @param text The transcript.
   * @returns The flag and the categories.
   * @throws When the endpoint fails; callers fail closed.
   */
  async moderate(text: string): Promise<{ flagged: boolean; categories: Record<string, boolean | null | undefined> }> {
    const response = await this.fetchFn(`${this.baseUrl}/moderations`, {
      method: "POST",
      headers: { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "omni-moderation-latest", input: text }),
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) throw new Error(`Moderation failed: ${response.status}`);
    const body = (await response.json()) as { results?: { flagged?: boolean; categories?: Record<string, boolean> }[] };
    const result = body.results?.[0];
    if (!result) throw new Error("Moderation returned no result");
    return { flagged: Boolean(result.flagged), categories: { ...(result.categories ?? {}) } };
  }
}
