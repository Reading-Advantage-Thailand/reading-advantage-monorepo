// @vitest-environment node
/**
 * The 2026-10-21 tab check found "order sentences" and "order words" empty for a student with 15
 * saved sentence cards: both GETs kept only cards with a `due` date, a column that
 * flashcard_cards does not have, so every card dropped out.
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

import { GET as orderSentences } from "../sentences-for-ordering/route";
import { GET as orderWords } from "../words-for-ordering/route";

const sentences = ["Hello!", "My name is May.", "I am nine years old.", "I live in a house.", "I like my cat."];
const article = {
  id: "art1",
  title: "Hello! I Am May",
  sentences: sentences.map((sentence, i) => ({ sentence, startTime: i, endTime: i + 1 })),
  translatedPassage: { th: ["สวัสดี", "ฉันชื่อเมย์", "ฉันอายุเก้าขวบ", "ฉันอยู่ในบ้าน", "ฉันชอบแมวของฉัน"] },
  audioUrl: null,
  cefrLevel: "A1",
};
const deck = [{ id: "d1", type: "SENTENCE", userId: "u1" }];
const card = { id: "c1", deckId: "d1", front: "I am nine years old.", back: "I am nine years old.", sourceId: "art1" };
const request = (route: string) => new Request(`http://x/api/flashcard/decks/d1/${route}`) as unknown as NextRequest;
const ctx = { params: Promise.resolve({ deckId: "d1" }) };

describe("order games GET", () => {
  beforeEach(() => {
    mocks.queue.length = 0;
    mocks.currentUser.mockResolvedValue({ id: "u1", role: "STUDENT", schoolId: "s1" });
  });

  it("builds a sentence group from a card without a due date", async () => {
    mocks.queue.push(deck, [card, { ...card, id: "c0", sourceId: null }], [], [article]);
    const body = await (await orderSentences(request("sentences-for-ordering"), ctx)).json();
    expect(body.sentenceGroups).toHaveLength(1);
    expect(body.sentenceGroups[0].sentences.map((s: { text: string }) => s.text)).toContain("I am nine years old.");
  });

  it("builds a word game from a card without a due date", async () => {
    mocks.queue.push(deck, [card], [], [article]);
    const body = await (await orderWords(request("words-for-ordering"), ctx)).json();
    expect(body.sentences).toHaveLength(1);
    expect(body.sentences[0]).toMatchObject({ articleId: "art1" });
  });
});
