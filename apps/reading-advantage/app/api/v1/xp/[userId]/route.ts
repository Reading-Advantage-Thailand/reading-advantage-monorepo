import { getLessonXp } from "@/server/controllers/license-controller";
import { logRequest } from "@/server/middleware";
import { createEdgeRouter } from "next-connect";
import { NextRequest } from "next/server";
import { handleRequest } from "@/server/utils/handle-request";
import { protect } from "@/server/controllers/auth-controller";

export interface Context {
  params: Promise<{
    userId: string;
  }>;
}

const router = createEdgeRouter<NextRequest, Context>();

// Middleware
router.use(logRequest);
router.use(protect);

// /api/xp/[userId]
router.get(getLessonXp) as any;

export const GET = (request: NextRequest, ctx: Context) =>
  handleRequest(router, request, ctx);
