import { restrictAccessKey } from "@/server/controllers/auth-controller";
import { validateArticle } from "@/server/controllers/validator-controller";
import { logRequest } from "@/server/middleware";
import { handleRequest } from "@/server/utils/handle-request";
import { createEdgeRouter } from "next-connect";
import { NextRequest } from "next/server";

export interface Context {
  params: Promise<Record<string, never>>;
}

const router = createEdgeRouter<NextRequest, Context>();

// Middleware
router.use(logRequest);
router.use(restrictAccessKey);

// POST /api/articles/validate
// BODY: { runToday: boolean, filterByDate: string }
router.post(validateArticle) as any;

export const POST = (request: NextRequest, ctx: Context) =>
  handleRequest(router, request, ctx);
