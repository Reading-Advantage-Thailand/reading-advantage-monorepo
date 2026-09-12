import { describe, expect, it } from "vitest";
import { getWizardZombieIntent } from "./wizard-zombie-behavior.js";

const base = { seed: 29, timeMs: 1000, position: { x: 80, y: 80 }, target: { x: 480, y: 270 }, baseSpeed: 96 };

describe("Wizard zombie pursuit variety", () => {
  it("gives a group different speeds, routes, and animation phases", () => {
    const group = Array.from({ length: 12 }, (_, index) => getWizardZombieIntent({ ...base, id: `zombie-${index}` }));
    expect(new Set(group.map(({ speed }) => speed)).size).toBeGreaterThan(6);
    expect(new Set(group.map(({ target }) => JSON.stringify(target))).size).toBeGreaterThan(2);
    expect(new Set(group.map(({ animationOffsetMs }) => animationOffsetMs)).size).toBe(12);
    expect(group.some(({ speed }) => speed === 0)).toBe(true);
    expect(group.some(({ speed }) => speed > 0)).toBe(true);
  });

  it("keeps movement reproducible after responsive restore", () => {
    const input = { ...base, id: "zombie-8" };
    expect(getWizardZombieIntent(input)).toEqual(getWizardZombieIntent(structuredClone(input)));
    expect(input).toEqual({ ...base, id: "zombie-8" });
  });

  it("commits to the wizard at close range instead of orbiting forever", () => {
    for (let index = 0; index < 12; index += 1) {
      const intent = getWizardZombieIntent({ ...base, id: `zombie-${index}`, position: { x: 470, y: 260 } });
      expect(intent.target).toEqual(base.target);
    }
  });

  it("bounds speed and gives every profile movement during its cycle", () => {
    for (let index = 0; index < 12; index += 1) {
      const speeds = Array.from({ length: 29 }, (_, tick) => getWizardZombieIntent({ ...base, id: `zombie-${index}`, timeMs: tick * 100 }).speed);
      expect(Math.min(...speeds)).toBeGreaterThanOrEqual(0);
      expect(Math.max(...speeds)).toBeLessThan(150);
      expect(speeds.some((speed) => speed > 0)).toBe(true);
    }
  });
});
