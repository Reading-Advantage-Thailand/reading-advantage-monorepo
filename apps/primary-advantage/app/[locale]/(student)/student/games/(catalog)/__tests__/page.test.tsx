// @vitest-environment jsdom
// The identity next-intl/server mock stays: the page is a server component and every assertion here is structural (link counts, hrefs, owner scoping), not user-facing copy.

import "@testing-library/jest-dom/vitest";
import { render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  catalog: [
    {
      id: "dragon-flight",
      title: "Dragon Flight",
      description: "Fly through gates.",
      inputMode: "vocabulary",
    },
    {
      id: "castle-defense",
      title: "Castle Defense",
      description: "Defend the castle.",
      inputMode: "sentence",
    },
  ] as Array<{ id: string; title: string; description: string; inputMode: string }>,
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({ children, href }: { children: ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("next-intl/server", () => ({
  getTranslations: async () => (key: string) => key,
}));

vi.mock("@reading-advantage/game-cartridges", () => ({
  CARTRIDGE_CHALLENGE_CAPABILITIES: { "dragon-flight": { version: "v1" } },
  getCartridgeCatalogEntry: (id: string) => id === "dragon-flight" ? { title: "Dragon Flight" } : undefined,
  cartridgeCatalog: mocks.catalog,
}));

vi.mock("@reading-advantage/advantage-play-kit/react", () => ({
  StudentRpgCatalogPanel: ({ ownerKey }: { ownerKey?: string }) => (
    <div data-testid="rpg-catalog" data-owner-key={ownerKey} />
  ),
  StudentChallengeCatalogPanel: (props: Record<string, unknown>) => (
    <div data-testid="challenge-catalog" data-props={JSON.stringify(props)} />
  ),
}));

vi.mock("@/lib/session", () => ({
  getCurrentUser: (...args: unknown[]) => mocks.getCurrentUser(...args),
}));

import PrimaryStudentGamesPage from "../page";

const FULL_CATALOG = [...mocks.catalog];
afterEach(() => {
  mocks.catalog.splice(0, mocks.catalog.length, ...FULL_CATALOG);
});

describe("Primary student games catalog", () => {
  it("lists every APK title and scopes rewards to the authenticated student", async () => {
    mocks.getCurrentUser.mockResolvedValue({ id: "student-7", role: "STUDENT", schoolId: "school-1" });
    render(await PrimaryStudentGamesPage({ params: Promise.resolve({ locale: "th" }) }));

    const gameLinks = screen.getAllByRole("link");
    expect(gameLinks).toHaveLength(2);
    expect(gameLinks.map((link) => link.getAttribute("href"))).toEqual([
      "/student/games/apk/dragon-flight",
      "/student/games/apk/castle-defense",
    ]);
    expect(gameLinks.map((link) => link.getAttribute("href")).join(" ")).not.toContain("/vocabulary/");
    expect(gameLinks.map((link) => link.getAttribute("href")).join(" ")).not.toContain("/sentence/");
    expect(screen.getByTestId("rpg-catalog")).toHaveAttribute("data-owner-key", "school-1:student-7");
    expect(JSON.parse(screen.getByTestId("challenge-catalog").getAttribute("data-props") ?? "{}")).toMatchObject({
      ownerKey: "school-1:student-7", locale: "th", games: { "dragon-flight": { title: "Dragon Flight", version: "v1" } },
    });
  });

  it("groups the games into word games and sentence games", async () => {
    mocks.getCurrentUser.mockResolvedValue(null);
    render(await PrimaryStudentGamesPage({ params: Promise.resolve({ locale: "en" }) }));

    const words = screen.getByRole("region", { name: "wordGames" });
    const sentences = screen.getByRole("region", { name: "sentenceGames" });
    expect(within(words).getByRole("link", { name: /Dragon Flight/ })).toHaveAttribute("href", "/student/games/apk/dragon-flight");
    expect(within(sentences).getByRole("link", { name: /Castle Defense/ })).toHaveAttribute("href", "/student/games/apk/castle-defense");
    expect(screen.queryByText(/Advantage Play Kit|APK route/)).not.toBeInTheDocument();
  });

  it("shows an empty state when the catalog has no games", async () => {
    mocks.getCurrentUser.mockResolvedValue(null);
    mocks.catalog.splice(0, mocks.catalog.length);
    render(await PrimaryStudentGamesPage({ params: Promise.resolve({ locale: "en" }) }));

    expect(screen.getByText("empty")).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "wordGames" })).not.toBeInTheDocument();
  });
});
