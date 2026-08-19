import { render, screen } from "@testing-library/react";
import LoginPage, { resolveStudentRedirect } from "./page";

const mockGetCartridgeCatalogEntry = jest.fn();

jest.mock("@reading-advantage/game-cartridges", () => ({
  getCartridgeCatalogEntry: (...args: unknown[]) => mockGetCartridgeCatalogEntry(...args),
}));

jest.mock("@/features/auth/LoginForm", () => ({
  LoginForm: ({ redirectTo }: { redirectTo: string }) => (
    <form aria-label="Student sign in" data-redirect={redirectTo} />
  ),
}));

describe("login page", () => {
  beforeEach(() => {
    mockGetCartridgeCatalogEntry.mockImplementation((cartridgeId: string) => {
      if (cartridgeId === "dragon-flight" || cartridgeId === "astral-mage") {
        return { id: cartridgeId };
      }
      return undefined;
    });
  });

  it("identifies Advantage Games and preserves a valid APK redirect", async () => {
    render(await LoginPage({
      searchParams: Promise.resolve({
        redirect: "/en/student/games/apk/dragon-flight",
      }),
    }));

    expect(
      screen.getByRole("heading", { name: "Advantage Games" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("form", { name: "Student sign in" })).toHaveAttribute(
      "data-redirect",
      "/en/student/games/apk/dragon-flight",
    );
  });

  it.each([
    "/en/student/games/apk/dragon-flight",
    "/th/student/games/apk/astral-mage",
    "/zh/student/arcade/dragon-flight",
    "/en/student/games",
    "/th/student/games",
    "/zh/student/games",
  ])("keeps a safe student redirect %s", (value) => {
    expect(resolveStudentRedirect(value)).toBe(value);
  });

  it.each([
    "https://evil.example/steal",
    "//evil.example/steal",
    "/admin",
    "/en/student/arcade/not-a-cartridge",
    "/en/student/games/apk/not-a-cartridge",
  ])("rejects an unsafe redirect %s", (value) => {
    expect(resolveStudentRedirect(value)).toBe("/");
  });
});
