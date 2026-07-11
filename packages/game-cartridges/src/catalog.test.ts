import { describe, expect, it } from "vitest";

import {
  cartridgeCatalog,
  cartridgeLoaders,
  getCartridgeCatalogEntry,
} from "./catalog";

describe("APK cartridge quarantine", () => {
  it("exposes no cartridge built against the invalid asset ABI", () => {
    expect(cartridgeCatalog).toEqual([]);
    expect(cartridgeLoaders).toEqual({});
    expect(getCartridgeCatalogEntry("dragon-flight")).toBeUndefined();
  });
});
