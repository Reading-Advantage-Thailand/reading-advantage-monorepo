import { protect } from "@/server/controllers/auth-controller";
import { logRequest } from "@/server/middleware";
import { createEdgeRouter } from "next-connect";
import { type NextRequest } from "next/server";
import { DragonRiderController } from "@/server/controllers/dragon-rider-controller";

const router = createEdgeRouter<NextRequest, {}>();

router.use(logRequest);
router.use(protect);

const completeGameHandler = DragonRiderController.completeGame;
router.post(completeGameHandler as any);

export async function POST(request: NextRequest) {
  return router.run(request, {}) as Promise<Response>;
}
