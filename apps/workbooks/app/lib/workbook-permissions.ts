/** Workbooks application roles issued by Accounts for the Workbooks audience. */
export type WorkbookRole = "WORKBOOK_ADMIN";

/** Named operations protected by the Workbooks application boundary. */
export type WorkbookPermission =
  | "draft:list"
  | "draft:create"
  | "draft:read"
  | "draft:update"
  | "edition:read"
  | "edition:publish"
  | "edition:revoke";

/** Reviewed list of every permission recognized by Workbooks. */
export const WORKBOOK_PERMISSIONS = [
  "draft:list",
  "draft:create",
  "draft:read",
  "draft:update",
  "edition:read",
  "edition:publish",
  "edition:revoke",
] as const satisfies readonly WorkbookPermission[];

/** Explicit Workbooks role-to-permission policy reviewed for company SSO. */
export const WORKBOOK_ROLE_PERMISSIONS = {
  WORKBOOK_ADMIN: WORKBOOK_PERMISSIONS,
} as const satisfies Record<WorkbookRole, readonly WorkbookPermission[]>;

/**
 * Resolves the strongest exact Workbooks role from audience-scoped claims.
 * @param roles Role keys returned by Accounts introspection.
 * @returns WORKBOOK_ADMIN, or null when Workbooks access has been removed.
 */
export function resolveWorkbookRole(roles: readonly string[]): WorkbookRole | null {
  if (roles.includes("WORKBOOK_ADMIN")) return "WORKBOOK_ADMIN";
  return null;
}
