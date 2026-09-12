import { createPaladinsTwinSoulState, tickPaladinsTwinSoul, calculateXP } from "./paladinsTwinSoul";
import { GAME_WIDTH, PALADINS_TWIN_SOUL_CONFIG } from "./paladinsTwinSoulConfig";

describe("paladinsTwinSoul logic", () => {
  const sampleVocab = [
    { term: "Run", translation: "Correr" },
    { term: "Jump", translation: "Saltar" },
  ];

  describe("createPaladinsTwinSoulState", () => {
    it("initializes player at center", () => {
      const state = createPaladinsTwinSoulState(sampleVocab);
      expect(state.player.x).toBe(GAME_WIDTH / 2);
    });

    it("initializes correct number of enemies", () => {
      const state = createPaladinsTwinSoulState(sampleVocab);
      const expectedEnemies = PALADINS_TWIN_SOUL_CONFIG.enemy.rows * PALADINS_TWIN_SOUL_CONFIG.enemy.cols;
      expect(state.enemies.length).toBe(expectedEnemies);
    });
  });

  describe("tickPaladinsTwinSoul movement", () => {
    it("moves player left and right", () => {
      let state = createPaladinsTwinSoulState(sampleVocab);
      const initialX = state.player.x;
      
      // Move right
      state = tickPaladinsTwinSoul(state, 100, { dx: 1 });
      expect(state.player.x).toBeGreaterThan(initialX);
      
      // Move left
      const xBeforeLeft = state.player.x;
      state = tickPaladinsTwinSoul(state, 100, { dx: -1 });
      expect(state.player.x).toBeLessThan(xBeforeLeft);
    });

    it("clamps player within boundaries", () => {
      let state = createPaladinsTwinSoulState(sampleVocab);
      
      // Move far left
      for(let i=0; i<100; i++) state = tickPaladinsTwinSoul(state, 100, { dx: -1 });
      expect(state.player.x).toBeGreaterThanOrEqual(20);
      
      // Move far right
      for(let i=0; i<100; i++) state = tickPaladinsTwinSoul(state, 100, { dx: 1 });
      expect(state.player.x).toBeLessThanOrEqual(GAME_WIDTH - 20);
    });
  });

  describe("tickPaladinsTwinSoul shooting", () => {
    it("fires bullets at a controlled rate", () => {
      let state = createPaladinsTwinSoulState(sampleVocab);
      
      // First tick should fire
      state = tickPaladinsTwinSoul(state, 16);
      expect(state.bullets.length).toBe(1);
      
      // Immediate next tick should not fire (too soon)
      state = tickPaladinsTwinSoul(state, 16);
      expect(state.bullets.length).toBe(1);
      
      // After fireRate ms, should fire again
      state = tickPaladinsTwinSoul(state, PALADINS_TWIN_SOUL_CONFIG.player.fireRate);
      expect(state.bullets.length).toBe(2);
    });

    it("moves bullets upward", () => {
      let state = createPaladinsTwinSoulState(sampleVocab);
      state = tickPaladinsTwinSoul(state, 16); // fire
      const initialY = state.bullets[0].y;
      
      state = tickPaladinsTwinSoul(state, 16); // move
      expect(state.bullets[0].y).toBeLessThan(initialY);
    });

    it("removes bullets when they leave the screen", () => {
      let state = createPaladinsTwinSoulState(sampleVocab);
      state = tickPaladinsTwinSoul(state, 16); // fire
      state.bullets[0].y = -60; // force off screen (threshold is -50)
      
      state = tickPaladinsTwinSoul(state, 16);
      expect(state.bullets.length).toBe(0);
    });
  });

  describe("tickPaladinsTwinSoul enemies", () => {
    it("moves enemies side to side", () => {
      let state = createPaladinsTwinSoulState(sampleVocab);
      const initialX = state.enemies[0].x;
      
      state = tickPaladinsTwinSoul(state, 100);
      expect(state.enemies[0].x).not.toBe(initialX);
    });

    it("destroys enemy when hit by bullet", () => {
      let state = createPaladinsTwinSoulState(sampleVocab);
      const enemyId = state.enemies[0].id;
      // Disable auto-fire
      state.player.lastFireTime = 1000000;
      
      // Place bullet on top of enemy
      state.bullets.push({
        id: "test-bullet",
        x: state.enemies[0].x,
        y: state.enemies[0].y,
        isPlayer: true,
      });
      
      state = tickPaladinsTwinSoul(state, 16);
      expect(state.enemies.find(e => e.id === enemyId)).toBeUndefined();
      expect(state.bullets.length).toBe(0);
      expect(state.score).toBeGreaterThan(0);
    });

    it("decreases player HP when hit by enemy (diving)", () => {
      let state = createPaladinsTwinSoulState(sampleVocab);
      state.player.hp = 3;
      
      // Place diving enemy on top of player
      state.enemies[0].isDiving = true;
      state.enemies[0].x = state.player.x;
      state.enemies[0].y = PALADINS_TWIN_SOUL_CONFIG.player.y;
      
      state = tickPaladinsTwinSoul(state, 16);
      expect(state.player.hp).toBe(2);
    });
  });

  describe("tickPaladinsTwinSoul capture & rescue", () => {
    it("starts capture sequence when boss gargoyle dives", () => {
      let state = createPaladinsTwinSoulState(sampleVocab);
      // Force boss to start capturing
      const boss = state.enemies.find(e => e.type === "boss")!;
      boss.isCapturing = true;
      boss.x = state.player.x;
      boss.y = PALADINS_TWIN_SOUL_CONFIG.player.y - 100;
      
      state = tickPaladinsTwinSoul(state, 16);
      // If player is under boss during capture, they should be captured
      expect(state.player.isCaptured).toBe(true);
      expect(state.enemies.find(e => e.hasCapturedPlayer)).toBeDefined();
    });

    it("rescues twin soul when the capturing enemy is hit", () => {
      let state = createPaladinsTwinSoulState(sampleVocab);
      const boss = state.enemies.find(e => e.type === "boss")!;
      boss.hasCapturedPlayer = true;
      state.player.isCaptured = true;
      state.player.lastFireTime = 1000000;
      
      // Place bullet on the capturing boss
      state.bullets.push({
        id: "rescue-bullet",
        x: boss.x,
        y: boss.y,
        isPlayer: true,
      });
      
      state = tickPaladinsTwinSoul(state, 16);
      
      // Capturing boss should be destroyed, player should have twin soul
      expect(state.enemies.find(e => e.id === boss.id)).toBeUndefined();
      expect(state.player.hasTwinSoul).toBe(true);
      expect(state.player.isCaptured).toBe(false);
    });

    it("assigns correct vocabulary to capturing enemy and distractors to others", () => {
      let state = createPaladinsTwinSoulState(sampleVocab);
      const boss = state.enemies.find(e => e.type === "boss")!;
      
      // Force capture
      boss.isCapturing = true;
      boss.x = state.player.x;
      boss.y = PALADINS_TWIN_SOUL_CONFIG.player.y - 100;
      state = tickPaladinsTwinSoul(state, 16);
      
      // When captured, enemies should be assigned words
      const targetEnemy = state.enemies.find(e => e.hasCapturedPlayer)!;
      expect(targetEnemy.term).toBe(sampleVocab[0].term);
      
      // Other enemies should have words (distractors)
      const otherEnemy = state.enemies.find(e => !e.hasCapturedPlayer)!;
      expect(otherEnemy.term).toBeDefined();
    });

    it("advances to next wave when all enemies are destroyed", () => {
      let state = createPaladinsTwinSoulState(sampleVocab);
      state.enemies = []; // Clear all enemies
      
      state = tickPaladinsTwinSoul(state, 16);
      expect(state.wave).toBe(2);
      expect(state.targetWordIndex).toBe(1);
      expect(state.enemies.length).toBeGreaterThan(0);
      expect(state.correctAnswers).toBe(1);
      expect(state.totalAttempts).toBe(1);
    });
  });

  describe("calculateXP", () => {
    it("returns 0 when no attempts", () => {
      const xp = calculateXP({ correctWords: 0, totalAttempts: 0, lives: 3, initialLives: 3, gameTime: 0 });
      expect(xp).toBe(0);
    });

    it("calculates base XP from correct words", () => {
      const xp = calculateXP({ correctWords: 5, totalAttempts: 5, lives: 3, initialLives: 3, gameTime: 60000 });
      expect(xp).toBe(8); // 5 base + 2 perfect accuracy + 1 survival
    });

    it("adds perfect accuracy bonus", () => {
      const xpWithoutBonus = calculateXP({ correctWords: 3, totalAttempts: 4, lives: 3, initialLives: 3, gameTime: 60000 });
      const xpWithBonus = calculateXP({ correctWords: 3, totalAttempts: 3, lives: 3, initialLives: 3, gameTime: 60000 });
      expect(xpWithBonus).toBe(xpWithoutBonus + 2);
    });

    it("adds survival bonus for >= 50% health", () => {
      const xpLowHealth = calculateXP({ correctWords: 3, totalAttempts: 3, lives: 1, initialLives: 3, gameTime: 60000 });
      const xpHighHealth = calculateXP({ correctWords: 3, totalAttempts: 3, lives: 2, initialLives: 3, gameTime: 60000 });
      expect(xpHighHealth).toBe(xpLowHealth + 1);
    });

    it("adds speed bonus for under 30s", () => {
      const xpSlow = calculateXP({ correctWords: 3, totalAttempts: 3, lives: 3, initialLives: 3, gameTime: 60000 });
      const xpFast = calculateXP({ correctWords: 3, totalAttempts: 3, lives: 3, initialLives: 3, gameTime: 10000 });
      expect(xpFast).toBe(xpSlow + 1);
    });

    it("caps XP at 10", () => {
      const xp = calculateXP({ correctWords: 15, totalAttempts: 15, lives: 3, initialLives: 3, gameTime: 10000 });
      expect(xp).toBe(10);
    });
  });
});
