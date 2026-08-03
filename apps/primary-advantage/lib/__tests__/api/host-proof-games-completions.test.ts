import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST, GET } from "../../../app/api/host-proof/games/completions/route";

const mockGetCurrentUser = vi.fn();
const mockCompleteDragonFlightHostProofAttempt = vi.fn();
const mockCreateDragonFlightHostProofAttemptDependencies = vi.fn();
const mockGetHostProofGameCompletions = vi.fn();
const mockCreateTenantDB = vi.fn();
const mockIsHostProofEnabled = vi.fn();

vi.mock("@/lib/session", () => ({ getCurrentUser: () => mockGetCurrentUser() }));
vi.mock("@/lib/host-proof-config", () => ({ isHostProofEnabled: () => mockIsHostProofEnabled() }));
vi.mock("@reading-advantage/domain", () => ({ createTenantDB: (...args: unknown[]) => mockCreateTenantDB(...args) }));
vi.mock("@reading-advantage/db", () => ({ db: {} }));
vi.mock("@reading-advantage/domain/games", async () => {
  const actual = await vi.importActual<typeof import("@reading-advantage/domain/games")>(
    "@reading-advantage/domain/games",
  );

  return {
    completeDragonFlightHostProofAttemptSchema: actual.completeDragonFlightHostProofAttemptSchema,
    createDragonFlightHostProofAttemptDependencies: (...args: unknown[]) => mockCreateDragonFlightHostProofAttemptDependencies(...args),
    completeDragonFlightHostProofAttempt: (...args: unknown[]) => mockCompleteDragonFlightHostProofAttempt(...args),
    getHostProofGameCompletions: (...args: unknown[]) => mockGetHostProofGameCompletions(...args),
    HostProofCompletionError: class HostProofCompletionError extends Error { readonly code = "HOST_PROOF_VALIDATION_FAILED"; },
    hostProofErrorHttpStatus: () => 400,
  };
});

const user = {
  id: "user-1", username: "student-1", name: "Student", role: "STUDENT", schoolId: "school-1", xp: 0, level: 1, cefrLevel: "A1",
};
const transcript = {
  attemptId: "11111111-1111-4111-8111-111111111111",
  credential: "opaque-host-proof-credential",
  idempotencyKey: "11111111-1111-4111-8111-111111111111",
  actions: [
    { sequence: 1, kind: "choose-gate", gate: "right", elapsedMs: 400 },
    { sequence: 2, kind: "launch", elapsedMs: 700 },
  ],
  checkpoints: ["opaque-checkpoint-receipt-gate-00000001", "opaque-checkpoint-receipt-launch-00000002"],
};

/** Creates a route request with an optional signed completion body and query string. */
function request(body?: unknown, query = ""): NextRequest {
  return new NextRequest(`http://localhost:3000/api/host-proof/games/completions${query}`, {
    method: body === undefined ? "GET" : "POST",
    body: body === undefined ? null : JSON.stringify(body),
  });
}

describe("Dragon Flight host-proof completion route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.HOST_PROOF_ATTEMPT_SECRET = "a".repeat(32);
    mockIsHostProofEnabled.mockReturnValue(true);
    mockCreateTenantDB.mockReturnValue({ tenant: true });
    mockCreateDragonFlightHostProofAttemptDependencies.mockReturnValue({ attemptDeps: true });
  });

  it("fails closed before auth when proof mode is disabled", async () => {
    mockIsHostProofEnabled.mockReturnValue(false);
    expect((await POST(request(transcript))).status).toBe(404);
    expect(mockGetCurrentUser).not.toHaveBeenCalled();
  });

  it("requires an authenticated tenant-bound actor", async () => {
    mockGetCurrentUser.mockResolvedValueOnce(null);
    expect((await POST(request(transcript))).status).toBe(401);
    mockGetCurrentUser.mockResolvedValueOnce({ ...user, schoolId: null });
    expect((await POST(request(transcript))).status).toBe(403);
    expect(mockCompleteDragonFlightHostProofAttempt).not.toHaveBeenCalled();
  });

  it("returns validation failure for malformed JSON", async () => {
    mockGetCurrentUser.mockResolvedValue(user);
    const malformed = new NextRequest("http://localhost:3000/api/host-proof/games/completions", { method: "POST", body: "{" });
    expect((await POST(malformed)).status).toBe(400);
  });

  it("delegates only the signed transcript to authoritative completion and returns its derived result", async () => {
    mockGetCurrentUser.mockResolvedValue(user);
    mockCompleteDragonFlightHostProofAttempt.mockResolvedValue({
      xpEarned: 5, score: 100, accuracy: 1, correctAnswers: 1, totalAttempts: 1, duration: 700, duplicate: false,
    });

    const response = await POST(request(transcript));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ score: 100, xpEarned: 5, duplicate: false });
    expect(mockCreateTenantDB).toHaveBeenCalledWith({}, { schoolId: "school-1" });
    expect(mockCompleteDragonFlightHostProofAttempt).toHaveBeenCalledWith(
      { userId: "user-1", schoolId: "school-1" }, transcript, { attemptDeps: true },
    );
  });

  it.each([
    [
      "launch before a gate",
      [
        { sequence: 1, kind: "launch", elapsedMs: 400 },
        { sequence: 2, kind: "choose-gate", gate: "right", elapsedMs: 700 },
      ],
      ["signed-checkpoint-launch", "signed-checkpoint-gate"],
      "Dragon Flight launch must follow at least one gate choice and end the transcript",
    ],
    [
      "gate after launch",
      [
        { sequence: 1, kind: "choose-gate", gate: "right", elapsedMs: 400 },
        { sequence: 2, kind: "launch", elapsedMs: 700 },
        { sequence: 3, kind: "choose-gate", gate: "right", elapsedMs: 1_000 },
      ],
      ["signed-checkpoint-gate", "signed-checkpoint-launch", "signed-checkpoint-after-launch"],
      "Dragon Flight cannot choose a gate after launch",
    ],
    [
      "noncontiguous sequence",
      [
        { sequence: 1, kind: "choose-gate", gate: "right", elapsedMs: 400 },
        { sequence: 3, kind: "launch", elapsedMs: 700 },
      ],
      ["signed-checkpoint-one", "signed-checkpoint-three"],
      "Host-proof actions must use contiguous sequence numbers",
    ],
    [
      "decreasing elapsed diagnostic",
      [
        { sequence: 1, kind: "choose-gate", gate: "right", elapsedMs: 700 },
        { sequence: 2, kind: "launch", elapsedMs: 400 },
      ],
      ["signed-checkpoint-slower", "signed-checkpoint-faster"],
      "Host-proof action timestamps must be nondecreasing",
    ],
    [
      "missing launch",
      [
        { sequence: 1, kind: "choose-gate", gate: "right", elapsedMs: 400 },
        { sequence: 2, kind: "choose-gate", gate: "right", elapsedMs: 700 },
      ],
      ["signed-checkpoint-gate-one", "signed-checkpoint-gate-two"],
      "Dragon Flight completion requires a launch action",
    ],
    [
      "conflicting replay claim",
      transcript.actions,
      ["signed-checkpoint-gate", "signed-checkpoint-launch"],
      "Host-proof attempt has already been claimed with a different transcript",
    ],
  ])("returns a safe 400 when a valid signed checkpoint chain replays an invalid %s order", async (_label, actions, checkpoints, replayError) => {
    mockGetCurrentUser.mockResolvedValue(user);
    mockCompleteDragonFlightHostProofAttempt.mockRejectedValue(new Error(replayError));

    const response = await POST(request({ ...transcript, actions, checkpoints }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: { code: "HOST_PROOF_ATTEMPT_REJECTED", message: "Completion transcript was rejected" },
    });
    expect(mockCompleteDragonFlightHostProofAttempt).toHaveBeenCalledWith(
      { userId: "user-1", schoolId: "school-1" },
      expect.objectContaining({ actions, checkpoints }),
      { attemptDeps: true },
    );
  });

  it("rejects browser-owned score and XP before authoritative completion", async () => {
    mockGetCurrentUser.mockResolvedValue(user);
    mockCompleteDragonFlightHostProofAttempt.mockResolvedValue({ xpEarned: 5, score: 100, duplicate: false });

    const response = await POST(request({ ...transcript, score: 999, xpEarned: 999 }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: { code: "HOST_PROOF_VALIDATION_FAILED", message: "Completion request failed validation" },
    });
    expect(mockCompleteDragonFlightHostProofAttempt).not.toHaveBeenCalled();
  });

  it("maps a forged opaque completion receipt to a safe 4xx response", async () => {
    mockGetCurrentUser.mockResolvedValue(user);
    mockCompleteDragonFlightHostProofAttempt.mockRejectedValue(new Error("forged opaque receipt"));

    const response = await POST(request(transcript));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: { code: "HOST_PROOF_ATTEMPT_REJECTED", message: "Completion transcript was rejected" },
    });
  });

  it("maps a rejected signed transcript to the safe attempt error", async () => {
    mockGetCurrentUser.mockResolvedValue(user);
    mockCompleteDragonFlightHostProofAttempt.mockRejectedValue(new Error("credential signature invalid"));

    const response = await POST(request(transcript));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: { code: "HOST_PROOF_ATTEMPT_REJECTED", message: "Completion transcript was rejected" } });
  });

  it("maps an expired canonical-recovery rejection to the safe attempt error", async () => {
    mockGetCurrentUser.mockResolvedValue(user);
    mockCompleteDragonFlightHostProofAttempt.mockRejectedValue(
      new Error("Host-proof expired credential cannot reconcile the canonical completion"),
    );

    const response = await POST(request(transcript));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: { code: "HOST_PROOF_ATTEMPT_REJECTED", message: "Completion transcript was rejected" },
    });
  });

  it("allows vocabulary-gate host-proof history and keeps its tenant scope", async () => {
    mockGetCurrentUser.mockResolvedValue(user);
    expect((await GET(request(undefined, "?gameType=storm-castle-tower"))).status).toBe(404);
    mockGetHostProofGameCompletions.mockResolvedValue([]);

    const magicResponse = await GET(request(undefined, "?gameType=magic-defense&limit=10"));
    expect(magicResponse.status).toBe(200);
    expect(mockGetHostProofGameCompletions).toHaveBeenCalledWith(expect.objectContaining({
      tenant: { schoolId: "school-1" }, input: { gameType: "magic-defense", limit: 10 },
    }));

    const response = await GET(request(undefined, "?limit=10"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ history: [] });
    expect(mockGetHostProofGameCompletions).toHaveBeenCalledWith(expect.objectContaining({
      tenant: { schoolId: "school-1" }, input: { gameType: "dragon-flight", limit: 10 },
    }));

    mockGetHostProofGameCompletions.mockClear();
    const puzzleResponse = await GET(request(undefined, "?gameType=enchanted-library&limit=5"));
    expect(puzzleResponse.status).toBe(200);
    expect(mockGetHostProofGameCompletions).toHaveBeenCalledWith(expect.objectContaining({
      tenant: { schoolId: "school-1" }, input: { gameType: "enchanted-library", limit: 5 },
    }));
  });

  it.each([
    "castle-defense",
    "wizard-vs-zombie",
    "village-guardian",
    "enchanted-library",
    "rune-match",
    "alchemists-synthesis",
    "potion-rush",
    "rune-forge-chamber",
    "spellweavers-run",
    "shadow-gate-dungeon",
    "labyrinth-goblin-king",
    "griffin-riders-escape",
  ])("permits multi-title host-proof history for %s", async (gameType) => {
    mockGetCurrentUser.mockResolvedValue(user);
    mockGetHostProofGameCompletions.mockResolvedValue([]);
    expect((await GET(request(undefined, `?gameType=${gameType}&limit=5`))).status).toBe(200);
    expect(mockGetHostProofGameCompletions).toHaveBeenCalledWith(expect.objectContaining({
      tenant: { schoolId: "school-1" },
      input: { gameType, limit: 5 },
    }));
  });

  it.each(["castle-defense", "enchanted-library", "spellweavers-run"])(
    "delegates multi-title signed completion for %s (gameType bound in credential)",
    async (gameType) => {
      mockGetCurrentUser.mockResolvedValue(user);
      mockCompleteDragonFlightHostProofAttempt.mockResolvedValue({
        xpEarned: 5, score: 100, accuracy: 1, correctAnswers: 1, totalAttempts: 1, duration: 700, duplicate: false,
      });
      const response = await POST(request(transcript));
      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toMatchObject({ xpEarned: 5, score: 100, duplicate: false });
      mockGetHostProofGameCompletions.mockResolvedValue([]);
      expect((await GET(request(undefined, `?gameType=${gameType}`))).status).toBe(200);
    },
  );
});
