// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  resolve: vi.fn(),
  resolveLegacy: vi.fn(),
  validateSession: vi.fn(),
  legacyMode: vi.fn(),
}));

vi.mock("@reading-advantage/db", () => ({ db: { kind: "database" } }));
vi.mock("@reading-advantage/domain", () => ({
  resolveSalesCompanyPrincipal: mocks.resolve,
  resolveLegacySalesCompanyPrincipal: mocks.resolveLegacy,
}));
vi.mock("@reading-advantage/auth", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@reading-advantage/auth")>()),
  validateSession: mocks.validateSession,
}));
vi.mock("./auth-mode", () => ({
  isLegacySalesAuthEnabled: mocks.legacyMode,
}));

import { authenticateSalesRequest, salesSessionUser } from "./company-oidc";

const identity = {
  sub: "00000000-0000-4000-8000-000000000001",
  aud: "sales",
  status: "ACTIVE" as const,
  organizationId: "20000000-0000-4000-8000-000000000003",
  organizationKey: "internal-company",
  username: "dual.product.user",
  displayName: "Dual Product User",
  roles: [] as string[],
  sid: "company-session",
  authVersion: 1,
};

const mappedLegacyPrincipal = {
  user: {
    id: `sales:${identity.sub}`,
    username: `sales:${identity.sub}`,
    name: "Dual Product User",
    role: "SALES_REP" as const,
    schoolId: null,
    xp: 0,
    level: 1,
    cefrLevel: "N/A",
  },
  scope: {
    kind: "company" as const,
    applicationKey: "sales" as const,
    organizationId: identity.organizationId,
    organizationKey: identity.organizationKey,
  },
};

describe("Sales company session projection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.legacyMode.mockReturnValue(false);
  });

  it("fails closed immediately without waiting for PostgreSQL when the role is absent", async () => {
    mocks.resolve.mockReturnValue(new Promise(() => undefined));

    await expect(salesSessionUser(identity)).resolves.toBeNull();
    expect(mocks.resolve).toHaveBeenCalledTimes(1);
  });

  it("retries failed best-effort deauthorization on a later no-role request", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    mocks.resolve
      .mockRejectedValueOnce(new Error("database unavailable"))
      .mockResolvedValueOnce(null);

    await expect(salesSessionUser(identity)).resolves.toBeNull();
    await vi.waitFor(() => expect(warn).toHaveBeenCalledTimes(1));
    await expect(salesSessionUser(identity)).resolves.toBeNull();
    await vi.waitFor(() => expect(mocks.resolve).toHaveBeenCalledTimes(2));

    warn.mockRestore();
  });

  it("awaits durable principal resolution when a Sales role is present", async () => {
    const principal = {
      user: { id: "sales:subject" },
      scope: { kind: "company" },
    };
    mocks.resolve.mockResolvedValue(principal);

    await expect(
      salesSessionUser({ ...identity, roles: ["SALES_REP"] }),
    ).resolves.toBe(principal);
  });

  it("authenticates repaired legacy credentials but authorizes only the exact mapped Sales principal", async () => {
    const sourceSchoolId = "00000000-0000-4000-8000-000000000099";
    mocks.legacyMode.mockReturnValue(true);
    mocks.validateSession.mockResolvedValue({
      user: {
        id: identity.sub,
        username: "dual.product.user",
        name: "Dual Product User",
        role: "ADMIN",
        schoolId: sourceSchoolId,
        xp: 99,
        level: 9,
        cefrLevel: "C1",
      },
    });
    mocks.resolveLegacy.mockResolvedValue(mappedLegacyPrincipal);
    const request = new Request(
      "https://sales.reading-advantage.com/api/trpc",
      {
        headers: {
          cookie: "session_token=legacy-cookie-token",
          authorization: "Bearer ignored-bearer-token",
        },
      },
    );

    await expect(authenticateSalesRequest(request)).resolves.toEqual(
      mappedLegacyPrincipal,
    );
    expect(mocks.validateSession).toHaveBeenCalledWith(
      { kind: "database" },
      "legacy-cookie-token",
    );
    expect(mocks.resolveLegacy).toHaveBeenCalledWith(
      { kind: "database" },
      identity.sub,
    );
  });

  it("denies arbitrary global admins and revoked mapped roles in legacy mode", async () => {
    mocks.legacyMode.mockReturnValue(true);
    mocks.validateSession.mockResolvedValue({
      user: {
        id: identity.sub,
        username: "global-admin",
        name: "Global Admin",
        role: "ADMIN",
        schoolId: null,
        xp: 0,
        level: 1,
        cefrLevel: "N/A",
      },
    });
    mocks.resolveLegacy.mockResolvedValue(null);
    const request = new Request(
      "https://sales.reading-advantage.com/api/auth/session",
      { headers: { cookie: "session_token=legacy-cookie-token" } },
    );

    await expect(authenticateSalesRequest(request)).resolves.toBeNull();
  });
});
