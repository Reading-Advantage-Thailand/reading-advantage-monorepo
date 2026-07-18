/** Marketing application roles issued by Accounts for the Marketing audience. */
export type MarketingRole = "MEMBER" | "ADMIN";

/** Named operations protected by the Marketing application boundary. */
export type MarketingPermission =
  | "campaign:list"
  | "campaign:create"
  | "campaign:read"
  | "campaign:update"
  | "video:projects:list"
  | "video:projects:create"
  | "video:projects:update"
  | "video:topics:research"
  | "video:topics:save"
  | "video:script:generate"
  | "settings:read"
  | "settings:write"
  | "settings:test-connection";

/** Reviewed list of every permission recognized by Marketing. */
export const MARKETING_PERMISSIONS = [
  "campaign:list",
  "campaign:create",
  "campaign:read",
  "campaign:update",
  "video:projects:list",
  "video:projects:create",
  "video:projects:update",
  "video:topics:research",
  "video:topics:save",
  "video:script:generate",
  "settings:read",
  "settings:write",
  "settings:test-connection",
] as const satisfies readonly MarketingPermission[];

/** Explicit Marketing role-to-permission policy reviewed for company SSO. */
export const MARKETING_ROLE_PERMISSIONS = {
  MEMBER: [
    "campaign:list",
    "campaign:create",
    "campaign:read",
    "campaign:update",
    "video:projects:list",
    "video:projects:create",
    "video:projects:update",
    "video:topics:research",
    "video:topics:save",
    "video:script:generate",
  ],
  ADMIN: MARKETING_PERMISSIONS,
} as const satisfies Record<MarketingRole, readonly MarketingPermission[]>;

/** One protected Marketing HTTP handler and its required permission. */
export interface MarketingRoutePermission {
  /** Route source path relative to `apps/marketing/app`. */
  readonly file: string;
  /** Public HTTP route pattern. */
  readonly path: string;
  /** HTTP method exported by the route module. */
  readonly method: "GET" | "POST" | "PATCH";
  /** Named permission required before route work begins. */
  readonly permission: MarketingPermission;
}

/** Auditable inventory of all protected Marketing product route handlers. */
export const MARKETING_ROUTE_PERMISSION_INVENTORY = [
  { file: "api/campaigns/route.ts", path: "/api/campaigns", method: "GET", permission: "campaign:list" },
  { file: "api/campaigns/route.ts", path: "/api/campaigns", method: "POST", permission: "campaign:create" },
  { file: "api/campaigns/[id]/route.ts", path: "/api/campaigns/[id]", method: "GET", permission: "campaign:read" },
  { file: "api/campaigns/[id]/route.ts", path: "/api/campaigns/[id]", method: "PATCH", permission: "campaign:update" },
  { file: "api/video/projects/route.ts", path: "/api/video/projects", method: "GET", permission: "video:projects:list" },
  { file: "api/video/projects/route.ts", path: "/api/video/projects", method: "POST", permission: "video:projects:create" },
  { file: "api/video/projects/route.ts", path: "/api/video/projects", method: "PATCH", permission: "video:projects:update" },
  { file: "api/video/research-topics/route.ts", path: "/api/video/research-topics", method: "POST", permission: "video:topics:research" },
  { file: "api/video/save-topics/route.ts", path: "/api/video/save-topics", method: "POST", permission: "video:topics:save" },
  { file: "api/video/generate-script/route.ts", path: "/api/video/generate-script", method: "POST", permission: "video:script:generate" },
  { file: "api/settings/route.ts", path: "/api/settings", method: "GET", permission: "settings:read" },
  { file: "api/settings/route.ts", path: "/api/settings", method: "POST", permission: "settings:write" },
  { file: "api/settings/test-connection/route.ts", path: "/api/settings/test-connection", method: "POST", permission: "settings:test-connection" },
] as const satisfies readonly MarketingRoutePermission[];

/**
 * Resolves the strongest exact Marketing role from audience-scoped claims.
 * @param roles Role keys returned by Accounts introspection.
 * @returns ADMIN, MEMBER, or null when Marketing access has been removed.
 */
export function resolveMarketingRole(roles: readonly string[]): MarketingRole | null {
  if (roles.includes("ADMIN")) return "ADMIN";
  if (roles.includes("MEMBER")) return "MEMBER";
  return null;
}

/**
 * Evaluates one Marketing role against the reviewed permission matrix.
 * @param role Exact Marketing application role.
 * @param permission Named operation requested by a route.
 * @returns Whether the role may perform the operation.
 */
export function hasMarketingPermission(
  role: MarketingRole,
  permission: MarketingPermission,
): boolean {
  return (MARKETING_ROLE_PERMISSIONS[role] as readonly MarketingPermission[]).includes(
    permission,
  );
}
