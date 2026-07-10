import { describe, expect, it } from "vitest";

import { projectIsometricPoint } from "./projection";

describe("isometric projection", () => {
  it("projects grid coordinates deterministically around the supplied origin", () => {
    expect(
      projectIsometricPoint(
        { gridX: 2, gridY: 0, elevation: 1 },
        { originX: 480, originY: 430, tileWidth: 160, tileHeight: 64, elevationHeight: 96 },
      ),
    ).toEqual({ x: 640, y: 398, depth: 398_001 });
  });

  it("orders lower screen-space tiles in front while retaining elevation stability", () => {
    const options = {
      originX: 480,
      originY: 500,
      tileWidth: 160,
      tileHeight: 64,
      elevationHeight: 96,
    };
    const upper = projectIsometricPoint(
      { gridX: 2, gridY: 2, elevation: 2 },
      options,
    );
    const lower = projectIsometricPoint(
      { gridX: 1, gridY: 1, elevation: 0 },
      options,
    );

    expect(lower.y).toBeGreaterThan(upper.y);
    expect(lower.depth).toBeGreaterThan(upper.depth);
  });
});
