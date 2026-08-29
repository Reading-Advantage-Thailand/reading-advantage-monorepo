import type { NextRequest } from "next/server";

import { POST } from "./complete/route";
import { GET } from "./content/route";

const mockGetCurrentUser = jest.fn();
const mockListGameLearningContent = jest.fn();
const mockRecordGameCompletion = jest.fn();
const mockCreateTenantDB = jest.fn();
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

jest.mock("@reading-advantage/db", () => ({ db: { connection: "reading" } }));

jest.mock("@reading-advantage/domain", () => ({
  createTenantDB: (...args: unknown[]) => mockCreateTenantDB(...args),
}));

jest.mock("@reading-advantage/domain/games", () => {
  const actual = jest.requireActual("@reading-advantage/domain/games");
  return {
    ...actual,
    listGameLearningContent: (...args: unknown[]) => mockListGameLearningContent(...args),
    recordGameCompletion: (...args: unknown[]) => mockRecordGameCompletion(...args),
  };
});

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

describe("Reading APK routes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetCurrentUser.mockResolvedValue(student);
    mockCreateTenantDB.mockReturnValue(mockTenantDb);
  });

  it("loads validated student content through the domain query", async () => {
    const content = {
      mode: "vocabulary",
      source: "student-flashcards",
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
});
