import { REALM_CARVER_CONFIG, GAME_WIDTH, GAME_HEIGHT, GRID_SIZE } from "../realmCarverConfig";

describe("realmCarverConfig", () => {
  it("has correct stage dimensions", () => {
    expect(GAME_WIDTH).toBe(390);
    expect(GAME_HEIGHT).toBe(600);
  });

  it("has logical grid size of 100", () => {
    expect(GRID_SIZE).toBe(100);
  });

  it("has player speed and health defined", () => {
    expect(REALM_CARVER_CONFIG.player.speed).toBeGreaterThan(0);
    expect(REALM_CARVER_CONFIG.player.initialHp).toBeGreaterThan(0);
  });

  it("has monsters defined with correct count", () => {
    expect(REALM_CARVER_CONFIG.monster.count).toBeGreaterThan(0);
    expect(REALM_CARVER_CONFIG.monster.speed).toBeGreaterThan(0);
  });

  it("has defined colors for all game states", () => {
    expect(REALM_CARVER_CONFIG.colors.wild).toMatch(/^#[0-9a-f]{6}$/i);
    expect(REALM_CARVER_CONFIG.colors.claimed).toMatch(/^#[0-9a-f]{6}$/i);
    expect(REALM_CARVER_CONFIG.colors.trail).toMatch(/^#[0-9a-f]{6}$/i);
  });
});
