/** @jest-environment node */

import { NextRequest } from "next/server";

const mockGetCurrentUser = jest.fn();
const mockIssue = jest.fn();
const mockAttest = jest.fn();
const mockCreateDependencies = jest.fn();
const mockTenantDB = jest.fn();
const mockEnabled = jest.fn();

jest.mock("@/lib/session", () => ({ getCurrentUser: () => mockGetCurrentUser() }));
jest.mock("@/lib/host-proof-config", () => ({ isHostProofEnabled: () => mockEnabled() }));
jest.mock("@reading-advantage/domain", () => ({ createTenantDB: (...args: unknown[]) => mockTenantDB(...args) }));
jest.mock("@reading-advantage/db", () => ({ db: {} }));
jest.mock("@reading-advantage/domain/games", () => ({
  createDragonFlightHostProofAttemptDependencies: (...args: unknown[]) => mockCreateDependencies(...args),
  issueDragonFlightHostProofAttempt: (...args: unknown[]) => mockIssue(...args),
  attestDragonFlightHostProofAction: (...args: unknown[]) => mockAttest(...args),
}));

import { POST as issuePOST } from "@/app/api/host-proof/games/attempts/route";
import { POST as observeActionPOST } from "@/app/api/host-proof/games/attempts/actions/route";

const actionObservation = {
  attemptId: "11111111-1111-4111-8111-111111111111",
  credential: "opaque-host-proof-credential",
  action: { sequence: 1, kind: "choose-gate", gate: "right", elapsedMs: 400 },
};

const sessionUser = {
  id: "user-1", username: "student-1", display_name: "Student", role: "STUDENT", school_id: "school-1",
  xp: 0, level: 1, cefr_level: "A1", email: "student@example.com", email_verified: true, picture: "", expired_date: "", expired: false, license_id: "", license_level: "BASIC", onborda: false,
};

/** Creates an attempt issue request containing only client-selected title and difficulty. */
function request(body: unknown): NextRequest {
  return new NextRequest("http://localhost:3000/api/host-proof/games/attempts", { method: "POST", body: JSON.stringify(body) });
}

describe("Dragon Flight host-proof attempts route", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.HOST_PROOF_ATTEMPT_SECRET = "a".repeat(32);
    mockEnabled.mockReturnValue(true);
    mockTenantDB.mockReturnValue({ tenant: true });
    mockCreateDependencies.mockReturnValue({ attemptDeps: true });
  });

  it("fails closed before auth when disabled and requires a school-bound session", async () => {
    mockEnabled.mockReturnValue(false);
    expect((await issuePOST(request({ gameType: "dragon-flight", difficulty: "medium" }))).status).toBe(404);
    expect(mockGetCurrentUser).not.toHaveBeenCalled();
    mockEnabled.mockReturnValue(true);
    mockGetCurrentUser.mockResolvedValueOnce(null);
    expect((await issuePOST(request({ gameType: "dragon-flight", difficulty: "medium" }))).status).toBe(401);
    mockGetCurrentUser.mockResolvedValueOnce({ ...sessionUser, school_id: undefined });
    expect((await issuePOST(request({ gameType: "dragon-flight", difficulty: "medium" }))).status).toBe(403);
  });

  it("issues server-owned vocabulary from the strict minimal request", async () => {
    mockGetCurrentUser.mockResolvedValue(sessionUser);
    mockIssue.mockResolvedValue({ attemptId: "11111111-1111-4111-8111-111111111111", credential: "opaque-host-proof-credential", input: [{ term: "dragon", translation: "drago" }], expiresAt: "2026-08-01T00:10:00.000Z" });
    const response = await issuePOST(request({ gameType: "dragon-flight", difficulty: "medium" }));
    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({ credential: "opaque-host-proof-credential", input: [{ term: "dragon" }] });
    expect(mockTenantDB).toHaveBeenCalledWith({}, { schoolId: "school-1" });
    expect(mockIssue).toHaveBeenCalledWith({ userId: "user-1", schoolId: "school-1" }, { gameType: "dragon-flight", difficulty: "medium" }, { attemptDeps: true });
  });

  it("returns a stable validation error when strict issue validation rejects client metrics", async () => {
    mockGetCurrentUser.mockResolvedValue(sessionUser);
    const { ZodError } = await import("zod");
    mockIssue.mockRejectedValue(new ZodError([]));
    const response = await issuePOST(request({ gameType: "dragon-flight", difficulty: "medium", score: 999 }));
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: { code: "HOST_PROOF_VALIDATION_FAILED", message: "Attempt request failed validation" } });
  });

  it("requires an authenticated tenant-bound actor before observing any action", async () => {
    mockGetCurrentUser.mockResolvedValueOnce(null);
    expect((await observeActionPOST(request(actionObservation))).status).toBe(401);
    mockGetCurrentUser.mockResolvedValueOnce({ ...sessionUser, school_id: undefined });
    expect((await observeActionPOST(request(actionObservation))).status).toBe(403);
    expect(mockAttest).not.toHaveBeenCalled();
  });

  it("binds action observation to the server-derived actor and tenant", async () => {
    mockGetCurrentUser.mockResolvedValue(sessionUser);
    mockAttest.mockResolvedValue({ checkpoint: "checkpoint-1", minimumNextActionDwellMs: 250 });

    const response = await observeActionPOST(request(actionObservation));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ checkpoint: "checkpoint-1", minimumNextActionDwellMs: 250 });
    expect(mockTenantDB).toHaveBeenCalledWith({}, { schoolId: "school-1" });
    expect(mockAttest).toHaveBeenCalledWith(
      { userId: "user-1", schoolId: "school-1" },
      actionObservation,
      { attemptDeps: true },
    );
  });

  it("returns a safe 4xx response when a checkpoint is invalid or out of order", async () => {
    mockGetCurrentUser.mockResolvedValue(sessionUser);
    mockAttest.mockRejectedValue(new Error("Host-proof action checkpoint is out of order"));

    const response = await observeActionPOST(request({ ...actionObservation, previousCheckpoint: "forged-checkpoint" }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: { code: "HOST_PROOF_ATTEMPT_REJECTED", message: "Action observation was rejected" },
    });
  });

  it("rejects a forged opaque action receipt without leaking an internal error", async () => {
    mockGetCurrentUser.mockResolvedValue(sessionUser);
    mockAttest.mockRejectedValue(new Error("forged opaque receipt"));

    const response = await observeActionPOST(request({ ...actionObservation, previousCheckpoint: "forged-checkpoint" }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: { code: "HOST_PROOF_ATTEMPT_REJECTED", message: "Action observation was rejected" },
    });
  });

  it("returns a safe internal error when the action secret is absent", async () => {
    mockGetCurrentUser.mockResolvedValue(sessionUser);
    delete process.env.HOST_PROOF_ATTEMPT_SECRET;

    const response = await observeActionPOST(request(actionObservation));

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: { code: "HOST_PROOF_INTERNAL", message: "Unable to observe host-proof action" },
    });
    expect(mockAttest).not.toHaveBeenCalled();
  });

  it("returns a safe internal error when the action secret is too short", async () => {
    mockGetCurrentUser.mockResolvedValue(sessionUser);
    process.env.HOST_PROOF_ATTEMPT_SECRET = "too-short";

    const response = await observeActionPOST(request(actionObservation));

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: { code: "HOST_PROOF_INTERNAL", message: "Unable to observe host-proof action" },
    });
    expect(mockAttest).not.toHaveBeenCalled();
  });
});
