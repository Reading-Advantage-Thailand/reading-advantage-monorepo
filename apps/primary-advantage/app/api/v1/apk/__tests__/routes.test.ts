// @vitest-environment node

import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockListPrimaryAnswerAudioContent,
  mockCreateTenantDB,
  mockGetCurrentUser,
  mockListGameLearningContent,
  mockRecordGameCompletion,
  mockGetMyRpgState,
  mockEquipMyRpgCosmetic,
  mockEnqueuePrimaryEvidence,
} = vi.hoisted(() => ({
  mockListPrimaryAnswerAudioContent: vi.fn(),
  mockCreateTenantDB: vi.fn(),
  mockGetCurrentUser: vi.fn(),
  mockListGameLearningContent: vi.fn(),
  mockRecordGameCompletion: vi.fn(),
  mockGetMyRpgState: vi.fn(),
  mockEquipMyRpgCosmetic: vi.fn(),
  mockEnqueuePrimaryEvidence: vi.fn(),
}));

vi.mock("@/lib/primary-evidence-queue", () => ({
  enqueuePrimaryEvidenceJob: (...args: unknown[]) => mockEnqueuePrimaryEvidence(...args),
}));

vi.mock("@/lib/session", () => ({
  getCurrentUser: (...args: unknown[]) => mockGetCurrentUser(...args),
}));

vi.mock("@reading-advantage/storage", () => ({ getStorageClient: () => ({}) }));

vi.mock("@reading-advantage/db", async (importOriginal) => ({
  // The real tables stay: the domain and auth modules register them when they load.
  ...(await importOriginal<typeof import("@reading-advantage/db")>()),
  db: { connection: "primary" },
}));

vi.mock("@reading-advantage/domain", () => ({
  createTenantDB: (...args: unknown[]) => mockCreateTenantDB(...args),
}));

vi.mock("@reading-advantage/domain/games", async () => ({
  ...(await vi.importActual<typeof import("@reading-advantage/domain/games")>(
    "@reading-advantage/domain/games",
  )),
  listPrimaryAnswerAudioContent: (...args: unknown[]) => mockListPrimaryAnswerAudioContent(...args),
  listGameLearningContent: (...args: unknown[]) => mockListGameLearningContent(...args),
  recordGameCompletion: (...args: unknown[]) => mockRecordGameCompletion(...args),
}));

vi.mock("@reading-advantage/domain/rpg", () => ({
  getMyRpgState: (...args: unknown[]) => mockGetMyRpgState(...args),
  equipMyRpgCosmetic: (...args: unknown[]) => mockEquipMyRpgCosmetic(...args),
}));

import { POST } from "../complete/route";
import { GET } from "../content/route";
import { GET as GET_RPG, PATCH as PATCH_RPG } from "../rpg/route";

const student = {
  id: "student-1",
  username: "student",
  name: "Student One",
  role: "STUDENT",
  schoolId: "school-1",
  xp: 120,
  level: 3,
  cefrLevel: "A2",
};

const completionInput = {
  challengeRunId: "44444444-4444-4444-8444-444444444444",
  gameType: "dragon-flight",
  difficulty: "medium",
  score: 80,
  accuracy: 0.75,
  correctAnswers: 3,
  totalAttempts: 4,
  duration: 5000,
  victory: true,
  idempotencyKey: "10000000-0000-4000-8000-000000000001",
  clientTimestamp: 1_787_900_000_000,
  metadata: { host: "primary-advantage" },
};

const rpgState = {
  schemaVersion: 1,
  equippedEmblemId: null,
  cosmetics: [
    { id: "apprentice-wand", slot: "profile-emblem", name: "Apprentice Wand", unlockedAt: null, equipped: false },
    { id: "graveyard-staff", slot: "profile-emblem", name: "Graveyard Staff", unlockedAt: null, equipped: false },
    { id: "echo-staff", slot: "profile-emblem", name: "Echo Staff", unlockedAt: null, equipped: false },
  ],
  quests: [
    { id: "first-ward", completed: false, completedAt: null, rewardId: "apprentice-wand" },
    { id: "complete-the-ward", completed: false, completedAt: null, rewardId: "graveyard-staff" },
    { id: "perfect-english-audio", completed: false, completedAt: null, rewardId: "echo-staff" },
  ],
};

function contentRequest(query: string): NextRequest {
  return new NextRequest(`http://localhost/api/v1/apk/content?${query}`);
}

function completionRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/v1/apk/complete", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

describe("Primary APK routes", () => {
  afterEach(() => { vi.unstubAllEnvs(); });

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCurrentUser.mockResolvedValue(student);
    mockCreateTenantDB.mockReturnValue({ tenant: "school-1" });
    mockGetMyRpgState.mockResolvedValue(rpgState);
    mockEquipMyRpgCosmetic.mockResolvedValue({ equippedEmblemId: "apprentice-wand" });
  });

  it("reads and equips RPG state through tenant-scoped domain operations", async () => {
    const readResponse = await GET_RPG();
    const equipResponse = await PATCH_RPG(completionRequest({ cosmeticId: "apprentice-wand" }));

    expect(readResponse?.status).toBe(200);
    expect(equipResponse?.status).toBe(200);
    expect(mockGetMyRpgState).toHaveBeenCalledWith(expect.objectContaining({
      db: { tenant: "school-1" },
      tenant: { schoolId: "school-1" },
    }));
    expect(mockEquipMyRpgCosmetic).toHaveBeenCalledWith(expect.objectContaining({
      db: { tenant: "school-1" },
      input: { cosmeticId: "apprentice-wand" },
    }));
  });

  it("loads authenticated student content through the tenant-scoped domain query", async () => {
    const content = {
      mode: "vocabulary",
      source: "student-flashcards",
      requestedTargetLocale: "th",
      selectedTargetLocales: ["th"],
      content: [{ term: "river", translation: "แม่น้ำ" }],
    };
    mockListGameLearningContent.mockResolvedValue(content);

    const response = await GET(contentRequest("mode=vocabulary&locale=th"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(content);
    expect(response.headers.get("Cache-Control")).toBe("no-store, private");
    expect(mockCreateTenantDB).toHaveBeenCalledWith(
      expect.anything(),
      { schoolId: "school-1" },
    );
    expect(mockListGameLearningContent).toHaveBeenCalledWith({
      db: { tenant: "school-1" },
      user: student,
      tenant: { schoolId: "school-1" },
      input: { mode: "vocabulary", locale: "th", limit: 50 },
    });
  });

  it("records an authenticated completion through the tenant-scoped domain command", async () => {
    const completion = {
      xpEarned: 25,
      activityId: "game:dragon-flight:10000000-0000-4000-8000-000000000001",
      duplicate: false,
      status: 200,
    };
    mockRecordGameCompletion.mockResolvedValue(completion);

    const response = await POST(completionRequest(completionInput));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(completion);
    expect(mockRecordGameCompletion).toHaveBeenCalledWith({
      db: { tenant: "school-1" },
      user: student,
      tenant: { schoolId: "school-1" },
      input: completionInput,
    });
  });

  it("enqueues one mastery evidence job for a story-game run and none for a plain run (FR-5c)", async () => {
    const completionId = "20000000-0000-4000-8000-000000000002";
    mockRecordGameCompletion.mockResolvedValue({ xpEarned: 25, activityId: "game:x", duplicate: false, status: 200, completionId });
    mockEnqueuePrimaryEvidence.mockResolvedValue(true);
    const storyEvidence = { schemaVersion: 1, kind: "story-game", gameId: "potion-rush", inputId: "saved", level: "A1", seed: 1, durationMs: 1000, items: [{ itemId: "w-puppy", itemKind: "word", label: "puppy", attempts: 1, correctFirstTry: true, solved: true }], practice: [] };

    const storyResponse = await POST(completionRequest({ ...completionInput, challengeRunId: undefined, gameType: "potion-rush", metadata: { learningEvidence: storyEvidence } }));
    expect(storyResponse.status).toBe(200);
    expect(mockEnqueuePrimaryEvidence).toHaveBeenCalledWith({ sourceTable: "game_completions", rowId: completionId }, "school-1");

    mockEnqueuePrimaryEvidence.mockClear();
    const plainResponse = await POST(completionRequest(completionInput));
    expect(plainResponse.status).toBe(200);
    expect(mockEnqueuePrimaryEvidence).not.toHaveBeenCalled();
  });

  it("rejects an invalid completion payload before domain access", async () => {
    const response = await POST(
      completionRequest({ ...completionInput, accuracy: 75 }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "INVALID_PAYLOAD",
        message: "Game completion payload is invalid",
      },
    });
    expect(mockRecordGameCompletion).not.toHaveBeenCalled();
  });
  const preparedAnswerAudio = {
    mode: "vocabulary", source: "student-flashcards",
    requestedTargetLocale: "th", selectedTargetLocales: ["th"],
    content: [{ term: "river", translation: "แม่น้ำ" }],
    answerAudioSession: {
      modality: "read-to-select-audio", promptLocale: "th-TH", answerLocale: "en-US",
      promptField: "translation", answerField: "term", scored: true,
    },
    preparedAnswerAudio: { clips: [{
      itemPosition: 0, url: "https://storage.googleapis.com/primary-app-storage/audios/words/cmarticle.mp3",
      mediaType: "audio/mpeg", sourceLocale: "en-US", startSeconds: 0.5, endSeconds: 1.4,
    }] },
  };

  it.each(["wizard-vs-zombie", "hero-vs-zombie", "dragon-flight", "dragon-rider"])(
    "returns the saved words with their article word audio segments in %s",
    async (cartridgeId) => {
      mockListPrimaryAnswerAudioContent.mockResolvedValue(preparedAnswerAudio);
      const response = await GET(contentRequest(`mode=vocabulary&locale=th&learningMode=answer-audio&cartridgeId=${cartridgeId}`));
      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toEqual(preparedAnswerAudio);
      const [args] = mockListPrimaryAnswerAudioContent.mock.calls[0] as [{ user: { id: string }; tenant: unknown; audioUrlOf: (key: string) => string }];
      expect(args.user).toMatchObject({ id: "student-1", schoolId: "school-1" });
      expect(args.tenant).toEqual({ schoolId: "school-1" });
      expect(args.audioUrlOf("audios/words/cmarticle.mp3")).toMatch(/^https:\/\/storage\.googleapis\.com\/.+\/audios\/words\/cmarticle\.mp3$/);
      expect(mockListGameLearningContent).not.toHaveBeenCalled();
    },
  );

  it("rejects the old reverse-direction Wizard audio request", async () => {
    const response = await GET(contentRequest("mode=vocabulary&locale=th&learningMode=listening&cartridgeId=wizard-vs-zombie"));
    expect(response.status).toBe(400);
    expect(mockListGameLearningContent).not.toHaveBeenCalled();
    expect(mockListPrimaryAnswerAudioContent).not.toHaveBeenCalled();
  });

  it("returns unavailable when no saved word has a Thai meaning and word audio, and never falls back to reading", async () => {
    mockListPrimaryAnswerAudioContent.mockResolvedValue(undefined);

    const response = await GET(contentRequest("mode=vocabulary&locale=th&learningMode=answer-audio&cartridgeId=hero-vs-zombie"));

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      error: { code: "LISTENING_UNAVAILABLE", message: "No saved word has English audio" },
      status: 503,
    });
    expect(mockListGameLearningContent).not.toHaveBeenCalled();
  });

  it("returns an internal error when the answer audio content cannot be built", async () => {
    mockListPrimaryAnswerAudioContent.mockRejectedValue(new Error("invalid prepared response"));

    const response = await GET(contentRequest("mode=vocabulary&locale=th&learningMode=answer-audio&cartridgeId=hero-vs-zombie"));

    expect(response.status).toBe(500);
  });

  it("returns unavailable for answer audio requested with an English interface locale", async () => {
    const response = await GET(contentRequest("mode=vocabulary&locale=en&learningMode=answer-audio&cartridgeId=wizard-vs-zombie"));

    expect(response.status).toBe(503);
    expect(mockListGameLearningContent).not.toHaveBeenCalled();
    expect(mockListPrimaryAnswerAudioContent).not.toHaveBeenCalled();
  });

});
