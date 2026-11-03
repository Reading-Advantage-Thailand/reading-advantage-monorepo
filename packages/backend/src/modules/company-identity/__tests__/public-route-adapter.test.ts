import { describe, expect, it, vi } from "vitest";

import { createCompanyIdentityRouteAdapter } from "../public-route-adapter.js";

describe("public company identity route adapter", () => {
  it("runs the callback without a trusted request context", async () => {
    const operation = vi.fn(async () => undefined);
    const adapter = createCompanyIdentityRouteAdapter();

    await adapter.operations.oidcLogout(operation);
    expect(operation).toHaveBeenCalledTimes(1);
    expect(operation).toHaveBeenCalledWith(undefined);
  });

  it("freezes the adapter and its operations", () => {
    const adapter = createCompanyIdentityRouteAdapter();
    expect(Object.isFrozen(adapter)).toBe(true);
    expect(Object.isFrozen(adapter.operations)).toBe(true);
  });

  it("propagates a callback failure", async () => {
    const adapter = createCompanyIdentityRouteAdapter();
    await expect(adapter.operations.oidcLogout(async () => { throw new Error("boom"); })).rejects.toThrow("boom");
  });
});
