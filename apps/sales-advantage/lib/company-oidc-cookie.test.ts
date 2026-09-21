import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@reading-advantage/db", () => ({ db: { kind: "database" } }));
vi.mock("@reading-advantage/domain", () => ({
  resolveSalesCompanyPrincipal: vi.fn(),
  resolveLegacySalesCompanyPrincipal: vi.fn(),
}));

import { resolveSalesCookieName } from "./company-oidc";

describe("Sales OIDC cookie names", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("uses unprefixed names outside production and host-only names in production", () => {
    vi.stubEnv("NODE_ENV", "development");
    expect(resolveSalesCookieName("ra_sales_session")).toBe("ra_sales_session");
    expect(resolveSalesCookieName("ra_sales_oidc_tx")).toBe("ra_sales_oidc_tx");

    vi.stubEnv("NODE_ENV", "production");
    expect(resolveSalesCookieName("ra_sales_session")).toBe(
      "__Host-ra_sales_session",
    );
    expect(resolveSalesCookieName("ra_sales_oidc_tx")).toBe(
      "__Host-ra_sales_oidc_tx",
    );
  });
});
