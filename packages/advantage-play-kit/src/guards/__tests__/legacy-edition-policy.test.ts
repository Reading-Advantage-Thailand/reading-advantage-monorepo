import { describe, expect, it } from "vitest";

import {
  EDITIONS_MODULE_PATH,
  EDITIONS_POLICY,
  isEditionsModulePath,
  LEGACY_EDITION_POLICY_DIAGNOSTIC,
} from "../legacy-edition-policy.js";

describe("legacy edition policy guard", () => {
  it("marks the editions module as a deprecated legacy compatibility surface", () => {
    expect(EDITIONS_POLICY.status).toBe("deprecated-legacy-compatibility-surface");
    expect(EDITIONS_POLICY.productionSurfaceForNewCartridges).toBe(false);
  });

  it("identifies the exact editions module path", () => {
    expect(EDITIONS_MODULE_PATH).toBe("./editions/index.js");
    expect(isEditionsModulePath("./editions/index.js")).toBe(true);
    expect(isEditionsModulePath("./systems/index.js")).toBe(false);
  });

  it("documents that new shared-kit modules must not import edition/theme bindings", () => {
    expect(LEGACY_EDITION_POLICY_DIAGNOSTIC.reason).toMatch(/75-file dual-pack ABI/i);
    expect(LEGACY_EDITION_POLICY_DIAGNOSTIC.requiredReplacement).toMatch(/canonical standard-pack resolver/i);
  });

  it("lists the new-kit modules that must stay edition-free", () => {
    for (const path of EDITIONS_POLICY.editionFreeModules) {
      expect(path).toMatch(/^\.\//u);
      expect(path).not.toContain("editions");
    }
  });
});
