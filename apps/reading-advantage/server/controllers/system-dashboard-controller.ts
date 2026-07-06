import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/server/middleware/guards";
import { parseQuery } from "@/lib/validations";
import { getSystemDashboardData } from "@reading-advantage/domain";

/**
 * Query schema for the system dashboard route. Inlined here (rather than
 * imported from @reading-advantage/domain) so the controller remains
 * unit-testable with a minimal domain mock.
 */
const systemDashboardQuerySchema = z.object({
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "startDate must be in YYYY-MM-DD format")
    .optional(),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "endDate must be in YYYY-MM-DD format")
    .optional(),
});

export async function getSystemDashboard(req: NextRequest) {
  try {
    const authResult = await requireRole(["SYSTEM"] as any)(req);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user } = authResult;

    const parsedQuery = parseQuery(req, systemDashboardQuerySchema);
    if (parsedQuery instanceof NextResponse) {
      return parsedQuery;
    }

    // Delegate business logic to the domain layer. The domain function
    // constructs its own (unscoped) TenantDB so the controller stays thin
    // and unit-testable.
    const dashboard = await getSystemDashboardData({
      user: {
        id: user.id,
        role: user.role,
        schoolId: user.school_id ?? null,
      } as any,
      tenant: { schoolId: user.school_id ?? null } as any,
      input: parsedQuery,
    });

    return NextResponse.json(dashboard, { status: 200 });
  } catch (error) {
    console.error("Error fetching system dashboard data:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}