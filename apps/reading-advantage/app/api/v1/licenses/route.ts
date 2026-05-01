import { restrictTo } from "@/server/controllers/auth-controller";
import {
  createLicenseKey,
  getAllLicenses,
} from "@/server/controllers/license-controller";
import { logRequest } from "@/server/middleware";
import { Role } from "@prisma/client";
import { handleRequest } from "@/server/utils/handle-request";
import { createEdgeRouter } from "next-connect";
import { NextRequest } from "next/server";

export interface Context {
  params: Promise<Record<string, never>>;
}

const router = createEdgeRouter<NextRequest, Context>();

// Middleware
router.use(logRequest);
router.use(restrictTo(Role.SYSTEM));

// /api/licenses
router.get(getAllLicenses) as any;
router.post(createLicenseKey) as any;

export const GET = (request: NextRequest, ctx: Context) =>
  handleRequest(router, request, ctx);
export const POST = (request: NextRequest, ctx: Context) =>
  handleRequest(router, request, ctx);
