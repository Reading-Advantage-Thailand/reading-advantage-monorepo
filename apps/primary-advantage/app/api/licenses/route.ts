import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { randomBytes } from "crypto";
import { currentUser } from "@/lib/session";
import { generateLicenseKey } from "@/lib/utils";
import { SubscriptionType } from "@prisma/client";

const CreateLicenseSchema = z.object({
  name: z.string().min(3).max(100),
  maxUsers: z.number().int().min(1).max(10000),
  startDate: z.string().datetime(),
  expiryDays: z.number().int().positive().optional(),
  status: z.enum(["active", "inactive", "expired"]),
  schoolId: z.string().optional().nullable(),
  subscriptionType: z.enum(["basic", "premium", "enterprise"]),
});

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!user || (user.role !== "admin" && user.role !== "system")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Parse request body
    const body = await request.json();
    const validatedData = CreateLicenseSchema.parse(body);

    // Generate unique license key
    const licenseKey = generateLicenseKey();

    // Calculate expiry date if expiry days are provided
    const startDate = new Date(validatedData.startDate);
    let expiryDate: Date | null = null;

    if (validatedData.expiryDays) {
      expiryDate = new Date(startDate);
      expiryDate.setDate(startDate.getDate() + validatedData.expiryDays);
    }

    // Create license in database
    const license = await prisma.license.create({
      data: {
        key: licenseKey,
        name: validatedData.name,
        maxUsers: validatedData.maxUsers,
        startDate: startDate,
        expiryDate: expiryDate,
        status: validatedData.status,
        subscription:
          validatedData.subscriptionType.toUpperCase() as SubscriptionType,
        schoolId: validatedData.schoolId || null,
      },
    });

    return NextResponse.json({
      id: license.id,
      key: license.key,
      name: license.name,
      maxUsers: license.maxUsers,
      startDate: license.startDate,
      expiryDate: license.expiryDate,
      status: license.status,
      createdAt: license.createdAt,
    });
  } catch (error) {
    console.error("Error creating license:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input data", details: error.errors },
        { status: 400 },
      );
    }

    if (error instanceof Error && error.message.includes("Unique constraint")) {
      return NextResponse.json(
        { error: "License key already exists" },
        { status: 409 },
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
    // Check authentication
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!user || (user.role !== "admin" && user.role !== "system")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get query parameters for pagination and filtering
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};
    if (status && ["active", "inactive", "expired"].includes(status)) {
      where.status = status;
    }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { key: { contains: search, mode: "insensitive" } },
      ];
    }

    // Get licenses with pagination
    const [licenses, total] = await Promise.all([
      prisma.license.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          School: {
            select: {
              id: true,
              name: true,
              _count: {
                select: { users: true },
              },
            },
          },
        },
      }),
      prisma.license.count({ where }),
    ]);

    return NextResponse.json(licenses);
  } catch (error) {
    console.error("Error fetching licenses:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!user || (user.role !== "admin" && user.role !== "system")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "License ID is required" },
        { status: 400 },
      );
    }

    const license = await prisma.license.delete({
      where: { id },
    });

    return NextResponse.json({ message: "License deleted successfully" });
  } catch (error) {
    console.error("Error deleting license:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
