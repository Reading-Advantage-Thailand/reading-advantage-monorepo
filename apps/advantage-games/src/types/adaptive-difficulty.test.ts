import {
  DEFAULT_WINDOW_SIZE,
  WEIGHTS,
} from './adaptive-difficulty';

describe('Adaptive Difficulty Types', () => {
  it('should have correct default window size', () => {
    expect(DEFAULT_WINDOW_SIZE).toBe(20);
  });

  it('should have correct weights', () => {
    expect(WEIGHTS.accuracy).toBe(0.5);
    expect(WEIGHTS.speed).toBe(0.3);
    expect(WEIGHTS.streak).toBe(0.2);
    expect(WEIGHTS.accuracy + WEIGHTS.speed + WEIGHTS.streak).toBe(1);
  });
});
