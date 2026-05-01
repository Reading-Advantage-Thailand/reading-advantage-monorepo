import { getSearchArticles } from "@/server/controllers/article-controller";
import { protect } from "@/server/controllers/auth-controller";
import { logRequest } from "@/server/middleware";
import { createEdgeRouter } from "next-connect";
import { NextResponse, type NextRequest } from "next/server";

const router = createEdgeRouter<
  NextRequest,
  { params: Promise<Record<string, never>> }
>();

router.use(logRequest);

// Middleware
// router.use(async (
//     req: NextRequest,
//     params: unknown,
//     next: () => void
// ) => {

//     // Check level is be the same as the user's level
//     const userLevel = session.user.level;
//     const level = new Number(req.nextUrl.searchParams.get('level')).valueOf();
//     if (level !== userLevel) {
//         req.nextUrl.searchParams.set('level', userLevel.toString());
//     }
//     return next();
// });

router.use(protect);
// Switch to optimized version for performance comparison
router.get(getSearchArticles) as any;

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
