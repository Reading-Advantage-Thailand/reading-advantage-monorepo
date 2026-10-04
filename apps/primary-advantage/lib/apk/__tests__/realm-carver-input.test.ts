import { describe, expect, it } from "vitest";
import { capRealmCarverSentences, REALM_CARVER_MAX_WORDS } from "../realm-carver-input";

const card = (words: number, tag = "w") => ({
  term: Array.from({ length: words }, (_, i) => `${tag}${i}`).join(" "),
  translation: "t",
});
const count = (items: { term: string }[]) =>
  items.reduce((n, i) => n + i.term.trim().split(/\s+/u).length, 0);

describe("capRealmCarverSentences", () => {
  it("returns the input unchanged when within the cap", () => {
    const items = [card(40), card(60)];
    expect(capRealmCarverSentences(items)).toEqual(items);
  });

  it("keeps whole cards in delivered order and never exceeds the cap", () => {
    const items = [card(40, "a"), card(40, "b"), card(40, "c"), card(20, "d")];
    const out = capRealmCarverSentences(items);
    expect(count(out)).toBeLessThanOrEqual(REALM_CARVER_MAX_WORDS);
    expect(out).toEqual([items[0], items[1], items[3]]);
  });

  it("skips a single oversized card instead of returning nothing", () => {
    const items = [card(150), card(10)];
    expect(capRealmCarverSentences(items)).toEqual([items[1]]);
  });
});
