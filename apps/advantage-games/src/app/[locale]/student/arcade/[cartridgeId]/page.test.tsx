import { render, screen } from "@testing-library/react";
import { notFound } from "next/navigation";

import ArcadeCartridgePage from "./page";

const mockGetCartridgeCatalogEntry = jest.fn();

jest.mock("next/navigation", () => ({ notFound: jest.fn() }));
jest.mock("@reading-advantage/game-cartridges", () => ({
  getCartridgeCatalogEntry: (...args: unknown[]) => mockGetCartridgeCatalogEntry(...args),
}));
jest.mock("@/components/apk/PublicCartridgeHost", () => ({
  PublicCartridgeHost: ({
    cartridgeId,
    inputMode,
    locale,
    title,
  }: {
    cartridgeId: string;
    inputMode: string;
    locale?: string;
    title: string;
  }) => (
    <div data-testid="public-cartridge-host">{cartridgeId}:{inputMode}:{title}:{locale ?? ""}</div>
  ),
}));

describe("ArcadeCartridgePage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("loads a published cartridge through the generic public route", async () => {
    mockGetCartridgeCatalogEntry.mockReturnValue({
      id: "dragon-flight",
      title: "Dragon Flight",
      description: "Choose the correct gate.",
      inputMode: "vocabulary",
    });

    render(
      await ArcadeCartridgePage({
        params: Promise.resolve({ locale: "en", cartridgeId: "dragon-flight" }),
      }),
    );

    expect(mockGetCartridgeCatalogEntry).toHaveBeenCalledWith("dragon-flight");
    expect(screen.getByTestId("public-cartridge-host")).toHaveTextContent(
      "dragon-flight:vocabulary:Dragon Flight:en",
    );
  });

  it("uses the normal Next.js not-found boundary for an unknown cartridge", async () => {
    mockGetCartridgeCatalogEntry.mockReturnValue(undefined);
    (notFound as jest.Mock).mockImplementation(() => {
      throw new Error("NEXT_NOT_FOUND");
    });

    await expect(
      ArcadeCartridgePage({
        params: Promise.resolve({ locale: "en", cartridgeId: "unknown-cartridge" }),
      }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
  });
});
