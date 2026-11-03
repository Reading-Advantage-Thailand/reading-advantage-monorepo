// @vitest-environment node
/** Finding 2 of authz-primary-report.md: a classes-route import must not reach a class the caller does not manage. */
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
// @reading-advantage/domain, which import the shared client from this barrel.
// The factory spreads the real schema so the tenant registry (which imports
// its tables from this barrel) and the route (which imports from the /schema
// submodule) share one table identity. The session mocks carry a schoolId,
// so the TenantDB path with school enforcement is the one under test.
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

import { POST } from "../route";

function selectResult(rows: unknown[]) {
  const chain = {
    from: vi.fn(),
    where: vi.fn(),
    innerJoin: vi.fn(),
    limit: vi.fn().mockResolvedValue(rows),
    then: (resolve: (value: unknown[]) => unknown) => Promise.resolve(rows).then(resolve),
  };
  chain.from.mockReturnValue(chain);
  chain.where.mockReturnValue(chain);
  chain.innerJoin.mockReturnValue(chain);
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

const SCHOOL = "00000000-0000-0000-0000-000000000001";
const teacherRow = { name: "Teacher Two", email: "teacher2@example.com", classroom_name: "Class A", role: "teacher" };

/** Records every insert target. */
function recordingInserts(): unknown[] {
  const tables: unknown[] = [];
  mocks.insert.mockImplementation((table) => {
    tables.push(table);
    const chain = { values: vi.fn(() => chain), onConflictDoNothing: vi.fn().mockResolvedValue(undefined) };
    return chain;
  });
  return tables;
}

describe("classes upload class access", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.select.mockReset();
    mocks.insert.mockReset();
    mocks.existsSync.mockReturnValue(true);
  });

  it("refuses teachers.csv from a TEACHER before any write", async () => {
    mocks.currentUser.mockResolvedValue({ id: "teacher-1", role: "TEACHER", schoolId: SCHOOL });
    mocks.canManage.mockResolvedValue(true);
    mocks.parse.mockReturnValue([teacherRow]);
    const results = [
      [{ id: "teacher-1", schoolId: SCHOOL }],
      [{ id: SCHOOL, name: "School A" }],
      [],
      [{ id: "class-1", name: "Class A" }],
      [{ id: "role-teacher", name: "teacher" }],
      [{ id: "teacher-2", email: "teacher2@example.com" }],
      [{ id: "class-1", name: "Class A" }],
      [],
    ];
    for (const rows of results) mocks.select.mockReturnValueOnce(selectResult(rows));
    const writes = recordingInserts();

    const response = await POST(uploadRequest("teachers.csv"));

    expect(response.status).toBe(403);
    expect(writes).toHaveLength(0);
  });

  it("refuses an ADMIN import into a class that the ADMIN does not manage", async () => {
    mocks.currentUser.mockResolvedValue({ id: "admin-1", role: "ADMIN", schoolId: SCHOOL });
    mocks.canManage.mockResolvedValue(false);
    mocks.parse.mockReturnValue([teacherRow]);
    const results = [
      [{ id: "admin-1", schoolId: SCHOOL }],
      [{ id: SCHOOL, name: "School A" }],
      [],
      [{ id: "class-1", name: "Class A" }],
      [{ id: "role-teacher", name: "teacher" }],
      [{ id: "teacher-2", email: "teacher2@example.com" }],
      [{ id: "class-1", name: "Class A" }],
      [],
    ];
    for (const rows of results) mocks.select.mockReturnValueOnce(selectResult(rows));
    const writes = recordingInserts();

    const response = await POST(uploadRequest("teachers.csv"));

    expect(response.status).toBe(403);
    expect(mocks.canManage).toHaveBeenCalledWith(expect.objectContaining({ id: "admin-1" }), "class-1");
    expect(writes).toHaveLength(0);
  });
});
