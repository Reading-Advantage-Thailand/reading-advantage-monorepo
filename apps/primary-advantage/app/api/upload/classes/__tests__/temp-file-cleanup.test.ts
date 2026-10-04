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

describe("classes upload temp file cleanup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.select.mockReset();
    mocks.insert.mockReset();
    mocks.existsSync.mockReturnValue(true);
    mocks.currentUser.mockResolvedValue({ id: "teacher-1", role: "TEACHER", schoolId: SESSION_SCHOOL });
    mocks.select
      .mockReturnValueOnce(selectResult([{ id: "teacher-1", schoolId: SESSION_SCHOOL }]))
      .mockReturnValueOnce(selectResult([{ id: SESSION_SCHOOL, name: "School A" }]));
  });

  function expectTempFileDeleted() {
    expect(mocks.writeFile).toHaveBeenCalledTimes(1);
    expect(mocks.unlink).toHaveBeenCalledTimes(1);
    expect(mocks.unlink.mock.calls[0][0]).toBe(mocks.writeFile.mock.calls[0][0]);
  }

  it("deletes the temp file when the CSV has no data rows (400)", async () => {
    mocks.parse.mockReturnValue([]);
    const response = await POST(uploadRequest("classes.csv"));
    expect(response.status).toBe(400);
    expectTempFileDeleted();
  });

  it("deletes the temp file when parsing fails (400)", async () => {
    mocks.parse.mockImplementation(() => {
      throw new Error("parse boom");
    });
    const response = await POST(uploadRequest("classes.csv"));
    expect(response.status).toBe(400);
    expectTempFileDeleted();
  });
});
