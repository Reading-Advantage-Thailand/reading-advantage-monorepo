// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const {
  mockAuthenticateSalesRequest,
  mockGetAIClient,
  mockGetStorageClient,
  mockSubmitRoleplayAttempt,
  mockGetRoleplayEvaluationContext,
  mockEvaluateRaw,
  mockCheckRoleplayRateLimit,
} = vi.hoisted(() => ({
  mockAuthenticateSalesRequest: vi.fn(),
  mockGetAIClient: vi.fn(),
  mockGetStorageClient: vi.fn(),
  mockSubmitRoleplayAttempt: vi.fn(),
  mockGetRoleplayEvaluationContext: vi.fn(),
  mockEvaluateRaw: vi.fn(),
  mockCheckRoleplayRateLimit: vi.fn(),
}));

vi.mock("@/lib/company-oidc", () => {
  return { authenticateSalesRequest: mockAuthenticateSalesRequest };
});

vi.mock("@reading-advantage/db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@reading-advantage/db")>();
  return {
    ...actual,
    db: {},
  };
});

vi.mock("@reading-advantage/ai", () => ({
  getAIClient: mockGetAIClient,
}));

vi.mock("@reading-advantage/storage", () => ({
  getStorageClient: mockGetStorageClient,
}));

vi.mock("@reading-advantage/domain/sales", () => ({
  submitRoleplayAttempt: mockSubmitRoleplayAttempt,
  getRoleplayEvaluationContext: mockGetRoleplayEvaluationContext,
  getScenario: vi.fn(),
  aiClientToEvaluateRoleplay: () => mockEvaluateRaw,
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRoleplayRateLimit: mockCheckRoleplayRateLimit,
}));

import { POST } from "../route";

function makeRequest(form: FormData) {
  return new NextRequest("http://localhost:3000/api/roleplay-attempts", {
    method: "POST",
    headers: {
      cookie: "__Host-ra_sales_session=test-token",
    },
    body: form,
  });
}

function salesRepSession() {
  return {
    user: {
      id: "rep-1",
      username: "salesrep1",
      name: "Test Rep",
      role: "SALES_REP" as const,
      schoolId: null,
      xp: 0,
      level: 1,
      cefrLevel: "A1",
    },
    scope: {
      kind: "company" as const,
      applicationKey: "sales" as const,
      organizationId: "20000000-0000-4000-8000-000000000003",
      organizationKey: "internal-company",
    },
  };
}

function buildAudioFormData() {
  const form = new FormData();
  form.set("scenarioId", "scenario-123");
  form.set("durationMs", "12000");
  // Phase 4 audio + privacy gate fields (A2 consent/retention).
  form.set("consentGiven", "true");
  form.set("retentionDays", "30");
  const blob = new Blob([new Uint8Array(8)], { type: "audio/webm" });
  form.set("audio", new File([blob], "recording.webm", { type: "audio/webm" }));
  return form;
}

function baseScenario() {
  return {
    id: "scenario-123",
    lessonId: "lesson-abc",
    personaName: "CFO",
    personaRole: "Finance Director",
    situation: "Cost-cutting review",
    objective: "Defend Q3 budget",
    rubricId: "rubric-1",
    order: 1,
    createdAt: new Date(),
  };
}

function baseRubric() {
  return {
    id: "rubric-1",
    name: "Default rubric",
    criteriaJson: [],
    reviewStatus: "approved" as const,
    createdAt: new Date(),
  };
}

function makeEvaluationCtx(excerpts: string[]) {
  return {
    scenario: baseScenario(),
    rubric: baseRubric(),
    canonicalSourceExcerpts: excerpts,
  };
}

describe("POST /api/roleplay-attempts edge cases", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEvaluateRaw.mockResolvedValue({ overallScore: 85, passed: true });
    mockAuthenticateSalesRequest.mockResolvedValue({
      kind: "authenticated",
      principal: salesRepSession(),
    });
    mockCheckRoleplayRateLimit.mockResolvedValue({ allowed: true });
    mockGetAIClient.mockReturnValue({});
    mockGetRoleplayEvaluationContext.mockResolvedValue(makeEvaluationCtx([]));
    mockGetStorageClient.mockReturnValue({
      put: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
    });
    mockSubmitRoleplayAttempt.mockImplementation(async (_ctx, input) => ({
      attempt: { id: "attempt-1" },
      evaluation: await input.evaluate(input.audio),
    }));
  });

  it("returns 401 for a no-sales-role outcome", async () => {
    mockAuthenticateSalesRequest.mockResolvedValue({ kind: "no-sales-role" });
    const response = await POST(makeRequest(buildAudioFormData()));
    expect(response.status).toBe(401);
    expect(mockCheckRoleplayRateLimit).not.toHaveBeenCalled();
  });

  it("defaults Retry-After to 3600 when the limiter gives no delay", async () => {
    mockCheckRoleplayRateLimit.mockResolvedValue({ allowed: false });
    const response = await POST(makeRequest(buildAudioFormData()));
    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("3600");
  });

  it("rejects a blank scenarioId", async () => {
    const form = buildAudioFormData();
    form.set("scenarioId", "   ");
    const response = await POST(makeRequest(form));
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      field: "scenarioId",
    });
  });

  it("rejects durationMs of zero or a leading zero", async () => {
    for (const value of ["0", "012"]) {
      const form = buildAudioFormData();
      form.set("durationMs", value);
      const response = await POST(makeRequest(form));
      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toMatchObject({
        field: "durationMs",
      });
    }
    expect(mockSubmitRoleplayAttempt).not.toHaveBeenCalled();
  });

  it("rejects a file without a type as application/octet-stream", async () => {
    // Multipart encoding gives a typeless file application/octet-stream,
    // so the "audio/webm" fallback does not apply to it.
    const form = buildAudioFormData();
    form.set("audio", new File([new Uint8Array(8)], "recording"));
    const response = await POST(makeRequest(form));
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "INVALID_AUDIO",
      field: "audio.type",
      message: "unsupported MIME type 'application/octet-stream'",
    });
    expect(mockSubmitRoleplayAttempt).not.toHaveBeenCalled();
  });

  it("scopes the storage key to the user and returns the evaluation", async () => {
    const put = vi.fn().mockResolvedValue(undefined);
    mockGetStorageClient.mockReturnValue({ put, delete: vi.fn() });
    const response = await POST(makeRequest(buildAudioFormData()));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      attemptId: "attempt-1",
      evaluation: { overallScore: 85, passed: true },
    });
    const key = put.mock.calls[0]?.[0] as string;
    expect(key).toMatch(
      /^sales-advantage\/attempts\/rep-1\/[0-9a-f-]{36}\.webm$/u,
    );
    expect(put.mock.calls[0]?.[2]).toEqual({
      contentType: "audio/webm",
      public: false,
    });
    expect(mockSubmitRoleplayAttempt.mock.calls[0]?.[0]).toMatchObject({
      tenant: { schoolId: null },
    });
  });

  it("returns null ids when the domain returns no attempt", async () => {
    mockSubmitRoleplayAttempt.mockResolvedValue({});
    const response = await POST(makeRequest(buildAudioFormData()));
    await expect(response.json()).resolves.toEqual({
      attemptId: null,
      evaluation: null,
    });
  });

  it("passes a default rubric and empty prospect context when absent", async () => {
    mockGetRoleplayEvaluationContext.mockResolvedValue({
      scenario: { ...baseScenario(), prospectContextJson: null },
      rubric: null,
      canonicalSourceExcerpts: ["excerpt"],
    });
    await POST(makeRequest(buildAudioFormData()));
    const [, scenario, rubric, excerpts] = mockEvaluateRaw.mock.calls[0] ?? [];
    expect(scenario.prospectContextJson).toEqual({});
    expect(rubric).toMatchObject({
      id: "default",
      name: "Default",
      criteriaJson: [],
      reviewStatus: "approved",
    });
    expect(excerpts).toEqual(["excerpt"]);
  });

  it("replaces non-array rubric criteria with an empty list", async () => {
    mockGetRoleplayEvaluationContext.mockResolvedValue({
      scenario: baseScenario(),
      rubric: { ...baseRubric(), criteriaJson: { bad: true } },
      canonicalSourceExcerpts: [],
    });
    await POST(makeRequest(buildAudioFormData()));
    expect(mockEvaluateRaw.mock.calls[0]?.[2].criteriaJson).toEqual([]);
  });

  it("keeps array rubric criteria unchanged", async () => {
    const criteria = [
      { criterion: "Discovery", weight: 1, passingScore: 70, sourceRef: "s1" },
    ];
    mockGetRoleplayEvaluationContext.mockResolvedValue({
      scenario: baseScenario(),
      rubric: { ...baseRubric(), criteriaJson: criteria },
      canonicalSourceExcerpts: [],
    });
    await POST(makeRequest(buildAudioFormData()));
    expect(mockEvaluateRaw.mock.calls[0]?.[2].criteriaJson).toEqual(criteria);
  });

  it("still returns 500 and logs when audio cleanup also fails", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const remove = vi.fn().mockRejectedValue(new Error("delete denied"));
    mockGetStorageClient.mockReturnValue({
      put: vi.fn().mockResolvedValue(undefined),
      delete: remove,
    });
    mockSubmitRoleplayAttempt.mockRejectedValue(new Error("db write failed"));

    const response = await POST(makeRequest(buildAudioFormData()));

    expect(response.status).toBe(500);
    expect(remove).toHaveBeenCalledTimes(1);
    expect(error).toHaveBeenCalledWith(
      expect.stringContaining("sales_roleplay_audio_cleanup_failed"),
    );
    expect(error).toHaveBeenCalledWith(
      expect.stringContaining("sales_roleplay_submit_failed"),
    );
    error.mockRestore();
  });

  it("does not delete storage when the upload itself failed", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const remove = vi.fn();
    mockGetStorageClient.mockReturnValue({
      put: vi.fn().mockRejectedValue(new Error("bucket down")),
      delete: remove,
    });
    mockSubmitRoleplayAttempt.mockRejectedValue(new Error("db write failed"));

    const response = await POST(makeRequest(buildAudioFormData()));

    expect(response.status).toBe(500);
    expect(remove).not.toHaveBeenCalled();
    error.mockRestore();
  });

  it("returns 500 without upload when the context lookup fails", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mockGetRoleplayEvaluationContext.mockRejectedValue(new Error("db read"));
    const response = await POST(makeRequest(buildAudioFormData()));
    expect(response.status).toBe(500);
    expect(mockGetStorageClient).not.toHaveBeenCalled();
    error.mockRestore();
  });
});
