import { restrictAccessKey } from "@/server/controllers/auth-controller";
import { generateQueue } from "@/server/controllers/generator-controller";
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

// POST /api/v1/articles/generate
// BODY: { amountPerGenre: number }
router.post(generateQueue) as any;

export const POST = (request: NextRequest, ctx: Context) =>
  handleRequest(router, request, ctx);
