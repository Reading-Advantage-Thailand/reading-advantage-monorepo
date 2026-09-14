import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { eq } from 'drizzle-orm';
import { users, schools, schoolAdmins, userRoles, roles } from '@reading-advantage/db/schema';
import { getTenantDB, getUnscopedDB } from '@reading-advantage/domain';
import { assertCan, AuthError } from '@reading-advantage/auth';

// DELETE /api/users/me/school/admins/[adminId] - Remove a school admin
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ adminId: string }> },
) {
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

    const adminId = (await params).adminId;

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

    // Fetch the user's school via FK.
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
        { error: "Only the school owner can remove admins" },
        { status: 403 },
      );
    }

    // Find the admin record (replaces Prisma `schoolAdmins.findUnique({ include: user })`).
    // TenantDB scopes the lookup to the owner's school.
    const [adminRecord] = await tenantDb.select({
      admin: schoolAdmins,
      adminUser: users,
    })
      .from(schoolAdmins)
      .innerJoin(users, eq(users.id, schoolAdmins.userId))
      .where(eq(schoolAdmins.id, adminId))
      .limit(1);

    if (!adminRecord) {
      return NextResponse.json(
        { error: "Admin record not found" },
        { status: 404 },
      );
    }

    // Check if the admin belongs to the current user's school
    if (adminRecord.admin.schoolId !== userSchool.id) {
      return NextResponse.json(
        { error: "Admin does not belong to your school" },
        { status: 403 },
      );
    }

    // Prevent owner from removing themselves
    if (adminRecord.admin.userId === currentUser.id) {
      return NextResponse.json(
        { error: "School owner cannot remove themselves as admin" },
        { status: 400 },
      );
    }

    // Remove the admin record (replaces Prisma `schoolAdmins.delete`).
    await tenantDb.delete(schoolAdmins)
      .where(eq(schoolAdmins.id, adminId));

    // Check if the user has any other school admin roles (across all schools).
    const otherAdminRoles = await tenantDb
      .unscoped("schoolAdmins role check spans all schools before downgrade")
      .select().from(schoolAdmins)
      .where(eq(schoolAdmins.userId, adminRecord.admin.userId));

    // If user has no other admin roles, optionally downgrade their role
    if (otherAdminRoles.length === 0) {
      // Get user's current roles (replaces Prisma `findUnique({ include: roles })`).
      const userRoleRows = await tenantDb
        .unscoped("userRoles is REFERENTIAL and roles is EXEMPT; stitched by userId")
        .select({
        roleId: userRoles.roleId,
        roleName: roles.name,
      })
        .from(userRoles)
        .innerJoin(roles, eq(roles.id, userRoles.roleId))
        .where(eq(userRoles.userId, adminRecord.admin.userId));

      const hasAdminRole = userRoleRows.some(
        (ur) => ur.roleName === "admin",
      );

      // Only downgrade if they only have Admin role and no other admin responsibilities
      if (hasAdminRole && userRoleRows.length === 1) {
        // Find or create Teacher role as default
        const [existingTeacherRole] = await tenantDb
          .unscoped("roles is EXEMPT; looked up by name")
          .select().from(roles)
          .where(eq(roles.name, "teacher"))
          .limit(1);

        let teacherRole = existingTeacherRole;
        if (!teacherRole) {
          const [created] = await tenantDb
            .unscoped("roles is EXEMPT; created by name")
            .insert(roles).values({ name: "teacher" }).returning();
          teacherRole = created;
        }

        // Remove all roles and set Teacher role
        await tenantDb
          .unscoped("userRoles is REFERENTIAL; scoped via users.schoolId")
          .delete(userRoles)
          .where(eq(userRoles.userId, adminRecord.admin.userId));

        await tenantDb
          .unscoped("userRoles is REFERENTIAL; scoped via users.schoolId")
          .insert(userRoles).values({
          userId: adminRecord.admin.userId,
          roleId: teacherRole.id,
        });
      }
    }

    // Remove user's association with the school if they have no other roles
    const remainingSchoolRoles = await tenantDb
      .unscoped("schoolAdmins role check spans all schools before removal")
      .select().from(schoolAdmins)
      .where(
        eq(schoolAdmins.userId, adminRecord.admin.userId),
      );

    const stillInThisSchool = remainingSchoolRoles.some(
      (r) => r.schoolId === userSchool!.id,
    );

    if (!stillInThisSchool) {
      await tenantDb.update(users)
        .set({ schoolId: null })
        .where(eq(users.id, adminRecord.admin.userId));
    }

    return NextResponse.json({
      message: "Admin removed successfully",
      removedUserId: adminRecord.admin.userId,
    });
  } catch (error) {
    console.error("Error removing school admin:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}