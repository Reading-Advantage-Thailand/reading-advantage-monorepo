import { afterEach, describe, expect, it, vi } from "vitest";

import { resolveAccountingCookieName } from "../company-oidc";

describe("Accounting OIDC cookie names", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("uses unprefixed names outside production and host-only names in production", () => {
    vi.stubEnv("NODE_ENV", "development");
    expect(resolveAccountingCookieName("ra_accounting_session")).toBe(
      "ra_accounting_session",
    );
    expect(resolveAccountingCookieName("ra_accounting_oidc_tx")).toBe(
      "ra_accounting_oidc_tx",
    );

    vi.stubEnv("NODE_ENV", "production");
    expect(resolveAccountingCookieName("ra_accounting_session")).toBe(
      "__Host-ra_accounting_session",
    );
    expect(resolveAccountingCookieName("ra_accounting_oidc_tx")).toBe(
      "__Host-ra_accounting_oidc_tx",
    );
  });
});
