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
} = vi.hoisted(() => ({
  mockAuthenticateSalesRequest: vi.fn(),
  mockGetAIClient: vi.fn(),
  mockGetStorageClient: vi.fn(),
  mockSubmitRoleplayAttempt: vi.fn(),
  mockGetRoleplayEvaluationContext: vi.fn(),
  mockEvaluateRaw: vi.fn(),
}));

vi.mock("@/lib/company-oidc", () => {
  return { authenticateSalesRequest: mockAuthenticateSalesRequest };
});

vi.mock("@reading-advantage/db", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@reading-advantage/db")>();
  return { ...actual, db: {} };
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
  checkRoleplayRateLimit: vi.fn().mockResolvedValue({ allowed: true }),
}));

import { POST } from "../route";

const MAX_AUDIO_BYTES = 10 * 1024 * 1024;
const MAX_AUDIO_DURATION_MS = 5 * 60 * 1000;

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

function makeRequest(form: FormData) {
  return new NextRequest("http://localhost:3000/api/roleplay-attempts", {
    method: "POST",
    headers: { cookie: "__Host-ra_sales_session=test-token" },
    body: form,
  });
}

function makeForm(audio: File, durationMs: string) {
  const form = new FormData();
  form.set("scenarioId", "scenario-123");
  form.set("durationMs", durationMs);
  form.set("audio", audio);
  return form;
}

function makeFormWithPrivacy(
  audio: File,
  durationMs: string,
  consentGiven: string | null,
  retentionDays: string | null,
) {
  const form = makeForm(audio, durationMs);
  if (consentGiven !== null) form.set("consentGiven", consentGiven);
  if (retentionDays !== null) form.set("retentionDays", retentionDays);
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

function makeEvaluationCtx() {
  return {
    scenario: baseScenario(),
    rubric: baseRubric(),
    canonicalSourceExcerpts: [],
  };
}

describe("POST /api/roleplay-attempts audio upload boundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthenticateSalesRequest.mockResolvedValue(salesRepSession());
    mockGetRoleplayEvaluationContext.mockResolvedValue(makeEvaluationCtx());
    mockSubmitRoleplayAttempt.mockResolvedValue({
      attempt: { id: "attempt-1" },
      evaluation: { overallScore: 85, passed: true },
    });
    mockEvaluateRaw.mockResolvedValue({ overallScore: 85, passed: true });
    mockGetAIClient.mockReturnValue({
      streamText: vi.fn(),
      generateObject: vi.fn(),
      generateObjectFromMedia: vi.fn(),
    });
  });

  it("rejects oversized audio with structured 400 before storage/provider", async () => {
    const storagePut = vi.fn().mockResolvedValue({ key: "ok" });
    mockGetStorageClient.mockReturnValue({ put: storagePut });

    const oversizedAudio = new File(
      [Buffer.alloc(MAX_AUDIO_BYTES + 1, "x")],
      "big.webm",
      { type: "audio/webm" },
    );
    const response = await POST(
      makeRequest(makeForm(oversizedAudio, "1000")),
    );

    expect(response.status, "oversized audio must be rejected with 400").toBe(400);
    const body = await response.json();
    expect(body.error, "response body must contain a structured error").toBeDefined();
    expect(storagePut, "storage.put call count on rejected upload").toHaveBeenCalledTimes(0);
    expect(mockGetAIClient, "getAIClient call count on rejected upload").toHaveBeenCalledTimes(0);
    expect(
      mockSubmitRoleplayAttempt,
      "submitRoleplayAttempt call count on rejected upload",
    ).toHaveBeenCalledTimes(0);
    expect(
      mockGetRoleplayEvaluationContext,
      "getRoleplayEvaluationContext call count on rejected upload",
    ).toHaveBeenCalledTimes(0);
  });

  it("rejects unsupported MIME type with structured 400 before storage/provider", async () => {
    const storagePut = vi.fn().mockResolvedValue({ key: "ok" });
    mockGetStorageClient.mockReturnValue({ put: storagePut });

    const badAudio = new File([Buffer.from("not-audio")], "bad.mp4", {
      type: "video/mp4",
    });
    const response = await POST(makeRequest(makeForm(badAudio, "1000")));

    expect(response.status, "unsupported MIME must be rejected with 400").toBe(400);
    const body = await response.json();
    expect(body.error, "response body must contain a structured error").toBeDefined();
    expect(storagePut, "storage.put call count on rejected upload").toHaveBeenCalledTimes(0);
    expect(mockGetAIClient, "getAIClient call count on rejected upload").toHaveBeenCalledTimes(0);
    expect(
      mockSubmitRoleplayAttempt,
      "submitRoleplayAttempt call count on rejected upload",
    ).toHaveBeenCalledTimes(0);
    expect(
      mockGetRoleplayEvaluationContext,
      "getRoleplayEvaluationContext call count on rejected upload",
    ).toHaveBeenCalledTimes(0);
  });

  it("rejects excessive duration with structured 400 before storage/provider", async () => {
    const storagePut = vi.fn().mockResolvedValue({ key: "ok" });
    mockGetStorageClient.mockReturnValue({ put: storagePut });

    const audio = new File([Buffer.from("audio")], "recording.webm", {
      type: "audio/webm",
    });
    const response = await POST(
      makeRequest(makeForm(audio, String(MAX_AUDIO_DURATION_MS + 1))),
    );

    expect(response.status, "excessive duration must be rejected with 400").toBe(400);
    const body = await response.json();
    expect(body.error, "response body must contain a structured error").toBeDefined();
    expect(storagePut, "storage.put call count on rejected upload").toHaveBeenCalledTimes(0);
    expect(mockGetAIClient, "getAIClient call count on rejected upload").toHaveBeenCalledTimes(0);
    expect(
      mockSubmitRoleplayAttempt,
      "submitRoleplayAttempt call count on rejected upload",
    ).toHaveBeenCalledTimes(0);
    expect(
      mockGetRoleplayEvaluationContext,
      "getRoleplayEvaluationContext call count on rejected upload",
    ).toHaveBeenCalledTimes(0);
  });

  it("rejects missing/declined consent with structured 400 before storage/provider", async () => {
    const storagePut = vi.fn().mockResolvedValue({ key: "ok" });
    mockGetStorageClient.mockReturnValue({ put: storagePut });

    const audio = new File([Buffer.from("audio")], "recording.webm", {
      type: "audio/webm",
    });

    for (const consentValue of [null, "false", "0", ""]) {
      const response = await POST(
        makeRequest(makeFormWithPrivacy(audio, "1000", consentValue, "30")),
      );

      expect(response.status, `consent='${consentValue}' must be rejected with 400`).toBe(400);
      const body = await response.json();
      expect(body.field, `consent='${consentValue}' must fail at consentGiven field`).toBe("consentGiven");
    }

    expect(storagePut, "storage.put call count on rejected consent").toHaveBeenCalledTimes(0);
    expect(mockGetAIClient, "getAIClient call count on rejected consent").toHaveBeenCalledTimes(0);
    expect(
      mockSubmitRoleplayAttempt,
      "submitRoleplayAttempt call count on rejected consent",
    ).toHaveBeenCalledTimes(0);
    expect(
      mockGetRoleplayEvaluationContext,
      "getRoleplayEvaluationContext call count on rejected consent",
    ).toHaveBeenCalledTimes(0);
  });

  it("rejects invalid retentionDays with structured 400 before storage/provider", async () => {
    const storagePut = vi.fn().mockResolvedValue({ key: "ok" });
    mockGetStorageClient.mockReturnValue({ put: storagePut });

    const audio = new File([Buffer.from("audio")], "recording.webm", {
      type: "audio/webm",
    });

    for (const retentionValue of [null, "", "0", "366", "abc"]) {
      const response = await POST(
        makeRequest(makeFormWithPrivacy(audio, "1000", "true", retentionValue)),
      );

      expect(response.status, `retention='${retentionValue}' must be rejected with 400`).toBe(400);
      const body = await response.json();
      expect(body.field, `retention='${retentionValue}' must fail at retentionDays field`).toBe("retentionDays");
    }

    expect(storagePut, "storage.put call count on rejected retention").toHaveBeenCalledTimes(0);
    expect(mockGetAIClient, "getAIClient call count on rejected retention").toHaveBeenCalledTimes(0);
    expect(
      mockSubmitRoleplayAttempt,
      "submitRoleplayAttempt call count on rejected retention",
    ).toHaveBeenCalledTimes(0);
    expect(
      mockGetRoleplayEvaluationContext,
      "getRoleplayEvaluationContext call count on rejected retention",
    ).toHaveBeenCalledTimes(0);
  });
});
