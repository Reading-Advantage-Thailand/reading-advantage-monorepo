import { getPortalFrame } from "./potionRushEffects";

describe("getPortalFrame", () => {
  it("returns a stable frame at time 0", () => {
    const frame = getPortalFrame(0);

    expect(frame.rotation).toBe(0);
    expect(frame.pulse).toBeCloseTo(1, 5);
    expect(frame.shimmer).toBeCloseTo(0.6, 5);
  });

  it("advances rotation over time", () => {
    const frame = getPortalFrame(2000);

    expect(frame.rotation).toBeCloseTo(180, 5);
  });

  it("pulses over time", () => {
    const frame = getPortalFrame(250);

    expect(frame.pulse).toBeCloseTo(1.08, 5);
  });
});
