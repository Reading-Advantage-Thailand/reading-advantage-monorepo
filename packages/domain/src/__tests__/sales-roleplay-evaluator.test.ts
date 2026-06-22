import { describe, it, expect, vi } from "vitest";
import {
  aiClientToEvaluateRoleplay,
  buildEvaluationPrompt,
  type AIClientLike,
} from "../sales/roleplay-evaluator.js";
import { roleplayEvaluationResultSchema } from "../sales/schema.js";

const scenario = {
  id: "s1",
  lessonId: "l1",
  personaName: "Director Somchai",
  personaRole: "School Director",
  situation: "Cold call to a Bangkok primary school",
  objective: "Book a 15-minute discovery meeting",
  prospectContextJson: {},
  rubricId: "r1",
  order: 1,
  createdAt: new Date(),
};

const rubric = {
  id: "r1",
  name: "Cold Call Rubric",
  criteriaJson: [{ criterion: "Opening", weight: 0.3, passingScore: 70, sourceRef: "demo-scripts.md" }],
  reviewStatus: "approved",
  createdAt: new Date(),
};

const excerpts = ["Always lead with the Big 4 protocol.", "Never claim guaranteed outcomes."];

const goodResult = {
  overallScore: 85,
  passed: true,
  criteria: [{ criterion: "Opening", score: 85, feedback: "Strong opener" }],
  summary: "Good call",
  strengths: ["clear opener"],
  weaknesses: ["talked too fast"],
  suggestedNextAction: "Slow your pacing",
  transcriptExcerpt: "Hello Director Somchai...",
};

const audio = { buffer: Buffer.from("audio"), mimeType: "audio/webm" };

function makeClient(overrides?: Partial<AIClientLike>): AIClientLike {
  return {
    generateObjectFromMedia: vi.fn().mockResolvedValue(goodResult),
    generateObject: vi.fn().mockResolvedValue(goodResult),
    transcribeAudio: vi.fn().mockResolvedValue({ text: "[mock transcript]" }),
    ...overrides,
  };
}

describe("buildEvaluationPrompt", () => {
  it("includes scenario persona, situation, objective, rubric, and excerpts", () => {
    const prompt = buildEvaluationPrompt(scenario, rubric, excerpts);
    expect(prompt).toContain("Director Somchai");
    expect(prompt).toContain("School Director");
    expect(prompt).toContain("Cold call to a Bangkok primary school");
    expect(prompt).toContain("Book a 15-minute discovery meeting");
    expect(prompt).toContain("Cold Call Rubric");
    expect(prompt).toContain("Big 4 protocol");
    expect(prompt).toContain("Never claim guaranteed outcomes");
    expect(prompt).toContain("transcript excerpt");
  });
});

describe("buildEvaluationPrompt with transcript", () => {
  it("includes the transcript and notes text-only evaluation limitation", () => {
    const prompt = buildEvaluationPrompt(scenario, rubric, excerpts, "Rep said hello...");
    expect(prompt).toContain("Rep said hello...");
    expect(prompt).toContain("only text is available");
  });
});

describe("aiClientToEvaluateRoleplay", () => {
  it("calls generateObjectFromMedia with the primary model and returns the result", async () => {
    const client = makeClient();
    const evaluate = aiClientToEvaluateRoleplay(client, roleplayEvaluationResultSchema);
    const result = await evaluate(audio, scenario, rubric, excerpts);
    expect(result.overallScore).toBe(85);
    expect(client.generateObjectFromMedia).toHaveBeenCalledTimes(1);
    const call = (client.generateObjectFromMedia as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(call.media).toEqual(audio);
    expect(call.model).toBe("nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free");
    expect(call.prompt).toContain("Director Somchai");
  });

  it("falls back to STT → text-eval when the primary call fails", async () => {
    const client = makeClient({
      generateObjectFromMedia: vi
        .fn()
        .mockRejectedValueOnce(new Error("primary rate limited")),
      transcribeAudio: vi.fn().mockResolvedValue({ text: "Rep introduced herself professionally" }),
      generateObject: vi.fn().mockResolvedValue(goodResult),
    });
    const evaluate = aiClientToEvaluateRoleplay(client, roleplayEvaluationResultSchema);
    const result = await evaluate(audio, scenario, rubric, excerpts);
    expect(result.overallScore).toBe(85);
    expect(client.generateObjectFromMedia).toHaveBeenCalledTimes(1);
    expect(client.transcribeAudio).toHaveBeenCalledTimes(1);
    expect((client.transcribeAudio as ReturnType<typeof vi.fn>).mock.calls[0][0].model).toBe(
      "nvidia/parakeet-tdt-0.6b-v3",
    );
    expect(client.generateObject).toHaveBeenCalledTimes(1);
    const evalCall = (client.generateObject as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(evalCall.model).toBe("nvidia/nemotron-3-nano-30b-a3b:free");
    expect(evalCall.prompt).toContain("Director Somchai");
    expect(evalCall.prompt).toContain("Rep introduced herself professionally");
  });

  it("throws SalesError when both primary and fallback fail", async () => {
    const client = makeClient({
      generateObjectFromMedia: vi.fn().mockRejectedValue(new Error("primary down")),
      transcribeAudio: vi.fn().mockRejectedValue(new Error("STT failed")),
    });
    const evaluate = aiClientToEvaluateRoleplay(client, roleplayEvaluationResultSchema);
    await expect(evaluate(audio, scenario, rubric, excerpts)).rejects.toThrow(
      /failed on both primary.*fallback/,
    );
  });

  it("respects SALES_AUDIO_EVAL_MODEL env override for primary", async () => {
    vi.stubEnv("SALES_AUDIO_EVAL_MODEL", "custom/model");
    const client = makeClient();
    const evaluate = aiClientToEvaluateRoleplay(client, roleplayEvaluationResultSchema);
    await evaluate(audio, scenario, rubric, excerpts);
    expect((client.generateObjectFromMedia as ReturnType<typeof vi.fn>).mock.calls[0][0].model).toBe(
      "custom/model",
    );
    vi.unstubAllEnvs();
  });

  it("respects SALES_AUDIO_EVAL_FALLBACK_STT_MODEL env override", async () => {
    vi.stubEnv("SALES_AUDIO_EVAL_FALLBACK_STT_MODEL", "custom/stt");
    vi.stubEnv("SALES_AUDIO_EVAL_FALLBACK_EVAL_MODEL", "custom/eval");
    const client = makeClient({
      generateObjectFromMedia: vi.fn().mockRejectedValue(new Error("primary fail")),
      transcribeAudio: vi.fn().mockResolvedValue({ text: "transcript" }),
      generateObject: vi.fn().mockResolvedValue(goodResult),
    });
    const evaluate = aiClientToEvaluateRoleplay(client, roleplayEvaluationResultSchema);
    await evaluate(audio, scenario, rubric, excerpts);
    expect((client.transcribeAudio as ReturnType<typeof vi.fn>).mock.calls[0][0].model).toBe(
      "custom/stt",
    );
    expect((client.generateObject as ReturnType<typeof vi.fn>).mock.calls[0][0].model).toBe(
      "custom/eval",
    );
    vi.unstubAllEnvs();
  });

  it("populates transcriptExcerpt from transcript when the eval model omits it", async () => {
    const resultNoExcerpt = { ...goodResult, transcriptExcerpt: undefined };
    const client = makeClient({
      generateObjectFromMedia: vi.fn().mockRejectedValue(new Error("primary fail")),
      transcribeAudio: vi.fn().mockResolvedValue({ text: "A".repeat(1000) }),
      generateObject: vi.fn().mockResolvedValue(resultNoExcerpt),
    });
    const evaluate = aiClientToEvaluateRoleplay(client, roleplayEvaluationResultSchema);
    const result = await evaluate(audio, scenario, rubric, excerpts);
    expect(result.transcriptExcerpt).toBe("A".repeat(600));
  });

  it("never calls transcribeAudio when primary succeeds", async () => {
    const client = makeClient();
    const evaluate = aiClientToEvaluateRoleplay(client, roleplayEvaluationResultSchema);
    await evaluate(audio, scenario, rubric, excerpts);
    expect(client.transcribeAudio).not.toHaveBeenCalled();
    expect(client.generateObject).not.toHaveBeenCalled();
  });
});