import { z } from "zod";
import type {
  RoleplayScenarioOutput,
  RubricOutput,
  RoleplayEvaluationResult,
} from "./schema.js";
import { roleplayEvaluationResultSchema } from "./schema.js";
import { SalesError } from "./errors.js";

/**
 * Structural interface matching the subset of `AIClient` that the roleplay
 * evaluator depends on. Keeps the domain package free of
 * `@reading-advantage/ai` imports (Provider-Neutrality Rule from AGENTS.md).
 */
export interface AIClientLike {
  generateObject: <T>(input: {
    schema: z.ZodSchema<T>;
    prompt: string;
    model?: string;
    temperature?: number;
  }) => Promise<T>;
  generateObjectFromMedia: <T>(input: {
    schema: z.ZodSchema<T>;
    prompt: string;
    media: { buffer: Buffer; mimeType: string };
    model?: string;
    temperature?: number;
  }) => Promise<T>;
  transcribeAudio: (input: {
    media: { buffer: Buffer; mimeType: string };
    model?: string;
    language?: string;
  }) => Promise<{ text: string }>;
}

/** Default primary single-pass multimodal model (OpenRouter, free). */
const DEFAULT_PRIMARY_MODEL =
  "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free";
/** Default fallback ASR/STT model (OpenRouter, $0.0015/min). */
const DEFAULT_FALLBACK_STT_MODEL = "nvidia/parakeet-tdt-0.6b-v3";
/** Default fallback text-evaluation model (OpenRouter, free). */
const DEFAULT_FALLBACK_EVAL_MODEL = "nvidia/nemotron-3-nano-30b-a3b:free";

/**
 * Builds the evaluation prompt for a roleplay attempt from the scenario, rubric,
 * and canonical source excerpts. Used for both the single-pass multimodal call
 * and the fallback text-only call.
 * @param scenario - The roleplay scenario (persona, situation, objective)
 * @param rubric - The rubric (criteria + weights)
 * @param excerpts - Canonical sales-enablement source excerpts
 * @param transcript - Optional transcript (used by the fallback text-only path)
 * @returns The prompt string
 */
export function buildEvaluationPrompt(
  scenario: {
    personaName: string;
    personaRole: string;
    situation: string;
    objective: string;
  },
  rubric: { name: string; criteriaJson: unknown },
  excerpts: string[],
  transcript?: string,
): string {
  const criteriaText = JSON.stringify(rubric.criteriaJson, null, 2);
  const excerptsText = excerpts.join("\n\n---\n\n");
  const lines = [
    "You are a sales-coaching evaluator. Evaluate the sales rep's performance against the rubric below.",
    "",
    `## Scenario: ${scenario.personaName} (${scenario.personaRole})`,
    `Situation: ${scenario.situation}`,
    `Objective: ${scenario.objective}`,
    "",
    `## Rubric: ${rubric.name}`,
    criteriaText,
    "",
    "## Canonical source material (ground your feedback in these)",
    excerptsText,
    "",
  ];
  if (transcript) {
    lines.push(
      "## Transcript of the rep's recording",
      transcript,
      "",
      "Evaluate the rep's content, structure, question quality, and adherence to the objective. (Note: only text is available; you cannot judge tone/pacing/hesitation directly.)",
    );
  } else {
    lines.push(
      "Listen to the attached audio recording and evaluate the rep's delivery, tone, pacing, hesitation, content fidelity, and adherence to the objective.",
    );
  }
  lines.push(
    "Score each criterion 0-100. Provide a transcript excerpt (first ~150 words).",
    "Return the structured evaluation matching the schema.",
  );
  return lines.join("\n");
}

/**
 * Adapts an `AIClient` into the `EvaluateRoleplayFn` callback shape, with a
 * two-tier fallback pipeline.
 *
 * **Primary path (single-pass multimodal):** Uses `SALES_AUDIO_EVAL_MODEL`
 * (default `nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free`) via
 * `generateObjectFromMedia`. The model perceives the audio directly and reasons
 * against the rubric in one call, preserving paralinguistic cues
 * (tone/pacing/hesitation).
 *
 * **Fallback path (two-pass STT → text eval):** On primary failure, the audio
 * is transcribed via `SALES_AUDIO_EVAL_FALLBACK_STT_MODEL` (default
 * `nvidia/parakeet-tdt-0.6b-v3`, an ASR model), and the resulting transcript
 * is evaluated by `SALES_AUDIO_EVAL_FALLBACK_EVAL_MODEL` (default
 * `nvidia/nemotron-3-nano-30b-a3b:free`, a text reasoning model) via
 * `generateObject`. This loses paralinguistic cues but is more reliable.
 *
 * If both paths fail, a `SalesError` with code `EVALUATION_FAILED` is thrown.
 *
 * @param aiClient - The shared AIClient (OpenRouterProvider in production)
 * @param schema - The Zod schema for the evaluation result
 * @returns A function that evaluates an audio attempt
 */
export function aiClientToEvaluateRoleplay(
  aiClient: AIClientLike,
  schema: z.ZodSchema<RoleplayEvaluationResult> = roleplayEvaluationResultSchema,
) {
  return async (
    audio: { buffer: Buffer; mimeType: string },
    scenario: RoleplayScenarioOutput,
    rubric: RubricOutput,
    excerpts: string[],
  ): Promise<RoleplayEvaluationResult> => {
    const primaryModel =
      process.env.SALES_AUDIO_EVAL_MODEL ?? DEFAULT_PRIMARY_MODEL;
    const sttModel =
      process.env.SALES_AUDIO_EVAL_FALLBACK_STT_MODEL ??
      DEFAULT_FALLBACK_STT_MODEL;
    const evalModel =
      process.env.SALES_AUDIO_EVAL_FALLBACK_EVAL_MODEL ??
      DEFAULT_FALLBACK_EVAL_MODEL;
    const primaryPrompt = buildEvaluationPrompt(scenario, rubric, excerpts);
    try {
      return await aiClient.generateObjectFromMedia({
        schema,
        prompt: primaryPrompt,
        media: audio,
        model: primaryModel,
        temperature: 0.2,
      });
    } catch (primaryError) {
      // Fallback: STT → text-eval
      try {
        const { text: transcript } = await aiClient.transcribeAudio({
          media: audio,
          model: sttModel,
        });
        const fallbackPrompt = buildEvaluationPrompt(
          scenario,
          rubric,
          excerpts,
          transcript,
        );
        const result = await aiClient.generateObject({
          schema,
          prompt: fallbackPrompt,
          model: evalModel,
          temperature: 0.2,
        });
        // Ensure transcriptExcerpt is populated even if the eval model omits it
        if (!result.transcriptExcerpt) {
          return { ...result, transcriptExcerpt: transcript.slice(0, 600) };
        }
        return result;
      } catch (fallbackError) {
        throw new SalesError(
          `Roleplay evaluation failed on both primary (${primaryModel}) and fallback (STT ${sttModel} → eval ${evalModel}) paths`,
          "EVALUATION_FAILED",
        );
      }
    }
  };
}
