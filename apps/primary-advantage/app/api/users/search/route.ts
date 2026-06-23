import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { db, eq, and, or, ilike, ne, inArray, notInArray } from '@reading-advantage/db';
import { users, userRoles, roles } from '@reading-advantage/db';

// GET /api/users/search - Search for users by name or email
export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
    const searchPattern = `%${query}%`;
    const orClauses = or(
      ilike(users.name, searchPattern),
      ilike(users.email, searchPattern),
    );
    const matchedUsers = await db.select({
      id: users.id,
      name: users.name,
      email: users.email,
    })
      .from(users)
      .where(and(orClauses, ne(users.id, currentUser.id)))
      .limit(10);

    // Stitch roles include via a follow-up join.
    const userIds = matchedUsers.map((u) => u.id);
    const userRoleRows = userIds.length > 0
      ? await db.select({
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