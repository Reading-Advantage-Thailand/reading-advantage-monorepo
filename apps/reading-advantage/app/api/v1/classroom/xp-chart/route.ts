import { logRequest } from "@/server/middleware";
import { protect } from "@/server/controllers/auth-controller";
import { createEdgeRouter } from "next-connect";
import { NextResponse, type NextRequest } from "next/server";
import { getClassXp } from "@/server/controllers/classroom-controller";

export interface RequestContext {
  params: Promise<{
    license_id?: string;
  }>;
}

const router = createEdgeRouter<NextRequest, RequestContext>();

// Middleware
router.use(logRequest);
router.use(protect);

// API: GET /api/v1/classroom/xp-chart?year=2024&licenseId={license_id}
router.get(getClassXp) as any;

// Export API Route for Next.js
export async function GET(request: NextRequest, ctx: RequestContext) {
  const result = await router.run(request, ctx);
  if (result instanceof NextResponse) {
    return result;
  }
  throw new Error("Expected a NextResponse from router.run");
}
