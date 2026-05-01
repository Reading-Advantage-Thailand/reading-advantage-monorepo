import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Initialize required roles in the database
export async function POST(request: NextRequest) {
  try {
    const requiredRoles = ["user", "student", "teacher", "admin", "system"];

    const createdRoles = [];

    for (const roleName of requiredRoles) {
      const existingRole = await prisma.role.findFirst({
        where: { name: roleName },
      });

      if (!existingRole) {
        const newRole = await prisma.role.create({
          data: { name: roleName },
        });
        createdRoles.push(newRole);
        console.log(`Created role: ${roleName}`);
      } else {
        console.log(`Role already exists: ${roleName}`);
      }
    }

    // Check all roles in database
    const allRoles = await prisma.role.findMany();
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
    const allRoles = await prisma.role.findMany();

    // Also check some users and their roles
    const usersWithRoles = await prisma.user.findMany({
      take: 5,
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    return NextResponse.json({
      roles: allRoles,
      sampleUsers: usersWithRoles.map((user) => ({
        id: user.id,
        email: user.email,
        roles: user.roles.map((ur) => ur.role.name),
      })),
    });
  } catch (error) {
    console.error("Error getting roles:", error);
    return NextResponse.json({ error: "Failed to get roles" }, { status: 500 });
  }
}
