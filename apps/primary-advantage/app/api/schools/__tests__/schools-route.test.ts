// @vitest-environment node
/** School create and list: the SYSTEM gate, the body check, the duplicate name, and the license stitch. */
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  currentUser: vi.fn(),
  assertCan: vi.fn(),
  selectRows: [] as unknown[][],
  selectError: null as Error | null,
  inserted: [] as Record<string, unknown>[],
}));

vi.mock("@/lib/session", () => ({ getCurrentUser: mocks.currentUser }));
vi.mock("@reading-advantage/auth", () => {
  class AuthError extends Error {}
  return { AuthError, assertCan: mocks.assertCan };
});

/**
 * Chainable select stub that resolves to the next queued rows.
 * @returns The chain.
 */
function chain() {
  const stub: Record<string, unknown> = {};
  for (const m of ["from", "where", "limit", "orderBy"]) stub[m] = () => stub;
  stub.then = (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) =>
    (mocks.selectError ? Promise.reject(mocks.selectError) : Promise.resolve(mocks.selectRows.shift() ?? [])).then(resolve, reject);
  return stub;
}

const fakeDb = {
  select: () => chain(),
  insert: () => ({
    values: (row: Record<string, unknown>) => ({
      returning: async () => {
        mocks.inserted.push(row);
        return [{ id: "s-new", ...row }];
      },
    }),
  }),
};
vi.mock("@reading-advantage/domain", () => ({ getTenantDB: () => fakeDb, getUnscopedDB: () => fakeDb }));

import { AuthError } from "@reading-advantage/auth";
import { GET, POST } from "../route";

const SYSTEM = { id: "sys", role: "SYSTEM", schoolId: null };

/**
 * Builds a POST request.
 * @param body The JSON body.
 * @returns The request.
 */
function post(body: unknown) {
  return new Request("http://x/api/schools", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }) as never;
}
const get = () => GET(new Request("http://x/api/schools") as never);

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  mocks.selectRows = [];
  mocks.selectError = null;
  mocks.inserted = [];
  mocks.assertCan.mockImplementation(() => undefined);
  mocks.currentUser.mockResolvedValue(SYSTEM);
});

describe("POST /api/schools", () => {
  it("answers 401 without a user", async () => {
    mocks.currentUser.mockResolvedValue(null);
    expect((await POST(post({ name: "School" }))).status).toBe(401);
  });

  it("answers 403 when the policy refuses", async () => {
    mocks.assertCan.mockImplementation(() => {
      throw new AuthError("no", "FORBIDDEN");
    });
    expect((await POST(post({ name: "School" }))).status).toBe(403);
    expect(mocks.inserted).toHaveLength(0);
  });

  it("answers 403 to an ADMIN even when the policy lets it through", async () => {
    mocks.currentUser.mockResolvedValue({ id: "a", role: "ADMIN", schoolId: "s1" });
    expect((await POST(post({ name: "School" }))).status).toBe(403);
    expect(mocks.inserted).toHaveLength(0);
  });

  it("answers 500 when the policy throws a non-auth error", async () => {
    mocks.assertCan.mockImplementation(() => {
      throw new Error("boom");
    });
    expect((await POST(post({ name: "School" }))).status).toBe(500);
  });

  it("answers 400 with details for a bad email", async () => {
    const res = await POST(post({ name: "School", contactEmail: "nope" }));
    expect(res.status).toBe(400);
    expect((await res.json()).details).toBeInstanceOf(Array);
    expect(mocks.inserted).toHaveLength(0);
  });

  it("answers 400 for a duplicate name", async () => {
    mocks.selectRows = [[{ id: "s1", name: "School" }]];
    const res = await POST(post({ name: "School" }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "A school with this name already exists" });
    expect(mocks.inserted).toHaveLength(0);
  });

  it("creates the school", async () => {
    mocks.selectRows = [[]];
    const res = await POST(post({ name: "New School", contactName: "Office", contactEmail: "office@school.test" }));
    expect(res.status).toBe(201);
    expect(mocks.inserted[0]).toEqual({ name: "New School", contactName: "Office", contactEmail: "office@school.test" });
    expect((await res.json()).id).toBe("s-new");
  });
});

describe("GET /api/schools", () => {
  it("answers 401 without a user", async () => {
    mocks.currentUser.mockResolvedValue(null);
    expect((await get()).status).toBe(401);
  });

  it("answers 403 when the policy refuses", async () => {
    mocks.assertCan.mockImplementation(() => {
      throw new AuthError("no", "FORBIDDEN");
    });
    expect((await get()).status).toBe(403);
  });

  it("answers 403 to an ADMIN", async () => {
    mocks.currentUser.mockResolvedValue({ id: "a", role: "ADMIN", schoolId: "s1" });
    expect((await get()).status).toBe(403);
  });

  it("returns an empty list without schools", async () => {
    mocks.selectRows = [[]];
    expect(await (await get()).json()).toEqual([]);
  });

  it("stitches each school's licenses and skips a license without a school", async () => {
    mocks.selectRows = [
      [{ id: "s1" }, { id: "s2" }],
      [
        { schoolId: "s1", name: "L1" },
        { schoolId: "s1", name: "L2" },
        { schoolId: null, name: "L3" },
      ],
    ];
    expect(await (await get()).json()).toEqual([
      { id: "s1", _count: { users: 0, admins: 0 }, licenses: [{ schoolId: "s1", name: "L1" }, { schoolId: "s1", name: "L2" }] },
      { id: "s2", _count: { users: 0, admins: 0 }, licenses: [] },
    ]);
  });

  it("answers 500 when the database fails", async () => {
    mocks.selectError = new Error("db");
    expect((await get()).status).toBe(500);
  });
});
