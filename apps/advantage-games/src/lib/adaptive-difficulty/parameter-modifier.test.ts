import { registerDifficultyParams, resetDifficultyRegistry } from './registerDifficultyParams';
import { modifyParameters, resetEngineRegistry } from './parameter-modifier';
import type { PerformanceScore } from '@/types/adaptive-difficulty';

const mockScore = (score: number): PerformanceScore => ({
  score,
  accuracy: score,
  speed: score,
  streak: score,
});

describe('modifyParameters', () => {
  beforeEach(() => {
    resetDifficultyRegistry();
    resetEngineRegistry();
  });

  it('should return null for unregistered game', () => {
    const result = modifyParameters('unknown-game', mockScore(50));
    expect(result).toBeNull();
  });

  it('should modify parameters for registered game', () => {
    registerDifficultyParams('test-game', {
      spawnRate: { current: 1.0, min: 0.5, max: 2.0, default: 1.0, step: 0.1 },
      enemySpeed: { current: 100, min: 50, max: 200, default: 100, step: 10 },
    });

    const result = modifyParameters('test-game', mockScore(90));

    expect(result).not.toBeNull();
    expect(result?.gameId).toBe('test-game');
    expect(result?.modifiedParams).toHaveLength(2);
  });

  it('should increase parameters when score is high', () => {
    registerDifficultyParams('test-game', {
      spawnRate: { current: 1.0, min: 0.5, max: 2.0, default: 1.0, step: 0.1 },
    });

    // Need multiple high scores to overcome EMA smoothing (α=0.3)
    // EMA after 3 scores at ~95: ~79, need 4th to cross 80 threshold
    modifyParameters('test-game', mockScore(90));
    modifyParameters('test-game', mockScore(95));
    modifyParameters('test-game', mockScore(95));
    const result = modifyParameters('test-game', mockScore(95));

    const spawnRate = result?.modifiedParams.find(p => p.name === 'spawnRate');
    expect(spawnRate?.direction).toBe('increase');
    expect(spawnRate?.newValue).toBeGreaterThan(1.0);
  });

  it('should decrease parameters when score is low', () => {
    registerDifficultyParams('test-game', {
      spawnRate: { current: 1.0, min: 0.5, max: 2.0, default: 1.0, step: 0.1 },
    });

    // Need multiple low scores to overcome EMA smoothing
    modifyParameters('test-game', mockScore(20));
    modifyParameters('test-game', mockScore(15));
    const result = modifyParameters('test-game', mockScore(10));

    const spawnRate = result?.modifiedParams.find(p => p.name === 'spawnRate');
    expect(spawnRate?.direction).toBe('decrease');
    expect(spawnRate?.newValue).toBeLessThan(1.0);
  });

  it('should hold parameters when score is in flow zone', () => {
    registerDifficultyParams('test-game', {
      spawnRate: { current: 1.0, min: 0.5, max: 2.0, default: 1.0, step: 0.1 },
    });

    const result = modifyParameters('test-game', mockScore(60));

    const spawnRate = result?.modifiedParams.find(p => p.name === 'spawnRate');
    expect(spawnRate?.direction).toBe('hold');
    expect(spawnRate?.newValue).toBe(1.0);
  });

  it('should respect min/max bounds', () => {
    registerDifficultyParams('test-game', {
      spawnRate: { current: 1.95, min: 0.5, max: 2.0, default: 1.95, step: 0.1 },
    });

    // Multiple high scores should try to increase but clamp to max
    modifyParameters('test-game', mockScore(95));
    modifyParameters('test-game', mockScore(95));
    const result = modifyParameters('test-game', mockScore(95));

    const spawnRate = result?.modifiedParams.find(p => p.name === 'spawnRate');
    expect(spawnRate?.newValue).toBeLessThanOrEqual(2.0);
  });

  it('should calculate delta correctly', () => {
    registerDifficultyParams('test-game', {
      spawnRate: { current: 1.0, min: 0.5, max: 2.0, default: 1.0, step: 0.1 },
    });

    modifyParameters('test-game', mockScore(90));
    modifyParameters('test-game', mockScore(95));
    const result = modifyParameters('test-game', mockScore(95));

    const spawnRate = result?.modifiedParams.find(p => p.name === 'spawnRate');
    expect(spawnRate?.delta).toBe(spawnRate!.newValue - spawnRate!.oldValue);
  });

  it('should determine overall direction based on majority', () => {
    registerDifficultyParams('test-game', {
      param1: { current: 1.0, min: 0.5, max: 2.0, default: 1.0, step: 0.1 },
      param2: { current: 1.0, min: 0.5, max: 2.0, default: 1.0, step: 0.1 },
      param3: { current: 1.0, min: 0.5, max: 2.0, default: 1.0, step: 0.1 },
    });

    // All high scores should increase all params
    modifyParameters('test-game', mockScore(95));
    modifyParameters('test-game', mockScore(95));
    const result = modifyParameters('test-game', mockScore(95));

    expect(result?.overallDirection).toBe('increase');
  });

  it('should include performance score and EMA score in result', () => {
    registerDifficultyParams('test-game', {
      spawnRate: { current: 1.0, min: 0.5, max: 2.0, default: 1.0, step: 0.1 },
    });

    const result = modifyParameters('test-game', mockScore(75));

    expect(result?.performanceScore).toBe(75);
    expect(result?.emaScore).toBeDefined();
    expect(typeof result?.emaScore).toBe('number');
  });

  it('should handle multiple parameters with mixed directions', () => {
    // Since we use the same score for all params, they should all go same direction
    registerDifficultyParams('test-game', {
      param1: { current: 1.0, min: 0.5, max: 2.0, default: 1.0, step: 0.1 },
      param2: { current: 1.0, min: 0.5, max: 2.0, default: 1.0, step: 0.1 },
    });

    const result = modifyParameters('test-game', mockScore(60));

    // Both should hold in flow zone
    expect(result?.overallDirection).toBe('hold');
    expect(result?.modifiedParams.every(p => p.direction === 'hold')).toBe(true);
  });
});
