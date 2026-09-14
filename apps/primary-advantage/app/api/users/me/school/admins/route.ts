import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { eq, and } from 'drizzle-orm';
import { users, schools, schoolAdmins, userRoles, roles } from '@reading-advantage/db/schema';
import { getTenantDB, getUnscopedDB } from '@reading-advantage/domain';
import { assertCan, AuthError } from '@reading-advantage/auth';
import { z } from "zod";

const addAdminSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
});

// POST /api/users/me/school/admins - Add a user as school admin
export async function POST(request: NextRequest) {
  try {
    const authUser = await getCurrentUser();

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Authorization decision via the central policy. School-admin management
    // is an admin:users operation; the ownerId gate below still runs.
    try {
      assertCan(authUser, "admin:users", { schoolId: authUser.schoolId ?? null });
    } catch (error) {
      if (error instanceof AuthError) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      throw error;
    }

    const body = await request.json();
    const { userId } = addAdminSchema.parse(body);

    // Get current user's school (replaces Prisma `user.findUnique({ include: School })`).
    const tenantDb = getTenantDB({ schoolId: authUser.schoolId ?? null });
    // SYSTEM has no schoolId; TenantDB fails closed on FLAT tables, so the
    // self-record lookup runs through unscoped for SYSTEM callers.
    const usersDb = authUser.schoolId
      ? tenantDb
      : getUnscopedDB("SYSTEM has no schoolId; self-record lookup by id");
    const [currentUser] = await usersDb.select().from(users)
      .where(eq(users.id, authUser.id))
      .limit(1);

    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    let userSchool: typeof schools.$inferSelect | null = null;
    if (currentUser.schoolId) {
      const [s] = await tenantDb
        .unscoped("schools is EXEMPT; looked up by user.schoolId")
        .select().from(schools)
        .where(eq(schools.id, currentUser.schoolId))
        .limit(1);
      userSchool = s ?? null;
    }

    if (!userSchool) {
      return NextResponse.json(
        { error: "User has no school associated" },
        { status: 400 },
      );
    }

    // Check if current user is the school owner
    if (userSchool.ownerId !== currentUser.id) {
      return NextResponse.json(
        { error: "Only the school owner can add admins" },
        { status: 403 },
      );
    }

    // Check if the target user exists (replaces Prisma `user.findUnique({ include: roles, SchoolAdmins })`).
    // TenantDB scopes the lookup to the owner's school.
    const [targetUser] = await tenantDb.select().from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!targetUser) {
      return NextResponse.json(
        { error: "Target user not found" },
        { status: 404 },
      );
    }

    // Fetch target user's roles via join.
    const targetRoleRows = await tenantDb
      .unscoped("userRoles is REFERENTIAL and roles is EXEMPT; stitched by userId")
      .select({
      roleId: userRoles.roleId,
      roleName: roles.name,
    })
      .from(userRoles)
      .innerJoin(roles, eq(roles.id, userRoles.roleId))
      .where(eq(userRoles.userId, userId));

    // Fetch target user's existing SchoolAdmins for this school.
    const existingSchoolAdminRows = await tenantDb.select().from(schoolAdmins)
      .where(
        and(
          eq(schoolAdmins.userId, userId),
          eq(schoolAdmins.schoolId, userSchool.id),
        ),
      );

    // Check if user is already an admin of this school
    if (existingSchoolAdminRows.length > 0) {
      return NextResponse.json(
        { error: "User is already an admin of this school" },
        { status: 400 },
      );
    }

    // Add user as school admin (replaces Prisma `schoolAdmins.create`).
    await tenantDb.insert(schoolAdmins).values({
      schoolId: userSchool.id,
      userId: userId,
    });

    // Check if user needs Admin role upgrade
    const hasAdminRole = targetRoleRows.some(
      (r) => r.roleName === "admin",
    );

    let roleUpgraded = false;
    if (!hasAdminRole) {
      const currentRoles = targetRoleRows.map((r) => r.roleName);
      if (currentRoles.includes("user") || currentRoles.includes("teacher")) {
        // Find or create Admin role
        const [existingAdminRole] = await tenantDb
          .unscoped("roles is EXEMPT; looked up by name")
          .select().from(roles)
          .where(eq(roles.name, "admin"))
          .limit(1);

        let adminRole = existingAdminRole;
        if (!adminRole) {
          const [created] = await tenantDb
            .unscoped("roles is EXEMPT; created by name")
            .insert(roles).values({ name: "admin" }).returning();
          adminRole = created;
        }

        // Remove all existing roles and set Admin role only
        await tenantDb
          .unscoped("userRoles is REFERENTIAL; scoped via users.schoolId")
          .delete(userRoles)
          .where(eq(userRoles.userId, userId));

        // Create new Admin role for user
        await tenantDb
          .unscoped("userRoles is REFERENTIAL; scoped via users.schoolId")
          .insert(userRoles).values({
          userId: userId,
          roleId: adminRole.id,
        });
        roleUpgraded = true;
      }
    }

    // Associate user with the school if not already associated
    if (targetUser.schoolId !== userSchool.id) {
      await tenantDb.update(users)
        .set({ schoolId: userSchool.id })
        .where(eq(users.id, userId));
    }

    return NextResponse.json({
      message: "User added as school admin successfully",
      adminAdded: true,
      roleUpgraded:
        !hasAdminRole &&
        targetRoleRows.some(
          (r) => r.roleName === "user" || r.roleName === "teacher",
        ),
    });
  } catch (error) {
    console.error("Error adding school admin:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input data", details: error.errors },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}