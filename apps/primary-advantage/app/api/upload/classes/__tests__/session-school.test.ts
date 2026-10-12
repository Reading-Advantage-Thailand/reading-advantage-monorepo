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
  audit: vi.fn(),
}));

vi.mock("@reading-advantage/auth", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@reading-advantage/auth")>()),
  recordAuditEvent: mocks.audit,
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
// TenantDB then classifies users and classrooms as FLAT and enforces the
// session school on every insert, which is the behavior under test.
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

import { classrooms, users } from "@reading-advantage/db/schema";
import { POST } from "../route";

const SESSION_SCHOOL = "00000000-0000-0000-0000-00000000000a";
const SCHOOL_X = "00000000-0000-0000-0000-0000000000c1";
const STORED_ROW_SCHOOL = "00000000-0000-0000-0000-00000000000b";

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

function uploadRequest(name: string, fields: Record<string, string> = {}): NextRequest {
  const file = {
    name,
    size: 100,
    type: "text/csv",
    arrayBuffer: vi.fn().mockResolvedValue(new TextEncoder().encode("csv").buffer),
  };
  return { formData: vi.fn().mockResolvedValue({ get: (key: string) => (key === "file" ? file : (fields[key] ?? null)) }) } as unknown as NextRequest;
}

function recordingInserts(): Array<{ table: unknown; values: unknown[] }> {
  const writes: Array<{ table: unknown; values: unknown[] }> = [];
  mocks.insert.mockImplementation((table: unknown) => {
    const write = { table, values: [] as unknown[] };
    const chain: Record<string, unknown> = {};
    chain.values = vi.fn((values: unknown) => {
      write.values = Array.isArray(values) ? values : [values];
      return chain;
    });
    chain.onConflictDoNothing = vi.fn(() => chain);
    chain.returning = vi.fn(() => Promise.resolve([]));
    chain.then = (resolve: (value: unknown) => unknown) =>
      Promise.resolve(undefined).then(resolve);
    writes.push(write);
    return chain;
  });
  return writes;
}

describe("classes upload session school scoping", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // mockReset clears the mockReturnValueOnce queue (clearAllMocks alone
    // does not) so each test's queued select results stay isolated. Tests
    // re-install insert.mockImplementation() through recordingInserts.
    mocks.select.mockReset();
    mocks.insert.mockReset();
    mocks.existsSync.mockReturnValue(true);
  });

  it("stamps imported users with the session school when the stored row diverges", async () => {
    mocks.currentUser.mockResolvedValue({
      id: "teacher-1",
      role: "TEACHER",
      schoolId: SESSION_SCHOOL,
    });
    mocks.parse.mockReturnValue([
      {
        name: "Teacher Two",
        email: "teacher2@example.com",
        classroom_name: "Class A",
        role: "teacher",
      },
    ]);
    const results = [
      [{ id: "teacher-1", schoolId: STORED_ROW_SCHOOL }],
      [{ id: STORED_ROW_SCHOOL, name: "School B" }],
      [],
      [{ name: "Class A" }],
      [{ id: "role-teacher", name: "teacher" }],
      [{ id: "user-1", email: "teacher2@example.com" }],
      [{ id: "class-1", name: "Class A" }],
      [],
    ];
    for (const rows of results) mocks.select.mockReturnValueOnce(selectResult(rows));

    const writes = recordingInserts();

    const response = await POST(uploadRequest("teachers.csv"));

    expect(response.status).toBe(200);
    const userWrite = writes.find((write) => write.table === users);
    expect(userWrite).toBeDefined();
    expect(userWrite!.values[0]).toMatchObject({
      schoolId: SESSION_SCHOOL,
      email: "teacher2@example.com",
    });
  });

  it("stamps created classrooms with the session school when the stored row diverges", async () => {
    mocks.currentUser.mockResolvedValue({
      id: "admin-1",
      role: "ADMIN",
      schoolId: SESSION_SCHOOL,
    });
    mocks.parse.mockReturnValue([{ classroom_name: "Class A" }]);
    const results = [
      [{ id: "admin-1", schoolId: STORED_ROW_SCHOOL }],
      [{ id: STORED_ROW_SCHOOL, name: "School B" }],
      [],
    ];
    for (const rows of results) mocks.select.mockReturnValueOnce(selectResult(rows));

    const writes = recordingInserts();

    const response = await POST(uploadRequest("classes.csv"));

    expect(response.status).toBe(200);
    const classroomWrite = writes.find((write) => write.table === classrooms);
    expect(classroomWrite).toBeDefined();
    expect(classroomWrite!.values[0]).toMatchObject({
      schoolId: SESSION_SCHOOL,
      teacherId: "admin-1",
      createdBy: "admin-1",
    });
    expect(classroomWrite!.values[0]).toMatchObject({
      classCode: expect.any(String),
    });
  });

  it("keeps the 400 rejection when the session has no school context", async () => {
    mocks.currentUser.mockResolvedValue({ id: "teacher-1", role: "TEACHER" });
    mocks.select.mockReturnValueOnce(selectResult([{ id: "teacher-1", schoolId: null }]));

    const response = await POST(uploadRequest("teachers.csv"));

    expect(response.status).toBe(400);
    expect((await response.json()).error).toBe("School association required");
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it("stamps school X on users of a SYSTEM import and names X in the result", async () => {
    mocks.currentUser.mockResolvedValue({ id: "sys-1", role: "SYSTEM", schoolId: null });
    mocks.parse.mockReturnValue([
      { name: "Teacher Two", email: "teacher2@example.com", classroom_name: "Class A", role: "teacher" },
    ]);
    const results = [
      [{ id: SCHOOL_X }],
      [{ id: "sys-1", schoolId: null }],
      [{ id: SCHOOL_X, name: "School X" }],
      [],
      [{ name: "Class A" }],
      [{ id: "role-teacher", name: "teacher" }],
      [{ id: "user-1", email: "teacher2@example.com" }],
      [{ id: "class-1", name: "Class A" }],
      [],
    ];
    for (const rows of results) mocks.select.mockReturnValueOnce(selectResult(rows));
    const writes = recordingInserts();

    const response = await POST(uploadRequest("teachers.csv", { schoolId: SCHOOL_X }));

    expect(response.status).toBe(200);
    expect((await response.json()).schoolInfo).toMatchObject({ id: SCHOOL_X, name: "School X" });
    expect(writes.find((w) => w.table === users)!.values[0]).toMatchObject({ schoolId: SCHOOL_X });
    expect(mocks.audit).toHaveBeenCalledWith(
      expect.objectContaining({ actorUserId: "sys-1", actorRole: "SYSTEM" }),
      expect.objectContaining({ action: "import:system", targetType: "school", targetId: SCHOOL_X }),
    );
  });

  it("stamps school X on the classes of a SYSTEM import", async () => {
    mocks.currentUser.mockResolvedValue({ id: "sys-1", role: "SYSTEM", schoolId: null });
    mocks.parse.mockReturnValue([{ classroom_name: "Class A" }]);
    const results = [
      [{ id: SCHOOL_X }],
      [{ id: "sys-1", schoolId: null }],
      [{ id: SCHOOL_X, name: "School X" }],
      [],
    ];
    for (const rows of results) mocks.select.mockReturnValueOnce(selectResult(rows));
    const writes = recordingInserts();

    const response = await POST(uploadRequest("classes.csv", { schoolId: SCHOOL_X }));

    expect(response.status).toBe(200);
    expect(writes.find((w) => w.table === classrooms)!.values[0]).toMatchObject({
      schoolId: SCHOOL_X,
      createdBy: "sys-1",
    });
    expect(mocks.audit).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["no schoolId", {}, []],
    ["a value that is not a UUID", { schoolId: "not-a-uuid" }, []],
    ["an unknown school", { schoolId: SCHOOL_X }, [[]]],
  ])("refuses a SYSTEM upload with %s: 400, no write, no audit", async (_label, fields, selects) => {
    mocks.currentUser.mockResolvedValue({ id: "sys-1", role: "SYSTEM", schoolId: null });
    for (const rows of selects as unknown[][]) mocks.select.mockReturnValueOnce(selectResult(rows));

    const response = await POST(uploadRequest("classes.csv", fields));

    expect(response.status).toBe(400);
    expect(mocks.insert).not.toHaveBeenCalled();
    expect(mocks.writeFile).not.toHaveBeenCalled();
    expect(mocks.audit).not.toHaveBeenCalled();
  });

  it("ignores the schoolId form value of a school ADMIN", async () => {
    mocks.currentUser.mockResolvedValue({ id: "admin-1", role: "ADMIN", schoolId: SESSION_SCHOOL });
    mocks.parse.mockReturnValue([{ classroom_name: "Class A" }]);
    const results = [
      [{ id: "admin-1", schoolId: SESSION_SCHOOL }],
      [{ id: SESSION_SCHOOL, name: "School A" }],
      [],
    ];
    for (const rows of results) mocks.select.mockReturnValueOnce(selectResult(rows));
    const writes = recordingInserts();

    const response = await POST(uploadRequest("classes.csv", { schoolId: SCHOOL_X }));

    expect(response.status).toBe(200);
    expect(writes.find((w) => w.table === classrooms)!.values[0]).toMatchObject({ schoolId: SESSION_SCHOOL });
    expect(mocks.audit).not.toHaveBeenCalled();
  });

  it("reads the session, not the stored row, for the school guard", async () => {
    mocks.currentUser.mockResolvedValue({ id: "teacher-1", role: "TEACHER", schoolId: null });
    mocks.select.mockReturnValueOnce(selectResult([{ id: "teacher-1", schoolId: STORED_ROW_SCHOOL }]));

    const response = await POST(uploadRequest("teachers.csv"));

    expect(response.status).toBe(400);
    expect((await response.json()).error).toBe("School association required");
    expect(mocks.insert).not.toHaveBeenCalled();
  });
});
