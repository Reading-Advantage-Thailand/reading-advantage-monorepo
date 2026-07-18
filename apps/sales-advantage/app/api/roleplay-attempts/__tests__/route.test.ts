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

describe("POST /api/roleplay-attempts — FR-4 grounding + storage integrity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEvaluateRaw.mockResolvedValue({ overallScore: 85, passed: true });
    mockAuthenticateSalesRequest.mockResolvedValue(salesRepSession());
    mockCheckRoleplayRateLimit.mockResolvedValue({ allowed: true });
    mockGetAIClient.mockReturnValue({
      streamText: vi.fn(),
      generateObject: vi.fn(),
      generateObjectFromMedia: vi.fn(),
    });
  });

  it("returns 401 before product work when the Sales role was removed", async () => {
    mockAuthenticateSalesRequest.mockResolvedValue(null);

    const response = await POST(makeRequest(buildAudioFormData()));

    expect(response.status).toBe(401);
    expect(mockCheckRoleplayRateLimit).not.toHaveBeenCalled();
    expect(mockGetRoleplayEvaluationContext).not.toHaveBeenCalled();
  });

  it("returns an exact shared-limit 429 before reading the upload", async () => {
    mockCheckRoleplayRateLimit.mockResolvedValue({
      allowed: false,
      retryAfter: 120,
    });
    const response = await POST(makeRequest(buildAudioFormData()));
    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("120");
    await expect(response.json()).resolves.toEqual({
      error: "ROLEPLAY_RATE_LIMITED",
      message: "Too many roleplay submissions. Please try again later.",
      retryAfter: 120,
    });
    expect(mockGetRoleplayEvaluationContext).not.toHaveBeenCalled();
  });

  it("FR-4: passes the lesson's canonical source excerpts to the evaluator (not an empty array)", async () => {
    const excerpts = [
      "SPIN Selling: Use situation questions to establish context.",
      "Sandler: Negative reverse selling — be upfront about cost.",
    ];
    mockGetRoleplayEvaluationContext.mockResolvedValue(
      makeEvaluationCtx(excerpts),
    );

    let capturedEvaluate:
      | ((a: { buffer: Buffer; mimeType: string }) => Promise<unknown>)
      | undefined;
    let capturedStorageKey: string | null | undefined;
    mockSubmitRoleplayAttempt.mockImplementation(
      async (
        _ctx: unknown,
        input: {
          evaluate: (a: {
            buffer: Buffer;
            mimeType: string;
          }) => Promise<unknown>;
          audioStorageKey: string | null;
        },
      ) => {
        capturedEvaluate = input.evaluate;
        capturedStorageKey = input.audioStorageKey;
        return {
          attempt: { id: "attempt-1" },
          evaluation: { overallScore: 85, passed: true },
        };
      },
    );
    mockGetStorageClient.mockReturnValue({
      put: vi.fn().mockResolvedValue({ key: "ok" }),
    });

    const form = buildAudioFormData();
    const request = makeRequest(form);
    const response = await POST(request);
    expect(response.status).toBe(200);
    expect(typeof capturedEvaluate).toBe("function");
    expect(capturedStorageKey).toMatch(/^sales-advantage\/attempts\/rep-1\//);

    await capturedEvaluate!({
      buffer: Buffer.from(""),
      mimeType: "audio/webm",
    });

    expect(mockEvaluateRaw).toHaveBeenCalledTimes(1);
    expect(mockEvaluateRaw).toHaveBeenLastCalledWith(
      expect.objectContaining({
        buffer: expect.any(Buffer),
        mimeType: "audio/webm",
      }),
      expect.objectContaining({
        id: "scenario-123",
        lessonId: "lesson-abc",
        personaName: "CFO",
        personaRole: "Finance Director",
        situation: "Cost-cutting review",
        objective: "Defend Q3 budget",
        rubricId: "rubric-1",
        prospectContextJson: {},
      }),
      expect.objectContaining({
        id: "rubric-1",
        name: "Default rubric",
        criteriaJson: [],
        reviewStatus: "approved",
      }),
      excerpts,
    );
  });

  it("FR-4: persists audioStorageKey=null when storage.put rejects (no orphan reference)", async () => {
    mockGetRoleplayEvaluationContext.mockResolvedValue(makeEvaluationCtx([]));
    mockGetStorageClient.mockReturnValue({
      put: vi.fn().mockRejectedValue(new Error("simulated S3 500")),
    });

    let persistedKey: string | null | undefined;
    mockSubmitRoleplayAttempt.mockImplementation(
      async (_ctx: unknown, input: { audioStorageKey: string | null }) => {
        persistedKey = input.audioStorageKey;
        return {
          attempt: { id: "attempt-1" },
          evaluation: { overallScore: 0, passed: false },
        };
      },
    );

    const form = buildAudioFormData();
    const request = makeRequest(form);
    const response = await POST(request);
    expect(response.status).toBe(200);

    expect(
      persistedKey,
      "FR-4: when storage.put rejects, the route must NOT pass the storage key to " +
        "submitRoleplayAttempt — passing a key for an object that was never uploaded " +
        "creates a dangling reference.",
    ).toBeNull();
  });

  it("FR-4: persists audioStorageKey=<key> when storage.put succeeds", async () => {
    mockGetRoleplayEvaluationContext.mockResolvedValue(makeEvaluationCtx([]));
    mockGetStorageClient.mockReturnValue({
      put: vi
        .fn()
        .mockResolvedValue({ key: "sales-advantage/attempts/rep-1/123.webm" }),
    });

    let persistedKey: string | null | undefined;
    mockSubmitRoleplayAttempt.mockImplementation(
      async (_ctx: unknown, input: { audioStorageKey: string | null }) => {
        persistedKey = input.audioStorageKey;
        return {
          attempt: { id: "attempt-1" },
          evaluation: { overallScore: 0, passed: false },
        };
      },
    );

    const form = buildAudioFormData();
    const request = makeRequest(form);
    const response = await POST(request);
    expect(response.status).toBe(200);

    expect(
      persistedKey,
      "FR-4: on successful upload, the storage key is persisted.",
    ).toMatch(/^sales-advantage\/attempts\/rep-1\//);
  });

  it("deletes an uploaded object when the later attempt lifecycle fails", async () => {
    mockGetRoleplayEvaluationContext.mockResolvedValue(makeEvaluationCtx([]));
    const storageDelete = vi.fn().mockResolvedValue(undefined);
    const storagePut = vi.fn().mockResolvedValue(undefined);
    mockGetStorageClient.mockReturnValue({
      put: storagePut,
      delete: storageDelete,
    });
    mockSubmitRoleplayAttempt.mockRejectedValue(
      new Error("simulated evaluation failure"),
    );

    const response = await POST(makeRequest(buildAudioFormData()));

    expect(response.status).toBe(500);
    expect(storagePut).toHaveBeenCalledTimes(1);
    expect(storageDelete).toHaveBeenCalledTimes(1);
    expect(storageDelete).toHaveBeenCalledWith(storagePut.mock.calls[0][0]);
    await expect(response.json()).resolves.toEqual({
      error: "ROLEPLAY_EVALUATION_FAILED",
      message: "Roleplay evaluation is temporarily unavailable.",
    });
  });

  it("FR-4: returns 404 when the scenario is not found (no orphan attempt is created)", async () => {
    mockGetRoleplayEvaluationContext.mockResolvedValue({
      scenario: undefined,
      rubric: undefined,
      canonicalSourceExcerpts: [],
    });
    mockGetStorageClient.mockReturnValue({
      put: vi.fn().mockResolvedValue({ key: "ok" }),
    });
    mockSubmitRoleplayAttempt.mockResolvedValue({
      attempt: { id: "attempt-1" },
      evaluation: {},
    });

    const form = buildAudioFormData();
    const request = makeRequest(form);
    const response = await POST(request);
    expect(response.status).toBe(404);
  });
});
