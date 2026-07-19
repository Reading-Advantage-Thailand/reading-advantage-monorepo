import { describe, expect, it } from "vitest";

import { getCodecampAuthMode, isLegacyCodecampAuthEnabled } from "./auth-mode";

describe("Codecamp auth mode", () => {
  it("defaults to company mode and enables legacy only by exact opt-in", () => {
    expect(getCodecampAuthMode({})).toBe("company");
    expect(isLegacyCodecampAuthEnabled({ CODECAMP_AUTH_MODE: "company" })).toBe(false);
    expect(isLegacyCodecampAuthEnabled({ CODECAMP_AUTH_MODE: "legacy" })).toBe(true);
  });

  it.each(["legacy-school", "COMPANY", "", " company "])(
    "rejects unsupported or ambiguous value %j",
    (mode) => {
      expect(() => getCodecampAuthMode({ CODECAMP_AUTH_MODE: mode })).toThrow(
        "CODECAMP_AUTH_MODE must be company or legacy",
      );
    },
  );
});
