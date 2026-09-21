import { afterEach, describe, expect, it, vi } from "vitest";

import { resolveMarketingCookieName } from "./company-oidc";

describe("Marketing OIDC cookie names", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("uses unprefixed names outside production and host-only names in production", () => {
    vi.stubEnv("NODE_ENV", "development");
    expect(resolveMarketingCookieName("ra_marketing_session")).toBe(
      "ra_marketing_session",
    );
    expect(resolveMarketingCookieName("ra_marketing_oidc_tx")).toBe(
      "ra_marketing_oidc_tx",
    );

    vi.stubEnv("NODE_ENV", "production");
    expect(resolveMarketingCookieName("ra_marketing_session")).toBe(
      "__Host-ra_marketing_session",
    );
    expect(resolveMarketingCookieName("ra_marketing_oidc_tx")).toBe(
      "__Host-ra_marketing_oidc_tx",
    );
  });
});
