import { getGenres } from "@/server/controllers/article-controller";
import { protect } from "@/server/controllers/auth-controller";
import { logRequest } from "@/server/middleware";
import { createEdgeRouter } from "next-connect";
import { NextResponse, type NextRequest } from "next/server";

const router = createEdgeRouter<NextRequest, { params: Promise<Record<string, never>> }>();

router.use(logRequest);
router.use(protect);
router.get(getGenres) as any;

export async function GET(
  request: NextRequest,
  ctx: { params: Promise<Record<string, never>> }
): Promise<NextResponse> {
  const result = await router.run(request, ctx);
  if (result instanceof NextResponse) {
    return result;
  }
  // Handle the case where result is not a NextResponse
  // You might want to return a default NextResponse or throw an error
  throw new Error("Expected a NextResponse from router.run");
}
