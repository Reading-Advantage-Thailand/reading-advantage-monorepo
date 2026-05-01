import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/lib/session";
import { validateUser, UserWithRoles } from "@/server/utils/auth";
import { hasPermission, Permission } from "@/lib/permissions";
import { decodeJwt, jwtVerify } from "jose";

// Define the type for the authenticated user object passed to the handler
export type AuthenticatedUser = UserWithRoles & { role: string };

// Define the type for the handler function
// Note: context.params is a Promise in Next.js 15
export type AuthenticatedApiHandler<T = any> = (
  req: NextRequest,
  context: { params: Promise<T> },
  user: AuthenticatedUser,
) => Promise<NextResponse>;

/**
 * Higher-order function to protect API routes with authentication and permission checks.
 *
 * Usage:
 * export const GET = withAuth(async (req, { params }, user) => {
 *   // Your logic here
 * }, ["ADMIN_ACCESS"]);
 *
 * @param handler The API route handler function
 * @param requiredPermissions Optional array of permissions required to access the route
 * @param requireAllPermissions If true, user must have ALL permissions. Default is false (ANY permission).
 * @returns A Next.js compatible API route handler
 */
export function withAuth<T = any>(
  handler: AuthenticatedApiHandler<T>,
  requiredPermissions: Permission[] = [],
  requireAllPermissions: boolean = false,
) {
  return async (req: NextRequest, context: { params: Promise<T> }) => {
    try {
      if (process.env.NODE_ENV === "development") {
        const apiKey = req.headers.get("x-api-key");
        const devUserId = req.headers.get("x-dev-user-id");

        if (apiKey === process.env.ACCESS_KEY && devUserId) {
          const dbUser = await validateUser(devUserId);
          if (dbUser) {
            const userForPermissions: AuthenticatedUser = {
              ...dbUser,
              role: dbUser.roles[0].role.name?.toLowerCase() || "user",
            };

            return handler(req, context, userForPermissions);
          }
        }
      }

      // 1. Check if user is authenticated via session
      const sessionUser = await currentUser();

      if (!sessionUser || !sessionUser.id) {
        return NextResponse.json(
          { error: "Unauthorized: Please sign in" },
          { status: 401 },
        );
      }

      // 2. Validate user against database to get latest roles and permissions
      // This ensures we have up-to-date data even if session is slightly stale
      const dbUser = await validateUser(sessionUser.id);

      if (!dbUser) {
        return NextResponse.json(
          { error: "Unauthorized: User not found" },
          { status: 401 },
        );
      }

      // Combine session role with DB user for complete permission checking context
      // sessionUser.role is the primary role string (e.g. "admin", "student")
      const userForPermissions: AuthenticatedUser = {
        ...dbUser,
        role: (sessionUser.role as string) || "user",
      };

      // 3. Check permissions if any are required
      if (requiredPermissions.length > 0) {
        let hasAccess = false;

        if (requireAllPermissions) {
          // Must have ALL permissions
          hasAccess = requiredPermissions.every((permission) =>
            hasPermission(userForPermissions, permission),
          );
        } else {
          // Must have AT LEAST ONE of the permissions
          hasAccess = requiredPermissions.some((permission) =>
            hasPermission(userForPermissions, permission),
          );
        }

        if (!hasAccess) {
          return NextResponse.json(
            {
              error: "Forbidden: Insufficient permissions",
              requiredPermissions,
            },
            { status: 403 },
          );
        }
      }

      // 4. Call the handler with the authenticated user
      return handler(req, context, userForPermissions);
    } catch (error) {
      console.error("API Guard Error:", error);
      return NextResponse.json(
        { error: "Internal Server Error during authentication check" },
        { status: 500 },
      );
    }
  };
}
