/** The switches and limits of Reedy in Primary (FR-1, FR-3, FR-6, FR-7). */
export interface VoiceConfig {
  /** The kill switch: `AI_VOICE_ENABLED`, live unless set to "false". */
  enabled: boolean;
  /** Seconds per student per calendar month (FR-1). */
  monthBudgetSeconds: number;
  /** The cap of one session (FR-3). */
  sessionCapSeconds: number;
  /** Seconds a reservation waits for the browser to connect before it is released. */
  pendingLeaseSeconds: number;
  /** The Realtime model. */
  model: string;
  /** The transcription model for the learner's speech. */
  transcriptionModel: string;
  /** THB per USD for the cost views (FR-7). */
  thbPerUsd: number;
  /** The wall-clock estimate when the provider reports no usage. */
  estimatedThbPerMinute: number;
}

/** The defaults of the spec (2026-10-05). */
export const DEFAULT_VOICE_CONFIG: VoiceConfig = {
  enabled: true,
  monthBudgetSeconds: 480,
  sessionCapSeconds: 180,
  pendingLeaseSeconds: 45,
  model: "gpt-realtime-2.1-mini",
  transcriptionModel: "gpt-transcribe",
  thbPerUsd: 36,
  estimatedThbPerMinute: 0.5,
};

/**
 * A positive number from an environment value, or the default.
 * @param value The raw value.
 * @param fallback The default.
 * @returns The number.
 */
const positive = (value: string | undefined, fallback: number): number => {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
};

/**
 * Reads the voice config from environment values.
 * @param env The environment (`process.env` in the app).
 * @returns The config with the spec defaults for unset values.
 */
export function voiceConfigFromEnv(env: Record<string, string | undefined>): VoiceConfig {
  return {
    enabled: env.AI_VOICE_ENABLED?.trim().toLowerCase() !== "false",
    monthBudgetSeconds: Math.round(positive(env.AI_VOICE_MONTH_BUDGET_SECONDS, DEFAULT_VOICE_CONFIG.monthBudgetSeconds)),
    sessionCapSeconds: Math.round(positive(env.AI_VOICE_SESSION_CAP_SECONDS, DEFAULT_VOICE_CONFIG.sessionCapSeconds)),
    pendingLeaseSeconds: DEFAULT_VOICE_CONFIG.pendingLeaseSeconds,
    model: env.AI_VOICE_MODEL?.trim() || DEFAULT_VOICE_CONFIG.model,
    transcriptionModel: DEFAULT_VOICE_CONFIG.transcriptionModel,
    thbPerUsd: positive(env.AI_VOICE_THB_PER_USD, DEFAULT_VOICE_CONFIG.thbPerUsd),
    estimatedThbPerMinute: positive(env.AI_VOICE_ESTIMATED_COST_THB_PER_MINUTE, DEFAULT_VOICE_CONFIG.estimatedThbPerMinute),
  };
}
