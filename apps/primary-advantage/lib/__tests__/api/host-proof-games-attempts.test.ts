import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST as issuePOST } from "../../../app/api/host-proof/games/attempts/route";
import { POST as observeActionPOST } from "../../../app/api/host-proof/games/attempts/actions/route";

const mockGetCurrentUser = vi.fn();
const mockIssueDragonFlightHostProofAttempt = vi.fn();
const mockAttestDragonFlightHostProofAction = vi.fn();
const mockCreateDragonFlightHostProofAttemptDependencies = vi.fn();
const mockCreateTenantDB = vi.fn();
const mockIsHostProofEnabled = vi.fn();

vi.mock("@/lib/session", () => ({ getCurrentUser: () => mockGetCurrentUser() }));
vi.mock("@/lib/host-proof-config", () => ({ isHostProofEnabled: () => mockIsHostProofEnabled() }));
vi.mock("@reading-advantage/domain", () => ({ createTenantDB: (...args: unknown[]) => mockCreateTenantDB(...args) }));
vi.mock("@reading-advantage/db", () => ({ db: {} }));
vi.mock("@reading-advantage/domain/games", () => ({
  createDragonFlightHostProofAttemptDependencies: (...args: unknown[]) => mockCreateDragonFlightHostProofAttemptDependencies(...args),
  issueDragonFlightHostProofAttempt: (...args: unknown[]) => mockIssueDragonFlightHostProofAttempt(...args),
  attestDragonFlightHostProofAction: (...args: unknown[]) => mockAttestDragonFlightHostProofAction(...args),
}));

const actionObservation = {
  attemptId: "11111111-1111-4111-8111-111111111111",
  credential: "opaque-host-proof-credential",
  action: { sequence: 1, kind: "choose-gate", gate: "right", elapsedMs: 400 },
};

const user = {
  id: "user-1", username: "student-1", name: "Student", role: "STUDENT", schoolId: "school-1", xp: 0, level: 1, cefrLevel: "A1",
};

/** Creates a POST request for the server-owned Dragon Flight attempt contract. */
function request(body: unknown): NextRequest {
  return new NextRequest("http://localhost:3000/api/host-proof/games/attempts", { method: "POST", body: JSON.stringify(body) });
}

describe("Dragon Flight host-proof attempts route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.HOST_PROOF_ATTEMPT_SECRET = "a".repeat(32);
    mockIsHostProofEnabled.mockReturnValue(true);
    mockCreateTenantDB.mockReturnValue({ tenant: true });
    mockCreateDragonFlightHostProofAttemptDependencies.mockReturnValue({ attemptDeps: true });
  });

  it("fails closed before authentication when proof mode is disabled", async () => {
    mockIsHostProofEnabled.mockReturnValue(false);
    expect((await issuePOST(request({ gameType: "dragon-flight", difficulty: "medium" }))).status).toBe(404);
    expect(mockGetCurrentUser).not.toHaveBeenCalled();
  });

  it("requires an authenticated actor with a school", async () => {
    mockGetCurrentUser.mockResolvedValueOnce(null);
    expect((await issuePOST(request({ gameType: "dragon-flight", difficulty: "medium" }))).status).toBe(401);
    mockGetCurrentUser.mockResolvedValueOnce({ ...user, schoolId: null });
    expect((await issuePOST(request({ gameType: "dragon-flight", difficulty: "medium" }))).status).toBe(403);
    expect(mockIssueDragonFlightHostProofAttempt).not.toHaveBeenCalled();
  });

  it("issues a server-owned vocabulary contract from the strict minimal request", async () => {
    mockGetCurrentUser.mockResolvedValue(user);
    mockIssueDragonFlightHostProofAttempt.mockResolvedValue({
      attemptId: "11111111-1111-4111-8111-111111111111",
      credential: "opaque-host-proof-credential",
      input: [{ term: "dragon", translation: "drago" }],
      expiresAt: "2026-08-01T00:10:00.000Z",
    });

    const response = await issuePOST(request({ gameType: "dragon-flight", difficulty: "medium" }));

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({ credential: "opaque-host-proof-credential", input: [{ term: "dragon" }] });
    expect(mockCreateTenantDB).toHaveBeenCalledWith({}, { schoolId: "school-1" });
    expect(mockIssueDragonFlightHostProofAttempt).toHaveBeenCalledWith(
      { userId: "user-1", schoolId: "school-1" },
      { gameType: "dragon-flight", difficulty: "medium" },
      { attemptDeps: true },
    );
  });

  it("returns a stable validation error for strict-domain rejection", async () => {
    mockGetCurrentUser.mockResolvedValue(user);
    const { ZodError } = await import("zod");
    mockIssueDragonFlightHostProofAttempt.mockRejectedValue(new ZodError([]));

    const response = await issuePOST(request({ gameType: "dragon-flight", difficulty: "medium", score: 999 }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: { code: "HOST_PROOF_VALIDATION_FAILED", message: "Attempt request failed validation" } });
  });

  it("requires an authenticated tenant-bound actor before observing any action", async () => {
    mockGetCurrentUser.mockResolvedValueOnce(null);
    expect((await observeActionPOST(request(actionObservation))).status).toBe(401);
    mockGetCurrentUser.mockResolvedValueOnce({ ...user, schoolId: null });
    expect((await observeActionPOST(request(actionObservation))).status).toBe(403);
    expect(mockAttestDragonFlightHostProofAction).not.toHaveBeenCalled();
  });

  it("binds action observation to the server-derived actor and tenant", async () => {
    mockGetCurrentUser.mockResolvedValue(user);
    mockAttestDragonFlightHostProofAction.mockResolvedValue({ checkpoint: "checkpoint-1", minimumNextActionDwellMs: 250 });

    const response = await observeActionPOST(request(actionObservation));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ checkpoint: "checkpoint-1", minimumNextActionDwellMs: 250 });
    expect(mockCreateTenantDB).toHaveBeenCalledWith({}, { schoolId: "school-1" });
    expect(mockAttestDragonFlightHostProofAction).toHaveBeenCalledWith(
      { userId: "user-1", schoolId: "school-1" },
      actionObservation,
      { attemptDeps: true },
    );
  });

  it("returns a safe 4xx response when a checkpoint is invalid or out of order", async () => {
    mockGetCurrentUser.mockResolvedValue(user);
    mockAttestDragonFlightHostProofAction.mockRejectedValue(new Error("Host-proof action checkpoint is out of order"));

    const response = await observeActionPOST(request({ ...actionObservation, previousCheckpoint: "forged-checkpoint" }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: { code: "HOST_PROOF_ATTEMPT_REJECTED", message: "Action observation was rejected" },
    });
  });

  it("rejects a forged opaque action receipt without leaking an internal error", async () => {
    mockGetCurrentUser.mockResolvedValue(user);
    mockAttestDragonFlightHostProofAction.mockRejectedValue(new Error("forged opaque receipt"));

    const response = await observeActionPOST(request({ ...actionObservation, previousCheckpoint: "forged-checkpoint" }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: { code: "HOST_PROOF_ATTEMPT_REJECTED", message: "Action observation was rejected" },
    });
  });

  it("returns a safe internal error when the action secret is absent", async () => {
    mockGetCurrentUser.mockResolvedValue(user);
    delete process.env.HOST_PROOF_ATTEMPT_SECRET;

    const response = await observeActionPOST(request(actionObservation));

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: { code: "HOST_PROOF_INTERNAL", message: "Unable to observe host-proof action" },
    });
    expect(mockAttestDragonFlightHostProofAction).not.toHaveBeenCalled();
  });

  it("returns a safe internal error when the action secret is too short", async () => {
    mockGetCurrentUser.mockResolvedValue(user);
    process.env.HOST_PROOF_ATTEMPT_SECRET = "too-short";

    const response = await observeActionPOST(request(actionObservation));

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: { code: "HOST_PROOF_INTERNAL", message: "Unable to observe host-proof action" },
    });
    expect(mockAttestDragonFlightHostProofAction).not.toHaveBeenCalled();
  });
});
