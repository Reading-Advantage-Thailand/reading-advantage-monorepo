// @vitest-environment node
/**
 * PR found on 2026-10-21 that the student "match sentences" tab always failed: the GET filtered on
 * a `due` column that flashcard_cards does not have (Postgres 42703), so the route answered 500.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({ currentUser: vi.fn(), queue: [] as unknown[][] }));

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
vi.mock("@reading-advantage/domain", () => ({ getTenantDB: () => ({ select: chain }), getUnscopedDB: () => ({ select: chain }) }));

import { GET } from "../sentences-for-matching/route";

const article = {
  id: "art1",
  title: "Hello! I Am May",
  sentences: [{ sentence: "Hello!", startTime: 0, endTime: 0.8 }, { sentence: "I am May.", startTime: 0.8, endTime: 2 }],
  translatedPassage: { th: ["สวัสดี", "ฉันชื่อเมย์"] },
  audioUrl: null,
};

describe("sentences-for-matching GET", () => {
  beforeEach(() => {
    mocks.queue.length = 0;
    mocks.currentUser.mockResolvedValue({ id: "u1", role: "STUDENT", schoolId: "s1" });
  });

  it("builds the pairs from the card front and the source article", async () => {
    mocks.queue.push(
      [{ id: "d1", type: "SENTENCE", userId: "u1" }],
      [
        { id: "c1", deckId: "d1", front: "Hello!", back: "Hello!", sourceId: "art1" },
        { id: "c2", deckId: "d1", front: "I am May.", back: "I am May.", sourceId: "art1" },
      ],
      [],
      [article],
      [article],
    );
    const response = await GET(new Request("http://x/api/flashcard/decks/d1/sentences-for-matching?language=th") as unknown as NextRequest, { params: Promise.resolve({ deckId: "d1" }) });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.matchingGames).toHaveLength(1);
    expect(body.matchingGames[0].pairs.map((p: { left: { content: string }; right: { content: string } }) => [p.left.content, p.right.content])).toEqual([
      ["Hello!", "สวัสดี"],
      ["I am May.", "ฉันชื่อเมย์"],
    ]);
    expect(body.matchingGames[0].pairs[1]).toMatchObject({ articleId: "art1", startTime: 0.8, endTime: 2 });
  });
});
