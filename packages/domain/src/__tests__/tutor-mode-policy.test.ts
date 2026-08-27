import { describe, expect, it } from "vitest";
import {
  assembleTutorContext,
  buildTutorPrompt,
  createSafeTutorFallback,
  generateTutorIntervention,
  buildCodecampTutorContextInputSchema,
  interventionResponseSchema,
  selectTutorInterventionPolicy,
  tutorInterventionLevelSchema,
  tutorModeSchema,
} from "../codecamp/tutor.js";

const baseContext = {
  objective: {
    id: "codecamp.objective",
    title: "Build a stage",
    description: "Create and verify a small playable stage.",
  },
  activity: {
    id: "activity:stage",
    version: "1.0.0",
    mode: "guided" as const,
    graphVersion: "stage-graph.v1",
    stepId: "stage.step",
  },
  locale: "en" as const,
  attempts: [],
  scaffoldHistory: [],
  resources: [],
  versions: {
    promptPolicy: "codecamp-tutor-policy.v1",
    schema: "codecamp-tutor-response.v1",
    resources: "stage-resources.v1",
  },
};

const answer = {
  message: "Set the stage position before starting the game.",
  level: "answer" as const,
  diagnosticQuestion: null,
  misconceptionTags: [],
  resource: null,
};

describe("Codecamp tutor mode policy", () => {
  it("answers an ask request directly and keeps remediation diagnostic-first", async () => {
    expect(tutorModeSchema.parse("ask")).toBe("ask");
    expect(tutorModeSchema.parse("remediate")).toBe("remediate");
    expect(tutorInterventionLevelSchema.parse("answer")).toBe("answer");

    const askContext = assembleTutorContext({ ...baseContext, mode: "ask" });
    const askPolicy = selectTutorInterventionPolicy(askContext, "How do I start?");
    const askPrompt = buildTutorPrompt(askContext, "How do I start?", askPolicy);

    expect(askPolicy.maximumLevel).toBe("answer");
    expect(askPolicy.disallowSubmissionReadyAnswer).toBe(false);
    expect(askPrompt).toContain("Answer the learner's question directly");
    expect(askPrompt).not.toContain("Start with the smallest useful hint");

    const remediateContext = assembleTutorContext(baseContext);
    const remediatePolicy = selectTutorInterventionPolicy(remediateContext, "I am stuck.");
    const remediatePrompt = buildTutorPrompt(remediateContext, "I am stuck.", remediatePolicy);

    expect(buildCodecampTutorContextInputSchema.parse({
      activitySessionId: "22222222-2222-4222-8222-222222222222",
      locale: "en",
    }).mode).toBe("remediate");
    expect(remediatePolicy.maximumLevel).toBe("diagnostic");
    expect(remediatePrompt).toContain("Start with the smallest useful hint");

    const remediationLadder = [
      "diagnostic",
      "conceptual_hint",
      "location_hint",
      "partial_scaffold",
      "worked_example",
    ] as const;
    const selectedLevels = remediationLadder.map((level, index) => selectTutorInterventionPolicy({
      ...remediateContext,
      attempts: index === 0 ? [] : [{ checkId: "stage", status: "failed" as const }],
      scaffoldHistory: index === 0 ? [] : [remediationLadder[index - 1]],
    }, "I am stuck.").maximumLevel);
    expect(selectedLevels).toEqual(remediationLadder);

    const generatedAsk = await generateTutorIntervention({
      context: { ...baseContext, mode: "ask" },
      learnerMessage: "How do I start?",
      generate: async () => answer,
      provenance: { modelAlias: "test-model", resolvedModel: "test-model" },
    });

    expect(generatedAsk.ok).toBe(true);
    expect(generatedAsk.intervention).toEqual(answer);
    expect(interventionResponseSchema.parse(answer)).toEqual(answer);

    const remediateResponse = {
      message: "Check the stage position.",
      level: "diagnostic" as const,
      diagnosticQuestion: "What position should the stage use?",
      misconceptionTags: [],
      resource: null,
    };
    const generatedRemediate = await generateTutorIntervention({
      context: baseContext,
      learnerMessage: "I am stuck.",
      generate: async () => remediateResponse,
      provenance: { modelAlias: "test-model", resolvedModel: "test-model" },
    });
    expect(generatedRemediate.ok).toBe(true);
    expect(interventionResponseSchema.parse(generatedRemediate.intervention)).toEqual(remediateResponse);

    expect(interventionResponseSchema.parse(createSafeTutorFallback(askContext.locale))).toBeTruthy();
    expect(interventionResponseSchema.parse(createSafeTutorFallback(remediateContext.locale))).toBeTruthy();
  });
});
