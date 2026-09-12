import { render, screen } from "@testing-library/react";
import { notFound } from "next/navigation";

import AuthenticatedApkPage from "./page";

const mockGetCartridgeCatalogEntry = jest.fn();
const mockCookies = jest.fn();
const mockValidateSession = jest.fn();

jest.mock("next/navigation", () => ({ notFound: jest.fn() }));
jest.mock("next/headers", () => ({ cookies: (...args: unknown[]) => mockCookies(...args) }));
jest.mock("@reading-advantage/auth", () => ({
  SESSION_COOKIE_NAME: "session_token",
  validateSession: (...args: unknown[]) => mockValidateSession(...args),
}));
jest.mock("@reading-advantage/db", () => ({ db: { kind: "mock-db" } }));
jest.mock("@reading-advantage/game-cartridges", () => ({
  getCartridgeCatalogEntry: (...args: unknown[]) => mockGetCartridgeCatalogEntry(...args),
}));
jest.mock("@/components/apk/AuthenticatedCartridgeHost", () => ({
  AuthenticatedCartridgeHost: ({
    cartridgeId,
    inputMode,
    locale,
    contentLocale,
    ownerKey,
    challengeId,
  }: {
    cartridgeId: string;
    inputMode: string;
    locale: string;
    contentLocale: string;
    ownerKey?: string;
    challengeId?: string;
  }) => (
    <div data-testid="authenticated-cartridge-host">
      {cartridgeId}:{inputMode}:locale={locale}:content={contentLocale}:owner={ownerKey ?? "none"}:challenge={challengeId ?? "none"}
    </div>
  ),
}));

describe("AuthenticatedApkPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCookies.mockResolvedValue({ get: jest.fn().mockReturnValue(undefined) });
    mockValidateSession.mockResolvedValue(null);
  });

  it("passes the validated student identity to the authenticated client host", async () => {
    mockGetCartridgeCatalogEntry.mockReturnValue({
      id: "wizard-vs-zombie",
      title: "Wizard vs. Zombie",
      description: "Defend the ward.",
      inputMode: "vocabulary",
    });
    mockCookies.mockResolvedValue({
      get: jest.fn().mockReturnValue({ value: "opaque-session" }),
    });
    mockValidateSession.mockResolvedValue({
      user: { id: "student-7", role: "STUDENT", schoolId: "school-1" },
    });

    render(await AuthenticatedApkPage({
      params: Promise.resolve({ locale: "en", cartridgeId: "wizard-vs-zombie" }),
    }));

    expect(mockValidateSession).toHaveBeenCalledWith({ kind: "mock-db" }, "opaque-session");
    expect(screen.getByTestId("authenticated-cartridge-host")).toHaveTextContent("owner=school-1:student-7");
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

  it("passes one validated challenge identifier to the authenticated host", async () => {
    const challengeId = "11111111-1111-4111-8111-111111111111";
    mockGetCartridgeCatalogEntry.mockReturnValue({
      id: "wizard-vs-zombie",
      title: "Wizard vs. Zombie",
      description: "Defend the ward.",
      inputMode: "vocabulary",
    });

    render(await AuthenticatedApkPage({
      params: Promise.resolve({ locale: "en", cartridgeId: "wizard-vs-zombie" }),
      searchParams: Promise.resolve({ challengeId }),
    }));

    expect(screen.getByTestId("authenticated-cartridge-host")).toHaveTextContent(
      `challenge=${challengeId}`,
    );
  });

  it.each([
    ["malformed", "not-a-uuid"],
    ["multiple", [
      "11111111-1111-4111-8111-111111111111",
      "22222222-2222-4222-8222-222222222222",
    ]],
  ])("uses the not-found boundary for a %s challenge identifier", async (_label, challengeId) => {
    mockGetCartridgeCatalogEntry.mockReturnValue({
      id: "wizard-vs-zombie",
      title: "Wizard vs. Zombie",
      description: "Defend the ward.",
      inputMode: "vocabulary",
    });
    (notFound as jest.Mock).mockImplementation(() => {
      throw new Error("NEXT_NOT_FOUND");
    });

    await expect(AuthenticatedApkPage({
      params: Promise.resolve({ locale: "en", cartridgeId: "wizard-vs-zombie" }),
      searchParams: Promise.resolve({ challengeId }),
    })).rejects.toThrow("NEXT_NOT_FOUND");
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
