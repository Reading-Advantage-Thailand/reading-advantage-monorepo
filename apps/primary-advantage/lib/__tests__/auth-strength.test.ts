import { describe, expect, it } from "vitest";
import { canUseFullAuthFeature, FULL_AUTH_ONLY_ROUTES, requiresFullAuth } from "../auth-strength";

describe("canUseFullAuthFeature", () => {
  it("denies a missing session", () => {
    expect(canUseFullAuthFeature(null)).toBe(false);
  });

  it("allows a full session", () => {
    expect(canUseFullAuthFeature({ authStrength: "full" })).toBe(true);
  });

  it("denies a code_only session", () => {
    expect(canUseFullAuthFeature({ authStrength: "code_only" })).toBe(false);
  });

  it("treats a session without a strength as not full", () => {
    expect(canUseFullAuthFeature({})).toBe(false);
  });
});

describe("requiresFullAuth", () => {
  it("lists Reedy and profile changes", () => {
    expect(FULL_AUTH_ONLY_ROUTES.length).toBeGreaterThan(0);
    expect(requiresFullAuth("/student/reedy")).toBe(true);
    expect(requiresFullAuth("/api/reedy/session")).toBe(true);
    expect(requiresFullAuth("/settings/profile")).toBe(true);
  });

  it("does not match unrelated or look-alike paths", () => {
    expect(requiresFullAuth("/student/read")).toBe(false);
    expect(requiresFullAuth("/student/reedyx")).toBe(false);
    expect(requiresFullAuth("/")).toBe(false);
  });
});
