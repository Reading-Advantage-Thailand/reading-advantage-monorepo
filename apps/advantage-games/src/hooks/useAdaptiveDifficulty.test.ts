import { renderHook, act } from '@testing-library/react';
import { useAdaptiveDifficulty } from './useAdaptiveDifficulty';
import { registerDifficultyParams, resetDifficultyRegistry } from '@/lib/adaptive-difficulty/registerDifficultyParams';
import { resetEngineRegistry } from '@/lib/adaptive-difficulty/parameter-modifier';

describe('useAdaptiveDifficulty', () => {
  beforeEach(() => {
    resetDifficultyRegistry();
    resetEngineRegistry();
  });

  it('should initialize with adaptive disabled', () => {
    const { result } = renderHook(() =>
      useAdaptiveDifficulty({ gameId: 'test-game' })
    );

    expect(result.current.isEnabled).toBe(false);
    expect(result.current.state.isEnabled).toBe(false);
    expect(result.current.getCurrentParams()).toBeNull();
  });

  it('should initialize with adaptive enabled', () => {
    registerDifficultyParams('test-game', {
      speed: { current: 1.0, min: 0.5, max: 2.0, default: 1.0, step: 0.1 },
    });

    const { result } = renderHook(() =>
      useAdaptiveDifficulty({ gameId: 'test-game', adaptive: true })
    );

    expect(result.current.isEnabled).toBe(true);
    expect(result.current.state.isEnabled).toBe(true);
  });

  it('should be no-op when adaptive is disabled', () => {
    const { result } = renderHook(() =>
      useAdaptiveDifficulty({ gameId: 'test-game' })
    );

    act(() => {
      result.current.recordResponse(true, 1000);
    });

    expect(result.current.state.responseCount).toBe(0);
    expect(result.current.state.performanceScore).toBeNull();
  });

  it('should record responses when adaptive is enabled', () => {
    registerDifficultyParams('test-game', {
      speed: { current: 1.0, min: 0.5, max: 2.0, default: 1.0, step: 0.1 },
    });

    const { result } = renderHook(() =>
      useAdaptiveDifficulty({ gameId: 'test-game', adaptive: true })
    );

    act(() => {
      result.current.recordResponse(true, 1000);
    });

    expect(result.current.state.responseCount).toBe(1);
    expect(result.current.state.performanceScore).not.toBeNull();
  });

  it('should return current params from registered defaults', () => {
    registerDifficultyParams('test-game', {
      speed: { current: 1.5, min: 0.5, max: 2.0, default: 1.5, step: 0.1 },
      spawnRate: { current: 1000, min: 500, max: 5000, default: 1000, step: 100 },
    });

    const { result } = renderHook(() =>
      useAdaptiveDifficulty({ gameId: 'test-game', adaptive: true })
    );

    const params = result.current.getCurrentParams();
    expect(params).not.toBeNull();
    expect(params!.get('speed')).toBe(1.5);
    expect(params!.get('spawnRate')).toBe(1000);
  });

  it('should get param value with fallback', () => {
    registerDifficultyParams('test-game', {
      speed: { current: 1.5, min: 0.5, max: 2.0, default: 1.5, step: 0.1 },
    });

    const { result } = renderHook(() =>
      useAdaptiveDifficulty({ gameId: 'test-game', adaptive: true })
    );

    expect(result.current.getParamValue('speed', 1.0)).toBe(1.5);
    expect(result.current.getParamValue('unknown', 99)).toBe(99);
  });

  it('should adjust parameters after enough responses', () => {
    registerDifficultyParams('test-game', {
      speed: { current: 1.0, min: 0.5, max: 2.0, default: 1.0, step: 0.1 },
    });

    const { result } = renderHook(() =>
      useAdaptiveDifficulty({ gameId: 'test-game', adaptive: true })
    );

    // Feed multiple high scores to trigger adjustment
    act(() => {
      result.current.recordResponse(true, 500);
      result.current.recordResponse(true, 600);
      result.current.recordResponse(true, 400);
      result.current.recordResponse(true, 700);
      result.current.recordResponse(true, 500);
    });

    expect(result.current.state.lastAdjustment).not.toBeNull();
  });

  it('should return default value when adaptive is disabled', () => {
    const { result } = renderHook(() =>
      useAdaptiveDifficulty({ gameId: 'test-game' })
    );

    expect(result.current.getParamValue('speed', 2.0)).toBe(2.0);
  });

  it('should handle unregistered game gracefully', () => {
    const { result } = renderHook(() =>
      useAdaptiveDifficulty({ gameId: 'unregistered-game', adaptive: true })
    );

    act(() => {
      result.current.recordResponse(true, 1000);
    });

    expect(result.current.getCurrentParams()).toBeNull();
    expect(result.current.state.lastAdjustment).toBeNull();
  });
});
