// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  currentUser: vi.fn(),
  select: vi.fn(),
  insert: vi.fn(),
  parse: vi.fn(),
  writeFile: vi.fn(),
  mkdir: vi.fn(),
  existsSync: vi.fn(() => true),
  unlink: vi.fn(),
  provision: vi.fn(),
}));

vi.mock("@/lib/session", () => ({ getCurrentUser: mocks.currentUser }));
vi.mock("csv/sync", () => ({ parse: mocks.parse }));
vi.mock("fs/promises", () => ({ writeFile: mocks.writeFile, mkdir: mocks.mkdir }));
// Keep the real fs module for transitive loaders (sales-knowledge reads its
// packaged evidence with readFileSync at import time) and override only the
// spies this suite asserts on.
vi.mock("fs", async (importOriginal) => ({
  ...(await importOriginal<typeof import("fs")>()),
  existsSync: mocks.existsSync,
  unlink: mocks.unlink,
}));
// The route reads its db handle from getTenantDB/getUnscopedDB in
// @reading-advantage/domain, which import the shared client from this
// barrel. The factory spreads the real schema so the tenant registry
// (which imports its tables from this barrel) and the route (which
// imports from the /schema submodule) share one table identity. The
// TenantDB then classifies users as FLAT and enforces the session school
// on the insert, which this suite relies on.
vi.mock("@reading-advantage/db", async () => {
  const schema = await import("@reading-advantage/db/schema");
  return {
    db: { select: mocks.select, insert: mocks.insert },
    ...schema,
    eq: vi.fn(() => ({})),
    and: vi.fn(() => ({})),
    inArray: vi.fn(() => ({})),
    or: vi.fn(() => ({})),
    ilike: vi.fn(() => ({})),
    gt: vi.fn(() => ({})),
    count: vi.fn(() => ({})),
  };
});

vi.mock("@reading-advantage/domain", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@reading-advantage/domain")>();
  return { ...actual, studentLogin: { ...actual.studentLogin, provisionStudentLogins: mocks.provision } };
});

import { classrooms, users } from "@reading-advantage/db/schema";
import { POST } from "../route";

const SESSION_SCHOOL = "00000000-0000-0000-0000-00000000000a";

function selectResult(rows: unknown[]) {
  const chain = {
    from: vi.fn(),
    where: vi.fn(),
    limit: vi.fn().mockResolvedValue(rows),
    then: (resolve: (value: unknown[]) => unknown) => Promise.resolve(rows).then(resolve),
  };
  chain.from.mockReturnValue(chain);
  chain.where.mockReturnValue(chain);
  return chain;
}

function uploadRequest(name: string): NextRequest {
  const file = {
    name,
    size: 100,
    type: "text/csv",
    arrayBuffer: vi.fn().mockResolvedValue(new TextEncoder().encode("csv").buffer),
  };
  return { formData: vi.fn().mockResolvedValue({ get: () => file }) } as unknown as NextRequest;
}

function recordingInserts(
  returningFor: (table: unknown) => unknown[],
): Array<{ table: unknown; values: unknown[]; onConflictDoNothing: boolean }> {
  const writes: Array<{ table: unknown; values: unknown[]; onConflictDoNothing: boolean }> = [];
  mocks.insert.mockImplementation((table: unknown) => {
    const write = { table, values: [] as unknown[], onConflictDoNothing: false };
    const chain: Record<string, unknown> = {};
    chain.values = vi.fn((values: unknown) => {
      write.values = Array.isArray(values) ? values : [values];
      return chain;
    });
    chain.onConflictDoNothing = vi.fn(() => {
      write.onConflictDoNothing = true;
      return chain;
    });
    chain.returning = vi.fn(() => Promise.resolve(returningFor(table)));
    chain.then = (resolve: (value: unknown) => unknown) =>
      Promise.resolve(undefined).then(resolve);
    writes.push(write);
    return chain;
  });
  return writes;
}

describe("CSV upload student login generation (FR-6)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.select.mockReset();
    mocks.insert.mockReset();
    mocks.existsSync.mockReturnValue(true);
  });

  it("generates usernames and passwords for the students created in the upload", async () => {
    mocks.currentUser.mockResolvedValue({ id: "teacher-1", role: "TEACHER", schoolId: SESSION_SCHOOL });
    mocks.parse.mockReturnValue([
      { name: "Ann Lee", email: "ann@example.com", role: "student", classroom_name: "P3A" },
    ]);
    const results = [
      [{ id: "teacher-1", schoolId: SESSION_SCHOOL }],
      [{ id: SESSION_SCHOOL, name: "School A" }],
      [{ id: "role-student", name: "student" }],
      [],
      [],
    ];
    for (const rows of results) mocks.select.mockReturnValueOnce(selectResult(rows));
    recordingInserts((table) =>
      table === users
        ? [{ id: "user-1", email: "ann@example.com" }]
        : table === classrooms
          ? [{ id: "class-1", name: "P3A", schoolId: SESSION_SCHOOL }]
          : [],
    );
    mocks.provision.mockResolvedValue({ provisioned: [{ userId: "user-1", username: "bluetiger47", initialPassword: "abcd2345" }], failed: [] });

    const response = await POST(uploadRequest("students.csv"));

    expect(response.status).toBe(200);
    expect(mocks.provision).toHaveBeenCalledWith(
      expect.objectContaining({
        schoolId: SESSION_SCHOOL,
        students: [{ userId: "user-1", classroomName: "P3A", classroomId: "class-1" }],
      }),
    );
    expect((await response.json()).studentLogins).toEqual([
      { name: "Ann Lee", classroomName: "P3A", username: "bluetiger47", initialPassword: "abcd2345" },
    ]);
  });

  it("reports the students whose login could not be stored", async () => {
    mocks.currentUser.mockResolvedValue({ id: "teacher-1", role: "TEACHER", schoolId: SESSION_SCHOOL });
    mocks.parse.mockReturnValue([
      { name: "Ann Lee", email: "ann@example.com", role: "student", classroom_name: "P3A" },
    ]);
    for (const rows of [[{ id: "teacher-1", schoolId: SESSION_SCHOOL }], [{ id: SESSION_SCHOOL, name: "School A" }], [{ id: "role-student", name: "student" }], [], []]) {
      mocks.select.mockReturnValueOnce(selectResult(rows));
    }
    recordingInserts((table) =>
      table === users ? [{ id: "user-1", email: "ann@example.com" }] : table === classrooms ? [{ id: "class-1", name: "P3A", schoolId: SESSION_SCHOOL }] : [],
    );
    mocks.provision.mockResolvedValue({ provisioned: [], failed: [{ userId: "user-1", reason: "db down" }] });
    const body = await (await POST(uploadRequest("students.csv"))).json();
    expect(body.studentLoginsFailed).toBe(1);
    expect(body.studentLoginsFailedNames).toEqual(["Ann Lee"]);
  });

  it("still finishes the upload when login generation fails", async () => {
    mocks.currentUser.mockResolvedValue({ id: "teacher-1", role: "TEACHER", schoolId: SESSION_SCHOOL });
    mocks.parse.mockReturnValue([
      { name: "Ann Lee", email: "ann@example.com", role: "student", classroom_name: "P3A" },
    ]);
    for (const rows of [[{ id: "teacher-1", schoolId: SESSION_SCHOOL }], [{ id: SESSION_SCHOOL, name: "School A" }], [{ id: "role-student", name: "student" }], [], []]) {
      mocks.select.mockReturnValueOnce(selectResult(rows));
    }
    recordingInserts((table) =>
      table === users ? [{ id: "user-1", email: "ann@example.com" }] : table === classrooms ? [{ id: "class-1", name: "P3A", schoolId: SESSION_SCHOOL }] : [],
    );
    mocks.provision.mockRejectedValue(new Error("boom"));
    const response = await POST(uploadRequest("students.csv"));
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    const body = await response.json();
    expect(body.studentLogins).toEqual([]);
    expect(body.studentLoginsFailed).toBe(1);
    expect(body.studentLoginsFailedNames).toEqual(["Ann Lee"]);
  });
});
