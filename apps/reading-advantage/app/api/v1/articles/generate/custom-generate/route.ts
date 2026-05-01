import { protect } from "@/server/controllers/auth-controller";
import { generateUserArticle } from "@/server/controllers/generator-controller";
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
router.use(protect);

// POST /api/articles/generate/custom-generate
// BODY:
// { type: string;
//  genre: string;
//  subgenre?: string;
//  topic: string;
//  cefrLevel: string;
//  wordCount: number; }
router.post(generateUserArticle) as any;

export const POST = (request: NextRequest, ctx: Context) =>
  handleRequest(router, request, ctx);
