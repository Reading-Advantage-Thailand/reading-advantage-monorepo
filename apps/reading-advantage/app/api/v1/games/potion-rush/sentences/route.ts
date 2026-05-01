import { protect } from "@/server/controllers/auth-controller";
import { logRequest } from "@/server/middleware";
import { createEdgeRouter } from "next-connect";
import { NextResponse, type NextRequest } from "next/server";
import { PotionRushController } from "@/server/controllers/potion-rush-controller";

const router = createEdgeRouter<NextRequest, {}>();

router.use(logRequest);
router.use(protect);

const getSentencesHandler = PotionRushController.getSentences;
router.get(getSentencesHandler as any);

export async function GET(request: NextRequest) {
  return router.run(request, {}) as Promise<Response>;
}
