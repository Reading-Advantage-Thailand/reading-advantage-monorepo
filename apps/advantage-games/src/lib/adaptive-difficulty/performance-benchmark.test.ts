import { renderHook, act } from '@testing-library/react';
import { usePerformanceMetrics } from '@/hooks/usePerformanceMetrics';
import { useAdaptiveDifficulty } from '@/hooks/useAdaptiveDifficulty';
import { registerDifficultyParams, resetDifficultyRegistry } from './registerDifficultyParams';
import { resetEngineRegistry } from './parameter-modifier';

describe('Performance Benchmarks', () => {
  beforeEach(() => {
    resetDifficultyRegistry();
    resetEngineRegistry();
  });

  describe('recordResponse() latency', () => {
    it('should complete recordResponse in under 1ms', () => {
      const { result } = renderHook(() => usePerformanceMetrics());

      const iterations = 1000;
      const startTime = performance.now();

      act(() => {
        for (let i = 0; i < iterations; i++) {
          result.current.recordResponse(true, 1000);
        }
      });

      const endTime = performance.now();
      const totalTime = endTime - startTime;
      const averageTime = totalTime / iterations;

      expect(averageTime).toBeLessThan(1); // Must be under 1ms per call
      expect(totalTime).toBeLessThan(50); // Total should be under 50ms for 1000 calls (allows for test env overhead)
    });

    it('should handle bulk responses efficiently', () => {
      const { result } = renderHook(() => usePerformanceMetrics());

      const bulkSize = 100;
      const startTime = performance.now();

      act(() => {
        for (let i = 0; i < bulkSize; i++) {
          result.current.recordResponse(i % 2 === 0, 1000 + i);
        }
      });

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      expect(totalTime).toBeLessThan(5); // 100 responses should complete in under 5ms
    });
  });

  describe('getScore() latency', () => {
    it('should calculate score in under 1ms', () => {
      const { result } = renderHook(() => usePerformanceMetrics());

      // Populate with data
      act(() => {
        for (let i = 0; i < 20; i++) {
          result.current.recordResponse(true, 1000);
        }
      });

      const iterations = 1000;
      const startTime = performance.now();

      for (let i = 0; i < iterations; i++) {
        result.current.getScore();
      }

      const endTime = performance.now();
      const averageTime = (endTime - startTime) / iterations;

      expect(averageTime).toBeLessThan(1); // Under 1ms per call
    });
  });

  describe('Adaptive difficulty overhead', () => {
    it('should process adaptive responses with minimal overhead', () => {
      registerDifficultyParams('perf-test-game', {
        speed: { current: 1.0, min: 0.5, max: 2.0, default: 1.0, step: 0.1 },
        spawnRate: { current: 1000, min: 500, max: 5000, default: 1000, step: 100 },
      });

      const { result } = renderHook(() =>
        useAdaptiveDifficulty({ gameId: 'perf-test-game', adaptive: true })
      );

      const iterations = 100;
      const startTime = performance.now();

      act(() => {
        for (let i = 0; i < iterations; i++) {
          result.current.recordResponse(true, 500);
        }
      });

      const endTime = performance.now();
      const totalTime = endTime - startTime;
      const averageTime = totalTime / iterations;

      // Adaptive mode should add minimal overhead
      expect(averageTime).toBeLessThan(2); // Under 2ms per adaptive response
      expect(totalTime).toBeLessThan(50); // 100 adaptive responses under 50ms
    });

    it('should handle disabled adaptive mode with zero overhead', () => {
      const { result } = renderHook(() =>
        useAdaptiveDifficulty({ gameId: 'perf-test-game', adaptive: false })
      );

      const iterations = 1000;
      const startTime = performance.now();

      act(() => {
        for (let i = 0; i < iterations; i++) {
          result.current.recordResponse(true, 500);
        }
      });

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      // Disabled mode should be extremely fast (just a boolean check)
      expect(totalTime).toBeLessThan(5); // Under 5ms for 1000 no-op calls
    });
  });

  describe('Adjustment engine performance', () => {
    it('should process parameter adjustments under 1ms', () => {
      registerDifficultyParams('perf-test-game', {
        speed: { current: 1.0, min: 0.5, max: 2.0, default: 1.0, step: 0.1 },
        spawnRate: { current: 1000, min: 500, max: 5000, default: 1000, step: 100 },
        enemySpeed: { current: 3, min: 1, max: 10, default: 3, step: 0.5 },
      });

      const { result } = renderHook(() =>
        useAdaptiveDifficulty({ gameId: 'perf-test-game', adaptive: true })
      );

      // Warm up
      act(() => {
        for (let i = 0; i < 5; i++) {
          result.current.recordResponse(true, 500);
        }
      });

      // Benchmark adjustment cycle
      const iterations = 50;
      const startTime = performance.now();

      act(() => {
        for (let i = 0; i < iterations; i++) {
          result.current.recordResponse(true, 500);
        }
      });

      const endTime = performance.now();
      const totalTime = endTime - startTime;
      const averageTime = totalTime / iterations;

      expect(averageTime).toBeLessThan(2); // Under 2ms per adjustment
    });
  });

  describe('Memory usage', () => {
    it('should maintain bounded memory for rolling window', () => {
      const { result } = renderHook(() => usePerformanceMetrics());

      // Fill window beyond capacity
      act(() => {
        for (let i = 0; i < 1000; i++) {
          result.current.recordResponse(true, 1000);
        }
      });

      const metrics = result.current.getMetrics();
      // Window should be bounded to DEFAULT_WINDOW_SIZE (20)
      expect(metrics.totalResponses).toBeLessThanOrEqual(20);
    });

    it('should handle large response volumes without unbounded growth', () => {
      const { result } = renderHook(() => usePerformanceMetrics());

      const largeVolume = 10000;

      act(() => {
        for (let i = 0; i < largeVolume; i++) {
          result.current.recordResponse(i % 3 !== 0, 1000 + (i % 5000));
        }
      });

      const score = result.current.getScore();
      expect(score.score).toBeGreaterThan(0);
      expect(score.score).toBeLessThanOrEqual(100);
    });
  });
});
