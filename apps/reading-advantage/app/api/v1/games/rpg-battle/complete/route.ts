import { protect } from "@/server/controllers/auth-controller";
import { logRequest } from "@/server/middleware";
import { createEdgeRouter } from "next-connect";
import { NextResponse, type NextRequest } from "next/server";
import { RpgBattleController } from "@/server/controllers/rpg-battle-controller";

const router = createEdgeRouter<NextRequest, {}>();

router.use(logRequest);
router.use(protect);

const completeGame = RpgBattleController.completeGame;
router.post(completeGame as any);

export async function POST(request: NextRequest) {
  const result = await router.run(request, {});
  if (result instanceof NextResponse) {
    return result;
  }
  throw new Error("Expected a NextResponse from router.run");
}
