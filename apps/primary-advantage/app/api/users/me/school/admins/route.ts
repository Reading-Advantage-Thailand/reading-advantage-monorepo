import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const addAdminSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
});

// POST /api/users/me/school/admins - Add a user as school admin
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { userId } = addAdminSchema.parse(body);

    // Get current user's school and verify they are the owner
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        School: true,
      },
    });

    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (!currentUser.School) {
      return NextResponse.json(
        { error: "User has no school associated" },
        { status: 400 },
      );
    }

    // Check if current user is the school owner
    if (currentUser.School.ownerId !== session.user.id) {
      return NextResponse.json(
        { error: "Only the school owner can add admins" },
        { status: 403 },
      );
    }

    // Check if the target user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
        SchoolAdmins: {
          where: {
            schoolId: currentUser.School.id,
          },
        },
      },
    });

    if (!targetUser) {
      return NextResponse.json(
        { error: "Target user not found" },
        { status: 404 },
      );
    }

    // Check if user is already an admin of this school
    if (targetUser.SchoolAdmins.length > 0) {
      return NextResponse.json(
        { error: "User is already an admin of this school" },
        { status: 400 },
      );
    }

    // Add user as school admin
    await prisma.schoolAdmins.create({
      data: {
        schoolId: currentUser.School.id,
        userId: userId,
      },
    });

    // Check if user needs Admin role upgrade
    const hasAdminRole = targetUser.roles.some(
      (userRole) => userRole.role.name === "admin",
    );

    if (!hasAdminRole) {
      const currentRoles = targetUser.roles.map((ur) => ur.role.name);
      if (currentRoles.includes("user") || currentRoles.includes("teacher")) {
        // Find or create Admin role
        let adminRole = await prisma.role.findFirst({
          where: { name: "admin" },
        });

        if (!adminRole) {
          adminRole = await prisma.role.create({
            data: { name: "admin" },
          });
        }

        // Remove all existing roles and set Admin role only
        await prisma.userRole.deleteMany({
          where: { userId: userId },
        });

        // Create new Admin role for user
        await prisma.userRole.create({
          data: {
            userId: userId,
            roleId: adminRole.id,
          },
        });
      }
    }

    // Associate user with the school if not already associated
    if (targetUser.schoolId !== currentUser.School.id) {
      await prisma.user.update({
        where: { id: userId },
        data: { schoolId: currentUser.School.id },
      });
    }

    return NextResponse.json({
      message: "User added as school admin successfully",
      adminAdded: true,
      roleUpgraded:
        !hasAdminRole &&
        targetUser.roles.some(
          (ur) => ur.role.name === "user" || ur.role.name === "teacher",
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
