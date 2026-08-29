import { notFound, redirect } from "next/navigation";

import { redirectLegacyGameToApk } from "./legacy-game-redirect";

jest.mock("next/navigation", () => ({
  notFound: jest.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
  redirect: jest.fn(() => {
    throw new Error("NEXT_REDIRECT");
  }),
}));

jest.mock("@reading-advantage/game-cartridges", () => ({
  getCartridgeCatalogEntry: (id: string) =>
    id === "castle-defense" ? { id: "castle-defense" } : undefined,
}));

describe("redirectLegacyGameToApk", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("redirects a leftover Reading path to the APK student route", async () => {
    await expect(
      redirectLegacyGameToApk(
        Promise.resolve({ locale: "en", gameId: "castle-defense" }),
      ),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(redirect).toHaveBeenCalledWith("/en/student/games/apk/castle-defense");
    expect(notFound).not.toHaveBeenCalled();
  });

  it("uses the not-found boundary for an unknown leftover game id", async () => {
    await expect(
      redirectLegacyGameToApk(
        Promise.resolve({ locale: "th", gameId: "not-a-catalog-title" }),
      ),
    ).rejects.toThrow("NEXT_NOT_FOUND");

    expect(notFound).toHaveBeenCalledTimes(1);
    expect(redirect).not.toHaveBeenCalled();
  });
});
