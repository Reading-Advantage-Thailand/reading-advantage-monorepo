// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const limit = vi.fn();
  const where = vi.fn(() => ({ limit }));
  const from = vi.fn(() => ({ where }));
  const select = vi.fn(() => ({ from }));
  return {
    capture: vi.fn(),
    acquire: vi.fn(),
    release: vi.fn(),
    clone: vi.fn(),
    read: vi.fn(),
    status: vi.fn(),
    eq: vi.fn((column: unknown, value: unknown) => ({ column, value })),
    db: { select },
    select,
    from,
    where,
    limit,
    users: { id: "users.id", githubUsername: "users.githubUsername" },
  };
});

vi.mock("@/lib/tutorial-repository-capture", () => ({ captureRegisteredTutorialRepository: mocks.capture }));
vi.mock("@/lib/node-tutorial-repository-capture", () => ({ cloneTutorialRepository: mocks.clone, readTutorialFixtureFile: mocks.read, tutorialFixtureGitStatus: mocks.status }));
vi.mock("@/lib/tutorial-capture-lease", () => ({ acquireTutorialCaptureLease: mocks.acquire }));
vi.mock("@reading-advantage/db", () => ({ db: mocks.db, users: mocks.users }));
vi.mock("drizzle-orm", () => ({ eq: mocks.eq }));

import { POST, runtime } from "./route";

const token = "capture-service-token";
let originalToken: string | undefined;
let originalBase: string | undefined;
let learnerCounter = 0;

/** Builds an authorized capture request for a unique learner so the module-level limiter does not carry state. */
function authorized(body: unknown, learnerId = `learner-${++learnerCounter}`): Request {
  return new Request("http://localhost/api/internal/tutorial-repository-capture", {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ learnerId, ...(body as object) }),
  });
}

describe("POST /api/internal/tutorial-repository-capture", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    originalToken = process.env.TUTORIAL_REPOSITORY_WORKER_TOKEN;
    originalBase = process.env.TUTORIAL_REPOSITORY_BASE_URL;
    process.env.TUTORIAL_REPOSITORY_WORKER_TOKEN = token;
    process.env.TUTORIAL_REPOSITORY_BASE_URL = "https://git.example";
    mocks.release.mockResolvedValue(undefined);
    mocks.acquire.mockResolvedValue({ release: mocks.release });
    mocks.capture.mockResolvedValue({ files: { "a.ts": "a" }, gitStatus: "", capturedAt: "2026-07-11T00:00:00.000Z" });
  });

  afterEach(() => {
    if (originalToken === undefined) delete process.env.TUTORIAL_REPOSITORY_WORKER_TOKEN;
    else process.env.TUTORIAL_REPOSITORY_WORKER_TOKEN = originalToken;
    if (originalBase === undefined) delete process.env.TUTORIAL_REPOSITORY_BASE_URL;
    else process.env.TUTORIAL_REPOSITORY_BASE_URL = originalBase;
  });

  it("runs on the Node runtime", () => {
    expect(runtime).toBe("nodejs");
  });

  it("rejects a missing bearer prefix without touching the lease", async () => {
    const response = await POST(new Request("http://localhost/x", { method: "POST", headers: { authorization: token } }));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
    expect(mocks.acquire).not.toHaveBeenCalled();
  });

  it("captures with server ports, returns the result, and releases the lease", async () => {
    const response = await POST(authorized({ sessionId: "s" }, "learner-ok"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ files: { "a.ts": "a" }, gitStatus: "", capturedAt: "2026-07-11T00:00:00.000Z" });
    expect(mocks.acquire).toHaveBeenCalledWith(mocks.db, "learner-ok");
    const [body, ports] = mocks.capture.mock.calls[0];
    expect(body).toEqual({ learnerId: "learner-ok", sessionId: "s" });
    expect(ports.clone).toBe(mocks.clone);
    expect(ports.readFixtureFile).toBe(mocks.read);
    expect(ports.gitStatus).toBe(mocks.status);
    expect(ports.repositoryBaseUrl).toBe("https://git.example");
    expect(Number.isNaN(Date.parse(ports.now()))).toBe(false);
    expect(mocks.release).toHaveBeenCalledTimes(1);
  });

  it("resolves the GitHub username from the users table by learner id", async () => {
    mocks.limit.mockResolvedValueOnce([{ githubUsername: "octo" }]).mockResolvedValueOnce([]);
    await POST(authorized({}, "learner-db"));
    const ports = mocks.capture.mock.calls[0][1];

    await expect(ports.getGithubUsername("learner-db")).resolves.toBe("octo");
    await expect(ports.getGithubUsername("missing")).resolves.toBeNull();
    expect(mocks.select).toHaveBeenCalledWith({ githubUsername: mocks.users.githubUsername });
    expect(mocks.eq).toHaveBeenCalledWith(mocks.users.id, "learner-db");
    expect(mocks.limit).toHaveBeenCalledWith(1);
  });

  it("returns 429 and skips capture when the fleet lease is not granted", async () => {
    mocks.acquire.mockResolvedValue(null);

    const response = await POST(authorized({}));

    expect(response.status).toBe(429);
    await expect(response.json()).resolves.toEqual({ error: "Tutorial capture worker is busy or rate limited" });
    expect(mocks.capture).not.toHaveBeenCalled();
  });

  it("returns 400 with the error message and still releases the lease when capture fails", async () => {
    mocks.capture.mockRejectedValue(new Error("Tutorial capture allowlist mismatch"));

    const response = await POST(authorized({}));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Tutorial capture allowlist mismatch" });
    expect(mocks.release).toHaveBeenCalledTimes(1);
  });

  it("returns a generic 400 message for a non-Error rejection", async () => {
    mocks.capture.mockRejectedValue("boom");

    const response = await POST(authorized({}));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Capture failed" });
  });

  it("uses the shared 'invalid' lease key when the body has no string learnerId", async () => {
    await POST(new Request("http://localhost/x", { method: "POST", headers: { authorization: `Bearer ${token}` }, body: JSON.stringify(["learner-x"]) }));
    await POST(new Request("http://localhost/x", { method: "POST", headers: { authorization: `Bearer ${token}` }, body: JSON.stringify({ learnerId: 42 }) }));
    await POST(new Request("http://localhost/x", { method: "POST", headers: { authorization: `Bearer ${token}` }, body: "null" }));

    expect(mocks.acquire.mock.calls.map((call) => call[1])).toEqual(["invalid", "invalid", "invalid"]);
  });

  it("returns 400 for a malformed JSON body before any lease is taken", async () => {
    const response = await POST(new Request("http://localhost/x", { method: "POST", headers: { authorization: `Bearer ${token}` }, body: "{" }));

    expect(response.status).toBe(400);
    expect(mocks.acquire).not.toHaveBeenCalled();
  });

  it("returns 429 when the process limiter refuses a second concurrent capture for one learner", async () => {
    let finish!: () => void;
    mocks.capture.mockImplementationOnce(() => new Promise((resolve) => { finish = () => resolve({ ok: true }); }));

    const first = POST(authorized({}, "learner-busy"));
    await vi.waitFor(() => expect(mocks.capture).toHaveBeenCalledTimes(1));
    const second = await POST(authorized({}, "learner-busy"));

    expect(second.status).toBe(429);
    await expect(second.json()).resolves.toEqual({ error: "A tutorial capture is already running for this learner" });
    expect(mocks.release).toHaveBeenCalledTimes(1);
    finish();
    await expect(first).resolves.toMatchObject({ status: 200 });
    expect(mocks.release).toHaveBeenCalledTimes(2);
  });
});
