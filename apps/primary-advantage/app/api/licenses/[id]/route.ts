import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { SubscriptionType } from "@prisma/client";

const UpdateLicenseSchema = z.object({
  name: z.string().min(3).max(100),
  description: z.string().max(500).optional(),
  maxUsers: z.number().int().min(1).max(10000),
  startDate: z.string().datetime(),
  expiryDays: z.number().int().positive().optional(),
  status: z.enum(["active", "inactive", "expired"]),
  schoolId: z.string().optional().nullable(),
  subscriptionType: z.enum(["basic", "premium", "enterprise"]),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // Check authentication
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (user.role !== "admin" && user.role !== "system") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    // Get license by ID
    const license = await prisma.license.findUnique({
      where: { id },
      include: {
        School: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!license) {
      return NextResponse.json({ error: "License not found" }, { status: 404 });
    }

    return NextResponse.json(license);
  } catch (error) {
    console.error("Error fetching license:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // Check authentication
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (user.role !== "admin" && user.role !== "system") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    // Parse request body
    const body = await request.json();
    const validatedData = UpdateLicenseSchema.parse(body);

    // Check if license exists
    const existingLicense = await prisma.license.findUnique({
      where: { id },
    });

    if (!existingLicense) {
      return NextResponse.json({ error: "License not found" }, { status: 404 });
    }

    // Calculate expiry date if expiry days are provided
    const startDate = new Date(validatedData.startDate);
    let expiryDate: Date | null = null;

    if (validatedData.expiryDays && validatedData.expiryDays > 0) {
      expiryDate = new Date(startDate);
      expiryDate.setDate(startDate.getDate() + validatedData.expiryDays);
    }

    // Update license in database
    const updatedLicense = await prisma.license.update({
      where: { id },
      data: {
        name: validatedData.name,
        description: validatedData.description,
        maxUsers: validatedData.maxUsers,
        startDate: startDate,
        expiryDate: expiryDate,
        status: validatedData.status,
        subscription:
          validatedData.subscriptionType.toUpperCase() as SubscriptionType,
        schoolId: validatedData.schoolId || null,
      },
      include: {
        School: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json({
      id: updatedLicense.id,
      key: updatedLicense.key,
      name: updatedLicense.name,
      description: updatedLicense.description,
      maxUsers: updatedLicense.maxUsers,
      startDate: updatedLicense.startDate,
      expiryDate: updatedLicense.expiryDate,
      status: updatedLicense.status,
      subscription: updatedLicense.subscription,
      schoolId: updatedLicense.schoolId,
      School: updatedLicense.School,
      updatedAt: updatedLicense.updatedAt,
    });
  } catch (error) {
    console.error("Error updating license:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input data", details: error.errors },
        { status: 400 },
      );
    }

    if (error instanceof Error && error.message.includes("Foreign key")) {
      return NextResponse.json(
        { error: "Invalid school ID provided" },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // Check authentication
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (user.role !== "admin" && user.role !== "system") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    // Check if license exists
    const existingLicense = await prisma.license.findUnique({
      where: { id },
    });

    if (!existingLicense) {
      return NextResponse.json({ error: "License not found" }, { status: 404 });
    }

    // Delete license
    await prisma.license.delete({
      where: { id },
    });

    return NextResponse.json({
      message: "License deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting license:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
