import { beforeEach, describe, expect, it, vi } from "vitest";

const { resolveCodecampCompanyPrincipal } = vi.hoisted(() => ({
  resolveCodecampCompanyPrincipal: vi.fn(),
}));

vi.mock("@reading-advantage/db", () => ({ db: { kind: "test-db" } }));
vi.mock("@reading-advantage/domain", () => ({
  resolveCodecampCompanyPrincipal,
}));

import {
  codecampSessionRole,
  getCodecampPublicOrigin,
  resolveCodecampSessionUser,
} from "../company-oidc";

const identity = {
  sub: "00000000-0000-4000-8000-000000000001",
  aud: "codecamp",
  organizationId: "20000000-0000-4000-8000-000000000003",
  organizationKey: "internal-company",
  username: "intern",
  displayName: "Intern",
  roles: ["INTERN"],
} as const;

describe("Codecamp company OIDC principal projection", () => {
  beforeEach(() => vi.clearAllMocks());

  it("derives the public origin from the registered callback URI", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv(
      "COMPANY_AUTH_ISSUER_URL",
      "https://accounts.reading-advantage.com",
    );
    vi.stubEnv("COMPANY_AUTH_OIDC_CLIENT_ID", "codecamp-web");
    vi.stubEnv("COMPANY_AUTH_OIDC_CLIENT_SECRET", "s".repeat(32));
    vi.stubEnv(
      "COMPANY_AUTH_OIDC_REDIRECT_URI",
      "https://codecamp.reading-advantage.com/api/auth/callback",
    );
    vi.stubEnv("COMPANY_AUTH_EXPECTED_AUDIENCE", "codecamp");

    expect(getCodecampPublicOrigin()).toBe(
      "https://codecamp.reading-advantage.com",
    );
  });

  it("uses the durable local mapping instead of the Accounts subject as user ID", async () => {
    resolveCodecampCompanyPrincipal.mockResolvedValue({
      user: { id: "legacy-user", role: "INTERN" },
      scope: { kind: "company", applicationKey: "codecamp" },
    });
    await expect(resolveCodecampSessionUser(identity)).resolves.toMatchObject({
      id: "legacy-user",
      role: "INTERN",
    });
    expect(resolveCodecampCompanyPrincipal).toHaveBeenCalledTimes(1);
  });

  it("fails closed when the local mapping is absent", async () => {
    resolveCodecampCompanyPrincipal.mockResolvedValue(null);
    await expect(resolveCodecampSessionUser(identity)).resolves.toBeNull();
  });

  it("passes identities without a Codecamp role through durable revocation", async () => {
    resolveCodecampCompanyPrincipal.mockResolvedValue(null);
    expect(() =>
      codecampSessionRole({ ...identity, roles: ["SALES_REP"] }),
    ).toThrow("no recognized Codecamp role");
    await expect(
      resolveCodecampSessionUser({ ...identity, roles: ["SALES_REP"] }),
    ).resolves.toBeNull();
    expect(resolveCodecampCompanyPrincipal).toHaveBeenCalledWith(
      { kind: "test-db" },
      { ...identity, roles: ["SALES_REP"] },
    );
  });
});
