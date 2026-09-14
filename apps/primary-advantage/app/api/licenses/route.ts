import { NextRequest, NextResponse } from "next/server";
import { eq, and, desc, inArray, ilike, or, count } from 'drizzle-orm';
import { licenses, schools } from '@reading-advantage/db/schema';
import { getTenantDB, getUnscopedDB } from "@reading-advantage/domain";
import { assertCan, AuthError } from "@reading-advantage/auth";
import { z } from "zod";
import { randomBytes } from "crypto";
import { currentUser } from "@/lib/session";
import { generateLicenseKey } from "@/lib/utils";
import { subscriptionType } from '@reading-advantage/db/schema';

// Derive SubscriptionType as a string-literal union from the Drizzle pgEnum.
// Replaces the legacy Prisma client enum import.
type SubscriptionType = (typeof subscriptionType.enumValues)[number];

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

    // Authorization decision via the central policy (codifies the inline
    // ADMIN/SYSTEM gate below).
    try {
      assertCan(user, "license:manage", { schoolId: user.schoolId ?? null });
    } catch (error) {
      if (error instanceof AuthError) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      throw error;
    }

    if (!user || (user.role !== "ADMIN" && user.role !== "SYSTEM")) {
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

    // Create license in database (replaces Prisma `license.create`).
    // TenantDB injects the ADMIN's schoolId on FLAT inserts; SYSTEM (no
    // schoolId) creates licenses for any school via unscoped.
    const tenantDb = getTenantDB({ schoolId: user.schoolId ?? null });
    const licensesDb = user.schoolId
      ? tenantDb
      : getUnscopedDB("SYSTEM creates licenses across all schools; no schoolId");
    const [license] = await licensesDb.insert(licenses).values({
      key: licenseKey,
      name: validatedData.name,
      maxUsers: validatedData.maxUsers,
      startDate: startDate,
      expiryDate: expiryDate,
      status: validatedData.status,
      subscription:
        validatedData.subscriptionType.toUpperCase() as SubscriptionType,
      schoolId: validatedData.schoolId || null,
    } as any).returning();

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

    // Authorization decision via the central policy (codifies the inline
    // ADMIN/SYSTEM gate below).
    try {
      assertCan(user, "license:manage", { schoolId: user.schoolId ?? null });
    } catch (error) {
      if (error instanceof AuthError) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      throw error;
    }

    if (!user || (user.role !== "ADMIN" && user.role !== "SYSTEM")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get query parameters for pagination and filtering
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    const offset = (page - 1) * limit;

    // Build where conditions
    const whereConditions: any[] = [];
    if (status && ["active", "inactive", "expired"].includes(status)) {
      whereConditions.push(eq(licenses.status, status));
    }
    if (search) {
      const searchPattern = `%${search}%`;
      const orClauses = or(
        ilike(licenses.name, searchPattern),
        ilike(licenses.description, searchPattern),
        ilike(licenses.key, searchPattern),
      );
      whereConditions.push(orClauses);
    }

    // Get licenses with pagination (replaces Prisma `findMany({ where, skip, take, orderBy, include.School })`).
    // TenantDB scopes ADMIN reads to their own school; SYSTEM (no schoolId)
    // reads all licenses via unscoped.
    const tenantDb = getTenantDB({ schoolId: user.schoolId ?? null });
    const licensesDb = user.schoolId
      ? tenantDb
      : getUnscopedDB("SYSTEM lists licenses across all schools; no schoolId");
    const [licenseRows, totalRows] = await Promise.all([
      whereConditions.length > 0
        ? licensesDb.select().from(licenses)
          .where(and(...whereConditions))
          .orderBy(desc(licenses.createdAt))
          .limit(limit)
          .offset(offset)
        : licensesDb.select().from(licenses)
          .orderBy(desc(licenses.createdAt))
          .limit(limit)
          .offset(offset),
      whereConditions.length > 0
        ? licensesDb.select({ value: count() }).from(licenses).where(and(...whereConditions))
        : licensesDb.select({ value: count() }).from(licenses),
    ]);
    const total = Number(totalRows[0]?.value ?? 0);

    // Stitch School include for each license.
    const schoolIds = licenseRows
      .map((l) => l.schoolId)
      .filter((id): id is string => !!id);
    const uniqueSchoolIds = Array.from(new Set(schoolIds));
    const schoolRows = uniqueSchoolIds.length > 0
      ? await tenantDb
          .unscoped("schools is EXEMPT; stitched by license.schoolId")
          .select({
          id: schools.id,
          name: schools.name,
        }).from(schools).where(inArray(schools.id, uniqueSchoolIds))
      : [];

    // User counts per school (replaces `_count.select.users`).
    const userCountsBySchoolId = new Map<string, number>();
    // For simplicity, we won't compute exact user counts in this route —
    // they aren't actually rendered by the API consumer.

    const schoolById = new Map(schoolRows.map((s) => [s.id, s]));

    const licensesWithSchool = licenseRows.map((l) => ({
      ...l,
      School: l.schoolId ? schoolById.get(l.schoolId) ?? null : null,
    }));

    return NextResponse.json(licensesWithSchool);
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

    // Authorization decision via the central policy (codifies the inline
    // ADMIN/SYSTEM gate below).
    try {
      assertCan(user, "license:manage", { schoolId: user.schoolId ?? null });
    } catch (error) {
      if (error instanceof AuthError) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      throw error;
    }

    if (!user || (user.role !== "ADMIN" && user.role !== "SYSTEM")) {
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

    // Delete license (replaces Prisma `license.delete`).
    // TenantDB scopes ADMIN deletes to their own school; SYSTEM deletes any.
    const tenantDb = getTenantDB({ schoolId: user.schoolId ?? null });
    const licensesDb = user.schoolId
      ? tenantDb
      : getUnscopedDB("SYSTEM deletes licenses across all schools; no schoolId");
    await licensesDb.delete(licenses)
      .where(eq(licenses.id, id));

    return NextResponse.json({ message: "License deleted successfully" });
  } catch (error) {
    console.error("Error deleting license:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}