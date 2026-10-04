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

vi.mock("@reading-advantage/domain", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@reading-advantage/domain")>();
  return { ...actual, studentLogin: { ...actual.studentLogin, provisionStudentLogins: mocks.provision } };
});

import { users } from "@reading-advantage/db/schema";
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

/** Drives one students.csv upload. `storedId` decides whether the stored user is the new row or an old one. */
async function uploadStudent(storedId: (insertedId: string) => string) {
  mocks.currentUser.mockResolvedValue({ id: "teacher-1", role: "TEACHER", schoolId: SCHOOL });
  mocks.parse.mockReturnValue([
    { name: "Student One", email: "student@example.com", classroom_name: "Class A", role: "student" },
  ]);
  const queue = [
    [{ id: "teacher-1", schoolId: SCHOOL }],
    [{ id: SCHOOL, name: "School A" }],
    [],
    [{ name: "Class A" }],
    [{ id: "role-student", name: "student" }],
  ];
  for (const rows of queue) mocks.select.mockReturnValueOnce(selectResult(rows));
  let insertedId = "";
  mocks.select.mockImplementationOnce(() => selectResult([{ id: storedId(insertedId), email: "student@example.com" }]));
  mocks.select.mockReturnValueOnce(selectResult([{ id: "class-1", name: "Class A" }]));
  mocks.insert.mockImplementation((table) => {
    const chain = {
      values: vi.fn((values) => {
        if (table === users) insertedId = (values as Array<{ id: string }>)[0]!.id;
        return chain;
      }),
      onConflictDoNothing: vi.fn().mockResolvedValue(undefined),
    };
    return chain;
  });
  return POST(uploadRequest("students.csv"));
}

describe("combined CSV upload student login generation (FR-6)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.select.mockReset();
    mocks.insert.mockReset();
    mocks.existsSync.mockReturnValue(true);
  });

  it("generates a username and password for a student created by the upload", async () => {
    mocks.provision.mockImplementation(async ({ students }) => ({
      provisioned: students.map((s: { userId: string }) => ({ userId: s.userId, username: "classa1", initialPassword: "abcd2345" })),
      failed: [],
    }));
    const response = await uploadStudent((id) => id);
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(mocks.provision).toHaveBeenCalledWith(
      expect.objectContaining({
        schoolId: SCHOOL,
        students: [expect.objectContaining({ classroomName: "Class A", classroomId: "class-1" })],
      }),
    );
    expect((await response.json()).studentLogins).toEqual([
      { name: "Student One", classroomName: "Class A", username: "classa1", initialPassword: "abcd2345" },
    ]);
  });

  it("does not touch the credentials of a student who existed before the upload", async () => {
    const response = await uploadStudent(() => "old-student-id");
    expect(response.status).toBe(200);
    expect(mocks.provision).not.toHaveBeenCalled();
    expect((await response.json()).studentLogins).toEqual([]);
  });

  it("reports the students whose login could not be stored", async () => {
    mocks.provision.mockImplementation(async ({ students }) => ({
      provisioned: [],
      failed: students.map((s: { userId: string }) => ({ userId: s.userId, reason: "db down" })),
    }));
    const body = await (await uploadStudent((id) => id)).json();
    expect(body.studentLoginsFailed).toBe(1);
    expect(body.studentLoginsFailedNames).toEqual(["Student One"]);
    expect(body.studentLogins).toEqual([]);
  });

  it("reports every student as failed when provisioning throws", async () => {
    mocks.provision.mockRejectedValue(new Error("boom"));
    const response = await uploadStudent((id) => id);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.studentLoginsFailed).toBe(1);
    expect(body.studentLoginsFailedNames).toEqual(["Student One"]);
  });
});
