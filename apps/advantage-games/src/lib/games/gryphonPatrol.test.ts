import { 
  createInitialGryphonPatrolState, 
  tickGryphonPatrol, 
  handleGryphonPatrolInput,
  spawnGryphonPatrolEnemies,
  hitGryphonPatrolEnemy,
  shootGryphonPatrolProjectile,
  calculateXP
} from './gryphonPatrol';
import { GRYPHON_PATROL_CONFIG } from './gryphonPatrolConfig';

describe('GryphonPatrol Logic', () => {
  const sentence = ['This', 'is', 'a', 'test'];

  it('should initialize with start status', () => {
    const state = createInitialGryphonPatrolState(sentence);
    expect(state.status).toBe('start');
  });

  it('should update time when playing', () => {
    let state = createInitialGryphonPatrolState(sentence);
    state.status = 'playing';
    state = tickGryphonPatrol(state, 1);
    expect(state.time).toBe(1);
  });

  describe('Movement & Wrap-around', () => {
    it('should move player based on velocity', () => {
      let state = createInitialGryphonPatrolState(sentence);
      state.status = 'playing';
      state.player.vx = 100;
      state.player.vy = 50;
      
      state = tickGryphonPatrol(state, 1);
      
      expect(state.player.x).toBe(100);
      expect(state.player.y).toBe(450);
    });

    it('should wrap around horizontally when exceeding mapWidth', () => {
      let state = createInitialGryphonPatrolState(sentence);
      state.status = 'playing';
      state.player.x = GRYPHON_PATROL_CONFIG.mapWidth - 10;
      state.player.vx = 20;
      
      state = tickGryphonPatrol(state, 1);
      
      expect(state.player.x).toBe(10);
    });

    it('should wrap around horizontally when below 0', () => {
      let state = createInitialGryphonPatrolState(sentence);
      state.status = 'playing';
      state.player.x = 10;
      state.player.vx = -20;
      
      state = tickGryphonPatrol(state, 1);
      
      expect(state.player.x).toBe(GRYPHON_PATROL_CONFIG.mapWidth - 10);
    });

    it('should clamp player vertically within game height', () => {
      let state = createInitialGryphonPatrolState(sentence);
      state.status = 'playing';
      state.player.y = 10;
      state.player.vy = -20;
      
      state = tickGryphonPatrol(state, 1);
      expect(state.player.y).toBeGreaterThanOrEqual(0);

      state.player.y = GRYPHON_PATROL_CONFIG.gameHeight - 10;
      state.player.vy = 20;
      state = tickGryphonPatrol(state, 1);
      expect(state.player.y).toBeLessThanOrEqual(GRYPHON_PATROL_CONFIG.gameHeight);
    });

    it('should apply friction to velocity', () => {
      let state = createInitialGryphonPatrolState(sentence);
      state.status = 'playing';
      state.player.vx = 100;
      state.player.vy = 100;
      
      state = tickGryphonPatrol(state, 1);
      
      expect(state.player.vx).toBeLessThan(100);
      expect(state.player.vy).toBeLessThan(100);
      expect(state.player.vx).toBe(100 * GRYPHON_PATROL_CONFIG.physics.friction);
    });

    it('should accelerate player based on input', () => {
      let state = createInitialGryphonPatrolState(sentence);
      state.status = 'playing';
      state.player.vx = 0;
      
      state = handleGryphonPatrolInput(state, { dx: 1, dy: 0 });
      
      expect(state.player.vx).toBe(GRYPHON_PATROL_CONFIG.player.speed);
    });
  });

  describe('Camera System', () => {
    it('should update cameraX based on player position', () => {
      let state = createInitialGryphonPatrolState(sentence);
      state.status = 'playing';
      state.player.x = 500;
      
      state = tickGryphonPatrol(state, 1);
      
      // Camera should center on player: player.x - gameWidth / 2
      expect(state.cameraX).toBe(500 - GRYPHON_PATROL_CONFIG.gameWidth / 2);
    });

    it('should wrap cameraX within map bounds', () => {
      let state = createInitialGryphonPatrolState(sentence);
      state.status = 'playing';
      state.player.x = 10;
      
      state = tickGryphonPatrol(state, 1);
      
      // 10 - 195 = -185. Wrapped: -185 + 2000 = 1815
      expect(state.cameraX).toBe(GRYPHON_PATROL_CONFIG.mapWidth + (10 - GRYPHON_PATROL_CONFIG.gameWidth / 2));
    });
  });

  describe('Enemies & Combat', () => {
    it('should initialize enemies with sentence words', () => {
      const state = createInitialGryphonPatrolState(sentence);
      expect(state.enemies.length).toBe(0);
    });

    it('should spawn enemies based on config', () => {
      let state = createInitialGryphonPatrolState(sentence);
      state = spawnGryphonPatrolEnemies(state);
      
      expect(state.enemies.length).toBe(GRYPHON_PATROL_CONFIG.enemy.count);
      expect(state.enemies[0].word).toBeDefined();
    });

    it('should spawn enemies at deterministic positions with injected RNG', () => {
      let state = createInitialGryphonPatrolState(sentence);
      const deterministicRng = () => 0.5;
      state = spawnGryphonPatrolEnemies(state, deterministicRng);
      
      expect(state.enemies.length).toBe(GRYPHON_PATROL_CONFIG.enemy.count);
      expect(state.enemies[0].x).toBe(0.5 * GRYPHON_PATROL_CONFIG.mapWidth);
      expect(state.enemies[0].y).toBe(100 + 0.5 * (GRYPHON_PATROL_CONFIG.gameHeight - 200));
    });

    it('should drop an orb when correct enemy is hit', () => {
      let state = createInitialGryphonPatrolState(sentence);
      state.status = 'playing';
      state.enemies = [{
        id: 'e1', x: 100, y: 100, vx: 0, vy: 0, size: 32, 
        word: 'This', isTarget: true, isActive: true 
      }];
      
      state = hitGryphonPatrolEnemy(state, 'e1');
      
      expect(state.enemies[0].isActive).toBe(false);
      expect(state.orbs.length).toBe(1);
      expect(state.orbs[0].word).toBe('This');
    });

    it('should collect orb when player touches it', () => {
      let state = createInitialGryphonPatrolState(sentence);
      state.status = 'playing';
      state.player.x = 100;
      state.player.y = 100;
      state.orbs = [{
        id: 'o1', x: 105, y: 105, vx: 0, vy: 0, size: 24, 
        word: 'This', isActive: true 
      }];
      
      state = tickGryphonPatrol(state, 0.1);
      
      expect(state.collectedWords).toContain('This');
      expect(state.orbs[0].isActive).toBe(false);
    });

    it('should create a projectile when shooting', () => {
      let state = createInitialGryphonPatrolState(sentence);
      state.status = 'playing';
      state = shootGryphonPatrolProjectile(state);
      
      expect(state.projectiles.length).toBe(1);
      expect(state.projectiles[0].vx).toBeGreaterThan(0);
    });

    it('should destroy enemy when hit by projectile in tick', () => {
      let state = createInitialGryphonPatrolState(sentence);
      state.status = 'playing';
      state.enemies = [{
        id: 'e1', x: 100, y: 100, vx: 0, vy: 0, size: 32, 
        word: 'This', isTarget: true, isActive: true 
      }];
      state.projectiles = [{
        id: 'p1', x: 95, y: 100, vx: 500, vy: 0, size: 8, isActive: true 
      }];
      
      state = tickGryphonPatrol(state, 0.1);
      
      expect(state.enemies[0].isActive).toBe(false);
      expect(state.projectiles.length).toBe(0); // Should be filtered out
    });

    it('should lose HP when colliding with an enemy', () => {
      let state = createInitialGryphonPatrolState(sentence);
      state.status = 'playing';
      state.player.hp = 3;
      state.player.x = 100;
      state.player.y = 100;
      state.enemies = [{
        id: 'e1', x: 105, y: 105, vx: 0, vy: 0, size: 32, 
        word: 'Wrong', isTarget: false, isActive: true 
      }];
      
      state = tickGryphonPatrol(state, 0.1);
      
      expect(state.player.hp).toBe(2);
    });

    it('should set status to lost when HP reaches zero', () => {
      let state = createInitialGryphonPatrolState(sentence);
      state.status = 'playing';
      state.player.hp = 1;
      state.player.x = 100;
      state.player.y = 100;
      state.enemies = [{
        id: 'e1', x: 105, y: 105, vx: 0, vy: 0, size: 32, 
        word: 'Wrong', isTarget: false, isActive: true 
      }];
      
      state = tickGryphonPatrol(state, 0.1);
      
      expect(state.status).toBe('lost');
    });
  });

  describe('XP Calculation', () => {
    it('should return 0 when totalWords is 0', () => {
      const xp = calculateXP({ collectedWords: 0, totalWords: 0, hp: 3, maxHp: 3, time: 0 });
      expect(xp).toBe(0);
    });

    it('should cap XP at 10', () => {
      const xp = calculateXP({ collectedWords: 10, totalWords: 10, hp: 3, maxHp: 3, time: 10 });
      expect(xp).toBeLessThanOrEqual(10);
    });

    it('should floor XP at 1', () => {
      const xp = calculateXP({ collectedWords: 1, totalWords: 10, hp: 0, maxHp: 3, time: 120 });
      expect(xp).toBeGreaterThanOrEqual(1);
    });

    it('should give higher XP for perfect run', () => {
      const perfect = calculateXP({ collectedWords: 10, totalWords: 10, hp: 3, maxHp: 3, time: 30 });
      const poor = calculateXP({ collectedWords: 5, totalWords: 10, hp: 1, maxHp: 3, time: 120 });
      expect(perfect).toBeGreaterThan(poor);
    });
  });
});
