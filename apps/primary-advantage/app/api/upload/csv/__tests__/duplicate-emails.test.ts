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

import { classrooms, classroomStudents, users } from "@reading-advantage/db/schema";
import { CsvUploadSummary } from "../schema";
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

describe("CSV upload duplicate email handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // mockReset clears the mockReturnValueOnce queue (clearAllMocks alone
    // does not) so each test's queued select results stay isolated. Tests
    // re-install insert.mockImplementation() through recordingInserts.
    mocks.select.mockReset();
    mocks.insert.mockReset();
    mocks.existsSync.mockReturnValue(true);
  });

  it("returns 200 and keeps only the first row for duplicate emails within one file", async () => {
    mocks.currentUser.mockResolvedValue({
      id: "teacher-1",
      role: "TEACHER",
      schoolId: SESSION_SCHOOL,
    });
    mocks.parse.mockReturnValue([
      {
        name: "First Student",
        email: "duplicate@example.com",
        role: "student",
        classroom_name: "Class A",
      },
      {
        name: "Second Student",
        email: "duplicate@example.com",
        role: "student",
        classroom_name: "Class A",
      },
    ]);
    const results = [
      [{ id: "teacher-1", schoolId: SESSION_SCHOOL }],
      [{ id: SESSION_SCHOOL, name: "School A" }],
      [{ id: "role-student", name: "student" }],
      [],
      [],
    ];
    for (const rows of results) mocks.select.mockReturnValueOnce(selectResult(rows));

    const writes = recordingInserts((table) =>
      table === users
        ? [{ id: "user-1", email: "duplicate@example.com" }]
        : table === classrooms
          ? [{ id: "class-1", name: "Class A", schoolId: SESSION_SCHOOL }]
          : [],
    );

    const response = await POST(uploadRequest("students.csv"));

    expect(response.status).toBe(200);
    const summary = CsvUploadSummary.parse(await response.json());
    expect(summary).toEqual({ inserted: 1, skippedDuplicate: 1, skippedExisting: 0 });

    const userWrite = writes.find((write) => write.table === users);
    expect(userWrite).toBeDefined();
    expect(userWrite!.values).toHaveLength(1);
    expect(userWrite!.values[0]).toMatchObject({
      name: "First Student",
      email: "duplicate@example.com",
      schoolId: SESSION_SCHOOL,
    });
    expect(userWrite!.onConflictDoNothing).toBe(true);
  });

  it("returns 200 and skips rows whose email already exists in the database", async () => {
    mocks.currentUser.mockResolvedValue({
      id: "teacher-1",
      role: "TEACHER",
      schoolId: SESSION_SCHOOL,
    });
    mocks.parse.mockReturnValue([
      {
        name: "Existing Student",
        email: "existing@example.com",
        role: "student",
        classroom_name: "Class A",
      },
    ]);
    const results = [
      [{ id: "teacher-1", schoolId: SESSION_SCHOOL }],
      [{ id: SESSION_SCHOOL, name: "School A" }],
      [{ id: "role-student", name: "student" }],
      [{ email: "existing@example.com" }],
    ];
    for (const rows of results) mocks.select.mockReturnValueOnce(selectResult(rows));

    const writes = recordingInserts(() => []);

    const response = await POST(uploadRequest("students.csv"));

    expect(response.status).toBe(200);
    const summary = CsvUploadSummary.parse(await response.json());
    expect(summary).toEqual({ inserted: 0, skippedDuplicate: 0, skippedExisting: 1 });
    expect(writes.find((write) => write.table === users)).toBeUndefined();
  });

  it("returns 200 and inserts a lowercased user with the classroom assignment for a mixed-case email", async () => {
    mocks.currentUser.mockResolvedValue({
      id: "teacher-1",
      role: "TEACHER",
      schoolId: SESSION_SCHOOL,
    });
    mocks.parse.mockReturnValue([
      {
        name: "Mixed Case Student",
        email: "MixedCase@Example.COM",
        role: "student",
        classroom_name: "Class A",
      },
    ]);
    const results = [
      [{ id: "teacher-1", schoolId: SESSION_SCHOOL }],
      [{ id: SESSION_SCHOOL, name: "School A" }],
      [{ id: "role-student", name: "student" }],
      [],
      [{ id: "class-1", name: "Class A", schoolId: SESSION_SCHOOL }],
    ];
    for (const rows of results) mocks.select.mockReturnValueOnce(selectResult(rows));

    const writes = recordingInserts((table) =>
      table === users
        ? [{ id: "user-1", email: "mixedcase@example.com" }]
        : table === classrooms
          ? [{ id: "class-1", name: "Class A", schoolId: SESSION_SCHOOL }]
          : [],
    );

    const response = await POST(uploadRequest("students.csv"));

    expect(response.status).toBe(200);
    const body = await response.json();
    const summary = CsvUploadSummary.parse(body);
    expect(summary).toEqual({ inserted: 1, skippedDuplicate: 0, skippedExisting: 0 });
    expect(body.stats.studentAssignments).toBe(1);

    const userWrite = writes.find((write) => write.table === users);
    expect(userWrite).toBeDefined();
    expect(userWrite!.values).toHaveLength(1);
    expect(userWrite!.values[0]).toMatchObject({
      name: "Mixed Case Student",
      email: "mixedcase@example.com",
      username: "mixedcase@example.com",
      schoolId: SESSION_SCHOOL,
    });

    // The classroom assignment must survive the lowercasing: the insert
    // reports the lowercased email, and the id mapping built from it
    // resolves so the membership write is issued.
    const membershipWrite = writes.find(
      (write) => write.table === classroomStudents,
    );
    expect(membershipWrite).toBeDefined();
    expect(membershipWrite!.values[0]).toMatchObject({
      classroomId: "class-1",
      studentId: "user-1",
    });
  });
});
