import { protect } from "@/server/controllers/auth-controller";
import { logRequest } from "@/server/middleware";
import { createEdgeRouter } from "next-connect";
import { NextResponse, type NextRequest } from "next/server";
import type { ExtendedNextRequest } from "@/server/controllers/auth-controller";
import { DragonFlightController } from "@/server/controllers/dragon-flight-controller";
import { ActivityType } from "@prisma/client";

const router = createEdgeRouter<NextRequest, {}>();

router.use(logRequest);
router.use(protect);

const getDragonFlightRanking = DragonFlightController.getRanking;
router.get(getDragonFlightRanking as any);

export async function GET(request: NextRequest) {
  const result = await router.run(request, {});
  if (result instanceof NextResponse) {
    return result;
  }
  throw new Error("Expected a NextResponse from router.run");
}
