import { NextRequest } from "next/server";

import { createApkContentRoute } from "./content-route";

const student = {
  id: "student-1",
  username: "student1",
  name: "Student",
  role: "STUDENT" as const,
  schoolId: "school-1",
  xp: 0,
  level: 1,
  cefrLevel: "A1",
};

function createRequest(
  query = "mode=vocabulary&locale=th",
  cookie = "session_token=opaque-token",
): NextRequest {
  return new NextRequest(`https://games.example/api/v1/apk/content?${query}`, {
    headers: cookie ? { cookie } : {},
  });
}

function createDependencies() {
  return {
    sessionCookieName: "session_token",
    validateSession: jest.fn().mockResolvedValue({ user: student }),
    createTenantDb: jest.fn().mockReturnValue({ tenant: "school-1" }),
    listContent: jest.fn().mockResolvedValue({
      mode: "vocabulary",
      source: "student-flashcards",
      requestedTargetLocale: "th",
      selectedTargetLocales: ["th"],
      content: [{ term: "river", translation: "แม่น้ำ" }],
    }),
  };
}

describe("createApkContentRoute", () => {
  it("returns student-owned content through the tenant domain query", async () => {
    const dependencies = createDependencies();
    const { GET } = createApkContentRoute(dependencies);

    const response = await GET(createRequest());

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      mode: "vocabulary",
      source: "student-flashcards",
      requestedTargetLocale: "th",
      selectedTargetLocales: ["th"],
      content: [{ term: "river", translation: "แม่น้ำ" }],
    });
    expect(dependencies.validateSession).toHaveBeenCalledWith("opaque-token");
    expect(dependencies.createTenantDb).toHaveBeenCalledWith("school-1");
    expect(dependencies.listContent).toHaveBeenCalledWith({
      db: { tenant: "school-1" },
      user: student,
      tenant: { schoolId: "school-1" },
      input: { mode: "vocabulary", locale: "th", limit: 50 },
    });
    expect(response.headers.get("cache-control")).toBe("no-store, private");
  });

  it.each(["wizard-vs-zombie", "dragon-flight", "dragon-rider"])(
    "prepares listening for %s only after authorized server content loads",
    async (cartridgeId) => {
    const dependencies = {
      ...createDependencies(),
      speechLookup: { find: jest.fn() },
      prepareAnswerAudio: jest.fn().mockResolvedValue({ clips: [{
        itemPosition: 0,
        url: "https://cdn.example/river.mp3",
        mediaType: "audio/mpeg",
        sourceLocale: "en-US",
      }] }),
    };
    const response = await createApkContentRoute(dependencies).GET(createRequest(
      `mode=vocabulary&locale=th&learningMode=answer-audio&cartridgeId=${cartridgeId}`,
    ));

    expect(response.status).toBe(200);
    expect(dependencies.listContent.mock.invocationCallOrder[0]).toBeLessThan(
      dependencies.prepareAnswerAudio.mock.invocationCallOrder[0]!,
    );
    expect(dependencies.prepareAnswerAudio).toHaveBeenCalledWith(expect.objectContaining({
      user: student,
      tenant: { schoolId: "school-1" },
      content: [{ term: "river", translation: "แม่น้ำ" }],
      session: {
        modality: "read-to-select-audio", promptLocale: "th-TH", answerLocale: "en-US",
        promptField: "translation", answerField: "term", scored: true,
      },
    }));
    expect(await response.json()).toEqual(expect.objectContaining({
      preparedAnswerAudio: { clips: [expect.objectContaining({ itemPosition: 0 })] },
    }));
    },
  );

  it("reports unavailable audio without changing to reading mode", async () => {
    const dependencies = createDependencies();
    const response = await createApkContentRoute(dependencies).GET(createRequest(
      "mode=vocabulary&locale=th&learningMode=answer-audio&cartridgeId=wizard-vs-zombie",
    ));

    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({
      error: { code: "LISTENING_UNAVAILABLE" },
    });
  });

  it("creates the speech lookup only after authorization and content loading", async () => {
    const lookup = { find: jest.fn() };
    const dependencies = {
      ...createDependencies(),
      getSpeechLookup: jest.fn().mockReturnValue(lookup),
      prepareAnswerAudio: jest.fn().mockResolvedValue({ clips: [{
        itemPosition: 0,
        url: "https://cdn.example/river.mp3",
        mediaType: "audio/mpeg",
        sourceLocale: "en-US",
      }] }),
    };
    const response = await createApkContentRoute(dependencies).GET(createRequest(
      "mode=vocabulary&locale=th&learningMode=answer-audio&cartridgeId=wizard-vs-zombie",
    ));

    expect(response.status).toBe(200);
    expect(dependencies.listContent.mock.invocationCallOrder[0]).toBeLessThan(
      dependencies.getSpeechLookup.mock.invocationCallOrder[0]!,
    );
    expect(dependencies.prepareAnswerAudio).toHaveBeenCalledWith(
      expect.objectContaining({ lookup }),
    );
  });

  it("passes request cancellation to speech preparation", async () => {
    const abort = new AbortController();
    const dependencies = {
      ...createDependencies(),
      speechLookup: { find: jest.fn() },
      prepareAnswerAudio: jest.fn().mockResolvedValue({ clips: [{
        itemPosition: 0,
        url: "https://cdn.example/river.mp3",
        mediaType: "audio/mpeg",
        sourceLocale: "en-US",
      }] }),
    };
    const request = createRequest(
      "mode=vocabulary&locale=th&learningMode=answer-audio&cartridgeId=wizard-vs-zombie",
    );
    Object.defineProperty(request, "signal", { value: abort.signal });
    await createApkContentRoute(dependencies).GET(request);

    expect(dependencies.prepareAnswerAudio).toHaveBeenCalledWith(
      expect.objectContaining({ signal: abort.signal }),
    );
  });

  it("rejects duplicate query fields before database access", async () => {
    const dependencies = createDependencies();
    const response = await createApkContentRoute(dependencies).GET(createRequest(
      "mode=vocabulary&mode=sentence&locale=th",
    ));

    expect(response.status).toBe(400);
    expect(dependencies.listContent).not.toHaveBeenCalled();
  });

  it("rejects malformed session cookie encoding before session lookup", async () => {
    const dependencies = createDependencies();
    const response = await createApkContentRoute(dependencies).GET(
      createRequest("mode=vocabulary&locale=th", "session_token=%E0%A4%A"),
    );

    expect(response.status).toBe(401);
    expect(dependencies.validateSession).not.toHaveBeenCalled();
  });

  it.each([
    "mode=vocabulary&locale=th&learningMode=listening&cartridgeId=wizard-vs-zombie",
    "mode=sentence&locale=th&learningMode=answer-audio&cartridgeId=wizard-vs-zombie",
    "mode=vocabulary&locale=th&learningMode=answer-audio&cartridgeId=castle-defense",
  ])("rejects unsupported listening selection %s", async (query) => {
    const dependencies = createDependencies();
    const response = await createApkContentRoute(dependencies).GET(createRequest(query));

    expect(response.status).toBe(400);
    expect(dependencies.listContent).not.toHaveBeenCalled();
  });

  it.each(["en", "cn", "tw", "vi"])(
    "reports listening unavailable for the non-pilot %s locale",
    async (locale) => {
      const dependencies = createDependencies();
      const response = await createApkContentRoute(dependencies).GET(createRequest(
        `mode=vocabulary&locale=${locale}&learningMode=answer-audio&cartridgeId=wizard-vs-zombie`,
      ));

      expect(response.status).toBe(503);
      expect(await response.json()).toMatchObject({
        error: { code: "LISTENING_UNAVAILABLE" },
      });
      expect(dependencies.listContent).not.toHaveBeenCalled();
    },
  );

  it("rejects requests without an authenticated student session", async () => {
    const dependencies = createDependencies();
    const { GET } = createApkContentRoute(dependencies);

    const response = await GET(createRequest("mode=vocabulary", ""));

    expect(response.status).toBe(401);
    expect(dependencies.listContent).not.toHaveBeenCalled();
  });

  it("rejects invalid query values before database access", async () => {
    const dependencies = createDependencies();
    const { GET } = createApkContentRoute(dependencies);

    const response = await GET(createRequest("mode=unknown&locale=xx&limit=999"));

    expect(response.status).toBe(400);
    expect(dependencies.listContent).not.toHaveBeenCalled();

    const unknownResponse = await GET(
      createRequest("mode=vocabulary&locale=th&schoolId=other-school"),
    );
    expect(unknownResponse.status).toBe(400);
    expect(dependencies.listContent).not.toHaveBeenCalled();
  });

  it("rejects non-student and school-less sessions", async () => {
    const teacherDependencies = createDependencies();
    teacherDependencies.validateSession.mockResolvedValue({
      user: { ...student, role: "TEACHER" },
    });
    const schoollessDependencies = createDependencies();
    schoollessDependencies.validateSession.mockResolvedValue({
      user: { ...student, schoolId: null },
    });

    expect(
      (await createApkContentRoute(teacherDependencies).GET(createRequest())).status,
    ).toBe(403);
    expect(
      (await createApkContentRoute(schoollessDependencies).GET(createRequest())).status,
    ).toBe(403);
  });
});
