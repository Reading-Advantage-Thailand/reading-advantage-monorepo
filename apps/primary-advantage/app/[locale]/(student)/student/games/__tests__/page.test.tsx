// @vitest-environment jsdom
// The identity next-intl/server mock stays: the page is a server component and every assertion here is structural (link counts, hrefs, owner scoping), not user-facing copy.

import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getCurrentUser: vi.fn() }));

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
  cartridgeCatalog: [
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
  ],
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
});
