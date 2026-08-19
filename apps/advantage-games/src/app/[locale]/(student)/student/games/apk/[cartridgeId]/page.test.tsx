import { render, screen } from "@testing-library/react";
import { notFound } from "next/navigation";

import AuthenticatedApkPage from "./page";

const mockGetCartridgeCatalogEntry = jest.fn();

jest.mock("next/navigation", () => ({ notFound: jest.fn() }));
jest.mock("@reading-advantage/game-cartridges", () => ({
  getCartridgeCatalogEntry: (...args: unknown[]) => mockGetCartridgeCatalogEntry(...args),
}));
jest.mock("@/components/apk/AuthenticatedCartridgeHost", () => ({
  AuthenticatedCartridgeHost: ({
    cartridgeId,
    inputMode,
    locale,
    contentLocale,
  }: {
    cartridgeId: string;
    inputMode: string;
    locale: string;
    contentLocale: string;
  }) => (
    <div data-testid="authenticated-cartridge-host">
      {cartridgeId}:{inputMode}:locale={locale}:content={contentLocale}
    </div>
  ),
}));

describe("AuthenticatedApkPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("launches a catalog cartridge with the route locale and matching content locale", async () => {
    mockGetCartridgeCatalogEntry.mockReturnValue({
      id: "astral-mage",
      title: "Astral Mage",
      description: "Cast sentence words in order.",
      inputMode: "sentence",
    });

    render(
      await AuthenticatedApkPage({
        params: Promise.resolve({ locale: "th", cartridgeId: "astral-mage" }),
      }),
    );

    expect(screen.getByTestId("authenticated-cartridge-host")).toHaveTextContent(
      "astral-mage:sentence:locale=th:content=th",
    );
  });

  it("keeps the Chinese route locale zh while requesting cn flashcard content", async () => {
    mockGetCartridgeCatalogEntry.mockReturnValue({
      id: "sorcerer-ziggurat",
      title: "The Sorcerer's Ziggurat",
      description: "Build sentences.",
      inputMode: "sentence",
    });

    render(
      await AuthenticatedApkPage({
        params: Promise.resolve({ locale: "zh", cartridgeId: "sorcerer-ziggurat" }),
      }),
    );

    expect(screen.getByTestId("authenticated-cartridge-host")).toHaveTextContent(
      "sorcerer-ziggurat:sentence:locale=zh:content=cn",
    );
  });

  it("uses the normal not-found boundary for an unknown cartridge", async () => {
    mockGetCartridgeCatalogEntry.mockReturnValue(undefined);
    (notFound as jest.Mock).mockImplementation(() => {
      throw new Error("NEXT_NOT_FOUND");
    });

    await expect(
      AuthenticatedApkPage({
        params: Promise.resolve({ locale: "en", cartridgeId: "unknown" }),
      }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
  });
});
