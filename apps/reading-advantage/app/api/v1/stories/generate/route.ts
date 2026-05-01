import { createEdgeRouter } from "next-connect";
import { NextResponse, type NextRequest } from "next/server";
import { logRequest } from "@/server/middleware";
import { handleRequest } from "@/server/utils/handle-request";
import { generateStories } from "@/server/utils/generators/stories-generator";
import { restrictAccessKey } from "@/server/controllers/auth-controller";

export interface Context {
  params: Promise<Record<string, never>>;
}

const router = createEdgeRouter<NextRequest, Context>();

// Middleware
router.use(logRequest);
router.use(restrictAccessKey);

// POST /api/v1/stories/generate
// BODY: { amountPerGenre: number }
router.post(generateStories) as any;

export async function POST(request: NextRequest, ctx: { params: Promise<Record<string, never>> }) {
  const result = await router.run(request, ctx);
  if (result instanceof NextResponse) {
    return result;
  }
  // Handle the case where result is not a NextResponse
  // You might want to return a default NextResponse or throw an error
  throw new Error("Expected a NextResponse from router.run");
}
