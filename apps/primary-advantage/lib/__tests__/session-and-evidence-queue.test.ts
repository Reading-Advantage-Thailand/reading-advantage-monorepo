// @vitest-environment node
/** The session cookie reader and the evidence job enqueue: absent cookies, roles, and queue failures. */
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  cookieGet: vi.fn(),
  validateSession: vi.fn(),
  enqueuePrimaryEvidence: vi.fn(),
  createPort: vi.fn(() => ({ port: true })),
  createSql: vi.fn(() => ({ sql: true })),
  logError: vi.fn(),
}));

vi.mock("next/headers", () => ({ cookies: async () => ({ get: mocks.cookieGet }) }));
vi.mock("@reading-advantage/db", () => ({ db: { tag: "db" } }));
vi.mock("@reading-advantage/auth", () => ({ validateSession: mocks.validateSession, SESSION_COOKIE_NAME: "ra_session" }));
vi.mock("@reading-advantage/backend/jobs/adapters/postgres", () => ({ createDurableJobQueuePort: mocks.createPort }));
vi.mock("@reading-advantage/domain/primary-mastery", () => ({ enqueuePrimaryEvidence: mocks.enqueuePrimaryEvidence }));
vi.mock("@/lib/primary-evidence-sql", () => ({ createPrimaryEvidenceSql: mocks.createSql }));
vi.mock("@/lib/observability/logger", () => ({ logger: { error: mocks.logError } }));

import { currentRole, currentUser, getCurrentSession, getCurrentUser } from "../session";
import { enqueuePrimaryEvidenceJob } from "../primary-evidence-queue";

const PAYLOAD = { sourceTable: "user_activity", rowId: "row-1" } as const;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("session", () => {
  it("returns null without a session cookie and never validates", async () => {
    mocks.cookieGet.mockReturnValue(undefined);
    expect(await getCurrentSession()).toBeNull();
    expect(await getCurrentUser()).toBeNull();
    expect(await currentRole()).toBeNull();
    expect(mocks.validateSession).not.toHaveBeenCalled();
  });

  it("validates the session cookie token against the database", async () => {
    mocks.cookieGet.mockReturnValue({ value: "tok-1" });
    mocks.validateSession.mockResolvedValue({ user: { id: "u1", role: "TEACHER" }, authStrength: "password" });
    expect(await getCurrentSession()).toEqual({ user: { id: "u1", role: "TEACHER" }, authStrength: "password" });
    expect(mocks.cookieGet).toHaveBeenCalledWith("ra_session");
    expect(mocks.validateSession).toHaveBeenCalledWith({ tag: "db" }, "tok-1");
  });

  it("returns the user and role of a valid session", async () => {
    mocks.cookieGet.mockReturnValue({ value: "tok-1" });
    mocks.validateSession.mockResolvedValue({ user: { id: "u1", role: "STUDENT" } });
    expect(await currentUser()).toEqual({ id: "u1", role: "STUDENT" });
    expect(await currentRole()).toBe("STUDENT");
  });

  it("returns null for an invalid or expired token", async () => {
    mocks.cookieGet.mockReturnValue({ value: "old" });
    mocks.validateSession.mockResolvedValue(null);
    expect(await getCurrentUser()).toBeNull();
    expect(await currentRole()).toBeNull();
  });

  it("returns a null role when the user has none", async () => {
    mocks.cookieGet.mockReturnValue({ value: "tok-1" });
    mocks.validateSession.mockResolvedValue({ user: { id: "u1" } });
    expect(await currentRole()).toBeNull();
  });
});

describe("enqueuePrimaryEvidenceJob", () => {
  it("skips a user without a school and builds no queue", async () => {
    expect(await enqueuePrimaryEvidenceJob(PAYLOAD, null)).toBe(false);
    expect(await enqueuePrimaryEvidenceJob(PAYLOAD, undefined)).toBe(false);
    expect(mocks.enqueuePrimaryEvidence).not.toHaveBeenCalled();
    expect(mocks.createPort).not.toHaveBeenCalled();
  });

  it("enqueues in the school scope and builds the port once", async () => {
    mocks.enqueuePrimaryEvidence.mockResolvedValue({ outcome: "created" });
    expect(await enqueuePrimaryEvidenceJob(PAYLOAD, "school-1")).toBe(true);
    mocks.enqueuePrimaryEvidence.mockResolvedValue({ outcome: "refreshed" });
    expect(await enqueuePrimaryEvidenceJob(PAYLOAD, "school-1")).toBe(true);
    expect(mocks.enqueuePrimaryEvidence).toHaveBeenCalledWith({ port: { port: true }, payload: PAYLOAD, schoolId: "school-1" });
    expect(mocks.createPort).toHaveBeenCalledTimes(1);
    expect(mocks.createPort).toHaveBeenCalledWith({ sql: { sql: true } });
  });

  it("answers false on a conflict", async () => {
    mocks.enqueuePrimaryEvidence.mockResolvedValue({ outcome: "conflict" });
    expect(await enqueuePrimaryEvidenceJob(PAYLOAD, "school-1")).toBe(false);
  });

  it("logs a queue failure and answers false without a throw", async () => {
    mocks.enqueuePrimaryEvidence.mockRejectedValue(new Error("queue down"));
    expect(await enqueuePrimaryEvidenceJob(PAYLOAD, "school-1")).toBe(false);
    expect(mocks.logError).toHaveBeenCalledWith("primary.mastery.evidence.enqueue_failed", { sourceTable: "user_activity", rowId: "row-1", message: "queue down" });
  });

  it("logs a non-Error failure as text", async () => {
    mocks.enqueuePrimaryEvidence.mockRejectedValue("nope");
    expect(await enqueuePrimaryEvidenceJob(PAYLOAD, "school-1")).toBe(false);
    expect(mocks.logError).toHaveBeenCalledWith("primary.mastery.evidence.enqueue_failed", expect.objectContaining({ message: "nope" }));
  });
});
