// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  currentUser: vi.fn(),
  queue: [] as unknown[][],
  inserts: 0,
  updates: 0,
  activityKeys: new Set<string>(),
  xpLogInserts: 0,
}));

vi.mock("@/lib/session", () => ({ currentUser: mocks.currentUser, getCurrentUser: mocks.currentUser }));
vi.mock("@reading-advantage/domain/primary-avatar", () => ({ grantGpForXp: vi.fn() }));

/** Chainable select stub: each awaited chain takes the next queued row set. */
function chain() {
  const rows = mocks.queue.shift() ?? [];
  const stub: Record<string, unknown> = {};
  for (const m of ["from", "where", "limit", "orderBy"]) stub[m] = () => stub;
  stub.then = (resolve: (v: unknown) => unknown) => Promise.resolve(rows).then(resolve);
  return stub;
}
const fakeDb = () => ({
  select: () => chain(),
  insert: () => ({
    values: (v: Record<string, unknown>) => {
      mocks.inserts += 1;
      const isActivity = "targetId" in v;
      if (!isActivity) mocks.xpLogInserts += 1;
      let upsert = false;
      const run = async () => {
        if (!isActivity) return [{ id: "xp" + mocks.xpLogInserts }];
        const key = `${v.userId}|${v.activityType}|${v.targetId}`;
        // Emulates the unique key user_activity_type_target_unique.
        if (mocks.activityKeys.has(key) && !upsert) throw new Error("duplicate key value violates user_activity_type_target_unique");
        mocks.activityKeys.add(key);
        return [{ id: "act1" }];
      };
      const w: Record<string, unknown> = {
        returning: run,
        onConflictDoUpdate: () => {
          upsert = true;
          return w;
        },
      };
      w.then = (resolve: (v: unknown) => unknown) => Promise.resolve([]).then(resolve);
      return w;
    },
  }),
  update: () => ({
    set: () => ({
      where: async () => {
        mocks.updates += 1;
      },
    }),
  }),
});
vi.mock("@reading-advantage/domain", () => ({ getTenantDB: () => fakeDb(), getUnscopedDB: () => fakeDb() }));

import { POST as wordsOrdering } from "../words-for-ordering/route";
import { POST as matching } from "../sentences-for-matching/route";
import { POST as ordering } from "../sentences-for-ordering/route";
import { POST as cloze } from "../sentences-for-cloze/route";

const ctx = { params: Promise.resolve({ deckId: "d1" }) };
const req = (body: unknown) =>
  new Request("http://x/api/flashcard/decks/d1/game", { method: "POST", body: JSON.stringify(body) }) as unknown as NextRequest;

describe.each([
  ["words-for-ordering", wordsOrdering],
  ["sentences-for-matching", matching],
  ["sentences-for-ordering", ordering],
  ["sentences-for-cloze", cloze],
])("%s POST", (_name, POST) => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.queue.length = 0;
    mocks.inserts = 0;
    mocks.updates = 0;
    mocks.activityKeys.clear();
    mocks.xpLogInserts = 0;
    mocks.currentUser.mockResolvedValue({ id: "u1", role: "STUDENT", schoolId: "s1" });
  });

  it("returns 403 when the deck is not the caller's", async () => {
    mocks.queue.push([]); // owner check finds no deck
    const res = await POST(req({ score: 3, timer: 10 }), ctx);
    expect(res.status).toBe(403);
    expect(mocks.inserts).toBe(0);
    expect(mocks.updates).toBe(0);
  });

  it.each([
    ["a string score", { score: "3", timer: 10 }],
    ["a missing timer", { score: 3 }],
    ["a negative score", { score: -1, timer: 1 }],
    ["a huge score", { score: 1e9, timer: 1 }],
    ["no object", null],
  ])("returns 400 for %s", async (_n, body) => {
    const res = await POST(req(body), ctx);
    expect(res.status).toBe(400);
    expect(mocks.inserts).toBe(0);
  });

  it("records the game for the owner of the deck", async () => {
    mocks.queue.push([{ id: "d1" }], [{ id: "c1" }, { id: "c2" }]);
    const res = await POST(req({ score: 2, timer: 10 }), ctx);
    expect(res.status).toBe(200);
    expect(mocks.inserts).toBeGreaterThan(0);
  });

  it("pays XP again on a second result of the same deck game and returns 200", async () => {
    mocks.queue.push([{ id: "d1" }], [{ id: "c1" }, { id: "c2" }], [{ id: "d1" }], [{ id: "c1" }, { id: "c2" }]);
    expect((await POST(req({ score: 2, timer: 10 }), ctx)).status).toBe(200);
    expect((await POST(req({ score: 2, timer: 12 }), ctx)).status).toBe(200);
    // Legacy bfea121 paid XP on each play: two XP logs and two user XP increments.
    expect(mocks.xpLogInserts).toBe(2);
    expect(mocks.updates).toBe(2);
  });

  it("keeps the staff preview guard first", async () => {
    mocks.currentUser.mockResolvedValue({ id: "t1", role: "TEACHER", schoolId: "s1" });
    expect((await POST(req({}), ctx)).status).toBe(403);
    expect(mocks.inserts).toBe(0);
  });
});
