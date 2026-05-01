import {
  CASTLE_CONFIG,
  GAME_CONSTANTS,
  SCALING_CONFIG,
  DIFFICULTY_SETTINGS,
  getInitialSettings,
} from "./magicDefenseConfig";

describe("magicDefenseConfig", () => {
  describe("CASTLE_CONFIG", () => {
    it("has correct sprite dimensions", () => {
      expect(CASTLE_CONFIG.columns).toBe(2);
      expect(CASTLE_CONFIG.rows).toBe(3);
      expect(CASTLE_CONFIG.spriteWidth).toBe(768);
      expect(CASTLE_CONFIG.spriteHeight).toBe(341);
      expect(CASTLE_CONFIG.scale).toBe(0.25);
    });

    it("calculates render dimensions correctly", () => {
      expect(CASTLE_CONFIG.renderWidth).toBe(768 * 0.25);
      expect(CASTLE_CONFIG.renderHeight).toBe(341 * 0.25);
    });

    it("has three castle positions", () => {
      expect(CASTLE_CONFIG.positions.left).toBe(20);
      expect(CASTLE_CONFIG.positions.center).toBe(50);
      expect(CASTLE_CONFIG.positions.right).toBe(80);
    });
  });

  describe("GAME_CONSTANTS", () => {
    it("has correct default values", () => {
      expect(GAME_CONSTANTS.timer).toBe(60);
      expect(GAME_CONSTANTS.missileSpawnXRange).toBe(25);
      expect(GAME_CONSTANTS.missileSpawnXOffset).toBe(37.5);
      expect(GAME_CONSTANTS.manaCostSpecial).toBe(100);
    });
  });

  describe("SCALING_CONFIG", () => {
    it("has correct scaling values", () => {
      expect(SCALING_CONFIG.spawnRateAdjustment).toBe(200);
      expect(SCALING_CONFIG.spawnRateLimit).toBe(3000);
      expect(SCALING_CONFIG.durationAdjustment).toBe(0.5);
      expect(SCALING_CONFIG.durationLimit).toBe(15);
    });
  });

  describe("DIFFICULTY_SETTINGS", () => {
    it("has all difficulty tiers", () => {
      expect(DIFFICULTY_SETTINGS.easy).toBeDefined();
      expect(DIFFICULTY_SETTINGS.medium).toBeDefined();
      expect(DIFFICULTY_SETTINGS.hard).toBeDefined();
      expect(DIFFICULTY_SETTINGS.extreme).toBeDefined();
    });

    it("easy has the slowest spawn rate", () => {
      expect(DIFFICULTY_SETTINGS.easy.spawnRate).toBe(6000);
      expect(DIFFICULTY_SETTINGS.easy.duration).toBe(20);
    });

    it("extreme has the fastest spawn rate", () => {
      expect(DIFFICULTY_SETTINGS.extreme.spawnRate).toBe(3000);
      expect(DIFFICULTY_SETTINGS.extreme.duration).toBe(8);
    });

    it("difficulty settings increase in difficulty", () => {
      const difficulties = ["easy", "medium", "hard", "extreme"] as const;
      for (let i = 1; i < difficulties.length; i++) {
        const prev = DIFFICULTY_SETTINGS[difficulties[i - 1]];
        const curr = DIFFICULTY_SETTINGS[difficulties[i]];
        expect(curr.spawnRate).toBeLessThanOrEqual(prev.spawnRate);
        expect(curr.duration).toBeLessThanOrEqual(prev.duration);
      }
    });
  });

  describe("getInitialSettings", () => {
    it("returns settings for each difficulty", () => {
      expect(getInitialSettings("easy")).toEqual(DIFFICULTY_SETTINGS.easy);
      expect(getInitialSettings("medium")).toEqual(DIFFICULTY_SETTINGS.medium);
      expect(getInitialSettings("hard")).toEqual(DIFFICULTY_SETTINGS.hard);
      expect(getInitialSettings("extreme")).toEqual(DIFFICULTY_SETTINGS.extreme);
    });

    it("defaults to medium for unknown difficulty", () => {
      expect(getInitialSettings("unknown" as any)).toEqual(
        DIFFICULTY_SETTINGS.medium,
      );
    });
  });
});
