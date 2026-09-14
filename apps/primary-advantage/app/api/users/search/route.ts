import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { eq, and, or, ilike, ne, inArray, notInArray } from 'drizzle-orm';
import { users, userRoles, roles } from '@reading-advantage/db/schema';
import { getTenantDB, getUnscopedDB } from "@reading-advantage/domain";
import { assertCan, AuthError } from "@reading-advantage/auth";
import { USER_SEARCH_ROLES, normalizeRole } from "@/lib/authorization";

// GET /api/users/search - Search for users by name or email
export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Authorization decision via the central policy (codifies the inline
    // USER_SEARCH_ROLES gate below).
    try {
      assertCan(currentUser, "user:list", { schoolId: currentUser.schoolId ?? null });
    } catch (error) {
      if (error instanceof AuthError) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      throw error;
    }

    if (
      !(USER_SEARCH_ROLES as readonly string[]).includes(
        normalizeRole(currentUser.role),
      )
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Fail closed: staff without a school cannot search across schools.
    if (
      normalizeRole(currentUser.role) !== "SYSTEM" &&
      !currentUser.schoolId
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");

    if (!query || query.trim().length < 2) {
      return NextResponse.json(
        { error: "Search query must be at least 2 characters" },
        { status: 400 },
      );
    }

    // Search for users by name or email (replaces Prisma `findMany({ where: { OR, NOT } })`).
    // Results stay inside the caller's school. TenantDB injects the schoolId
    // scope, so the manual `eq(users.schoolId, ...)` filter is redundant and
    // removed. SYSTEM (no schoolId) searches globally via unscoped.
    const searchPattern = `%${query}%`;
    const orClauses = or(
      ilike(users.name, searchPattern),
      ilike(users.email, searchPattern),
    );
    const scopeClauses = [orClauses, ne(users.id, currentUser.id)];
    const tenantDb = getTenantDB({ schoolId: currentUser.schoolId ?? null });
    const usersDb = currentUser.schoolId
      ? tenantDb
      : getUnscopedDB("SYSTEM searches users across schools; no schoolId");
    const matchedUsers = await usersDb.select({
      id: users.id,
      name: users.name,
      email: users.email,
    })
      .from(users)
      .where(and(...scopeClauses))
      .limit(10);

    // Stitch roles include via a follow-up join.
    const userIds = matchedUsers.map((u) => u.id);
    const userRoleRows = userIds.length > 0
      ? await tenantDb
          .unscoped("userRoles is REFERENTIAL and roles is EXEMPT; stitched by userId")
          .select({
          userId: userRoles.userId,
          roleName: roles.name,
        })
          .from(userRoles)
          .innerJoin(roles, eq(roles.id, userRoles.roleId))
          .where(inArray(userRoles.userId, userIds))
      : [];
    const rolesByUserId = new Map<string, { role: { name: string } }[]>();
    for (const ur of userRoleRows) {
      if (!rolesByUserId.has(ur.userId)) rolesByUserId.set(ur.userId, []);
      rolesByUserId.get(ur.userId)!.push({ role: { name: ur.roleName } });
    }

    const usersWithRoles = matchedUsers.map((u) => ({
      ...u,
      roles: rolesByUserId.get(u.id) || [],
    }));

    return NextResponse.json(usersWithRoles);
  } catch (error) {
    console.error("Error searching users:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}