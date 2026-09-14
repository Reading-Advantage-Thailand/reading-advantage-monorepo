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
import { CsvUploadSummary } from "../schema";
import { POST } from "../route";

const SESSION_SCHOOL = "00000000-0000-0000-0000-00000000000a";
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

describe("CSV upload session school scoping", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // mockReset clears the mockReturnValueOnce queue (clearAllMocks alone
    // does not) so each test's queued select results stay isolated. Tests
    // re-install insert.mockImplementation() through recordingInserts.
    mocks.select.mockReset();
    mocks.insert.mockReset();
    mocks.existsSync.mockReturnValue(true);
  });

  it("stamps inserted users and classrooms with the session school when the stored row diverges", async () => {
    mocks.currentUser.mockResolvedValue({
      id: "teacher-1",
      role: "TEACHER",
      schoolId: SESSION_SCHOOL,
    });
    mocks.parse.mockReturnValue([
      {
        name: "Student One",
        email: "student@example.com",
        role: "student",
        classroom_name: "Class A",
      },
    ]);
    const results = [
      [{ id: "teacher-1", schoolId: STORED_ROW_SCHOOL }],
      [{ id: STORED_ROW_SCHOOL, name: "School B" }],
      [{ id: "role-student", name: "student" }],
      [],
      [],
    ];
    for (const rows of results) mocks.select.mockReturnValueOnce(selectResult(rows));

    const writes = recordingInserts((table) =>
      table === users
        ? [{ id: "user-1", email: "student@example.com" }]
        : table === classrooms
          ? [{ id: "class-1", name: "Class A", schoolId: SESSION_SCHOOL }]
          : [],
    );

    const response = await POST(uploadRequest("students.csv"));

    expect(response.status).toBe(200);
    const summary = CsvUploadSummary.parse(await response.json());
    expect(summary).toEqual({ inserted: 1, skippedDuplicate: 0, skippedExisting: 0 });

    const userWrite = writes.find((write) => write.table === users);
    expect(userWrite).toBeDefined();
    expect(userWrite!.values[0]).toMatchObject({
      schoolId: SESSION_SCHOOL,
      email: "student@example.com",
    });

    const classroomWrite = writes.find((write) => write.table === classrooms);
    expect(classroomWrite).toBeDefined();
    expect(classroomWrite!.values[0]).toMatchObject({
      schoolId: SESSION_SCHOOL,
      name: "Class A",
    });
  });

  it("keeps the 400 rejection when the session has no school context", async () => {
    mocks.currentUser.mockResolvedValue({ id: "teacher-1", role: "TEACHER" });
    mocks.select.mockReturnValueOnce(selectResult([{ id: "teacher-1", schoolId: null }]));

    const response = await POST(uploadRequest("students.csv"));

    expect(response.status).toBe(400);
    expect((await response.json()).error).toBe("School association required");
    expect(mocks.insert).not.toHaveBeenCalled();
  });
});
