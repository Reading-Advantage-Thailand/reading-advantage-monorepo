import { describe, expect, it } from "vitest";
import { chooseRenderer } from "../renderer";

describe("chooseRenderer", () => {
  it("picks 3D on a device with WebGL2 and no setting", () => {
    expect(chooseRenderer({ search: "", saved: null, webgl2: true })).toBe("3d");
  });
  it("falls back to 2D without WebGL2", () => {
    expect(chooseRenderer({ search: "", saved: null, webgl2: false })).toBe("2d");
  });
  it("honours the games' 2D mode setting", () => {
    expect(chooseRenderer({ search: "", saved: JSON.stringify({ flat: true, looks: {} }), webgl2: true })).toBe("2d");
    expect(chooseRenderer({ search: "", saved: JSON.stringify({ flat: false }), webgl2: true })).toBe("3d");
  });
  it("honours ?renderer=phaser", () => {
    expect(chooseRenderer({ search: "?renderer=phaser", saved: null, webgl2: true })).toBe("2d");
  });
  it("treats unreadable settings as no setting", () => {
    expect(chooseRenderer({ search: "", saved: "{not json", webgl2: true })).toBe("3d");
  });
});
