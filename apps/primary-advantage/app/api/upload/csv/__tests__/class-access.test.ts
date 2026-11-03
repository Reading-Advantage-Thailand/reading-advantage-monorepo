// @vitest-environment node
/** Finding 2 of authz-primary-report.md: a CSV import must not reach a class the caller does not manage. */
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
  canManage: vi.fn(),
}));

vi.mock("@/lib/session", () => ({ getCurrentUser: mocks.currentUser }));
// The class check is the unit under test here; its own queries have their own tests.
vi.mock("@/server/utils/assignment-access", () => ({ canManageClassroom: mocks.canManage }));
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

describe("CSV upload class access", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.select.mockReset();
    mocks.insert.mockReset();
    mocks.existsSync.mockReturnValue(true);
  });

  it("refuses teacher rows from a TEACHER before any write", async () => {
    teacherSession();
    mocks.parse.mockReturnValue([{ name: "New Teacher", email: "new@example.com", role: "teacher", classroom_name: "Class A" }]);
    queueSelects([...sessionRows, [{ id: "role-teacher", name: "teacher" }], [], [{ id: "class-1", name: "Class A" }], []]);
    const writes = recordingInserts();

    const response = await POST(uploadRequest("teachers.csv"));

    expect(response.status).toBe(403);
    expect(writes).toHaveLength(0);
  });

  it("refuses students for a class of the school that the caller does not manage", async () => {
    teacherSession();
    mocks.canManage.mockResolvedValue(false);
    mocks.parse.mockReturnValue([{ name: "Ann Lee", role: "student", classroom_name: "Other Class" }]);
    // session, roles, existing students in the class, class lookup
    queueSelects([...sessionRows, [{ id: "role-student", name: "student" }], [], [{ id: "class-other", name: "Other Class" }]]);
    const writes = recordingInserts();

    const response = await POST(uploadRequest("students.csv"));

    expect(response.status).toBe(403);
    expect(mocks.canManage).toHaveBeenCalledWith(expect.objectContaining({ id: "teacher-1" }), "class-other");
    expect(writes).toHaveLength(0);
  });

  it("imports students into a class that the caller manages", async () => {
    teacherSession();
    mocks.canManage.mockResolvedValue(true);
    mocks.parse.mockReturnValue([{ name: "Ann Lee", role: "student", classroom_name: "Class A" }]);
    queueSelects([...sessionRows, [{ id: "role-student", name: "student" }], [], [{ id: "class-1", name: "Class A" }]]);
    const writes = recordingInserts();

    const response = await POST(uploadRequest("students.csv"));

    expect(response.status).toBe(200);
    expect(writes.find((write) => write.table === classroomStudents)?.values[0]).toMatchObject({ classroomId: "class-1" });
  });
});
