/**
 * The ports of the voice use-cases. The OpenAI Realtime adapter lives in `@reading-advantage/ai`
 * (`voice`); the app wires it in. The domain never imports a provider SDK.
 */

/** What a provider needs to open a call: the browser's WebRTC offer and the session prompt. */
export interface VoiceCallRequest {
  sdp: string;
  instructions: string;
  model: string;
  transcriptionModel: string;
}

/** The provider's answer: the SDP answer for the browser and the call id for the sideband. */
export interface VoiceCall {
  answerSdp: string;
  providerCallId: string;
  model: string;
}

/** A provider event as the sideband receives it; `type` is the provider's event name. */
export type VoiceProviderEvent = { type: string } & Record<string, unknown>;

/** The server-side control channel of a call. */
export interface VoiceSideband {
  /** Registers the event listener; one listener per sideband. */
  onEvent(listener: (event: VoiceProviderEvent) => void): void;
  /** Registers the close listener. */
  onClose(listener: () => void): void;
  /** Sends a client event to the provider. */
  send(event: Record<string, unknown>): void;
  /** True while the channel is open. */
  isOpen(): boolean;
  /** Closes the channel. */
  close(): void;
}

/** The moderation verdict of a learner turn. */
export interface VoiceModerationResult {
  flagged: boolean;
  categories: Record<string, boolean | null | undefined>;
}

/** The voice provider port. */
export interface VoiceProvider {
  createCall(request: VoiceCallRequest): Promise<VoiceCall>;
  hangup(providerCallId: string): Promise<void>;
  openSideband(providerCallId: string): VoiceSideband | null;
  moderate(text: string): Promise<VoiceModerationResult>;
}

/** The fallback evaluator port: grades the guarded transcript when the provider sent no summary. */
export interface VoiceSummaryEvaluator {
  evaluate(articleTitle: string, transcript: string): Promise<unknown>;
}

/** A sideband for tests: records sent events and lets the test emit provider events. */
export class MockVoiceSideband implements VoiceSideband {
  readonly sent: Record<string, unknown>[] = [];
  private listener: ((event: VoiceProviderEvent) => void) | null = null;
  private closeListener: (() => void) | null = null;
  private open = true;
  onEvent(listener: (event: VoiceProviderEvent) => void) {
    this.listener = listener;
  }
  onClose(listener: () => void) {
    this.closeListener = listener;
  }
  send(event: Record<string, unknown>) {
    this.sent.push(event);
  }
  isOpen() {
    return this.open;
  }
  close() {
    if (!this.open) return;
    this.open = false;
    this.closeListener?.();
  }
  /** Emits a provider event to the listener. */
  emit(event: VoiceProviderEvent) {
    this.listener?.(event);
  }
}

/** A provider for tests: answers every call, keeps the sidebands, and moderates by a word list. */
export class MockVoiceProvider implements VoiceProvider {
  readonly calls: VoiceCallRequest[] = [];
  readonly hangups: string[] = [];
  readonly sidebands = new Map<string, MockVoiceSideband>();
  /** Set to make `createCall` fail. */
  failCalls = false;
  /** Words that the moderation flags, with the category to report. */
  flaggedWords: Record<string, string> = {};
  /** Set to make moderation throw. */
  moderationDown = false;
  private counter = 0;

  async createCall(request: VoiceCallRequest): Promise<VoiceCall> {
    this.calls.push(request);
    if (this.failCalls) throw new Error("provider down");
    this.counter += 1;
    return { answerSdp: "v=0\r\nmock-answer", providerCallId: `call_${this.counter}`, model: request.model };
  }
  async hangup(providerCallId: string) {
    this.hangups.push(providerCallId);
  }
  openSideband(providerCallId: string) {
    const sideband = new MockVoiceSideband();
    this.sidebands.set(providerCallId, sideband);
    return sideband;
  }
  async moderate(text: string): Promise<VoiceModerationResult> {
    if (this.moderationDown) throw new Error("moderation down");
    const hit = Object.entries(this.flaggedWords).find(([word]) => text.toLowerCase().includes(word));
    return hit ? { flagged: true, categories: { [hit[1]]: true } } : { flagged: false, categories: {} };
  }
}
