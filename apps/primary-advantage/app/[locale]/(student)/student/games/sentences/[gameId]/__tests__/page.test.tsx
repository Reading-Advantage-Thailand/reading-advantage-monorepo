import { beforeEach, describe, expect, it, vi } from "vitest";

import OldSentencesGamePage from "../page";

const mocks = vi.hoisted(() => ({ permanentRedirect: vi.fn(), notFound: vi.fn() }));

vi.mock("next/navigation", () => ({
  notFound: () => {
    mocks.notFound();
    throw new Error("NEXT_NOT_FOUND");
  },
}));
vi.mock("@/i18n/navigation", () => ({
  permanentRedirect: (...args: unknown[]) => {
    mocks.permanentRedirect(...args);
    throw new Error("NEXT_REDIRECT");
  },
}));

describe("OldSentencesGamePage", () => {
  beforeEach(() => vi.clearAllMocks());

  it.each(["potion-rush"])("sends %s to the 3D game with the same id", async (id) => {
    await expect(OldSentencesGamePage({ params: Promise.resolve({ locale: "th", gameId: id }) })).rejects.toThrow("NEXT_REDIRECT");
    expect(mocks.permanentRedirect).toHaveBeenCalledWith({ href: `/student/games/apk/${id}`, locale: "th" });
  });

  it("uses the not-found boundary for an unknown id and for an id of the other group", async () => {
    for (const gameId of ["unknown", "rune-match"]) {
      await expect(OldSentencesGamePage({ params: Promise.resolve({ locale: "en", gameId }) })).rejects.toThrow("NEXT_NOT_FOUND");
    }
    expect(mocks.permanentRedirect).not.toHaveBeenCalled();
  });
});
