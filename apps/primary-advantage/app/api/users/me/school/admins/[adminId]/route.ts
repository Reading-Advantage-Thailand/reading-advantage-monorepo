import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { eq } from 'drizzle-orm';
import { users, schools, schoolAdmins, userRoles, roles } from '@reading-advantage/db/schema';
import { getTenantDB, getUnscopedDB } from '@reading-advantage/domain';
import { assertCan, AuthError } from '@reading-advantage/auth';
import { normalizeRole } from "@/lib/authorization";
import { setUserRole } from "@/server/utils/role-sql";
import { canManageSchool } from "@/server/utils/school-access";
import { logger } from "@/lib/observability/logger";

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

    // The owner, an ADMIN of the school, or SYSTEM may manage the admins
    if (!canManageSchool(currentUser, userSchool)) {
      return NextResponse.json(
        { error: "Only the school owner or a school admin can remove admins" },
        { status: 403 },
      );
    }

    // The admins list sends the user id (getSchoolDetail). A migrated admin has
    // users.role ADMIN and no school_admins row. TenantDB scopes both lookups to
    // the caller's school.
    const [adminUser] = await tenantDb.select().from(users)
      .where(eq(users.id, adminId))
      .limit(1);
    const adminRows = adminUser
      ? await tenantDb.select().from(schoolAdmins).where(eq(schoolAdmins.userId, adminUser.id))
      : [];

    if (!adminUser || (adminRows.length === 0 && normalizeRole(adminUser.role) !== "ADMIN")) {
      return NextResponse.json(
        { error: "Admin record not found" },
        { status: 404 },
      );
    }

    // Only the owner or SYSTEM may remove the owner from the admins.
    if (
      userSchool.ownerId &&
      adminUser.id === userSchool.ownerId &&
      currentUser.id !== userSchool.ownerId &&
      normalizeRole(currentUser.role) !== "SYSTEM"
    ) {
      return NextResponse.json(
        { error: "Only the school owner can remove the owner as admin" },
        { status: 403 },
      );
    }

    // Prevent owner from removing themselves
    if (adminUser.id === currentUser.id) {
      return NextResponse.json(
        { error: "School owner cannot remove themselves as admin" },
        { status: 400 },
      );
    }

    // Remove the admin rows of this school (replaces Prisma `schoolAdmins.delete`).
    await tenantDb.delete(schoolAdmins)
      .where(eq(schoolAdmins.userId, adminUser.id));

    // Check if the user has any other school admin roles (across all schools).
    const otherAdminRoles = await tenantDb
      .unscoped("schoolAdmins role check spans all schools before downgrade")
      .select().from(schoolAdmins)
      .where(eq(schoolAdmins.userId, adminUser.id));

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
        .where(eq(userRoles.userId, adminUser.id));

      // users.role is the truth; legacy user_roles rows are additive.
      const hasAdminRole =
        normalizeRole(adminUser.role) === "ADMIN" ||
        userRoleRows.some((ur) => ur.roleName === "admin");

      // Only downgrade if they only have Admin role and no other admin responsibilities
      if (hasAdminRole && userRoleRows.length <= 1) {
        await setUserRole(
          tenantDb.unscoped("userRoles is REFERENTIAL; scoped via users.schoolId"),
          adminUser.id,
          "teacher",
        );
      }
    }

    // The account stays in the school as a TEACHER: users.school_id keeps its classes
    // and its (school_id, id) foreign keys.
    return NextResponse.json({
      message: "Admin removed successfully",
      removedUserId: adminUser.id,
    });
  } catch (error) {
    logger.error("school_admin_remove_failed", { error });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}