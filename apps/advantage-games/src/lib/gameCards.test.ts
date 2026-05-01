const ORIGINAL_BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH;

async function loadGameCards(basePath?: string) {
  if (typeof basePath === 'string') {
    process.env.NEXT_PUBLIC_BASE_PATH = basePath;
  } else {
    delete process.env.NEXT_PUBLIC_BASE_PATH;
  }
  jest.resetModules();
  const gameCardsModule = await import('./gameCards');
  return gameCardsModule.gameCards;
}

afterEach(() => {
  if (typeof ORIGINAL_BASE_PATH === 'string') {
    process.env.NEXT_PUBLIC_BASE_PATH = ORIGINAL_BASE_PATH;
  } else {
    delete process.env.NEXT_PUBLIC_BASE_PATH;
  }
  jest.resetModules();
});

describe('gameCards', () => {
  it('contains playable cards with routes', async () => {
    const gameCards = await loadGameCards();
    const playable = gameCards.filter((card) => card.status === 'playable');

    expect(playable.map((card) => card.id)).toEqual(
      expect.arrayContaining([
        'magic-defense',
        'rpg-battle',
        'dragon-flight',
        'wizard-vs-zombie',
        'rune-match',
        'enchanted-library',
      ])
    );
    playable.forEach((card) => {
      expect(card.href).toMatch(/^\/([a-z]{2}\/)?student\/games\//);
    });
  });

  it('uses the configured base path for cover images', async () => {
    const gameCards = await loadGameCards('/vocab');

    gameCards.forEach((card) => {
      expect(card.cover.startsWith('/vocab/games/')).toBe(true);
    });
  });

  it('uses unique identifiers for cards', async () => {
    const gameCards = await loadGameCards();
    const ids = gameCards.map((card) => card.id);

    expect(new Set(ids).size).toBe(ids.length);
  });

  it('marks only implemented games as playable', async () => {
    const gameCards = await loadGameCards();
    const fs = await import('fs');
    const path = await import('path');

    const playableCards = gameCards.filter((card) => card.status === 'playable');
    const missingGames: string[] = [];

    playableCards.forEach((card) => {
      const gameId = card.id;
      const componentPath = path.join(process.cwd(), 'src/components/games', gameId.includes('vocabulary') || gameId === 'dragon-flight' || gameId === 'rpg-battle' || gameId === 'magic-defense' || gameId === 'wizard-vs-zombie' || gameId === 'rune-match' || gameId === 'archers-revenge' ? 'vocabulary' : 'sentence', gameId);
      const logicPath = path.join(process.cwd(), 'src/lib/games');
      
      const hasComponent = fs.existsSync(componentPath);
      const logicFiles = fs.readdirSync(logicPath).filter((f: string) => f.toLowerCase().includes(gameId.toLowerCase().replace(/-/g, '')));
      const hasLogic = logicFiles.length > 0;

      if (!(hasComponent || hasLogic)) {
        missingGames.push(gameId);
      }
    });

    expect(missingGames).toEqual([]);
  });
});
