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
  generateObjectFromMedia: <T>(input: {
    schema: z.ZodSchema<T>;
    prompt: string;
    media: { buffer: Buffer; mimeType: string };
    model?: string;
    temperature?: number;
  }) => Promise<T>;
}

/** Default main audio model: hears Thai and English and gave the best judgment in the 2026-10-15 test. */
const DEFAULT_PRIMARY_MODEL = "qwen/qwen3.8-omni-flash";
/** Default backup audio model: fast and cheap; used when the main model fails. */
const DEFAULT_FALLBACK_MODEL = "google/gemini-2.5-flash-lite";
/** Per-criterion pass mark when the rubric has no criteria (matches the quiz threshold). */
const DEFAULT_PASSING_SCORE = 70;

/**
 * Replaces the model's overall score and pass flag with values computed from
 * the rubric: the weighted mean of the criterion scores, and a pass only when
 * every criterion meets its passing score. A rubric criterion the model did
 * not score counts as 0; each model entry serves one rubric criterion (name
 * match first, then the unused entries in order when the counts are equal).
 * With no rubric criteria, the model's criteria get
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
  // Name matches first; each model entry serves one rubric criterion only.
  const used = new Set<number>();
  const matchedIndexes = rubricCriteria.map((rubricCriterion) => {
    const index = result.criteria.findIndex(
      (c, i) =>
        !used.has(i) &&
        normalize(c.criterion) === normalize(rubricCriterion.criterion),
    );
    if (index >= 0) used.add(index);
    return index;
  });
  // With equal counts, unmatched criteria take the unused entries in order.
  const leftovers =
    result.criteria.length === rubricCriteria.length
      ? result.criteria.map((_, i) => i).filter((i) => !used.has(i))
      : [];
  const criteria =
    rubricCriteria.length > 0
      ? rubricCriteria.map((rubricCriterion, k) => {
          const index =
            matchedIndexes[k]! >= 0 ? matchedIndexes[k]! : leftovers.shift();
          const scored =
            index === undefined ? undefined : result.criteria[index];
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
 * and canonical source excerpts. Both audio models get the same prompt.
 * @param scenario - The roleplay scenario (persona, situation, objective)
 * @param rubric - The rubric (criteria + weights)
 * @param excerpts - Canonical sales-enablement source excerpts
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
): string {
  const criteriaText = JSON.stringify(rubric.criteriaJson, null, 2);
  const excerptsText = excerpts.join("\n\n---\n\n");
  return [
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
    "Listen to the attached audio recording and evaluate the rep's delivery, tone, pacing, hesitation, content fidelity, and adherence to the objective.",
    "The recording can be in Thai or English. Write the transcript excerpt in the language spoken.",
    "Return one criteria entry for each rubric criterion, in rubric order, and copy each criterion text exactly. Add no other criteria; put delivery and tone feedback in the summary.",
    "Score each criterion 0-100. Provide a transcript excerpt (first ~150 words).",
    "Return the structured evaluation matching the schema.",
  ].join("\n");
}

/**
 * Adapts an `AIClient` into the `EvaluateRoleplayFn` callback shape, with a
 * two-model fallback.
 *
 * **Main model:** `SALES_AUDIO_EVAL_MODEL` (default `qwen/qwen3.8-omni-flash`)
 * hears the recording and scores it against the rubric in one
 * `generateObjectFromMedia` call.
 *
 * **Backup model:** when the main call fails, the same audio and prompt go to
 * `SALES_AUDIO_EVAL_FALLBACK_MODEL` (default `google/gemini-2.5-flash-lite`).
 * Both models hear Thai and English speech.
 *
 * If both models fail, a `SalesError` with code `EVALUATION_FAILED` is thrown.
 * On either model, the overall score and pass flag come from
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
    const fallbackModel =
      process.env.SALES_AUDIO_EVAL_FALLBACK_MODEL ?? DEFAULT_FALLBACK_MODEL;
    const prompt = buildEvaluationPrompt(scenario, rubric, excerpts);
    /** Asks one model to evaluate the recording. */
    const evaluateWith = (model: string) =>
      aiClient.generateObjectFromMedia({
        schema,
        prompt,
        media: audio,
        model,
        temperature: 0.2,
      });
    let result: RoleplayEvaluationResult;
    try {
      result = await evaluateWith(primaryModel);
    } catch (primaryError) {
      try {
        result = await evaluateWith(fallbackModel);
      } catch (fallbackError) {
        // FR-5: log both failures and attach them via `cause`. Log only the
        // message: a parse error can quote model output with trainee speech.
        const message = (error: unknown) =>
          error instanceof Error ? error.message : String(error);
        console.error(
          "[roleplay-evaluator] Primary model failed:",
          primaryModel,
          message(primaryError),
        );
        console.error(
          "[roleplay-evaluator] Fallback model failed:",
          fallbackModel,
          message(fallbackError),
        );
        throw new SalesError(
          `Roleplay evaluation failed on both primary (${primaryModel}) and fallback (${fallbackModel}) models`,
          "EVALUATION_FAILED",
          { cause: { primaryError, fallbackError } },
        );
      }
    }
    // Outside the model fallback: a scoring error is not a model failure.
    return scoreRoleplayEvaluation(result, rubric.criteriaJson);
  };
}
