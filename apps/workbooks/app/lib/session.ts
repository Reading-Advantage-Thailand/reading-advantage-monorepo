import { cookies } from "next/headers";

import {
  WORKBOOKS_SESSION_COOKIE,
  getWorkbooksOidcClient,
  workbooksSessionUser,
} from "./company-oidc";

/** Verified workbooks session projection. */
export interface WorkbookSession {
  readonly actorId: string;
  readonly tenantId: string;
  readonly role: string;
  readonly username: string;
}

/** Error thrown when a caller is not an authorized workbooks user. */
export class WorkbookAuthorizationError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "WorkbookAuthorizationError";
    this.code = code;
  }
}

/**
 * Resolves the verified Workbooks session for React Server Components and
 * server actions by reading the host-only session cookie via next/headers.
 * @returns The verified session projection, or null without a valid token.
 */
export async function getWorkbookSession(): Promise<WorkbookSession | null> {
  const store = await cookies();
  const token = store.get(WORKBOOKS_SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await getWorkbooksOidcClient().introspect(token);
  if (!session) return null;

  const user = workbooksSessionUser(session.identity);
  if (!user) return null;

  return {
    actorId: user.id,
    tenantId: user.tenantId,
    role: user.role,
    username: user.username,
  };
}

/**
 * Resolves the verified Workbooks session or throws when the caller is not an
 * authorized workbooks user.
 * @returns The verified session projection.
 * @throws {WorkbookAuthorizationError} When no authorized session is present.
 */
export async function requireWorkbookSession(): Promise<WorkbookSession> {
  const session = await getWorkbookSession();
  if (!session) {
    throw new WorkbookAuthorizationError(
      "UNAUTHORIZED",
      "workbooks access requires an authorized session",
    );
  }
  return session;
}
