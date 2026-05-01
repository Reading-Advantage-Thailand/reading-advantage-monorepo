import { PALADINS_TWIN_SOUL_CONFIG, GAME_WIDTH, GAME_HEIGHT } from "./paladinsTwinSoulConfig";

describe("PaladinsTwinSoulConfig", () => {
  it("has the correct baseline dimensions", () => {
    expect(GAME_WIDTH).toBe(390);
    expect(GAME_HEIGHT).toBe(844);
  });

  it("has required configuration objects", () => {
    expect(PALADINS_TWIN_SOUL_CONFIG.player).toBeDefined();
    expect(PALADINS_TWIN_SOUL_CONFIG.enemy).toBeDefined();
    expect(PALADINS_TWIN_SOUL_CONFIG.colors).toBeDefined();
  });

  it("has valid colors", () => {
    expect(PALADINS_TWIN_SOUL_CONFIG.colors.background).toMatch(/^#/);
    expect(PALADINS_TWIN_SOUL_CONFIG.colors.player).toMatch(/^#/);
    expect(PALADINS_TWIN_SOUL_CONFIG.colors.enemy).toMatch(/^#/);
  });
});
