import { resetUserProgress } from "@/server/controllers/user-controller";
import { logRequest } from "@/server/middleware";
import { createEdgeRouter } from "next-connect";
import { NextRequest } from "next/server";
import { handleRequest } from "@/server/utils/handle-request";
import { protect } from "@/server/controllers/auth-controller";

export interface Context {
  params: Promise<{
    id: string;
  }>;
}

const router = createEdgeRouter<NextRequest, Context>();

// Middleware
router.use(logRequest);
router.use(protect);

// /api/v1/users/[id]/reset-all-progress
router.post(resetUserProgress) as any;

export const POST = (request: NextRequest, ctx: Context) =>
  handleRequest(router, request, ctx);
