import type { VocabularyItem } from "@/store/useGameStore";
import {
  createArchersRevengeState,
  tickArchersRevenge,
  fireArrow,
  calculateXP,
  GAME_WIDTH,
} from "./archersRevenge";
import { ARCHERS_REVENGE_CONFIG } from "./archersRevengeConfig";

describe("archersRevenge", () => {
  const mockVocabulary: VocabularyItem[] = [
    { term: "cat", translation: "แมว" },
    { term: "dog", translation: "หมา" },
    { term: "bird", translation: "นก" },
    { term: "fish", translation: "ปลา" },
    { term: "snake", translation: "งู" },
  ];

  describe("createArchersRevengeState", () => {
    it("should create initial state with default settings", () => {
      const state = createArchersRevengeState(mockVocabulary);
      expect(state.status).toBe("playing");
      expect(state.hp).toBe(3);
      expect(state.score).toBe(0);
      expect(state.wave).toBe(1);
    });

    it("should handle small vocabulary by repeating if necessary", () => {
      // Small vocab, but normal difficulty needs 15 enemies (5x3)
      const state = createArchersRevengeState(mockVocabulary, { difficulty: "normal" });
      expect(state.enemies.length).toBe(15);
    });
  });

  describe("fireArrow", () => {
    it("should add an arrow and update lastFireTime", () => {
      let state = createArchersRevengeState(mockVocabulary);
      state = fireArrow(state, 100);
      expect(state.arrows.length).toBe(1);
      expect(state.arrows[0].x).toBe(100);
      expect(state.lastFireTime).toBe(0); // initial gameTime is 0
    });

    it("should respect fire rate", () => {
      let state = createArchersRevengeState(mockVocabulary);
      state = fireArrow(state, 100);
      state = fireArrow(state, 200);
      expect(state.arrows.length).toBe(1); // Only one arrow fired because fireRateMs is 500
    });
  });

  describe("tickArchersRevenge", () => {
    it("should move enemies horizontally and vertically", () => {
      const state = createArchersRevengeState(mockVocabulary);
      const initialY = state.enemies[0].y;
      const initialX = state.enemies[0].x;
      
      const nextState = tickArchersRevenge(state, 1000); // 1 second
      
      expect(nextState.enemies[0].y).toBeGreaterThan(initialY);
      expect(nextState.enemies[0].x).not.toBe(initialX);
    });

    it("should change direction when hitting screen edge", () => {
      const state = createArchersRevengeState(mockVocabulary);
      // Force enemies to the edge
      state.enemies = state.enemies.map(e => ({ ...e, x: GAME_WIDTH - 15 }));
      state.formationDirection = 1;
      
      const nextState = tickArchersRevenge(state, 1000);
      expect(nextState.formationDirection).toBe(-1);
    });

    it("should handle collisions with correct enemy", () => {
      const state = createArchersRevengeState(mockVocabulary);
      const targetEnemy = state.enemies.find(e => !e.shieldUp)!;
      
      // Place an arrow right on the target enemy
      state.arrows = [{ id: "test-arrow", x: targetEnemy.x, y: targetEnemy.y, vy: -400 }];
      
      const nextState = tickArchersRevenge(state, 16);
      
      expect(nextState.enemies.find(e => e.id === targetEnemy.id)).toBeUndefined();
      expect(nextState.score).toBeGreaterThan(0);
      expect(nextState.combo).toBe(1);
    });

    it("should retaliate when hitting a shielded enemy", () => {
      const state = createArchersRevengeState(mockVocabulary);
      const shieldedEnemy = state.enemies.find(e => e.shieldUp)!;
      
      state.arrows = [{ id: "test-arrow", x: shieldedEnemy.x, y: shieldedEnemy.y, vy: -400 }];
      
      const nextState = tickArchersRevenge(state, 16);
      
      expect(nextState.enemies.find(e => e.id === shieldedEnemy.id)).toBeDefined();
      expect(nextState.enemyProjectiles.length).toBe(1);
      expect(nextState.combo).toBe(0);
    });

    it("should decrease HP when player hit by enemy projectile", () => {
      const state = createArchersRevengeState(mockVocabulary);
      state.playerX = 100;
      state.enemyProjectiles = [{ id: "p1", x: 100, y: ARCHERS_REVENGE_CONFIG.layout.playerY, vy: 200 }];
      
      const nextState = tickArchersRevenge(state, 16);
      expect(nextState.hp).toBe(state.hp - 1);
    });

    it("should end game when HP reaches 0", () => {
      const state = createArchersRevengeState(mockVocabulary);
      state.hp = 1;
      state.playerX = 100;
      state.enemyProjectiles = [{ id: "p1", x: 100, y: ARCHERS_REVENGE_CONFIG.layout.playerY, vy: 200 }];
      
      const nextState = tickArchersRevenge(state, 16);
      expect(nextState.status).toBe("defeat");
    });

    it("should change target after interval", () => {
      const state = createArchersRevengeState(mockVocabulary);
      // Fast forward time
      const nextState = tickArchersRevenge(state, 11000);
      expect(nextState.targetChangeTimer).toBe(7000);
    });

    it("should progress to next wave when all enemies are destroyed", () => {
      const state = createArchersRevengeState(mockVocabulary);
      const targetEnemy = state.enemies.find(e => !e.shieldUp)!;
      
      // Force only one enemy to exist
      state.enemies = [targetEnemy];
      state.arrows = [{ id: "test-arrow", x: targetEnemy.x, y: targetEnemy.y, vy: -400 }];
      
      const nextState = tickArchersRevenge(state, 16);
      
      expect(nextState.wave).toBe(2);
      expect(nextState.enemies.length).toBeGreaterThan(0);
    });
  });

  describe("calculateXP", () => {
    it("should return XP based on score and accuracy capped at 1-10", () => {
      const state = createArchersRevengeState(mockVocabulary);
      state.score = 1000;
      state.correctAnswers = 10;
      state.totalAttempts = 10; // 100% accuracy
      
      const xp = calculateXP(state);
      expect(xp).toBeGreaterThanOrEqual(1);
      expect(xp).toBeLessThanOrEqual(10);
    });

    it("should return at least 1 XP for minimal performance", () => {
      const state = createArchersRevengeState(mockVocabulary);
      state.score = 0;
      state.correctAnswers = 0;
      state.totalAttempts = 0;
      state.hp = 1;
      state.maxHp = 5;
      state.gameTime = 120000;
      
      const xp = calculateXP(state);
      expect(xp).toBe(1);
    });
  });
});
