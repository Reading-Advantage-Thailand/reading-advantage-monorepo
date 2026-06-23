import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { db, eq, and, desc, inArray } from '@reading-advantage/db';
import { users, schools, schoolAdmins, userRoles, roles, licenses } from '@reading-advantage/db';
import { z } from "zod";

const schoolSchema = z.object({
  name: z.string().min(2).max(100),
  contactName: z.string().max(100).optional(),
  contactEmail: z.string().email().optional(),
});

// GET /api/users/me/school - Get current user's school
export async function GET() {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user (replaces Prisma `user.findUnique({ include: School })`).
    const [user] = await db.select().from(users)
      .where(eq(users.id, currentUser.id))
      .limit(1);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (!user.schoolId) {
      return NextResponse.json({ school: null });
    }

    // Fetch school.
    const [school] = await db.select().from(schools)
      .where(eq(schools.id, user.schoolId))
      .limit(1);

    if (!school) {
      return NextResponse.json({ school: null });
    }

    // Fetch school admins with user join (replaces `School.admins.include.user`).
    const adminRows = await db.select({
      userId: schoolAdmins.userId,
      userName: users.name,
      userEmail: users.email,
    })
      .from(schoolAdmins)
      .innerJoin(users, eq(users.id, schoolAdmins.userId))
      .where(eq(schoolAdmins.schoolId, school.id));

    const admins = adminRows.map((a) => ({
      user: {
        id: a.userId,
        name: a.userName,
        email: a.userEmail,
      },
    }));

    // Fetch school licenses (replaces `School.licenses`).
    const schoolLicenses = await db.select({
      id: licenses.id,
      key: licenses.key,
      name: licenses.name,
      description: licenses.description,
      maxUsers: licenses.maxUsers,
      startDate: licenses.startDate,
      expiryDate: licenses.expiryDate,
      status: licenses.status,
    })
      .from(licenses)
      .where(eq(licenses.schoolId, school.id))
      .orderBy(desc(licenses.createdAt));

    // Stitch counts (replaces `_count.select.users/admins`).
    const userCountRows = await db.select({ id: users.id })
      .from(users)
      .where(eq(users.schoolId, school.id));

    const schoolWithOwner = {
      ...school,
      _count: {
        users: userCountRows.length,
        admins: admins.length,
      },
      admins,
      licenses: schoolLicenses,
      owner: school.ownerId
        ? await db.select({ id: users.id, name: users.name, email: users.email })
          .from(users)
          .where(eq(users.id, school.ownerId))
          .limit(1)
          .then((rows) => rows[0] ?? null)
        : null,
      license: schoolLicenses.length > 0 ? schoolLicenses[0] : null,
    };

    return NextResponse.json({ school: schoolWithOwner });
  } catch (error) {
    console.error("Error fetching user school:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// POST /api/users/me/school - Create and associate school with current user
export async function POST(request: NextRequest) {
  try {
    const authUser = await getCurrentUser();

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = schoolSchema.parse(body);

    // Check if user already has a school (replaces Prisma `user.findUnique({ include: School })`).
    const [existingUser] = await db.select().from(users)
      .where(eq(users.id, authUser.id))
      .limit(1);

    if (!existingUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (existingUser.schoolId) {
      return NextResponse.json(
        { error: "User already has a school associated" },
        { status: 400 },
      );
    }

    // Check if school with same name already exists (replaces Prisma `school.findFirst`).
    const [existingSchool] = await db.select().from(schools)
      .where(eq(schools.name, validatedData.name))
      .limit(1);

    if (existingSchool) {
      return NextResponse.json(
        { error: "A school with this name already exists" },
        { status: 400 },
      );
    }

    // Check current user's roles to see if they need to be upgraded to Admin.
    const currentUserRoleRows = await db.select({
      roleId: userRoles.roleId,
      roleName: roles.name,
    })
      .from(userRoles)
      .innerJoin(roles, eq(roles.id, userRoles.roleId))
      .where(eq(userRoles.userId, authUser.id));

    const currentUser = existingUser;
    const hasAdminRole = currentUserRoleRows.some(
      (r) => r.roleName === "admin",
    );

    // Check what roles exist in the database
    const allRoles = await db.select().from(roles);

    // If user doesn't have Admin role and is currently User or Teacher, upgrade them
    let roleUpgraded = false;
    if (!hasAdminRole) {
      const currentRoles = currentUserRoleRows.map((r) => r.roleName);

      if (currentRoles.includes("user") || currentRoles.includes("teacher")) {
        // Find or create Admin role
        const [existingAdminRole] = await db.select().from(roles)
          .where(eq(roles.name, "admin"))
          .limit(1);

        let adminRole = existingAdminRole;
        if (!adminRole) {
          const [created] = await db.insert(roles).values({ name: "admin" }).returning();
          adminRole = created;
        }

        // Remove all existing roles and set Admin role only
        await db.delete(userRoles)
          .where(eq(userRoles.userId, currentUser.id));

        // Create new Admin role for user
        await db.insert(userRoles).values({
          userId: currentUser.id,
          roleId: adminRole.id,
        });
        roleUpgraded = true;
      }
    }

    // Create school (replaces Prisma `school.create`).
    const [school] = await db.insert(schools).values({
      name: validatedData.name,
      contactName: validatedData.contactName,
      contactEmail: validatedData.contactEmail,
      ownerId: currentUser.id,
    } as any).returning();

    // Connect the user as a member (users.schoolId = school.id).
    await db.update(users)
      .set({ schoolId: school.id })
      .where(eq(users.id, currentUser.id));

    // Add the user as a school admin (replaces Prisma `school.admins.create`).
    await db.insert(schoolAdmins).values({
      schoolId: school.id,
      userId: currentUser.id,
    });

    // Stitch the school include shape manually.
    const adminRows = await db.select({
      userId: schoolAdmins.userId,
      userName: users.name,
      userEmail: users.email,
    })
      .from(schoolAdmins)
      .innerJoin(users, eq(users.id, schoolAdmins.userId))
      .where(eq(schoolAdmins.schoolId, school.id));
    const admins = adminRows.map((a) => ({
      user: { id: a.userId, name: a.userName, email: a.userEmail },
    }));

    const schoolLicenses = await db.select({
      id: licenses.id,
      key: licenses.key,
      name: licenses.name,
      description: licenses.description,
      maxUsers: licenses.maxUsers,
      startDate: licenses.startDate,
      expiryDate: licenses.expiryDate,
      status: licenses.status,
    })
      .from(licenses)
      .where(eq(licenses.schoolId, school.id))
      .orderBy(desc(licenses.createdAt));

    const userCountRows = await db.select({ id: users.id })
      .from(users)
      .where(eq(users.schoolId, school.id));

    const schoolWithOwner = {
      ...school,
      _count: {
        users: userCountRows.length,
        admins: admins.length,
      },
      admins,
      licenses: schoolLicenses,
      owner: {
        id: currentUser.id,
        name: currentUser.name,
        email: currentUser.email,
      },
      license: schoolLicenses.length > 0 ? schoolLicenses[0] : null,
      roleUpgraded,
    };

    return NextResponse.json(schoolWithOwner, { status: 201 });
  } catch (error) {
    console.error("Error creating school:", error);

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

// PATCH /api/users/me/school - Update current user's school
export async function PATCH(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = schoolSchema.parse(body);

    // Get user's school (replaces Prisma `user.findUnique({ include: School })`).
    const [user] = await db.select().from(users)
      .where(eq(users.id, currentUser.id))
      .limit(1);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    let userSchool: typeof schools.$inferSelect | null = null;
    if (user.schoolId) {
      const [s] = await db.select().from(schools)
        .where(eq(schools.id, user.schoolId))
        .limit(1);
      userSchool = s ?? null;
    }

    if (!userSchool) {
      return NextResponse.json(
        { error: "User has no school associated" },
        { status: 400 },
      );
    }

    // Check if another school with the same name exists (excluding current school).
    const [existingSchool] = await db.select().from(schools)
      .where(
        and(
          eq(schools.name, validatedData.name),
        ),
      )
      .limit(1);

    if (existingSchool && existingSchool.id !== userSchool.id) {
      return NextResponse.json(
        { error: "A school with this name already exists" },
        { status: 400 },
      );
    }

    // Update school (replaces Prisma `school.update`).
    const [updatedSchool] = await db.update(schools)
      .set({
        name: validatedData.name,
        contactName: validatedData.contactName,
        contactEmail: validatedData.contactEmail,
      } as any)
      .where(eq(schools.id, userSchool.id))
      .returning();

    // Stitch includes.
    const adminRows = await db.select({
      userId: schoolAdmins.userId,
      userName: users.name,
      userEmail: users.email,
    })
      .from(schoolAdmins)
      .innerJoin(users, eq(users.id, schoolAdmins.userId))
      .where(eq(schoolAdmins.schoolId, updatedSchool.id));
    const admins = adminRows.map((a) => ({
      user: { id: a.userId, name: a.userName, email: a.userEmail },
    }));

    const schoolLicenses = await db.select({
      id: licenses.id,
      key: licenses.key,
      name: licenses.name,
      description: licenses.description,
      maxUsers: licenses.maxUsers,
      startDate: licenses.startDate,
      expiryDate: licenses.expiryDate,
      status: licenses.status,
    })
      .from(licenses)
      .where(eq(licenses.schoolId, updatedSchool.id))
      .orderBy(desc(licenses.createdAt));

    const userCountRows = await db.select({ id: users.id })
      .from(users)
      .where(eq(users.schoolId, updatedSchool.id));

    const schoolWithOwner = {
      ...updatedSchool,
      _count: {
        users: userCountRows.length,
        admins: admins.length,
      },
      admins,
      licenses: schoolLicenses,
      owner: updatedSchool.ownerId
        ? await db.select({ id: users.id, name: users.name, email: users.email })
          .from(users)
          .where(eq(users.id, updatedSchool.ownerId))
          .limit(1)
          .then((rows) => rows[0] ?? null)
        : null,
      license: schoolLicenses.length > 0 ? schoolLicenses[0] : null,
    };

    return NextResponse.json(schoolWithOwner);
  } catch (error) {
    console.error("Error updating school:", error);

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

// DELETE /api/users/me/school - Delete current user's school (only if they are the owner)
export async function DELETE() {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's school (replaces Prisma `user.findUnique({ include: School })`).
    const [user] = await db.select().from(users)
      .where(eq(users.id, currentUser.id))
      .limit(1);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    let userSchool: typeof schools.$inferSelect | null = null;
    if (user.schoolId) {
      const [s] = await db.select().from(schools)
        .where(eq(schools.id, user.schoolId))
        .limit(1);
      userSchool = s ?? null;
    }

    if (!userSchool) {
      return NextResponse.json(
        { error: "User has no school associated" },
        { status: 400 },
      );
    }

    // Check if user is the owner of the school
    if (userSchool.ownerId !== currentUser.id) {
      return NextResponse.json(
        { error: "Only the school owner can delete the school" },
        { status: 403 },
      );
    }

    // Get owner's current roles before deleting school.
    const ownerRoleRows = await db.select({
      roleId: userRoles.roleId,
      roleName: roles.name,
    })
      .from(userRoles)
      .innerJoin(roles, eq(roles.id, userRoles.roleId))
      .where(eq(userRoles.userId, currentUser.id));

    // Delete the school (replaces Prisma `school.delete`).
    await db.delete(schools)
      .where(eq(schools.id, userSchool.id));

    // Downgrade owner's role from Admin to User if they have Admin role
    const hasAdminRole = ownerRoleRows.some(
      (r) => r.roleName === "admin",
    );

    if (hasAdminRole) {
      // Find or create User role
      const [existingUserRole] = await db.select().from(roles)
        .where(eq(roles.name, "user"))
        .limit(1);

      let userRole = existingUserRole;
      if (!userRole) {
        const [created] = await db.insert(roles).values({ name: "user" }).returning();
        userRole = created;
      }

      // Remove all existing roles and set User role
      await db.delete(userRoles)
        .where(eq(userRoles.userId, currentUser.id));

      await db.insert(userRoles).values({
        userId: currentUser.id,
        roleId: userRole.id,
      });

      // Remove school association
      await db.update(users)
        .set({ schoolId: null })
        .where(eq(users.id, currentUser.id));
    }

    return NextResponse.json({ message: "School deleted successfully" });
  } catch (error) {
    console.error("Error deleting school:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}