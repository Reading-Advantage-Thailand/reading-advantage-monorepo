import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createSchoolSchema = z.object({
  name: z.string().min(2).max(100),
  contactName: z.string().max(100).optional(),
  contactEmail: z.string().email().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has system role (only system admins can create schools)
    if (currentUser.role !== "SYSTEM") {
      return NextResponse.json(
        {
          error: "Forbidden. Only system administrators can create schools.",
        },
        { status: 403 },
      );
    }

    const body = await request.json();
    const validatedData = createSchoolSchema.parse(body);

    // Check if school with same name already exists
    const existingSchool = await prisma.school.findFirst({
      where: {
        name: validatedData.name,
      },
    });

    if (existingSchool) {
      return NextResponse.json(
        { error: "A school with this name already exists" },
        { status: 400 },
      );
    }

    // Create the school
    const school = await prisma.school.create({
      data: {
        name: validatedData.name,
        contactName: validatedData.contactName,
        contactEmail: validatedData.contactEmail,
      },
    });

    return NextResponse.json(school, { status: 201 });
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

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has system role
    if (currentUser.role !== "SYSTEM") {
      return NextResponse.json(
        {
          error: "Forbidden. Only system administrators can view schools.",
        },
        { status: 403 },
      );
    }

    const schools = await prisma.school.findMany({
      include: {
        _count: {
          select: {
            users: true,
            admins: true,
          },
        },
        licenses: {
          select: {
            name: true,
            status: true,
            maxUsers: true,
            expiryDate: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(schools);
  } catch (error) {
    console.error("Error fetching schools:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
