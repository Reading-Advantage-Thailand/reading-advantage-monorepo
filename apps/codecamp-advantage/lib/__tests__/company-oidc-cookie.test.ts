import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@reading-advantage/db", () => ({ db: { kind: "test-db" } }));
vi.mock("@reading-advantage/domain", () => ({
  resolveCodecampCompanyPrincipal: vi.fn(),
}));

import { resolveCodecampCookieName } from "../company-oidc";

describe("Codecamp OIDC cookie names", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("uses unprefixed names outside production and host-only names in production", () => {
    vi.stubEnv("NODE_ENV", "development");
    expect(resolveCodecampCookieName("ra_codecamp_session")).toBe(
      "ra_codecamp_session",
    );
    expect(resolveCodecampCookieName("ra_codecamp_oidc_tx")).toBe(
      "ra_codecamp_oidc_tx",
    );

    vi.stubEnv("NODE_ENV", "production");
    expect(resolveCodecampCookieName("ra_codecamp_session")).toBe(
      "__Host-ra_codecamp_session",
    );
    expect(resolveCodecampCookieName("ra_codecamp_oidc_tx")).toBe(
      "__Host-ra_codecamp_oidc_tx",
    );
  });
});
