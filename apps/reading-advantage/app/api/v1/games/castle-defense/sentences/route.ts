import { protect } from "@/server/controllers/auth-controller";
import { logRequest } from "@/server/middleware";
import { createEdgeRouter } from "next-connect"; // or "next-connect" depending on project ver
import { NextResponse, type NextRequest } from "next/server";
import { CastleDefenseController } from "@/server/controllers/castle-defense-controller";

const router = createEdgeRouter<NextRequest, {}>();

router.use(logRequest);
router.use(protect);

const getSentencesHandler = CastleDefenseController.getSentences;
router.get(getSentencesHandler as any);

export async function GET(request: NextRequest) {
  return router.run(request, {}) as Promise<Response>;
}
