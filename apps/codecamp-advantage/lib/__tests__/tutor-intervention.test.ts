import { describe, expect, it, vi } from "vitest";
import { generateCodecampTutorIntervention } from "../tutor-intervention";

const context = {
  objective: { id: "codecamp.apk.stage", title: "APK stage", description: "Build a stage that passes its check." },
  activity: { id: "activity:apk-stage", version: "1.0.0", mode: "guided" as const, graphVersion: "1.0.0", stepId: "wedo.stage" },
  locale: "en" as const,
  attempts: [{ checkId: "stage", status: "failed" as const }],
  scaffoldHistory: [],
  resources: [{ id: "video:apk-stage", kind: "video" as const, title: "Stage video", action: { type: "seek" as const, startSeconds: 4, endSeconds: 12 } }],
  versions: { promptPolicy: "policy.v1", schema: "codecamp-tutor-response.v1", resources: "resources.v1" },
};

describe("generateCodecampTutorIntervention", () => {
  it("uses the public provenance-capable adapter and never promotes a hint to evidence", async () => {
    const generateObjectWithProvenance = vi.fn().mockResolvedValue({
      object: {
        message: "Inspect the update before changing it.",
        level: "conceptual_hint",
        diagnosticQuestion: "What value should the update produce?",
        misconceptionTags: ["state-update"],
        resource: { resourceId: "video:apk-stage" },
      },
      provenance: {
        provider: "openrouter",
        requestedModel: "xiaomi/mimo-v2.5",
        resolvedModel: "xiaomi/mimo-v2.5-2026-07",
        requestId: "request-1",
        responseId: "response-1",
        latencyMs: 42,
        usage: { inputTokens: 10, outputTokens: 20, totalTokens: 30, reasoningTokens: null, cachedInputTokens: null },
      },
    });

    const result = await generateCodecampTutorIntervention({
      context,
      learnerMessage: "I am stuck.",
      modelAlias: "xiaomi/mimo-v2.5",
      client: { generateObjectWithProvenance },
    });

    expect(generateObjectWithProvenance).toHaveBeenCalledWith(expect.objectContaining({
      model: "xiaomi/mimo-v2.5",
      maxTokens: 800,
    }));
    expect(result).toMatchObject({ ok: true, evidence: null, resource: { id: "video:apk-stage" } });
    expect(result.provenance).toMatchObject({
      provider: "openrouter",
      resolvedModel: "xiaomi/mimo-v2.5-2026-07",
      providerRequestId: "request-1",
    });
  });
});
