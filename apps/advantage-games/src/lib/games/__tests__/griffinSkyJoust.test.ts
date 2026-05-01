import { createGriffinSkyJoustState, tickGriffinSkyJoust, flap, startGame, calculateXP } from '../griffinSkyJoust';
import { GRIFFIN_SKY_JOUST_CONFIG } from '../griffinSkyJoustConfig';

const mockVocabulary = [
  { term: 'the cat sits', translation: 'แมวนั่ง' },
];

describe('griffinSkyJoust', () => {
  describe('createGriffinSkyJoustState', () => {
    it('should create initial state with vocabulary', () => {
      const state = createGriffinSkyJoustState(mockVocabulary);
      expect(state.status).toBe('start');
      expect(state.words).toEqual(['the', 'cat', 'sits']);
      expect(state.enemies.length).toBe(3);
      expect(state.player.hp).toBe(3);
    });

    it('should throw error with empty vocabulary', () => {
      expect(() => createGriffinSkyJoustState([])).toThrow();
    });
  });

  describe('startGame', () => {
    it('should transition to playing phase', () => {
      const state = createGriffinSkyJoustState(mockVocabulary);
      const started = startGame(state);
      expect(started.status).toBe('playing');
    });
  });

  describe('flap', () => {
    it('should apply upward impulse and horizontal drift', () => {
      let state = createGriffinSkyJoustState(mockVocabulary);
      state = startGame(state);
      const flapped = flap(state, 1);
      expect(flapped.player.vy).toBe(GRIFFIN_SKY_JOUST_CONFIG.difficulties.medium.flapImpulse);
      expect(flapped.player.vx).toBe(GRIFFIN_SKY_JOUST_CONFIG.difficulties.medium.horizontalSpeed);
    });

    it('should not flap if not playing', () => {
      const state = createGriffinSkyJoustState(mockVocabulary);
      const flapped = flap(state, 1);
      expect(flapped.player.vy).toBe(0);
    });
  });

  describe('tickGriffinSkyJoust', () => {
    it('should apply gravity to player', () => {
      let state = createGriffinSkyJoustState(mockVocabulary);
      state = startGame(state);
      const ticked = tickGriffinSkyJoust(state, 100); // 100ms
      expect(ticked.player.vy).toBeGreaterThan(0);
      expect(ticked.player.y).toBeGreaterThan(state.player.y);
    });

    it('should wrap around horizontally', () => {
      let state = createGriffinSkyJoustState(mockVocabulary);
      state = startGame(state);
      state.player.x = 10;
      state.player.vx = -200;
      const ticked = tickGriffinSkyJoust(state, 100);
      expect(ticked.player.x).toBeGreaterThan(GRIFFIN_SKY_JOUST_CONFIG.gameWidth / 2);
    });

    it('should handle collision from above with correct word', () => {
      let state = createGriffinSkyJoustState(mockVocabulary);
      state = startGame(state);
      
      // Position player above first enemy
      const targetEnemy = state.enemies[0];
      state.player.x = targetEnemy.x;
      state.player.y = targetEnemy.y - 30; // Above
      state.player.vx = 0;
      state.player.vy = 100;
      
      const ticked = tickGriffinSkyJoust(state, 16);
      expect(ticked.correctAnswers).toBe(1);
      expect(ticked.targetIndex).toBe(1);
      expect(ticked.enemies.length).toBe(2);
    });

    it('should handle collision from above with wrong word', () => {
      let state = createGriffinSkyJoustState(mockVocabulary);
      state = startGame(state);
      
      // Position player above SECOND enemy (wrong order)
      const targetEnemy = state.enemies[1];
      state.player.x = targetEnemy.x;
      state.player.y = targetEnemy.y - 30;
      
      const ticked = tickGriffinSkyJoust(state, 16);
      expect(ticked.player.hp).toBe(2);
      expect(ticked.player.invincibleUntil).toBeGreaterThan(0);
    });

    it('should handle collision from below', () => {
      let state = createGriffinSkyJoustState(mockVocabulary);
      state = startGame(state);
      
      const targetEnemy = state.enemies[0];
      state.player.x = targetEnemy.x;
      state.player.y = targetEnemy.y + 10; // Below
      
      const ticked = tickGriffinSkyJoust(state, 16);
      expect(ticked.player.hp).toBe(2);
    });

    it('should trigger victory when all words collected', () => {
      let state = createGriffinSkyJoustState(mockVocabulary);
      state = startGame(state);
      state.targetIndex = 2; // Last word
      
      const targetEnemy = state.enemies[2];
      state.player.x = targetEnemy.x;
      state.player.y = targetEnemy.y - 30;
      
      const ticked = tickGriffinSkyJoust(state, 16);
      expect(ticked.status).toBe('victory');
    });

    it('should trigger defeat when HP reach zero', () => {
      let state = createGriffinSkyJoustState(mockVocabulary);
      state = startGame(state);
      state.player.hp = 1;
      
      const targetEnemy = state.enemies[0];
      state.player.x = targetEnemy.x;
      state.player.y = targetEnemy.y + 10; // Below
      
      const ticked = tickGriffinSkyJoust(state, 16);
      expect(ticked.status).toBe('defeat');
    });
  });

  describe('calculateXP', () => {
    it('should calculate XP with bonuses', () => {
      const state = createGriffinSkyJoustState(mockVocabulary);
      state.correctAnswers = 3;
      state.totalAttempts = 3;
      state.player.hp = 3;
      
      const xp = calculateXP(state);
      expect(xp).toBe(3 * 1 + 2 + 2); // 3 words + 2 accuracy + 2 survival
    });
  });
});
