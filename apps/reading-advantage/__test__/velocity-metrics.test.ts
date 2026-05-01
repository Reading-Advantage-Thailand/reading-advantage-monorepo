/**
 * Velocity Metrics Test Suite
 * 
 * Tests for XP velocity calculations, ETA projections, confidence bands,
 * and low-signal detection.
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';

// ============================================================================
// Mock Data
// ============================================================================

const mockStudentVelocityData = {
  user_id: 'test-student-1',
  email: 'student@test.com',
  display_name: 'Test Student',
  school_id: 'school-1',
  current_xp: 45000,
  current_level: 6,
  cefr_level: 'B1',
  xp_last_7d: 3500,
  active_days_7d: 5,
  xp_per_active_day_7d: 700,
  xp_per_calendar_day_7d: 500,
  xp_last_30d: 12000,
  active_days_30d: 22,
  xp_per_active_day_30d: 545.45,
  xp_per_calendar_day_30d: 400,
  xp_to_next_level: 11000,
  next_level_xp: 56000,
  activities_last_7d: 15,
  activities_last_30d: 60,
  last_activity_at: new Date('2025-10-21T14:32:15.000Z'),
  is_low_signal: false,
};

const mockLowSignalStudent = {
  ...mockStudentVelocityData,
  user_id: 'low-signal-student',
  xp_last_30d: 100,
  active_days_30d: 2,
  xp_per_active_day_30d: 50,
  xp_per_calendar_day_30d: 3.33,
  is_low_signal: true,
};

// ============================================================================
// ETA Calculation Tests
// ============================================================================

describe('ETA Calculation', () => {
  describe('calculateETA', () => {
    // Mock implementation of calculateETA function
    function calculateETA(
      xpToNextLevel: number,
      velocity: number,
      stdDev: number,
      activeDays: number
    ): {
      etaDays: number | null;
      etaDate: string | null;
      confidenceLow: number | null;
      confidenceHigh: number | null;
      confidenceBand: 'high' | 'medium' | 'low' | 'none';
    } {
      const MIN_VELOCITY_THRESHOLD = 0.5;
      const MIN_ACTIVE_DAYS = 3;
      const CONFIDENCE_MULTIPLIER = 1.96;

      // Low-signal conditions
      if (activeDays < MIN_ACTIVE_DAYS || velocity < MIN_VELOCITY_THRESHOLD || xpToNextLevel <= 0) {
        return {
          etaDays: null,
          etaDate: null,
          confidenceLow: null,
          confidenceHigh: null,
          confidenceBand: 'none',
        };
      }

      const etaDays = Math.ceil(xpToNextLevel / velocity);

      // Confidence interval
      const velocityLow = Math.max(0.1, velocity - CONFIDENCE_MULTIPLIER * stdDev);
      const velocityHigh = velocity + CONFIDENCE_MULTIPLIER * stdDev;

      const confidenceHigh = Math.ceil(xpToNextLevel / velocityLow);
      const confidenceLow = Math.ceil(xpToNextLevel / velocityHigh);

      // ETA date
      const etaDate = new Date();
      etaDate.setDate(etaDate.getDate() + etaDays);

      // Confidence band
      const coefficientOfVariation = velocity > 0 ? stdDev / velocity : Infinity;
      let confidenceBand: 'high' | 'medium' | 'low' | 'none';

      if (coefficientOfVariation < 0.3) {
        confidenceBand = 'high';
      } else if (coefficientOfVariation < 0.6) {
        confidenceBand = 'medium';
      } else if (coefficientOfVariation < 1.0) {
        confidenceBand = 'low';
      } else {
        confidenceBand = 'none';
      }

      return {
        etaDays,
        etaDate: etaDate.toISOString(),
        confidenceLow,
        confidenceHigh,
        confidenceBand,
      };
    }

    it('should calculate ETA correctly', () => {
      const result = calculateETA(10000, 500, 50, 20);
      
      expect(result.etaDays).toBe(20);
      expect(result.etaDate).not.toBeNull();
      expect(result.confidenceLow).toBeLessThan(result.etaDays!);
      expect(result.confidenceHigh).toBeGreaterThan(result.etaDays!);
    });

    it('should return null ETA for velocity below threshold', () => {
      const result = calculateETA(10000, 0.3, 0, 5);
      
      expect(result.etaDays).toBeNull();
      expect(result.etaDate).toBeNull();
      expect(result.confidenceBand).toBe('none');
    });

    it('should return null ETA for insufficient active days', () => {
      const result = calculateETA(10000, 500, 50, 2);
      
      expect(result.etaDays).toBeNull();
      expect(result.etaDate).toBeNull();
      expect(result.confidenceBand).toBe('none');
    });

    it('should return null ETA when already at max level', () => {
      const result = calculateETA(0, 500, 50, 20);
      
      expect(result.etaDays).toBeNull();
      expect(result.confidenceBand).toBe('none');
    });

    it('should return null ETA for negative XP to next level', () => {
      const result = calculateETA(-100, 500, 50, 20);
      
      expect(result.etaDays).toBeNull();
    });
  });
});

// ============================================================================
// Confidence Band Tests
// ============================================================================

describe('Confidence Band Classification', () => {
  function classifyConfidenceBand(velocity: number, stdDev: number): 'high' | 'medium' | 'low' | 'none' {
    if (velocity <= 0) return 'none';
    
    const coefficientOfVariation = stdDev / velocity;
    
    if (coefficientOfVariation < 0.3) return 'high';
    if (coefficientOfVariation < 0.6) return 'medium';
    if (coefficientOfVariation < 1.0) return 'low';
    return 'none';
  }

  it('should classify as high confidence (CV < 0.3)', () => {
    const band = classifyConfidenceBand(500, 100); // CV = 0.2
    expect(band).toBe('high');
  });

  it('should classify as medium confidence (CV < 0.6)', () => {
    const band = classifyConfidenceBand(500, 250); // CV = 0.5
    expect(band).toBe('medium');
  });

  it('should classify as low confidence (CV < 1.0)', () => {
    const band = classifyConfidenceBand(500, 450); // CV = 0.9
    expect(band).toBe('low');
  });

  it('should classify as none for high variability (CV >= 1.0)', () => {
    const band = classifyConfidenceBand(500, 600); // CV = 1.2
    expect(band).toBe('none');
  });

  it('should handle zero velocity', () => {
    const band = classifyConfidenceBand(0, 100);
    expect(band).toBe('none');
  });

  it('should handle zero standard deviation (perfect consistency)', () => {
    const band = classifyConfidenceBand(500, 0); // CV = 0
    expect(band).toBe('high');
  });
});

// ============================================================================
// EMA Calculation Tests
// ============================================================================

describe('Exponential Moving Average (EMA)', () => {
  function calculateEMA(dailyXp: number[], alpha: number = 0.2): number {
    if (dailyXp.length === 0) return 0;
    
    let ema = dailyXp[0];
    
    for (let i = 1; i < dailyXp.length; i++) {
      ema = alpha * dailyXp[i] + (1 - alpha) * ema;
    }
    
    return Math.round(ema * 100) / 100;
  }

  it('should calculate EMA correctly', () => {
    const dailyXp = [400, 500, 450, 550, 480];
    const ema = calculateEMA(dailyXp, 0.2);
    
    expect(ema).toBeGreaterThan(400);
    expect(ema).toBeLessThan(550);
  });

  it('should weight recent data more heavily', () => {
    const stable = [400, 400, 400, 400, 400];
    const uptrend = [400, 400, 400, 600, 600];
    
    const emaStable = calculateEMA(stable, 0.2);
    const emaUptrend = calculateEMA(uptrend, 0.2);
    
    expect(emaUptrend).toBeGreaterThan(emaStable);
  });

  it('should return 0 for empty array', () => {
    const ema = calculateEMA([], 0.2);
    expect(ema).toBe(0);
  });

  it('should return first value for single-element array', () => {
    const ema = calculateEMA([500], 0.2);
    expect(ema).toBe(500);
  });

  it('should converge towards recent trend', () => {
    // Sudden spike after stable period
    const dailyXp = [400, 400, 400, 400, 1000];
    const ema = calculateEMA(dailyXp, 0.2);
    
    // EMA should be between stable (400) and spike (1000)
    expect(ema).toBeGreaterThan(400);
    expect(ema).toBeLessThan(1000);
  });
});

// ============================================================================
// Standard Deviation Tests
// ============================================================================

describe('Standard Deviation', () => {
  function calculateStdDev(values: number[]): number {
    if (values.length < 2) return 0;
    
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    
    return Math.round(Math.sqrt(variance) * 100) / 100;
  }

  it('should calculate standard deviation correctly', () => {
    const values = [400, 500, 450, 550, 480];
    const stdDev = calculateStdDev(values);
    
    expect(stdDev).toBeGreaterThan(0);
    expect(stdDev).toBeLessThan(100); // Should be reasonable
  });

  it('should return 0 for constant values', () => {
    const values = [500, 500, 500, 500];
    const stdDev = calculateStdDev(values);
    
    expect(stdDev).toBe(0);
  });

  it('should return 0 for single value', () => {
    const stdDev = calculateStdDev([500]);
    expect(stdDev).toBe(0);
  });

  it('should return 0 for empty array', () => {
    const stdDev = calculateStdDev([]);
    expect(stdDev).toBe(0);
  });

  it('should increase with greater variability', () => {
    const lowVar = [490, 500, 510];
    const highVar = [300, 500, 700];
    
    const stdDevLow = calculateStdDev(lowVar);
    const stdDevHigh = calculateStdDev(highVar);
    
    expect(stdDevHigh).toBeGreaterThan(stdDevLow);
  });
});

// ============================================================================
// Low-Signal Detection Tests
// ============================================================================

describe('Low-Signal Detection', () => {
  function isLowSignal(activeDays: number, velocity: number): boolean {
    const MIN_ACTIVE_DAYS = 3;
    const MIN_VELOCITY_THRESHOLD = 0.5;
    
    return activeDays < MIN_ACTIVE_DAYS || velocity < MIN_VELOCITY_THRESHOLD;
  }

  it('should detect low signal for insufficient active days', () => {
    expect(isLowSignal(2, 500)).toBe(true);
  });

  it('should detect low signal for very low velocity', () => {
    expect(isLowSignal(10, 0.3)).toBe(true);
  });

  it('should not flag as low signal for good data', () => {
    expect(isLowSignal(20, 400)).toBe(false);
  });

  it('should detect low signal for zero velocity', () => {
    expect(isLowSignal(10, 0)).toBe(true);
  });

  it('should detect low signal for exactly threshold values', () => {
    // Edge cases
    expect(isLowSignal(3, 0.5)).toBe(false); // Exactly at threshold
    expect(isLowSignal(2, 0.5)).toBe(true);  // Below active days threshold
    expect(isLowSignal(3, 0.4)).toBe(true);  // Below velocity threshold
  });
});

// ============================================================================
// Confidence Interval Tests
// ============================================================================

describe('Confidence Intervals', () => {
  function calculateConfidenceInterval(
    xpToNextLevel: number,
    velocity: number,
    stdDev: number
  ): { low: number; high: number } {
    const CONFIDENCE_MULTIPLIER = 1.96; // 95% CI
    
    const velocityLow = Math.max(0.1, velocity - CONFIDENCE_MULTIPLIER * stdDev);
    const velocityHigh = velocity + CONFIDENCE_MULTIPLIER * stdDev;
    
    const low = Math.ceil(xpToNextLevel / velocityHigh);
    const high = Math.ceil(xpToNextLevel / velocityLow);
    
    return { low, high };
  }

  it('should calculate 95% confidence interval', () => {
    const ci = calculateConfidenceInterval(10000, 500, 100);
    
    expect(ci.low).toBeLessThan(20); // ETA = 10000/500 = 20
    expect(ci.high).toBeGreaterThan(20);
  });

  it('should widen interval with higher std dev', () => {
    const narrow = calculateConfidenceInterval(10000, 500, 50);
    const wide = calculateConfidenceInterval(10000, 500, 200);
    
    expect(wide.high - wide.low).toBeGreaterThan(narrow.high - narrow.low);
  });

  it('should handle zero std dev (deterministic)', () => {
    const ci = calculateConfidenceInterval(10000, 500, 0);
    
    // With zero std dev, interval should be very narrow
    expect(ci.high - ci.low).toBeLessThanOrEqual(1);
  });

  it('should not produce negative velocity in CI', () => {
    // High std dev that would push velocity_low negative
    const ci = calculateConfidenceInterval(10000, 100, 100);
    
    // velocityLow clamped to 0.1, so high ETA
    expect(ci.high).toBeGreaterThan(0);
  });
});

// ============================================================================
// XP to Next Level Tests
// ============================================================================

describe('XP to Next Level Calculation', () => {
  const levelThresholds = [
    { level: 0, minXp: 0 },
    { level: 1, minXp: 5000 },
    { level: 2, minXp: 11000 },
    { level: 3, minXp: 18000 },
    { level: 4, minXp: 26000 },
    { level: 5, minXp: 35000 },
    { level: 6, minXp: 45000 },
    { level: 7, minXp: 56000 },
    { level: 8, minXp: 68000 },
    { level: 9, minXp: 81000 },
    { level: 10, minXp: 95000 },
    { level: 11, minXp: 110000 },
    { level: 12, minXp: 126000 },
    { level: 13, minXp: 143000 },
    { level: 14, minXp: 161000 },
    { level: 15, minXp: 180000 },
    { level: 16, minXp: 200000 },
    { level: 17, minXp: 221000 },
    { level: 18, minXp: 243000 },
  ];

  function getXpToNextLevel(currentXp: number, currentLevel: number): number {
    const nextLevel = levelThresholds.find(l => l.level === currentLevel + 1);
    if (!nextLevel) return 0; // Max level
    
    return nextLevel.minXp - currentXp;
  }

  it('should calculate XP to next level correctly', () => {
    const xpNeeded = getXpToNextLevel(45000, 6); // Level 6 to 7
    expect(xpNeeded).toBe(11000); // 56000 - 45000
  });

  it('should return 0 for max level', () => {
    const xpNeeded = getXpToNextLevel(243000, 18);
    expect(xpNeeded).toBe(0);
  });

  it('should handle mid-level progress', () => {
    const xpNeeded = getXpToNextLevel(50000, 6); // Halfway through level 6
    expect(xpNeeded).toBe(6000); // 56000 - 50000
  });

  it('should handle level 0 to 1', () => {
    const xpNeeded = getXpToNextLevel(2500, 0);
    expect(xpNeeded).toBe(2500); // 5000 - 2500
  });
});

// ============================================================================
// Edge Cases
// ============================================================================

describe('Edge Cases', () => {
  it('should handle negative XP values gracefully', () => {
    // This shouldn't happen in practice, but ensure it doesn't break
    const result = calculateETA(-100, 500, 50, 20);
    expect(result.etaDays).toBeNull();
  });

  it('should handle extremely high velocity', () => {
    const result = calculateETA(10000, 10000, 100, 20);
    expect(result.etaDays).toBe(1); // Should level up in 1 day
  });

  it('should handle extremely low velocity', () => {
    const result = calculateETA(10000, 0.1, 0, 20);
    expect(result.etaDays).toBeNull(); // Below threshold
  });

  it('should handle zero XP to next level', () => {
    const result = calculateETA(0, 500, 50, 20);
    expect(result.etaDays).toBeNull();
  });

  it('should handle very high standard deviation', () => {
    // Std dev > velocity
    const result = calculateETA(10000, 100, 200, 20);
    expect(result.confidenceBand).toBe('none');
  });
});

// ============================================================================
// Integration Scenario Tests
// ============================================================================

describe('Integration Scenarios', () => {
  it('should handle consistent daily reader', () => {
    // Student reads every day, ~500 XP/day
    const velocity = 500;
    const stdDev = 50; // Low variability
    const activeDays = 30;
    const xpToNextLevel = 10000;
    
    const result = calculateETA(xpToNextLevel, velocity, stdDev, activeDays);
    
    expect(result.etaDays).toBe(20);
    expect(result.confidenceBand).toBe('high');
  });

  it('should handle sporadic reader', () => {
    // Student reads irregularly, high variability
    const velocity = 300;
    const stdDev = 250; // High variability
    const activeDays = 8;
    const xpToNextLevel = 10000;
    
    const result = calculateETA(xpToNextLevel, velocity, stdDev, activeDays);
    
    expect(result.etaDays).toBeGreaterThan(0);
    expect(['low', 'none']).toContain(result.confidenceBand);
  });

  it('should handle new student with limited history', () => {
    // Only 2 days of activity
    const velocity = 500;
    const stdDev = 0;
    const activeDays = 2;
    const xpToNextLevel = 10000;
    
    const result = calculateETA(xpToNextLevel, velocity, stdDev, activeDays);
    
    expect(result.etaDays).toBeNull();
    expect(result.confidenceBand).toBe('none');
  });

  it('should handle student close to leveling up', () => {
    // Only 500 XP needed
    const velocity = 400;
    const stdDev = 50;
    const activeDays = 20;
    const xpToNextLevel = 500;
    
    const result = calculateETA(xpToNextLevel, velocity, stdDev, activeDays);
    
    expect(result.etaDays).toBeLessThanOrEqual(2); // Should level up in 1-2 days
    expect(result.confidenceBand).toBe('high');
  });
});

// ============================================================================
// Helper Function Tests
// ============================================================================

function calculateETA(
  xpToNextLevel: number,
  velocity: number,
  stdDev: number,
  activeDays: number
): {
  etaDays: number | null;
  etaDate: string | null;
  confidenceLow: number | null;
  confidenceHigh: number | null;
  confidenceBand: 'high' | 'medium' | 'low' | 'none';
} {
  const MIN_VELOCITY_THRESHOLD = 0.5;
  const MIN_ACTIVE_DAYS = 3;
  const CONFIDENCE_MULTIPLIER = 1.96;

  if (activeDays < MIN_ACTIVE_DAYS || velocity < MIN_VELOCITY_THRESHOLD || xpToNextLevel <= 0) {
    return {
      etaDays: null,
      etaDate: null,
      confidenceLow: null,
      confidenceHigh: null,
      confidenceBand: 'none',
    };
  }

  const etaDays = Math.ceil(xpToNextLevel / velocity);

  const velocityLow = Math.max(0.1, velocity - CONFIDENCE_MULTIPLIER * stdDev);
  const velocityHigh = velocity + CONFIDENCE_MULTIPLIER * stdDev;

  const confidenceHigh = Math.ceil(xpToNextLevel / velocityLow);
  const confidenceLow = Math.ceil(xpToNextLevel / velocityHigh);

  const etaDate = new Date();
  etaDate.setDate(etaDate.getDate() + etaDays);

  const coefficientOfVariation = velocity > 0 ? stdDev / velocity : Infinity;
  let confidenceBand: 'high' | 'medium' | 'low' | 'none';

  if (coefficientOfVariation < 0.3) {
    confidenceBand = 'high';
  } else if (coefficientOfVariation < 0.6) {
    confidenceBand = 'medium';
  } else if (coefficientOfVariation < 1.0) {
    confidenceBand = 'low';
  } else {
    confidenceBand = 'none';
  }

  return {
    etaDays,
    etaDate: etaDate.toISOString(),
    confidenceLow,
    confidenceHigh,
    confidenceBand,
  };
}
