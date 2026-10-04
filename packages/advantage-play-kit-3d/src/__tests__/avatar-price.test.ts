import { describe, expect, it } from 'vitest';
import { avatarPrice, ratingBonus, triangleBonus } from '../avatar/price.js';

describe('avatar price', () => {
  it('bands the triangle bonus and caps it at 30%', () => {
    expect([null, 644, 2499, 2500, 5000, 5001, 8000, 8001, 18914].map(triangleBonus))
      .toEqual([0, 0, 0, 0.1, 0.1, 0.2, 0.2, 0.3, 0.3]);
  });

  it('gives no bonus for a missing or low rating', () => {
    expect([null, 6.9, 7, 7.9, 8, 9.5].map(ratingBonus)).toEqual([0, 0, 0.1, 0.1, 0.2, 0.2]);
  });

  it('prices by slot and tier, rounded to 5', () => {
    expect(avatarPrice({ slot: 'chest', tier: 1, triangles: 2000, rating: null })).toBe(50);
    expect(avatarPrice({ slot: 'chest', tier: 3, triangles: 6700, rating: 7.5 })).toBe(260);
    expect(avatarPrice({ slot: 'feet', tier: 1, triangles: 2770, rating: 7.1 })).toBe(25);
    expect(avatarPrice({ slot: 'none', tier: 1, triangles: 1388, rating: 7 })).toBe(0);
  });

  it('rejects an unknown tier', () => {
    expect(() => avatarPrice({ slot: 'head', tier: 4, triangles: null, rating: null })).toThrow();
  });
});
