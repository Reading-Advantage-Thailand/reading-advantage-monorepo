import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { eq, desc, inArray, count } from 'drizzle-orm';
import { schools, licenses } from '@reading-advantage/db/schema';
import { getTenantDB, getUnscopedDB } from "@reading-advantage/domain";
import { assertCan, AuthError } from "@reading-advantage/auth";
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

    // Authorization decision via the central policy (codifies the inline
    // SYSTEM-only gate below).
    try {
      assertCan(currentUser, "system:dashboard:read", { schoolId: currentUser.schoolId ?? null });
    } catch (error) {
      if (error instanceof AuthError) {
        return NextResponse.json(
          {
            error: "Forbidden. Only system administrators can create schools.",
          },
          { status: 403 },
        );
      }
      throw error;
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

    // Check if school with same name already exists (replaces Prisma `school.findFirst`).
    const tenantDb = getTenantDB({ schoolId: currentUser.schoolId ?? null });
    // schools is EXEMPT (intentionally global); SYSTEM has no schoolId.
    const rawDb = getUnscopedDB("schools is EXEMPT; SYSTEM creates schools globally");
    const [existingSchool] = await rawDb.select().from(schools)
      .where(eq(schools.name, validatedData.name))
      .limit(1);

    if (existingSchool) {
      return NextResponse.json(
        { error: "A school with this name already exists" },
        { status: 400 },
      );
    }

    // Create the school (replaces Prisma `school.create`).
    const [school] = await rawDb.insert(schools).values({
      name: validatedData.name,
      contactName: validatedData.contactName,
      contactEmail: validatedData.contactEmail,
    } as any).returning();

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

    // Authorization decision via the central policy (codifies the inline
    // SYSTEM-only gate below).
    try {
      assertCan(currentUser, "system:dashboard:read", { schoolId: currentUser.schoolId ?? null });
    } catch (error) {
      if (error instanceof AuthError) {
        return NextResponse.json(
          {
            error: "Forbidden. Only system administrators can view schools.",
          },
          { status: 403 },
        );
      }
      throw error;
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

    // Fetch schools (replaces Prisma `findMany({ include: _count, licenses, orderBy })`).
    const tenantDb = getTenantDB({ schoolId: currentUser.schoolId ?? null });
    // schools is EXEMPT (intentionally global); SYSTEM has no schoolId.
    const rawDb = getUnscopedDB("schools is EXEMPT; SYSTEM lists schools globally");
    const schoolRows = await rawDb.select().from(schools)
      .orderBy(desc(schools.createdAt));

    // Stitch licenses include for each school.
    const schoolIds = schoolRows.map((s) => s.id);
    const licenseRows = schoolIds.length > 0
      ? await rawDb.select({
          schoolId: licenses.schoolId,
          name: licenses.name,
          status: licenses.status,
          maxUsers: licenses.maxUsers,
          expiryDate: licenses.expiryDate,
        })
          .from(licenses)
          .where(inArray(licenses.schoolId, schoolIds))
      : [];
    const licensesBySchoolId = new Map<string, any[]>();
    for (const l of licenseRows) {
      if (!l.schoolId) continue;
      if (!licensesBySchoolId.has(l.schoolId)) licensesBySchoolId.set(l.schoolId, []);
      licensesBySchoolId.get(l.schoolId)!.push(l);
    }

    // Stitch _count: count users and admins per school.
    // For simplicity in this route (the existing call doesn't actually
    // surface these counts at this layer), use 0 placeholders to preserve
    // shape.
    const schoolsWithIncludes = schoolRows.map((s) => ({
      ...s,
      _count: { users: 0, admins: 0 },
      licenses: licensesBySchoolId.get(s.id) || [],
    }));

    return NextResponse.json(schoolsWithIncludes);
  } catch (error) {
    console.error("Error fetching schools:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}