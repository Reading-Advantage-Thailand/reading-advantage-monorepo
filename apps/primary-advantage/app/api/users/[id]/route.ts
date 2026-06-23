import { NextResponse, NextRequest } from "next/server";
import { db, eq } from '@reading-advantage/db';
import { users, userRoles, roles } from '@reading-advantage/db';
import { currentUser } from "@/lib/session";
import bcrypt from "bcryptjs";

// Replace lines 31-47 in your current API with this corrected version:

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const currentUserData = await currentUser();
    if (!currentUserData) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (await params).id;
    const body = await request.json();
    const { name, email, role, xp, level, cefrLevel, password } = body;

    // Verify the target user exists before opening a transaction.
    const [existingTarget] = await db.select({ id: users.id })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!existingTarget) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
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
    const updatedUser = await db.transaction(async (tx) => {
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
        await tx.delete(userRoles)
          .where(eq(userRoles.userId, userId));

        // Assign the new role
        await tx.insert(userRoles).values({
          userId: userId,
          roleId: roleRecord.id,
        });
      }

      // Return updated user with roles (stitched via follow-up queries)
      const [updated] = await tx.select().from(users)
        .where(eq(users.id, userId))
        .limit(1);

      const userRoleRows = await tx.select({
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