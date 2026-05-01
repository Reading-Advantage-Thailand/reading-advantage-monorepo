import { AdjustmentEngine } from './adjustment-engine';
import { registerDifficultyParams, resetDifficultyRegistry } from './registerDifficultyParams';
import { resetEngineRegistry, modifyParameters } from './parameter-modifier';
import type { PerformanceScore } from '@/types/adaptive-difficulty';

interface PlayerProfile {
  accuracyPercent: number;
  averageTimeMs: number;
  streakLength: number;
}

interface ConvergenceResult {
  converged: boolean;
  responsesToConverge: number;
  finalEmaScore: number;
  maxEmaScore: number;
  minEmaScore: number;
}

function createScore(profile: PlayerProfile): PerformanceScore {
  // Simulate composite score based on profile
  const accuracyScore = profile.accuracyPercent;
  const speedScore = profile.averageTimeMs <= 1000 ? 100 :
    profile.averageTimeMs <= 3000 ? 80 + ((3000 - profile.averageTimeMs) / 2000) * 20 :
    profile.averageTimeMs <= 5000 ? 60 + ((5000 - profile.averageTimeMs) / 2000) * 20 :
    profile.averageTimeMs <= 10000 ? 40 + ((10000 - profile.averageTimeMs) / 5000) * 20 :
    Math.max(0, 40 - ((profile.averageTimeMs - 10000) / 10000) * 40);
  
  const streakScore = profile.streakLength >= 5 ? 100 : profile.streakLength * 20;
  
  const compositeScore = Math.round(
    accuracyScore * 0.5 + speedScore * 0.3 + streakScore * 0.2
  );

  return {
    score: compositeScore,
    accuracy: Math.round(accuracyScore),
    speed: Math.round(speedScore),
    streak: Math.round(streakScore),
  };
}

function simulatePlayerSession(
  gameId: string,
  profile: PlayerProfile,
  maxResponses: number = 20
): ConvergenceResult {
  const engine = new AdjustmentEngine();
  let responsesToConverge = -1;
  let converged = false;
  let maxEma = 50;
  let minEma = 50;

  for (let i = 0; i < maxResponses; i++) {
    const score = createScore(profile);
    
    // Simulate one parameter adjustment to track EMA
    engine.adjustParameter(50, 0, 100, score);
    
    const ema = engine.getEmaScore();
    maxEma = Math.max(maxEma, ema);
    minEma = Math.min(minEma, ema);

    if (!converged && engine.shouldAdjust()) {
      const isInFlowZone = ema >= 40 && ema <= 80;
      if (isInFlowZone) {
        converged = true;
        responsesToConverge = i + 1;
      }
    }
  }

  return {
    converged,
    responsesToConverge,
    finalEmaScore: engine.getEmaScore(),
    maxEmaScore: maxEma,
    minEmaScore: minEma,
  };
}

describe('Calibration Test Suite', () => {
  beforeEach(() => {
    resetDifficultyRegistry();
    resetEngineRegistry();
  });

  describe('Convergence to Flow Zone', () => {
    it('should converge to flow zone for average player (70% accuracy, 2s response)', () => {
      const result = simulatePlayerSession('test-game', {
        accuracyPercent: 70,
        averageTimeMs: 2000,
        streakLength: 2,
      });

      expect(result.converged).toBe(true);
      expect(result.responsesToConverge).toBeLessThanOrEqual(20);
      expect(result.finalEmaScore).toBeGreaterThanOrEqual(40);
      expect(result.finalEmaScore).toBeLessThanOrEqual(80);
    });

    it('should converge to flow zone for fast accurate player (90% accuracy, 800ms)', () => {
      const result = simulatePlayerSession('test-game', {
        accuracyPercent: 90,
        averageTimeMs: 800,
        streakLength: 4,
      });

      // This player is too good, so EMA should go above 80 (increase difficulty)
      expect(result.finalEmaScore).toBeGreaterThan(80);
    });

    it('should converge to flow zone for slow inaccurate player (40% accuracy, 6s)', () => {
      const result = simulatePlayerSession('test-game', {
        accuracyPercent: 40,
        averageTimeMs: 6000,
        streakLength: 0,
      });

      // This player struggles, so EMA should go below 40 (decrease difficulty)
      expect(result.finalEmaScore).toBeLessThan(40);
    });
  });

  describe('Edge Cases', () => {
    it('should handle perfect accuracy player (100%, 500ms)', () => {
      const result = simulatePlayerSession('test-game', {
        accuracyPercent: 100,
        averageTimeMs: 500,
        streakLength: 5,
      });

      // Perfect player should drive EMA to maximum
      expect(result.finalEmaScore).toBeGreaterThan(90);
      expect(result.maxEmaScore).toBeGreaterThan(95);
    });

    it('should handle 0% accuracy player', () => {
      const result = simulatePlayerSession('test-game', {
        accuracyPercent: 0,
        averageTimeMs: 10000,
        streakLength: 0,
      });

      // Worst player should drive EMA to minimum
      expect(result.finalEmaScore).toBeLessThan(20);
      expect(result.minEmaScore).toBeLessThan(30);
    });

    it('should handle all fast responses (500ms regardless of accuracy)', () => {
      const result = simulatePlayerSession('test-game', {
        accuracyPercent: 60,
        averageTimeMs: 500,
        streakLength: 3,
      });

      // Fast responses boost speed score, keeping EMA in or above flow zone
      expect(result.finalEmaScore).toBeGreaterThanOrEqual(40);
    });

    it('should handle all slow responses (8s regardless of accuracy)', () => {
      const result = simulatePlayerSession('test-game', {
        accuracyPercent: 60,
        averageTimeMs: 8000,
        streakLength: 1,
      });

      // Slow responses reduce speed score, pushing EMA down
      expect(result.finalEmaScore).toBeLessThanOrEqual(70);
    });

    it('should handle inconsistent player (alternating good/bad)', () => {
      const engine = new AdjustmentEngine();
      
      for (let i = 0; i < 20; i++) {
        const profile: PlayerProfile = i % 2 === 0
          ? { accuracyPercent: 100, averageTimeMs: 500, streakLength: 5 }
          : { accuracyPercent: 0, averageTimeMs: 10000, streakLength: 0 };
        
        engine.adjustParameter(50, 0, 100, createScore(profile));
      }

      // EMA smoothing should keep score near middle despite wild swings
      expect(engine.getEmaScore()).toBeGreaterThan(30);
      expect(engine.getEmaScore()).toBeLessThan(70);
    });
  });

  describe('Parameter Adjustment Behavior', () => {
    beforeEach(() => {
      registerDifficultyParams('test-game', {
        speed: { current: 1.0, min: 0.5, max: 2.0, default: 1.0, step: 0.1 },
      });
    });

    it('should increase difficulty for high-performing player', () => {
      const profile: PlayerProfile = {
        accuracyPercent: 95,
        averageTimeMs: 500,
        streakLength: 5,
      };

      let result;
      for (let i = 0; i < 10; i++) {
        result = modifyParameters('test-game', createScore(profile));
      }

      const speedParam = result?.modifiedParams.find(p => p.name === 'speed');
      expect(speedParam?.direction).toBe('increase');
      expect(speedParam?.newValue).toBeGreaterThan(1.0);
    });

    it('should decrease difficulty for struggling player', () => {
      const profile: PlayerProfile = {
        accuracyPercent: 20,
        averageTimeMs: 8000,
        streakLength: 0,
      };

      let result;
      for (let i = 0; i < 10; i++) {
        result = modifyParameters('test-game', createScore(profile));
      }

      const speedParam = result?.modifiedParams.find(p => p.name === 'speed');
      expect(speedParam?.direction).toBe('decrease');
      expect(speedParam?.newValue).toBeLessThan(1.0);
    });

    it('should respect rate limiting (max 15% change per cycle)', () => {
      const profile: PlayerProfile = {
        accuracyPercent: 100,
        averageTimeMs: 500,
        streakLength: 5,
      };

      let previousValue = 1.0;
      let maxDelta = 0;

      for (let i = 0; i < 20; i++) {
        const result = modifyParameters('test-game', createScore(profile));
        const speedParam = result?.modifiedParams.find(p => p.name === 'speed');
        if (speedParam) {
          const delta = Math.abs(speedParam.newValue - previousValue);
          maxDelta = Math.max(maxDelta, delta);
          previousValue = speedParam.newValue;
        }
      }

      // Max change should be within 15% of range (2.0 - 0.5 = 1.5, 15% = 0.225)
      expect(maxDelta).toBeLessThanOrEqual(0.225);
    });
  });

  describe('Convergence Assertions', () => {
    it('should converge within 20 responses for typical players', () => {
      const profiles: PlayerProfile[] = [
        { accuracyPercent: 80, averageTimeMs: 1500, streakLength: 3 },
        { accuracyPercent: 65, averageTimeMs: 2500, streakLength: 2 },
        { accuracyPercent: 50, averageTimeMs: 4000, streakLength: 1 },
      ];

      for (const profile of profiles) {
        const result = simulatePlayerSession('test-game', profile, 20);
        
        // For players in the 50-80% accuracy range, they should converge to flow zone
        if (profile.accuracyPercent >= 50 && profile.accuracyPercent <= 80) {
          expect(result.converged).toBe(true);
          expect(result.responsesToConverge).toBeLessThanOrEqual(20);
        }
      }
    });

    it('should document EMA trajectory for analysis', () => {
      const engine = new AdjustmentEngine();
      const emaTrajectory: number[] = [];
      
      const profile: PlayerProfile = {
        accuracyPercent: 75,
        averageTimeMs: 2000,
        streakLength: 3,
      };

      for (let i = 0; i < 20; i++) {
        engine.adjustParameter(50, 0, 100, createScore(profile));
        emaTrajectory.push(engine.getEmaScore());
      }

      // EMA should stabilize (not oscillate wildly) after initial responses
      const lastFive = emaTrajectory.slice(-5);
      const maxDiff = Math.max(...lastFive) - Math.min(...lastFive);
      expect(maxDiff).toBeLessThan(15); // Should stabilize within 15 points
    });
  });
});
