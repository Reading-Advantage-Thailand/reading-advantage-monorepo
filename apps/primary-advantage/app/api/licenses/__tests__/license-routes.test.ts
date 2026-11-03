/**
 * License routes: the auth gates, the body checks, the expiry math, the
 * school stitch, and the error answers (coverage of the money path).
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  currentUser: vi.fn(),
  assertCan: vi.fn(),
  schoolFields: vi.fn(),
  /** The rows each select resolves to, in call order. */
  selectQueue: [] as unknown[][],
  inserted: [] as Record<string, unknown>[],
  updated: [] as Record<string, unknown>[],
  deletes: 0,
  insertError: null as Error | null,
  selectError: null as Error | null,
  updateError: null as Error | null,
  limits: [] as number[],
  offsets: [] as number[],
  whereCalls: 0,
}));

vi.mock("@/lib/session", () => ({ currentUser: mocks.currentUser }));
vi.mock("@/lib/observability/logger", () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() } }));
vi.mock("@/lib/utils", () => ({ generateLicenseKey: () => "KEY-1" }));
vi.mock("@reading-advantage/auth", async () => {
  class AuthError extends Error {}
  return { AuthError, assertCan: mocks.assertCan };
});

/**
 * Chainable select stub that resolves to the next queued row set.
 * @returns The chain.
 */
function chain() {
  const stub: Record<string, unknown> = {};
  stub.from = () => stub;
  stub.orderBy = () => stub;
  stub.where = () => {
    mocks.whereCalls += 1;
    return stub;
  };
  stub.limit = (n: number) => {
    mocks.limits.push(n);
    return stub;
  };
  stub.offset = (n: number) => {
    mocks.offsets.push(n);
    return stub;
  };
  stub.then = (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) =>
    (mocks.selectError ? Promise.reject(mocks.selectError) : Promise.resolve(mocks.selectQueue.shift() ?? [])).then(resolve, reject);
  return stub;
}

/**
 * Fake database that records writes.
 * @returns The fake handle.
 */
function fakeDb() {
  return {
    select: () => chain(),
    insert: () => ({
      values: (values: Record<string, unknown>) => ({
        returning: async () => {
          if (mocks.insertError) throw mocks.insertError;
          mocks.inserted.push(values);
          return [{ id: "l1", createdAt: "now", ...values }];
        },
      }),
    }),
    update: () => ({
      set: (values: Record<string, unknown>) => ({
        where: () => ({
          returning: async () => {
            if (mocks.updateError) throw mocks.updateError;
            mocks.updated.push(values);
            return [{ id: "l1", key: "KEY-1", ...values }];
          },
        }),
      }),
    }),
    delete: () => ({
      where: async () => {
        mocks.deletes += 1;
        return [];
      },
    }),
  };
}

vi.mock("@/lib/license-db", () => ({
  licenseDbFor: () => fakeDb(),
  licenseSchoolFields: mocks.schoolFields,
}));
vi.mock("@reading-advantage/domain", () => ({ getUnscopedDB: () => fakeDb(), getTenantDB: () => fakeDb() }));

import { AuthError } from "@reading-advantage/auth";
import { DELETE, GET, POST } from "../route";
import { DELETE as DELETE_ID, GET as GET_ID, PUT as PUT_ID } from "../[id]/route";

const SYSTEM = { id: "sys", role: "SYSTEM", schoolId: null };
const ADMIN = { id: "adm", role: "ADMIN", schoolId: "s1" };
const params = { params: Promise.resolve({ id: "l1" }) } as never;

const body = {
  name: "QA License",
  maxUsers: 30,
  startDate: "2026-01-01T00:00:00.000Z",
  status: "active",
  subscriptionType: "premium",
};

/**
 * Builds a JSON request.
 * @param method The HTTP method.
 * @param url The URL.
 * @param json The body, or undefined for none.
 * @returns The request.
 */
function req(method: string, url: string, json?: unknown) {
  return new Request(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: json === undefined ? undefined : JSON.stringify(json),
  }) as never;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.selectQueue = [];
  mocks.inserted = [];
  mocks.updated = [];
  mocks.deletes = 0;
  mocks.insertError = null;
  mocks.selectError = null;
  mocks.updateError = null;
  mocks.limits = [];
  mocks.offsets = [];
  mocks.whereCalls = 0;
  mocks.assertCan.mockImplementation(() => undefined);
  mocks.schoolFields.mockResolvedValue({ schoolId: null, schoolName: "" });
  mocks.currentUser.mockResolvedValue(SYSTEM);
});

describe("POST /api/licenses", () => {
  it("answers 401 without a user", async () => {
    mocks.currentUser.mockResolvedValue(null);
    expect((await POST(req("POST", "http://x/api/licenses", body))).status).toBe(401);
  });

  it("answers 403 when the policy refuses", async () => {
    mocks.assertCan.mockImplementation(() => {
      throw new AuthError("no");
    });
    expect((await POST(req("POST", "http://x/api/licenses", body))).status).toBe(403);
    expect(mocks.inserted).toHaveLength(0);
  });

  it("answers 500 when the policy throws a non-auth error", async () => {
    mocks.assertCan.mockImplementation(() => {
      throw new Error("boom");
    });
    expect((await POST(req("POST", "http://x/api/licenses", body))).status).toBe(500);
  });

  it("answers 400 with details for a bad body and writes nothing", async () => {
    const res = await POST(req("POST", "http://x/api/licenses", { ...body, maxUsers: 0 }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("Invalid input data");
    expect(Array.isArray(json.details)).toBe(true);
    expect(mocks.inserted).toHaveLength(0);
  });

  it("stores the generated key, the upper-case subscription, and no expiry without expiryDays", async () => {
    const res = await POST(req("POST", "http://x/api/licenses", body));
    expect(res.status).toBe(200);
    expect(mocks.inserted[0]).toMatchObject({ key: "KEY-1", subscription: "PREMIUM", maxUsers: 30, expiryDate: null });
    const json = await res.json();
    expect(json).toMatchObject({ id: "l1", key: "KEY-1", name: "QA License", maxUsers: 30 });
  });

  it("sets the expiry date expiryDays after the start date", async () => {
    await POST(req("POST", "http://x/api/licenses", { ...body, expiryDays: 365 }));
    const start = new Date(body.startDate);
    const expected = new Date(start);
    expected.setDate(start.getDate() + 365);
    expect((mocks.inserted[0].expiryDate as Date).toISOString()).toBe(expected.toISOString());
  });

  it("answers 409 on a duplicate key", async () => {
    mocks.insertError = new Error("Unique constraint failed on key");
    expect((await POST(req("POST", "http://x/api/licenses", body))).status).toBe(409);
  });

  it("answers 500 on another database error", async () => {
    mocks.insertError = new Error("connection lost");
    expect((await POST(req("POST", "http://x/api/licenses", body))).status).toBe(500);
  });
});

describe("GET /api/licenses", () => {
  it("answers 401 without a user", async () => {
    mocks.currentUser.mockResolvedValue(null);
    expect((await GET(req("GET", "http://x/api/licenses"))).status).toBe(401);
  });

  it("answers 403 when the policy refuses", async () => {
    mocks.assertCan.mockImplementation(() => {
      throw new AuthError("no");
    });
    expect((await GET(req("GET", "http://x/api/licenses"))).status).toBe(403);
  });

  it("answers 403 to a TEACHER even when the policy lets it through", async () => {
    mocks.currentUser.mockResolvedValue({ id: "t", role: "TEACHER", schoolId: "s1" });
    expect((await GET(req("GET", "http://x/api/licenses"))).status).toBe(403);
  });

  it("pages with the defaults and stitches each license's school", async () => {
    mocks.selectQueue = [
      [
        { id: "l1", schoolId: "s1" },
        { id: "l2", schoolId: null },
        { id: "l3", schoolId: "s1" },
      ],
      [{ value: 3 }],
      [{ id: "s1", name: "School One" }],
    ];
    const res = await GET(req("GET", "http://x/api/licenses"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([
      { id: "l1", schoolId: "s1", School: { id: "s1", name: "School One" } },
      { id: "l2", schoolId: null, School: null },
      { id: "l3", schoolId: "s1", School: { id: "s1", name: "School One" } },
    ]);
    expect(mocks.limits[0]).toBe(50);
    expect(mocks.offsets[0]).toBe(0);
  });

  it("applies page, limit, status, and search filters for an ADMIN", async () => {
    mocks.currentUser.mockResolvedValue(ADMIN);
    mocks.selectQueue = [[], [{ value: 0 }]];
    const res = await GET(req("GET", "http://x/api/licenses?page=3&limit=10&status=active&search=abc"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
    expect(mocks.limits[0]).toBe(10);
    expect(mocks.offsets[0]).toBe(20);
    expect(mocks.whereCalls).toBe(2);
  });

  it("ignores an unknown status filter", async () => {
    mocks.selectQueue = [[], [{ value: 0 }]];
    await GET(req("GET", "http://x/api/licenses?status=bogus"));
    expect(mocks.whereCalls).toBe(0);
  });

  it("answers 500 when the database fails", async () => {
    mocks.selectError = new Error("db");
    expect((await GET(req("GET", "http://x/api/licenses"))).status).toBe(500);
  });
});

describe("DELETE /api/licenses", () => {
  it("answers 500 when the session lookup fails", async () => {
    mocks.currentUser.mockRejectedValueOnce(new Error("session store down"));
    expect((await DELETE(req("DELETE", "http://x/api/licenses?id=l1"))).status).toBe(500);
  });

  it("answers 401 without a user", async () => {
    mocks.currentUser.mockResolvedValue(null);
    expect((await DELETE(req("DELETE", "http://x/api/licenses?id=l1"))).status).toBe(401);
  });

  it("answers 403 when the policy refuses", async () => {
    mocks.assertCan.mockImplementation(() => {
      throw new AuthError("no");
    });
    expect((await DELETE(req("DELETE", "http://x/api/licenses?id=l1"))).status).toBe(403);
    expect(mocks.deletes).toBe(0);
  });

  it("answers 400 without an id", async () => {
    expect((await DELETE(req("DELETE", "http://x/api/licenses"))).status).toBe(400);
    expect(mocks.deletes).toBe(0);
  });

  it("deletes for SYSTEM", async () => {
    const res = await DELETE(req("DELETE", "http://x/api/licenses?id=l1"));
    expect(res.status).toBe(200);
    expect(mocks.deletes).toBe(1);
  });
});

describe("GET /api/licenses/[id]", () => {
  it("answers 401 without a user", async () => {
    mocks.currentUser.mockResolvedValue(null);
    expect((await GET_ID(req("GET", "http://x/api/licenses/l1"), params)).status).toBe(401);
  });

  it("answers 403 when the policy refuses", async () => {
    mocks.assertCan.mockImplementation(() => {
      throw new AuthError("no");
    });
    expect((await GET_ID(req("GET", "http://x/api/licenses/l1"), params)).status).toBe(403);
  });

  it("answers 403 to a TEACHER", async () => {
    mocks.currentUser.mockResolvedValue({ id: "t", role: "TEACHER", schoolId: "s1" });
    expect((await GET_ID(req("GET", "http://x/api/licenses/l1"), params)).status).toBe(403);
  });

  it("answers 404 for an unknown license", async () => {
    mocks.selectQueue = [[]];
    expect((await GET_ID(req("GET", "http://x/api/licenses/l1"), params)).status).toBe(404);
  });

  it("returns the license with its school for an ADMIN", async () => {
    mocks.currentUser.mockResolvedValue(ADMIN);
    mocks.selectQueue = [[{ id: "l1", schoolId: "s1" }], [{ id: "s1", name: "School One" }]];
    const res = await GET_ID(req("GET", "http://x/api/licenses/l1"), params);
    expect(await res.json()).toEqual({ id: "l1", schoolId: "s1", School: { id: "s1", name: "School One" } });
  });

  it("returns a null school when the school row is gone", async () => {
    mocks.selectQueue = [[{ id: "l1", schoolId: "s9" }], []];
    const res = await GET_ID(req("GET", "http://x/api/licenses/l1"), params);
    expect((await res.json()).School).toBeNull();
  });

  it("answers 500 when the database fails", async () => {
    mocks.selectError = new Error("db");
    expect((await GET_ID(req("GET", "http://x/api/licenses/l1"), params)).status).toBe(500);
  });
});

describe("PUT /api/licenses/[id]", () => {
  const put = (json: unknown) => PUT_ID(req("PUT", "http://x/api/licenses/l1", json), params);

  it("answers 401 without a user", async () => {
    mocks.currentUser.mockResolvedValue(null);
    expect((await put(body)).status).toBe(401);
  });

  it("answers 403 when the policy refuses", async () => {
    mocks.assertCan.mockImplementation(() => {
      throw new AuthError("no");
    });
    expect((await put(body)).status).toBe(403);
  });

  it("answers 400 with details for a bad body", async () => {
    const res = await put({ ...body, status: "paused" });
    expect(res.status).toBe(400);
    expect((await res.json()).details).toBeInstanceOf(Array);
    expect(mocks.updated).toHaveLength(0);
  });

  it("answers 404 for an unknown license", async () => {
    mocks.selectQueue = [[]];
    expect((await put(body)).status).toBe(404);
    expect(mocks.updated).toHaveLength(0);
  });

  it("writes the new expiry and the upper-case subscription, and stitches the school", async () => {
    mocks.schoolFields.mockResolvedValue({ schoolId: "s1", schoolName: "School One" });
    mocks.selectQueue = [[{ id: "l1" }], [{ id: "s1", name: "School One" }]];
    const res = await put({ ...body, expiryDays: 30, description: "d" });
    expect(res.status).toBe(200);
    const expected = new Date(body.startDate);
    expected.setDate(expected.getDate() + 30);
    expect(mocks.updated[0]).toMatchObject({ subscription: "PREMIUM", description: "d", schoolId: "s1" });
    expect((mocks.updated[0].expiryDate as Date).toISOString()).toBe(expected.toISOString());
    expect((await res.json()).School).toEqual({ id: "s1", name: "School One" });
  });

  it("clears the expiry when expiryDays is left out", async () => {
    mocks.selectQueue = [[{ id: "l1", expiryDate: "2027-01-01" }]];
    const res = await put(body);
    expect(res.status).toBe(200);
    expect(mocks.updated[0].expiryDate).toBeNull();
    expect((await res.json()).School).toBeNull();
  });

  it("answers 400 on a foreign key error", async () => {
    mocks.selectQueue = [[{ id: "l1" }]];
    mocks.updateError = new Error("Foreign key constraint violated");
    const res = await put(body);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("Invalid school ID provided");
  });

  it("answers 500 on another database error", async () => {
    mocks.selectQueue = [[{ id: "l1" }]];
    mocks.updateError = new Error("connection lost");
    expect((await put(body)).status).toBe(500);
  });
});

describe("DELETE /api/licenses/[id]", () => {
  const del = () => DELETE_ID(req("DELETE", "http://x/api/licenses/l1"), params);

  it("answers 401 without a user", async () => {
    mocks.currentUser.mockResolvedValue(null);
    expect((await del()).status).toBe(401);
  });

  it("answers 403 when the policy refuses", async () => {
    mocks.assertCan.mockImplementation(() => {
      throw new AuthError("no");
    });
    expect((await del()).status).toBe(403);
  });

  it("answers 404 for an unknown license and deletes nothing", async () => {
    mocks.selectQueue = [[]];
    expect((await del()).status).toBe(404);
    expect(mocks.deletes).toBe(0);
  });

  it("answers 500 when the database fails", async () => {
    mocks.selectError = new Error("db");
    expect((await del()).status).toBe(500);
    expect(mocks.deletes).toBe(0);
  });

  it("deletes an existing license", async () => {
    mocks.selectQueue = [[{ id: "l1" }]];
    expect((await del()).status).toBe(200);
    expect(mocks.deletes).toBe(1);
  });
});
