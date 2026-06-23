import { NextRequest, NextResponse } from "next/server";
import { db, eq } from '@reading-advantage/db';
import { roles, users, userRoles } from '@reading-advantage/db';

// Initialize required roles in the database
export async function POST(request: NextRequest) {
  try {
    const requiredRoles = ["user", "student", "teacher", "admin", "system"];

    const createdRoles = [];

    for (const roleName of requiredRoles) {
      // `findFirst` → `db.select().from(roles).where(eq(roles.name, roleName)).limit(1)`
      const [existingRole] = await db.select().from(roles)
        .where(eq(roles.name, roleName))
        .limit(1);

      if (!existingRole) {
        // `create` → `db.insert(roles).values({...}).returning()`
        const [newRole] = await db.insert(roles).values({ name: roleName }).returning();
        createdRoles.push(newRole);
        console.log(`Created role: ${roleName}`);
      } else {
        console.log(`Role already exists: ${roleName}`);
      }
    }

    // Check all roles in database
    const allRoles = await db.select().from(roles);
    console.log(
      "All roles in database:",
      allRoles.map((r) => r.name),
    );

    return NextResponse.json({
      message: "Roles initialized successfully",
      createdRoles: createdRoles.map((r) => r.name),
      allRoles: allRoles.map((r) => r.name),
    });
  } catch (error) {
    console.error("Error initializing roles:", error);
    return NextResponse.json(
      { error: "Failed to initialize roles" },
      { status: 500 },
    );
  }
}

// Get all roles for debugging
export async function GET(request: NextRequest) {
  try {
    const allRoles = await db.select().from(roles);

    // Also check some users and their roles (replaces Prisma `findMany({ take: 5, include })`).
    // `take: 5` → `.limit(5)`. The user include shape is stitched manually via a
    // userRoles ⨝ roles join filtered to the chosen users.
    const sampleUsers = await db.select().from(users).limit(5);

    const userIds = sampleUsers.map((u) => u.id);
    const userRoleRows = userIds.length > 0
      ? await db.select({
          userId: userRoles.userId,
          roleName: roles.name,
        })
          .from(userRoles)
          .innerJoin(roles, eq(roles.id, userRoles.roleId))
          .where(eq(userRoles.userId, userIds[0]))
      : [];

    // Group roles by userId.
    const rolesByUserId = new Map<string, string[]>();
    for (const ur of userRoleRows) {
      if (!rolesByUserId.has(ur.userId)) rolesByUserId.set(ur.userId, []);
      rolesByUserId.get(ur.userId)!.push(ur.roleName);
    }

    return NextResponse.json({
      roles: allRoles,
      sampleUsers: sampleUsers.map((user) => ({
        id: user.id,
        email: user.email,
        roles: rolesByUserId.get(user.id) || [],
      })),
    });
  } catch (error) {
    console.error("Error getting roles:", error);
    return NextResponse.json({ error: "Failed to get roles" }, { status: 500 });
  }
}