import { describe, expect, it } from 'vitest';
import { depthOf, directionRow, project } from '../view2d/projection.js';

describe('2D projection', () => {
  const p = { elevation: 45, ppm: 64, uMin: -5, vMax: 4, width: 640, height: 512 };

  it('puts the ground origin where the bake does', () => {
    const o = project(p, 0, 0, 0);
    expect(o.x).toBeCloseTo(5 * 64);
    expect(o.y).toBeCloseTo(4 * 64);
  });

  it('moves a nearer point down the screen and a higher point up', () => {
    expect(project(p, 0, 0, 1).y).toBeGreaterThan(project(p, 0, 0, 0).y);
    expect(project(p, 0, 1, 0).y).toBeLessThan(project(p, 0, 0, 0).y);
  });

  it('draws nearer things later', () => {
    expect(depthOf(2)).toBeGreaterThan(depthOf(1));
  });

  it('picks the forge sheet row for a direction', () => {
    expect(directionRow(0, 1, 8)).toBe(0); // S: toward the camera
    expect(directionRow(-1, 1, 8)).toBe(1); // SW
    expect(directionRow(-1, 0, 8)).toBe(2); // W
    expect(directionRow(0, -1, 8)).toBe(4); // N
    expect(directionRow(1, 0, 8)).toBe(6); // E
    expect(directionRow(-1, 0, 4)).toBe(1); // W of a 4-direction sheet
    expect(directionRow(1, 0, 4)).toBe(3); // E
    expect(directionRow(0, 0, 8)).toBe(0);
    expect(directionRow(1, 0, 1)).toBe(0);
  });
});
