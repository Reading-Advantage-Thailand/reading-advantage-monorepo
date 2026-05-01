import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// DELETE /api/users/me/school/admins/[adminId] - Remove a school admin
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ adminId: string }> },
) {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminId = (await params).adminId;

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
        { error: "Only the school owner can remove admins" },
        { status: 403 },
      );
    }

    // Find the admin record
    const adminRecord = await prisma.schoolAdmins.findUnique({
      where: { id: adminId },
      include: {
        user: true,
      },
    });

    if (!adminRecord) {
      return NextResponse.json(
        { error: "Admin record not found" },
        { status: 404 },
      );
    }

    // Check if the admin belongs to the current user's school
    if (adminRecord.schoolId !== currentUser.School.id) {
      return NextResponse.json(
        { error: "Admin does not belong to your school" },
        { status: 403 },
      );
    }

    // Prevent owner from removing themselves
    if (adminRecord.userId === session.user.id) {
      return NextResponse.json(
        { error: "School owner cannot remove themselves as admin" },
        { status: 400 },
      );
    }

    // Remove the admin record
    await prisma.schoolAdmins.delete({
      where: { id: adminId },
    });

    // Check if the user has any other school admin roles
    const otherAdminRoles = await prisma.schoolAdmins.findMany({
      where: { userId: adminRecord.userId },
    });

    // If user has no other admin roles, optionally downgrade their role
    // (This is optional - you might want to keep their Admin role)
    if (otherAdminRoles.length === 0) {
      // Get user's current roles
      const userWithRoles = await prisma.user.findUnique({
        where: { id: adminRecord.userId },
        include: {
          roles: {
            include: {
              role: true,
            },
          },
        },
      });

      if (userWithRoles) {
        const hasAdminRole = userWithRoles.roles.some(
          (ur) => ur.role.name === "admin",
        );

        // Only downgrade if they only have Admin role and no other admin responsibilities
        if (hasAdminRole && userWithRoles.roles.length === 1) {
          // Find or create Teacher role as default
          let teacherRole = await prisma.role.findFirst({
            where: { name: "teacher" },
          });

          if (!teacherRole) {
            teacherRole = await prisma.role.create({
              data: { name: "teacher" },
            });
          }

          // Remove all roles and set Teacher role
          await prisma.userRole.deleteMany({
            where: { userId: adminRecord.userId },
          });

          await prisma.userRole.create({
            data: {
              userId: adminRecord.userId,
              roleId: teacherRole.id,
            },
          });
        }
      }
    }

    // Remove user's association with the school if they have no other roles
    const remainingSchoolRoles = await prisma.schoolAdmins.findMany({
      where: {
        userId: adminRecord.userId,
        schoolId: currentUser.School.id,
      },
    });

    if (remainingSchoolRoles.length === 0) {
      await prisma.user.update({
        where: { id: adminRecord.userId },
        data: { schoolId: null },
      });
    }

    return NextResponse.json({
      message: "Admin removed successfully",
      removedUserId: adminRecord.userId,
    });
  } catch (error) {
    console.error("Error removing school admin:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
