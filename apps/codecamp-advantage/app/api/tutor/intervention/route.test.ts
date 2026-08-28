import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const aiMocks = vi.hoisted(() => ({
  createAIClient: vi.fn(),
  generateObjectWithProvenance: vi.fn(),
}));
const authMocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
  getAuthToken: vi.fn(),
}));
const domainMocks = vi.hoisted(() => ({
  buildCodecampTutorContext: vi.fn(),
  createTenantDB: vi.fn(),
  joinTutorInterventionToVerifiedEvidence: vi.fn(),
  persistTutorIntervention: vi.fn(),
  recordTutorResourceUse: vi.fn(),
}));

vi.mock("@reading-advantage/ai", () => ({
  createAIClient: aiMocks.createAIClient,
}));
vi.mock("@reading-advantage/api/context", () => ({
  getAuthToken: authMocks.getAuthToken,
}));
vi.mock("@reading-advantage/auth", async () => {
  const actual = await vi.importActual<typeof import("@reading-advantage/auth")>("@reading-advantage/auth");
  return { ...actual, requireAuth: authMocks.requireAuth };
});
vi.mock("@reading-advantage/db", () => ({ db: {} }));
vi.mock("@reading-advantage/domain", () => ({
  createTenantDB: domainMocks.createTenantDB,
}));
vi.mock("@reading-advantage/domain/codecamp", async () => {
  const actual = await vi.importActual<typeof import("@reading-advantage/domain/codecamp")>("@reading-advantage/domain/codecamp");
  return {
    ...actual,
    buildCodecampTutorContext: domainMocks.buildCodecampTutorContext,
    joinTutorInterventionToVerifiedEvidence: domainMocks.joinTutorInterventionToVerifiedEvidence,
    persistTutorIntervention: domainMocks.persistTutorIntervention,
    recordTutorResourceUse: domainMocks.recordTutorResourceUse,
  };
});

import { POST } from "./route.js";

const originalApiKey = process.env.OPENROUTER_API_KEY;
const user = {
  id: "learner-1",
  username: "learner",
  name: "Learner",
  role: "STUDENT" as const,
  schoolId: "school-1",
  xp: 0,
  level: 1,
  cefrLevel: "A1" as const,
};
const answer = {
  message: "Set the stage position before starting the game.",
  level: "answer" as const,
  diagnosticQuestion: null,
  misconceptionTags: [],
  resource: null,
};
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

/**
 * Sends a request to the intervention route.
 * @param body Route request payload.
 * @returns The route response.
 */
function request(body: Record<string, unknown>) {
  return POST(new Request("https://codecamp.reading-advantage.com/api/tutor/intervention", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  }) as unknown as import("next/server").NextRequest);
}

describe("POST /api/tutor/intervention modes", () => {
  let activityMode: "guided" | "independent" = "guided";

  beforeEach(() => {
    vi.clearAllMocks();
    activityMode = "guided";
    process.env.OPENROUTER_API_KEY = "test-key";
    authMocks.getAuthToken.mockResolvedValue("token");
    authMocks.requireAuth.mockResolvedValue({ user });
    domainMocks.createTenantDB.mockReturnValue({});
    domainMocks.persistTutorIntervention.mockResolvedValue({ id: "intervention-1" });
    domainMocks.buildCodecampTutorContext.mockImplementation(async ({ input }: { input: { mode?: "ask" | "remediate" } }) => ({
      ...baseContext,
      mode: input.mode,
      activity: { ...baseContext.activity, mode: activityMode },
    }));
    aiMocks.createAIClient.mockReturnValue({
      generateObjectWithProvenance: aiMocks.generateObjectWithProvenance,
    });
  });

  afterEach(() => {
    if (originalApiKey === undefined) delete process.env.OPENROUTER_API_KEY;
    else process.env.OPENROUTER_API_KEY = originalApiKey;
  });

  it("forwards ask mode and returns a direct answer on model success", async () => {
    aiMocks.generateObjectWithProvenance.mockResolvedValue({
      object: answer,
      provenance: {
        provider: "openrouter",
        resolvedModel: "test-model-v1",
        requestId: "request-1",
        responseId: "response-1",
        latencyMs: 12,
      },
    });

    const response = await request({
      action: "request",
      requestId: "22222222-2222-4222-8222-222222222222",
      activitySessionId: "33333333-3333-4333-8333-333333333333",
      message: "How do I start?",
      locale: "en",
      mode: "ask",
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ ok: true, intervention: answer, resource: null });
    expect(domainMocks.buildCodecampTutorContext).toHaveBeenCalledWith(expect.objectContaining({
      input: expect.objectContaining({ mode: "ask" }),
    }));
    expect(aiMocks.generateObjectWithProvenance).toHaveBeenCalledWith(expect.objectContaining({
      prompt: expect.stringContaining("Answer the learner's question directly"),
    }));
  });

  it("uses the ask fallback when generation fails", async () => {
    aiMocks.generateObjectWithProvenance.mockRejectedValue(new Error("provider unavailable"));

    const response = await request({
      action: "request",
      requestId: "22222222-2222-4222-8222-222222222222",
      activitySessionId: "33333333-3333-4333-8333-333333333333",
      message: "How do I start?",
      locale: "en",
      mode: "ask",
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      ok: false,
      intervention: { level: "answer", diagnosticQuestion: null },
    });
  });

  it("uses the ask fallback without an API key", async () => {
    delete process.env.OPENROUTER_API_KEY;

    const response = await request({
      action: "request",
      requestId: "22222222-2222-4222-8222-222222222222",
      activitySessionId: "33333333-3333-4333-8333-333333333333",
      message: "How do I start?",
      locale: "en",
      mode: "ask",
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      ok: false,
      intervention: { level: "answer", diagnosticQuestion: null },
    });
    expect(aiMocks.createAIClient).not.toHaveBeenCalled();
  });

  it("defaults an omitted mode to remediation", async () => {
    delete process.env.OPENROUTER_API_KEY;

    const response = await request({
      action: "request",
      requestId: "22222222-2222-4222-8222-222222222222",
      activitySessionId: "33333333-3333-4333-8333-333333333333",
      message: "I am stuck.",
      locale: "en",
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      ok: false,
      intervention: { level: "diagnostic", diagnosticQuestion: expect.any(String) },
    });
    expect(domainMocks.buildCodecampTutorContext).toHaveBeenCalledWith(expect.objectContaining({
      input: expect.objectContaining({ mode: "remediate" }),
    }));
  });

  it("keeps independent activity on remediation behavior for ask mode", async () => {
    activityMode = "independent";
    aiMocks.generateObjectWithProvenance.mockResolvedValue({
      object: answer,
      provenance: {
        provider: "openrouter",
        resolvedModel: "test-model-v1",
        requestId: "request-1",
        responseId: "response-1",
        latencyMs: 12,
      },
    });

    const response = await request({
      action: "request",
      requestId: "22222222-2222-4222-8222-222222222222",
      activitySessionId: "33333333-3333-4333-8333-333333333333",
      message: "How do I start?",
      locale: "en",
      mode: "ask",
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      ok: false,
      intervention: { level: "diagnostic", diagnosticQuestion: expect.any(String) },
    });
    expect(aiMocks.generateObjectWithProvenance).toHaveBeenCalledWith(expect.objectContaining({
      prompt: expect.stringContaining("Submission-ready answer forbidden: true"),
    }));
  });
});
