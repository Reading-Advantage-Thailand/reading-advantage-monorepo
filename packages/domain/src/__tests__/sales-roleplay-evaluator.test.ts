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
    ...overrides,
  };
}

/** Returns the model of each generateObjectFromMedia call, in order. */
function calledModels(client: AIClientLike): string[] {
  return (client.generateObjectFromMedia as ReturnType<typeof vi.fn>).mock.calls.map(
    (call) => call[0].model,
  );
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

describe("buildEvaluationPrompt language", () => {
  it("tells the model that the recording can be in Thai or English", () => {
    const prompt = buildEvaluationPrompt(scenario, rubric, excerpts);
    expect(prompt).toContain("Thai or English");
    expect(prompt).toContain("language spoken");
    expect(prompt).toContain("one criteria entry for each rubric criterion");
    expect(prompt).toContain("copy each criterion text exactly");
  });
});

describe("buildEvaluationPrompt transcript source", () => {
  // S5 live check 2026-10-15: with model answers in the lesson excerpts, the model copied
  // prompt lines into the "transcript" and passed a recording that broke the claims rule.
  it("marks the scenario, rubric, and excerpts as reference text, not the recording", () => {
    const prompt = buildEvaluationPrompt(scenario, rubric, excerpts);
    const reference = prompt.slice(prompt.indexOf("<reference>"), prompt.indexOf("</reference>"));
    expect(reference).toContain("It is not part of the recording.");
    expect(reference).toContain("Director Somchai");
    expect(reference).toContain("Cold Call Rubric");
    expect(reference).toContain("Never claim guaranteed outcomes");
  });

  it("takes the transcript from the recording first, then scores only from it", () => {
    const prompt = buildEvaluationPrompt(scenario, rubric, excerpts);
    expect(prompt).toContain(
      "Take the transcript excerpt only from the words spoken in the recording. Do not copy or translate any text from this prompt.",
    );
    expect(prompt).toContain("quote the words from your transcript that meet or break the criterion");
    expect(prompt).toContain("If the transcript has no words that meet a criterion, the score is 20 or less.");
    expect(prompt).toContain("When a criterion applies only if something happens, and it did not happen in the recording, the score is 100.");
    expect(prompt).toContain("A claims criterion scores 0 when the transcript contains any one of the claims that it lists.");
  });

  it("asks the model for the transcript before the scores", () => {
    expect(Object.keys(roleplayEvaluationResultSchema.shape)[0]).toBe("transcriptExcerpt");
    const criterion = roleplayEvaluationResultSchema.shape.criteria.element;
    expect(Object.keys(criterion.shape)).toEqual(["criterion", "feedback", "score"]);
  });
});

describe("aiClientToEvaluateRoleplay", () => {
  it("calls generateObjectFromMedia with the primary model and returns the result", async () => {
    const client = makeClient();
    const evaluate = aiClientToEvaluateRoleplay(client, roleplayEvaluationResultSchema);
    const result = await evaluate(audio, scenario, rubric, excerpts);
    expect(result.overallScore).toBe(85);
    expect(calledModels(client)).toEqual(["qwen/qwen3.8-omni-flash"]);
    const call = (client.generateObjectFromMedia as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(call.media).toEqual(audio);
    expect(call.prompt).toContain("Director Somchai");
    expect(call.reasoningEffort).toBeUndefined();
  });

  it("sends the same audio to the backup model when the primary call fails", async () => {
    const client = makeClient({
      generateObjectFromMedia: vi
        .fn()
        .mockRejectedValueOnce(new Error("primary rate limited"))
        .mockResolvedValueOnce(goodResult),
    });
    const evaluate = aiClientToEvaluateRoleplay(client, roleplayEvaluationResultSchema);
    const result = await evaluate(audio, scenario, rubric, excerpts);
    expect(result.overallScore).toBe(85);
    expect(calledModels(client)).toEqual(["qwen/qwen3.8-omni-flash", "google/gemini-3.8-flash"]);
    const backupCall = (client.generateObjectFromMedia as ReturnType<typeof vi.fn>).mock.calls[1][0];
    expect(backupCall.media).toEqual(audio);
    expect(backupCall.prompt).toContain("Director Somchai");
    // Low reasoning keeps a backup score under $0.01 (2026-10-15 model comparison).
    expect(backupCall.reasoningEffort).toBe("low");
  });

  it("throws SalesError when both primary and fallback fail", async () => {
    const client = makeClient({
      generateObjectFromMedia: vi.fn().mockRejectedValue(new Error("model down")),
    });
    const evaluate = aiClientToEvaluateRoleplay(client, roleplayEvaluationResultSchema);
    await expect(evaluate(audio, scenario, rubric, excerpts)).rejects.toThrow(
      /failed on both primary.*fallback/,
    );
  });

  it("respects the SALES_AUDIO_EVAL_MODEL and SALES_AUDIO_EVAL_FALLBACK_MODEL overrides", async () => {
    vi.stubEnv("SALES_AUDIO_EVAL_MODEL", "custom/main");
    vi.stubEnv("SALES_AUDIO_EVAL_FALLBACK_MODEL", "custom/backup");
    const client = makeClient({
      generateObjectFromMedia: vi
        .fn()
        .mockRejectedValueOnce(new Error("primary fail"))
        .mockResolvedValueOnce(goodResult),
    });
    const evaluate = aiClientToEvaluateRoleplay(client, roleplayEvaluationResultSchema);
    await evaluate(audio, scenario, rubric, excerpts);
    expect(calledModels(client)).toEqual(["custom/main", "custom/backup"]);
    vi.unstubAllEnvs();
  });
});
