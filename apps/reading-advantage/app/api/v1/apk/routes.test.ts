import type { NextRequest } from "next/server";
import { GameSpeechPreparationError } from "@reading-advantage/domain/games";

import { POST } from "./complete/route";
import { GET } from "./content/route";
import { GET as GET_RPG, PATCH as PATCH_RPG } from "./rpg/route";

const mockGetCurrentUser = jest.fn();
const mockPrepareGameAnswerAudio = jest.fn();
const mockListGameLearningContent = jest.fn();
const mockRecordGameCompletion = jest.fn();
const mockCreateTenantDB = jest.fn();
const mockGetMyRpgState = jest.fn();
const mockEquipMyRpgCosmetic = jest.fn();
const mockTenantDb = { tenant: "school-1" };

jest.mock("next/server", () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number; headers?: Record<string, string> }) => ({
      status: init?.status ?? 200,
      headers: {
        get: (name: string) => {
          const entry = Object.entries(init?.headers ?? {}).find(
            ([key]) => key.toLowerCase() === name.toLowerCase(),
          );
          return entry?.[1] ?? null;
        },
      },
      json: async () => body,
    }),
  },
}));

jest.mock("@/lib/session", () => ({
  getCurrentUser: (...args: unknown[]) => mockGetCurrentUser(...args),
}));

jest.mock("@reading-advantage/storage", () => ({ getStorageClient: () => ({}) }));

jest.mock("@reading-advantage/db", () => ({ db: { connection: "reading" } }));

jest.mock("@reading-advantage/domain", () => ({
  createTenantDB: (...args: unknown[]) => mockCreateTenantDB(...args),
}));

jest.mock("@reading-advantage/domain/games", () => {
  const actual = jest.requireActual("@reading-advantage/domain/games");
  return {
    ...actual,
    prepareGameAnswerAudio: (...args: unknown[]) => mockPrepareGameAnswerAudio(...args),
    createStoredSpeechClipLookup: () => ({ find: () => undefined }),
    createConfiguredSpeechObjectResolver: () => () => undefined,
    listGameLearningContent: (...args: unknown[]) => mockListGameLearningContent(...args),
    recordGameCompletion: (...args: unknown[]) => mockRecordGameCompletion(...args),
  };
});

jest.mock("@reading-advantage/domain/rpg", () => ({
  getMyRpgState: (...args: unknown[]) => mockGetMyRpgState(...args),
  equipMyRpgCosmetic: (...args: unknown[]) => mockEquipMyRpgCosmetic(...args),
}));

const student = {
  id: "student-1",
  username: "student",
  email: "student@example.com",
  display_name: "Student One",
  role: "STUDENT",
  level: 3,
  email_verified: true,
  picture: "",
  xp: 120,
  cefr_level: "A2",
  expired_date: "2027-01-01",
  expired: false,
  license_id: "license-1",
  license_level: "BASIC",
  onborda: false,
  school_id: "school-1",
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
  metadata: { host: "reading-advantage" },
};

/**
 * Creates the request surface used by the GET handler.
 * @param url Absolute request URL.
 * @returns A request with the specified URL.
 */
function getRequest(url: string): NextRequest {
  return { url } as NextRequest;
}

/**
 * Creates the request surface used by the POST handler.
 * @param body JSON body returned by the request.
 * @returns A request with a JSON reader.
 */
function postRequest(body: unknown): NextRequest {
  return { json: jest.fn().mockResolvedValue(body) } as unknown as NextRequest;
}

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

describe("Reading APK routes", () => {
  afterEach(() => { jest.restoreAllMocks(); });

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetCurrentUser.mockResolvedValue(student);
    mockCreateTenantDB.mockReturnValue(mockTenantDb);
    mockGetMyRpgState.mockResolvedValue(rpgState);
    mockEquipMyRpgCosmetic.mockResolvedValue({ equippedEmblemId: "apprentice-wand" });
  });

  it("reads and equips RPG state through tenant-scoped domain operations", async () => {
    const readResponse = await GET_RPG();
    const equipResponse = await PATCH_RPG(postRequest({ cosmeticId: "apprentice-wand" }));

    expect(readResponse.status).toBe(200);
    expect(equipResponse.status).toBe(200);
    expect(mockGetMyRpgState).toHaveBeenCalledWith(expect.objectContaining({
      db: mockTenantDb,
      tenant: { schoolId: "school-1" },
    }));
    expect(mockEquipMyRpgCosmetic).toHaveBeenCalledWith(expect.objectContaining({
      db: mockTenantDb,
      input: { cosmeticId: "apprentice-wand" },
    }));
  });

  it("loads validated student content through the domain query", async () => {
    const content = {
      mode: "vocabulary",
      source: "student-flashcards",
      requestedTargetLocale: "th",
      selectedTargetLocales: ["th"],
      content: [{ term: "river", translation: "แม่น้ำ" }],
    };
    mockListGameLearningContent.mockResolvedValue(content);

    const response = await GET(
      getRequest("http://localhost/api/v1/apk/content?mode=vocabulary&locale=th"),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(content);
    expect(response.headers.get("Cache-Control")).toBe("no-store, private");
    expect(mockCreateTenantDB).toHaveBeenCalledWith(
      expect.anything(),
      { schoolId: "school-1" },
    );
    expect(mockListGameLearningContent).toHaveBeenCalledWith({
      db: mockTenantDb,
      user: expect.objectContaining({
        id: "student-1",
        role: "STUDENT",
        schoolId: "school-1",
      }),
      tenant: { schoolId: "school-1" },
      input: { mode: "vocabulary", locale: "th", limit: 50 },
    });
  });

  it("rejects content access without a session", async () => {
    mockGetCurrentUser.mockResolvedValue(null);

    const response = await GET(
      getRequest("http://localhost/api/v1/apk/content?mode=sentence&locale=en"),
    );

    expect(response.status).toBe(401);
    expect(mockListGameLearningContent).not.toHaveBeenCalled();
  });

  it("records a validated completion through the domain command", async () => {
    const completion = {
      xpEarned: 25,
      activityId: "game:dragon-flight:10000000-0000-4000-8000-000000000001",
      duplicate: false,
      status: 200,
    };
    mockRecordGameCompletion.mockResolvedValue(completion);

    const response = await POST(postRequest(completionInput));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(completion);
    expect(mockRecordGameCompletion).toHaveBeenCalledWith({
      db: mockTenantDb,
      user: expect.objectContaining({
        id: "student-1",
        role: "STUDENT",
        schoolId: "school-1",
      }),
      tenant: { schoolId: "school-1" },
      input: completionInput,
    });
  });

  it("rejects an invalid completion before domain access", async () => {
    const response = await POST(postRequest({ ...completionInput, accuracy: 75 }));

    expect(response.status).toBe(400);
    expect(mockRecordGameCompletion).not.toHaveBeenCalled();
  });
  it.each(["wizard-vs-zombie", "dragon-flight", "dragon-rider"])(
    "returns English answer audio for a written Thai target in %s",
    async (cartridgeId) => {
    jest.replaceProperty(process, "env", { ...process.env, APK_WIZARD_SPEECH_MANIFEST: "test-manifest" });
    mockListGameLearningContent.mockResolvedValue({
      mode: "vocabulary", source: "student-flashcards",
      requestedTargetLocale: "th", selectedTargetLocales: ["th"],
      content: [{ term: "river", translation: "แม่น้ำ" }],
    });
    mockPrepareGameAnswerAudio.mockResolvedValue({ clips: [{
      itemPosition: 0, url: "https://audio.example/river.mp3",
      mediaType: "audio/mpeg", sourceLocale: "en-US",
    }] });
    const response = await GET(getRequest(`http://localhost/api/v1/apk/content?mode=vocabulary&locale=th&learningMode=answer-audio&cartridgeId=${cartridgeId}`));
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
    const response = await GET(getRequest("http://localhost/api/v1/apk/content?mode=vocabulary&locale=th&learningMode=listening&cartridgeId=wizard-vs-zombie"));
    expect(response.status).toBe(400);
    expect(mockListGameLearningContent).not.toHaveBeenCalled();
    expect(mockPrepareGameAnswerAudio).not.toHaveBeenCalled();
  });

  it("returns unavailable without a reviewed manifest and never falls back to reading", async () => {
    const env = { ...process.env };
    delete env.APK_WIZARD_SPEECH_MANIFEST;
    jest.replaceProperty(process, "env", env);
    mockListGameLearningContent.mockResolvedValue({
      mode: "vocabulary", source: "student-flashcards",
      requestedTargetLocale: "th", selectedTargetLocales: ["th"],
      content: [{ term: "river", translation: "แม่น้ำ" }],
      answerAudioSession: {
        modality: "read-to-select-audio", promptLocale: "th-TH", answerLocale: "en-US",
        promptField: "translation", answerField: "term", scored: true,
      },
    });

    const response = await GET(getRequest("http://localhost/api/v1/apk/content?mode=vocabulary&locale=th&learningMode=answer-audio&cartridgeId=wizard-vs-zombie"));

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      error: { code: "LISTENING_UNAVAILABLE", message: "Prepared audio is unavailable" },
      status: 503,
    });
    expect(mockPrepareGameAnswerAudio).not.toHaveBeenCalled();
  });

  it("returns unavailable when one selected English answer has no prepared clip", async () => {
    jest.replaceProperty(process, "env", { ...process.env, APK_WIZARD_SPEECH_MANIFEST: "test-manifest" });
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

    const response = await GET(getRequest("http://localhost/api/v1/apk/content?mode=vocabulary&locale=th&learningMode=answer-audio&cartridgeId=wizard-vs-zombie"));

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
    jest.replaceProperty(process, "env", { ...process.env, APK_WIZARD_SPEECH_MANIFEST: "test-manifest" });
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

    const response = await GET(getRequest("http://localhost/api/v1/apk/content?mode=vocabulary&locale=th&learningMode=answer-audio&cartridgeId=wizard-vs-zombie"));

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: { code: "INTERNAL_ERROR", message: "Unable to load learning content" },
      status: 500,
    });
  });

  it("rejects fallback target metadata before returning answer audio", async () => {
    jest.replaceProperty(process, "env", { ...process.env, APK_WIZARD_SPEECH_MANIFEST: "test-manifest" });
    mockListGameLearningContent.mockResolvedValue({
      mode: "vocabulary", source: "student-flashcards",
      requestedTargetLocale: "th", selectedTargetLocales: ["en"],
      content: [{ term: "river", translation: "river" }],
    });
    mockPrepareGameAnswerAudio.mockResolvedValue({ clips: [{
      itemPosition: 0, url: "https://audio.example/river.mp3",
      mediaType: "audio/mpeg", sourceLocale: "en-US",
    }] });

    const response = await GET(getRequest("http://localhost/api/v1/apk/content?mode=vocabulary&locale=th&learningMode=answer-audio&cartridgeId=wizard-vs-zombie"));

    expect(response.status).toBe(500);
    expect(mockPrepareGameAnswerAudio).toHaveBeenCalledTimes(1);
  });

  it("returns unavailable for answer audio requested with an English interface locale", async () => {
    const response = await GET(getRequest("http://localhost/api/v1/apk/content?mode=vocabulary&locale=en&learningMode=answer-audio&cartridgeId=wizard-vs-zombie"));

    expect(response.status).toBe(503);
    expect(mockListGameLearningContent).not.toHaveBeenCalled();
    expect(mockPrepareGameAnswerAudio).not.toHaveBeenCalled();
  });

});
