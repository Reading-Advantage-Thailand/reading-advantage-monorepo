// @vitest-environment node
/**
 * Adversarial tests for the class session lifetime at the handler boundary.
 * Track: primary_class_session_lifetime_20261111, Phase 1. Scope: the enum bypass, the extra
 * keys of a body, and the status of every refused body. These tests read production code only.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const getCurrentSession = vi.hoisted(() => vi.fn());
const domain = vi.hoisted(() => ({
  startClassSession: vi.fn(),
}));

vi.mock("@reading-advantage/db", async (orig) => ({ ...(await orig<typeof import("@reading-advantage/db")>()), db: {} }));
vi.mock("@/lib/session", () => ({ getCurrentSession }));
vi.mock("@reading-advantage/api/routes/auth", () => ({ getClientIp: () => "1.2.3.4" }));
vi.mock("@reading-advantage/auth", async (orig) => ({
  ...(await orig<typeof import("@reading-advantage/auth")>()),
  createPostgresRateLimitStore: () => ({}),
}));
vi.mock("@reading-advantage/domain", async (orig) => {
  const actual = await orig<typeof import("@reading-advantage/domain")>();
  return { ...actual, studentLogin: { ...actual.studentLogin, ...domain } };
});

import { startClass } from "../student-login/handlers";

const CLASS_ID = "11111111-1111-4111-8111-111111111111";
const SESSION_ID = "33333333-3333-4333-8333-333333333333";
const teacherSession = { authStrength: "full", user: { id: "t1", role: "TEACHER", schoolId: "s1" } };
const startResult = { sessionId: SESSION_ID, code: "ABCDEF", expiresAt: "2026-11-18T05:00:00.000Z" };

/** Builds a JSON request with the given body. */
const post = (body: unknown) =>
  new NextRequest("http://localhost/x", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });

/** Builds a request with a raw body, so a broken body can be sent as text. */
const postRaw = (body: string) =>
  new NextRequest("http://localhost/x", {
    method: "POST",
    body,
    headers: { "content-type": "application/json" },
  });

/**
 * The values a body may not carry as a lifetime: near misses of the three choices, numbers that
 * name a duration, the shapes a JSON body can hold, and the prototype keys of a plain object.
 */
const REFUSED_BODIES: unknown[] = [
  "7D", "7d ", " 7d", "until_17 ", "UNTIL_17", "168h", "30d", "1d", "3H", "",
  604800000, 10_800_000, 7, 0, -1, true, false, null,
  ["7d"], [], { value: "7d" }, {},
  "constructor", "toString", "valueOf", "hasOwnProperty", "__proto__",
];

/** The three values a body may carry. */
const ALLOWED_BODIES = ["3h", "until_17", "7d"] as const;

beforeEach(() => {
  vi.clearAllMocks();
  getCurrentSession.mockResolvedValue(teacherSession);
  domain.startClassSession.mockResolvedValue(startResult);
});

/** Reads the input that the handler gave to the domain. */
function domainInput(): Record<string, unknown> {
  expect(domain.startClassSession).toHaveBeenCalledTimes(1);
  const call = domain.startClassSession.mock.calls[0]![0] as { input: Record<string, unknown> };
  return call.input;
}

describe("class session lifetime handler: the enum bypass", () => {
  it("covers the refused body rows", () => {
    expect(REFUSED_BODIES).toHaveLength(27);
  });

  it.each(REFUSED_BODIES.map((value, index) => [value, index] as const))(
    "answers 400 and skips the domain for the body value %j (row %i)",
    async (lifetime, _index) => {
      const res = await startClass(post({ classroomId: CLASS_ID, lifetime }));
      expect(res.status).toBe(400);
      expect(domain.startClassSession).not.toHaveBeenCalled();
    },
  );

  it("answers 400 and skips the domain for a body that carries a prototype key", async () => {
    const body = JSON.parse(
      `{"classroomId":"${CLASS_ID}","lifetime":"__proto__","constructor":"7d","expiresAt":"2026-12-01T00:00:00.000Z"}`,
    );
    const res = await startClass(post(body));
    expect(res.status).toBe(400);
    expect(domain.startClassSession).not.toHaveBeenCalled();
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });

  it("answers 400 and skips the domain for a broken body", async () => {
    const res = await startClass(postRaw("{not json"));
    expect(res.status).toBe(400);
    expect(domain.startClassSession).not.toHaveBeenCalled();
  });

  it("answers 400 and skips the domain for a body that is an array", async () => {
    const res = await startClass(post([{ classroomId: CLASS_ID, lifetime: "7d" }]));
    expect(res.status).toBe(400);
    expect(domain.startClassSession).not.toHaveBeenCalled();
  });

  it("answers 400 and skips the domain for a body with no class id", async () => {
    const res = await startClass(post({ lifetime: "7d" }));
    expect(res.status).toBe(400);
    expect(domain.startClassSession).not.toHaveBeenCalled();
  });

  it("answers a plain 400 without a code for every refused body", async () => {
    expect(REFUSED_BODIES).toHaveLength(27);
    for (const lifetime of REFUSED_BODIES) {
      domain.startClassSession.mockClear();
      const res = await startClass(post({ classroomId: CLASS_ID, lifetime }));
      expect(res.status, JSON.stringify(lifetime)).toBe(400);
      const body = (await res.json()) as { code?: string };
      expect(body.code, JSON.stringify(lifetime)).toBeUndefined();
      expect(domain.startClassSession).not.toHaveBeenCalled();
    }
  });
});

describe("class session lifetime handler: the accepted bodies", () => {
  it("covers the three accepted bodies", () => {
    expect(ALLOWED_BODIES).toHaveLength(3);
  });

  it.each(ALLOWED_BODIES.map((value, index) => [value, index] as const))(
    "gives the domain the lifetime %s (row %i)",
    async (lifetime, _index) => {
      const res = await startClass(post({ classroomId: CLASS_ID, lifetime }));
      expect(res.status).toBe(200);
      expect(domainInput()).toEqual({ classroomId: CLASS_ID, lifetime });
    },
  );

  it("gives the domain the default 3 hours when the body has no lifetime", async () => {
    const res = await startClass(post({ classroomId: CLASS_ID }));
    expect(res.status).toBe(200);
    expect(domainInput()).toEqual({ classroomId: CLASS_ID, lifetime: "3h" });
  });

  it("keeps a client time field out of the domain input", async () => {
    const res = await startClass(
      post({
        classroomId: CLASS_ID,
        lifetime: "7d",
        expiresAt: "2026-12-01T00:00:00.000Z",
        durationMs: 604800000,
        minutes: 10_080,
      }),
    );
    expect(res.status).toBe(200);
    const input = domainInput();
    expect(Object.keys(input).sort()).toEqual(["classroomId", "lifetime"]);
    expect(input).not.toHaveProperty("expiresAt");
    expect(input).not.toHaveProperty("durationMs");
    expect(input).not.toHaveProperty("minutes");
  });

  it("keeps the last lifetime of a body that names it twice inside the choice list", async () => {
    const body = JSON.parse(
      `{"classroomId":"${CLASS_ID}","lifetime":"3h","lifetime":"7d"}`,
    );
    const res = await startClass(post(body));
    expect(res.status).toBe(200);
    const input = domainInput();
    expect(Object.keys(input).sort()).toEqual(["classroomId", "lifetime"]);
    expect(["3h", "until_17", "7d"]).toContain(input.lifetime);
  });

  it("answers 400 with the invalid_input code when the domain refuses the choice", async () => {
    const { studentLogin } = await import("@reading-advantage/domain");
    domain.startClassSession.mockRejectedValue(new studentLogin.StudentLoginError("invalid_input", "Choose another time."));
    const res = await startClass(post({ classroomId: CLASS_ID, lifetime: "until_17" }));
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe("invalid_input");
  });

  it("answers 500 when the domain throws an error that is not a student login error", async () => {
    domain.startClassSession.mockRejectedValue(new Error("plain"));
    const res = await startClass(post({ classroomId: CLASS_ID, lifetime: "until_17" }));
    expect(res.status).toBe(500);
    expect(await res.text()).not.toContain("plain");
  });
});

describe("class session lifetime handler: the session gate", () => {
  it("answers 401 without a session for every lifetime", async () => {
    getCurrentSession.mockResolvedValue(null);
    for (const lifetime of ALLOWED_BODIES) {
      const res = await startClass(post({ classroomId: CLASS_ID, lifetime }));
      expect(res.status, lifetime).toBe(401);
    }
    expect(domain.startClassSession).not.toHaveBeenCalled();
  });

  it("answers 403 for a session that is not full for every lifetime", async () => {
    getCurrentSession.mockResolvedValue({ ...teacherSession, authStrength: "code_only" });
    for (const lifetime of ALLOWED_BODIES) {
      const res = await startClass(post({ classroomId: CLASS_ID, lifetime }));
      expect(res.status, lifetime).toBe(403);
    }
    expect(domain.startClassSession).not.toHaveBeenCalled();
  });
});
