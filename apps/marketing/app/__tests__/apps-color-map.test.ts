import { describe, expect, it } from "vitest";
import { APPS, APP_COLORS } from "@/lib/apps";

describe("APP_COLORS application map", () => {
  it("keys exactly one color per shared application identifier", () => {
    expect(Object.keys(APP_COLORS).sort()).toEqual([...APPS].sort());
  });

  it("binds each color to the application name, not the catalog index", () => {
    expect(APP_COLORS["reading-advantage"]).toBe("#4CAF50");
    expect(APP_COLORS["tutor-advantage"]).toBe("#607D8B");
  });
});
