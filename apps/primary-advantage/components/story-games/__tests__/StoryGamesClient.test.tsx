// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("@reading-advantage/advantage-play-kit-3d/react", () => ({
  StoryGameHost: ({ story, cartridge }: { story: { id: string }; cartridge: { manifest: { id: string } } }) => (
    <div data-testid="host" data-story={story.id} data-game={cartridge.manifest.id} />
  ),
}));

vi.mock("@reading-advantage/game-cartridges-3d", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@reading-advantage/game-cartridges-3d")>();
  return { ...actual, GAMES: actual.GAMES.map((g) => ({ ...g, load: async () => ({ manifest: g.manifest }) })) };
});

import { gamesFor, StoryGamesClient } from "../StoryGamesClient";

const assets = join(process.cwd(), "..", "..", "packages", "game-cartridges-3d", "assets", "stories");
const read = (path: string): string => readFileSync(join(assets, path), "utf8");

function stubFetch() {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      const rel = url.replace(/^\/stories\//, "");
      return new Response(read(rel), { status: 200 });
    }),
  );
}

afterEach(() => vi.unstubAllGlobals());

describe("gamesFor", () => {
  it("lists every playable game when no story is chosen", () => {
    expect(gamesFor(null).map((g) => g.id)).toContain("potion-rush");
    expect(gamesFor(null).length).toBeGreaterThanOrEqual(8);
  });
});

describe("StoryGamesClient", () => {
  it("lists the stories, then the games a chosen story fits, then plays one", async () => {
    stubFetch();
    render(<StoryGamesClient />);
    const stories = await screen.findAllByRole("button", { pressed: false });
    expect(stories.length).toBeGreaterThan(3);
    fireEvent.click(stories[0]!);
    await screen.findByText("chooseGame");
    const gameButtons = await waitFor(() => {
      const found = screen.getAllByRole("button").filter((b) => b.textContent?.match(/Potion Rush|Labyrinth|Rune Match|Dragon/));
      expect(found.length).toBeGreaterThan(0);
      return found;
    });
    fireEvent.click(gameButtons[0]!);
    const host = await screen.findByTestId("host");
    expect(host).toHaveAttribute("data-story");
    expect(host).toHaveAttribute("data-game");
  });
});
