import { NextResponse, NextRequest } from "next/server";
import { eq } from 'drizzle-orm';
import { users, userRoles, roles } from '@reading-advantage/db/schema';
import { getTenantDB, getUnscopedDB, type TenantDB } from '@reading-advantage/domain';
import { assertCan, AuthError } from "@reading-advantage/auth";
import { currentUser } from "@/lib/session";
import { isAdminOrSystem, patchUserBodySchema, canAccessSchoolResource, normalizeRole } from "@/lib/authorization";
import { roleAtLeast, type Role } from "@reading-advantage/auth";
import bcrypt from "bcryptjs";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const currentUserData = await currentUser();
    if (!currentUserData) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Authorization decision via the central policy (codifies the inline
    // isAdminOrSystem gate below).
    try {
      assertCan(currentUserData, "admin:users", { schoolId: currentUserData.schoolId ?? null });
    } catch (error) {
      if (error instanceof AuthError) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      throw error;
    }

    if (!isAdminOrSystem(currentUserData)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const userId = (await params).id;
    const parsed = patchUserBodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }
    const { name, email, role, xp, level, cefrLevel, password } = parsed.data;

    if (role !== undefined && currentUserData.id === userId) {
      return NextResponse.json({ error: "Cannot change your own role" }, { status: 403 });
    }

    // Verify the target user exists and resolve their school scope.
    const tenantDb = getTenantDB({ schoolId: currentUserData.schoolId ?? null });
    // SYSTEM has no schoolId; TenantDB fails closed on FLAT tables, so SYSTEM
    // runs through the raw db via unscoped.
    const isSystem = normalizeRole(currentUserData.role) === "SYSTEM";
    const usersDb = isSystem
      ? getUnscopedDB("SYSTEM manages users across schools; no schoolId")
      : tenantDb;
    const [existingTarget] = await usersDb.select({ id: users.id, schoolId: users.schoolId })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!existingTarget) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Fail closed: staff without a school cannot write across schools.
    if (!canAccessSchoolResource(currentUserData, existingTarget.schoolId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Rank check: a caller cannot assign a role above their own level.
    if (role !== undefined) {
      const callerRole = normalizeRole(currentUserData.role) as Role;
      const targetRole = normalizeRole(role) as Role;
      if (!roleAtLeast(callerRole, targetRole)) {
        return NextResponse.json(
          { error: "Cannot assign a role above your own" },
          { status: 403 },
        );
      }
    }

    // Build update data object (excluding role for now)
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (xp !== undefined) updateData.xp = xp;
    if (level !== undefined) updateData.level = level;
    if (cefrLevel !== undefined) updateData.cefrLevel = cefrLevel;

    // Handle password hashing if password is provided
    if (password !== undefined) {
      const saltRounds = 12;
      updateData.password = await bcrypt.hash(password, saltRounds);
    }

    // Use transaction to handle both user data and role updates
    const updatedUser = await usersDb.transaction(async (tx) => {
      // userRoles is REFERENTIAL (no schoolId); scoped via users.schoolId.
      // The transaction callback is typed as raw DB; TenantDB wraps it at
      // runtime, so cast to access the unscoped escape hatch.
      const rawTx = isSystem
        ? tx
        : (tx as unknown as TenantDB).unscoped("userRoles is REFERENTIAL; scoped via users.schoolId");
      // Update user data
      if (Object.keys(updateData).length > 0) {
        await tx.update(users)
          .set(updateData)
          .where(eq(users.id, userId));
      }

      // Handle role update if specified
      if (role !== undefined) {
        // Find the new role by name
        const [roleRecord] = await tx.select().from(roles)
          .where(eq(roles.name, role))
          .limit(1);

        if (!roleRecord) {
          throw new Error(`Role '${role}' not found`);
        }

        // Remove existing roles for this user
        await rawTx.delete(userRoles)
          .where(eq(userRoles.userId, userId));

        // Assign the new role
        await rawTx.insert(userRoles).values({
          userId: userId,
          roleId: roleRecord.id,
        });
      }

      // Return updated user with roles (stitched via follow-up queries)
      const [updated] = await tx.select().from(users)
        .where(eq(users.id, userId))
        .limit(1);

      const userRoleRows = await rawTx.select({
        roleId: userRoles.roleId,
        roleName: roles.name,
      })
        .from(userRoles)
        .innerJoin(roles, eq(roles.id, userRoles.roleId))
        .where(eq(userRoles.userId, userId));

      return updated ? { ...updated, roles: userRoleRows } : null;
    });

    return NextResponse.json(
      {
        message: "User updated successfully",
        user: {
          id: updatedUser?.id,
          name: updatedUser?.name,
          email: updatedUser?.email,
          xp: updatedUser?.xp,
          level: updatedUser?.level,
          cefrLevel: updatedUser?.cefrLevel,
          roles: updatedUser?.roles.map((ur: any) => ur.roleName),
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error updating user:", error);
    return NextResponse.json(
      { error: "Failed to update user" },
      { status: 500 },
    );
  }
}
