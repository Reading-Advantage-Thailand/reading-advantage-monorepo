const ORIGINAL_BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH;

export {};

async function loadGameCards(basePath?: string) {
  if (typeof basePath === "string") {
    process.env.NEXT_PUBLIC_BASE_PATH = basePath;
  } else {
    delete process.env.NEXT_PUBLIC_BASE_PATH;
  }
  jest.resetModules();
  const gameCardsModule = await import("./gameCards");
  return gameCardsModule.gameCards;
}

afterEach(() => {
  if (typeof ORIGINAL_BASE_PATH === "string") {
    process.env.NEXT_PUBLIC_BASE_PATH = ORIGINAL_BASE_PATH;
  } else {
    delete process.env.NEXT_PUBLIC_BASE_PATH;
  }
  jest.resetModules();
});

describe("gameCards", () => {
  it("contains playable cards with routes", async () => {
    const gameCards = await loadGameCards();
    const playable = gameCards.filter((card) => card.status === "playable");

    expect(playable.map((card) => card.id)).toEqual(
      expect.arrayContaining([
        "magic-defense",
        "rpg-battle",
        "dragon-flight",
        "wizard-vs-zombie",
        "rune-match",
      ]),
    );
    playable.forEach((card) => {
      expect(card.href).toMatch(/^\/games\//);
    });
  });

  it("uses the configured base path for cover images", async () => {
    const gameCards = await loadGameCards("/vocab");

    gameCards.forEach((card) => {
      expect(card.cover.startsWith("/vocab/games/cover/")).toBe(true);
    });
  });

  it("uses unique identifiers for cards", async () => {
    const gameCards = await loadGameCards();
    const ids = gameCards.map((card) => card.id);

    expect(new Set(ids).size).toBe(ids.length);
  });
});
