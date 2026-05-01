import { renderHook, act } from '@testing-library/react';
import { usePerformanceMetrics } from './usePerformanceMetrics';

describe('usePerformanceMetrics', () => {
  it('should initialize with zero metrics', () => {
    const { result } = renderHook(() => usePerformanceMetrics());

    const score = result.current.getScore();
    expect(score.score).toBe(0);
    expect(score.accuracy).toBe(0);
    expect(score.speed).toBe(0);
    expect(score.streak).toBe(0);
  });

  it('should record responses', () => {
    const { result } = renderHook(() => usePerformanceMetrics());

    act(() => {
      result.current.recordResponse(true, 1000);
    });

    const metrics = result.current.getMetrics();
    expect(metrics.totalResponses).toBe(1);
    expect(metrics.accuracy).toBe(100);
  });

  it('should calculate accuracy correctly', () => {
    const { result } = renderHook(() => usePerformanceMetrics());

    act(() => {
      result.current.recordResponse(true, 1000);
      result.current.recordResponse(true, 1000);
      result.current.recordResponse(false, 2000);
    });

    const score = result.current.getScore();
    expect(score.accuracy).toBe(67); // 2/3 correct
  });

  it('should calculate speed score correctly', () => {
    const { result } = renderHook(() => usePerformanceMetrics());

    act(() => {
      result.current.recordResponse(true, 500); // Very fast
    });

    const score = result.current.getScore();
    expect(score.speed).toBe(100); // <1s = 100
  });

  it('should calculate streak score correctly', () => {
    const { result } = renderHook(() => usePerformanceMetrics());

    act(() => {
      result.current.recordResponse(true, 1000);
      result.current.recordResponse(true, 1000);
      result.current.recordResponse(true, 1000);
    });

    const score = result.current.getScore();
    expect(score.streak).toBe(60); // Streak of 3 = 60
  });

  it('should maintain rolling window', () => {
    const { result } = renderHook(() => usePerformanceMetrics({ windowSize: 3 }));

    act(() => {
      result.current.recordResponse(true, 1000);
      result.current.recordResponse(true, 1000);
      result.current.recordResponse(true, 1000);
      result.current.recordResponse(false, 2000); // This should evict the first response
    });

    const metrics = result.current.getMetrics();
    expect(metrics.totalResponses).toBe(3);
    expect(metrics.accuracy).toBeCloseTo(66.67, 1); // 2/3 correct (first one evicted)
  });

  it('should calculate composite score with weights', () => {
    const { result } = renderHook(() => usePerformanceMetrics());

    act(() => {
      // Perfect accuracy, fast speed, streak of 1
      result.current.recordResponse(true, 500);
    });

    const score = result.current.getScore();
    expect(score.score).toBe(84); // 100*0.5 + 100*0.3 + 20*0.2 = 84
  });

  it('should reset metrics', () => {
    const { result } = renderHook(() => usePerformanceMetrics());

    act(() => {
      result.current.recordResponse(true, 1000);
      result.current.reset();
    });

    const metrics = result.current.getMetrics();
    expect(metrics.totalResponses).toBe(0);
    expect(metrics.accuracy).toBe(0);
  });

  it('should track current streak from end', () => {
    const { result } = renderHook(() => usePerformanceMetrics());

    act(() => {
      result.current.recordResponse(true, 1000);
      result.current.recordResponse(false, 2000);
      result.current.recordResponse(true, 1000);
      result.current.recordResponse(true, 1000);
    });

    const metrics = result.current.getMetrics();
    expect(metrics.currentStreak).toBe(2);
    expect(metrics.bestStreak).toBe(2);
  });

  it('should calculate best streak correctly', () => {
    const { result } = renderHook(() => usePerformanceMetrics());

    act(() => {
      result.current.recordResponse(true, 1000);
      result.current.recordResponse(true, 1000);
      result.current.recordResponse(true, 1000);
      result.current.recordResponse(false, 2000);
      result.current.recordResponse(true, 1000);
    });

    const metrics = result.current.getMetrics();
    expect(metrics.bestStreak).toBe(3);
    expect(metrics.currentStreak).toBe(1);
  });

  it('should handle empty metrics gracefully', () => {
    const { result } = renderHook(() => usePerformanceMetrics());

    const metrics = result.current.getMetrics();
    expect(metrics.totalResponses).toBe(0);
    expect(metrics.windowSize).toBe(20); // Default
  });

  it('should accept custom window size', () => {
    const { result } = renderHook(() => usePerformanceMetrics({ windowSize: 5 }));

    act(() => {
      for (let i = 0; i < 10; i++) {
        result.current.recordResponse(true, 1000);
      }
    });

    const metrics = result.current.getMetrics();
    expect(metrics.totalResponses).toBe(5); // Window size limit
    expect(metrics.windowSize).toBe(5);
  });
});
