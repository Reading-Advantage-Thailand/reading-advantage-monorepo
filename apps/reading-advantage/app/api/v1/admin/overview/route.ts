import { NextRequest, NextResponse } from "next/server";
import { createEdgeRouter } from "next-connect";
import { logRequest } from "@/server/middleware";
import { restrictTo } from "@/server/controllers/auth-controller";
import { Role } from "@prisma/client";
import { getAdminOverview } from "@/server/controllers/admin-controller";

interface RequestContext {
  params: Promise<Record<string, never>>;
}

const router = createEdgeRouter<NextRequest, RequestContext>();

// Middleware
router.use(logRequest);
router.use(restrictTo(Role.SYSTEM, Role.ADMIN));

// GET /api/v1/admin/overview
router.get(getAdminOverview) as any;

export async function GET(request: NextRequest, ctx: RequestContext) {
  const result = await router.run(request, ctx);
  if (result instanceof NextResponse) {
    return result;
  }
  throw new Error("Expected a NextResponse from router.run");
}

