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

import { classrooms, classroomStudents, classroomTeachers, users } from "@reading-advantage/db/schema";
import { CsvUploadSummary } from "../schema";
import { POST } from "../route";

const SESSION_SCHOOL = "00000000-0000-0000-0000-00000000000a";

function selectResult(rows: unknown[]) {
  const chain = {
    from: vi.fn(),
    innerJoin: vi.fn(),
    where: vi.fn(),
    limit: vi.fn().mockResolvedValue(rows),
    then: (resolve: (value: unknown[]) => unknown) => Promise.resolve(rows).then(resolve),
  };
  chain.from.mockReturnValue(chain);
  chain.innerJoin.mockReturnValue(chain);
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

type Write = { table: unknown; values: Array<Record<string, unknown>>; onConflictDoNothing: boolean };

/** Records every insert. A users insert returns the ids it wrote; a classrooms insert returns class-1. */
function recordingInserts(): Write[] {
  const writes: Write[] = [];
  mocks.insert.mockImplementation((table: unknown) => {
    const write: Write = { table, values: [], onConflictDoNothing: false };
    const chain: Record<string, unknown> = {};
    chain.values = vi.fn((values: unknown) => {
      write.values = (Array.isArray(values) ? values : [values]) as Array<Record<string, unknown>>;
      return chain;
    });
    chain.onConflictDoNothing = vi.fn(() => {
      write.onConflictDoNothing = true;
      return chain;
    });
    chain.returning = vi.fn(() =>
      Promise.resolve(
        table === users
          ? write.values.map((v) => ({ id: v.id }))
          : table === classrooms
            ? [{ id: "class-1", name: "Class A", schoolId: SESSION_SCHOOL }]
            : [],
      ),
    );
    chain.then = (resolve: (value: unknown) => unknown) => Promise.resolve(undefined).then(resolve);
    writes.push(write);
    return chain;
  });
  return writes;
}

function queueSelects(results: unknown[][]) {
  for (const rows of results) mocks.select.mockReturnValueOnce(selectResult(rows));
}

const teacherSession = () => mocks.currentUser.mockResolvedValue({ id: "teacher-1", role: "TEACHER", schoolId: SESSION_SCHOOL });
const sessionRows = [[{ id: "teacher-1", schoolId: SESSION_SCHOOL }], [{ id: SESSION_SCHOOL, name: "School A" }]];

describe("CSV upload duplicates (students have no email)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // mockReset clears the mockReturnValueOnce queue (clearAllMocks alone
    // does not) so each test's queued select results stay isolated.
    mocks.select.mockReset();
    mocks.insert.mockReset();
    mocks.existsSync.mockReturnValue(true);
  });

  it("refuses an email column in students.csv", async () => {
    teacherSession();
    mocks.parse.mockReturnValue([{ name: "Ann Lee", email: "ann@example.com", role: "student", classroom_name: "Class A" }]);
    queueSelects(sessionRows);

    const response = await POST(uploadRequest("students.csv"));

    expect(response.status).toBe(400);
    expect((await response.json()).expectedFormat).toBe("name,role,classroom_name");
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it("stores students with no email and keeps one row per name in a class", async () => {
    teacherSession();
    mocks.parse.mockReturnValue([
      { name: "Ann Lee", role: "student", classroom_name: "Class A" },
      { name: " ann  LEE ", role: "student", classroom_name: "Class A" },
      { name: "Ann Lee", role: "student", classroom_name: "Class B" },
    ]);
    // session, roles, existing students in the classes, class A lookup, class B lookup
    queueSelects([...sessionRows, [{ id: "role-student", name: "student" }], [], [], []]);
    const writes = recordingInserts();

    const response = await POST(uploadRequest("students.csv"));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(CsvUploadSummary.parse(body)).toEqual({ inserted: 2, skippedDuplicate: 1, skippedExisting: 0 });
    const userWrite = writes.find((write) => write.table === users)!;
    expect(userWrite.values).toHaveLength(2);
    for (const row of userWrite.values) {
      expect(row).toMatchObject({ email: null, role: "STUDENT", schoolId: SESSION_SCHOOL });
      expect(row.username).toBe(row.id);
    }
    expect(JSON.stringify(userWrite.values)).not.toContain("@");
    const memberships = writes.filter((write) => write.table === classroomStudents).flatMap((write) => write.values);
    expect(memberships.map((m) => m.studentId).sort()).toEqual(userWrite.values.map((v) => v.id).sort());
  });

  it("skips a student whose name is already in the class", async () => {
    teacherSession();
    mocks.parse.mockReturnValue([{ name: "Ann Lee", role: "student", classroom_name: "Class A" }]);
    queueSelects([...sessionRows, [{ id: "role-student", name: "student" }], [{ name: "ANN  Lee", classroomName: "Class A" }]]);
    const writes = recordingInserts();

    const response = await POST(uploadRequest("students.csv"));

    expect(response.status).toBe(200);
    expect(CsvUploadSummary.parse(await response.json())).toEqual({ inserted: 0, skippedDuplicate: 0, skippedExisting: 1 });
    expect(writes.find((write) => write.table === users)).toBeUndefined();
  });

  it("keeps the first row for a teacher email repeated in one file", async () => {
    teacherSession();
    mocks.parse.mockReturnValue([
      { name: "First Teacher", email: "dup@example.com", role: "teacher", classroom_name: "Class A" },
      { name: "Second Teacher", email: "DUP@example.com", role: "teacher", classroom_name: "Class A" },
    ]);
    // session, roles, existing emails, class A lookup, existing teacher link
    queueSelects([...sessionRows, [{ id: "role-teacher", name: "teacher" }], [], [{ id: "class-1", name: "Class A" }], []]);
    const writes = recordingInserts();

    const response = await POST(uploadRequest("teachers.csv"));

    expect(response.status).toBe(200);
    expect(CsvUploadSummary.parse(await response.json())).toEqual({ inserted: 1, skippedDuplicate: 1, skippedExisting: 0 });
    const userWrite = writes.find((write) => write.table === users)!;
    expect(userWrite.values).toHaveLength(1);
    expect(userWrite.values[0]).toMatchObject({ name: "First Teacher", email: "dup@example.com", username: "dup@example.com" });
    expect(userWrite.onConflictDoNothing).toBe(true);
    const link = writes.find((write) => write.table === classroomTeachers)!;
    expect(link.values[0]).toMatchObject({ classroomId: "class-1", teacherId: userWrite.values[0]!.id });
  });

  it("skips a teacher whose email already exists", async () => {
    teacherSession();
    mocks.parse.mockReturnValue([{ name: "Existing Teacher", email: "existing@example.com", role: "teacher", classroom_name: "Class A" }]);
    queueSelects([...sessionRows, [{ id: "role-teacher", name: "teacher" }], [{ email: "existing@example.com" }]]);
    const writes = recordingInserts();

    const response = await POST(uploadRequest("teachers.csv"));

    expect(response.status).toBe(200);
    expect(CsvUploadSummary.parse(await response.json())).toEqual({ inserted: 0, skippedDuplicate: 0, skippedExisting: 1 });
    expect(writes.find((write) => write.table === users)).toBeUndefined();
  });
});
