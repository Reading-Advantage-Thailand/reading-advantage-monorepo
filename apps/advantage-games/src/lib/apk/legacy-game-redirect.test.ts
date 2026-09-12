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
    id === "dragon-flight" ? { id: "dragon-flight" } : undefined,
}));

describe("redirectLegacyGameToApk", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("redirects every public catalog title from a leftover path to the APK route", async () => {
    await expect(
      redirectLegacyGameToApk(
        Promise.resolve({ locale: "th", gameId: "dragon-flight" }),
      ),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(redirect).toHaveBeenCalledWith("/th/student/games/apk/dragon-flight");
    expect(notFound).not.toHaveBeenCalled();
  });

  it("uses the not-found boundary for an unknown leftover game id", async () => {
    await expect(
      redirectLegacyGameToApk(
        Promise.resolve({ locale: "en", gameId: "not-a-catalog-title" }),
      ),
    ).rejects.toThrow("NEXT_NOT_FOUND");

    expect(notFound).toHaveBeenCalledTimes(1);
    expect(redirect).not.toHaveBeenCalled();
  });
});
