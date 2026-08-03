/** @jest-environment node */

import { NextRequest } from "next/server";

const mockGetCurrentUser = jest.fn();
const mockComplete = jest.fn();
const mockCreateDependencies = jest.fn();
const mockHistory = jest.fn();
const mockTenantDB = jest.fn();
const mockEnabled = jest.fn();

jest.mock("@/lib/session", () => ({ getCurrentUser: () => mockGetCurrentUser() }));
jest.mock("@/lib/host-proof-config", () => ({ isHostProofEnabled: () => mockEnabled() }));
jest.mock("@reading-advantage/domain", () => ({ createTenantDB: (...args: unknown[]) => mockTenantDB(...args) }));
jest.mock("@reading-advantage/db", () => ({ db: {} }));
jest.mock("@reading-advantage/domain/games", () => {
  const actual = jest.requireActual<typeof import("@reading-advantage/domain/games")>(
    "@reading-advantage/domain/games",
  );

  return {
    completeDragonFlightHostProofAttemptSchema: actual.completeDragonFlightHostProofAttemptSchema,
    createDragonFlightHostProofAttemptDependencies: (...args: unknown[]) => mockCreateDependencies(...args),
    completeDragonFlightHostProofAttempt: (...args: unknown[]) => mockComplete(...args),
    getHostProofGameCompletions: (...args: unknown[]) => mockHistory(...args),
    HostProofCompletionError: class HostProofCompletionError extends Error { readonly code = "HOST_PROOF_VALIDATION_FAILED"; },
    hostProofErrorHttpStatus: () => 400,
  };
});

import { GET, POST } from "@/app/api/host-proof/games/completions/route";

const sessionUser = {
  id: "user-1", username: "student-1", display_name: "Student", role: "STUDENT", school_id: "school-1",
  xp: 0, level: 1, cefr_level: "A1", email: "student@example.com", email_verified: true, picture: "", expired_date: "", expired: false, license_id: "", license_level: "BASIC", onborda: false,
};
const transcript = {
  attemptId: "11111111-1111-4111-8111-111111111111", credential: "opaque-host-proof-credential", idempotencyKey: "11111111-1111-4111-8111-111111111111",
  actions: [{ sequence: 1, kind: "choose-gate", gate: "right", elapsedMs: 400 }, { sequence: 2, kind: "launch", elapsedMs: 700 }],
  checkpoints: ["opaque-checkpoint-receipt-gate-00000001", "opaque-checkpoint-receipt-launch-00000002"],
};

/** Creates a signed completion route request. */
function request(body?: unknown, query = ""): NextRequest {
  return new NextRequest(`http://localhost:3000/api/host-proof/games/completions${query}`, { method: body === undefined ? "GET" : "POST", body: body === undefined ? null : JSON.stringify(body) });
}

describe("Dragon Flight host-proof completion route", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.HOST_PROOF_ATTEMPT_SECRET = "a".repeat(32);
    mockEnabled.mockReturnValue(true);
    mockTenantDB.mockReturnValue({ tenant: true });
    mockCreateDependencies.mockReturnValue({ attemptDeps: true });
  });

  it("fails closed before auth when disabled and requires a tenant-bound session", async () => {
    mockEnabled.mockReturnValue(false);
    expect((await POST(request(transcript))).status).toBe(404);
    expect(mockGetCurrentUser).not.toHaveBeenCalled();
    mockEnabled.mockReturnValue(true);
    mockGetCurrentUser.mockResolvedValueOnce(null);
    expect((await POST(request(transcript))).status).toBe(401);
    mockGetCurrentUser.mockResolvedValueOnce({ ...sessionUser, school_id: undefined });
    expect((await POST(request(transcript))).status).toBe(403);
  });

  it("returns validation failure for malformed JSON", async () => {
    mockGetCurrentUser.mockResolvedValue(sessionUser);
    const malformed = new NextRequest("http://localhost:3000/api/host-proof/games/completions", { method: "POST", body: "{" });
    expect((await POST(malformed)).status).toBe(400);
  });

  it("delegates the signed transcript and returns only the authoritative derived result", async () => {
    mockGetCurrentUser.mockResolvedValue(sessionUser);
    mockComplete.mockResolvedValue({ xpEarned: 5, score: 100, accuracy: 1, correctAnswers: 1, totalAttempts: 1, duration: 700, duplicate: false });
    const response = await POST(request(transcript));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ xpEarned: 5, score: 100, duplicate: false });
    expect(mockTenantDB).toHaveBeenCalledWith({}, { schoolId: "school-1" });
    expect(mockComplete).toHaveBeenCalledWith({ userId: "user-1", schoolId: "school-1" }, transcript, { attemptDeps: true });
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
    mockGetCurrentUser.mockResolvedValue(sessionUser);
    mockComplete.mockRejectedValue(new Error(replayError));

    const response = await POST(request({ ...transcript, actions, checkpoints }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: { code: "HOST_PROOF_ATTEMPT_REJECTED", message: "Completion transcript was rejected" },
    });
    expect(mockComplete).toHaveBeenCalledWith(
      { userId: "user-1", schoolId: "school-1" },
      expect.objectContaining({ actions, checkpoints }),
      { attemptDeps: true },
    );
  });

  it("rejects browser-owned score and XP before authoritative completion", async () => {
    mockGetCurrentUser.mockResolvedValue(sessionUser);
    mockComplete.mockResolvedValue({ xpEarned: 5, score: 100, duplicate: false });

    const response = await POST(request({ ...transcript, score: 999, xpEarned: 999 }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: { code: "HOST_PROOF_VALIDATION_FAILED", message: "Completion request failed validation" },
    });
    expect(mockComplete).not.toHaveBeenCalled();
  });

  it("maps a forged opaque completion receipt to a safe 4xx response", async () => {
    mockGetCurrentUser.mockResolvedValue(sessionUser);
    mockComplete.mockRejectedValue(new Error("forged opaque receipt"));

    const response = await POST(request(transcript));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: { code: "HOST_PROOF_ATTEMPT_REJECTED", message: "Completion transcript was rejected" },
    });
  });

  it("maps a signed transcript rejection to a safe response", async () => {
    mockGetCurrentUser.mockResolvedValue(sessionUser);
    mockComplete.mockRejectedValue(new Error("credential signature invalid"));
    const response = await POST(request(transcript));
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: { code: "HOST_PROOF_ATTEMPT_REJECTED", message: "Completion transcript was rejected" } });
  });

  it("maps an expired canonical-recovery rejection to the same safe response", async () => {
    mockGetCurrentUser.mockResolvedValue(sessionUser);
    mockComplete.mockRejectedValue(
      new Error("Host-proof expired credential cannot reconcile the canonical completion"),
    );

    const response = await POST(request(transcript));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: { code: "HOST_PROOF_ATTEMPT_REJECTED", message: "Completion transcript was rejected" },
    });
  });

  it("permits vocabulary-gate host-proof history and preserves tenant scope", async () => {
    mockGetCurrentUser.mockResolvedValue(sessionUser);
    expect((await GET(request(undefined, "?gameType=storm-castle-tower"))).status).toBe(404);
    mockHistory.mockResolvedValue([]);
    expect((await GET(request(undefined, "?gameType=magic-defense&limit=10"))).status).toBe(200);
    expect(mockHistory).toHaveBeenCalledWith(expect.objectContaining({
      tenant: { schoolId: "school-1" },
      input: { gameType: "magic-defense", limit: 10 },
    }));
    expect((await GET(request(undefined, "?limit=10"))).status).toBe(200);
    expect(mockHistory).toHaveBeenCalledWith(expect.objectContaining({ tenant: { schoolId: "school-1" }, input: { gameType: "dragon-flight", limit: 10 } }));
    mockHistory.mockClear();
    expect((await GET(request(undefined, "?gameType=enchanted-library&limit=5"))).status).toBe(200);
    expect(mockHistory).toHaveBeenCalledWith(expect.objectContaining({
      tenant: { schoolId: "school-1" },
      input: { gameType: "enchanted-library", limit: 5 },
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
    mockGetCurrentUser.mockResolvedValue(sessionUser);
    mockHistory.mockResolvedValue([]);
    expect((await GET(request(undefined, `?gameType=${gameType}&limit=5`))).status).toBe(200);
    expect(mockHistory).toHaveBeenCalledWith(expect.objectContaining({
      tenant: { schoolId: "school-1" },
      input: { gameType, limit: 5 },
    }));
  });

  it.each([
    "castle-defense",
    "enchanted-library",
    "spellweavers-run",
  ])("delegates multi-title signed completion for %s (gameType bound in credential)", async (gameType) => {
    mockGetCurrentUser.mockResolvedValue(sessionUser);
    mockComplete.mockResolvedValue({
      xpEarned: 5, score: 100, accuracy: 1, correctAnswers: 1, totalAttempts: 1, duration: 700, duplicate: false,
    });
    // Completion body does not re-send gameType; domain credential embeds it (proven in domain multi-title suite).
    const response = await POST(request(transcript));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ xpEarned: 5, score: 100, duplicate: false });
    expect(mockComplete).toHaveBeenCalledWith(
      { userId: "user-1", schoolId: "school-1" },
      transcript,
      { attemptDeps: true },
    );
    // Title under test is authorized for host history (same dual-host allowlist as completion transport).
    mockHistory.mockResolvedValue([]);
    expect((await GET(request(undefined, `?gameType=${gameType}`))).status).toBe(200);
  });
});
