import { REALM_CARVER_CONFIG, GAME_WIDTH, GAME_HEIGHT, GRID_SIZE } from "./realmCarverConfig";

describe("RealmCarverConfig", () => {
  it("has the correct baseline dimensions", () => {
    expect(GAME_WIDTH).toBe(390);
    expect(GAME_HEIGHT).toBe(600);
    expect(GRID_SIZE).toBe(100);
  });

  it("has required configuration objects", () => {
    expect(REALM_CARVER_CONFIG.player).toBeDefined();
    expect(REALM_CARVER_CONFIG.monster).toBeDefined();
    expect(REALM_CARVER_CONFIG.word).toBeDefined();
    expect(REALM_CARVER_CONFIG.colors).toBeDefined();
  });

  it("has valid colors", () => {
    expect(REALM_CARVER_CONFIG.colors.wild).toMatch(/^#/);
    expect(REALM_CARVER_CONFIG.colors.claimed).toMatch(/^#/);
    expect(REALM_CARVER_CONFIG.colors.trail).toMatch(/^#/);
  });
});
