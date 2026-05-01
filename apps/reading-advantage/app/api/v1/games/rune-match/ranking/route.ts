import { protect } from "@/server/controllers/auth-controller";
import { logRequest } from "@/server/middleware";
import { createEdgeRouter } from "next-connect";
import { NextResponse, type NextRequest } from "next/server";
import { RuneMatchController } from "@/server/controllers/rune-match-controller";

const router = createEdgeRouter<NextRequest, {}>();

router.use(logRequest);
router.use(protect);

const getRankingForRuneMatch = RuneMatchController.getRanking;

router.get(getRankingForRuneMatch as any);

export async function GET(request: NextRequest) {
  const result = await router.run(request, {});
  if (result instanceof NextResponse) {
    return result;
  }
  throw new Error("Expected a NextResponse from router.run");
}
