import { createApkCompletionRoute } from "./completion-route";

const validPayload = {
  gameType: "astral-mage",
  difficulty: "medium",
  score: 420,
  accuracy: 0.8,
  correctAnswers: 8,
  totalAttempts: 10,
  duration: 12_345,
  victory: true,
  idempotencyKey: "11111111-1111-4111-8111-111111111111",
  clientTimestamp: 1_700_000_000_000,
};

const student = {
  id: "student-1",
  username: "student",
  name: "Student",
  role: "STUDENT" as const,
  schoolId: "school-1",
  xp: 0,
  level: 1,
  cefrLevel: "A1",
};

function createRequest(
  body: unknown = validPayload,
  options: {
    origin?: string | null;
    cookie?: string | null;
    invalidJson?: boolean;
  } = {},
): Request {
  const headers = new Headers();
  const origin = options.origin === undefined ? "https://games.example" : options.origin;
  const cookie = options.cookie === undefined ? "session_token=opaque-token" : options.cookie;
  if (origin !== null) headers.set("origin", origin);
  if (cookie !== null) headers.set("cookie", cookie);

  return {
    url: "https://games.example/api/v1/apk/complete",
    headers,
    json: options.invalidJson
      ? jest.fn().mockRejectedValue(new SyntaxError("Invalid JSON"))
      : jest.fn().mockResolvedValue(body),
  } as unknown as Request;
}

function createDependencies() {
  return {
    sessionCookieName: "session_token",
    validateSession: jest.fn().mockResolvedValue({ user: student }),
    createTenantDb: jest.fn().mockReturnValue({ kind: "tenant-db" }),
    recordCompletion: jest.fn().mockResolvedValue({
      xpEarned: 9,
      activityId: `game:astral-mage:${validPayload.idempotencyKey}`,
      duplicate: false,
      status: 200 as const,
    }),
  };
}

describe("authenticated APK completion route", () => {
  it("uses the shared cookie session, authenticated school, TenantDB, and domain command", async () => {
    const dependencies = createDependencies();
    const response = await createApkCompletionRoute(dependencies).POST(
      createRequest(),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      xpEarned: 9,
      activityId: `game:astral-mage:${validPayload.idempotencyKey}`,
      duplicate: false,
      status: 200,
    });
    expect(dependencies.validateSession).toHaveBeenCalledWith("opaque-token");
    expect(dependencies.createTenantDb).toHaveBeenCalledWith("school-1");
    expect(dependencies.recordCompletion).toHaveBeenCalledWith({
      db: { kind: "tenant-db" },
      user: student,
      tenant: { schoolId: "school-1" },
      input: validPayload,
    });
  });

  it("returns an explicit successful duplicate without changing it", async () => {
    const dependencies = createDependencies();
    dependencies.recordCompletion.mockResolvedValue({
      xpEarned: 0,
      activityId: `game:astral-mage:${validPayload.idempotencyKey}`,
      duplicate: true,
      status: 200,
    });

    const response = await createApkCompletionRoute(dependencies).POST(
      createRequest(),
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      xpEarned: 0,
      duplicate: true,
      status: 200,
    });
  });

  it.each([
    ["xp", { xp: 999_999 }],
    ["identity", { userId: "attacker" }],
    ["tenant", { schoolId: "other-school" }],
    ["unknown field", { surprise: true }],
  ])("rejects client-supplied %s before persistence", async (_label, extra) => {
    const dependencies = createDependencies();
    const response = await createApkCompletionRoute(dependencies).POST(
      createRequest({ ...validPayload, ...extra }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "INVALID_PAYLOAD" },
      status: 400,
    });
    expect(dependencies.recordCompletion).not.toHaveBeenCalled();
  });

  it.each([
    ["xp", { xp: 999_999 }],
    ["identity", { identity: { userId: "attacker" } }],
    ["tenant", { tenant: { schoolId: "other-school" } }],
  ])("rejects %s hidden inside metadata", async (_label, metadata) => {
    const dependencies = createDependencies();
    const response = await createApkCompletionRoute(dependencies).POST(
      createRequest({ ...validPayload, metadata }),
    );

    expect(response.status).toBe(400);
    expect(dependencies.recordCompletion).not.toHaveBeenCalled();
  });

  it("rejects malformed JSON with a structured 400", async () => {
    const dependencies = createDependencies();
    const response = await createApkCompletionRoute(dependencies).POST(
      createRequest(undefined, { invalidJson: true }),
    );
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: { code: "INVALID_JSON", message: "Request body must be valid JSON" },
      status: 400,
    });
    expect(dependencies.recordCompletion).not.toHaveBeenCalled();
  });

  it.each([null, "", "null"])(
    "rejects a missing or invalid origin (%s) before authentication",
    async (origin) => {
      const dependencies = createDependencies();
      const response = await createApkCompletionRoute(dependencies).POST(
        createRequest(validPayload, { origin }),
      );
      expect(response.status).toBe(403);
      await expect(response.json()).resolves.toMatchObject({
        error: { code: "ORIGIN_FORBIDDEN" },
        status: 403,
      });
      expect(dependencies.validateSession).not.toHaveBeenCalled();
      expect(dependencies.recordCompletion).not.toHaveBeenCalled();
    },
  );

  it("rejects a cross-origin request before authentication", async () => {
    const dependencies = createDependencies();
    const response = await createApkCompletionRoute(dependencies).POST(
      createRequest(validPayload, { origin: "https://evil.example" }),
    );
    expect(response.status).toBe(403);
    expect(dependencies.validateSession).not.toHaveBeenCalled();
  });

  it("returns 401 for missing or invalid authentication", async () => {
    const missingDependencies = createDependencies();
    const missingResponse = await createApkCompletionRoute(
      missingDependencies,
    ).POST(createRequest(validPayload, { cookie: null }));
    expect(missingResponse.status).toBe(401);
    expect(missingDependencies.validateSession).not.toHaveBeenCalled();

    const invalidDependencies = createDependencies();
    invalidDependencies.validateSession.mockResolvedValue(null);
    const invalidResponse = await createApkCompletionRoute(
      invalidDependencies,
    ).POST(createRequest());
    expect(invalidResponse.status).toBe(401);
    expect(invalidDependencies.recordCompletion).not.toHaveBeenCalled();
  });

  it("returns 403 for a non-student or a student without a school", async () => {
    const teacherDependencies = createDependencies();
    teacherDependencies.validateSession.mockResolvedValue({
      user: { ...student, role: "TEACHER" },
    });
    const teacherResponse = await createApkCompletionRoute(
      teacherDependencies,
    ).POST(createRequest());
    expect(teacherResponse.status).toBe(403);

    const noSchoolDependencies = createDependencies();
    noSchoolDependencies.validateSession.mockResolvedValue({
      user: { ...student, schoolId: null },
    });
    const noSchoolResponse = await createApkCompletionRoute(
      noSchoolDependencies,
    ).POST(createRequest());
    expect(noSchoolResponse.status).toBe(403);
    expect(noSchoolDependencies.createTenantDb).not.toHaveBeenCalled();
    expect(noSchoolDependencies.recordCompletion).not.toHaveBeenCalled();
  });

  it("maps a domain authorization failure to 403", async () => {
    const dependencies = createDependencies();
    dependencies.recordCompletion.mockRejectedValue(
      Object.assign(new Error("permission denied"), { code: "FORBIDDEN" }),
    );
    const response = await createApkCompletionRoute(dependencies).POST(
      createRequest(),
    );
    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "FORBIDDEN" },
      status: 403,
    });
  });

  it("returns a generic structured 500 without leaking internals", async () => {
    const dependencies = createDependencies();
    dependencies.recordCompletion.mockRejectedValue(
      new Error("postgres password secret"),
    );
    const errorSpy = jest.spyOn(console, "error").mockImplementation();

    const response = await createApkCompletionRoute(dependencies).POST(
      createRequest(),
    );
    expect(response.status).toBe(500);
    expect(JSON.stringify(await response.json())).not.toContain("password secret");
    expect(errorSpy).toHaveBeenCalledWith(
      expect.objectContaining({ event: "apk_completion_failed" }),
    );
    expect(JSON.stringify(errorSpy.mock.calls)).not.toContain("password secret");
    errorSpy.mockRestore();
  });
});
