
import {
  ARCHERS_REVENGE_CONFIG,
  getDifficultySettings,
} from "./archersRevengeConfig";

describe("archersRevengeConfig", () => {
  describe("ARCHERS_REVENGE_CONFIG", () => {
    it("should define player configuration", () => {
      expect(ARCHERS_REVENGE_CONFIG.player).toBeDefined();
      expect(ARCHERS_REVENGE_CONFIG.player.hp.easy).toBe(5);
      expect(ARCHERS_REVENGE_CONFIG.player.hp.medium).toBe(3);
      expect(ARCHERS_REVENGE_CONFIG.player.hp.hard).toBe(2);
    });

    it("should define arrow configuration", () => {
      expect(ARCHERS_REVENGE_CONFIG.arrow.speed).toBe(400);
      expect(ARCHERS_REVENGE_CONFIG.arrow.fireRateMs).toBe(500);
    });

    it("should define enemy formation configuration", () => {
      expect(ARCHERS_REVENGE_CONFIG.formation.columns).toBe(5);
      expect(ARCHERS_REVENGE_CONFIG.formation.rows.easy).toBe(2);
      expect(ARCHERS_REVENGE_CONFIG.formation.rows.medium).toBe(3);
      expect(ARCHERS_REVENGE_CONFIG.formation.rows.hard).toBe(4);
    });

    it("should define enemy movement configuration", () => {
      expect(ARCHERS_REVENGE_CONFIG.enemy.horizontalSpeed.easy).toBe(20);
      expect(ARCHERS_REVENGE_CONFIG.enemy.descendSpeed.easy).toBe(10);
      expect(ARCHERS_REVENGE_CONFIG.enemy.projectileSpeed).toBe(200);
    });

    it("should define scoring configuration", () => {
      expect(ARCHERS_REVENGE_CONFIG.scoring.basePointsPerEnemy).toBe(100);
      expect(ARCHERS_REVENGE_CONFIG.scoring.comboMultiplier).toBe(0.1);
    });

    it("should define layout configuration", () => {
      expect(ARCHERS_REVENGE_CONFIG.layout).toBeDefined();
      expect(ARCHERS_REVENGE_CONFIG.layout.enemySpacing.x).toBe(55);
      expect(ARCHERS_REVENGE_CONFIG.layout.enemySpacing.y).toBe(45);
      expect(ARCHERS_REVENGE_CONFIG.layout.enemySize.width).toBe(50);
      expect(ARCHERS_REVENGE_CONFIG.layout.enemySize.height).toBe(35);
    });
  });

  describe("getDifficultySettings", () => {
    it("should return easy settings", () => {
      const settings = getDifficultySettings("easy");
      expect(settings.playerHp).toBe(5);
      expect(settings.rows).toBe(2);
      expect(settings.enemySpeed).toBe(20);
      expect(settings.descendSpeed).toBe(10);
    });

    it("should return medium settings", () => {
      const settings = getDifficultySettings("medium");
      expect(settings.playerHp).toBe(3);
      expect(settings.rows).toBe(3);
      expect(settings.enemySpeed).toBe(35);
      expect(settings.descendSpeed).toBe(15);
    });

    it("should return hard settings", () => {
      const settings = getDifficultySettings("hard");
      expect(settings.playerHp).toBe(2);
      expect(settings.rows).toBe(4);
      expect(settings.enemySpeed).toBe(50);
      expect(settings.descendSpeed).toBe(25);
    });
  });
});
