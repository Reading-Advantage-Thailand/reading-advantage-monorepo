// @vitest-environment node

import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GameSpeechPreparationError } from "@reading-advantage/domain/games";

const {
  mockPrepareGameAnswerAudio,
  mockCreateTenantDB,
  mockGetCurrentUser,
  mockListGameLearningContent,
  mockRecordGameCompletion,
  mockGetMyRpgState,
  mockEquipMyRpgCosmetic,
} = vi.hoisted(() => ({
  mockPrepareGameAnswerAudio: vi.fn(),
  mockCreateTenantDB: vi.fn(),
  mockGetCurrentUser: vi.fn(),
  mockListGameLearningContent: vi.fn(),
  mockRecordGameCompletion: vi.fn(),
  mockGetMyRpgState: vi.fn(),
  mockEquipMyRpgCosmetic: vi.fn(),
}));

vi.mock("@/lib/session", () => ({
  getCurrentUser: (...args: unknown[]) => mockGetCurrentUser(...args),
}));

vi.mock("@reading-advantage/storage", () => ({ getStorageClient: () => ({}) }));

vi.mock("@reading-advantage/db", () => ({ db: { connection: "primary" } }));

vi.mock("@reading-advantage/domain", () => ({
  createTenantDB: (...args: unknown[]) => mockCreateTenantDB(...args),
}));

vi.mock("@reading-advantage/domain/games", async () => ({
  ...(await vi.importActual<typeof import("@reading-advantage/domain/games")>(
    "@reading-advantage/domain/games",
  )),
  prepareGameAnswerAudio: (...args: unknown[]) => mockPrepareGameAnswerAudio(...args),
  createStoredSpeechClipLookup: () => ({ find: () => undefined }),
  createConfiguredSpeechObjectResolver: () => () => undefined,
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

    expect(readResponse.status).toBe(200);
    expect(equipResponse.status).toBe(200);
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
  it.each(["wizard-vs-zombie", "dragon-flight", "dragon-rider"])(
    "returns English answer audio for a written Thai target in %s",
    async (cartridgeId) => {
    vi.stubEnv("APK_WIZARD_SPEECH_MANIFEST", "test-manifest");
    mockListGameLearningContent.mockResolvedValue({
      mode: "vocabulary", source: "student-flashcards",
      requestedTargetLocale: "th", selectedTargetLocales: ["th"],
      content: [{ term: "river", translation: "แม่น้ำ" }],
    });
    mockPrepareGameAnswerAudio.mockResolvedValue({ clips: [{
      itemPosition: 0, url: "https://audio.example/river.mp3",
      mediaType: "audio/mpeg", sourceLocale: "en-US",
    }] });
    const response = await GET(contentRequest(`mode=vocabulary&locale=th&learningMode=answer-audio&cartridgeId=${cartridgeId}`));
    expect(response.status).toBe(200);
    expect(mockPrepareGameAnswerAudio).toHaveBeenCalledWith(expect.objectContaining({
      user: expect.objectContaining({ id: "student-1", schoolId: "school-1" }),
      tenant: { schoolId: "school-1" },
      session: { modality: "read-to-select-audio", promptLocale: "th-TH", answerLocale: "en-US",
        promptField: "translation", answerField: "term", scored: true },
    }));
    expect(await response.json()).toMatchObject({
      answerAudioSession: { promptLocale: "th-TH", answerLocale: "en-US" },
      preparedAnswerAudio: { clips: [{ itemPosition: 0, sourceLocale: "en-US" }] },
    });
    },
  );

  it("rejects the old reverse-direction Wizard audio request", async () => {
    const response = await GET(contentRequest("mode=vocabulary&locale=th&learningMode=listening&cartridgeId=wizard-vs-zombie"));
    expect(response.status).toBe(400);
    expect(mockListGameLearningContent).not.toHaveBeenCalled();
    expect(mockPrepareGameAnswerAudio).not.toHaveBeenCalled();
  });

  it("returns unavailable without a reviewed manifest and never falls back to reading", async () => {
    vi.stubEnv("APK_WIZARD_SPEECH_MANIFEST", "");
    mockListGameLearningContent.mockResolvedValue({
      mode: "vocabulary", source: "student-flashcards",
      requestedTargetLocale: "th", selectedTargetLocales: ["th"],
      content: [{ term: "river", translation: "แม่น้ำ" }],
      answerAudioSession: {
        modality: "read-to-select-audio", promptLocale: "th-TH", answerLocale: "en-US",
        promptField: "translation", answerField: "term", scored: true,
      },
    });

    const response = await GET(contentRequest("mode=vocabulary&locale=th&learningMode=answer-audio&cartridgeId=wizard-vs-zombie"));

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      error: { code: "LISTENING_UNAVAILABLE", message: "Prepared audio is unavailable" },
      status: 503,
    });
    expect(mockPrepareGameAnswerAudio).not.toHaveBeenCalled();
  });

  it("returns unavailable when one selected English answer has no prepared clip", async () => {
    vi.stubEnv("APK_WIZARD_SPEECH_MANIFEST", "test-manifest");
    mockListGameLearningContent.mockResolvedValue({
      mode: "vocabulary", source: "student-flashcards",
      requestedTargetLocale: "th", selectedTargetLocales: ["th"],
      content: [{ term: "river", translation: "แม่น้ำ" }],
      answerAudioSession: {
        modality: "read-to-select-audio", promptLocale: "th-TH", answerLocale: "en-US",
        promptField: "translation", answerField: "term", scored: true,
      },
    });
    mockPrepareGameAnswerAudio.mockRejectedValue(
      new GameSpeechPreparationError("missing-audio", "Prepared speech is unavailable", 0),
    );

    const response = await GET(contentRequest("mode=vocabulary&locale=th&learningMode=answer-audio&cartridgeId=wizard-vs-zombie"));

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      error: { code: "LISTENING_UNAVAILABLE", message: "Prepared audio is unavailable" },
      status: 503,
    });
  });

  it.each([
    ["incomplete clips", { clips: [] }],
    ["misaligned clips", { clips: [{
      itemPosition: 1, url: "https://audio.example/river.mp3",
      mediaType: "audio/mpeg", sourceLocale: "en-US",
    }] }],
    ["malformed clips", { clips: [{
      itemPosition: 0, url: "not a URL",
      mediaType: "audio/mpeg", sourceLocale: "en-US",
    }] }],
  ])("rejects %s instead of returning reading content", async (_label, preparedAnswerAudio) => {
    vi.stubEnv("APK_WIZARD_SPEECH_MANIFEST", "test-manifest");
    mockListGameLearningContent.mockResolvedValue({
      mode: "vocabulary", source: "student-flashcards",
      requestedTargetLocale: "th", selectedTargetLocales: ["th"],
      content: [{ term: "river", translation: "แม่น้ำ" }],
      answerAudioSession: {
        modality: "read-to-select-audio", promptLocale: "th-TH", answerLocale: "en-US",
        promptField: "translation", answerField: "term", scored: true,
      },
    });
    mockPrepareGameAnswerAudio.mockResolvedValue(preparedAnswerAudio);

    const response = await GET(contentRequest("mode=vocabulary&locale=th&learningMode=answer-audio&cartridgeId=wizard-vs-zombie"));

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: { code: "INTERNAL_ERROR", message: "Unable to load learning content" },
      status: 500,
    });
  });

  it("rejects fallback target metadata before returning answer audio", async () => {
    vi.stubEnv("APK_WIZARD_SPEECH_MANIFEST", "test-manifest");
    mockListGameLearningContent.mockResolvedValue({
      mode: "vocabulary", source: "student-flashcards",
      requestedTargetLocale: "th", selectedTargetLocales: ["en"],
      content: [{ term: "river", translation: "river" }],
    });
    mockPrepareGameAnswerAudio.mockResolvedValue({ clips: [{
      itemPosition: 0, url: "https://audio.example/river.mp3",
      mediaType: "audio/mpeg", sourceLocale: "en-US",
    }] });

    const response = await GET(contentRequest("mode=vocabulary&locale=th&learningMode=answer-audio&cartridgeId=wizard-vs-zombie"));

    expect(response.status).toBe(500);
    expect(mockPrepareGameAnswerAudio).toHaveBeenCalledTimes(1);
  });

  it("returns unavailable for answer audio requested with an English interface locale", async () => {
    const response = await GET(contentRequest("mode=vocabulary&locale=en&learningMode=answer-audio&cartridgeId=wizard-vs-zombie"));

    expect(response.status).toBe(503);
    expect(mockListGameLearningContent).not.toHaveBeenCalled();
    expect(mockPrepareGameAnswerAudio).not.toHaveBeenCalled();
  });

});
