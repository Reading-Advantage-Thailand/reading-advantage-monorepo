import { protect } from "@/server/controllers/auth-controller";
import { logRequest } from "@/server/middleware";
import { createEdgeRouter } from "next-connect";
import { NextResponse, type NextRequest } from "next/server";
import { CastleDefenseController } from "@/server/controllers/castle-defense-controller";

const router = createEdgeRouter<NextRequest, {}>();

router.use(logRequest);
router.use(protect);

const getRankingHandler = CastleDefenseController.getRanking;
router.get(getRankingHandler as any);

export async function GET(request: NextRequest) {
  return router.run(request, {}) as Promise<Response>;
}
