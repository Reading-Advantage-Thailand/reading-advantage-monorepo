import { restrictTo } from "@/server/controllers/auth-controller";
import {
  deleteLicense,
  activateLicense,
  getLicense,
} from "@/server/controllers/license-controller";
import { logRequest } from "@/server/middleware";
import { Role } from "@prisma/client";
import { handleRequest } from "@/server/utils/handle-request";
import { get } from "lodash";
import { createEdgeRouter } from "next-connect";
import { NextRequest, NextResponse } from "next/server";

export interface RequestContext {
  params: Promise<{
    id: string;
  }>;
}

const router = createEdgeRouter<NextRequest, RequestContext>();

// Middleware
router.use(logRequest);

// /api/license/[id]
// GET and DELETE require SYSTEM role
router.get(restrictTo(Role.SYSTEM) as any, getLicense) as any;
router.delete(restrictTo(Role.SYSTEM) as any, deleteLicense) as any;

// PATCH (activate license) allows ADMIN, TEACHER, and STUDENT
router.patch(restrictTo(Role.ADMIN, Role.TEACHER, Role.STUDENT) as any, activateLicense) as any;

export async function GET(request: NextRequest, ctx: RequestContext) {
  const result = await router.run(request, ctx);
  if (result instanceof NextResponse) {
    return result;
  }
  // Handle the case where result is not a NextResponse
  // You might want to return a default NextResponse or throw an error
  throw new Error("Expected a NextResponse from router.run");
}

export async function PATCH(request: NextRequest, ctx: RequestContext) {
  const result = await router.run(request, ctx);
  if (result instanceof NextResponse) {
    return result;
  }
  // Handle the case where result is not a NextResponse
  // You might want to return a default NextResponse or throw an error
  throw new Error("Expected a NextResponse from router.run");
}

export async function DELETE(request: NextRequest, ctx: RequestContext) {
  const result = await router.run(request, ctx);
  if (result instanceof NextResponse) {
    return result;
  }
  // Handle the case where result is not a NextResponse
  // You might want to return a default NextResponse or throw an error
  throw new Error("Expected a NextResponse from router.run");
}
