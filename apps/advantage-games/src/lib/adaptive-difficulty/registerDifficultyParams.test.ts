import {
  registerDifficultyParams,
  getDifficultyParams,
  hasDifficultyParams,
  unregisterDifficultyParams,
  getAllRegisteredGames,
  resetDifficultyRegistry,
} from './registerDifficultyParams';

describe('registerDifficultyParams', () => {
  beforeEach(() => {
    resetDifficultyRegistry();
  });

  it('should register difficulty parameters for a game', () => {
    const params = registerDifficultyParams('wizard-vs-zombie', {
      spawnRate: { min: 1000, max: 5000, current: 2000, default: 2000, step: 100 },
      enemySpeed: { min: 1, max: 10, current: 3, default: 3, step: 0.5 },
    });

    expect(params.gameId).toBe('wizard-vs-zombie');
    expect(params.params.size).toBe(2);
    expect(params.params.get('spawnRate')?.min).toBe(1000);
    expect(params.params.get('enemySpeed')?.max).toBe(10);
  });

  it('should retrieve registered parameters', () => {
    registerDifficultyParams('wizard-vs-zombie', {
      spawnRate: { min: 1000, max: 5000, current: 2000, default: 2000, step: 100 },
    });

    const retrieved = getDifficultyParams('wizard-vs-zombie');
    expect(retrieved).toBeDefined();
    expect(retrieved?.params.get('spawnRate')?.current).toBe(2000);
  });

  it('should return undefined for unregistered game', () => {
    const retrieved = getDifficultyParams('non-existent');
    expect(retrieved).toBeUndefined();
  });

  it('should check if game has registered parameters', () => {
    registerDifficultyParams('wizard-vs-zombie', {
      spawnRate: { min: 1000, max: 5000, current: 2000, default: 2000, step: 100 },
    });

    expect(hasDifficultyParams('wizard-vs-zombie')).toBe(true);
    expect(hasDifficultyParams('non-existent')).toBe(false);
  });

  it('should unregister difficulty parameters', () => {
    registerDifficultyParams('wizard-vs-zombie', {
      spawnRate: { min: 1000, max: 5000, current: 2000, default: 2000, step: 100 },
    });

    const removed = unregisterDifficultyParams('wizard-vs-zombie');
    expect(removed).toBe(true);
    expect(hasDifficultyParams('wizard-vs-zombie')).toBe(false);
  });

  it('should return false when unregistering non-existent game', () => {
    const removed = unregisterDifficultyParams('non-existent');
    expect(removed).toBe(false);
  });

  it('should return all registered games', () => {
    registerDifficultyParams('game1', {
      param1: { min: 0, max: 10, current: 5, default: 5, step: 1 },
    });
    registerDifficultyParams('game2', {
      param1: { min: 0, max: 10, current: 5, default: 5, step: 1 },
    });

    const games = getAllRegisteredGames();
    expect(games).toContain('game1');
    expect(games).toContain('game2');
    expect(games).toHaveLength(2);
  });

  it('should reset registry', () => {
    registerDifficultyParams('game1', {
      param1: { min: 0, max: 10, current: 5, default: 5, step: 1 },
    });

    resetDifficultyRegistry();
    expect(hasDifficultyParams('game1')).toBe(false);
    expect(getAllRegisteredGames()).toHaveLength(0);
  });

  it('should update existing registration', () => {
    registerDifficultyParams('wizard-vs-zombie', {
      spawnRate: { min: 1000, max: 5000, current: 2000, default: 2000, step: 100 },
    });

    registerDifficultyParams('wizard-vs-zombie', {
      spawnRate: { min: 500, max: 3000, current: 1500, default: 1500, step: 50 },
    });

    const retrieved = getDifficultyParams('wizard-vs-zombie');
    expect(retrieved?.params.get('spawnRate')?.min).toBe(500);
    expect(retrieved?.params.get('spawnRate')?.current).toBe(1500);
  });
});
