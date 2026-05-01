import { AdjustmentEngine } from './adjustment-engine';

describe('AdjustmentEngine', () => {
  let engine: AdjustmentEngine;

  beforeEach(() => {
    engine = new AdjustmentEngine();
  });

  describe('initialization', () => {
    it('should initialize with default config', () => {
      const config = engine.getConfig();
      expect(config.alpha).toBe(0.3);
      expect(config.increaseThreshold).toBe(80);
      expect(config.decreaseThreshold).toBe(40);
      expect(config.maxChangePercent).toBe(0.15);
      expect(config.cycleSize).toBe(5);
    });

    it('should accept custom config', () => {
      const customEngine = new AdjustmentEngine({ alpha: 0.5 });
      expect(customEngine.getConfig().alpha).toBe(0.5);
    });

    it('should initialize with neutral EMA score', () => {
      expect(engine.getEmaScore()).toBe(50);
    });
  });

  describe('adjustParameter', () => {
    it('should increase parameter when score is high', () => {
      // Feed multiple high scores to build up EMA above threshold
      let result;
      for (let i = 0; i < 5; i++) {
        result = engine.adjustParameter(50, 0, 100, {
          score: 95,
          accuracy: 95,
          speed: 95,
          streak: 95,
        });
      }

      expect(result!.direction).toBe('increase');
      expect(result!.adjustedValue).toBeGreaterThan(50);
      expect(result!.rawScore).toBe(95);
    });

    it('should decrease parameter when score is low', () => {
      // Feed multiple low scores to drive EMA below threshold
      let result;
      for (let i = 0; i < 5; i++) {
        result = engine.adjustParameter(50, 0, 100, {
          score: 10,
          accuracy: 10,
          speed: 10,
          streak: 10,
        });
      }

      expect(result!.direction).toBe('decrease');
      expect(result!.adjustedValue).toBeLessThan(50);
    });

    it('should hold parameter when score is in flow zone', () => {
      const result = engine.adjustParameter(50, 0, 100, {
        score: 60,
        accuracy: 60,
        speed: 60,
        streak: 60,
      });

      expect(result.direction).toBe('hold');
      expect(result.adjustedValue).toBe(50);
    });

    it('should clamp to max bound', () => {
      const result = engine.adjustParameter(95, 0, 100, {
        score: 100,
        accuracy: 100,
        speed: 100,
        streak: 100,
      });

      expect(result.adjustedValue).toBeLessThanOrEqual(100);
    });

    it('should clamp to min bound', () => {
      const result = engine.adjustParameter(5, 0, 100, {
        score: 0,
        accuracy: 0,
        speed: 0,
        streak: 0,
      });

      expect(result.adjustedValue).toBeGreaterThanOrEqual(0);
    });

    it('should limit change to maxChangePercent', () => {
      const result = engine.adjustParameter(50, 0, 100, {
        score: 100,
        accuracy: 100,
        speed: 100,
        streak: 100,
      });

      const maxChange = 100 * 0.15; // 15% of range
      expect(result.delta).toBeLessThanOrEqual(maxChange);
    });

    it('should update EMA score', () => {
      engine.adjustParameter(50, 0, 100, {
        score: 100,
        accuracy: 100,
        speed: 100,
        streak: 100,
      });

      expect(engine.getEmaScore()).toBeGreaterThan(50);
    });

    it('should track response count', () => {
      engine.adjustParameter(50, 0, 100, {
        score: 60,
        accuracy: 60,
        speed: 60,
        streak: 60,
      });

      expect(engine.getResponseCount()).toBe(1);
    });
  });

  describe('shouldAdjust', () => {
    it('should return false before cycle size reached', () => {
      expect(engine.shouldAdjust()).toBe(false);

      engine.adjustParameter(50, 0, 100, {
        score: 60,
        accuracy: 60,
        speed: 60,
        streak: 60,
      });

      expect(engine.shouldAdjust()).toBe(false);
    });

    it('should return true after cycle size reached', () => {
      for (let i = 0; i < 5; i++) {
        engine.adjustParameter(50, 0, 100, {
          score: 60,
          accuracy: 60,
          speed: 60,
          streak: 60,
        });
      }

      expect(engine.shouldAdjust()).toBe(true);
    });
  });

  describe('reset', () => {
    it('should reset EMA and response count', () => {
      engine.adjustParameter(50, 0, 100, {
        score: 100,
        accuracy: 100,
        speed: 100,
        streak: 100,
      });

      engine.reset();

      expect(engine.getEmaScore()).toBe(50);
      expect(engine.getResponseCount()).toBe(0);
    });
  });

  describe('EMA smoothing', () => {
    it('should smooth scores over time', () => {
      // First high score
      engine.adjustParameter(50, 0, 100, {
        score: 100,
        accuracy: 100,
        speed: 100,
        streak: 100,
      });

      const emaAfterFirst = engine.getEmaScore();

      // Second low score should be smoothed
      engine.adjustParameter(50, 0, 100, {
        score: 0,
        accuracy: 0,
        speed: 0,
        streak: 0,
      });

      const emaAfterSecond = engine.getEmaScore();

      // EMA should be between 0 and 100
      expect(emaAfterFirst).toBeGreaterThan(50);
      expect(emaAfterSecond).toBeLessThan(emaAfterFirst);
      expect(emaAfterSecond).toBeGreaterThan(0);
    });
  });
});
