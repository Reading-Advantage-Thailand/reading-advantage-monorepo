import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  assembleTutorContext,
  createTutorContextFromAuthorizedActivity,
  createSafeTutorFallback,
  generateTutorIntervention,
  interventionResponseSchema,
  resolveCodecampTutorModel,
  resolveTutorResource,
  selectTutorInterventionPolicy,
  toVerifiedTutorSupportMetadata,
} from "../codecamp/tutor.js";
import { summarizeTutorSupport } from "../codecamp/intern-accounts.js";

const FIXTURE_PATH = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../__fixtures__/codecamp-tutor-interventions.v1.json",
);

const baseContext = {
  objective: {
    id: "codecamp.game-development.apk-stage",
    title: "Build an APK stage",
    description: "Create and verify a small playable stage.",
  },
  activity: {
    id: "activity:apk-guided.stage",
    version: "1.0.0",
    mode: "guided" as const,
    graphVersion: "1.0.0",
    stepId: "wedo.stage",
  },
  locale: "en" as const,
  attempts: [{ checkId: "stage-check", status: "failed" as const }],
  scaffoldHistory: [],
  resources: [
    {
      id: "diagram:apk.boundaries",
      kind: "diagram" as const,
      title: "Host and cartridge boundary",
      action: { type: "highlight" as const, target: "diagram.apk.boundaries" },
    },
    {
      id: "video:apk-stage-intro",
      kind: "video" as const,
      title: "Stage walkthrough",
      action: { type: "seek" as const, startSeconds: 42, endSeconds: 75 },
    },
    {
      id: "repository:apk-stage-starter",
      kind: "repository" as const,
      title: "Starter repository",
      action: { type: "open" as const, target: "src/game/stage.ts" },
    },
  ],
  versions: {
    promptPolicy: "codecamp-tutor-policy.v1",
    schema: "codecamp-tutor-response.v1",
    resources: "apk-resources.v1",
  },
};

describe("Codecamp intervention tutor contract", () => {
  it("uses a dedicated validated tutor model setting", () => {
    expect(resolveCodecampTutorModel({})).toBe("xiaomi/mimo-v2.5");
    expect(resolveCodecampTutorModel({ CODECAMP_TUTOR_MODEL: "xiaomi/mimo-v2.5-2026-07" })).toBe("xiaomi/mimo-v2.5-2026-07");
    expect(() => resolveCodecampTutorModel({ CODECAMP_TUTOR_MODEL: "xiaomi/mimo v2.5" })).toThrow(/CODECAMP_TUTOR_MODEL/);
    expect(() => resolveCodecampTutorModel({ CODECAMP_TUTOR_MODEL: "mimo\u0001v2.5" })).toThrow(/CODECAMP_TUTOR_MODEL/);
  });

  it("keeps one frozen contract fixture for every escalation level without provider-authored resource details", () => {
    const fixture = JSON.parse(readFileSync(FIXTURE_PATH, "utf8")) as {
      schemaVersion: string;
      fixtureKind: string;
      modelAlias: string;
      cases: Array<{ response: unknown }>;
    };
    expect(fixture).toMatchObject({
      schemaVersion: "codecamp-tutor-response.v1",
      fixtureKind: "contract-only",
      modelAlias: "xiaomi/mimo-v2.5",
    });

    const responses = fixture.cases.map(({ response }) => interventionResponseSchema.parse(response));
    expect(responses.map(({ level }) => level)).toEqual([
      "diagnostic",
      "conceptual_hint",
      "location_hint",
      "partial_scaffold",
      "worked_example",
    ]);
    for (const response of responses) {
      if (response.resource) {
        expect(resolveTutorResource(baseContext.resources, response.resource.resourceId).id)
          .toBe(response.resource.resourceId);
      }
    }
  });

  it("resolves only a curated resource ID and returns the trusted action", () => {
    const resource = resolveTutorResource(
      baseContext.resources,
      "video:apk-stage-intro",
    );

    expect(resource).toMatchObject({
      id: "video:apk-stage-intro",
      action: { type: "seek", startSeconds: 42, endSeconds: 75 },
    });
  });

  it("rejects unknown resource IDs and provider-supplied target details", () => {
    expect(() => resolveTutorResource(baseContext.resources, "video:invented")).toThrow(
      /trusted resource/i,
    );
    expect(
      interventionResponseSchema.safeParse({
        message: "Try checking the stage update.",
        level: "location_hint",
        diagnosticQuestion: "Which function updates the stage?",
        misconceptionTags: [],
        resource: { resourceId: "video:apk-stage-intro", startSeconds: 900 },
      }).success,
    ).toBe(false);
  });

  it("fails closed when a structured model response names an unknown resource", async () => {
    const result = await generateTutorIntervention({
      context: baseContext,
      learnerMessage: "Tell me exactly where to go.",
      generate: async () => ({
        message: "Open this video.",
        level: "location_hint",
        diagnosticQuestion: "What does the stage check report?",
        misconceptionTags: ["stage-update"],
        resource: { resourceId: "video:invented" },
      }),
      provenance: { modelAlias: "codecamp-tutor", resolvedModel: "xiaomi/mimo-v2.5" },
    });

    expect(result.ok).toBe(false);
    expect(result.intervention).toEqual(createSafeTutorFallback("en"));
    expect(result.evidence).toBeNull();
  });

  it("limits an independent learner asking for a complete solution to a bounded scaffold", () => {
    const policy = selectTutorInterventionPolicy({
      ...baseContext,
      activity: { ...baseContext.activity, mode: "independent" },
      scaffoldHistory: ["diagnostic", "conceptual_hint", "location_hint", "partial_scaffold"],
    }, "Please give me the full solution I can submit.");

    expect(policy.maximumLevel).toBe("partial_scaffold");
    expect(policy.disallowSubmissionReadyAnswer).toBe(true);
  });

  it("keeps support as non-mastery context until a verified follow-up exists", () => {
    const context = assembleTutorContext(baseContext);
    const response = {
      message: "Compare the value before and after the update.",
      level: "conceptual_hint" as const,
      diagnosticQuestion: "What value do you predict after one update?",
      misconceptionTags: ["state-transition"],
      resource: null,
    };

    expect(toVerifiedTutorSupportMetadata(context, response, false)).toBeNull();
    expect(toVerifiedTutorSupportMetadata(context, response, true)).toEqual({
      hintsUsed: 1,
      revealsUsed: 0,
      interventionLevel: 1,
      misconceptionTags: ["state-transition"],
    });
  });

  it("derives the guided APK context from authored activity data and rejects an unowned step", () => {
    const context = createTutorContextFromAuthorizedActivity({
      activity: {
        activityId: "codecamp.activity.apk.wedo",
        activityVersion: "1.0.0",
        graphVersion: "apk-graph.v1",
        objectiveId: "codecamp.game-development.skill.apk-contract",
        mode: "guided_practice",
        title: { en: "Complete the manifest", th: "เติม manifest" },
        resources: [{
          kind: "diagram",
          resourceId: "diagram.apk.boundaries",
          alt: { en: "Host boundary", th: "ขอบเขต host" },
        }],
        checkpoints: [],
        tutorialSteps: [{
          stepId: "wedo.apk.manifest",
          objectiveId: "codecamp.game-development.skill.apk-contract",
          instruction: { en: "Complete the manifest", th: "เติม manifest" },
          checks: [{ checkId: "manifest.shape" }],
          resourceRefs: [{ kind: "diagram", resourceId: "diagram.apk.boundaries" }],
        }],
      },
      state: {
        assessedCheckpointResults: {},
        assessedTutorialResults: { "wedo.apk.manifest": { isCorrect: false } },
      },
      locale: "th",
      requestedStepId: "wedo.apk.manifest",
      interventionLevels: [0, 1],
    });

    expect(context).toMatchObject({
      objective: { id: "codecamp.game-development.skill.apk-contract", title: "เติม manifest" },
      activity: { id: "codecamp.activity.apk.wedo", mode: "guided", stepId: "wedo.apk.manifest" },
      locale: "th",
      attempts: [{ checkId: "manifest.shape", status: "not_run" }, { checkId: "wedo.apk.manifest", status: "failed" }],
      scaffoldHistory: ["diagnostic", "conceptual_hint"],
      resources: [{ id: "diagram:diagram.apk.boundaries", action: { type: "highlight", target: "diagram.apk.boundaries" } }],
    });

    expect(() => createTutorContextFromAuthorizedActivity({
      activity: {
        activityId: "codecamp.activity.apk.wedo", activityVersion: "1.0.0", graphVersion: "apk-graph.v1",
        objectiveId: "codecamp.game-development.skill.apk-contract", mode: "guided_practice", title: { en: "Complete", th: "เติม" },
        resources: [], checkpoints: [], tutorialSteps: [{ stepId: "wedo.apk.manifest", objectiveId: "codecamp.game-development.skill.apk-contract", instruction: { en: "Complete", th: "เติม" }, checks: [], resourceRefs: [] }],
      },
      state: { assessedCheckpointResults: {}, assessedTutorialResults: {} }, locale: "en", requestedStepId: "../../.env", interventionLevels: [],
    })).toThrow(/activity step/i);
  });

  it("creates a teacher-safe support summary without learner messages or model reasoning", () => {
    expect(summarizeTutorSupport(
      [
        { id: "a", interventionLevel: 1, misconceptionTagsJson: ["state-transition"], createdAt: new Date("2026-07-12T01:00:00.000Z") },
        { id: "b", interventionLevel: 4, misconceptionTagsJson: ["state-transition", "abi-boundary"], createdAt: new Date("2026-07-12T02:00:00.000Z") },
      ],
      [{ interventionId: "a" }, { interventionId: "b" }],
      [{ interventionId: "b" }],
    )).toEqual({
      totalInterventions: 2,
      verifiedFollowUps: 1,
      resourceUses: 2,
      levels: { diagnostic: 0, conceptual_hint: 1, location_hint: 0, partial_scaffold: 0, worked_example: 1 },
      misconceptionTags: [{ tag: "state-transition", count: 2 }, { tag: "abi-boundary", count: 1 }],
      latestInterventionAt: new Date("2026-07-12T02:00:00.000Z"),
    });
  });
});
