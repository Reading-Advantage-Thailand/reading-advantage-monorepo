import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { beforeEach, describe, expect, it, vi } from "vitest";

const { createAIClientMock, introspectMock, marketingDbMock } = vi.hoisted(() => ({
  createAIClientMock: vi.fn(),
  introspectMock: vi.fn(),
  marketingDbMock: {
    insert: vi.fn(),
    select: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock("@/lib/company-oidc", async () => {
  const actual = await vi.importActual<typeof import("@/lib/company-oidc")>(
    "@/lib/company-oidc",
  );
  return {
    ...actual,
    getMarketingOidcClient: () => ({ introspect: introspectMock }),
  };
});

vi.mock("@/lib/db", () => ({ db: marketingDbMock }));
vi.mock("@reading-advantage/ai", () => ({
  createAIClient: createAIClientMock,
}));

const currentDirectory = dirname(fileURLToPath(import.meta.url));
const marketingAppRoot = resolve(currentDirectory, "..");

function activeSession(roles: readonly string[]) {
  return {
    identity: {
      sub: "11111111-1111-4111-8111-111111111111",
      username: "marketing-user",
      displayName: "Marketing User",
      aud: "marketing",
      sid: "22222222-2222-4222-8222-222222222222",
      organizationId: "33333333-3333-4333-8333-333333333333",
      organizationKey: "reading-advantage",
      status: "ACTIVE" as const,
      roles: [...roles],
      authVersion: 1,
    },
    expiresAt: "2030-01-01T00:00:00.000Z",
  };
}

function request(path = "/api/campaigns"): Request {
  return new Request(`https://marketing.reading-advantage.com${path}`, {
    headers: { cookie: "__Host-ra_marketing_session=valid-token" },
  });
}

describe("Marketing named permission matrix", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("denies anonymous, no-role, and company-admin-only sessions", async () => {
    const { requireMarketingPermission } = await import("@/lib/auth");

    const anonymous = await requireMarketingPermission(
      new Request("https://marketing.reading-advantage.com/api/campaigns"),
      "campaign:list",
    );
    expect(anonymous.ok).toBe(false);
    if (!anonymous.ok) expect(anonymous.response.status).toBe(401);

    for (const roles of [[], ["COMPANY_ADMIN"]]) {
      introspectMock.mockResolvedValueOnce(activeSession(roles));
      const denied = await requireMarketingPermission(request(), "campaign:list");
      expect(denied.ok).toBe(false);
      if (!denied.ok) expect(denied.response.status).toBe(403);
    }
  }, 15_000);

  it("grants members production permissions but keeps settings admin-only", async () => {
    const { hasMarketingPermission } = await import("@/lib/marketing-permissions");

    expect(hasMarketingPermission("MEMBER", "campaign:list")).toBe(true);
    expect(hasMarketingPermission("MEMBER", "campaign:create")).toBe(true);
    expect(hasMarketingPermission("MEMBER", "video:script:generate")).toBe(true);
    expect(hasMarketingPermission("MEMBER", "settings:read")).toBe(false);
    expect(hasMarketingPermission("MEMBER", "settings:write")).toBe(false);
    expect(hasMarketingPermission("MEMBER", "settings:test-connection")).toBe(false);
  });

  it("grants administrators every reviewed Marketing permission", async () => {
    const {
      MARKETING_PERMISSIONS,
      hasMarketingPermission,
    } = await import("@/lib/marketing-permissions");

    for (const permission of MARKETING_PERMISSIONS) {
      expect(hasMarketingPermission("ADMIN", permission)).toBe(true);
    }
  });

  it("projects the exact Marketing role and returns null after role removal", async () => {
    const { marketingSessionUser } = await import("@/lib/company-oidc");

    expect(marketingSessionUser(activeSession(["MEMBER"]).identity)?.role).toBe(
      "MEMBER",
    );
    expect(marketingSessionUser(activeSession(["ADMIN"]).identity)?.role).toBe(
      "ADMIN",
    );
    expect(marketingSessionUser(activeSession([]).identity)).toBeNull();
    expect(
      marketingSessionUser(activeSession(["COMPANY_ADMIN"]).identity),
    ).toBeNull();
  });
});

describe("Marketing session role-removal response", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns a clean forbidden session response after Marketing role removal", async () => {
    introspectMock.mockResolvedValue(activeSession([]));
    const { GET } = await import("@/api/auth/session/route");

    const response = await GET(request("/api/auth/session"));

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ session: null });
  });

  it("returns the exact MEMBER role for an active Marketing session", async () => {
    introspectMock.mockResolvedValue(activeSession(["MEMBER"]));
    const { GET } = await import("@/api/auth/session/route");

    const response = await GET(request("/api/auth/session"));
    const body = (await response.json()) as { session: { user: { role: string } } };

    expect(response.status).toBe(200);
    expect(body.session.user.role).toBe("MEMBER");
  });
});

describe("Marketing protected-route permission inventory", () => {
  it("maps every protected handler to one reviewed named permission", async () => {
    const { MARKETING_ROUTE_PERMISSION_INVENTORY } = await import(
      "@/lib/marketing-permissions"
    );
    const protectedFiles = [...new Set(
      MARKETING_ROUTE_PERMISSION_INVENTORY.map((entry) => entry.file),
    )];
    let exportedHandlerCount = 0;

    for (const file of protectedFiles) {
      const source = readFileSync(resolve(marketingAppRoot, file), "utf8");
      exportedHandlerCount += [...source.matchAll(/export async function (GET|POST|PATCH)\b/g)].length;
      expect(source).not.toContain("requireMarketingSession(request)");
    }

    expect(MARKETING_ROUTE_PERMISSION_INVENTORY).toHaveLength(exportedHandlerCount);
    for (const entry of MARKETING_ROUTE_PERMISSION_INVENTORY) {
      const source = readFileSync(resolve(marketingAppRoot, entry.file), "utf8");
      const escapedPermission = entry.permission.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      expect(source).toMatch(
        new RegExp(
          `export async function ${entry.method}\\b[\\s\\S]*?requireMarketingPermission\\(request,\\s*["']${escapedPermission}["']`,
        ),
      );
    }
  });

  it("counterexample detects a newly protected handler without authorization", async () => {
    const { MARKETING_ROUTE_PERMISSION_INVENTORY } = await import(
      "@/lib/marketing-permissions"
    );
    const inventoried = new Set(
      MARKETING_ROUTE_PERMISSION_INVENTORY.map(
        (entry) => `${entry.method} ${entry.path}`,
      ),
    );
    const counterexampleHandlers = [
      ...inventoried,
      "POST /api/video/unreviewed-operation",
    ];

    expect(counterexampleHandlers.filter((handler) => !inventoried.has(handler))).toEqual([
      "POST /api/video/unreviewed-operation",
    ]);
  });
});

describe("Marketing settings administrator boundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    introspectMock.mockResolvedValue(activeSession(["MEMBER"]));
  });

  it("blocks member settings reads and writes before database access", async () => {
    const { GET, POST } = await import("@/api/settings/route");

    const readResponse = await GET(request("/api/settings"));
    const writeResponse = await POST(
      new Request("https://marketing.reading-advantage.com/api/settings", {
        method: "POST",
        headers: {
          cookie: "__Host-ra_marketing_session=valid-token",
          "content-type": "application/json",
        },
        body: JSON.stringify({ "llm.provider": "openai" }),
      }),
    );

    expect(readResponse.status).toBe(403);
    expect(writeResponse.status).toBe(403);
    expect(marketingDbMock.select).not.toHaveBeenCalled();
    expect(marketingDbMock.insert).not.toHaveBeenCalled();
  });

  it("blocks member connection tests before AI client creation", async () => {
    const { POST } = await import("@/api/settings/test-connection/route");
    const response = await POST(
      new Request(
        "https://marketing.reading-advantage.com/api/settings/test-connection",
        {
          method: "POST",
          headers: {
            cookie: "__Host-ra_marketing_session=valid-token",
            "content-type": "application/json",
          },
          body: JSON.stringify({
            provider: "openai",
            modelName: "gpt-4o-mini",
            apiKey: "test-key",
          }),
        },
      ),
    );

    expect(response.status).toBe(403);
    expect(createAIClientMock).not.toHaveBeenCalled();
  });
});

describe("Settings connection Zod boundary", () => {
  it("rejects unsupported providers and unknown fields", async () => {
    const { settingsTestConnectionSchema } = await import(
      "@/lib/settings-schema"
    );

    expect(
      settingsTestConnectionSchema.safeParse({
        provider: "unreviewed-provider",
        modelName: "model",
        apiKey: "key",
      }).success,
    ).toBe(false);
    expect(
      settingsTestConnectionSchema.safeParse({
        provider: "openai",
        modelName: "model",
        apiKey: "key",
        extra: true,
      }).success,
    ).toBe(false);
  });
});
