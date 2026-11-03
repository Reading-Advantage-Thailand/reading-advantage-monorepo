// @vitest-environment node
import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
  getAuthToken: vi.fn(),
  legacyMode: vi.fn(),
  createTenantDB: vi.fn(),
  buildCodecampTutorContext: vi.fn(),
  joinTutorInterventionToVerifiedEvidence: vi.fn(),
  persistTutorIntervention: vi.fn(),
  recordTutorResourceUse: vi.fn(),
}));

vi.mock("@reading-advantage/ai", () => ({ createAIClient: vi.fn() }));
vi.mock("@reading-advantage/api/context", () => ({ getAuthToken: mocks.getAuthToken }));
vi.mock("@reading-advantage/auth", async () => {
  const actual = await vi.importActual<typeof import("@reading-advantage/auth")>("@reading-advantage/auth");
  return { ...actual, requireAuth: mocks.requireAuth };
});
vi.mock("@/lib/auth-mode", () => ({ isLegacyCodecampAuthEnabled: mocks.legacyMode }));
vi.mock("@/lib/company-oidc", () => ({
  CODECAMP_SESSION_COOKIE: "__Host-ra_codecamp_session",
  getCodecampOidcClient: () => ({ introspect: vi.fn() }),
  readCodecampCookie: vi.fn(),
  resolveCodecampSessionUser: vi.fn(),
}));
vi.mock("@reading-advantage/db", () => ({ db: { kind: "db" } }));
vi.mock("@reading-advantage/domain", () => ({ createTenantDB: mocks.createTenantDB }));
vi.mock("@reading-advantage/domain/codecamp", async () => {
  const actual = await vi.importActual<typeof import("@reading-advantage/domain/codecamp")>("@reading-advantage/domain/codecamp");
  return {
    ...actual,
    buildCodecampTutorContext: mocks.buildCodecampTutorContext,
    joinTutorInterventionToVerifiedEvidence: mocks.joinTutorInterventionToVerifiedEvidence,
    persistTutorIntervention: mocks.persistTutorIntervention,
    recordTutorResourceUse: mocks.recordTutorResourceUse,
  };
});

import { POST } from "./route";

const user = { id: "learner-1", role: "STUDENT", schoolId: "school-1" };
const interventionId = "00000000-0000-4000-8000-000000000011";
const activitySessionId = "00000000-0000-4000-8000-000000000022";

/** Sends a JSON body to the intervention route. */
function send(body: unknown): Promise<Response> {
  return POST(new Request("https://codecamp.example/api/tutor/intervention", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  }) as unknown as NextRequest);
}

describe("POST /api/tutor/intervention non-generation actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.legacyMode.mockReturnValue(true);
    mocks.getAuthToken.mockResolvedValue("token");
    mocks.requireAuth.mockResolvedValue({ user });
    mocks.createTenantDB.mockReturnValue({ tenantDb: true });
    mocks.recordTutorResourceUse.mockResolvedValue(undefined);
    mocks.joinTutorInterventionToVerifiedEvidence.mockResolvedValue(undefined);
  });

  it("records a tutor resource action in the learner's tenant", async () => {
    const input = { action: "resource_use", interventionId, resourceId: "video:intro", actionType: "seek" };

    const response = await send(input);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(mocks.createTenantDB).toHaveBeenCalledWith({ kind: "db" }, { schoolId: "school-1" });
    expect(mocks.recordTutorResourceUse).toHaveBeenCalledWith({ db: { tenantDb: true }, user, tenant: { schoolId: "school-1" }, input });
    expect(mocks.buildCodecampTutorContext).not.toHaveBeenCalled();
    expect(mocks.persistTutorIntervention).not.toHaveBeenCalled();
  });

  it("joins an intervention to verified evidence in the learner's tenant", async () => {
    const input = { action: "join_verified_evidence", interventionId, activitySessionId, verifiedSubmissionId: "submission-1" };

    const response = await send(input);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(mocks.joinTutorInterventionToVerifiedEvidence).toHaveBeenCalledWith({ db: { tenantDb: true }, user, tenant: { schoolId: "school-1" }, input });
  });

  it.each([
    ["an unknown action", { action: "delete_all" }],
    ["an extra key on a strict action", { action: "resource_use", interventionId, resourceId: "r", actionType: "open", schoolId: "other" }],
    ["an unsupported resource action type", { action: "resource_use", interventionId, resourceId: "r", actionType: "download" }],
    ["a non-uuid intervention id", { action: "join_verified_evidence", interventionId: "1", activitySessionId, verifiedSubmissionId: "s" }],
    ["a whitespace-only resource id", { action: "resource_use", interventionId, resourceId: "   ", actionType: "open" }],
  ])("returns a sanitized 400 for %s without writing", async (_label, body) => {
    const response = await send(body);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Invalid tutor request" });
    expect(mocks.recordTutorResourceUse).not.toHaveBeenCalled();
    expect(mocks.joinTutorInterventionToVerifiedEvidence).not.toHaveBeenCalled();
  });

  it("returns the domain error message with 400 when a write is rejected", async () => {
    mocks.recordTutorResourceUse.mockRejectedValue(new Error("Intervention not found"));

    const response = await send({ action: "resource_use", interventionId, resourceId: "r", actionType: "open" });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Intervention not found" });
  });

  it("returns a generic 400 for a non-Error rejection", async () => {
    mocks.joinTutorInterventionToVerifiedEvidence.mockRejectedValue("boom");

    const response = await send({ action: "join_verified_evidence", interventionId, activitySessionId, verifiedSubmissionId: "s" });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Tutor request failed" });
  });

  it("returns 401 when the legacy adapter yields no user", async () => {
    mocks.requireAuth.mockResolvedValue({ user: null });

    const response = await send({ action: "resource_use", interventionId, resourceId: "r", actionType: "open" });

    expect(response.status).toBe(401);
    expect(mocks.recordTutorResourceUse).not.toHaveBeenCalled();
  });
});
