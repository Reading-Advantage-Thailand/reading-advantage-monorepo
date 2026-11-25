import { describe, expect, it } from "vitest";
import {
  computedFromClasses,
  declarationsForClass,
} from "./fixtures/real-css";

/**
 * Adversarial probes for the real-css fixture.
 * Each probe fails when the helper resolves a class to a default that
 * passes, or fails to map a real class to its compiled declaration.
 */

const ABSENT_CLASS = "zzz-absent-probe-class";

describe("real-css adversarial probes", () => {
  it("maps a real utility class to its compiled declaration", () => {
    const declarations = declarationsForClass("flex");
    expect(declarations).not.toBe("");
    expect(declarations).toMatch(/display:\s*flex/);
  });

  it("resolves a class absent from the stylesheet to nothing", () => {
    expect(declarationsForClass(ABSENT_CLASS)).toBe("");
  });

  it("does not let an absent class resolve to a computed default that passes", () => {
    const absent = computedFromClasses([ABSENT_CLASS], ["display"]);
    const bare = computedFromClasses([], ["display"]);
    expect(absent.display).toBe(bare.display);
    expect(absent.display).not.toBe("flex");
  });

  it("reads the real compiled value for a real class through jsdom", () => {
    const computed = computedFromClasses(["flex"], ["display"]);
    expect(computed.display).toBe("flex");
  });
});
