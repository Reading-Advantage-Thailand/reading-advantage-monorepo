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
/** Per-criterion pass mark when the rubric has no criteria (matches the quiz threshold). */
const DEFAULT_PASSING_SCORE = 70;

/**
 * Replaces the model's overall score and pass flag with values computed from
 * the rubric: the weighted mean of the criterion scores, and a pass only when
 * every criterion meets its passing score. A rubric criterion the model did
 * not score counts as 0. With no rubric criteria, the model's criteria get
 * equal weights and the default pass mark.
 * @param result The model's evaluation.
 * @param rubricCriteria The rubric criteria with weights and passing scores.
 * @returns The evaluation with rubric-ordered criteria and computed overall score and pass flag.
 */
export function scoreRoleplayEvaluation(
  result: RoleplayEvaluationResult,
  rubricCriteria: RubricOutput["criteriaJson"],
): RoleplayEvaluationResult {
  const normalize = (text: string) => text.trim().toLowerCase();
  const criteria =
    rubricCriteria.length > 0
      ? rubricCriteria.map((rubricCriterion, index) => {
          const scored =
            result.criteria.find(
              (c) =>
                normalize(c.criterion) === normalize(rubricCriterion.criterion),
            ) ??
            (result.criteria.length === rubricCriteria.length
              ? result.criteria[index]
              : undefined);
          return {
            ...rubricCriterion,
            score: scored?.score ?? 0,
            feedback: scored?.feedback ?? "Not evaluated.",
          };
        })
      : result.criteria.map((c) => ({
          ...c,
          weight: 1,
          passingScore: DEFAULT_PASSING_SCORE,
        }));
  const totalWeight = criteria.reduce((sum, c) => sum + c.weight, 0);
  const overallScore =
    totalWeight > 0
      ? Math.round(
          criteria.reduce((sum, c) => sum + c.score * c.weight, 0) /
            totalWeight,
        )
      : 0;
  return {
    ...result,
    overallScore,
    passed:
      criteria.length > 0 && criteria.every((c) => c.score >= c.passingScore),
    criteria: criteria.map(({ criterion, score, feedback }) => ({
      criterion,
      score,
      feedback,
    })),
  };
}

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
 * On either path, the overall score and pass flag come from
 * `scoreRoleplayEvaluation`, not from the model.
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
      const result = await aiClient.generateObjectFromMedia({
        schema,
        prompt: primaryPrompt,
        media: audio,
        model: primaryModel,
        temperature: 0.2,
      });
      return scoreRoleplayEvaluation(result, rubric.criteriaJson);
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
        return scoreRoleplayEvaluation(
          {
            ...result,
            transcriptExcerpt:
              result.transcriptExcerpt || transcript.slice(0, 600),
          },
          rubric.criteriaJson,
        );
      } catch (fallbackError) {
        // FR-5: log both underlying errors and attach them via `cause` so two-tier
        // LLM failures are debuggable. The previous code discarded both
        // `primaryError` and `fallbackError`, making `EVALUATION_FAILED`
        // indistinguishable from any other failure.
        console.error(
          "[roleplay-evaluator] Primary model failed:",
          primaryModel,
          primaryError,
        );
        console.error(
          "[roleplay-evaluator] Fallback STT→eval pipeline failed:",
          `STT=${sttModel}, eval=${evalModel}`,
          fallbackError,
        );
        throw new SalesError(
          `Roleplay evaluation failed on both primary (${primaryModel}) and fallback (STT ${sttModel} → eval ${evalModel}) paths`,
          "EVALUATION_FAILED",
          { cause: { primaryError, fallbackError } },
        );
      }
    }
  };
}
