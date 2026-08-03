import { fireEvent, render, screen, within } from "@testing-library/react";

const mockPush = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock("@/locales/client", () => ({
  useScopedI18n: () => (key: string) => key,
}));

import GamesPage from "@/app/[locale]/(student)/student/games/page";

const CUTOVER_GAME_HREF: Record<string, string> = {
  "vocabulary/magic-defense": "/student/host-proof/games?gameType=magic-defense",
  "vocabulary/rune-match": "/student/host-proof/games?gameType=rune-match",
  "vocabulary/wizard-vs-zombie": "/student/host-proof/games?gameType=wizard-vs-zombie",
  "vocabulary/dragon-flight": "/student/host-proof/games?gameType=dragon-flight",
  "vocabulary/dragon-rider": "/student/host-proof/dragon-rider",
  "vocabulary/enchanted-library": "/student/host-proof/games?gameType=enchanted-library",
  "sentence/castle-defense": "/student/host-proof/games?gameType=castle-defense",
  "sentence/potion-rush": "/student/host-proof/games?gameType=potion-rush",
};

const GAME_TITLE_KEY: Record<string, string> = {
  "vocabulary/magic-defense": "games.magicDefense.title",
  "vocabulary/rpg-battle": "games.rpgBattle.title",
  "vocabulary/rune-match": "games.runeMatch.title",
  "vocabulary/wizard-vs-zombie": "games.wizardVsZombie.title",
  "vocabulary/dragon-flight": "games.dragonFlight.title",
  "vocabulary/dragon-rider": "games.dragonRider.title",
  "vocabulary/enchanted-library": "games.enchantedLibrary.title",
  "sentence/castle-defense": "games.castleDefense.title",
  "sentence/potion-rush": "games.potionRush.title",
};

/** Returns the translation key rendered for a scoped games-hub key. */
function scopedKey(key: string): string {
  return key;
}

/** Returns the card element for a game id, located via its title. */
function cardFor(gameId: string): HTMLElement {
  const title = screen.getByText(scopedKey(GAME_TITLE_KEY[gameId]!));
  const card = title.closest(".group") as HTMLElement | null;
  expect(card).not.toBeNull();
  return card as HTMLElement;
}

/** Returns the Play Now button inside the card for a game id. */
function playNowButtonFor(gameId: string): HTMLElement {
  return within(cardFor(gameId)).getByRole("button", {
    name: scopedKey("playNow"),
  });
}

describe("Student games hub navigation", () => {
  beforeEach(() => {
    mockPush.mockClear();
  });

  it("pushes host-proof hrefs when cutover game cards are clicked", () => {
    render(<GamesPage />);
    for (const [gameId, href] of Object.entries(CUTOVER_GAME_HREF)) {
      mockPush.mockClear();
      fireEvent.click(cardFor(gameId));
      expect(mockPush).toHaveBeenCalledWith(href);
    }
  });

  it("pushes host-proof hrefs when cutover Play Now buttons are clicked", () => {
    render(<GamesPage />);
    for (const [gameId, href] of Object.entries(CUTOVER_GAME_HREF)) {
      mockPush.mockClear();
      fireEvent.click(playNowButtonFor(gameId));
      expect(mockPush).toHaveBeenCalledWith(href);
    }
  });

  it("pushes the legacy route for a surviving game id", () => {
    render(<GamesPage />);
    mockPush.mockClear();
    fireEvent.click(cardFor("vocabulary/rpg-battle"));
    expect(mockPush).toHaveBeenCalledWith("/student/games/vocabulary/rpg-battle");
    mockPush.mockClear();
    fireEvent.click(playNowButtonFor("vocabulary/rpg-battle"));
    expect(mockPush).toHaveBeenCalledWith("/student/games/vocabulary/rpg-battle");
  });
});
