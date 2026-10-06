// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next-intl", () => ({
  useLocale: () => "en",
  useTranslations: () => (key: string, values?: Record<string, unknown>) =>
    values ? `${key} ${JSON.stringify(values)}` : key,
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, className }: { href: string; children: ReactNode; className?: string }) => (
    <a href={href} className={className}>{children}</a>
  ),
}));

vi.mock("@reading-advantage/advantage-play-kit-3d/react", () => ({
  StoryGameHost: ({ input, cartridge, avatar }: { input: { id: string; vocabulary: unknown[] }; cartridge: { manifest: { id: string } }; avatar?: { classId: string } | null }) => (
    <div data-testid="host" data-input={input.id} data-words={input.vocabulary.length} data-game={cartridge.manifest.id} data-avatar={avatar ? avatar.classId : "none"} />
  ),
}));

vi.mock("@reading-advantage/game-cartridges-3d", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@reading-advantage/game-cartridges-3d")>();
  return { ...actual, GAMES: actual.GAMES.map((g) => ({ ...g, load: async () => ({ manifest: g.manifest }) })) };
});

import { gameCardsFor, practiceLocaleOf, StoryGamesClient } from "../StoryGamesClient";

const word = (n: number) => ({ id: `w${n}`, term: `word${n}`, translation: `คำ${n}` });
const sentence = (n: number) => ({ id: `s${n}`, text: `The cat sleeps ${n}.`, words: ["The", "cat", "sleeps", `${n}.`] });
const practice = (words: number, sentences: number) => ({
  schemaVersion: 1,
  id: "saved",
  level: "A1",
  vocabulary: Array.from({ length: words }, (_, i) => word(i)),
  sentences: Array.from({ length: sentences }, (_, i) => sentence(i)),
});

function stubPractice(body: unknown, status = 200) {
  const fetchMock = vi.fn(async () => new Response(JSON.stringify(body), { status }));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => vi.unstubAllGlobals());

describe("gameCardsFor", () => {
  it("opens every game when the student has enough saved items, and never lists Monster Encounters", () => {
    const cards = gameCardsFor(practice(10, 8));
    expect(cards.length).toBe(28);
    expect(cards.every((c) => c.missing.vocabulary === 0 && c.missing.sentences === 0)).toBe(true);
    expect(cards.map((c) => c.game.id)).not.toContain("monster-encounters");
  });

  it("locks every game, with the missing counts, when nothing is saved", () => {
    const cards = gameCardsFor(practice(0, 0));
    expect(cards.every((c) => c.missing.vocabulary + c.missing.sentences > 0)).toBe(true);
    expect(cards.find((c) => c.game.id === "potion-rush")?.missing).toEqual({ vocabulary: 0, sentences: 3 });
  });
});

describe("practiceLocaleOf", () => {
  it("uses the page language for translations, and Thai on an English page", () => {
    expect(practiceLocaleOf("vi")).toBe("vi");
    expect(practiceLocaleOf("en")).toBe("th");
  });
});

describe("StoryGamesClient", () => {
  it("loads the saved items, then plays an open game with them and the student's avatar", async () => {
    const fetchMock = stubPractice(practice(10, 8));
    const avatar = { catalogVersion: "1.0.0", classId: "knight", tints: { skin: "fair", hair: "brown", eyes: "blue", cloth: "sky" }, pieces: [] };
    render(<StoryGamesClient avatar={avatar as never} />);
    expect(await screen.findByText(/^saved /)).toHaveTextContent('saved {"words":10,"sentences":8}');
    expect(fetchMock).toHaveBeenCalledWith("/api/v1/apk/practice?locale=th");
    fireEvent.click(screen.getAllByRole("button").find((b) => b.textContent?.includes("Rune Match"))!);
    const host = await screen.findByTestId("host");
    expect(host).toHaveAttribute("data-input", "saved");
    expect(host).toHaveAttribute("data-words", "10");
    expect(host).toHaveAttribute("data-game", "rune-match");
    expect(host).toHaveAttribute("data-avatar", "knight");
  });

  it("plays with no avatar when the student has none, so the game keeps its hero", async () => {
    stubPractice(practice(10, 8));
    render(<StoryGamesClient />);
    await screen.findByText(/^saved /);
    fireEvent.click(screen.getAllByRole("button").find((b) => b.textContent?.includes("Rune Match"))!);
    expect(await screen.findByTestId("host")).toHaveAttribute("data-avatar", "none");
  });

  it("locks a game without enough saved items and links to the reading page", async () => {
    stubPractice(practice(10, 1));
    render(<StoryGamesClient />);
    const locked = await screen.findByTestId("locked-potion-rush");
    expect(locked).toHaveTextContent('needSentences {"count":2}');
    expect(within(locked).getByRole("link", { name: "readMore" })).toHaveAttribute("href", "/student/read");
    expect(screen.queryByTestId("locked-rune-match")).toBeNull();
  });

  it("shows an error when the saved items do not load", async () => {
    stubPractice({ error: { code: "UNAUTHORIZED" } }, 401);
    render(<StoryGamesClient />);
    expect(await screen.findByRole("alert")).toHaveTextContent("loadError");
  });
});
