/**
 * Only SYSTEM writes licenses (default decision 2026-10-12, owner to confirm).
 * An ADMIN keeps the scoped reads.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  currentUser: vi.fn(),
  deletes: 0,
}));

vi.mock("@/lib/session", () => ({ currentUser: mocks.currentUser }));
vi.mock("@/lib/observability/logger", () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() } }));

/** Chainable stub that resolves to one license row. */
function chain() {
  const stub: Record<string, unknown> = {};
  for (const m of ["from", "where", "limit", "offset", "orderBy"]) stub[m] = () => stub;
  stub.then = (resolve: (v: unknown) => unknown) => Promise.resolve([{ id: "l1", schoolId: null, value: 1 }]).then(resolve);
  return stub;
}
const fakeDb = () => ({
  select: () => chain(),
  delete: () => {
    mocks.deletes += 1;
    return { where: async () => [] };
  },
});
vi.mock("@/lib/license-db", () => ({ licenseDbFor: () => fakeDb(), licenseSchoolFields: async () => ({}) }));
vi.mock("@reading-advantage/domain", () => ({ getUnscopedDB: () => fakeDb(), getTenantDB: () => fakeDb() }));

import { GET, DELETE } from "../route";
import { GET as GET_ID, PUT as PUT_ID, DELETE as DELETE_ID } from "../[id]/route";

const params = { params: Promise.resolve({ id: "l1" }) } as never;
const del = (url: string) => new Request(url, { method: "DELETE" }) as never;

describe("license routes: writes are SYSTEM only", () => {
  beforeEach(() => {
    mocks.deletes = 0;
    mocks.currentUser.mockResolvedValue({ id: "adm", role: "ADMIN", schoolId: "s1" });
  });

  it("refuses an ADMIN on DELETE /api/licenses", async () => {
    expect((await DELETE(del("http://x/api/licenses?id=l1"))).status).toBe(403);
    expect(mocks.deletes).toBe(0);
  });

  it("refuses an ADMIN on DELETE /api/licenses/[id]", async () => {
    expect((await DELETE_ID(del("http://x/api/licenses/l1"), params)).status).toBe(403);
    expect(mocks.deletes).toBe(0);
  });

  it("refuses an ADMIN on PUT before the body is read", async () => {
    const request = new Request("http://x/api/licenses/l1", { method: "PUT", body: "{}" }) as never;
    expect((await PUT_ID(request, params)).status).toBe(403);
  });

  it("lets SYSTEM delete", async () => {
    mocks.currentUser.mockResolvedValue({ id: "sys", role: "SYSTEM", schoolId: null });
    expect((await DELETE_ID(del("http://x/api/licenses/l1"), params)).status).toBe(200);
    expect(mocks.deletes).toBe(1);
  });

  it("keeps the ADMIN reads", async () => {
    expect((await GET(new Request("http://x/api/licenses") as never)).status).toBe(200);
    expect((await GET_ID(new Request("http://x/api/licenses/l1") as never, params)).status).toBe(200);
  });

  it("refuses a TEACHER on the reads", async () => {
    mocks.currentUser.mockResolvedValue({ id: "t", role: "TEACHER", schoolId: "s1" });
    expect((await GET(new Request("http://x/api/licenses") as never)).status).toBe(403);
  });
});
